import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { getNavigationItem } from "../src/data/adminNavigation.js";
import {
  canViewMarketing,
  confirmedMarketingContext,
  isMarketingPage,
  marketingDirection,
  marketingPageKeys,
  metaSalesAvailable,
  resolveMarketingDestination,
} from "../src/utils/marketing.js";

const pageSource = fs.readFileSync(new URL("../src/pages/AdminMarketingPage.jsx", import.meta.url), "utf8");
const emailWorkspaceSource = fs.readFileSync(new URL("../src/components/marketing/EmailCampaignWorkspace.jsx", import.meta.url), "utf8");
const appSource = fs.readFileSync(new URL("../src/CPanelApp.jsx", import.meta.url), "utf8");
const cssSource = fs.readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
const marketingSource = `${pageSource}\n${emailWorkspaceSource}`;

const company = { id: "icare", name: "iCare", slug: "icare", storefrontUrl: "https://igroup.website/icare" };
const companyAdmin = { activeCompany: company, role: "company_admin" };

test("all eight Marketing routes use the dedicated tenant page", () => {
  assert.equal(marketingPageKeys.length, 8);
  assert.equal(isMarketingPage("admin-seo"), true);
  assert.ok(getNavigationItem("admin-seo")?.path);
  for (const pageKey of marketingPageKeys) {
    assert.equal(isMarketingPage(pageKey), true);
    const item = getNavigationItem(pageKey);
    if (item) assert.ok(item.path, `${pageKey} should expose a path`);
  }
  assert.equal(getNavigationItem("admin-tenant-placeholder-marketing-seo-geo"), null);
  assert.equal(isMarketingPage("admin-products"), false);
  assert.match(appSource, /marketingPageKeys\.includes\(activePage\)[\s\S]*?<AdminMarketingPage/);
});

test("Marketing access requires an authenticated company scope and tenant operator role", () => {
  assert.equal(canViewMarketing(companyAdmin, company), true);
  assert.equal(canViewMarketing({ role: "manager" }, company), true);
  assert.equal(canViewMarketing({ role: "super_admin" }, company), true);
  assert.equal(canViewMarketing({ role: "super_admin" }), false);
  assert.equal(canViewMarketing({ role: "employee", permissions: [] }, company), false);
});

test("safe Marketing destinations retain existing permission and module guards", () => {
  const modules = [{ enabled: true, route: "/admin/settings" }, { enabled: true, route: "/admin/website-media" }];
  assert.equal(resolveMarketingDestination("companySettings", { currentUser: companyAdmin, modules }), "admin-settings");
  assert.equal(resolveMarketingDestination("websiteContent", { currentUser: companyAdmin, modules }), "admin-website-media");
  assert.equal(resolveMarketingDestination("siteOverview", { currentUser: companyAdmin, modules }), "admin-tenant-placeholder-site-overview");
  assert.equal(resolveMarketingDestination("companySettings", { currentUser: companyAdmin, modules: [] }), null);
});

test("Marketing context never fabricates records or connection states", () => {
  const context = confirmedMarketingContext(company);
  assert.equal(context.companyName, "iCare");
  assert.equal(context.storefrontUrl, "https://igroup.website/icare");
  assert.deepEqual(context.campaigns, []);
  assert.deepEqual(context.socialPosts, []);
  assert.deepEqual(context.connectedAccounts, []);
  assert.deepEqual(context.integrations, []);
  assert.equal(context.referralProgram, null);
  assert.equal(metaSalesAvailable(), false);
});

test("SEO page includes assistant, Search Console, AI visibility, learning, and full tool grid", () => {
  assert.match(pageSource, /marketing-seo-assistant/);
  assert.match(pageSource, /marketing-search-console/);
  assert.match(pageSource, /marketing-ai-visibility/);
  assert.match(pageSource, /ChatGPT[\s\S]*?Gemini[\s\S]*?Perplexity[\s\S]*?Claude/);
  assert.match(pageSource, /marketing-learning-panel/);
  assert.match(pageSource, /marketing-tools-grid/);
  assert.match(pageSource, /"SEO checklist"[\s\S]*?"robots\.txt"[\s\S]*?"llms\.txt"[\s\S]*?"Google Business Profile"/);
});

test("admin-seo and its legacy key both render the SeoPage", () => {
  assert.match(pageSource, /case "admin-seo": return <SeoPage company=\{company\} context=\{context\} currentUser=\{currentUser\}/);
  assert.match(pageSource, /case "admin-tenant-placeholder-marketing-seo-geo": return <SeoPage company=\{company\} context=\{context\} currentUser=\{currentUser\}/);
});

test("Google and Meta Ads use distinct onboarding and honest connection states", () => {
  assert.match(pageSource, /marketing-google-ads-hero/);
  assert.match(pageSource, /marketing-ad-preview/);
  assert.match(pageSource, /marketing-meta-hero/);
  assert.match(pageSource, /marketing-meta-goals/);
  assert.match(pageSource, /disabled=\{!sales\}/);
  assert.match(pageSource, /No Facebook account, Instagram account, pixel, catalog, or payment method is confirmed/);
});

