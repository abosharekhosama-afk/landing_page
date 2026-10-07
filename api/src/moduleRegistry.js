import { dropshippingQuery, withDropshippingTransaction } from "./dropshipping/database.js";
import { isSupabaseConfigured } from "./data/postgresStore.js";

const allRoles = ["super_admin", "company_admin", "admin", "manager", "employee", "staff"];
export const inMemoryModuleStore = new Map();
const define = (module_key, group_key, label_en, label_ar, icon_key, route, sort_order, required_permissions = [], allowed_roles = allRoles) => ({
  module_key, group_key, label_en, label_ar, description_en: `${label_en} administration`, description_ar: `إدارة ${label_ar}`,
  icon_key, route, sort_order, active: true, required_permissions, allowed_roles, configuration: {},
});

export const CPANEL_MODULE_DEFINITIONS = Object.freeze([
  define("dashboard", "dashboard", "Dashboard", "لوحة التحكم", "dashboard", "/admin/dashboard", 10),
  define("catalog.products", "catalog", "Products", "المنتجات", "products", "/admin/products", 100, ["products.read", "products.view", "products.manage"]),
  define("catalog.categories", "catalog", "Categories", "الأقسام", "categories", "/admin/categories", 110, ["categories.view", "categories.manage"]),
  define("catalog.brands", "catalog", "Brands", "العلامات التجارية", "brands", "/admin/brands", 120, ["brands.view", "brands.manage"]),
  define("storefront.videos", "storefront", "Videos", "الفيديوهات", "videos", "/admin/vlogs", 200),
  define("storefront.locations", "storefront", "Store locations", "مواقع المتاجر", "locations", "/admin/store-locator", 210),
  define("storefront.website_media", "storefront", "Website media", "وسائط الموقع", "media", "/admin/website-media", 220, ["website_media.manage"]),
  define("storefront.website_texts", "storefront", "Website texts", "نصوص الموقع", "texts", "/admin/website-texts", 230, ["website_texts.manage"]),
  define("operations.orders", "operations", "Orders", "الطلبات", "orders", "/admin/orders", 300, ["orders.read", "orders.view", "orders.manage"]),
  define("operations.invoices", "operations", "Invoices", "الفواتير", "invoices", "/admin/invoices", 310, ["invoices.view", "invoices.manage"]),
  define("operations.delivery", "operations", "Delivery", "التوصيل", "delivery", "/admin/delivery", 320, ["delivery.view", "delivery.manage"]),
  define("operations.reviews", "operations", "Reviews", "التقييمات", "reviews", "/admin/reviews", 330, ["reviews.view", "reviews.manage"]),
  define("operations.inventory", "operations", "Inventory", "المخزون", "inventory", "/admin/inventory", 340, ["inventory.view", "inventory.manage"]),
  define("people.customers", "people", "Customers", "العملاء", "customers", "/admin/customers", 400, ["customers.view", "customers.manage"]),
  define("people.employees", "people", "Employees", "الموظفون", "employees", "/admin/staff", 410, ["employees.view", "employees.manage"]),
  define("settings.configuration", "settings", "Configuration", "الإعدادات", "settings", "/admin/settings", 500, ["company_settings.view", "company_settings.update"]),
  define("settings.product_settings", "settings", "Product settings", "إعدادات المنتجات", "product-settings", "/admin/product-settings", 510, ["product_settings.view", "product_settings.manage"]),
  define("settings.reports", "settings", "Reports", "التقارير", "reports", "/admin/reports", 520, ["reports.view"]),
  define("settings.activity_log", "settings", "Activity log", "سجل النشاط", "activity", "/admin/activity-log", 530, ["activity_log.view"]),
  define("settings.unit_creator", "settings", "Unit creator", "منشئ الوحدات", "units", "/admin/unit-creator", 540, ["product_settings.manage"]),
  define("dropshipping.overview", "dropshipping", "Overview", "نظرة عامة", "dashboard", "/admin/dropshipping", 600, ["dropshipping.reports.read"]),
  define("dropshipping.marketers", "dropshipping", "Marketers", "المسوقون", "employees", "/admin/dropshipping/marketers", 610, ["dropshipping.marketers.read"]),
  define("dropshipping.products", "dropshipping", "Products", "المنتجات", "products", "/admin/dropshipping/products", 620, ["dropshipping.products.read"]),
  define("dropshipping.orders", "dropshipping", "Orders", "الطلبات", "orders", "/admin/dropshipping/orders", 630, ["dropshipping.orders.read"]),
  define("dropshipping.earnings", "dropshipping", "Earnings", "الأرباح", "earnings", "/admin/dropshipping/earnings", 640, ["dropshipping.earnings.read"]),
  define("dropshipping.withdrawals", "dropshipping", "Withdrawals", "السحوبات", "withdrawals", "/admin/dropshipping/withdrawals", 650, ["dropshipping.withdrawals.read"]),
  define("dropshipping.reports", "dropshipping", "Dropshipping reports", "تقارير الدروبشيبينغ", "reports", "/admin/dropshipping/reports", 660, ["dropshipping.reports.read"]),
  define("dropshipping.settings", "dropshipping", "Dropshipping settings", "إعدادات الدروبشيبينغ", "settings", "/admin/dropshipping/settings", 670, ["dropshipping.settings.manage"]),
  define("company_dropship.merchants", "company_dropship", "Dropshipping merchants", "تجار الدروبشيبينغ", "employees", "/admin/velvet-dropshipping/merchants", 680, ["company_dropship.merchants.read"]),
  define("company_dropship.catalog", "company_dropship", "Dropshipping catalog", "كتالوج الدروبشيبينغ", "products", "/admin/velvet-dropshipping/catalog", 681, ["company_dropship.catalog.manage"]),
  define("company_dropship.orders", "company_dropship", "Dropshipping orders", "طلبات الدروبشيبينغ", "orders", "/admin/velvet-dropshipping/orders", 682, ["company_dropship.orders.read"]),
  define("company_dropship.fulfillment", "company_dropship", "Dropshipping fulfillment", "تجهيز الدروبشيبينغ", "inventory", "/admin/velvet-dropshipping/fulfillment", 683, ["company_dropship.fulfillment.manage"]),
  define("company_dropship.settlements", "company_dropship", "Dropshipping settlements", "تسويات الدروبشيبينغ", "earnings", "/admin/velvet-dropshipping/settlements", 684, ["company_dropship.settlements.read"]),
  define("engagement.sms", "engagement", "SMS", "الرسائل القصيرة", "sms", "/admin/sms", 700, ["sms.view", "sms.manage"]),
  define("engagement.announcements", "engagement", "Announcements", "الإعلانات", "announcements", "/admin/announcements", 710, ["announcements.view", "announcements.manage"]),
  define("engagement.automations", "engagement", "Automations", "الأتمتة", "automations", "/admin/automations", 720, ["automations.manage"]),
  define("marketing.banners", "marketing", "Banners", "البانرات", "banners", "/admin/banners", 800, ["banners.view", "banners.manage"]),
  define("marketing.splash_ads", "marketing", "Splash Ads", "إعلانات البداية", "splash-ads", "/admin/splash-ads", 810, ["splash_ads.view", "splash_ads.manage"]),
  define("commerce.policies", "commerce", "Store Policies", "سياسات المتجر", "fileText", "/admin/policies", 900, ["policies.manage"]),
  define("commerce.legal_information", "commerce", "Legal Information", "المعلومات القانونية", "legal", "/admin/legal-information", 910, ["legal_information.manage"]),
]);

