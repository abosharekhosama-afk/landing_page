import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { getNavigationItem } from "../src/data/adminNavigation.js";
import {
  canViewGettingPaid,
  confirmedPaymentConfiguration,
  gettingPaidCurrency,
  gettingPaidDirection,
  gettingPaidPageKeys,
  invoiceView,
  isGettingPaidPage,
  normalizeInvoiceRows,
  resolveGettingPaidDestination,
} from "../src/utils/gettingPaid.js";

const pageSource = fs.readFileSync(new URL("../src/pages/AdminGettingPaidPage.jsx", import.meta.url), "utf8");
const appSource = fs.readFileSync(new URL("../src/CPanelApp.jsx", import.meta.url), "utf8");
const cssSource = fs.readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");

const company = { id: "icare", name: "iCare", settings: { currency: "ILS", locale: "en-US" }, slug: "icare", storefrontUrl: "https://igroup.website/icare" };
const companyAdmin = { activeCompany: company, role: "company_admin" };
const modules = [{ enabled: true, route: "/admin/invoices" }, { enabled: true, route: "/admin/products" }, { enabled: true, route: "/admin/customers" }];

test("Getting Paid route set includes five setup pages and the real invoice route", () => {
  assert.equal(gettingPaidPageKeys.length, 6);
  for (const pageKey of gettingPaidPageKeys) assert.equal(isGettingPaidPage(pageKey), true);
  assert.equal(isGettingPaidPage("admin-orders"), false);
  assert.equal(getNavigationItem("admin-invoices")?.existing, true);
  assert.match(appSource, /gettingPaidPageKeys\.includes\(activePage\)[\s\S]*?<AdminGettingPaidPage/);
  assert.match(appSource, /featurePageKeys\.includes\(activePage\) && !gettingPaidPageKeys\.includes\(activePage\)/);
});

test("Getting Paid access preserves company scope and the real invoice module gate", () => {
  assert.equal(canViewGettingPaid(companyAdmin, company, modules, "admin-invoices"), true);
  assert.equal(canViewGettingPaid(companyAdmin, company, [], "admin-invoices"), false);
  assert.equal(canViewGettingPaid(companyAdmin, company, [], "admin-tenant-placeholder-getting-paid-setup"), true);
  assert.equal(canViewGettingPaid({ role: "super_admin" }, company, [], "admin-invoices"), true);
  assert.equal(canViewGettingPaid({ role: "super_admin" }, null, [], "admin-invoices"), false);
  assert.equal(canViewGettingPaid({ role: "employee", permissions: [] }, company, modules, "admin-invoices"), false);
  assert.equal(canViewGettingPaid({ role: "employee", permissions: ["invoices.view"] }, company, modules, "admin-invoices"), true);
  assert.equal(canViewGettingPaid({ role: "employee", permissions: ["invoices.view"] }, company, [], "admin-invoices"), false);
});

test("Connect & Setup routes to existing pages only when authorized", () => {
  assert.equal(resolveGettingPaidDestination("invoices", { currentUser: companyAdmin, modules }), "admin-invoices");
  assert.equal(resolveGettingPaidDestination("products", { currentUser: companyAdmin, modules }), "admin-products");
  assert.equal(resolveGettingPaidDestination("payLinks", { currentUser: companyAdmin, modules }), "admin-tenant-placeholder-getting-paid-pay-links");
  assert.equal(resolveGettingPaidDestination("quotes", { currentUser: companyAdmin, modules }), "admin-tenant-placeholder-getting-paid-quotes");
  assert.equal(resolveGettingPaidDestination("proposals", { currentUser: companyAdmin, modules }), "admin-tenant-placeholder-getting-paid-proposals");
  assert.equal(resolveGettingPaidDestination("pos", { currentUser: companyAdmin, modules }), "admin-tenant-placeholder-getting-paid-pos");
  assert.equal(resolveGettingPaidDestination("invoices", { currentUser: companyAdmin, modules: [] }), null);
});

