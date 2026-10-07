import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { canUseInvoiceAction } from "../src/utils/roles.js";
import { invoiceCopy, invoiceListRow } from "../src/utils/invoices.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("invoices workspace is Getting Paid, not the generic feature table", () => {
  const app = read("src/CPanelApp.jsx");
  const feature = read("src/pages/AdminFeaturePage.jsx");
  const page = read("src/pages/AdminGettingPaidPage.jsx");
  assert.match(app, /gettingPaidPageKeys\.includes\(activePage\)[\s\S]*?<AdminGettingPaidPage/);
  assert.doesNotMatch(feature, /"admin-invoices"/);
  assert.match(page, /fetchInvoices\(/);
  assert.match(page, /fetchInvoice\(/);
  assert.match(page, /createInvoice\(/);
  assert.match(page, /updateInvoice\(/);
  assert.match(page, /voidInvoice\(/);
  assert.doesNotMatch(page, /localStorage/);
});

test("invoice list covers search, status filter, due date, and honest unsupported send", () => {
  const page = read("src/pages/AdminGettingPaidPage.jsx");
  assert.match(page, /filterInvoiceRows/);
  assert.match(page, /copy\.filterOptions/);
  assert.match(page, /formatInvoiceDate\(invoice\.due_date/);
  assert.match(page, /copy\.noMatches/);
  assert.match(page, /InvoiceEmptyState/);
  assert.match(page, /copy\.retry/);
  assert.match(page, /state\.forbidden/);
  assert.match(page, /copy\.readOnly/);
  assert.match(page, /onUnsupported\("send"\)/);
  assert.match(page, /onUnsupported\("download"\)/);
  assert.match(page, /window\.print\(\)/);
  assert.match(page, /sendUnsupported/);
  assert.match(page, /downloadUnsupported/);
  assert.doesNotMatch(page, /\/admin\/invoices\/.*\/send/);
});

test("invoice detail shows line items, tax, payment status, and mark paid via PATCH status", () => {
  const page = read("src/pages/AdminGettingPaidPage.jsx");
  assert.match(page, /InvoiceDetailModal/);
  assert.match(page, /invoice\.line_items/);
  assert.match(page, /copy\.tax/);
  assert.match(page, /copy\.paymentStatus/);
  assert.match(page, /updateInvoice\(invoiceId, \{ status \}\)/);
  assert.match(page, /copy\.markPaid/);
  assert.match(page, /copy\.markUnpaid/);
  assert.match(page, /copy\.notFound/);
  assert.match(page, /requestError\?\.status === 404/);
});

test("invoice mutations are gated by invoices.manage", () => {
  const page = read("src/pages/AdminGettingPaidPage.jsx");
  const roles = read("src/utils/roles.js");
  const permissions = read("src/data/permissions.js");
  assert.match(page, /canUseInvoiceAction\(currentUser, "invoices\.manage"\)/);
  assert.match(roles, /"admin-invoices": \["invoices\.view"\]/);
  assert.match(roles, /canUseInvoiceAction/);
  assert.match(permissions, /invoices\.view/);
  assert.match(permissions, /invoices\.manage/);
  assert.equal(canUseInvoiceAction({ role: "company_admin" }, "invoices.manage"), true);
  assert.equal(canUseInvoiceAction({ role: "employee", permissions: ["invoices.view"] }, "invoices.manage"), false);
  assert.equal(canUseInvoiceAction({ role: "employee", permissions: ["invoices.manage"] }, "invoices.manage"), true);
  assert.match(page, /canManage && editable/);
});

test("invoice copy and list mapping expose required tenant fields", () => {
  const copy = invoiceCopy("en");
  assert.ok(copy.due);
  assert.ok(copy.tax);
  assert.ok(copy.paymentStatus);
  assert.ok(copy.sendUnsupported);
  const mapped = invoiceListRow({
    id: "inv-1",
    invoice_number: "INV-2026-000010",
    customer_name: "Real Customer",
    due_date: "2026-09-01",
    issue_date: "2026-08-01",
    status: "issued",
    total: 40,
    currency: "ILS",
  }, "en");
  assert.equal(mapped.due_date, "2026-09-01");
  assert.equal(mapped.currency, "ILS");
});

test("invoice list and line-item tables use the shared admin-data-table system", () => {
  const page = read("src/pages/AdminGettingPaidPage.jsx");
  assert.match(page, /className="admin-data-table-wrap"/);
  assert.match(page, /className="admin-data-table"/);
  assert.match(page, /className="admin-data-table-actions"/);
  assert.doesNotMatch(page, /getting-paid-table-wrap/);
  assert.doesNotMatch(page, /getting-paid-invoice-list-head/);
  assert.doesNotMatch(page, /getting-paid-invoice-row/);
});
