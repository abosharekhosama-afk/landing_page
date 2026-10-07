import { apiRequest } from "./api.js";

export const INVOICE_LINE_ITEM_LIMIT = 100;

function bi(language, en, ar) {
  return language === "ar" ? ar : en;
}

function invoicePath(invoiceId, suffix = "") {
  return `/admin/invoices/${encodeURIComponent(invoiceId)}${suffix}`;
}

export function invoiceCopy(language) {
  return language === "ar" ? {
    recordsTitle: "سجلات الفواتير", recordsSubtitle: "تم تحميلها من واجهة فواتير المستأجر الحالية.",
    newInvoice: "فاتورة جديدة", search: "بحث", searchPlaceholder: "ابحث بالرقم أو العميل…",
    filterStatus: "تصفية حسب الحالة",
    number: "الفاتورة", customer: "العميل", issued: "تاريخ الإصدار", due: "تاريخ الاستحقاق", total: "الإجمالي", status: "الحالة",
    view: "عرض", edit: "تعديل", voidInvoice: "إبطال", cancelInvoice: "إلغاء",
    markPaid: "تعيين كمدفوعة", markUnpaid: "تعيين كغير مدفوعة", print: "طباعة", send: "إرسال", download: "تنزيل",
    tax: "الضريبة", discount: "الخصم", paymentStatus: "حالة الدفع",
    readOnly: "وضع العرض فقط — ليست لديك صلاحية إدارة الفواتير.",
    forbidden: "ليس لديك صلاحية عرض الفواتير.",
    notFound: "الفاتورة غير موجودة.",
    sendUnsupported: "إرسال الفواتير غير متصل. لا توجد واجهة إرسال.",
    downloadUnsupported: "تنزيل ملف الفاتورة غير متصل.",
    paidNotice: "تم تعيين الفاتورة كمدفوعة.", unpaidNotice: "تم تعيين الفاتورة كصادرة.",
    noMatches: "لا توجد فواتير مطابقة.", clearFilters: "مسح عوامل التصفية",
    createTitle: "إنشاء فاتورة", editTitle: "تعديل الفاتورة", formSubtitle: "املأ بيانات العميل وبنود الفاتورة.",
    customerName: "اسم العميل", customerEmail: "البريد الإلكتروني", customerPhone: "الهاتف",
    issueDate: "تاريخ الإصدار", dueDate: "تاريخ الاستحقاق", statusLabel: "الحالة", currency: "العملة", notes: "ملاحظات",
    lineItems: "بنود الفاتورة", addItem: "إضافة بند", itemDescription: "الوصف", quantity: "الكمية", price: "السعر", lineTotal: "إجمالي البند", removeItem: "إزالة البند",
    subtotal: "المجموع الفرعي", totalLabel: "الإجمالي",
    cancel: "إلغاء", create: "إنشاء الفاتورة", save: "حفظ التغييرات", saving: "جارٍ الحفظ…", close: "إغلاق",
    back: "رجوع", processing: "جارٍ المعالجة…",
    createdNotice: "تم إنشاء الفاتورة.", savedNotice: "تم حفظ الفاتورة.", voidedNotice: "تم إبطال الفاتورة.", cancelledNotice: "تم إلغاء الفاتورة.",
    requestFailed: "تعذر إكمال الطلب.",
    loading: "جارٍ تحميل الفواتير…", loadFailed: "تعذر تحميل الفواتير", retry: "إعادة المحاولة",
    noInvoicesTitle: "لا توجد فواتير بعد", noInvoicesText: "أنشئ فاتورتك الأولى لبدء طلب المدفوعات وتتبعها.",
    detailTitle: "تفاصيل الفاتورة", invoiceNumber: "رقم الفاتورة", issuedOn: "صدرت في", dueOn: "الاستحقاق", customerDetails: "العميل",
    emailLabel: "البريد الإلكتروني", phoneLabel: "الهاتف", notesLabel: "ملاحظات",
    statusOptions: [
      { value: "draft", label: "مسودة" }, { value: "issued", label: "صادرة" },
    ],
    filterOptions: [
      { value: "all", label: "كل الحالات" }, { value: "draft", label: "مسودة" }, { value: "issued", label: "صادرة" },
      { value: "paid", label: "مدفوعة" }, { value: "cancelled", label: "ملغاة" },
    ],
    editStatusOptions: [
      { value: "draft", label: "مسودة" }, { value: "issued", label: "صادرة" }, { value: "paid", label: "مدفوعة" },
    ],
    validation: {
      customerName: "اسم العميل مطلوب.", email: "أدخل بريداً إلكترونياً صالحاً.",
      lineItems: "أضف بنداً واحداً صالحاً على الأقل.", lineItemsMax: "لا يمكن أن تتجاوز بنود الفاتورة 100 بند.",
      description: "الوصف مطلوب.", quantity: "يجب أن تكون الكمية أكبر من 0.", price: "يجب أن يكون السعر 0 أو أكثر.",
    },
    voidTitle: "إبطال الفاتورة؟", voidMessage: "سيتم إبطال هذه الفاتورة ولن تظهر في السجلات النشطة. لا يمكن التراجع عن هذا الإجراء.", confirmVoid: "تأكيد الإبطال",
    cancelTitle: "إلغاء الفاتورة؟", cancelMessage: "سيتم تغيير حالة هذه الفاتورة إلى ملغاة.", confirmCancel: "تأكيد الإلغاء",
  } : {
    recordsTitle: "Invoice records", recordsSubtitle: "Loaded from the existing tenant invoice API.",
    newInvoice: "New Invoice", search: "Search", searchPlaceholder: "Search by number or customer…",
    filterStatus: "Filter by status",
    number: "Invoice", customer: "Customer", issued: "Issued", due: "Due", total: "Total", status: "Status",
    view: "View", edit: "Edit", voidInvoice: "Void", cancelInvoice: "Cancel",
    markPaid: "Mark paid", markUnpaid: "Mark unpaid", print: "Print", send: "Send", download: "Download",
    tax: "Tax", discount: "Discount", paymentStatus: "Payment status",
    readOnly: "View only — you do not have permission to manage invoices.",
    forbidden: "You do not have permission to view invoices.",
    notFound: "Invoice not found.",
    sendUnsupported: "Sending invoices is not connected. No send API exists.",
    downloadUnsupported: "Invoice file download is not connected.",
    paidNotice: "Invoice marked as paid.", unpaidNotice: "Invoice marked as issued.",
    noMatches: "No invoices match your filters.", clearFilters: "Clear filters",
    createTitle: "Create invoice", editTitle: "Edit invoice", formSubtitle: "Enter customer details and invoice line items.",
    customerName: "Customer name", customerEmail: "Customer email", customerPhone: "Customer phone",
    issueDate: "Issue date", dueDate: "Due date", statusLabel: "Status", currency: "Currency", notes: "Notes",
    lineItems: "Line items", addItem: "Add line item", itemDescription: "Description", quantity: "Quantity", price: "Unit price", lineTotal: "Line total", removeItem: "Remove line item",
    subtotal: "Subtotal", totalLabel: "Total",
    cancel: "Cancel", create: "Create invoice", save: "Save changes", saving: "Saving…", close: "Close",
    back: "Back", processing: "Processing…",
    createdNotice: "Invoice created.", savedNotice: "Invoice saved.", voidedNotice: "Invoice voided.", cancelledNotice: "Invoice cancelled.",
    requestFailed: "Request failed.",
    loading: "Loading invoices…", loadFailed: "Invoices could not be loaded", retry: "Retry",
    noInvoicesTitle: "No invoices yet", noInvoicesText: "Create your first invoice to start requesting and tracking payments.",
    detailTitle: "Invoice details", invoiceNumber: "Invoice number", issuedOn: "Issued on", dueOn: "Due on", customerDetails: "Customer",
    emailLabel: "Email", phoneLabel: "Phone", notesLabel: "Notes",
    statusOptions: [
      { value: "draft", label: "Draft" }, { value: "issued", label: "Issued" },
    ],
    filterOptions: [
      { value: "all", label: "All statuses" }, { value: "draft", label: "Draft" }, { value: "issued", label: "Issued" },
      { value: "paid", label: "Paid" }, { value: "cancelled", label: "Cancelled" },
    ],
    editStatusOptions: [
      { value: "draft", label: "Draft" }, { value: "issued", label: "Issued" }, { value: "paid", label: "Paid" },
    ],
    validation: {
      customerName: "Customer name is required.", email: "Enter a valid email address.",
      lineItems: "Add at least one valid line item.", lineItemsMax: "Invoices can include at most 100 line items.",
      description: "Description is required.", quantity: "Quantity must be greater than 0.", price: "Price must be 0 or greater.",
    },
    voidTitle: "Void this invoice?", voidMessage: "This invoice will be voided and removed from active records. This cannot be undone.", confirmVoid: "Confirm void",
    cancelTitle: "Cancel this invoice?", cancelMessage: "This invoice will be marked as cancelled.", confirmCancel: "Confirm cancel",
  };
}

