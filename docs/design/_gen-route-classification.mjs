import fs from "fs";
import { allNavigationItems, placeholderPageKeys } from "../../cpanel/src/data/adminNavigation.js";
import { analyticsRoutes } from "../../cpanel/src/utils/analytics.js";
import { bookingRoutes } from "../../cpanel/src/utils/bookings.js";
import { tenantManagementRoutes } from "../../cpanel/src/utils/tenantManagement.js";
import { websiteContentRoutes } from "../../cpanel/src/utils/websiteContent.js";
import { developerToolsRoutes } from "../../cpanel/src/utils/developerTools.js";

const app = fs.readFileSync(new URL("../../cpanel/src/CPanelApp.jsx", import.meta.url), "utf8");
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

const ALIASES = {
  "admin-employees": "admin-staff",
  "admin-products-edit": "admin-products-new",
};

function classify(pageKey, path, item) {
  const isPh = !!item?.placeholder || placeholderPageKeys.includes(pageKey);
  if (pageKey === "admin-login" || pageKey === "admin-no-access") {
    return { kind: "NON_PAGE_ROUTE" };
  }
  if (ALIASES[pageKey]) return { kind: "ROUTE_ALIAS", of: ALIASES[pageKey] };

  const nestedHints =
    /-(new|edit|detail)$/.test(pageKey) ||
    /\/(new|edit|contact)(\/|$)/.test(path || "") ||
    pageKey === "admin-customers-detail" ||
    pageKey.startsWith("admin-settings-") ||
    pageKey.startsWith("admin-dropshipping-") ||
    (pageKey.startsWith("admin-analytics-") && pageKey !== "admin-analytics-highlights") ||
    (pageKey.startsWith("admin-bookings-") && pageKey !== "admin-bookings-calendar");

  if (isPh) return { kind: "PLACEHOLDER_SOON" };
  if (nestedHints) return { kind: "NESTED_DETAIL_ROUTE" };
  return { kind: "UNIQUE_REAL_PAGE" };
}

const rows = [];
const leafs = allNavigationItems.filter((i) => i.pageKey);
for (const item of leafs) {
  const path = item.path || pathMap[item.pageKey] || null;
  rows.push({ pageKey: item.pageKey, path, name: item.label?.en || item.pageKey, ...classify(item.pageKey, path, item), from: "nav" });
}

const navKeys = new Set(rows.map((r) => r.pageKey));
for (const [pageKey, path] of Object.entries(pathMap)) {
  if (navKeys.has(pageKey)) continue;
  const c = classify(pageKey, path, null);
  const samePath = rows.find((r) => r.path === path && (r.kind === "UNIQUE_REAL_PAGE" || r.kind === "NESTED_DETAIL_ROUTE" || r.kind === "PLACEHOLDER_SOON"));
  if (samePath && c.kind === "UNIQUE_REAL_PAGE") {
    rows.push({ pageKey, path, name: pageKey, kind: "DUPLICATE_INVENTORY_ROW", of: samePath.pageKey, from: "routed-only" });
  } else if (samePath && c.kind === "NESTED_DETAIL_ROUTE" && samePath.kind === "NESTED_DETAIL_ROUTE") {
    rows.push({ pageKey, path, name: pageKey, kind: "DUPLICATE_INVENTORY_ROW", of: samePath.pageKey, from: "routed-only" });
  } else if (ALIASES[pageKey]) {
    rows.push({ pageKey, path, name: pageKey, kind: "ROUTE_ALIAS", of: ALIASES[pageKey], from: "routed-only" });
  } else {
    rows.push({ pageKey, path, name: pageKey, ...c, from: "routed-only" });
  }
}

// Collapse duplicate UNIQUE sharing identical path
const byPath = new Map();
for (const r of rows) {
  if (!r.path) continue;
  if (!byPath.has(r.path)) byPath.set(r.path, []);
  byPath.get(r.path).push(r);
}
for (const [, list] of byPath) {
  const uniques = list.filter((r) => r.kind === "UNIQUE_REAL_PAGE");
  for (let i = 1; i < uniques.length; i++) {
    uniques[i].kind = "DUPLICATE_INVENTORY_ROW";
    uniques[i].of = uniques[0].pageKey;
  }
}

const counts = rows.reduce((a, r) => {
  a[r.kind] = (a[r.kind] || 0) + 1;
  return a;
}, {});

const uniqueReal = rows.filter((r) => r.kind === "UNIQUE_REAL_PAGE");
const nested = rows.filter((r) => r.kind === "NESTED_DETAIL_ROUTE");
const placeholders = rows.filter((r) => r.kind === "PLACEHOLDER_SOON");

const ref = (pageKey) => {
  if (pageKey === "admin-sites") return "Wix Studio Workspace";
  if (pageKey === "admin-site-editor") return "OUT OF SCOPE (Studio editor)";
  return "Wix Dashboard";
};

const uniqueByRef = {
  dashboard: uniqueReal.filter((r) => ref(r.pageKey) === "Wix Dashboard").length,
  studio: uniqueReal.filter((r) => ref(r.pageKey) === "Wix Studio Workspace").length,
  editor: uniqueReal.filter((r) => String(ref(r.pageKey)).startsWith("OUT")).length,
};

