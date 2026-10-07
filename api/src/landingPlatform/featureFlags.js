/**
 * Landing Page Platform — Feature Flags (Phase 0 Architecture Lock)
 *
 * Small reusable flag system. This is the ONLY landing-platform flag source —
 * do not invent a second config platform.
 *
 * Flags default to FALSE for rollout. Existing tenants keep their current UX
 * until a flag is explicitly enabled per company (settings) or via env.
 *
 * Resolution order (per flag):
 *   1. company.settings.landingPlatformFlags[flag]  (boolean, if object exists)
 *   2. process.env.LANDING_PLATFORM_<FLAG>          ('true' / '1')
 *   3. default false
 *
 * Env var names are derived from the flag key (camelCase → SCREAMING_SNAKE_CASE):
 *   landingPlatformEnabled → LANDING_PLATFORM_LANDING_PLATFORM_ENABLED
 *   mySitesEnabled         → LANDING_PLATFORM_MY_SITES_ENABLED
 *   siteContextEnabled     → LANDING_PLATFORM_SITE_CONTEXT_ENABLED
 *
 * Phase 0 is PREP ONLY: do not change AdminLayout/nav based on these flags yet.
 */

/** Flag keys (frozen). */
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

/** Converts a camelCase flag key to its SCREAMING_SNAKE_CASE env suffix. */
export function flagToEnvName(flag) {
  return `LANDING_PLATFORM_${String(flag || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toUpperCase()}`;
}

function parseEnvBoolean(value) {
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return null;
}

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

  // 2. Environment override ('true' / '1').
  const envValue = parseEnvBoolean(process.env[flagToEnvName(flag)]);
  if (envValue !== null) return envValue;

  // 3. Default false.
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