export function invoiceStatusLabel(language, status) {
  const labels = {
    draft: bi(language, "Draft", "مسودة"),
    issued: bi(language, "Issued", "صادرة"),
    paid: bi(language, "Paid", "مدفوعة"),
    cancelled: bi(language, "Cancelled", "ملغاة"),
    void: bi(language, "Void", "باطلة"),
  };
  return labels[status] || bi(language, status || "Unknown", status || "غير معروف");
}

export function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function emptyInvoiceForm(company) {
  return {
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    status: "draft",
    currency: String(company?.settings?.currency || "ILS").toUpperCase(),
    issue_date: todayString(),
    due_date: "",
    notes: "",
    line_items: [{ description: "", quantity: "1", unit_price: "" }],
  };
}

export function invoiceToForm(invoice, company) {
  const items = Array.isArray(invoice?.line_items) && invoice.line_items.length
    ? invoice.line_items.map((item) => ({ description: item.description || "", quantity: String(item.quantity ?? ""), unit_price: String(item.unit_price ?? "") }))
    : [{ description: "", quantity: "1", unit_price: "" }];
  return {
    customer_name: invoice?.customer_name || "",
    customer_email: invoice?.customer_email || "",
    customer_phone: invoice?.customer_phone || "",
    status: invoice?.status || "draft",
    currency: String(invoice?.currency || "").toUpperCase() || String(company?.settings?.currency || "ILS").toUpperCase(),
    issue_date: invoice?.issue_date || todayString(),
    due_date: invoice?.due_date || "",
    notes: invoice?.notes || "",
    line_items: items,
  };
}

