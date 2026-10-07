import fs from "fs";
import { allNavigationItems, placeholderPageKeys } from "../../cpanel/src/data/adminNavigation.js";
import { analyticsRoutes } from "../../cpanel/src/utils/analytics.js";
import { bookingRoutes } from "../../cpanel/src/utils/bookings.js";
import { tenantManagementRoutes } from "../../cpanel/src/utils/tenantManagement.js";
import { websiteContentRoutes } from "../../cpanel/src/utils/websiteContent.js";
import { developerToolsRoutes } from "../../cpanel/src/utils/developerTools.js";

const app = fs.readFileSync(new URL("../../cpanel/src/CPanelApp.jsx", import.meta.url), "utf8");
const roles = fs.readFileSync(new URL("../../cpanel/src/utils/roles.js", import.meta.url), "utf8");

const pathMap = {};
for (const m of app.matchAll(/"([^"]+)":\s*"(\/admin[^"]*)"/g)) pathMap[m[1]] = m[2];
Object.assign(
  pathMap,
  analyticsRoutes,
  bookingRoutes,
  tenantManagementRoutes,
  websiteContentRoutes,
  developerToolsRoutes,
);

function permsFor(pageKey) {
  const re = new RegExp(`"${pageKey}"\\s*:\\s*(\\[[^\\]]*\\]|null)`);
  const m = roles.match(re);
  return m ? m[1] : "inherit/default";
}

function refFor(pageKey) {
  if (!pageKey) return "n/a";
  if (pageKey === "admin-sites") return "Wix Studio Workspace";
  if (pageKey === "admin-site-editor") return "OUT OF SCOPE (Studio editor)";
  return "Wix Dashboard";
}

function featureStatus(item, pageKey) {
  if (item?.placeholder) {
    if (pageKey?.includes("marketing-seo")) return "PARTIAL";
    if (pageKey?.includes("discounts-coupons") || pageKey?.includes("discounts-automatic")) return "PARTIAL";
    return "PLACEHOLDER";
  }
  const thinPrefixes = [
    "admin-forms",
    "admin-meetings",
    "admin-pipelines",
    "admin-community",
    "admin-loyalty",
    "admin-automations",
    "admin-website-content-cms",
    "admin-website-content-multilingual",
    "admin-developer-",
    "admin-analytics-session-recordings",
    "admin-analytics-benchmarks",
    "admin-settings-getting-paid",
    "admin-settings-receipts",
    "admin-settings-tax",
    "admin-settings-checkout",
    "admin-settings-shipping",
    "admin-settings-bookings",
  ];
  if (thinPrefixes.some((t) => pageKey === t || pageKey?.startsWith(t))) return "PARTIAL";
  return "AVAILABLE";
}

const leafs = allNavigationItems.filter((i) => i.pageKey);
const rows = leafs.map((item) => {
  const pageKey = item.pageKey;
  const path = item.path || pathMap[pageKey] || null;
  return {
    route: path,
    pageKey,
    name: item.label?.en || pageKey,
    nameAr: item.label?.ar || "",
    placeholder: !!item.placeholder,
    existing: !!item.existing,
    reference: refFor(pageKey),
    feature: featureStatus(item, pageKey),
    permissions: permsFor(pageKey),
  };
});

const navKeys = new Set(rows.map((r) => r.pageKey));
for (const [pageKey, path] of Object.entries(pathMap)) {
  if (navKeys.has(pageKey)) continue;
  if (pageKey === "admin-login" || pageKey === "admin-no-access") continue;
  rows.push({
    route: path,
    pageKey,
    name: pageKey,
    nameAr: "",
    placeholder: placeholderPageKeys.includes(pageKey),
    existing: !placeholderPageKeys.includes(pageKey),
    reference: refFor(pageKey),
    feature: placeholderPageKeys.includes(pageKey) ? "PLACEHOLDER" : "AVAILABLE",
    permissions: permsFor(pageKey),
    note: "routed but not primary nav leaf",
  });
}

const counts = {
  totalRows: rows.length,
  uniqueRoutes: new Set(rows.map((r) => r.route).filter(Boolean)).size,
  dashboard: rows.filter((r) => r.reference === "Wix Dashboard").length,
  studioWs: rows.filter((r) => r.reference === "Wix Studio Workspace").length,
  outOfScope: rows.filter((r) => String(r.reference).startsWith("OUT")).length,
  byFeature: rows.reduce((a, r) => {
    a[r.feature] = (a[r.feature] || 0) + 1;
    return a;
  }, {}),
  placeholders: rows.filter((r) => r.placeholder).length,
  existing: rows.filter((r) => r.existing && !r.placeholder).length,
};

fs.writeFileSync(
  new URL("./_inventory_snapshot.json", import.meta.url),
  JSON.stringify({ generatedAt: new Date().toISOString(), headHint: "feature/wix-dashboard-ui-fidelity", counts, rows }, null, 2),
);
console.log(JSON.stringify(counts, null, 2));
