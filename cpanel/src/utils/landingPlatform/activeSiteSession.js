/**
 * Landing Page Platform — Active Site Session (CPanel, Phase 1 My Sites + Phase 2 Site Dashboard)
 *
 * Thin in-memory session on top of the Phase 0 site-context contract
 * (cpanel/src/utils/landingPlatform/siteContext.js). Rules (LOCKED):
 *
 * 1. localStorage is NEVER the Source of Truth. Live session is in-memory;
 *    sessionStorage may hold a restore HINT only (always revalidated).
 * 2. Contexts are always built through `resolveSiteContext` / `buildSiteContext`
 *    from the Phase 0 mirror — never hand-assembled here.
 * 3. `setActiveSiteContext` accepts an already-resolved SiteContext (e.g. from
 *    `resolveSiteContext` with an explicit siteId) and stores it as-is.
 * 4. `syncSiteIdToUrl` optionally mirrors the active siteId onto the URL
 *    (`?siteId=`) when entering Manage/Edit — best-effort, never a SoT.
 * 5. Other company routes never require a site context.
 *
 * Phase 2 additions (still NOT Source of Truth):
 * 6. A sessionStorage restore HINT (`landingPlatform.activeSiteHint.v1`) may
 *    store the minimal `{ companyId, siteId }` when activating/switching. It is
 *    only a convenience for deep links — every restore revalidates through
 *    `resolveSiteContext` with the current company sites.
 * 7. `restoreActiveSiteContext` reads the hint OR the URL `?siteId=` (URL wins
 *    after revalidation), revalidates via `resolveSiteContext` with an explicit
 *    siteId, and fails safe (clears memory + hint, returns null) on any
 *    invalid/stale/cross-company/archived value. It NEVER auto-picks a site
 *    (`resolveMode: "none"`).
 * 8. On company switch / logout the caller clears memory + that company's hint.
 */

import { buildSiteContext, resolveSiteContext } from "./siteContext.js";

/** sessionStorage key for the restore hint (versioned; value carries companyId). */
export const ACTIVE_SITE_HINT_KEY = "landingPlatform.activeSiteHint.v1";

/** In-memory active site context (module-level, not persisted). */
let activeSiteContext = null;

function normalizeCompanyId(companyId) {
  return typeof companyId === "string" && companyId.trim() ? companyId.trim() : "";
}

/**
 * Stores an already-resolved SiteContext in memory.
 *
 * @param {Object|null} context — a SiteContext from resolveSiteContext/buildSiteContext
 * @returns {Object|null} the stored context (null clears the session)
 */
export function setActiveSiteContext(context) {
  activeSiteContext = context && typeof context === "object" ? context : null;
  return activeSiteContext;
}

/**
 * Returns the in-memory active site context (or null).
 *
 * @returns {Object|null}
 */
export function getActiveSiteContext() {
  return activeSiteContext;
}

/**
 * Clears the in-memory active site context.
 */
export function clearActiveSiteContext() {
  activeSiteContext = null;
}

/**
 * Builds an explicit site context for a company site and stores it in memory.
 * Uses the Phase 0 `resolveSiteContext` contract with an explicit siteId —
 * never auto-picks for multi-site companies. Also persists the minimal
 * sessionStorage restore hint (NOT Source of Truth).
 *
 * @param {Object} input
 * @param {string} input.companyId
 * @param {string} input.siteId
 * @param {Array<Object>} [input.sites] — company-scoped sites
 * @param {Object|null} [input.membership]
 * @param {string[]|null} [input.modules] — enabled module keys
 * @param {Array<Object|string>|null} [input.domains] — company-scoped domains
 * @returns {Object} the resolved SiteContext (source: 'explicit')
 * @throws {SiteContextError} when the site does not belong to the company
 */
export function activateSiteContext({
  companyId,
  siteId,
  sites = [],
  membership = null,
  modules = null,
  domains = null,
}) {
  const context = resolveSiteContext({
    companyId,
    siteId,
    sites,
    membership,
    modules,
    domains,
    resolveMode: "none", // explicit siteId path only
  });
  setActiveSiteContext(context);
  persistActiveSiteHint(context);
  return context;
}

/**
 * Best-effort mirror of the active siteId onto the current URL (`?siteId=`).
 * Never a Source of Truth — purely a convenience for deep links.
 *
 * @param {string|null} siteId
 */
export function syncSiteIdToUrl(siteId) {
  if (typeof window === "undefined" || typeof window.history?.replaceState !== "function") return;
  const value = String(siteId || "").trim();
  try {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set("siteId", value);
    else url.searchParams.delete("siteId");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // Best-effort only — never throw into the UI.
  }
}