export function lineTotalValue(item) {
  const quantity = Number(item?.quantity);
  const unitPrice = Number(item?.unit_price);
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) return 0;
  return Math.round(quantity * unitPrice * 100) / 100;
}

export function computeInvoiceTotals(lineItems) {
  const subtotal = (Array.isArray(lineItems) ? lineItems : []).reduce((sum, item) => sum + lineTotalValue(item), 0);
  const rounded = Math.round(subtotal * 100) / 100;
  return { subtotal: rounded, discount_total: 0, tax_total: 0, total: rounded };
}

export function validateInvoiceForm(values, copy) {
  const errors = {};
  const customerName = String(values?.customer_name || "").trim();
  const customerEmail = String(values?.customer_email || "").trim();
  if (!customerName) errors.customer_name = copy.validation.customerName;
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) errors.customer_email = copy.validation.email;
  const lineItems = Array.isArray(values?.line_items) ? values.line_items : [];
  if (lineItems.length > INVOICE_LINE_ITEM_LIMIT) errors.line_items = copy.validation.lineItemsMax;
  const itemErrors = {};
  lineItems.forEach((item, index) => {
    const itemError = {};
    if (!String(item?.description || "").trim()) itemError.description = copy.validation.description;
    const quantity = Number(item?.quantity);
    const unitPrice = Number(item?.unit_price);
    if (!Number.isFinite(quantity) || quantity <= 0) itemError.quantity = copy.validation.quantity;
    if (!Number.isFinite(unitPrice) || unitPrice < 0) itemError.unit_price = copy.validation.price;
    if (Object.keys(itemError).length) itemErrors[index] = itemError;
  });
  const hasValidItem = lineItems.some((item) => String(item?.description || "").trim() && Number(item?.quantity) > 0 && Number(item?.unit_price) >= 0);
  if (!hasValidItem && !errors.line_items) errors.line_items = copy.validation.lineItems;
  return { errors, itemErrors };
}

