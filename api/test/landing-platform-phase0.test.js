import assert from "node:assert/strict";
import test from "node:test";

import {
  PLATFORM,
  USER,
  WORKSPACE,
  COMPANY,
  SITE,
  MEMBERSHIP,
  DOMAIN,
  MODULE,
  ENTITIES,
  getEntity,
  isCompanyScopedEntity,
  isSiteScopedConcept,
  isCommerceEntity,
  listCommerceEntities,
  normalizeSiteSummary,
  buildSiteContext,
  resolveSiteContext,
  assertSiteBelongsToCompany,
  listAccessibleSitesForCompany,
  SiteContextError,
  LANDING_PLATFORM_FLAGS,
  getLandingPlatformFlag,
  getLandingPlatformFlags,
  flagToEnvName,
  isPlatformSuperAdmin,
  canAccessCompany,
  canAccessSite,
  COMPATIBILITY_RULES,
  legacyCompanyBehavior,
  isLegacyCompanyOnlyRequest,
} from "../src/landingPlatform/index.js";

// --- Fixtures ---------------------------------------------------------------

const icareSiteA = {
  id: "site-icare-a",
  companyId: "icare",
  slug: "icare-storefront",
  name: "iCare",
  status: "active",
  defaultLocale: "en",
  settings: { legacyWebsiteConnectionSiteId: "icare-storefront" },
};

const icareSiteB = {
  id: "site-icare-b",
  companyId: "icare",
  slug: "icare-blog",
  name: "iCare Blog",
  status: "draft",
  defaultLocale: "en",
  settings: {},
};

const otherSite = {
  id: "site-other-1",
  companyId: "other-company",
  slug: "other-storefront",
  name: "Other",
  status: "active",
  defaultLocale: "en",
  settings: {},
};

const activeMembership = {
  companyId: "icare",
  userId: "user-1",
  role: "company_admin",
  status: "active",
  permissions: ["sites.manage"],
};

const inactiveMembership = {
  companyId: "icare",
  userId: "user-1",
  role: "employee",
  status: "inactive",
  permissions: [],
};

const superAdmin = { id: "user-super", role: "super_admin", permissions: [] };
const companyAdmin = { id: "user-1", role: "company_admin", permissions: [] };

// --- A. Shared platform entity model ----------------------------------------

test("entities export the locked canonical hierarchy constants", () => {
  assert.equal(PLATFORM.key, "platform");
  assert.equal(USER.key, "user");
  assert.equal(WORKSPACE.key, "workspace");
  assert.equal(COMPANY.key, "company");
  assert.equal(SITE.key, "site");
  assert.equal(MEMBERSHIP.key, "membership");
  assert.equal(DOMAIN.key, "domain");
  assert.equal(MODULE.key, "module");
  assert.equal(Object.isFrozen(PLATFORM), true);
  assert.equal(Object.isFrozen(ENTITIES), true);
  assert.equal(getEntity("company"), COMPANY);
  assert.equal(getEntity("nope"), null);
});

test("ownership marks commerce company-scoped and pages/theme site-concepts", () => {
  for (const entity of listCommerceEntities()) {
    assert.equal(isCompanyScopedEntity(entity), true, `${entity} must be company-scoped`);
    assert.equal(isCommerceEntity(entity), true, `${entity} must be a commerce entity`);
  }
  assert.equal(isCompanyScopedEntity("products"), true);
  assert.equal(isCompanyScopedEntity("orders"), true);
  assert.equal(isCompanyScopedEntity("inventory"), true);
  assert.equal(isCompanyScopedEntity("contacts"), true);
  assert.equal(isCompanyScopedEntity("catalog"), false); // not in the locked list
  assert.equal(isSiteScopedConcept("pages"), true);
  assert.equal(isSiteScopedConcept("theme"), true);
  assert.equal(isSiteScopedConcept("page_versions"), true);
  assert.equal(isSiteScopedConcept("publish"), true);
  assert.equal(isSiteScopedConcept("products"), false);
  assert.equal(isSiteScopedConcept("orders"), false);
});

// --- B. Site context contract -----------------------------------------------

test("normalizeSiteSummary normalizes a site row", () => {
  const summary = normalizeSiteSummary(icareSiteA);
  assert.equal(summary.id, "site-icare-a");
  assert.equal(summary.companyId, "icare");
  assert.equal(summary.slug, "icare-storefront");
  assert.equal(summary.status, "active");
  assert.equal(normalizeSiteSummary(null), null);
  assert.equal(normalizeSiteSummary("nope"), null);
});