// Implementable UI unique (exclude editor)
const uiPrimary = uniqueReal.filter((r) => r.pageKey !== "admin-site-editor");
const uiNested = nested;

const families = {
  "Dashboard shell": { primary: ["admin", "admin-platform-overview"], nested: [], notes: "shell already largely done" },
  "Platform administration": {
    primary: ["admin-platform-companies", "admin-platform-domains"],
    nested: [],
    notes: "companies+memberships mostly done",
  },
  "Data tables (catalog/sales/CRM core)": {
    primary: [
      "admin-products",
      "admin-product-bundles",
      "admin-inventory",
      "admin-categories",
      "admin-brands",
      "admin-products-trash",
      "admin-orders",
      "admin-delivery",
      "admin-customers",
      "admin-reviews",
      "admin-inbox",
      "admin-invoices",
      "admin-activity-log",
    ],
    nested: [
      "admin-products-new",
      "admin-categories-new",
      "admin-brands-new",
      "admin-customers-detail",
    ],
    notes: "shared bilingual table system",
  },
  "Discount managers (nav honesty + table UI)": {
    primary: [
      "admin-tenant-placeholder-catalog-discounts-coupons",
      "admin-tenant-placeholder-catalog-discounts-automatic",
    ],
    nested: [],
    notes: "reclassify to existing; reuse table family",
  },
  "Forms / settings panels": {
    primary: [
      "admin-settings",
      "admin-product-settings",
      "admin-security",
      "admin-policies",
      "admin-legal-information",
      "admin-staff",
    ],
    nested: nested.filter((r) => r.pageKey.startsWith("admin-settings-") || r.pageKey === "admin-staff-new").map((r) => r.pageKey),
    notes: "form/settings chrome",
  },
  "Marketing / merchandising CRUD": {
    primary: [
      "admin-banners",
      "admin-announcements",
      "admin-splash-ads",
      "admin-sms",
      "admin-homepage-offers",
      "admin-website-texts",
      "admin-website-media",
      "admin-store-locator",
      "admin-vlogs",
    ],
    nested: ["admin-vlogs-new", "admin-store-locator-new"],
    notes: "list+form pattern",
  },
  "SEO (nav honesty + settings form)": {
    primary: ["admin-tenant-placeholder-marketing-seo-geo"],
    nested: [],
    notes: "real SeoPage",
  },
  Analytics: {
    primary: ["admin-analytics-highlights"],
    nested: nested.filter((r) => r.pageKey.startsWith("admin-analytics-")).map((r) => r.pageKey),
    notes: "shared analytics chrome; some shells honest",
  },
  CRM: {
    primary: ["admin-forms", "admin-meetings", "admin-pipelines", "admin-community", "admin-loyalty"],
    nested: [],
    notes: "thin shells — UI only if kept",
  },
  Bookings: {
    primary: ["admin-bookings-calendar"],
    nested: nested.filter((r) => r.pageKey.startsWith("admin-bookings-")).map((r) => r.pageKey),
    notes: "calendar + list variants",
  },
  "Studio Sites cards": {
    primary: ["admin-sites"],
    nested: [],
    notes: "mostly done; polish only",
  },
  "Website content thin / CMS": {
    primary: ["admin-website-content-cms", "admin-website-content-multilingual", "admin-automations"],
    nested: [],
    notes: "PARTIAL shells",
  },
  "Developer / ops / IMKAN-specific": {
    primary: [
      "admin-developer-site-logs",
      "admin-developer-advanced-log-tools",
      "admin-developer-monitoring",
      "admin-developer-secrets-manager",
      "admin-developer-triggered-emails",
      "admin-unit-creator",
      "admin-dropshipping",
    ],
    nested: nested.filter((r) => r.pageKey.startsWith("admin-dropshipping-") || r.pageKey.startsWith("admin-developer-")).map((r) => r.pageKey),
    notes: "lower priority polish",
  },
  Modals_drawers_shared: {
    primary: [],
    nested: [],
    notes: "cross-cutting component work counted in Foundation + table family",
  },
};

const summary = {
  totalInventoryRows: rows.length,
  uniqueAdminPaths: new Set(rows.map((r) => r.path).filter(Boolean)).size,
  classificationCounts: counts,
  uniqueRealPages: uniqueReal.length,
  uniqueRealByReference: uniqueByRef,
  nestedDetailRoutes: nested.length,
  placeholders: placeholders.length,
  uiPrimaryImplementable: uiPrimary.length,
  uiNestedDerivatives: uiNested.length,
  uniqueRealKeys: uniqueReal.map((r) => r.pageKey).sort(),
  nestedKeys: nested.map((r) => r.pageKey).sort(),
  aliasKeys: rows.filter((r) => r.kind === "ROUTE_ALIAS").map((r) => r.pageKey),
  duplicateKeys: rows.filter((r) => r.kind === "DUPLICATE_INVENTORY_ROW").map((r) => ({ key: r.pageKey, of: r.of })),
  families,
};

fs.writeFileSync(new URL("./_route_classification.json", import.meta.url), JSON.stringify({ summary, rows }, null, 2));
console.log(JSON.stringify(summary, null, 2));