const definitions = new Map(CPANEL_MODULE_DEFINITIONS.map((entry) => [entry.module_key, entry]));
const icareDisabled = new Set(["storefront.videos", "storefront.locations", "operations.invoices", "operations.delivery", "operations.reviews", "operations.inventory", "settings.product_settings", "settings.reports", "settings.activity_log", "settings.unit_creator"]);
const companyDropshipOptIn = new Set(["company_dropship.merchants", "company_dropship.catalog", "company_dropship.orders", "company_dropship.fulfillment", "company_dropship.settlements"]);
export const defaultEnabledModuleKeys = (companyId) => new Set(CPANEL_MODULE_DEFINITIONS.filter((entry) => !companyDropshipOptIn.has(entry.module_key) && (companyId !== "icare" || !icareDisabled.has(entry.module_key))).map((entry) => entry.module_key));

function normalize(row, companyId) {
  const base = definitions.get(row.module_key) || row;
  return { ...base, ...row, enabled: row.enabled ?? defaultEnabledModuleKeys(companyId).has(row.module_key), sort_order: Number(row.company_sort_order ?? row.sort_order ?? base.sort_order ?? 0), label_en: row.label_en_override || row.label_en || base.label_en, label_ar: row.label_ar_override || row.label_ar || base.label_ar, configuration: { ...(base.configuration || {}), ...(row.configuration || {}), ...(row.configuration_override || {}) } };
}

export async function listCompanyModules(companyId, { query = dropshippingQuery } = {}) {
  try {
    const { rows } = await query(`select d.*,s.enabled,s.sort_order company_sort_order,s.label_en_override,s.label_ar_override,s.configuration_override from public.cpanel_module_definitions d left join public.company_cpanel_modules s on s.module_key=d.module_key and s.company_id=$1 where d.active=true order by coalesce(s.sort_order,d.sort_order),d.module_key`, [companyId]);
    if (rows.length) return rows.map((row) => normalize(row, companyId));
  } catch { /* Migration 012 is intentionally optional until applied. */ }
  if (inMemoryModuleStore.has(companyId)) {
    return inMemoryModuleStore.get(companyId).map((row) => normalize(row, companyId));
  }
  return CPANEL_MODULE_DEFINITIONS.map((row) => normalize(row, companyId));
}