test("buildSiteContext builds the full contract shape", () => {
  const context = buildSiteContext({
    companyId: "icare",
    site: icareSiteA,
    membership: activeMembership,
    modules: ["storefront.website_texts", "products"],
    primaryDomain: "icare.example.com",
    source: "explicit",
  });
  assert.equal(context.companyId, "icare");
  assert.equal(context.siteId, "site-icare-a");
  assert.equal(context.slug, "icare-storefront");
  assert.equal(context.name, "iCare");
  assert.equal(context.status, "active");
  assert.equal(context.primaryDomain, "icare.example.com");
  assert.deepEqual(context.membership, { role: "company_admin", permissions: ["sites.manage"] });
  assert.deepEqual(context.modules, ["storefront.website_texts", "products"]);
  assert.equal(context.source, "explicit");
});

test("buildSiteContext rejects a site from another company", () => {
  assert.throws(
    () => buildSiteContext({ companyId: "icare", site: otherSite }),
    (error) => error instanceof SiteContextError && error.code === "SITE_NOT_IN_COMPANY",
  );
});

test("one site + single-site-fallback resolves with source single-site", () => {
  const context = resolveSiteContext({
    companyId: "icare",
    sites: [icareSiteA],
    membership: activeMembership,
    resolveMode: "single-site-fallback",
  });
  assert.equal(context.siteId, "site-icare-a");
  assert.equal(context.source, "single-site");
  assert.equal(context.companyId, "icare");
});

test("one site + default resolve mode leaves site null (legacy behavior)", () => {
  const context = resolveSiteContext({
    companyId: "icare",
    sites: [icareSiteA],
    membership: activeMembership,
  });
  assert.equal(context.siteId, null);
  assert.equal(context.source, "none");
});

test("multiple sites + no siteId → siteId null, no leak of other company sites", () => {
  const context = resolveSiteContext({
    companyId: "icare",
    sites: [icareSiteA, icareSiteB, otherSite],
    membership: activeMembership,
    resolveMode: "single-site-fallback",
  });
  assert.equal(context.siteId, null);
  assert.equal(context.source, "none");
  assert.equal(context.companyId, "icare");
  // The other-company site must never surface.
  assert.notEqual(context.siteId, otherSite.id);
});

test("explicit siteId resolves with source explicit", () => {
  const context = resolveSiteContext({
    companyId: "icare",
    siteId: "site-icare-b",
    sites: [icareSiteA, icareSiteB],
    membership: activeMembership,
  });
  assert.equal(context.siteId, "site-icare-b");
  assert.equal(context.source, "explicit");
});

test("wrong company site is rejected", () => {
  assert.throws(
    () => resolveSiteContext({
      companyId: "icare",
      siteId: "site-other-1",
      sites: [icareSiteA, otherSite],
    }),
    (error) => error instanceof SiteContextError && error.code === "SITE_NOT_IN_COMPANY",
  );
});

test("invalid siteId is rejected", () => {
  assert.throws(
    () => resolveSiteContext({
      companyId: "icare",
      siteId: "site-does-not-exist",
      sites: [icareSiteA],
    }),
    (error) => error instanceof SiteContextError && error.code === "SITE_NOT_IN_COMPANY",
  );
});

test("missing site context is a safe fallback (company behavior)", () => {
  const context = resolveSiteContext({
    companyId: "icare",
    sites: [],
    membership: activeMembership,
  });
  assert.equal(context.siteId, null);
  assert.equal(context.source, "none");
  assert.equal(context.companyId, "icare");
  assert.equal(context.membership.role, "company_admin");

  const legacy = legacyCompanyBehavior(context);
  assert.equal(legacy.companyId, "icare");
  assert.equal(legacy.siteId, null);
  assert.equal(legacy.source, "none");
  assert.equal(isLegacyCompanyOnlyRequest(context), true);
  assert.equal(isLegacyCompanyOnlyRequest(null), true);
  assert.equal(isLegacyCompanyOnlyRequest({ companyId: "icare", siteId: "x", source: "explicit" }), false);
});

test("resolveSiteContext requires a valid companyId", () => {
  assert.throws(
    () => resolveSiteContext({ companyId: "", sites: [icareSiteA] }),
    (error) => error instanceof SiteContextError && error.code === "INVALID_COMPANY",
  );
});

test("assertSiteBelongsToCompany enforces ownership", () => {
  assert.equal(assertSiteBelongsToCompany(icareSiteA, "icare").id, "site-icare-a");
  assert.throws(
    () => assertSiteBelongsToCompany(otherSite, "icare"),
    (error) => error instanceof SiteContextError && error.code === "SITE_NOT_IN_COMPANY",
  );
  assert.throws(
    () => assertSiteBelongsToCompany(null, "icare"),
    (error) => error instanceof SiteContextError && error.code === "SITE_REQUIRED",
  );
});

test("listAccessibleSitesForCompany is identity (no cross-company leak)", () => {
  const accessible = listAccessibleSitesForCompany([icareSiteA, icareSiteB]);
  assert.equal(accessible.length, 2);
  assert.ok(accessible.every((site) => site.companyId === "icare"));
});

