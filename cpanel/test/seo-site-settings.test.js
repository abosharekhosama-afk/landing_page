import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const pageSource = fs.readFileSync(new URL("../src/pages/AdminMarketingPage.jsx", import.meta.url), "utf8");
const companyContextSource = fs.readFileSync(new URL("../src/utils/companyContext.js", import.meta.url), "utf8");
const appSource = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const cssSource = fs.readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
const companyRouteSource = fs.readFileSync(new URL("../../api/src/routes/company.js", import.meta.url), "utf8");
const tenancySource = fs.readFileSync(new URL("../../api/src/tenancy/company.js", import.meta.url), "utf8");
const storefrontSource = fs.readFileSync(new URL("../../api/src/routes/storefront.js", import.meta.url), "utf8");
const companyApiSource = fs.readFileSync(new URL("../src/utils/companyApi.js", import.meta.url), "utf8");
const seoContentSource = fs.readFileSync(new URL("../../api/src/storefront/seoContent.js", import.meta.url), "utf8");

test("SEO fields are accepted by the company settings PATCH validator", () => {
  assert.match(companyRouteSource, /siteTitle/);
  assert.match(companyRouteSource, /metaDescription/);
  assert.match(companyRouteSource, /metaKeywords/);
  assert.match(companyRouteSource, /validateNullableText\(body\.siteTitle, "siteTitle", 120\)/);
  assert.match(companyRouteSource, /validateNullableText\(body\.metaDescription, "metaDescription", 320\)/);
  assert.match(companyRouteSource, /validateNullableText\(body\.metaKeywords, "metaKeywords", 500\)/);
});

test("SEO fields are in the settingFields allowlist", () => {
  assert.match(companyRouteSource, /settingFields = new Set\(\[([\s\S]*?)\]\)/);
  const setBody = companyRouteSource.match(/settingFields = new Set\(\[([\s\S]*?)\]\)/)[1];
  assert.ok(setBody.includes('"siteTitle"'), "siteTitle in settingFields");
  assert.ok(setBody.includes('"metaDescription"'), "metaDescription in settingFields");
  assert.ok(setBody.includes('"metaKeywords"'), "metaKeywords in settingFields");
});

test("SEO fields are surfaced in publicSettingKeys for storefront", () => {
  assert.match(tenancySource, /publicSettingKeys = new Set\(\[([\s\S]*?)\]\)/);
  const setBody = tenancySource.match(/publicSettingKeys = new Set\(\[([\s\S]*?)\]\)/)[1];
  assert.ok(setBody.includes('"siteTitle"'), "siteTitle in publicSettingKeys");
  assert.ok(setBody.includes('"metaDescription"'), "metaDescription in publicSettingKeys");
  assert.ok(setBody.includes('"metaKeywords"'), "metaKeywords in publicSettingKeys");
});

test("sanitizePublicSetting trims SEO strings and coerces non-strings", () => {
  assert.match(tenancySource, /siteTitle.*metaDescription.*metaKeywords/);
  assert.match(tenancySource, /typeof value === "string" \? value\.trim\(\)/);
  assert.match(tenancySource, /value === null \? null : ""/);
});

test("brandingSettingsWithDefaults includes SEO field defaults", () => {
  assert.match(tenancySource, /siteTitle: settings\.siteTitle \?\? null/);
  assert.match(tenancySource, /metaDescription: settings\.metaDescription \?\? null/);
  assert.match(tenancySource, /metaKeywords: settings\.metaKeywords \?\? null/);
});

test("storefront content response exposes site SEO fields", () => {
  assert.match(storefrontSource, /siteTitle: typeof req\.company\.settings\?\.siteTitle === "string"/);
  assert.match(storefrontSource, /metaDescription: typeof req\.company\.settings\?\.metaDescription === "string"/);
  assert.match(storefrontSource, /metaKeywords: typeof req\.company\.settings\?\.metaKeywords === "string"/);
});

test("sanitizeCompanyContext includes SEO fields in company.settings", () => {
  assert.match(companyContextSource, /siteTitle: typeof settings\.siteTitle === "string"/);
  assert.match(companyContextSource, /metaDescription: typeof settings\.metaDescription === "string"/);
  assert.match(companyContextSource, /metaKeywords: typeof settings\.metaKeywords === "string"/);
});

