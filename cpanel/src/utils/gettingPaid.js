import { getNavigationItem } from "../data/adminNavigation.js";
import { moduleAllowsPage } from "./moduleRegistry.js";
import { canAccessAdminPage, isPlatformAdmin, isTenantOperator } from "./roles.js";
import { formatCompanyCurrency } from "./sales.js";

export const gettingPaidPageKeys = Object.freeze([
  "admin-tenant-placeholder-getting-paid-setup",
  "admin-tenant-placeholder-getting-paid-pay-links",
  "admin-invoices",
  "admin-tenant-placeholder-getting-paid-quotes",
  "admin-tenant-placeholder-getting-paid-proposals",
  "admin-tenant-placeholder-getting-paid-pos",
]);

const destinations = Object.freeze({
  customers: "admin-customers",
  invoices: "admin-invoices",
  payLinks: "admin-tenant-placeholder-getting-paid-pay-links",
  pos: "admin-tenant-placeholder-getting-paid-pos",
  products: "admin-products",
  proposals: "admin-tenant-placeholder-getting-paid-proposals",
  quotes: "admin-tenant-placeholder-getting-paid-quotes",
});

const moduleDestinations = new Set(["admin-customers", "admin-invoices", "admin-products"]);

export function isGettingPaidPage(pageKey) {
  return gettingPaidPageKeys.includes(pageKey);
}

export function gettingPaidDirection(language) {
  return language === "ar" ? "rtl" : "ltr";
}

export function canViewGettingPaid(currentUser, company, modules = [], pageKey) {
  const companyId = company?.id || currentUser?.activeCompany?.id || currentUser?.active_company?.id;
  if (!companyId) return false;
  if (pageKey === "admin-invoices") {
    if (isPlatformAdmin(currentUser?.role)) return true;
    return canAccessAdminPage(currentUser, pageKey) && moduleAllowsPage(modules, pageKey);
  }
  if (!(isTenantOperator(currentUser?.role) || isPlatformAdmin(currentUser?.role))) return false;
  return true;
}

export function resolveGettingPaidDestination(action, { currentUser, modules = [] } = {}) {
  const page = destinations[action] || null;
  if (!page || !getNavigationItem(page) || !canAccessAdminPage(currentUser, page)) return null;
  if (moduleDestinations.has(page) && !moduleAllowsPage(modules, page)) return null;
  return page;
}

export function confirmedPaymentConfiguration(company) {
  const settings = company?.settings && typeof company.settings === "object" ? company.settings : {};
  const methods = Array.isArray(settings.paymentMethods) ? settings.paymentMethods.filter(Boolean) : [];
  return {
    configured: settings.paymentsEnabled === true || Boolean(settings.paymentProvider) || methods.length > 0,
    methods,
    provider: settings.paymentProvider || null,
  };
}

export function normalizeInvoiceRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.invoices)) return data.invoices;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export function invoiceView(row = {}) {
  const customer = row.customer && typeof row.customer === "object" ? row.customer : {};
  return {
    customer: customer.name || customer.email || customer.phone || row.customerName || row.customerEmail || "",
    date: row.issueDate || row.createdAt || row.date || null,
    id: row.id || row.invoiceNumber || row.number || "",
    number: row.invoiceNumber || row.number || row.id || "",
    status: row.status || row.paymentStatus || "",
    total: Number(row.total ?? row.amount ?? row.balance ?? 0),
  };
}

export function gettingPaidCurrency(value, company, language) {
  return formatCompanyCurrency(value, company, language);
}
