import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeSiteSummary,
  buildSiteContext,
  resolveSiteContext,
  assertSiteBelongsToCompany,
  listAccessibleSitesForCompany,
  SiteContextError,
  SITE_CONTEXT_SOURCES,
} from "../src/utils/landingPlatform/siteContext.js";

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

const membership = {
  companyId: "icare",
  role: "company_admin",
  status: "active",
  permissions: ["sites.manage"],
};

test("cpanel mirror exports the same contract surface", () => {
  assert.deepEqual(SITE_CONTEXT_SOURCES, ["explicit", "single-site", "none"]);
  assert.equal(typeof normalizeSiteSummary, "function");
  assert.equal(typeof buildSiteContext, "function");
  assert.equal(typeof resolveSiteContext, "function");
  assert.equal(typeof assertSiteBelongsToCompany, "function");
  assert.equal(typeof listAccessibleSitesForCompany, "function");
});

test("normalizeSiteSummary mirrors the API shape", () => {
  const summary = normalizeSiteSummary(icareSiteA);
  assert.equal(summary.id, "site-icare-a");
  assert.equal(summary.companyId, "icare");
  assert.equal(summary.slug, "icare-storefront");
  assert.equal(summary.status, "active");
  assert.equal(normalizeSiteSummary(null), null);
});

test("buildSiteContext builds the full contract shape", () => {
  const context = buildSiteContext({
    companyId: "icare",
    site: icareSiteA,
    membership,
    modules: ["storefront.website_texts"],
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
  assert.deepEqual(context.modules, ["storefront.website_texts"]);
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
    membership,
    resolveMode: "single-site-fallback",
  });
  assert.equal(context.siteId, "site-icare-a");
  assert.equal(context.source, "single-site");
});

test("one site + default resolve mode leaves site null (legacy behavior)", () => {
  const context = resolveSiteContext({ companyId: "icare", sites: [icareSiteA], membership });
  assert.equal(context.siteId, null);
  assert.equal(context.source, "none");
});

test("multiple sites + no siteId → siteId null, no leak of other company sites", () => {
  const context = resolveSiteContext({
    companyId: "icare",
    sites: [icareSiteA, icareSiteB, otherSite],
    membership,
    resolveMode: "single-site-fallback",
  });
  assert.equal(context.siteId, null);
  assert.equal(context.source, "none");
  assert.notEqual(context.siteId, otherSite.id);
});

test("explicit siteId resolves with source explicit", () => {
  const context = resolveSiteContext({
    companyId: "icare",
    siteId: "site-icare-b",
    sites: [icareSiteA, icareSiteB],
    membership,
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

test("missing site context is a safe fallback", () => {
  const context = resolveSiteContext({ companyId: "icare", sites: [], membership });
  assert.equal(context.siteId, null);
  assert.equal(context.source, "none");
  assert.equal(context.companyId, "icare");
});

test("assertSiteBelongsToCompany enforces ownership", () => {
  assert.equal(assertSiteBelongsToCompany(icareSiteA, "icare").id, "site-icare-a");
  assert.throws(
    () => assertSiteBelongsToCompany(otherSite, "icare"),
    (error) => error instanceof SiteContextError && error.code === "SITE_NOT_IN_COMPANY",
  );
});

test("listAccessibleSitesForCompany is identity (no cross-company leak)", () => {
  const accessible = listAccessibleSitesForCompany([icareSiteA, icareSiteB]);
  assert.equal(accessible.length, 2);
  assert.ok(accessible.every((site) => site.companyId === "icare"));
});