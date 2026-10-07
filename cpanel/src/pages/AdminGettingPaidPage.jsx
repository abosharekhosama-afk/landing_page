import React from "react";
import {
  AlertCircle,
  ArrowUpRight,
  BadgeCheck,
  Ban,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  CirclePlus,
  CreditCard,
  Eye,
  FileCheck2,
  FileSignature,
  FileText,
  Globe2,
  HandCoins,
  Laptop,
  Link2,
  LoaderCircle,
  Mail,
  Package,
  Pencil,
  PenTool,
  Phone,
  Plus,
  ReceiptText,
  ScanLine,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Trash2,
  Users,
  WandSparkles,
  X,
  XCircle,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import { AdminUnderDevelopmentContent } from "./AdminPlaceholderPage.jsx";
import { fetchCustomers } from "../utils/customersApi.js";
import {
  canViewGettingPaid,
  confirmedPaymentConfiguration,
  gettingPaidCurrency,
  gettingPaidDirection,
  normalizeInvoiceRows,
  resolveGettingPaidDestination,
} from "../utils/gettingPaid.js";
import { canUseInvoiceAction } from "../utils/roles.js";
import {
  buildInvoicePayload,
  computeInvoiceTotals,
  createInvoice,
  customerDisplayName,
  emptyInvoiceForm,
  fetchInvoice,
  fetchInvoices,
  filterInvoiceRows,
  INVOICE_LINE_ITEM_LIMIT,
  invoiceCopy,
  invoiceEditable,
  invoiceListRow,
  invoiceStatusLabel,
  invoiceToForm,
  lineTotalValue,
  updateInvoice,
  validateInvoiceForm,
  voidInvoice,
} from "../utils/invoices.js";

const pageMeta = {
  "admin-tenant-placeholder-getting-paid-setup": ["Connect & Setup", "Choose how this company will accept and request payments.", "الربط والإعداد", "اختر كيف ستقبل هذه الشركة المدفوعات وتطلبها."],
  "admin-tenant-placeholder-getting-paid-pay-links": ["Pay Links", "Request payment through a shareable checkout link.", "روابط الدفع", "اطلب الدفع من خلال رابط دفع قابل للمشاركة."],
  "admin-invoices": ["Invoices", "Manage real tenant invoices or start invoice setup.", "الفواتير", "أدر فواتير المستأجر الحقيقية أو ابدأ الإعداد."],
  "admin-tenant-placeholder-getting-paid-quotes": ["Price Quotes", "Prepare professional quotes for prospective customers.", "عروض الأسعار", "جهّز عروض أسعار احترافية للعملاء المحتملين."],
  "admin-tenant-placeholder-getting-paid-proposals": ["Proposals", "Create structured business proposals when supported.", "المقترحات", "أنشئ مقترحات أعمال منظمة عند توفر الدعم."],
  "admin-tenant-placeholder-getting-paid-pos": ["POS Checkout", "Prepare an in-person checkout experience.", "نقطة البيع", "جهّز تجربة دفع حضورية."],
};

function bi(language, en, ar) {
  return language === "ar" ? ar : en;
}

function labels(language) {
  return language === "ar"
    ? { available: "غير متاح", create: "إنشاء", help: "معرفة المزيد", notConnected: "غير متصل", setup: "بدء الإعداد", unavailable: "هذه الميزة غير متاحة أو غير متصلة حالياً." }
    : { available: "Unavailable", create: "Create", help: "Learn more", notConnected: "Not connected", setup: "Start setup", unavailable: "This feature is currently unavailable or not connected." };
}

function PageHeader({ description, title }) {
  return <header className="getting-paid-page-header" data-getting-paid-page-header><div><h1>{title}</h1><p>{description}</p></div></header>;
}

function StatusPill({ children }) {
  return <span className="getting-paid-status-pill">{children}</span>;
}

function PaymentIllustration({ type }) {
  return <div aria-hidden="true" className={`getting-paid-illustration getting-paid-illustration-${type}`}><span className="getting-paid-illustration-orbit"/><span className="getting-paid-illustration-document"><i/><b/><em/><small/></span><span className="getting-paid-illustration-card"><CreditCard size={24}/><i/><i/></span><span className="getting-paid-illustration-check"><Check size={19}/></span></div>;
}

function UnsupportedDialog({ message, onClose, t }) {
  React.useEffect(() => {
    const close = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose]);
  return (
    <div className="getting-paid-modal-backdrop" onMouseDown={onClose} role="presentation">
      <div aria-modal="true" className="getting-paid-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <button aria-label="Close" onClick={onClose} type="button"><X size={18} /></button>
        {message ? (
          <div className="getting-paid-error" role="status">
            <strong>{message}</strong>
          </div>
        ) : (
          <AdminUnderDevelopmentContent t={t} />
        )}
      </div>
    </div>
  );
}

function SetupPage({ company, go, language, l, payment, unsupported }) {
  const cards = [
    { actions: [["payLinks", "Pay Links", "روابط الدفع"], ["invoices", "Invoices", "الفواتير"]], description: ["Share payment requests and send invoices.", "شارك طلبات الدفع وأرسل الفواتير."], icon: HandCoins, title: ["Request payments", "طلب المدفوعات"] },
    { actions: [["quotes", "Price Quotes", "عروض الأسعار"], ["proposals", "Proposals", "المقترحات"]], description: ["Prepare quotes and proposals for prospective clients.", "جهّز عروض الأسعار والمقترحات للعملاء المحتملين."], icon: BriefcaseBusiness, title: ["Win more clients", "اكسب المزيد من العملاء"] },
    { actions: [["pos", "POS Checkout", "نقطة البيع"]], description: ["Prepare an in-person checkout when POS support is available.", "جهّز دفعاً حضورياً عند توفر دعم نقطة البيع."], icon: ScanLine, title: ["Sell in person", "البيع حضورياً"] },
    { actions: [["products", "Products", "المنتجات"]], description: ["Manage real products and the connected storefront.", "أدر المنتجات الحقيقية وواجهة المتجر المتصلة."], icon: Store, title: ["Sell on your website", "البيع على موقعك"] },
  ];
  return <div className="getting-paid-setup-page"><section className="getting-paid-setup-hero"><div><span className="getting-paid-platform-label"><CreditCard size={18}/>{payment.configured ? bi(language, "Payment configuration", "إعداد الدفع") : l.notConnected}</span><h2>{bi(language, "Start accepting payments", "ابدأ قبول المدفوعات")}</h2><p>{bi(language, `Set up supported ways for ${company?.name || "your company"} to request and accept payment.`, `أعد طرقاً مدعومة لـ ${company?.name || "شركتك"} لطلب وقبول الدفع.`)}</p><button className="admin-primary-button" onClick={unsupported} type="button">{bi(language, "Connect Payment Method", "ربط وسيلة دفع")}</button><small>{payment.configured ? bi(language, "A payment configuration exists in company settings. Provider capabilities are shown only when verified.", "يوجد إعداد دفع في إعدادات الشركة. تظهر إمكانات المزود عند التحقق منها فقط.") : bi(language, "No payment provider or method is confirmed for this company.", "لا يوجد مزود أو وسيلة دفع مؤكدة لهذه الشركة.")}</small></div><div className="getting-paid-store-visual"><PaymentIllustration type="setup"/><div className="getting-paid-mini-store"><ShoppingBag size={25}/><strong>{company?.name || bi(language, "Your store", "متجرك")}</strong><i/><i/></div></div></section><section className="getting-paid-methods-section"><header><h2>{bi(language, "Choose the ways you want to get paid", "اختر الطرق التي تريد استلام المدفوعات بها")}</h2><p>{bi(language, "Open existing company tools or continue through an honest setup state.", "افتح أدوات الشركة الحالية أو تابع عبر حالة إعداد واضحة.")}</p></header><div>{cards.map((card) => <article key={card.title[0]}><span><card.icon size={25}/></span><h3>{bi(language, ...card.title)}</h3><p>{bi(language, ...card.description)}</p><div>{card.actions.map(([action, en, ar]) => <button key={action} onClick={() => go(action, unsupported)} type="button">{bi(language, en, ar)}<ChevronRight size={15}/></button>)}</div></article>)}</div></section></div>;
}

function PayLinksPage({ company, language, l, payment, unsupported }) {
  const currency = company?.settings?.currency || "—";
  return <div className="getting-paid-paylinks-page"><div className="getting-paid-setup-banner"><ShieldCheck size={20}/><span>{payment.configured ? bi(language, "Payment settings detected. Pay Links still require a supported backend.", "تم اكتشاف إعدادات دفع. ما زالت روابط الدفع تتطلب خدمة مدعومة.") : bi(language, "Payment setup is required before accepting money through links.", "يلزم إعداد الدفع قبل قبول الأموال عبر الروابط.")}</span><StatusPill>{payment.configured ? bi(language, "Configuration detected", "تم اكتشاف إعداد") : l.notConnected}</StatusPill></div><section className="getting-paid-paylinks-hero"><div className="getting-paid-onboarding-copy"><span className="getting-paid-platform-label"><Link2 size={18}/>{bi(language, "Pay Links", "روابط الدفع")}</span><h2>{bi(language, "Get paid with a simple link", "استلم المدفوعات برابط بسيط")}</h2><p>{bi(language, "Create a shareable checkout request after a supported Pay Links service is connected.", "أنشئ طلب دفع قابلاً للمشاركة بعد ربط خدمة روابط دفع مدعومة.")}</p><ul>{[[Smartphone, "Share anywhere", "شارك في أي مكان"], [CreditCard, "Offer supported checkout methods", "قدّم وسائل دفع مدعومة"], [BadgeCheck, `Use company currency: ${currency}`, `استخدم عملة الشركة: ${currency}`]].map(([Icon, en, ar]) => <li key={en}><span><Icon size={18}/></span>{bi(language, en, ar)}</li>)}</ul><div className="getting-paid-dual-actions"><button className="admin-primary-button" onClick={unsupported} type="button">{bi(language, "Create Link", "إنشاء رابط")}</button><button className="getting-paid-help-action" onClick={unsupported} type="button"><CircleHelp size={16}/>{l.help}</button></div></div><div className="getting-paid-paylink-visual"><PaymentIllustration type="link"/><div className="getting-paid-checkout-card"><Link2 size={21}/><strong>{company?.name || bi(language, "Payment request", "طلب دفع")}</strong><small>{currency}</small><i/><i/><button type="button">{bi(language, "Checkout preview", "معاينة الدفع")}</button></div></div></section></div>;
}

function formatInvoiceDate(value, language) {
  const raw = String(value || "").trim();
  if (!raw) return "—";
  const isoDate = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [year, month, day] = isoDate.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(language);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString(language);
}

function InvoiceEmptyState({ copy, onCreate, canManage }) {
  return (
    <section className="getting-paid-invoice-list">
      <div className="getting-paid-loading">
        <FileText size={35} />
        <h2>{copy.noInvoicesTitle}</h2>
        <p>{copy.noInvoicesText}</p>
        {canManage && (
        <button className="admin-primary-button" onClick={onCreate} type="button">
          <Plus size={16} />
          {copy.newInvoice}
        </button>
        )}
      </div>
    </section>
  );
}

function InvoiceList({ canManage, company, copy, filters, language, onCancelInvoice, onCreate, onEditInvoice, onFiltersChange, onMarkPaid, onUnsupported, onViewInvoice, onVoidInvoice, rows }) {
  return (
    <section className="getting-paid-invoice-list">
      <header>
        <div>
          <h2>{copy.recordsTitle}</h2>
          <p>{copy.recordsSubtitle}</p>
        </div>
        <StatusPill>{rows.length}</StatusPill>
      </header>
      <div className="getting-paid-invoice-toolbar getting-paid-dual-actions">
        <label>
          <Search size={16} />
          <input
            aria-label={copy.search}
            onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
            placeholder={copy.searchPlaceholder}
            type="search"
            value={filters.query}
          />
        </label>
        <select
          aria-label={copy.filterStatus}
          onChange={(event) => onFiltersChange({ ...filters, status: event.target.value })}
          value={filters.status}
        >
          {copy.filterOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {canManage && (
        <button className="admin-primary-button" onClick={onCreate} type="button">
          <Plus size={16} />
          {copy.newInvoice}
        </button>
        )}
      </div>
      {rows.length ? (
        <div className="admin-data-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>{copy.number}</th>
                <th>{copy.customer}</th>
                <th>{copy.issued}</th>
                <th>{copy.due}</th>
                <th>{copy.total}</th>
                <th>{copy.status}</th>
                <th className="admin-data-table-actions">{bi(language, "Actions", "الإجراءات")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const invoice = invoiceListRow(row, language);
                const editable = invoiceEditable(invoice.status);
                return (
                  <tr key={invoice.id || index}>
                    <td>{invoice.number || "—"}</td>
                    <td>{invoice.customer || "—"}</td>
                    <td>{formatInvoiceDate(invoice.issue_date, language)}</td>
                    <td>{formatInvoiceDate(invoice.due_date, language)}</td>
                    <td><bdi dir="ltr">{gettingPaidCurrency(invoice.total, company, language)}</bdi></td>
                    <td><StatusPill>{invoiceStatusLabel(language, invoice.status)}</StatusPill></td>
                    <td className="admin-data-table-actions">
                      <div className="getting-paid-dual-actions">
                        <button className="getting-paid-help-action" onClick={() => onViewInvoice(invoice.id)} type="button">
                          <Eye size={15} />
                          {copy.view}
                        </button>
                        {canManage && editable && (
                          <>
                            <button className="getting-paid-help-action" onClick={() => onEditInvoice(invoice.id)} type="button">
                              <Pencil size={15} />
                              {copy.edit}
                            </button>
                            {invoice.status !== "paid" && (
                              <button className="getting-paid-help-action" onClick={() => onMarkPaid(invoice.id, "paid")} type="button">
                                {copy.markPaid}
                              </button>
                            )}
                            {invoice.status === "paid" && (
                              <button className="getting-paid-help-action" onClick={() => onMarkPaid(invoice.id, "issued")} type="button">
                                {copy.markUnpaid}
                              </button>
                            )}
                            <button className="getting-paid-help-action" onClick={() => onCancelInvoice(invoice.id, invoice.number)} type="button">
                              {copy.cancelInvoice}
                            </button>
                            <button className="getting-paid-help-action" onClick={() => onVoidInvoice(invoice.id, invoice.number)} type="button">
                              {copy.voidInvoice}
                            </button>
                          </>
                        )}
                        <button className="getting-paid-help-action" onClick={() => onUnsupported("send")} type="button">{copy.send}</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="getting-paid-loading">
          <p>{copy.noMatches}</p>
          <button className="getting-paid-help-action" onClick={() => onFiltersChange({ query: "", status: "all" })} type="button">
            {copy.clearFilters}
          </button>
        </div>
      )}
    </section>
  );
}

function InvoiceConfirmDialog({ action, invoiceId, invoiceNumber, language, onClose, onStaleState, onSuccess }) {
  const copy = invoiceCopy(language);
  const isVoid = action === "void";
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const close = (event) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose, submitting]);

  async function handleConfirm() {
    setSubmitting(true);
    setError("");
    try {
      if (isVoid) {
        await voidInvoice(invoiceId);
      } else {
        await updateInvoice(invoiceId, { status: "cancelled" });
      }
      onSuccess();
    } catch (requestError) {
      if (requestError?.status === 400) onStaleState?.();
      setError(requestError?.message || copy.requestFailed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="getting-paid-modal-backdrop" onMouseDown={() => !submitting && onClose()} role="presentation">
      <div
        aria-labelledby="invoice-confirm-title"
        aria-modal="true"
        className="getting-paid-modal getting-paid-invoice-confirm"
        dir={gettingPaidDirection(language)}
        onMouseDown={(event) => event.stopPropagation()}
        role="alertdialog"
      >
        <h2 id="invoice-confirm-title">{isVoid ? copy.voidTitle : copy.cancelTitle}</h2>
        <p>{isVoid ? copy.voidMessage : copy.cancelMessage}</p>
        <p><strong>{copy.invoiceNumber}:</strong> {invoiceNumber || invoiceId}</p>
        {error && <div className="message-panel error" role="alert">{error}</div>}
        <footer className="getting-paid-dual-actions">
          <button className="secondary-action" disabled={submitting} onClick={onClose} type="button">{copy.back}</button>
          <button className="admin-primary-button" disabled={submitting} onClick={handleConfirm} type="button">
            {submitting && <LoaderCircle size={16} />}
            {submitting ? copy.processing : (isVoid ? copy.confirmVoid : copy.confirmCancel)}
          </button>
        </footer>
      </div>
    </div>
  );
}

function InvoiceDetailModal({
  canManage,
  company,
  invoiceId,
  language,
  onCancel,
  onClose,
  onEdit,
  onMarkPaid,
  onUnsupported,
  onVoid,
  refreshToken = 0,
}) {
  const copy = invoiceCopy(language);
  const [invoice, setInvoice] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [errorStatus, setErrorStatus] = React.useState(0);
  const requestRef = React.useRef(0);
  const editable = invoice ? invoiceEditable(invoice.status) : false;
  const lineItems = Array.isArray(invoice?.line_items) ? invoice.line_items : [];
  const detailSubtotal = Number.isFinite(Number(invoice?.subtotal))
    ? Number(invoice.subtotal)
    : computeInvoiceTotals(lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }))).subtotal;
  const detailTax = Number.isFinite(Number(invoice?.tax_total)) ? Number(invoice.tax_total) : 0;
  const detailDiscount = Number.isFinite(Number(invoice?.discount_total)) ? Number(invoice.discount_total) : 0;
  const detailTotal = Number.isFinite(Number(invoice?.total)) ? Number(invoice.total) : detailSubtotal;

  React.useEffect(() => {
    const close = (event) => {
      if (event.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [loading, onClose]);

  React.useEffect(() => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError("");
    setErrorStatus(0);
    fetchInvoice(invoiceId)
      .then((data) => {
        if (requestRef.current !== requestId) return;
        setInvoice(data);
        setLoading(false);
      })
      .catch((requestError) => {
        if (requestRef.current !== requestId) return;
        setInvoice(null);
        setErrorStatus(Number(requestError?.status) || 0);
        setError(requestError?.status === 404 ? copy.notFound : (requestError?.message || copy.requestFailed));
        setLoading(false);
      });
    return () => { requestRef.current += 1; };
  }, [copy.requestFailed, invoiceId, refreshToken]);

  return (
    <div className="getting-paid-modal-backdrop" onMouseDown={onClose} role="presentation">
      <div
        aria-labelledby="invoice-detail-title"
        aria-modal="true"
        className="getting-paid-modal getting-paid-invoice-detail"
        dir={gettingPaidDirection(language)}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button aria-label={copy.close} onClick={onClose} type="button"><X size={18} /></button>
        <header>
          <h2 id="invoice-detail-title">{copy.detailTitle}</h2>
          {invoice?.invoice_number && <p>{invoice.invoice_number}</p>}
        </header>
        {loading && (
          <div className="getting-paid-loading">
            <LoaderCircle size={22} />
            {copy.processing}
          </div>
        )}
        {error && (
          <div className="getting-paid-error" role="alert">
            <strong>{errorStatus === 404 ? copy.notFound : copy.loadFailed}</strong>
            <span>{error}</span>
          </div>
        )}
        {invoice && !loading && (
          <>
            <div className="getting-paid-invoice-form">
              <dl>
                <div><dt>{copy.invoiceNumber}</dt><dd>{invoice.invoice_number || invoice.id || "—"}</dd></div>
                <div><dt>{copy.statusLabel}</dt><dd><StatusPill>{invoiceStatusLabel(language, invoice.status)}</StatusPill></dd></div>
                <div><dt>{copy.issueDate}</dt><dd>{formatInvoiceDate(invoice.issue_date, language)}</dd></div>
                <div><dt>{copy.dueDate}</dt><dd>{formatInvoiceDate(invoice.due_date, language)}</dd></div>
                <div><dt>{copy.currency}</dt><dd>{invoice.currency || "—"}</dd></div>
                <div><dt>{copy.paymentStatus}</dt><dd><StatusPill>{invoiceStatusLabel(language, invoice.status)}</StatusPill></dd></div>
              </dl>
              <section>
                <h3>{copy.customerDetails}</h3>
                <dl>
                  <div><dt>{copy.customerName}</dt><dd>{invoice.customer_name || "—"}</dd></div>
                  <div><dt>{copy.emailLabel}</dt><dd>{invoice.customer_email || "—"}</dd></div>
                  <div><dt>{copy.phoneLabel}</dt><dd>{invoice.customer_phone || "—"}</dd></div>
                </dl>
              </section>
              {invoice.notes && (
                <section>
                  <h3>{copy.notesLabel}</h3>
                  <p>{invoice.notes}</p>
                </section>
              )}
              <section>
                <h3>{copy.lineItems}</h3>
                <div className="admin-data-table-wrap">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>{copy.itemDescription}</th>
                        <th>{copy.quantity}</th>
                        <th>{copy.price}</th>
                        <th>{copy.lineTotal}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.length ? lineItems.map((item, index) => (
                        <tr key={index}>
                          <td>{item.description || "—"}</td>
                          <td>{item.quantity ?? "—"}</td>
                          <td><bdi dir="ltr">{gettingPaidCurrency(item.unit_price, company, language)}</bdi></td>
                          <td><bdi dir="ltr">{gettingPaidCurrency(lineTotalValue(item), company, language)}</bdi></td>
                        </tr>
                      )) : (
                        <tr><td colSpan={4}>—</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <footer className="getting-paid-invoice-totals">
                  <div><span>{copy.subtotal}</span><strong><bdi dir="ltr">{gettingPaidCurrency(detailSubtotal, company, language)}</bdi></strong></div>
                  <div><span>{copy.discount}</span><strong><bdi dir="ltr">{gettingPaidCurrency(detailDiscount, company, language)}</bdi></strong></div>
                  <div><span>{copy.tax}</span><strong><bdi dir="ltr">{gettingPaidCurrency(detailTax, company, language)}</bdi></strong></div>
                  <div><span>{copy.totalLabel}</span><strong><bdi dir="ltr">{gettingPaidCurrency(detailTotal, company, language)}</bdi></strong></div>
                </footer>
              </section>
            </div>
            {!canManage && (
              <div className="message-panel warning" role="status">{copy.readOnly}</div>
            )}
            {canManage && !editable && (
              <div className="message-panel warning" role="status">
                {bi(language, "This invoice cannot be edited.", "لا يمكن تعديل هذه الفاتورة.")}
              </div>
            )}
            <footer className="getting-paid-dual-actions">
              {canManage && editable && (
                <>
                  <button className="admin-primary-button" onClick={() => onEdit(invoice.id)} type="button">
                    <Pencil size={16} />
                    {copy.edit}
                  </button>
                  {invoice.status !== "paid" && (
                    <button className="secondary-action" onClick={() => onMarkPaid(invoice.id, "paid")} type="button">{copy.markPaid}</button>
                  )}
                  {invoice.status === "paid" && (
                    <button className="secondary-action" onClick={() => onMarkPaid(invoice.id, "issued")} type="button">{copy.markUnpaid}</button>
                  )}
                  <button className="secondary-action" onClick={() => onCancel(invoice)} type="button">{copy.cancelInvoice}</button>
                  <button className="secondary-action" onClick={() => onVoid(invoice)} type="button">{copy.voidInvoice}</button>
                </>
              )}
              <button className="getting-paid-help-action" onClick={() => window.print()} type="button">{copy.print}</button>
              <button className="getting-paid-help-action" onClick={() => onUnsupported("send")} type="button">{copy.send}</button>
              <button className="getting-paid-help-action" onClick={() => onUnsupported("download")} type="button">{copy.download}</button>
              <button className="getting-paid-help-action" onClick={onClose} type="button">{copy.close}</button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function InvoiceFormModal({ company, invoiceId = null, language, mode = "create", onClose, onStaleState, onSuccess }) {
  const isEdit = mode === "edit";
  const copy = invoiceCopy(language);
  const [values, setValues] = React.useState(() => emptyInvoiceForm(company));
  const [selectedCustomerId, setSelectedCustomerId] = React.useState("");
  const [customers, setCustomers] = React.useState([]);
  const [customersLoading, setCustomersLoading] = React.useState(true);
  const [customersError, setCustomersError] = React.useState("");
  const [invoiceLoading, setInvoiceLoading] = React.useState(isEdit);
  const [editBlocked, setEditBlocked] = React.useState(false);
  const [formErrors, setFormErrors] = React.useState({});
  const [itemErrors, setItemErrors] = React.useState({});
  const [submitError, setSubmitError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const customerRequestRef = React.useRef(0);
  const invoiceRequestRef = React.useRef(0);
  const totals = computeInvoiceTotals(values.line_items);
  const statusOptions = isEdit ? copy.editStatusOptions : copy.statusOptions;
  const blockedMessage = bi(language, "This invoice cannot be edited.", "لا يمكن تعديل هذه الفاتورة.");

  React.useEffect(() => {
    const close = (event) => {
      if (event.key === "Escape" && !submitting && !invoiceLoading) onClose();
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [invoiceLoading, onClose, submitting]);

  React.useEffect(() => {
    if (!isEdit || !invoiceId) return undefined;
    const requestId = ++invoiceRequestRef.current;
    setInvoiceLoading(true);
    setEditBlocked(false);
    setSubmitError("");
    fetchInvoice(invoiceId)
      .then((data) => {
        if (invoiceRequestRef.current !== requestId) return;
        if (!invoiceEditable(data.status)) setEditBlocked(true);
        setValues(invoiceToForm(data, company));
        setInvoiceLoading(false);
      })
      .catch((error) => {
        if (invoiceRequestRef.current !== requestId) return;
        setSubmitError(error?.message || copy.requestFailed);
        setInvoiceLoading(false);
      });
    return () => { invoiceRequestRef.current += 1; };
  }, [company, copy.requestFailed, invoiceId, isEdit]);

  React.useEffect(() => {
    const requestId = ++customerRequestRef.current;
    setCustomersLoading(true);
    setCustomersError("");
    fetchCustomers({ limit: 100 })
      .then((data) => {
        if (customerRequestRef.current !== requestId) return;
        setCustomers(Array.isArray(data) ? data : []);
        setCustomersLoading(false);
      })
      .catch((error) => {
        if (customerRequestRef.current !== requestId) return;
        setCustomers([]);
        setCustomersError(error?.message || copy.requestFailed);
        setCustomersLoading(false);
      });
    return () => { customerRequestRef.current += 1; };
  }, [copy.requestFailed]);

  function updateField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: "" }));
    setSubmitError("");
  }

  function updateLineItem(index, field, value) {
    setValues((current) => ({
      ...current,
      line_items: current.line_items.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      )),
    }));
    setItemErrors((current) => {
      const next = { ...current };
      if (next[index]) {
        next[index] = { ...next[index], [field]: "" };
        if (!Object.values(next[index]).some(Boolean)) delete next[index];
      }
      return next;
    });
    setFormErrors((current) => ({ ...current, line_items: "" }));
    setSubmitError("");
  }

  function addLineItem() {
    if (values.line_items.length >= INVOICE_LINE_ITEM_LIMIT) return;
    setValues((current) => ({
      ...current,
      line_items: [...current.line_items, { description: "", quantity: "1", unit_price: "" }],
    }));
  }

  function removeLineItem(index) {
    setValues((current) => ({
      ...current,
      line_items: current.line_items.length > 1
        ? current.line_items.filter((_, itemIndex) => itemIndex !== index)
        : current.line_items,
    }));
    setItemErrors({});
    setFormErrors((current) => ({ ...current, line_items: "" }));
  }

  function handleCustomerSelect(event) {
    const customerId = event.target.value;
    setSelectedCustomerId(customerId);
    if (!customerId) return;
    const customer = customers.find((row) => String(row.id) === customerId);
    if (!customer) return;
    setValues((current) => ({
      ...current,
      customer_name: customerDisplayName(customer),
      customer_email: customer.email || "",
      customer_phone: customer.phone || "",
    }));
    setFormErrors((current) => ({
      ...current,
      customer_name: "",
      customer_email: "",
      customer_phone: "",
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (editBlocked) {
      setSubmitError(blockedMessage);
      return;
    }
    const allowedStatuses = statusOptions.map((option) => option.value);
    if (!allowedStatuses.includes(values.status)) {
      setSubmitError(bi(language, "Choose a valid invoice status.", "اختر حالة فاتورة صالحة."));
      return;
    }
    const validation = validateInvoiceForm(values, copy);
    setFormErrors(validation.errors);
    setItemErrors(validation.itemErrors);
    if (Object.keys(validation.errors).length || Object.keys(validation.itemErrors).length) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      if (isEdit) {
        await updateInvoice(invoiceId, buildInvoicePayload(values));
      } else {
        await createInvoice(buildInvoicePayload(values));
      }
      onSuccess();
    } catch (error) {
      if (isEdit && error?.status === 400) onStaleState?.();
      setSubmitError(error?.message || copy.requestFailed);
    } finally {
      setSubmitting(false);
    }
  }

  if (invoiceLoading) {
    return (
      <div className="getting-paid-modal-backdrop" role="presentation">
        <div aria-modal="true" className="getting-paid-modal getting-paid-invoice-modal" dir={gettingPaidDirection(language)} role="dialog">
          <div className="getting-paid-loading">
            <LoaderCircle size={22} />
            {copy.processing}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="getting-paid-modal-backdrop" onMouseDown={() => !submitting && onClose()} role="presentation">
      <form
        aria-labelledby="invoice-form-title"
        aria-modal="true"
        className="getting-paid-modal getting-paid-invoice-modal"
        dir={gettingPaidDirection(language)}
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
      >
        <button aria-label={copy.close} disabled={submitting} onClick={onClose} type="button"><X size={18} /></button>
        <header>
          <h2 id="invoice-form-title">{isEdit ? copy.editTitle : copy.createTitle}</h2>
          <p>{copy.formSubtitle}</p>
        </header>
        {editBlocked && <div className="message-panel warning" role="status">{blockedMessage}</div>}
        {submitError && <div className="message-panel error" role="alert">{submitError}</div>}
        {customersError && (
          <div className="message-panel warning" role="status">
            {bi(language, "Customers could not be loaded. You can still enter details manually.", "تعذر تحميل العملاء. ما زال بإمكانك إدخال البيانات يدوياً.")}
            {customersError ? ` ${customersError}` : ""}
          </div>
        )}
        <div className="getting-paid-invoice-form">
          <label>
            <span>{copy.customerDetails}</span>
            {customersLoading ? (
              <span className="getting-paid-invoice-customer-loading"><LoaderCircle size={16} /> {copy.processing}</span>
            ) : (
              <select aria-label={copy.customerDetails} disabled={editBlocked || submitting} onChange={handleCustomerSelect} value={selectedCustomerId}>
                <option value="">{bi(language, "Manual entry", "إدخال يدوي")}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customerDisplayName(customer)}</option>
                ))}
              </select>
            )}
          </label>
          <label>
            <span>{copy.customerName}</span>
            <input disabled={editBlocked || submitting} onChange={(event) => updateField("customer_name", event.target.value)} value={values.customer_name} />
            {formErrors.customer_name && <small role="alert">{formErrors.customer_name}</small>}
          </label>
          <label>
            <span>{copy.customerEmail}</span>
            <input disabled={editBlocked || submitting} onChange={(event) => updateField("customer_email", event.target.value)} type="email" value={values.customer_email} />
            {formErrors.customer_email && <small role="alert">{formErrors.customer_email}</small>}
          </label>
          <label>
            <span>{copy.customerPhone}</span>
            <input disabled={editBlocked || submitting} onChange={(event) => updateField("customer_phone", event.target.value)} value={values.customer_phone} />
          </label>
          <label>
            <span>{copy.statusLabel}</span>
            <select disabled={editBlocked || submitting} onChange={(event) => updateField("status", event.target.value)} value={values.status}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{copy.issueDate}</span>
            <input disabled={editBlocked || submitting} onChange={(event) => updateField("issue_date", event.target.value)} type="date" value={values.issue_date} />
          </label>
          <label>
            <span>{copy.dueDate}</span>
            <input disabled={editBlocked || submitting} onChange={(event) => updateField("due_date", event.target.value)} type="date" value={values.due_date} />
          </label>
          <label>
            <span>{copy.currency}</span>
            <input disabled={editBlocked || submitting} onChange={(event) => updateField("currency", event.target.value.toUpperCase())} value={values.currency} />
          </label>
          <label>
            <span>{copy.notes}</span>
            <textarea disabled={editBlocked || submitting} onChange={(event) => updateField("notes", event.target.value)} rows={3} value={values.notes} />
          </label>
          <section>
            <header className="getting-paid-dual-actions">
              <h3>{copy.lineItems}</h3>
              <button
                className="secondary-action"
                disabled={editBlocked || submitting || values.line_items.length >= INVOICE_LINE_ITEM_LIMIT}
                onClick={addLineItem}
                type="button"
              >
                <Plus size={16} />
                {copy.addItem}
              </button>
            </header>
            {formErrors.line_items && <div className="message-panel error" role="alert">{formErrors.line_items}</div>}
            <div className="admin-data-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>{copy.itemDescription}</th>
                    <th>{copy.quantity}</th>
                    <th>{copy.price}</th>
                    <th>{copy.lineTotal}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {values.line_items.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          aria-label={copy.itemDescription}
                          disabled={editBlocked || submitting}
                          onChange={(event) => updateLineItem(index, "description", event.target.value)}
                          value={item.description}
                        />
                        {itemErrors[index]?.description && <small role="alert">{itemErrors[index].description}</small>}
                      </td>
                      <td>
                        <input
                          aria-label={copy.quantity}
                          disabled={editBlocked || submitting}
                          min="0"
                          onChange={(event) => updateLineItem(index, "quantity", event.target.value)}
                          step="any"
                          type="number"
                          value={item.quantity}
                        />
                        {itemErrors[index]?.quantity && <small role="alert">{itemErrors[index].quantity}</small>}
                      </td>
                      <td>
                        <input
                          aria-label={copy.price}
                          disabled={editBlocked || submitting}
                          min="0"
                          onChange={(event) => updateLineItem(index, "unit_price", event.target.value)}
                          step="any"
                          type="number"
                          value={item.unit_price}
                        />
                        {itemErrors[index]?.unit_price && <small role="alert">{itemErrors[index].unit_price}</small>}
                      </td>
                      <td><bdi dir="ltr">{gettingPaidCurrency(lineTotalValue(item), company, language)}</bdi></td>
                      <td>
                        <button
                          aria-label={copy.removeItem}
                          className="getting-paid-help-action"
                          disabled={editBlocked || submitting || values.line_items.length <= 1}
                          onClick={() => removeLineItem(index)}
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="getting-paid-invoice-totals">
              <div><span>{copy.subtotal}</span><strong><bdi dir="ltr">{gettingPaidCurrency(totals.subtotal, company, language)}</bdi></strong></div>
              <div><span>{copy.totalLabel}</span><strong><bdi dir="ltr">{gettingPaidCurrency(totals.total, company, language)}</bdi></strong></div>
            </footer>
          </section>
        </div>
        <footer className="getting-paid-dual-actions">
          <button className="secondary-action" disabled={submitting} onClick={onClose} type="button">{copy.cancel}</button>
          <button className="admin-primary-button" disabled={editBlocked || submitting} type="submit">
            {submitting && <LoaderCircle size={16} />}
            {submitting ? copy.saving : (isEdit ? copy.save : copy.create)}
          </button>
        </footer>
      </form>
    </div>
  );
}

function InvoicesPage({
  canManage,
  company,
  language,
  notice,
  noticeError,
  onCancelInvoice,
  onCreate,
  onDismissNotice,
  onEditInvoice,
  onMarkPaid,
  onRetry,
  onUnsupported,
  onViewInvoice,
  onVoidInvoice,
  state,
}) {
  const copy = invoiceCopy(language);
  const [filters, setFilters] = React.useState({ query: "", status: "all" });
  const filteredRows = filterInvoiceRows(state.rows, filters);
  const content = (() => {
    if (state.loading) {
      return (
        <section className="getting-paid-loading">
          <LoaderCircle size={22} />
          {copy.loading}
        </section>
      );
    }
    if (state.forbidden) {
      return (
        <section className="getting-paid-access-denied" role="alert">
          <ShieldCheck size={35} />
          <h2>{copy.forbidden}</h2>
        </section>
      );
    }
    if (state.error) {
      return (
        <section className="getting-paid-error" role="alert">
          <strong>{copy.loadFailed}</strong>
          <span>{state.error}</span>
          <button className="admin-primary-button" onClick={onRetry} type="button">{copy.retry}</button>
        </section>
      );
    }
    if (!state.rows.length) return <InvoiceEmptyState canManage={canManage} copy={copy} onCreate={onCreate} />;
    return (
      <InvoiceList
        canManage={canManage}
        company={company}
        copy={copy}
        filters={filters}
        language={language}
        onCancelInvoice={onCancelInvoice}
        onCreate={onCreate}
        onEditInvoice={onEditInvoice}
        onFiltersChange={setFilters}
        onMarkPaid={onMarkPaid}
        onUnsupported={onUnsupported}
        onViewInvoice={onViewInvoice}
        onVoidInvoice={onVoidInvoice}
        rows={filteredRows}
      />
    );
  })();
  return (
    <>
      {canManage === false && !state.loading && !state.forbidden && !state.error && (
        <div className="message-panel warning" role="status">{copy.readOnly}</div>
      )}
      {notice && (
        <div className={`message-panel ${noticeError ? "error" : "success"}`} role={noticeError ? "alert" : "status"}>
          <span>{notice}</span>
          <button aria-label={copy.close} className="getting-paid-help-action" onClick={onDismissNotice} type="button">
            <X size={15} />
          </button>
        </div>
      )}
      {content}
    </>
  );
}

function QuotesPage({ language, l, unsupported }) {
  return <section className="getting-paid-quotes-hero"><div className="getting-paid-onboarding-copy"><span className="getting-paid-platform-label"><FileCheck2 size={18}/>{bi(language, "Price Quotes", "عروض الأسعار")}</span><h2>{bi(language, "Create quotes that move work forward", "أنشئ عروضاً تدفع العمل إلى الأمام")}</h2><p>{bi(language, "Prepare clear pricing documents after a supported quote workflow is connected.", "جهّز مستندات تسعير واضحة بعد ربط مسار عروض مدعوم.")}</p><ul>{[[Package, "Add real products when supported", "أضف منتجات حقيقية عند الدعم"], [Users, "Use verified customer details", "استخدم بيانات عملاء موثقة"], [FileSignature, "Track acceptance only from real records", "تتبع القبول من سجلات حقيقية فقط"]].map(([Icon, en, ar]) => <li key={en}><span><Icon size={18}/></span>{bi(language, en, ar)}</li>)}</ul><div className="getting-paid-dual-actions"><button className="admin-primary-button" onClick={unsupported} type="button">{bi(language, "Create Price Quote", "إنشاء عرض سعر")}</button><button className="getting-paid-help-action" onClick={unsupported} type="button"><CircleHelp size={16}/>{l.help}</button></div></div><div className="getting-paid-quote-visual"><PaymentIllustration type="quote"/><div className="getting-paid-quote-document"><FileCheck2 size={27}/><strong>{bi(language, "Quote preview", "معاينة العرض")}</strong><i/><i/><i/><span><Check size={15}/>{l.available}</span></div></div></section>;
}

function ProposalsPage({ language, l, unsupported }) {
  return <div className="getting-paid-proposals-page"><div className="getting-paid-setup-banner"><Sparkles size={20}/><span>{bi(language, "Proposal creation and AI assistance are not connected.", "إنشاء المقترحات ومساعدة الذكاء غير متصلين.")}</span><StatusPill>{l.available}</StatusPill></div><section className="getting-paid-proposals-hero"><div className="getting-paid-onboarding-copy"><span className="getting-paid-platform-label"><FileSignature size={18}/>{bi(language, "Proposals", "المقترحات")}</span><h2>{bi(language, "Present your next project beautifully", "قدّم مشروعك القادم بصورة احترافية")}</h2><p>{bi(language, "Build proposals with payment schedules and signatures only when supported services are available.", "أنشئ مقترحات بجداول دفع وتوقيعات فقط عند توفر خدمات مدعومة.")}</p><ul>{[[PenTool, "Flexible document layout", "تخطيط مستند مرن"], [Banknote, "Payment schedule when supported", "جدول دفع عند الدعم"], [FileSignature, "Verified signatures only", "توقيعات موثقة فقط"]].map(([Icon, en, ar]) => <li key={en}><span><Icon size={18}/></span>{bi(language, en, ar)}</li>)}</ul><div className="getting-paid-dual-actions"><button className="admin-primary-button" onClick={unsupported} type="button">{bi(language, "Create Proposal", "إنشاء مقترح")}</button><button className="secondary-action" onClick={unsupported} type="button"><WandSparkles size={16}/>{bi(language, "Create with AI", "إنشاء بالذكاء")}</button><button className="getting-paid-help-action" onClick={unsupported} type="button"><CircleHelp size={16}/>{l.help}</button></div></div><div className="getting-paid-proposal-visual"><div className="getting-paid-proposal-document"><FileSignature size={26}/><strong>{bi(language, "Proposal", "مقترح")}</strong><i/><i/><div><Banknote size={17}/><span>{bi(language, "Payment schedule", "جدول الدفع")}</span><StatusPill>{l.available}</StatusPill></div><div><PenTool size={17}/><span>{bi(language, "Signature", "التوقيع")}</span><StatusPill>{l.available}</StatusPill></div></div></div></section></div>;
}

function PosPage({ company, language, l, products, unsupported }) {
  const currency = company?.settings?.currency || "—";
  return <section className="getting-paid-pos-hero"><div className="getting-paid-onboarding-copy"><span className="getting-paid-platform-label"><ScanLine size={18}/>{bi(language, "Point of Sale", "نقطة البيع")}</span><h2>{bi(language, "Bring checkout to your customers", "قدّم الدفع مباشرة لعملائك")}</h2><p>{bi(language, "Prepare an in-person checkout after a supported POS service and hardware configuration are verified.", "جهّز دفعاً حضورياً بعد التحقق من خدمة نقطة بيع وإعداد أجهزة مدعومين.")}</p><ul>{[[ShoppingBag, `${products.length} real products currently loaded`, `${products.length} منتجاً حقيقياً محملاً حالياً`], [CreditCard, "Payment methods require verification", "وسائل الدفع تتطلب التحقق"], [Store, "Hardware and locations are not connected", "الأجهزة والمواقع غير متصلة"]].map(([Icon, en, ar]) => <li key={en}><span><Icon size={18}/></span>{bi(language, en, ar)}</li>)}</ul><div className="getting-paid-dual-actions"><button className="admin-primary-button" onClick={unsupported} type="button">{bi(language, "Set up Point of Sale", "إعداد نقطة البيع")}</button><button className="getting-paid-help-action" onClick={unsupported} type="button"><CircleHelp size={16}/>{l.help}</button></div></div><div className="getting-paid-pos-visual"><div className="getting-paid-pos-terminal"><header><ShoppingBag size={21}/><strong>{bi(language, "Cart preview", "معاينة السلة")}</strong><StatusPill>{l.available}</StatusPill></header><div className="getting-paid-pos-lines"><i/><i/><i/></div><footer><span>{bi(language, "Currency", "العملة")}</span><strong>{currency}</strong></footer><div className="getting-paid-pos-methods"><button type="button"><CreditCard size={18}/>{bi(language, "Card", "بطاقة")}</button><button type="button"><Banknote size={18}/>{bi(language, "Cash", "نقداً")}</button></div></div><div className="getting-paid-pos-phone"><Smartphone size={48}/><span>{bi(language, "Checkout illustration", "رسم توضيحي للدفع")}</span></div></div></section>;
}

export default function AdminGettingPaidPage({ activePage, company, currentUser, language = "en", modules = [], onNavigate, products = [], t, ...layout }) {
  const [unsupportedKind, setUnsupportedKind] = React.useState("");
  const [invoiceState, setInvoiceState] = React.useState({ error: "", forbidden: false, loading: activePage === "admin-invoices", rows: [] });
  const [invoiceModal, setInvoiceModal] = React.useState(null);
  const [invoiceNotice, setInvoiceNotice] = React.useState("");
  const [invoiceNoticeError, setInvoiceNoticeError] = React.useState(false);
  const [invoiceDetailId, setInvoiceDetailId] = React.useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState(null);
  const [detailRefreshToken, setDetailRefreshToken] = React.useState(0);
  const [confirmDialog, setConfirmDialog] = React.useState(null);
  const invoiceRequestRef = React.useRef(0);
  const l = labels(language);
  const meta = pageMeta[activePage] || pageMeta["admin-tenant-placeholder-getting-paid-setup"];
  const title = language === "ar" ? meta[2] : meta[0];
  const description = language === "ar" ? meta[3] : meta[1];
  const unsupported = () => setUnsupportedKind("generic");
  const openInvoiceUnsupported = React.useCallback((kind = "generic") => {
    setUnsupportedKind(kind || "generic");
  }, []);
  const payment = confirmedPaymentConfiguration(company);
  const canView = canViewGettingPaid(currentUser, company, modules, activePage);
  const canManageInvoices = canUseInvoiceAction(currentUser, "invoices.manage");
  const requestFailed = invoiceCopy(language).requestFailed;
  const go = (action, fallback = unsupported) => {
    const page = resolveGettingPaidDestination(action, { currentUser, modules });
    if (page) onNavigate(page); else fallback();
  };
  const setNotice = React.useCallback((text, isError = false) => {
    setInvoiceNotice(text);
    setInvoiceNoticeError(isError);
  }, []);
  const openCreateInvoice = React.useCallback(() => {
    if (!canManageInvoices) return;
    setInvoiceModal("create");
  }, [canManageInvoices]);
  const closeInvoiceForm = React.useCallback(() => {
    setInvoiceModal(null);
    setSelectedInvoiceId(null);
  }, []);
  const openViewInvoice = React.useCallback((invoiceId) => {
    setInvoiceDetailId(invoiceId);
  }, []);
  const closeDetailInvoice = React.useCallback(() => {
    setInvoiceDetailId(null);
  }, []);
  const openEditInvoice = React.useCallback((invoiceId) => {
    if (!canManageInvoices) return;
    setSelectedInvoiceId(invoiceId);
    setInvoiceDetailId(null);
    setInvoiceModal("edit");
  }, [canManageInvoices]);
  const reloadInvoices = React.useCallback(() => {
    const requestId = ++invoiceRequestRef.current;
    setInvoiceState({ error: "", forbidden: false, loading: true, rows: [] });
    fetchInvoices()
      .then((data) => {
        if (invoiceRequestRef.current !== requestId) return;
        setInvoiceState({ error: "", forbidden: false, loading: false, rows: normalizeInvoiceRows(data) });
      })
      .catch((error) => {
        if (invoiceRequestRef.current !== requestId) return;
        const forbidden = error?.status === 403;
        setInvoiceState({
          error: forbidden ? "" : (error?.message || requestFailed),
          forbidden,
          loading: false,
          rows: [],
        });
      });
  }, [requestFailed]);
  const handleInvoiceStaleState = React.useCallback(() => {
    reloadInvoices();
    setDetailRefreshToken((value) => value + 1);
  }, [reloadInvoices]);
  const openCancelConfirm = React.useCallback((invoiceId, invoiceNumber) => {
    if (!canManageInvoices) return;
    setConfirmDialog({ action: "cancel", invoiceId, invoiceNumber });
  }, [canManageInvoices]);
  const openVoidConfirm = React.useCallback((invoiceId, invoiceNumber) => {
    if (!canManageInvoices) return;
    setConfirmDialog({ action: "void", invoiceId, invoiceNumber });
  }, [canManageInvoices]);
  const closeConfirmDialog = React.useCallback(() => {
    setConfirmDialog(null);
  }, []);
  const handleConfirmSuccess = React.useCallback((action, invoiceId) => {
    setConfirmDialog(null);
    if (invoiceDetailId === invoiceId) setInvoiceDetailId(null);
    setNotice(invoiceCopy(language)[action === "void" ? "voidedNotice" : "cancelledNotice"]);
    reloadInvoices();
  }, [invoiceDetailId, language, reloadInvoices, setNotice]);
  const handleCreateSuccess = React.useCallback(() => {
    setInvoiceModal(null);
    setSelectedInvoiceId(null);
    setNotice(invoiceCopy(language).createdNotice);
    reloadInvoices();
  }, [language, reloadInvoices, setNotice]);
  const handleEditSuccess = React.useCallback(() => {
    setInvoiceModal(null);
    setSelectedInvoiceId(null);
    setNotice(invoiceCopy(language).savedNotice);
    reloadInvoices();
  }, [language, reloadInvoices, setNotice]);
  const handleMarkPaid = React.useCallback(async (invoiceId, status) => {
    if (!canManageInvoices) return;
    try {
      await updateInvoice(invoiceId, { status });
      const copy = invoiceCopy(language);
      setNotice(status === "paid" ? copy.paidNotice : copy.unpaidNotice);
      setDetailRefreshToken((value) => value + 1);
      reloadInvoices();
    } catch (error) {
      if (error?.status === 400) handleInvoiceStaleState();
      setNotice(error?.message || invoiceCopy(language).requestFailed, true);
    }
  }, [canManageInvoices, handleInvoiceStaleState, language, reloadInvoices, setNotice]);

  React.useEffect(() => {
    if (activePage !== "admin-invoices" || !canView) return undefined;
    reloadInvoices();
    return () => { invoiceRequestRef.current += 1; };
  }, [activePage, canView, company?.id, reloadInvoices]);

  function content() {
    if (!canView) return <section className="getting-paid-access-denied"><ShieldCheck size={35}/><h2>{bi(language, "Access denied", "الوصول مرفوض")}</h2></section>;
    switch (activePage) {
      case "admin-tenant-placeholder-getting-paid-setup": return <SetupPage company={company} go={go} language={language} l={l} payment={payment} unsupported={unsupported}/>;
      case "admin-tenant-placeholder-getting-paid-pay-links": return <PayLinksPage company={company} language={language} l={l} payment={payment} unsupported={unsupported}/>;
      case "admin-invoices": return (
        <InvoicesPage
          canManage={canManageInvoices}
          company={company}
          language={language}
          notice={invoiceNotice}
          noticeError={invoiceNoticeError}
          onCancelInvoice={openCancelConfirm}
          onCreate={openCreateInvoice}
          onDismissNotice={() => { setInvoiceNotice(""); setInvoiceNoticeError(false); }}
          onEditInvoice={openEditInvoice}
          onMarkPaid={handleMarkPaid}
          onRetry={reloadInvoices}
          onUnsupported={openInvoiceUnsupported}
          onViewInvoice={openViewInvoice}
          onVoidInvoice={openVoidConfirm}
          state={invoiceState}
        />
      );
      case "admin-tenant-placeholder-getting-paid-quotes": return <QuotesPage language={language} l={l} unsupported={unsupported}/>;
      case "admin-tenant-placeholder-getting-paid-proposals": return <ProposalsPage language={language} l={l} unsupported={unsupported}/>;
      case "admin-tenant-placeholder-getting-paid-pos": return <PosPage company={company} language={language} l={l} products={products} unsupported={unsupported}/>;
      default: return null;
    }
  }

  const unsupportedMessage = unsupportedKind === "send"
    ? invoiceCopy(language).sendUnsupported
    : unsupportedKind === "download"
      ? invoiceCopy(language).downloadUnsupported
      : "";

  return <AdminLayout activePage={activePage} company={company} currentUser={currentUser} hideHeader language={language} modules={modules} onNavigate={onNavigate} subtitle={description} t={t} title={title} {...layout}><div className="tenant-getting-paid-page" data-getting-paid-direction={gettingPaidDirection(language)} dir={gettingPaidDirection(language)}><PageHeader description={description} title={title}/>{content()}</div>{invoiceModal === "create" && canManageInvoices && <InvoiceFormModal company={company} key="create-invoice" language={language} mode="create" onClose={closeInvoiceForm} onSuccess={handleCreateSuccess} />}{invoiceModal === "edit" && selectedInvoiceId && canManageInvoices && <InvoiceFormModal company={company} invoiceId={selectedInvoiceId} key={`edit-invoice-${selectedInvoiceId}`} language={language} mode="edit" onClose={closeInvoiceForm} onStaleState={handleInvoiceStaleState} onSuccess={handleEditSuccess} />}{invoiceDetailId && <InvoiceDetailModal canManage={canManageInvoices} company={company} invoiceId={invoiceDetailId} key={`detail-invoice-${invoiceDetailId}`} language={language} onCancel={(invoice) => openCancelConfirm(invoice.id, invoice.invoice_number || invoice.id)} onClose={closeDetailInvoice} onEdit={openEditInvoice} onMarkPaid={handleMarkPaid} onUnsupported={openInvoiceUnsupported} onVoid={(invoice) => openVoidConfirm(invoice.id, invoice.invoice_number || invoice.id)} refreshToken={detailRefreshToken} />}{confirmDialog && <InvoiceConfirmDialog action={confirmDialog.action} invoiceId={confirmDialog.invoiceId} invoiceNumber={confirmDialog.invoiceNumber} key={`confirm-${confirmDialog.action}-${confirmDialog.invoiceId}`} language={language} onClose={closeConfirmDialog} onStaleState={handleInvoiceStaleState} onSuccess={() => handleConfirmSuccess(confirmDialog.action, confirmDialog.invoiceId)} />}{unsupportedKind && <UnsupportedDialog message={unsupportedMessage} onClose={() => setUnsupportedKind("")} t={t}/>}</AdminLayout>;
}
