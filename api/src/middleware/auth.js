import crypto from "node:crypto";
import { hasPlatformAccess, isSuperAdmin } from "../auth/roles.js";
import {
  companyMembershipRepository,
  companyRepository,
  platformUserRepository,
} from "../data/store.js";

const JWT_SECRET = process.env.JWT_SECRET || "ep-chemical-jwt-dev-secret";
const JWT_EXPIRY_SECONDS = 86400;
const COMPANY_SELECTION_EXPIRY_SECONDS = 300;
export const COMPANY_SCOPE_EXPIRY_SECONDS = JWT_EXPIRY_SECONDS;
export { JWT_EXPIRY_SECONDS };

function signPayload(payload, expirySeconds) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const completePayload = {
    ...payload,
    iat: now,
    exp: now + expirySeconds,
  };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(completePayload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");
  return `${headerB64}.${payloadB64}.${signature}`;
}

export function canonicalMembershipVersion(membership) {
  const value = membership?.updatedAt ?? membership?.createdAt;
  if (value === undefined || value === null || value === "") return null;

  const normalized = typeof value === "string" ? value.trim() : value;
  if (normalized === "") return null;
  const timestamp = normalized instanceof Date ? normalized : new Date(normalized);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
}

export function signToken(user, membership = null) {
  if (!hasPlatformAccess(user) && !membership) {
    throw new Error("An active company membership is required to issue an access token.");
  }
  const membershipVersion = membership ? canonicalMembershipVersion(membership) : null;
  if (membership && !membershipVersion) {
    throw new Error("A valid membership timestamp is required to issue an access token.");
  }
  return signPayload({
    tokenType: "access",
    id: user.id,
    role: user.role,
    companyId: membership?.companyId || null,
    membershipId: membership?.id || null,
    membershipRole: membership?.role || null,
    membershipVersion,
  }, JWT_EXPIRY_SECONDS);
}

export function signCompanySelectionChallenge(user) {
  return signPayload({
    tokenType: "company_selection",
    id: user.id,
    role: user.role,
  }, COMPANY_SELECTION_EXPIRY_SECONDS);
}

export function signCompanyScopeToken(user, company) {
  if (!hasPlatformAccess(user) || !company?.id || company.status !== "active") {
    throw new Error("An active company and platform access are required to issue a company scope.");
  }
  return signPayload({
    tokenType: "company_scope",
    id: user.id,
    role: user.role,
    companyId: company.id,
    scopeId: crypto.randomUUID(),
  }, COMPANY_SCOPE_EXPIRY_SECONDS);
}

