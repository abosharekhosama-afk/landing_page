/**
 * Landing Page Platform — Feature Flags (CPanel mirror)
 *
 * Mirrors api/src/landingPlatform/featureFlags.js — keep BOTH in sync
 * (same keys, same resolution order). This is the ONLY landing-platform flag
 * source in CPanel — do not invent a second flag system.
 *
 * Resolution order (per flag):
 *   1. company.settings.landingPlatformFlags[flag]  (boolean, if object exists)
 *   2. default false
 *
 * The API mirror additionally honors process.env.LANDING_PLATFORM_<FLAG>
 * server-side; CPanel runs in the browser, so company settings are the
 * Source of Truth here. Flags default to FALSE for rollout — existing tenants
 * keep their current UX until a flag is explicitly enabled.
 */

/** Flag keys (frozen — same as the API mirror). */
export const LANDING_PLATFORM_FLAGS = Object.freeze({
  LANDING_PLATFORM_ENABLED: "landingPlatformEnabled",
  MY_SITES_ENABLED: "mySitesEnabled",
  SITE_CONTEXT_ENABLED: "siteContextEnabled",
});

/** All flag keys as an array. */
export const LANDING_PLATFORM_FLAG_KEYS = Object.freeze(
  Object.values(LANDING_PLATFORM_FLAGS),
);

/** Defaults — all false for rollout. */
const FLAG_DEFAULTS = Object.freeze({
  landingPlatformEnabled: false,
  mySitesEnabled: false,
  siteContextEnabled: false,
});

/**
 * Reads the settings object from a company record or a raw settings object.
 * Accepts either { settings: {...} } or {...} directly.
 */
function settingsFrom(companyOrSettings) {
  if (!companyOrSettings || typeof companyOrSettings !== "object") return {};
  if (
    companyOrSettings.settings
    && typeof companyOrSettings.settings === "object"
    && !Array.isArray(companyOrSettings.settings)
  ) {
    return companyOrSettings.settings;
  }
  return companyOrSettings;
}

/**
 * Resolves a single flag for a company (or raw settings object).
 *
 * @param {Object|null} companyOrSettings — company record or settings object
 * @param {string} flag — one of LANDING_PLATFORM_FLAG_KEYS
 * @returns {boolean}
 */
export function getLandingPlatformFlag(companyOrSettings, flag) {
  if (!LANDING_PLATFORM_FLAG_KEYS.includes(flag)) {
    throw new TypeError(`Unknown landing platform flag: ${flag}`);
  }

  // 1. Company settings override (boolean only).
  const settings = settingsFrom(companyOrSettings);
  const flags = settings.landingPlatformFlags;
  if (flags && typeof flags === "object" && !Array.isArray(flags)) {
    if (typeof flags[flag] === "boolean") return flags[flag];
  }

  // 2. Default false.
  return FLAG_DEFAULTS[flag];
}

/**
 * Resolves all three landing-platform flags for a company (or settings object).
 *
 * @param {Object|null} companyOrSettings
 * @returns {{landingPlatformEnabled: boolean, mySitesEnabled: boolean, siteContextEnabled: boolean}}
 */
export function getLandingPlatformFlags(companyOrSettings) {
  return {
    landingPlatformEnabled: getLandingPlatformFlag(
      companyOrSettings,
      LANDING_PLATFORM_FLAGS.LANDING_PLATFORM_ENABLED,
    ),
    mySitesEnabled: getLandingPlatformFlag(
      companyOrSettings,
      LANDING_PLATFORM_FLAGS.MY_SITES_ENABLED,
    ),
    siteContextEnabled: getLandingPlatformFlag(
      companyOrSettings,
      LANDING_PLATFORM_FLAGS.SITE_CONTEXT_ENABLED,
    ),
  };
}