const inheritedModulePermissions = {};

export function modulesVisibleToUser(modules, user) {
  const role = user?.globalRole === "super_admin" || user?.role === "super_admin"
    ? "super_admin"
    : user?.globalRole === "platform_admin" || user?.role === "platform_admin"
      ? "company_admin"
      : user?.role;
  const permissions = new Set(user?.permissions || []);
  return modules.filter((entry) => {
    if (!entry.enabled || !entry.active || !entry.allowed_roles?.includes(role)) return false;
    if (role === "super_admin" || ["company_admin", "admin", "manager"].includes(role)) return true;
    if (!entry.required_permissions?.length) return true;
    const inherited = inheritedModulePermissions[entry.module_key];
    const effectivePermissions = inherited
      ? [...entry.required_permissions, ...inherited]
      : entry.required_permissions;
    return effectivePermissions.some((p) => permissions.has(p));
  });
}

export async function companyModuleEnabled(companyId, moduleKey, user, options) {
  return modulesVisibleToUser(await listCompanyModules(companyId, options), user).some((entry) => entry.module_key === moduleKey);
}

export async function companyModuleEnabledForCompany(companyId, moduleKey, user, options) {
  const role = user?.globalRole === "super_admin" ? "super_admin" : user?.role;
  const modules = await listCompanyModules(companyId, options);
  return modules.some((entry) => entry.module_key === moduleKey && entry.enabled && entry.active && entry.allowed_roles?.includes(role));
}

export async function replaceCompanyModules(companyId, changes, { transaction = withDropshippingTransaction } = {}) {
  if (!Array.isArray(changes)) throw Object.assign(new Error("modules must be an array."), { statusCode: 400 });
  const seen = new Set();
  for (const item of changes) {
    if (!definitions.has(item?.module_key)) throw Object.assign(new Error(`Unknown module: ${item?.module_key || ""}.`), { statusCode: 400 });
    if (seen.has(item.module_key)) throw Object.assign(new Error(`Duplicate module: ${item.module_key}.`), { statusCode: 400 });
    if (typeof item.enabled !== "boolean") throw Object.assign(new Error(`${item.module_key}.enabled must be boolean.`), { statusCode: 400 });
    if (!Number.isInteger(Number(item.sort_order)) || Number(item.sort_order) < 0) throw Object.assign(new Error(`${item.module_key}.sort_order must be a non-negative integer.`), { statusCode: 400 });
    if (item.configuration_override != null && (typeof item.configuration_override !== "object" || Array.isArray(item.configuration_override))) throw Object.assign(new Error(`${item.module_key}.configuration_override must be an object.`), { statusCode: 400 });
    for (const field of ["label_en_override", "label_ar_override"]) {
      if (item[field] != null && (typeof item[field] !== "string" || item[field].length > 120)) throw Object.assign(new Error(`${item.module_key}.${field} must be a string of 120 characters or fewer.`), { statusCode: 400 });
    }
    seen.add(item.module_key);
  }
  try {
    return await transaction(async (client) => {
      for (const item of changes) await client.query(`insert into public.company_cpanel_modules(company_id,module_key,enabled,sort_order,label_en_override,label_ar_override,configuration_override) values($1,$2,$3,$4,$5,$6,$7::jsonb) on conflict(company_id,module_key) do update set enabled=excluded.enabled,sort_order=excluded.sort_order,label_en_override=excluded.label_en_override,label_ar_override=excluded.label_ar_override,configuration_override=excluded.configuration_override,updated_at=now()`, [companyId, item.module_key, item.enabled, Number(item.sort_order), item.label_en_override || null, item.label_ar_override || null, JSON.stringify(item.configuration_override || {})]);
      return true;
    });
  } catch (dbError) {
    if (!isSupabaseConfigured()) {
      inMemoryModuleStore.set(companyId, changes);
      return true;
    }
    throw dbError;
  }
}

export async function restoreCompanyModuleDefaults(companyId, { transaction = withDropshippingTransaction } = {}) {
  const defaults = defaultEnabledModuleKeys(companyId);
  return transaction(async (client) => {
    await client.query("delete from public.company_cpanel_modules where company_id=$1", [companyId]);
    for (const entry of CPANEL_MODULE_DEFINITIONS) await client.query("insert into public.company_cpanel_modules(company_id,module_key,enabled,sort_order) values($1,$2,$3,$4)", [companyId, entry.module_key, defaults.has(entry.module_key), entry.sort_order]);
    return true;
  });
}
