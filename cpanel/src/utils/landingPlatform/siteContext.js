/**
 * Landing Page Platform — Site Context Contract (CPanel mirror)
 *
 * Mirrors api/src/landingPlatform/siteContext.js — keep BOTH in sync
 * (same shape, same rules). This is a pure module: never uses localStorage
 * as Source of Truth. Phase 1 may wire optional in-memory/session helpers
 * on top of these pure functions.
 *
 * Rules (LOCKED):
 * 1. Always require a valid companyId from existing tenant resolution — never
 *    invent a tenant from a site alone.
 * 2. If siteId is provided: it must belong to that company; otherwise reject
 *    (throw SiteContextError / return invalid).
 * 3. If siteId is absent:
 *    - do NOT auto-pick when the company has MULTIPLE sites (source 'none',
 *      siteId null)
 *    - if exactly ONE site and the caller opts in via
 *      resolveMode: 'single-site-fallback', that site may be set with
 *      source 'single-site'
 *    - default resolve mode for legacy APIs: leave site null (source 'none') —
 *      legacy behavior unchanged
 * 4. Never use localStorage as Source of Truth.
 * 5. Do not require a site on existing company-scoped routes.
 * 6. An archived site never becomes an active site context: an explicit
 *    siteId for an archived site is rejected with SITE_ARCHIVED, and the
 *    single-site fallback never picks an archived site.
 */

/** Valid site-context sources. */
export const SITE_CONTEXT_SOURCES = Object.freeze(["explicit", "single-site", "none"]);

/** Valid site statuses (mirrors company_sites.status). */
export const SITE_STATUSES = Object.freeze(["active", "draft", "archived"]);

/** Typed error for site-context violations. */
export class SiteContextError extends Error {
  constructor(message, code = "SITE_CONTEXT_ERROR") {
    super(message);
    this.name = "SiteContextError";
    this.code = code;
  }
}

function normalizeCompanyId(companyId) {
  return typeof companyId === "string" && companyId.trim()
    ? companyId.trim()
    : "";
}

/**
 * True when a site row/summary is archived.
 *
 * @param {Object|null} site
 * @returns {boolean}
 */
export function isArchivedSite(site) {
  return site?.status === "archived";
}

function archivedSiteError(siteId) {
  return new SiteContextError(`Site ${siteId} is archived.`, "SITE_ARCHIVED");
}

/**
 * @typedef {Object} SiteSummary
 * @property {string} id
 * @property {string} companyId
 * @property {string} slug
 * @property {string} name
 * @property {"active"|"draft"|"archived"} status
 * @property {string} defaultLocale
 * @property {Object} settings
 */

/**
 * @typedef {Object} SiteContext
 * @property {string} companyId
 * @property {string|null} siteId        — null when absent (compat)
 * @property {string|null} slug
 * @property {string|null} name
 * @property {string|null} status
 * @property {string|null} primaryDomain — null if unknown; domains remain company-scoped
 * @property {{role: string|null, permissions: string[]}|null} membership
 * @property {string[]|null} modules     — enabled module keys or null
 * @property {"explicit"|"single-site"|"none"} source
 */

/**
 * Normalizes a raw site row (company_sites) into a SiteSummary.
 * Returns null for non-object input.
 *
 * @param {Object|null} siteRow
 * @returns {SiteSummary|null}
 */
export function normalizeSiteSummary(siteRow) {
  if (!siteRow || typeof siteRow !== "object" || Array.isArray(siteRow)) return null;
  return {
    id: String(siteRow.id || "").trim(),
    companyId: normalizeCompanyId(siteRow.companyId || siteRow.company_id),
    slug: String(siteRow.slug || "").trim().toLowerCase(),
    name: String(siteRow.name || "").trim(),
    status: SITE_STATUSES.includes(siteRow.status) ? siteRow.status : "active",
    defaultLocale: siteRow.defaultLocale || siteRow.default_locale || "en",
    settings:
      siteRow.settings && typeof siteRow.settings === "object" && !Array.isArray(siteRow.settings)
        ? siteRow.settings
        : {},
  };
}

/**
 * Asserts a site belongs to the given company. Throws SiteContextError when
 * the site is missing or belongs to another company.
 *
 * @param {Object|null} site
 * @param {string} companyId
 * @returns {SiteSummary} the normalized site summary
 */
export function assertSiteBelongsToCompany(site, companyId) {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const summary = normalizeSiteSummary(site);
  if (!summary || !summary.id) {
    throw new SiteContextError("A site is required to assert company ownership.", "SITE_REQUIRED");
  }
  if (summary.companyId !== normalizedCompanyId) {
    throw new SiteContextError(
      `Site ${summary.id} does not belong to company ${normalizedCompanyId}.`,
      "SITE_NOT_IN_COMPANY",
    );
  }
  return summary;
}

/**
 * Builds a SiteContext from already-resolved parts. Throws SiteContextError
 * when a site is provided but does not belong to the company.
 *
 * @param {Object} input
 * @param {string} input.companyId
 * @param {Object|null} [input.site]
 * @param {Object|null} [input.membership]  — { role, permissions } or repository membership
 * @param {string[]|null} [input.modules]
 * @param {string|null} [input.primaryDomain]
 * @param {"explicit"|"single-site"|"none"} [input.source]
 * @returns {SiteContext}
 */
