/**
 * Landing Page Platform — Compatibility Module (Phase 0 Architecture Lock)
 *
 * Documents + encodes the compatibility guarantees that keep existing tenants
 * and live storefronts working while the platform evolves.
 *
 * LOCKED rules:
 * 1. Legacy APIs work with companyId only — site context is optional.
 * 2. Missing site context → company behavior (siteId null, source 'none').
 * 3. Multi-site + no siteId → NO silent site selection.
 * 4. Storefront/domain resolution is UNCHANGED — domains remain company-scoped.
 *    middleware/company.js domain logic is intentionally untouched.
 */

/** Frozen compatibility rules (documentation + machine-readable). */
export const COMPATIBILITY_RULES = Object.freeze([
  {
    id: "legacy-company-only",
    rule:
      "Legacy APIs work with companyId only. Site context is optional and never "
      + "required on existing company-scoped routes.",
  },
  {
    id: "missing-site-context",
    rule:
      "Missing site context falls back to company behavior: siteId null, "
      + "source 'none'. No site is invented from a company alone.",
  },
  {
    id: "no-silent-site-selection",
    rule:
      "Multi-site companies with no siteId never get a silent site selection. "
      + "Single-site fallback only when the caller opts in via "
      + "resolveMode 'single-site-fallback'.",
  },
  {
    id: "domain-resolution-unchanged",
    rule:
      "Storefront/domain resolution is unchanged. Domains remain company-scoped "
      + "(host → company). No site_id domain binding in Phase 0.",
  },
  {
    id: "commerce-company-scoped",
    rule:
      "Commerce (products/orders/inventory/contacts/catalog) stays company-scoped. "
      + "No site_id migration in Phase 0.",
  },
  {
    id: "dual-site-identity-preserved",
    rule:
      "websiteConnection.siteId vs company_sites.id dual identity is preserved, "
      + "never destructively rewritten. company_sites.id is the canonical site id.",
  },
]);

/**
 * Returns the company-scoped behavior when site context is absent.
 * Legacy APIs may use this to normalize a missing site context.
 *
 * @param {Object|null} siteContext
 * @returns {{companyId: string|null, siteId: null, source: "none"}}
 */
export function legacyCompanyBehavior(siteContext) {
  return {
    companyId: siteContext?.companyId || null,
    siteId: null,
    source: "none",
  };
}

/**
 * True when the request is a legacy company-only request (no site context).
 *
 * @param {Object|null} siteContext
 * @returns {boolean}
 */
export function isLegacyCompanyOnlyRequest(siteContext) {
  return !siteContext || siteContext.siteId == null || siteContext.source === "none";
}