export function verifyToken(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");
    const actual = Buffer.from(signature);
    const expected = Buffer.from(expectedSig);
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function bearerToken(req) {
  const authHeader = req.headers.authorization || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

function effectiveMembershipUser(user, membership) {
  return {
    ...user,
    globalRole: user.role,
    role: membership.role,
    permissions: Array.isArray(membership._permissions) ? membership._permissions : [],
  };
}

async function authenticatedContext(req) {
  const payload = verifyToken(bearerToken(req));
  if (!payload || !["access", "company_scope"].includes(payload.tokenType) || !payload.id) return null;
  const user = await platformUserRepository.getUserById(payload.id);
  if (!user || user.isActive === false || payload.role !== user.role) return null;

  if (hasPlatformAccess(user)) {
    if (payload.tokenType === "company_scope") {
      if (!payload.companyId || payload.membershipId || payload.membershipRole || !payload.scopeId) return null;
      const company = companyRepository.getCompanyById(payload.companyId);
      if (!company || company.status !== "active") return null;
      return {
        user: { ...user, globalRole: user.role, permissions: [] },
        company,
        membership: null,
        membershipRole: isSuperAdmin(user) ? "super_admin" : "company_admin",
        tenantScope: { id: payload.scopeId, companyId: company.id },
      };
    }
    if (payload.companyId || payload.membershipId || payload.membershipRole) return null;
    return {
      user: { ...user, globalRole: user.role },
      company: null,
      membership: null,
      membershipRole: null,
    };
  }

  if (payload.tokenType !== "access") return null;

  if (!payload.companyId || !payload.membershipId || !payload.membershipRole) return null;
  const company = companyRepository.getCompanyById(payload.companyId);
  if (!company || company.status !== "active") return null;
  const membership = await companyMembershipRepository.getMembershipByCompanyAndUser(
    payload.companyId,
    user.id,
  );
  const currentMembershipVersion = canonicalMembershipVersion(membership);
  if (
    !membership
    || membership.status !== "active"
    || membership.companyId !== payload.companyId
    || membership.id !== payload.membershipId
    || membership.role !== payload.membershipRole
    || !currentMembershipVersion
    || typeof payload.membershipVersion !== "string"
    || currentMembershipVersion !== payload.membershipVersion
  ) {
    return null;
  }
  return {
    user: effectiveMembershipUser(user, membership),
    company,
    membership,
    membershipRole: membership.role,
  };
}

function applyContext(req, context) {
  req.user = context.user;
  req.company = context.company;
  req.companyId = context.company?.id || null;
  req.membership = context.membership;
  req.membershipRole = context.membershipRole;
  req.tenantScope = context.tenantScope || null;
}

function allowsPlatformOnlySession(req) {
  const requestPath = String(req.originalUrl || req.path || "").split("?", 1)[0];
  return requestPath.startsWith("/api/platform") || requestPath.startsWith("/api/auth");
}

export async function getSessionUser(req) {
  try {
    const context = await authenticatedContext(req);
    if (!context) return null;
    if (
      req.requestedCompanyId
      && context.company?.id !== req.requestedCompanyId
      && !hasPlatformAccess(context.user)
    ) {
      return null;
    }
    applyContext(req, context);
    return context.user;
  } catch {
    return null;
  }
}

export async function requireAuth(req, res, next) {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ message: "Authentication required." });
  if (!req.membership && !req.tenantScope && !allowsPlatformOnlySession(req)) {
    return res.status(403).json({ message: "An active company membership is required." });
  }
  return next();
}

export async function optionalAuth(req, res, next) {
  if (!req.headers.authorization) {
    req.user = null;
    return next();
  }
  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ message: "Invalid or expired authentication token." });
  }
  if (!req.membership && !req.tenantScope && !allowsPlatformOnlySession(req)) {
    return res.status(403).json({ message: "An active company membership is required." });
  }
  return next();
}

export function requireAdmin(req, res, next) {
  if (!["admin", "company_admin", "super_admin"].includes(req.membershipRole)) {
    return res.status(403).json({ message: "Tenant admin access required." });
  }
  return next();
}

export function requirePermission(permission) {
  return (req, res, next) => {
    const role = effectiveTenantRole(req);
    if (["admin", "company_admin", "super_admin", "manager"].includes(role)) return next();
    if (["employee", "staff"].includes(role) && req.user?.permissions?.includes(permission)) return next();
    return res.status(403).json({ message: "Access denied." });
  };
}

export function requireAnyPermission(...permissions) {
  const allowed = permissions.flat().filter(Boolean);
  return (req, res, next) => {
    const role = effectiveTenantRole(req);
    if (["admin", "company_admin", "super_admin", "manager"].includes(role)) return next();
    if (
      ["employee", "staff"].includes(role)
      && allowed.some((permission) => req.user?.permissions?.includes(permission))
    ) {
      return next();
    }
    return res.status(403).json({ message: "Access denied." });
  };
}

export function effectiveTenantRole(req) {
  return req.membershipRole || req.user?.role || null;
}

function platformActor(req) {
  return { role: req.user?.globalRole || req.user?.role };
}

export function requireSuperAdmin(req, res, next) {
  if (!isSuperAdmin(platformActor(req))) {
    return res.status(403).json({ message: "Super Admin access required." });
  }
  return next();
}

export function requirePlatformAdmin(req, res, next) {
  if (!hasPlatformAccess(platformActor(req))) {
    return res.status(403).json({ message: "Platform administrator access required." });
  }
  return next();
}

export function publicUser(user) {
  if (!user) return null;
  const { password, globalPermissions, ...safeUser } = user;
  return safeUser;
}
