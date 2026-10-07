export const tenantManagementRoutes = Object.freeze({
  "admin-automations": "/admin/automations",
  "admin-settings": "/admin/settings",
  "admin-settings-getting-paid": "/admin/settings/getting-paid",
  "admin-settings-getting-paid-general": "/admin/settings/getting-paid/general",
  "admin-settings-getting-paid-invoices": "/admin/settings/getting-paid/invoices",
  "admin-settings-getting-paid-price-quotes": "/admin/settings/getting-paid/price-quotes",
  "admin-settings-getting-paid-pay-links": "/admin/settings/getting-paid/pay-links",
  "admin-settings-getting-paid-automations": "/admin/settings/getting-paid/automations",
  "admin-settings-receipts": "/admin/settings/receipts",
  "admin-settings-receipts-automations": "/admin/settings/receipts/automations",
  "admin-settings-tax": "/admin/settings/tax",
  "admin-settings-checkout": "/admin/settings/checkout",
  "admin-settings-checkout-emails": "/admin/settings/checkout/emails",
  "admin-settings-shipping": "/admin/settings/shipping",
  "admin-settings-bookings": "/admin/settings/bookings",
  "admin-settings-bookings-default-hours": "/admin/settings/bookings/default-hours",
  "admin-settings-bookings-add-ons": "/admin/settings/bookings/add-ons",
  "admin-settings-bookings-staff": "/admin/settings/bookings/staff",
  "admin-settings-bookings-resources": "/admin/settings/bookings/resources",
  "admin-settings-bookings-notifications-sent": "/admin/settings/bookings/notifications-sent",
  "admin-settings-bookings-notifications-received": "/admin/settings/bookings/notifications-received",
  "admin-settings-bookings-client-flow": "/admin/settings/bookings/client-flow",
  "admin-settings-bookings-forms": "/admin/settings/bookings/forms",
  "admin-settings-bookings-video-conferencing": "/admin/settings/bookings/video-conferencing",
  "admin-settings-bookings-integrations": "/admin/settings/bookings/integrations",
});

export const tenantManagementPageKeys = Object.freeze(Object.keys(tenantManagementRoutes));
export const bookingSettingsPageKeys = Object.freeze(
  tenantManagementPageKeys.filter((key) => key.startsWith("admin-settings-bookings")),
);
export const financeSettingsPageKeys = Object.freeze(
  tenantManagementPageKeys.filter((key) => key.startsWith("admin-settings-") && !key.startsWith("admin-settings-bookings")),
);

const pathToPage = Object.freeze(
  Object.fromEntries(Object.entries(tenantManagementRoutes).map(([page, path]) => [path, page])),
);

const legacyPaths = Object.freeze({
  "/admin/coming-soon/automations": "admin-automations",
  "/admin/coming-soon/settings/getting-paid": "admin-settings-getting-paid",
  "/admin/coming-soon/settings/receipts": "admin-settings-receipts",
  "/admin/coming-soon/settings/tax": "admin-settings-tax",
  "/admin/coming-soon/settings/checkout": "admin-settings-checkout",
  "/admin/coming-soon/settings/shipping": "admin-settings-shipping",
  "/admin/coming-soon/settings/bookings": "admin-settings-bookings",
});

export function resolveTenantManagementPage(pathname) {
  const normalized = pathname && pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname;
  return pathToPage[normalized] || legacyPaths[normalized] || null;
}

export function canonicalTenantManagementPageKey(pageKey) {
  if (pageKey === "admin-tenant-placeholder-automations") return "admin-automations";
  return tenantManagementPageKeys.includes(pageKey) ? pageKey : pageKey;
}

export function tenantManagementDirection(language) {
  return language === "ar" ? "rtl" : "ltr";
}

export function localizedSetting(value, language) {
  if (typeof value === "string") return value;
  return value?.[language] || value?.en || "";
}

export function filterSettingsSections(sections, query, language = "en") {
  const search = String(query || "").trim().toLocaleLowerCase(language === "ar" ? "ar" : "en");
  if (!search) return sections;
  return sections
    .map((section) => ({
      ...section,
      rows: section.rows.filter((row) =>
        `${localizedSetting(row.title, language)} ${localizedSetting(row.description, language)}`
          .toLocaleLowerCase(language === "ar" ? "ar" : "en")
          .includes(search),
      ),
    }))
    .filter((section) => section.rows.length);
}

export function companySetting(company, key) {
  return company?.[key] ?? company?.settings?.[key] ?? company?.companySettings?.[key] ?? null;
}

export function companyDisplayName(company, language = "en") {
  const name = company?.name;
  if (typeof name === "string") return name;
  return name?.[language] || name?.en || company?.slug || company?.id || (language === "ar" ? "الشركة" : "Company");
}

export function canManageTenantSettings(user) {
  return ["admin", "company_admin", "manager"].includes(user?.role)
    || (user?.globalRole === "super_admin" && user?.isCompanyScope === true);
}
