import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  INVOICE_LINE_ITEM_LIMIT,
  buildInvoicePayload,
  computeInvoiceTotals,
  createInvoice,
  customerDisplayName,
  fetchInvoice,
  fetchInvoices,
  filterInvoiceRows,
  invoiceCopy,
  invoiceEditable,
  invoiceListRow,
  updateInvoice,
  validateInvoiceForm,
  voidInvoice,
} from "../src/utils/invoices.js";

const invoicesSource = fs.readFileSync(new URL("../src/utils/invoices.js", import.meta.url), "utf8");
const copy = invoiceCopy("en");

const sampleRows = [
  { id: "1", invoice_number: "INV-2026-000001", customer_name: "Jane Doe", customer_email: "jane@example.com", status: "draft", issue_date: "2026-08-18", total: 100 },
  { id: "2", invoice_number: "INV-2026-000002", customer_name: "Acme Ltd", customer_email: "billing@acme.test", status: "issued", issue_date: "2026-08-17", total: 50 },
  { id: "3", invoice_number: "INV-2026-000003", customer_name: "Paid Client", customer_email: "paid@example.com", status: "paid", issue_date: "2026-08-16", total: 75 },
  { id: "4", invoice_number: "INV-2026-000004", customer_name: "Cancelled Co", customer_email: "cancel@example.com", status: "cancelled", issue_date: "2026-08-15", total: 20 },
];

test("invoices.js module imports without a parse error", () => {
  assert.equal(typeof invoiceCopy, "function");
  assert.equal(typeof computeInvoiceTotals, "function");
  assert.equal(typeof validateInvoiceForm, "function");
  assert.equal(typeof buildInvoicePayload, "function");
  assert.equal(INVOICE_LINE_ITEM_LIMIT, 100);
});

test("computeInvoiceTotals sums valid line items and keeps tax/discount at zero", () => {
  const totals = computeInvoiceTotals([
    { description: "A", quantity: "2", unit_price: "10.555" },
    { description: "B", quantity: "1", unit_price: "3" },
    { description: "invalid", quantity: "0", unit_price: "9" },
  ]);
  assert.equal(totals.subtotal, 24.11);
  assert.equal(totals.total, 24.11);
  assert.equal(totals.discount_total, 0);
  assert.equal(totals.tax_total, 0);
});

test("validateInvoiceForm requires a customer name and at least one valid line item", () => {
  const invalid = validateInvoiceForm({
    customer_name: "  ",
    customer_email: "not-an-email",
    line_items: [{ description: "", quantity: "0", unit_price: "-1" }],
  }, copy);
  assert.equal(invalid.errors.customer_name, copy.validation.customerName);
  assert.equal(invalid.errors.customer_email, copy.validation.email);
  assert.equal(invalid.errors.line_items, copy.validation.lineItems);
  assert.ok(invalid.itemErrors[0].description);
  assert.ok(invalid.itemErrors[0].quantity);
  assert.ok(invalid.itemErrors[0].unit_price);

  const valid = validateInvoiceForm({
    customer_name: "Jane Doe",
    customer_email: "jane@example.com",
    line_items: [{ description: "Service", quantity: "1", unit_price: "10" }],
  }, copy);
  assert.deepEqual(valid.errors, {});
});

test("validateInvoiceForm rejects more than 100 line items", () => {
  const lineItems = Array.from({ length: 101 }, (_, index) => ({
    description: `Item ${index + 1}`,
    quantity: "1",
    unit_price: "1",
  }));
  const result = validateInvoiceForm({ customer_name: "Jane", line_items: lineItems }, copy);
  assert.equal(result.errors.line_items, copy.validation.lineItemsMax);
});

test("buildInvoicePayload trims fields, drops empty lines, and caps at 100 items", () => {
  const extra = Array.from({ length: 101 }, (_, index) => ({
    description: `Item ${index + 1}`,
    quantity: "1",
    unit_price: String(index + 1),
  }));
  const payload = buildInvoicePayload({
    customer_name: "  Jane Doe  ",
    customer_email: "  jane@example.com  ",
    customer_phone: "  ",
    status: "draft",
    currency: "ILS",
    issue_date: "2026-08-18",
    due_date: "",
    notes: "  note  ",
    line_items: [{ description: "   ", quantity: "2", unit_price: "5" }, ...extra],
  });
  assert.equal(payload.customer_name, "Jane Doe");
  assert.equal(payload.customer_email, "jane@example.com");
  assert.equal(payload.customer_phone, null);
  assert.equal(payload.due_date, null);
  assert.equal(payload.notes, "note");
  assert.equal(payload.line_items.length, 100);
  assert.equal(payload.line_items[0].description, "Item 1");
  assert.equal(payload.line_items[0].product_id, null);
  assert.equal(payload.line_items[0].sku, null);
  assert.equal(payload.line_items[0].quantity, 1);
});

