/**
 * Landing Page Platform — Public API barrel (Phase 0 Architecture Lock)
 *
 * Re-exports the shared platform entity model, ownership rules, site-context
 * contract, feature flags, access helpers, and compatibility rules.
 *
 * Phase 1 (My Sites) and later phases import from this barrel — never from
 * individual files — so the architecture stays ONE Source of Truth.
 */

export * from "./entities.js";
export * from "./ownership.js";
export * from "./siteContext.js";
export * from "./featureFlags.js";
export * from "./access.js";
export * from "./compatibility.js";