test("Email Marketing uses the Task 1 campaign workspace UI", () => {
  assert.match(pageSource, /EmailCampaignWorkspace/);
  assert.match(marketingSource, /marketing-email-banner/);
  assert.match(marketingSource, /marketing-email-campaigns/);
  assert.match(marketingSource, /No campaigns yet/);
  assert.match(marketingSource, /Create Campaign/);
  assert.match(marketingSource, /marketing-email-info-grid/);
});

test("Email delivery actions do not fake send/schedule success", async () => {
  const serviceSource = fs.readFileSync(new URL("../src/services/marketingService.js", import.meta.url), "utf8");
  const reviewSource = fs.readFileSync(new URL("../src/components/marketing/ReviewStep.jsx", import.meta.url), "utf8");
  const previewSource = fs.readFileSync(new URL("../src/components/marketing/CampaignPreview.jsx", import.meta.url), "utf8");
  assert.match(serviceSource, /EMAIL_SENDING_UNDER_DEVELOPMENT = "Email sending is still under development\."/);
  assert.match(serviceSource, /scheduled:\s*false/);
  assert.match(serviceSource, /sent:\s*false/);
  assert.doesNotMatch(serviceSource, /status:\s*"scheduled"/);
  assert.match(emailWorkspaceSource, /EMAIL_SENDING_UNDER_DEVELOPMENT/);
  assert.match(emailWorkspaceSource, /showDeliveryUnavailable/);
  assert.match(reviewSource, /Email sending is still under development\./);
  assert.match(previewSource, /Email sending is still under development\./);

  const {
    EMAIL_SENDING_UNDER_DEVELOPMENT,
    createCampaign,
    scheduleCampaign,
    sendCampaign,
    sendTestEmail,
  } = await import("../src/services/marketingService.js");
  const draft = await createCampaign({ name: "Demo", subject: "Hi", status: "draft" });
  const scheduled = await scheduleCampaign(draft.id, { mode: "scheduled", date: "2099-01-01", time: "10:00" });
  assert.equal(scheduled.scheduled, false);
  assert.equal(scheduled.detail, EMAIL_SENDING_UNDER_DEVELOPMENT);
  assert.equal(scheduled.record?.status, "draft");
  const sent = await sendCampaign(draft.id);
  assert.equal(sent.sent, false);
  assert.equal(sent.detail, EMAIL_SENDING_UNDER_DEVELOPMENT);
  assert.equal(sent.record?.status, "draft");
  const testSend = await sendTestEmail({ email: "demo@example.com" });
  assert.equal(testSend.sent, false);
  assert.equal(testSend.detail, EMAIL_SENDING_UNDER_DEVELOPMENT);
});

test("Social Marketing keeps two tabs, account states, planner, table, and empty state", () => {
  assert.match(pageSource, /role="tablist"/);
  assert.match(pageSource, /"Create & Publish"/);
  assert.match(pageSource, /"Your Social Posts"/);
  assert.match(pageSource, /marketing-social-accounts/);
  assert.match(pageSource, /marketing-planner-calendar/);
  assert.match(pageSource, /marketing-posts-table-head/);
  assert.match(pageSource, /No social posts/);
});

test("Referral and Google Business pages preserve setup-only split heroes", () => {
  assert.match(pageSource, /marketing-referral-banner/);
  assert.match(pageSource, /marketing-referral-hero/);
  assert.match(pageSource, /marketing-business-hero/);
  assert.match(pageSource, /No Google account, profile, Maps listing, location, or reviews are currently confirmed/);
});

test("unsupported Marketing actions use the shared bilingual flow", () => {
  assert.match(pageSource, /AdminUnderDevelopmentContent/);
  assert.match(pageSource, /const unsupported = \(\) => setShowUnsupported\(true\)/);
  assert.match(pageSource, /else fallback\(\)/);
});

test("Marketing pages render one title and support RTL, LTR, and responsive layouts", () => {
  assert.match(pageSource, /<AdminLayout[\s\S]*?hideHeader/);
  assert.equal((pageSource.match(/data-marketing-page-header/g) || []).length, 1);
  assert.equal(marketingDirection("ar"), "rtl");
  assert.equal(marketingDirection("en"), "ltr");
  assert.match(pageSource, /data-marketing-direction=\{marketingDirection\(language\)\}/);
  assert.match(cssSource, /\[dir="rtl"\] \.marketing-page-header/);
  assert.match(cssSource, /@media \(max-width: 620px\)[\s\S]*?\.marketing-page-header/);
});

test("Marketing CSS is contained in one named scoped section", () => {
  assert.equal((cssSource.match(/\/\* Tenant Marketing pages \*\//g) || []).length, 1);
  assert.match(cssSource, /\.tenant-marketing-page/);
  assert.match(cssSource, /\.marketing-google-ads-hero/);
  assert.match(cssSource, /\.marketing-business-hero/);
});
