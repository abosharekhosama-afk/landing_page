/**
 * Landing Page Platform — Auth / Access Helpers (Phase 0 Architecture Lock)
 *
 * Reuses existing globalRole/role patterns from middleware/auth.js and
 * auth/roles.js. Super Admin retains full access (same as today when scoped).
 *
 * Workspace/partner roles are NOT implemented in Phase 0.
 */

import { isSuperAdmin } from "../auth/roles.js";

/**
 * True when the user is a Platform Super Admin.
 * Accepts either a raw user ({ role }) or a scoped user ({ globalRole, role }).
 *
 * @param {Object|null} user
 * @returns {boolean}
 */
export function isPlatformSuperAdmin(user) {
  return isSuperAdmin({ role: user?.globalRole || user?.role });
}

function membershipIsActive(membership) {
  if (!membership || typeof membership !== "object") return false;
  return membership.status !== "inactive" && membership.is_active !== false;
}

/**
 * True when the user can access the company: active membership for that
 * company, or Platform Super Admin (full access when scoped).
 *
 * @param {Object|null} user
 * @param {string|null} companyId
 * @param {Object|null} membership — company membership ({ companyId, status, ... })
 * @returns {boolean}
 */
export function canAccessCompany(user, companyId, membership) {
  if (!companyId) return false;
  if (isPlatformSuperAdmin(user)) return true;
  if (!membership) return false;
  return membership.companyId === companyId && membershipIsActive(membership);
}

/**
 * True when the user can access a site: company access + the site belongs to
 * that company. Super Admin scoped to the company retains full access.
 *
 * @param {Object} input
 * @param {Object|null} input.user
 * @param {string} input.companyId
 * @param {Object|null} input.site — site row ({ id, companyId | company_id, ... })
 * @param {Object|null} input.membership
 * @returns {boolean}
 */
export function canAccessSite({ user, companyId, site, membership }) {
  if (!canAccessCompany(user, companyId, membership)) return false;
  if (!site || typeof site !== "object") return false;
  const siteCompanyId = String(site.companyId || site.company_id || "").trim();
  return siteCompanyId === String(companyId || "").trim();
}