test("invoiceListRow maps snake_case API fields for list display and search", () => {
  const mapped = invoiceListRow(sampleRows[0], "en");
  assert.equal(mapped.number, "INV-2026-000001");
  assert.equal(mapped.invoice_number, "INV-2026-000001");
  assert.equal(mapped.customer, "Jane Doe");
  assert.equal(mapped.customer_name, "Jane Doe");
  assert.equal(mapped.customer_email, "jane@example.com");
  assert.equal(mapped.issue_date, "2026-08-18");
  assert.equal(mapped.due_date, "");
  assert.equal(mapped.statusLabel, "Draft");
});

test("filterInvoiceRows matches invoice number, customer name, and email case-insensitively", () => {
  assert.equal(filterInvoiceRows(sampleRows, { query: "inv-2026-000002" }).length, 1);
  assert.equal(filterInvoiceRows(sampleRows, { query: "JANE" })[0].invoice_number, "INV-2026-000001");
  assert.equal(filterInvoiceRows(sampleRows, { query: "BILLING@ACME.TEST" })[0].customer_name, "Acme Ltd");
  assert.equal(filterInvoiceRows(sampleRows, { status: "paid" }).length, 1);
  assert.equal(filterInvoiceRows(sampleRows, { query: "inv", status: "draft" }).length, 1);
  assert.equal(filterInvoiceRows(sampleRows, { query: "missing" }).length, 0);
});

test("invoiceEditable is false for cancelled and void, true otherwise", () => {
  assert.equal(invoiceEditable("draft"), true);
  assert.equal(invoiceEditable("issued"), true);
  assert.equal(invoiceEditable("paid"), true);
  assert.equal(invoiceEditable("cancelled"), false);
  assert.equal(invoiceEditable("void"), false);
});

test("customerDisplayName prefers displayName, then name, then first plus last", () => {
  assert.equal(customerDisplayName({ displayName: "Preferred", name: "Other" }), "Preferred");
  assert.equal(customerDisplayName({ name: "Acme" }), "Acme");
  assert.equal(customerDisplayName({ firstName: "Jane", lastName: "Doe" }), "Jane Doe");
  assert.equal(customerDisplayName(null), "");
});

test("filterOptions omit void and editStatusOptions are draft, issued, paid only", () => {
  for (const language of ["en", "ar"]) {
    const options = invoiceCopy(language);
    assert.deepEqual(options.filterOptions.map((option) => option.value), ["all", "draft", "issued", "paid", "cancelled"]);
    assert.ok(!options.filterOptions.some((option) => option.value === "void"));
    assert.deepEqual(options.editStatusOptions.map((option) => option.value), ["draft", "issued", "paid"]);
    assert.ok(!options.editStatusOptions.some((option) => option.value === "cancelled"));
    assert.ok(!options.editStatusOptions.some((option) => option.value === "void"));
  }
});

test("API wrappers use apiRequest and void invoices with POST /admin/invoices/:id/void", () => {
  assert.equal(typeof fetchInvoices, "function");
  assert.equal(typeof fetchInvoice, "function");
  assert.equal(typeof createInvoice, "function");
  assert.equal(typeof updateInvoice, "function");
  assert.equal(typeof voidInvoice, "function");
  assert.match(invoicesSource, /from "\.\/api\.js"/);
  assert.match(invoicesSource, /apiRequest\("\/admin\/invoices"/);
  assert.match(invoicesSource, /method: "PATCH"/);
  assert.match(invoicesSource, /method: "POST"/);
  assert.match(invoicesSource, /invoicePath\(id, "\/void"\)/);
  assert.doesNotMatch(invoicesSource, /DELETE \/admin\/invoices/);
});