export function buildSiteContext({
  companyId,
  site = null,
  membership = null,
  modules = null,
  primaryDomain = null,
  source = "none",
}) {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const summary = site ? normalizeSiteSummary(site) : null;
  if (site && (!summary || !summary.id)) {
    throw new SiteContextError("A site is required to build site context.", "SITE_REQUIRED");
  }
  if (summary && summary.companyId !== normalizedCompanyId) {
    throw new SiteContextError(
      `Site ${summary.id} does not belong to company ${normalizedCompanyId}.`,
      "SITE_NOT_IN_COMPANY",
    );
  }
  if (isArchivedSite(summary)) throw archivedSiteError(summary.id);

  const membershipRole = membership?.role || membership?.membershipRole || null;
  const membershipPermissions = Array.isArray(membership?.permissions)
    ? [...membership.permissions]
    : Array.isArray(membership?._permissions)
      ? [...membership._permissions]
      : [];

  return {
    companyId: normalizedCompanyId,
    siteId: summary ? summary.id : null,
    slug: summary ? summary.slug : null,
    name: summary ? summary.name : null,
    status: summary ? summary.status : null,
    primaryDomain: primaryDomain || null,
    membership: membership
      ? { role: membershipRole, permissions: membershipPermissions }
      : null,
    modules: Array.isArray(modules) ? [...modules] : null,
    source: SITE_CONTEXT_SOURCES.includes(source) ? source : "none",
  };
}

/**
 * Picks the primary domain from a company-scoped domain list (identity helper).
 * Domains remain company-scoped — this never invents a site-scoped domain.
 *
 * @param {Array<Object|string>|null} domains
 * @returns {string|null}
 */
export function pickPrimaryDomain(domains) {
  if (!Array.isArray(domains) || domains.length === 0) return null;
  const preferred = domains.find((entry) => {
    const domain = typeof entry === "string" ? entry : entry?.domain;
    return domain && entry?.is_primary === true;
  });
  const first = domains[0];
  const value = preferred
    ? (typeof preferred === "string" ? preferred : preferred.domain)
    : (typeof first === "string" ? first : first?.domain);
  return value ? String(value).trim() : null;
}

/**
 * Resolves a SiteContext from a companyId + optional siteId + company-scoped
 * site list. This is the ONLY place site selection rules live.
 *
 * @param {Object} input
 * @param {string} input.companyId          — from existing tenant resolution (never invented)
 * @param {string|null} [input.siteId]      — optional explicit site id
 * @param {Array<Object>} [input.sites]     — company-scoped sites
 * @param {Object|null} [input.membership]
 * @param {string[]|null} [input.modules]
 * @param {Array<Object|string>|null} [input.domains]
 * @param {"none"|"single-site-fallback"} [input.resolveMode] — default 'none' (legacy behavior)
 * @returns {SiteContext}
 * @throws {SiteContextError} when siteId is provided but not found in the company's sites
 *   (SITE_NOT_IN_COMPANY) or the site is archived (SITE_ARCHIVED)
 */
export function resolveSiteContext({
  companyId,
  siteId = null,
  sites = [],
  membership = null,
  modules = null,
  domains = null,
  resolveMode = "none",
}) {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  if (!normalizedCompanyId) {
    throw new SiteContextError(
      "A valid companyId is required to resolve site context.",
      "INVALID_COMPANY",
    );
  }

  // Defensive: only consider sites that belong to this company. This prevents
  // any cross-company leak even if the caller passes a mixed list.
  const companySites = (Array.isArray(sites) ? sites : [])
    .map(normalizeSiteSummary)
    .filter((site) => site && site.companyId === normalizedCompanyId);

  // Explicit siteId: must belong to the company, else reject.
  if (siteId != null && String(siteId).trim() !== "") {
    const requested = String(siteId).trim();
    const site = companySites.find((entry) => entry.id === requested) || null;
    if (!site) {
      throw new SiteContextError(
        `Site ${requested} does not belong to company ${normalizedCompanyId}.`,
        "SITE_NOT_IN_COMPANY",
      );
    }
    if (isArchivedSite(site)) throw archivedSiteError(site.id);
    return buildSiteContext({
      companyId: normalizedCompanyId,
      site,
      membership,
      modules,
      primaryDomain: pickPrimaryDomain(domains),
      source: "explicit",
    });
  }

  // No siteId: single-site fallback only when the caller opts in AND the
  // company has exactly one site. Never auto-pick for multi-site companies.
  if (
    companySites.length === 1
    && !isArchivedSite(companySites[0])
    && resolveMode === "single-site-fallback"
  ) {
    return buildSiteContext({
      companyId: normalizedCompanyId,
      site: companySites[0],
      membership,
      modules,
      primaryDomain: pickPrimaryDomain(domains),
      source: "single-site",
    });
  }

  // Default: no site selection (legacy behavior unchanged).
  return buildSiteContext({
    companyId: normalizedCompanyId,
    site: null,
    membership,
    modules,
    primaryDomain: pickPrimaryDomain(domains),
    source: "none",
  });
}

/**
 * Lists accessible sites for a company. Identity for now: callers must pass
 * company-scoped sites. No cross-company leak is introduced here.
 *
 * @param {Array<Object>} sites
 * @returns {Array<SiteSummary>}
 */
export function listAccessibleSitesForCompany(sites) {
  return (Array.isArray(sites) ? sites : [])
    .map(normalizeSiteSummary)
    .filter(Boolean);
}