test("applyStorefrontSeoMeta sets document.title and all required meta tags", () => {
  assert.match(companyContextSource, /export function applyStorefrontSeoMeta/);
  assert.match(companyContextSource, /document\.title = title/);
  assert.match(companyContextSource, /meta\[name="description"\]/);
  assert.match(companyContextSource, /upsertMeta\("og:title", "property"/);
  assert.match(companyContextSource, /upsertMeta\("og:description", "property"/);
  assert.match(companyContextSource, /meta\[name="keywords"\]/);
  assert.match(companyContextSource, /keywordsMeta\.remove\(\)/);
});

test("App.jsx stores site content and applies SEO meta on fetch", () => {
  assert.match(appSource, /import.*applyStorefrontSeoMeta.*from.*companyContext/);
  assert.match(appSource, /site: null/);
  assert.match(appSource, /site: data\.site \|\| null/);
  assert.match(appSource, /applyStorefrontSeoMeta\(\{ site: data\.site \|\| null \}\)/);
  assert.match(appSource, /applyStorefrontSeoMeta\(\{ site: null \}\)/);
});

test("applyStorefrontSeoMeta strips CPanel branding when SEO values are empty", () => {
  assert.match(companyContextSource, /CPANEL_TITLE_RE/);
  assert.match(companyContextSource, /administration portal/i);
  assert.match(companyContextSource, /storefrontFallbackTitle/);
});

test("SEO settings form includes all three fields with correct labels", () => {
  assert.match(pageSource, /siteTitle/);
  assert.match(pageSource, /metaDescription/);
  assert.match(pageSource, /metaKeywords/);
  assert.match(pageSource, /Site Title|عنوان الموقع/);
  assert.match(pageSource, /Meta Description|وصف الوصف/);
  assert.match(pageSource, /Keywords|الكلمات المفتاحية/);
});

test("SEO form uses fetchCompanySettings and updateCompanySettings", () => {
  assert.match(pageSource, /import.*fetchCompanySettings.*from.*companyApi/);
  assert.match(pageSource, /import.*updateCompanySettings.*from.*companyApi/);
  assert.match(pageSource, /fetchCompanySettings\(\)/);
  assert.match(pageSource, /updateCompanySettings\(/);
});

test("SEO form is gated behind company_settings permissions", () => {
  assert.match(pageSource, /company_settings\.view/);
  assert.match(pageSource, /company_settings\.update/);
  assert.match(pageSource, /isCompanyAdmin/);
});

test("SeoPage passes company and currentUser props from the marketing switch case", () => {
  assert.match(pageSource, /case "admin-seo".*<SeoPage company=\{company\} context=\{context\} currentUser=\{currentUser\}/);
  assert.match(pageSource, /case "admin-tenant-placeholder-marketing-seo-geo".*<SeoPage company=\{company\} context=\{context\} currentUser=\{currentUser\}/);
});

test("SeoAssistantPanel renders the old SEO placeholder content with tools grid", () => {
  assert.match(pageSource, /function SeoAssistantPanel/);
  assert.match(pageSource, /marketing-seo-assistant/);
  assert.match(pageSource, /marketing-tools-grid/);
  assert.match(pageSource, /SEO checklist/);
  assert.match(pageSource, /robots\.txt/);
  assert.match(pageSource, /llms\.txt/);
});

test("SEO settings CSS classes exist in global.css", () => {
  assert.match(cssSource, /\.marketing-seo-settings/);
  assert.match(cssSource, /\.marketing-seo-settings-header/);
  assert.match(cssSource, /\.marketing-seo-settings-form/);
  assert.match(cssSource, /\.marketing-seo-settings-actions/);
});

test("SEO settings CSS includes responsive breakpoint", () => {
  assert.match(cssSource, /@media \(max-width: 620px\)[\s\S]*?\.marketing-seo-settings-header/);
});

test("companyApi exposes fetchCompanySettings and updateCompanySettings", () => {
  assert.match(companyApiSource, /export.*function fetchCompanySettings/);
  assert.match(companyApiSource, /export.*function updateCompanySettings/);
});

// ──────────────────────────────────────────────────────────────────────────────
// Technical SEO v2 — robots indexing
// ──────────────────────────────────────────────────────────────────────────────

test("robotsIndexing is in the settingFields allowlist", () => {
  const setBody = companyRouteSource.match(/settingFields = new Set\(\[([\s\S]*?)\]\)/)[1];
  assert.ok(setBody.includes('"robotsIndexing"'), "robotsIndexing in settingFields");
});

test("robotsIndexing is in publicSettingKeys for storefront", () => {
  const setBody = tenancySource.match(/publicSettingKeys = new Set\(\[([\s\S]*?)\]\)/)[1];
  assert.ok(setBody.includes('"robotsIndexing"'), "robotsIndexing in publicSettingKeys");
});

test("robotsIndexing PATCH validator enforces allowed values", () => {
  assert.match(companyRouteSource, /robotsIndexing.*noindex,nofollow/);
  assert.match(companyRouteSource, /robotsIndexing.*index,follow/);
});

test("sanitizePublicSetting validates robotsIndexing values", () => {
  assert.match(tenancySource, /robotsIndexing.*noindex,nofollow/);
  assert.match(tenancySource, /robotsIndexing.*index,follow/);
});

test("brandingSettingsWithDefaults defaults robotsIndexing to index,follow", () => {
  assert.match(tenancySource, /robotsIndexing.*noindex,nofollow.*index,follow/);
});

test("storefront content exposes site.robotsIndexing and site.siteUrl", () => {
  assert.match(storefrontSource, /robotsIndexing:.*normalizeSeoRobotsValue/);
  assert.match(storefrontSource, /siteUrl:.*storefrontSiteUrl/);
});

test("sanitizeCompanyContext includes robotsIndexing in settings", () => {
  assert.match(companyContextSource, /robotsIndexing:.*index,follow.*noindex,nofollow/);
});

test("applyStorefrontSeoMeta manages robots meta tag", () => {
  assert.match(companyContextSource, /upsertMeta\("robots", "name"/);
  assert.match(companyContextSource, /index,follow.*noindex,nofollow/);
});

test("applyStorefrontSeoMeta sets canonical link only for real storefront paths", () => {
  assert.match(companyContextSource, /link\[rel="canonical"\]/);
  assert.match(companyContextSource, /isRealStorefrontPath/);
  assert.match(companyContextSource, /storefrontCanonicalPaths/);
});

test("applyStorefrontSeoMeta sets og:image and og:type defaults", () => {
  assert.match(companyContextSource, /upsertMeta\("og:image", "property"/);
  assert.match(companyContextSource, /upsertMeta\("og:type", "property", "website"\)/);
  assert.match(companyContextSource, /upsertMeta\("og:url", "property"/);
  assert.match(companyContextSource, /upsertMeta\("og:site_name", "property"/);
});

test("SeoPage includes robots indexing control with both policy values", () => {
  assert.match(pageSource, /robotsIndexing/);
  assert.match(pageSource, /robotsIndexing.*index,follow/);
  assert.match(pageSource, /robotsIndexing.*noindex,nofollow/);
  assert.match(pageSource, /marketing-seo-robots-control/);
  assert.match(pageSource, /marketing-seo-robots-options/);
});

test("SeoPage saves robotsIndexing via updateCompanySettings", () => {
  assert.match(pageSource, /robotsIndexing: draft\.robotsIndexing/);
});

test("SeoPage includes Google snippet preview and social share preview", () => {
  assert.match(pageSource, /function GoogleSnippetPreview/);
  assert.match(pageSource, /function SocialSharePreview/);
  assert.match(pageSource, /data-seo-google-preview/);
  assert.match(pageSource, /data-seo-social-preview/);
  assert.match(pageSource, /marketing-seo-google-card/);
  assert.match(pageSource, /marketing-seo-social-card/);
});

test("SeoPage uses realHttpsUrl helper for URL/image validation in previews", () => {
  assert.match(pageSource, /function realHttpsUrl/);
  assert.match(pageSource, /function GoogleSnippetPreview/);
  assert.match(pageSource, /function SocialSharePreview/);
  assert.match(pageSource, /realHttpsUrl\(context\.storefrontUrl\)/);
  assert.match(pageSource, /realHttpsUrl\(context\.logoUrl\)/);
});

test("SeoPage preview warns when storefront URL or image is missing", () => {
  assert.match(pageSource, /No real storefront URL is connected/);
  assert.match(pageSource, /No real logo image/);
});

test("robots and preview CSS classes exist in global.css", () => {
  assert.match(cssSource, /\.marketing-seo-robots-control/);
  assert.match(cssSource, /\.marketing-seo-robots-options/);
  assert.match(cssSource, /\.marketing-seo-preview-panel/);
  assert.match(cssSource, /\.marketing-seo-google-card/);
  assert.match(cssSource, /\.marketing-seo-social-card/);
  assert.match(cssSource, /\.marketing-seo-preview-warning/);
});

test("SEO preview CSS includes responsive breakpoint", () => {
  assert.match(cssSource, /@media \(max-width: 850px\)[\s\S]*?\.marketing-seo-preview-grid/);
  assert.match(cssSource, /@media \(max-width: 620px\)[\s\S]*?\.marketing-seo-preview-header/);
});

// ──────────────────────────────────────────────────────────────────────────────
// Technical SEO v2 — robots.txt / sitemap.xml API endpoints
// ──────────────────────────────────────────────────────────────────────────────

test("storefront routes import storePolicyRepository for sitemap", () => {
  assert.match(storefrontSource, /storePolicyRepository/);
});

test("storefront robots.txt and sitemap.xml routes are registered", () => {
  assert.match(storefrontSource, /router\.get\("\/robots\.txt"/);
  assert.match(storefrontSource, /router\.get\("\/sitemap\.xml"/);
});

test("robots.txt and sitemap.xml routes use storefront SEO helpers", () => {
  assert.match(storefrontSource, /from.*storefront\/seoContent/);
  assert.match(storefrontSource, /buildRobotsTxt/);
  assert.match(storefrontSource, /buildSitemapXml/);
  assert.match(storefrontSource, /storefrontSiteUrl/);
  assert.match(storefrontSource, /normalizeSeoRobotsValue/);
  assert.match(storefrontSource, /storefrontPageUrl/);
});

// ──────────────────────────────────────────────────────────────────────────────
// Technical SEO v2 — seoContent module
// ──────────────────────────────────────────────────────────────────────────────

test("seoContent defines allowed robots indexing values", () => {
  assert.match(seoContentSource, /export const SEO_ROBOTS_INDEX = "index,follow"/);
  assert.match(seoContentSource, /export const SEO_ROBOTS_NOINDEX = "noindex,nofollow"/);
  assert.match(seoContentSource, /export const SEO_ROBOTS_VALUES/);
});

test("seoContent defines real public storefront page routes", () => {
  assert.match(seoContentSource, /export const STOREFRONT_PUBLIC_PATHS/);
  assert.match(seoContentSource, /\/products/);
  assert.match(seoContentSource, /\/about/);
  assert.match(seoContentSource, /\/sustainability/);
  assert.match(seoContentSource, /\/how-it-works/);
  assert.match(seoContentSource, /\/follow-us/);
  assert.match(seoContentSource, /\/business-information/);
});

test("seoContent storefrontSiteUrl resolves preferred domain fallback", () => {
  assert.match(seoContentSource, /export function storefrontSiteUrl/);
  assert.match(seoContentSource, /selectPreferredCompanyDomains/);
  assert.match(seoContentSource, /normalizeCompanyStorefrontUrl/);
});

test("seoContent buildRobotsTxt references sitemap when index and siteUrl exist", () => {
  assert.match(seoContentSource, /export function buildRobotsTxt/);
  assert.match(seoContentSource, /Sitemap:.*\/api\/storefront\/sitemap\.xml/);
  assert.match(seoContentSource, /Allow: \//);
  assert.match(seoContentSource, /Disallow: \//);
});

test("seoContent buildSitemapXml produces valid XML from real paths", () => {
  assert.match(seoContentSource, /export function buildSitemapXml/);
  assert.match(seoContentSource, /<urlset/);
  assert.match(seoContentSource, /<loc>/);
  assert.match(seoContentSource, /escapeXml/);
});

test("seoContent storefrontPageUrl strips trailing slashes and joins correctly", () => {
  assert.match(seoContentSource, /export function storefrontPageUrl/);
  assert.match(seoContentSource, /return normalizedPath \? `\$\{base\}\/\$\{normalizedPath\}` : `\$\{base\}\//);
});

test("seoContent provides normalizeSeoRobotsValue and isSeoRobotsValue helpers", () => {
  assert.match(seoContentSource, /export function normalizeSeoRobotsValue/);
  assert.match(seoContentSource, /export function isSeoRobotsValue/);
});
