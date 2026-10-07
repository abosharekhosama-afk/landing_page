/**
 * Landing Page Platform — Shared Entity Model (Phase 0 Architecture Lock)
 *
 * Canonical hierarchy (LOCKED):
 *
 *   Platform → User → Workspace(FUTURE optional) → Company(TENANT SoT) → Site → Dashboard/Studio
 *
 * Ownership rules encoded here are the single Source of Truth for Phase 1
 * (My Sites) and later phases. Do NOT fork these constants into route files.
 *
 * Key decisions locked in Phase 0:
 * - Workspace does NOT replace Company and is NOT implemented as a DB table now.
 * - Company remains the canonical tenant + commerce boundary.
 * - Site is a website/publishing identity subordinate to the company tenant.
 * - Domains stay company-scoped (no site_id migration).
 * - Commerce stays company-scoped (products/orders/inventory/contacts/catalog).
 */

/** Platform boundary — owns users, workspaces (future), companies, domains registry. */
export const PLATFORM = Object.freeze({
  key: "platform",
  name: "Platform",
  scope: "platform",
  ownership:
    "Global platform boundary. Owns the user directory, the domain registry, "
    + "and (future) workspaces. Super Admin operates at this level.",
});

/** Global user identity (users table). Never tenant-scoped. */
export const USER = Object.freeze({
  key: "user",
  name: "User",
  scope: "platform",
  ownership:
    "Global identity (users). A user reaches a company only through an active "
    + "company membership (or Super Admin company scope).",
});

/**
 * Optional org layer for partners/agencies.
 * NOT implemented as a DB table in Phase 0 — additive only, phase-gated.
 */
export const WORKSPACE = Object.freeze({
  key: "workspace",
  name: "Workspace",
  scope: "platform",
  ownership:
    "FUTURE optional org layer (partners/agencies). Does NOT replace Company. "
    + "Not implemented as DB in Phase 0; never derive tenant from workspace alone.",
});

/** Canonical tenant Source of Truth. Isolation + commerce boundary. */
export const COMPANY = Object.freeze({
  key: "company",
  name: "Company",
  scope: "company",
  ownership:
    "Canonical tenant Source of Truth (companies). Isolation and commerce "
    + "boundary. Existing company IDs are primary keys and must never be re-keyed.",
});

/** Website/publishing identity (company_sites), subordinate to the company tenant. */
export const SITE = Object.freeze({
  key: "site",
  name: "Site",
  scope: "company",
  ownership:
    "company_sites. Website/publishing identity subordinate to the company "
    + "tenant. Site context is NEVER a substitute for company tenant context.",
});

/** User ↔ company role binding (company_memberships). */
export const MEMBERSHIP = Object.freeze({
  key: "membership",
  name: "Membership",
  scope: "company",
  ownership:
    "company_memberships. Binds a global user to a company with a role and "
    + "permission list. Site-scoped seats are a future additive, not a second auth system.",
});

/** Company-scoped domain (company_domains). NOT site-scoped in Phase 0. */
export const DOMAIN = Object.freeze({
  key: "domain",
  name: "Domain",
  scope: "company",
  ownership:
    "company_domains. Domains resolve to a company (host → company). They stay "
    + "company-scoped until an additive site_id binding is designed and proven.",
});

/** Feature entitlement (cpanel_module_definitions + company_cpanel_modules). */
export const MODULE = Object.freeze({
  key: "module",
  name: "Module",
  scope: "company",
  ownership:
    "cpanel_module_definitions + company_cpanel_modules. Company-scoped feature "
    + "enablement. Reuse as Source of Truth; do not fork into a parallel flag system.",
});

/** All entity constants, keyed by entity key. */
export const ENTITIES = Object.freeze({
  [PLATFORM.key]: PLATFORM,
  [USER.key]: USER,
  [WORKSPACE.key]: WORKSPACE,
  [COMPANY.key]: COMPANY,
  [SITE.key]: SITE,
  [MEMBERSHIP.key]: MEMBERSHIP,
  [DOMAIN.key]: DOMAIN,
  [MODULE.key]: MODULE,
});

/** Entity keys, frozen for lookups. */
export const ENTITY_KEYS = Object.freeze(Object.keys(ENTITIES));

/** Returns the frozen entity descriptor for a key, or null when unknown. */
export function getEntity(key) {
  return ENTITIES[key] || null;
}