import { hasResolvableStorefront, normalizeCompanyHost } from "../tenancy/company.js";
import {
  companyRepository,
  getCompanyDomainsByCompany,
  resolveByActiveVerifiedDomain,
} from "../data/store.js";
import { cpanelOrigins } from "../cpanel.js";

const cpanelHosts = new Set(
  cpanelOrigins
    .map((o) => {
      try {
        return normalizeCompanyHost(new URL(o).hostname);
      } catch {
        return null;
      }
    })
    .filter(Boolean),
);

function requestHost(req) {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : String(forwardedHost || "").split(",")[0] || req.headers.host || req.hostname || "";
  return normalizeCompanyHost(host);
}

function publicCompanyHeader(req) {
  // Storefront writes that need anonymous tenant context (guest checkout,
  // customer registration, splash-ad view/click) resolve the same validated
  // x-company-id as public reads. The company must still pass the existing
  // validation below; bad ids keep returning { invalid: true }.
  const value = req.headers["x-company-id"];
  if (value === undefined) return null;
  if (Array.isArray(value) || String(value).includes(",")) return { invalid: true };
  const companyId = String(value).trim().toLowerCase();
  if (!companyId || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(companyId)) return { invalid: true };
  const company = companyRepository.getCompanyById(companyId);
  const hasVerifiedDomain = company && getCompanyDomainsByCompany(company.id).some(
    (entry) => entry.is_active === true && entry.is_verified === true,
  );
  if (!company || (!hasResolvableStorefront(company) && !hasVerifiedDomain)) return { invalid: true };
  return { company };
}

export function resolveCompany(req, res, next) {
  const authHeader = String(req.headers.authorization || "");
  if (authHeader.startsWith("Bearer ") && authHeader.length > 7) {
    req.companyHost = "";
    req.requestedCompanyId = null;
    req.companyId = null;
    req.company = null;
    return next();
  }

  // Public storefront reads use the company selected by the storefront
  // resolver. Authenticated CPanel requests never reach this branch: their
  // company remains exclusively derived from the verified scoped JWT.
  const headerContext = publicCompanyHeader(req);
  if (headerContext?.invalid) {
    return res.status(404).json({ message: "Storefront company not found or inactive." });
  }
  if (headerContext?.company) {
    req.companyHost = "";
    req.requestedCompanyId = headerContext.company.id;
    req.companyId = headerContext.company.id;
    req.company = headerContext.company;
    return next();
  }

  const origin = String(req.headers.origin || "").trim();
  const hasOrigin = Boolean(origin);

  if (hasOrigin) {
    if (origin.startsWith("https://")) {
      let originHost = "";
      try { originHost = normalizeCompanyHost(new URL(origin).hostname); } catch {}
      if (originHost) {
        if (cpanelHosts.has(originHost)) {
          req.companyHost = "";
          req.requestedCompanyId = null;
          req.companyId = null;
          req.company = null;
          return next();
        }
        const domainEntry = resolveByActiveVerifiedDomain(originHost);
        if (domainEntry) {
          const company = companyRepository.getCompanyById(domainEntry.company_id);
          req.companyHost = originHost;
          req.requestedCompanyId = domainEntry.company_id;
          req.companyId = domainEntry.company_id;
          req.company = company || null;
          return next();
        }
      }
    }
    req.companyHost = "";
    req.requestedCompanyId = null;
    req.companyId = null;
    req.company = null;
    return next();
  }

  const host = requestHost(req);
  req.companyHost = host;
  const domainEntry = host ? resolveByActiveVerifiedDomain(host) : null;
  if (domainEntry) {
    const company = companyRepository.getCompanyById(domainEntry.company_id);
    req.requestedCompanyId = domainEntry.company_id;
    req.companyId = domainEntry.company_id;
    req.company = company || null;
  } else {
    req.requestedCompanyId = null;
    req.companyId = null;
    req.company = null;
  }
  next();
}
