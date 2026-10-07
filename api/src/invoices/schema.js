import { normalizeCompanyId } from "../tenancy/company.js";

const INVOICE_STATUSES = new Set(["draft", "issued", "paid", "cancelled", "void"]);

const SENSITIVE_FIELDS = new Set([
  "password", "token", "secret", "card", "cvv", "cvc",
  "creditcard", "credit_card", "card_number", "cardnumber",
  "card_expiry", "card_cvc", "pin", "iban", "swift",
]);

const MAX_NOTE_LENGTH = 2000;
const MAX_LINE_ITEMS = 100;
const MAX_DESCRIPTION_LENGTH = 500;

function lastYear() {
  return new Date().getUTCFullYear();
}

function invoiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function rejectUnknownFields(body, allowed) {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(body)) {
    if (!allowedSet.has(key)) {
      throw invoiceError(`Unknown field: ${key}`);
    }
  }
}

function rejectSensitiveData(value, path = "") {
  if (!value || typeof value === "boolean" || typeof value === "number") return;
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    for (const field of SENSITIVE_FIELDS) {
      if (lower.includes(field)) {
        throw invoiceError(`Sensitive data detected at ${path || "body"}`);
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => rejectSensitiveData(item, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_FIELDS.has(k.toLowerCase())) {
        throw invoiceError(`Sensitive field rejected: ${k}`);
      }
      rejectSensitiveData(v, `${path}.${k}`);
    }
  }
}

function sanitizeLineItem(item, index) {
  if (!item || typeof item !== "object") {
    throw invoiceError(`Line item at index ${index} must be an object.`);
  }
  const description = String(item.description || "").trim();
  if (!description) {
    throw invoiceError(`Line item at index ${index}: description is required.`);
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw invoiceError(`Line item at index ${index}: description exceeds ${MAX_DESCRIPTION_LENGTH} characters.`);
  }
  const quantity = Number(item.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw invoiceError(`Line item at index ${index}: quantity must be greater than 0.`);
  }
  const unitPrice = Number(item.unit_price ?? item.unitPrice ?? 0);
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw invoiceError(`Line item at index ${index}: unit_price must be 0 or greater.`);
  }
  return {
    description,
    product_id: item.product_id || item.productId || null,
    sku: item.sku || null,
    quantity,
    unit_price: unitPrice,
    total: Math.round(quantity * unitPrice * 100) / 100,
  };
}

function sanitizeLineItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw invoiceError("At least one line item is required.");
  }
  if (items.length > MAX_LINE_ITEMS) {
    throw invoiceError(`Line items exceed maximum of ${MAX_LINE_ITEMS}.`);
  }
  return items.map((item, index) => sanitizeLineItem(item, index));
}

function calculateTotals(lineItems) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount_total: 0,
    tax_total: 0,
    total: Math.round(subtotal * 100) / 100,
  };
}

const ALLOWED_FIELDS = [
  "customer_name", "customerName",
  "customer_email", "customerEmail",
  "customer_phone", "customerPhone",
  "status",
  "issue_date", "issueDate",
  "due_date", "dueDate",
  "currency",
  "notes",
  "line_items", "lineItems",
];

const ALLOWED_PARTIAL_FIELDS = ALLOWED_FIELDS.filter(
  (f) => f !== "line_items" && f !== "lineItems",
);

function normalizeFieldName(name) {
  const map = {
    customerName: "customer_name",
    customerEmail: "customer_email",
    customerPhone: "customer_phone",
    issueDate: "issue_date",
    dueDate: "due_date",
    lineItems: "line_items",
  };
  return map[name] || name;
}

export function sanitizeCreateInvoice(body) {
  rejectUnknownFields(body, ALLOWED_FIELDS);
  rejectSensitiveData(body);

  const customerName = String(body.customer_name || body.customerName || "").trim();
  if (!customerName) {
    throw invoiceError("customer_name is required.");
  }

  const lineItems = sanitizeLineItems(body.line_items || body.lineItems);
  const totals = calculateTotals(lineItems);

  const status = String(body.status || "draft").trim().toLowerCase();
  if (!INVOICE_STATUSES.has(status)) {
    throw invoiceError(`Invalid status. Must be one of: ${[...INVOICE_STATUSES].join(", ")}`);
  }

  const notes = body.notes ? String(body.notes).trim().slice(0, MAX_NOTE_LENGTH) : null;

  const result = {
    customer_name: customerName,
    customer_email: body.customer_email || body.customerEmail || null,
    customer_phone: body.customer_phone || body.customerPhone || null,
    status,
    currency: String(body.currency || "ILS").trim().toUpperCase(),
    issue_date: body.issue_date || body.issueDate || new Date().toISOString().slice(0, 10),
    due_date: body.due_date || body.dueDate || null,
    notes,
    line_items: lineItems,
    ...totals,
  };

  return result;
}

export function sanitizeUpdateInvoice(body) {
  rejectUnknownFields(body, ALLOWED_FIELDS);
  rejectSensitiveData(body);

  const update = {};

  if (body.customer_name || body.customerName) {
    const customerName = String(body.customer_name || body.customerName).trim();
    if (!customerName) throw invoiceError("customer_name cannot be empty.");
    update.customer_name = customerName;
  }

  if ("customer_email" in body || "customerEmail" in body) {
    update.customer_email = body.customer_email ?? body.customerEmail ?? null;
  }
  if ("customer_phone" in body || "customerPhone" in body) {
    update.customer_phone = body.customer_phone ?? body.customerPhone ?? null;
  }

  if (body.status) {
    const status = String(body.status).trim().toLowerCase();
    if (!INVOICE_STATUSES.has(status)) {
      throw invoiceError(`Invalid status. Must be one of: ${[...INVOICE_STATUSES].join(", ")}`);
    }
    update.status = status;
  }

  if (body.issue_date || body.issueDate) {
    update.issue_date = body.issue_date || body.issueDate;
  }
  if ("due_date" in body || "dueDate" in body) {
    update.due_date = body.due_date ?? body.dueDate ?? null;
  }

  if ("notes" in body) {
    update.notes = body.notes ? String(body.notes).trim().slice(0, MAX_NOTE_LENGTH) : null;
  }

  if (body.currency) {
    update.currency = String(body.currency).trim().toUpperCase();
  }

  return update;
}

export function sanitizeLineItemsUpdate(body) {
  if (!body.line_items && !body.lineItems) return null;
  rejectSensitiveData(body.line_items || body.lineItems);
  const lineItems = sanitizeLineItems(body.line_items || body.lineItems);
  const totals = calculateTotals(lineItems);
  return { line_items: lineItems, ...totals };
}

export function generateInvoiceNumber(companyId, existingInvoices) {
  const year = lastYear();
  const prefix = `INV-${year}-`;

  const maxSeq = existingInvoices
    .filter((inv) => inv.invoice_number && inv.invoice_number.startsWith(prefix))
    .reduce((max, inv) => {
      const num = parseInt(inv.invoice_number.slice(prefix.length), 10);
      return Number.isFinite(num) && num > max ? num : max;
    }, 0);

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(6, "0")}`;
}
