import { Router } from "express";
import { getCompanyDomainsByCompany, persistCompanyStore, tenantCompanySiteRepository } from "../data/store.js";
import { pickPrimaryDomain } from "../landingPlatform/index.js";
import { requireAuth, requireAnyPermission } from "../middleware/auth.js";
import { recordActivityLog } from "../activityLog/logger.js";

function siteError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sendError(res, error) {
  return res.status(error.statusCode || 500).json({
    message: error.statusCode ? error.message : "Unable to process the site request.",
  });
}

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

/**
 * Resolves the company primary domain for a site payload (read-only lookup).
 *
 * Domains remain company-scoped in Phase 1 — this never invents a site-scoped
 * domain and never remaps hosts. Source order:
 *   1. the in-memory domain registry for req.companyId (existing store helper)
 *   2. the already-loaded company payload (domains / domain)
 * Returns null when no domain is known (honest "no domain" state).
 */
function resolvePrimaryDomain(companyId, company) {
  const registryDomains = getCompanyDomainsByCompany(companyId);
  if (registryDomains.length) return pickPrimaryDomain(registryDomains);
  if (Array.isArray(company?.domains) && company.domains.length) {
    return pickPrimaryDomain(company.domains);
  }
  const domain = String(company?.domain || "").trim();
  return domain || null;
}

function serializeSite(site, companyId, primaryDomain = null) {
  return {
    id: site.id,
    companyId,
    slug: site.slug,
    name: site.name,
    status: site.status,
    defaultLocale: site.defaultLocale,
    settings: site.settings && typeof site.settings === "object" ? site.settings : {},
    primaryDomain,
    createdAt: site.createdAt,
    updatedAt: site.updatedAt,
  };
}

const router = Router();
const siteRead = requireAnyPermission("sites.manage", "site_editor.access");
const siteWrite = requireAnyPermission("sites.manage");

router.get("/", requireAuth, siteRead, async (req, res) => {
  try {
    let sites = tenantCompanySiteRepository.listByCompany(req.companyId);
    if (!sites.length) {
      // Lazy backfill: empty companies get a real default site from the
      // websiteConnection settings so the storefront keeps working.
      await tenantCompanySiteRepository.ensureDefaultForCompany(req.companyId);
      sites = tenantCompanySiteRepository.listByCompany(req.companyId);
    }
    return res.json({ items: sites.map((site) => serializeSite(site, req.companyId, resolvePrimaryDomain(req.companyId, req.company))) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/", requireAuth, siteWrite, async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
    const name = String(body.name || "").trim();
    if (!name) throw siteError("Site name is required.", 400);
    const slug = normalizeSlug(body.slug) || normalizeSlug(name);
    if (!slug) throw siteError("A valid site slug is required.", 400);

    // Lazy backfill before create so empty companies keep a real default site.
    if (!tenantCompanySiteRepository.listByCompany(req.companyId).length) {
      await tenantCompanySiteRepository.ensureDefaultForCompany(req.companyId);
    }

    const duplicate = tenantCompanySiteRepository.findBySlugForCompany(req.companyId, slug);
    if (duplicate) throw siteError("A site with this slug already exists.", 409);

    const site = tenantCompanySiteRepository.createForCompany(req.companyId, {
      slug,
      name,
      status: ["active", "draft", "archived"].includes(body.status) ? body.status : "active",
      defaultLocale: body.defaultLocale || body.default_locale || "en",
      settings: body.settings && typeof body.settings === "object" && !Array.isArray(body.settings)
        ? body.settings
        : {},
    });
    await persistCompanyStore(req.companyId);
    recordActivityLog({
      req,
      companyId: req.companyId,
      action: "site.created",
      entityType: "site",
      entityId: site.id,
      entityLabel: site.name,
      summary: `Site created for ${site.name}`,
      afterData: { name: site.name, slug: site.slug, status: site.status, defaultLocale: site.defaultLocale },
    });
    return res.status(201).json(serializeSite(site, req.companyId, resolvePrimaryDomain(req.companyId, req.company)));
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/:siteId", requireAuth, siteRead, (req, res) => {
  try {
    const site = tenantCompanySiteRepository.findByCompany(req.companyId, req.params.siteId);
    if (!site) throw siteError("Site not found.", 404);
    return res.json(serializeSite(site, req.companyId, resolvePrimaryDomain(req.companyId, req.company)));
  } catch (error) {
    return sendError(res, error);
  }
});

/**
 * PATCH /api/admin/sites/:siteId — Archive / Restore only.
 * Accepts ONLY { status: "archived" | "active" }; any other value is a 400.
 * Requires sites.manage (siteWrite). Sites outside the caller's company
 * return 404 (company isolation, same as GET /:siteId).
 */
router.patch("/:siteId", requireAuth, siteWrite, async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
    const status = typeof body.status === "string" ? body.status.trim().toLowerCase() : "";
    const extraFields = Object.keys(body).filter((key) => key !== "status");
    if (!["archived", "active"].includes(status) || extraFields.length > 0) {
      throw siteError("Only archived or active status is allowed.", 400);
    }

    const site = tenantCompanySiteRepository.findByCompany(req.companyId, req.params.siteId);
    if (!site) throw siteError("Site not found.", 404);

    const beforeData = { status: site.status };
    const updated = tenantCompanySiteRepository.updateForCompany(req.companyId, site.id, {
      status,
      updatedAt: new Date().toISOString(),
    });
    await persistCompanyStore(req.companyId);
    recordActivityLog({
      req,
      companyId: req.companyId,
      action: "site.updated",
      entityType: "site",
      entityId: updated.id,
      entityLabel: updated.name,
      summary: `Site ${status === "archived" ? "archived" : "restored"} for ${updated.name}`,
      beforeData,
      afterData: { status: updated.status, updatedAt: updated.updatedAt },
    });
    return res.json(serializeSite(updated, req.companyId, resolvePrimaryDomain(req.companyId, req.company)));
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;