/**
 * Reads the current `?siteId=` from the URL (best-effort).
 *
 * @returns {string|null}
 */
export function readSiteIdFromUrl() {
  if (typeof window === "undefined" || typeof window.location?.href !== "string") return null;
  try {
    const url = new URL(window.location.href);
    const siteId = String(url.searchParams.get("siteId") || "").trim();
    return siteId || null;
  } catch {
    return null;
  }
}

/**
 * Persists the minimal restore hint `{ companyId, siteId }` in sessionStorage.
 * NEVER a Source of Truth — every restore revalidates through
 * `resolveSiteContext`. Clearing (null context / missing ids) removes the hint.
 *
 * @param {Object|null} context — a SiteContext (or { companyId, siteId })
 */
export function persistActiveSiteHint(context) {
  if (typeof sessionStorage === "undefined") return;
  const companyId = normalizeCompanyId(context?.companyId);
  const siteId = String(context?.siteId || "").trim();
  if (!companyId || !siteId) {
    clearActiveSiteHint();
    return;
  }
  try {
    sessionStorage.setItem(ACTIVE_SITE_HINT_KEY, JSON.stringify({ companyId, siteId }));
  } catch {
    // Best-effort only — never throw into the UI.
  }
}

/**
 * Reads the stored restore hint (or null when absent/invalid).
 *
 * @returns {{companyId: string, siteId: string}|null}
 */
export function readActiveSiteHint() {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ACTIVE_SITE_HINT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const companyId = normalizeCompanyId(parsed.companyId);
    const siteId = String(parsed.siteId || "").trim();
    return companyId && siteId ? { companyId, siteId } : null;
  } catch {
    return null;
  }
}

/**
 * Clears the restore hint. When `companyId` is provided, only the hint that
 * belongs to that company is removed (never another company's hint).
 *
 * @param {string} [companyId]
 */
export function clearActiveSiteHint(companyId) {
  if (typeof sessionStorage === "undefined") return;
  const hint = readActiveSiteHint();
  const requested = normalizeCompanyId(companyId);
  if (requested && hint && hint.companyId !== requested) return;
  try {
    sessionStorage.removeItem(ACTIVE_SITE_HINT_KEY);
  } catch {
    // Best-effort only.
  }
}

/**
 * Restores the active site context from the sessionStorage hint OR the URL
 * `?siteId=` (URL wins after revalidation). Always revalidates through
 * `resolveSiteContext` with an explicit siteId + the current company sites —
 * never auto-picks (`resolveMode: "none"`). Fails safe on any
 * invalid/stale/cross-company value: clears memory + hint and returns null.
 *
 * @param {Object} input
 * @param {string} input.companyId — from existing tenant resolution (never invented)
 * @param {Array<Object>} [input.sites] — current company-scoped sites
 * @param {Object|null} [input.membership]
 * @param {string[]|null} [input.modules]
 * @param {Array<Object|string>|null} [input.domains]
 * @param {(error: Error) => void} [input.onRejected] — called with the rejection
 *   (e.g. SiteContextError code SITE_ARCHIVED) after the fail-safe clear
 * @returns {Object|null} the restored SiteContext or null (fail safe)
 */
export function restoreActiveSiteContext({
  companyId,
  sites = [],
  membership = null,
  modules = null,
  domains = null,
  onRejected = null,
}) {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  if (!normalizedCompanyId) return null;

  const hint = readActiveSiteHint();
  const urlSiteId = readSiteIdFromUrl();

  // URL wins over the hint when both are present and disagree (after revalidation).
  let candidateSiteId = null;
  if (urlSiteId) {
    candidateSiteId = urlSiteId;
  } else if (hint && hint.companyId === normalizedCompanyId && hint.siteId) {
    candidateSiteId = hint.siteId;
  }

  if (!candidateSiteId) {
    // A cross-company / stale hint must not linger — fail safe.
    if (hint && hint.companyId !== normalizedCompanyId) {
      clearActiveSiteContext();
      clearActiveSiteHint();
    }
    return null;
  }

  try {
    const context = resolveSiteContext({
      companyId: normalizedCompanyId,
      siteId: candidateSiteId,
      sites,
      membership,
      modules,
      domains,
      resolveMode: "none", // explicit siteId path only — never auto-pick
    });
    if (!context.siteId) {
      clearActiveSiteContext();
      clearActiveSiteHint();
      return null;
    }
    setActiveSiteContext(context);
    persistActiveSiteHint(context);
    return context;
  } catch (error) {
    // Invalid / stale / cross-company / archived → fail safe. Never invent a site.
    clearActiveSiteContext();
    clearActiveSiteHint();
    if (typeof onRejected === "function") onRejected(error);
    return null;
  }
}

export { buildSiteContext };