export function buildInvoicePayload(values) {
  return {
    customer_name: String(values?.customer_name || "").trim(),
    customer_email: String(values?.customer_email || "").trim() || null,
    customer_phone: String(values?.customer_phone || "").trim() || null,
    status: values?.status,
    currency: values?.currency,
    issue_date: values?.issue_date,
    due_date: values?.due_date || null,
    notes: String(values?.notes || "").trim() || null,
    line_items: (Array.isArray(values?.line_items) ? values.line_items : [])
      .filter((item) => String(item?.description || "").trim())
      .slice(0, INVOICE_LINE_ITEM_LIMIT)
      .map((item) => ({
        description: String(item.description).trim(),
        product_id: null,
        sku: null,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
      })),
  };
}

export function invoiceListRow(row, language) {
  const invoiceNumber = String(row?.invoice_number || row?.invoiceNumber || row?.number || "").trim();
  const customerName = String(row?.customer_name || row?.customerName || "").trim();
  const customerEmail = String(row?.customer_email || row?.customerEmail || "").trim();
  const issueDate = row?.issue_date || row?.issueDate || "";
  return {
    id: row?.id || invoiceNumber,
    invoice_number: invoiceNumber,
    number: invoiceNumber,
    customer_name: customerName,
    customer: customerName,
    customer_email: customerEmail,
    issue_date: issueDate,
    issued: issueDate,
    due_date: row?.due_date || row?.dueDate || "",
    status: row?.status || "",
    statusLabel: invoiceStatusLabel(language, row?.status),
    total: Number(row?.total ?? 0),
    currency: row?.currency || "",
  };
}

export function filterInvoiceRows(rows, { query = "", status = "all" } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const needle = String(query || "").trim().toLowerCase();
  const statusFilter = String(status || "all").trim().toLowerCase();
  return list.filter((row) => {
    const mapped = invoiceListRow(row);
    if (statusFilter && statusFilter !== "all" && String(mapped.status || "").toLowerCase() !== statusFilter) {
      return false;
    }
    if (!needle) return true;
    const haystack = [mapped.invoice_number, mapped.customer_name, mapped.customer_email].join(" ").toLowerCase();
    return haystack.includes(needle);
  });
}

export function invoiceEditable(status) {
  return status !== "cancelled" && status !== "void";
}

export function customerDisplayName(customer) {
  if (!customer || typeof customer !== "object") return "";
  const displayName = String(customer.displayName || "").trim();
  if (displayName) return displayName;
  const name = String(customer.name || "").trim();
  if (name) return name;
  return [customer.firstName, customer.lastName].map((part) => String(part || "").trim()).filter(Boolean).join(" ");
}

export function fetchInvoices(options = {}) {
  return apiRequest("/admin/invoices", { cache: "no-store", signal: options.signal });
}

export function fetchInvoice(id, options = {}) {
  return apiRequest(invoicePath(id), { cache: "no-store", signal: options.signal });
}

export function createInvoice(payload) {
  return apiRequest("/admin/invoices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateInvoice(id, payload) {
  return apiRequest(invoicePath(id), {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function voidInvoice(id) {
  return apiRequest(invoicePath(id, "/void"), {
    method: "POST",
  });
}