// --- C. Feature flags --------------------------------------------------------

test("feature flags default to false", () => {
  const flags = getLandingPlatformFlags({});
  assert.equal(flags.landingPlatformEnabled, false);
  assert.equal(flags.mySitesEnabled, false);
  assert.equal(flags.siteContextEnabled, false);
  assert.equal(getLandingPlatformFlag(null, "mySitesEnabled"), false);
});

test("feature flags resolve from company settings", () => {
  const company = {
    settings: {
      landingPlatformFlags: {
        landingPlatformEnabled: true,
        mySitesEnabled: false,
        siteContextEnabled: true,
      },
    },
  };
  const flags = getLandingPlatformFlags(company);
  assert.equal(flags.landingPlatformEnabled, true);
  assert.equal(flags.mySitesEnabled, false);
  assert.equal(flags.siteContextEnabled, true);
});

test("feature flags resolve from raw settings object", () => {
  const settings = { landingPlatformFlags: { mySitesEnabled: true } };
  assert.equal(getLandingPlatformFlag(settings, "mySitesEnabled"), true);
  assert.equal(getLandingPlatformFlag(settings, "siteContextEnabled"), false);
});

test("feature flags resolve from env override (true/1)", () => {
  const envName = flagToEnvName("mySitesEnabled");
  assert.equal(envName, "LANDING_PLATFORM_MY_SITES_ENABLED");
  process.env[envName] = "true";
  try {
    assert.equal(getLandingPlatformFlag({}, "mySitesEnabled"), true);
  } finally {
    delete process.env[envName];
  }
  process.env[envName] = "1";
  try {
    assert.equal(getLandingPlatformFlag({}, "mySitesEnabled"), true);
  } finally {
    delete process.env[envName];
  }
  assert.equal(getLandingPlatformFlag({}, "mySitesEnabled"), false);
});

test("feature flags: settings take precedence over env", () => {
  const envName = flagToEnvName("siteContextEnabled");
  process.env[envName] = "true";
  try {
    const company = { settings: { landingPlatformFlags: { siteContextEnabled: false } } };
    assert.equal(getLandingPlatformFlag(company, "siteContextEnabled"), false);
  } finally {
    delete process.env[envName];
  }
});

test("feature flags reject unknown flag keys", () => {
  assert.throws(() => getLandingPlatformFlag({}, "notAFlag"), TypeError);
});

// --- D. Auth / access helpers ------------------------------------------------

test("isPlatformSuperAdmin uses globalRole/role patterns", () => {
  assert.equal(isPlatformSuperAdmin(superAdmin), true);
  assert.equal(isPlatformSuperAdmin({ globalRole: "super_admin", role: "employee" }), true);
  assert.equal(isPlatformSuperAdmin(companyAdmin), false);
  assert.equal(isPlatformSuperAdmin(null), false);
});

test("canAccessCompany: active membership or super admin", () => {
  assert.equal(canAccessCompany(companyAdmin, "icare", activeMembership), true);
  assert.equal(canAccessCompany(companyAdmin, "other-company", activeMembership), false);
  assert.equal(canAccessCompany(companyAdmin, "icare", inactiveMembership), false);
  assert.equal(canAccessCompany(companyAdmin, "icare", null), false);
  assert.equal(canAccessCompany(superAdmin, "icare", null), true);
  assert.equal(canAccessCompany(superAdmin, "other-company", null), true);
  assert.equal(canAccessCompany(superAdmin, "", null), false);
});

test("canAccessSite: company access + site belongs to company", () => {
  assert.equal(canAccessSite({ user: companyAdmin, companyId: "icare", site: icareSiteA, membership: activeMembership }), true);
  assert.equal(canAccessSite({ user: companyAdmin, companyId: "icare", site: otherSite, membership: activeMembership }), false);
  assert.equal(canAccessSite({ user: companyAdmin, companyId: "icare", site: null, membership: activeMembership }), false);
  assert.equal(canAccessSite({ user: superAdmin, companyId: "icare", site: icareSiteA, membership: null }), true);
  assert.equal(canAccessSite({ user: superAdmin, companyId: "icare", site: otherSite, membership: null }), false);
});

// --- E. Compatibility module -------------------------------------------------

test("compatibility rules encode the locked guarantees", () => {
  const ids = COMPATIBILITY_RULES.map((rule) => rule.id);
  assert.ok(ids.includes("legacy-company-only"));
  assert.ok(ids.includes("missing-site-context"));
  assert.ok(ids.includes("no-silent-site-selection"));
  assert.ok(ids.includes("domain-resolution-unchanged"));
  assert.ok(ids.includes("commerce-company-scoped"));
  assert.ok(ids.includes("dual-site-identity-preserved"));
});