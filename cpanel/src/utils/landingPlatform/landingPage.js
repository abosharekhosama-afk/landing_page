/**
 * Landing Page Platform — Post-login landing (CPanel, Phase 1 My Sites)
 *
 * Flag-gated wrapper around the existing `landingPage` hook
 * (cpanel/src/utils/cpanelAccess.js). Behavior:
 *
 * - When `mySitesEnabled` OR `landingPlatformEnabled` is true for the company,
 *   tenant users who can access `admin-sites` land on My Sites after login.
 * - Super Admin platform overview landing is NEVER changed (role super_admin
 *   keeps `admin-platform-companies`).
 * - When flags are off (default), this returns the existing landing exactly —
 *   current UX is preserved.
 */

import { canAccessAdminPage } from "../roles.js";
import { landingPage } from "../cpanelAccess.js";
import { getLandingPlatformFlags } from "./featureFlags.js";

/**
 * Resolves the post-login landing page, preferring My Sites when the
 * landing-platform flags are enabled for the company.
 *
 * @param {Object|null} user
 * @param {Array<Object>} [modules] — company modules
 * @param {Object|null} [company] — active company (settings carry the flags)
 * @returns {string} admin page key
 */
export function landingPageForUser(user, modules, company) {
  if (!user) return landingPage(user, modules);
  const flags = getLandingPlatformFlags(company);
  const mySitesOn = flags.mySitesEnabled || flags.landingPlatformEnabled;
  if (mySitesOn && user.role !== "super_admin" && canAccessAdminPage(user, "admin-sites")) {
    return "admin-sites";
  }
  return landingPage(user, modules);
}