test("payment configuration is confirmed only from explicit company settings", () => {
  assert.deepEqual(confirmedPaymentConfiguration(company), { configured: false, methods: [], provider: null });
  assert.deepEqual(confirmedPaymentConfiguration({ settings: { paymentProvider: "verified-provider" } }), { configured: true, methods: [], provider: "verified-provider" });
  assert.deepEqual(confirmedPaymentConfiguration({ settings: { paymentMethods: ["card"] } }), { configured: true, methods: ["card"], provider: null });
});

test("the existing invoice API and records are preserved", () => {
  assert.match(pageSource, /fetchInvoices\(/);
  assert.match(pageSource, /reloadInvoices/);
  assert.match(pageSource, /filterInvoiceRows/);
  assert.match(pageSource, /invoiceCopy\(language\)/);
  assert.match(pageSource, /copy\.filterOptions/);
  assert.match(pageSource, /InvoiceEmptyState/);
  assert.match(pageSource, /copy\.retry/);
  assert.match(pageSource, /copy\.noMatches/);
  assert.doesNotMatch(pageSource, /InvoiceOnboarding/);
  assert.doesNotMatch(pageSource, /value: "void"/);
  assert.deepEqual(normalizeInvoiceRows({ invoices: [{ id: "invoice-1" }] }), [{ id: "invoice-1" }]);
  assert.deepEqual(normalizeInvoiceRows({}), []);
  assert.deepEqual(invoiceView({ amount: 12, customer: { name: "Real Customer" }, invoiceNumber: "INV-1", status: "open" }), { customer: "Real Customer", date: null, id: "INV-1", number: "INV-1", status: "open", total: 12 });
});

test("invoice create flow uses form modal, customer API, and createInvoice wrapper", () => {
  assert.match(pageSource, /InvoiceFormModal/);
  assert.match(pageSource, /emptyInvoiceForm\(company\)/);
  assert.match(pageSource, /fetchCustomers\(\{ limit: 100 \}\)/);
  assert.match(pageSource, /customerDisplayName/);
  assert.match(pageSource, /validateInvoiceForm/);
  assert.match(pageSource, /buildInvoicePayload/);
  assert.match(pageSource, /createInvoice\(/);
  assert.match(pageSource, /computeInvoiceTotals/);
  assert.match(pageSource, /lineTotalValue/);
  assert.match(pageSource, /copy\.statusOptions/);
  assert.match(pageSource, /invoiceCopy\(language\)\.createdNotice/);
  assert.match(pageSource, /INVOICE_LINE_ITEM_LIMIT/);
  assert.match(pageSource, /openCreateInvoice/);
});

test("invoice detail and edit flows use fetchInvoice, invoiceEditable, and updateInvoice", () => {
  assert.match(pageSource, /InvoiceDetailModal/);
  assert.match(pageSource, /fetchInvoice\(/);
  assert.match(pageSource, /invoiceEditable/);
  assert.match(pageSource, /invoiceToForm/);
  assert.match(pageSource, /updateInvoice\(/);
  assert.match(pageSource, /copy\.editStatusOptions/);
  assert.match(pageSource, /mode="edit"/);
  assert.match(pageSource, /invoiceCopy\(language\)\.savedNotice/);
  assert.match(pageSource, /onViewInvoice/);
  assert.match(pageSource, /onEditInvoice/);
  assert.match(pageSource, /onStaleState/);
  assert.match(pageSource, /error\?\.status === 400/);
});

test("invoice cancel and void lifecycle use InvoiceConfirmDialog and approved API wrappers", () => {
  assert.match(pageSource, /InvoiceConfirmDialog/);
  assert.match(pageSource, /voidInvoice\(/);
  assert.match(pageSource, /status: "cancelled"/);
  assert.match(pageSource, /copy\.voidTitle/);
  assert.match(pageSource, /copy\.cancelTitle/);
  assert.match(pageSource, /copy\.confirmVoid/);
  assert.match(pageSource, /copy\.confirmCancel/);
  assert.match(pageSource, /invoiceCopy\(language\)\[action === "void" \? "voidedNotice" : "cancelledNotice"\]/);
  assert.match(pageSource, /onCancelInvoice/);
  assert.match(pageSource, /onVoidInvoice/);
  assert.match(pageSource, /openCancelConfirm/);
  assert.match(pageSource, /openVoidConfirm/);
  assert.doesNotMatch(pageSource, /onLifecyclePlaceholder/);
  assert.doesNotMatch(pageSource, /DELETE \/admin\/invoices/);
});

test("invoice totals use tenant currency and locale", () => {
  assert.match(gettingPaidCurrency(15, company, "en"), /15\.00/);
  assert.match(pageSource, /gettingPaidCurrency\(invoice\.total, company, language\)/);
});

test("Connect & Setup has the four requested payment method cards", () => {
  assert.match(pageSource, /"Request payments"/);
  assert.match(pageSource, /"Win more clients"/);
  assert.match(pageSource, /"Sell in person"/);
  assert.match(pageSource, /"Sell on your website"/);
  assert.match(pageSource, /Connect Payment Method/);
});

test("Pay Links, Quotes, Proposals, and POS have distinct split compositions", () => {
  assert.match(pageSource, /getting-paid-paylinks-hero/);
  assert.match(pageSource, /getting-paid-checkout-card/);
  assert.match(pageSource, /getting-paid-quotes-hero/);
  assert.match(pageSource, /getting-paid-quote-document/);
  assert.match(pageSource, /getting-paid-proposals-hero/);
  assert.match(pageSource, /getting-paid-proposal-document/);
  assert.match(pageSource, /getting-paid-pos-hero/);
  assert.match(pageSource, /getting-paid-pos-terminal/);
});

test("unsupported payment actions use the shared bilingual under-development flow", () => {
  assert.match(pageSource, /AdminUnderDevelopmentContent/);
  assert.match(pageSource, /const unsupported = \(\) => setUnsupportedKind\("generic"\)/);
  assert.match(pageSource, /else fallback\(\)/);
});

test("POS shows only real product count and confirmed tenant currency", () => {
  assert.match(pageSource, /products\.length/);
  assert.match(pageSource, /company\?\.settings\?\.currency \|\| "—"/);
  assert.doesNotMatch(pageSource, /Tap to Pay|cash drawer|inventory sync|connected hardware/i);
});

test("Getting Paid pages have one title and support RTL, LTR, and responsive stacking", () => {
  assert.match(pageSource, /<AdminLayout[\s\S]*?hideHeader/);
  assert.equal((pageSource.match(/data-getting-paid-page-header/g) || []).length, 1);
  assert.equal(gettingPaidDirection("ar"), "rtl");
  assert.equal(gettingPaidDirection("en"), "ltr");
  assert.match(pageSource, /data-getting-paid-direction=\{gettingPaidDirection\(language\)\}/);
  assert.match(cssSource, /\[dir="rtl"\] \.getting-paid-page-header/);
  assert.match(cssSource, /@media \(max-width: 620px\)[\s\S]*?\.getting-paid-methods-section/);
});

test("Getting Paid CSS remains in one named scoped section", () => {
  assert.equal((cssSource.match(/\/\* Tenant Getting Paid pages \*\//g) || []).length, 1);
  assert.match(cssSource, /\.tenant-getting-paid-page/);
  assert.match(cssSource, /\.getting-paid-paylinks-hero/);
  assert.match(cssSource, /\.getting-paid-pos-hero/);
  assert.match(cssSource, /\.getting-paid-invoice-toolbar/);
  assert.match(cssSource, /\.getting-paid-invoice-form/);
  assert.match(cssSource, /\.getting-paid-invoice-totals/);
  assert.match(cssSource, /\.getting-paid-invoice-modal/);
  assert.match(cssSource, /\.getting-paid-invoice-detail/);
  assert.match(cssSource, /\.getting-paid-invoice-list-rows/);
  assert.match(cssSource, /\.getting-paid-invoice-row/);
});
