import React from "react";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  CreditCard,
  Eye,
  Filter,
  Gift,
  LineChart,
  PackageOpen,
  Plus,
  ReceiptText,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  ShoppingCart,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import AdminOrdersTable from "../components/AdminOrdersTable.jsx";
import { AdminUnderDevelopmentContent } from "./AdminPlaceholderPage.jsx";
import {
  buildCostProfitSummary,
  buildOrderMetrics,
  buildPaymentRows,
  buildReceiptRows,
  buildSalesAnalytics,
  canUseSalesAction,
  canonicalOrderStatus,
  filterSalesOrders,
  formatCompanyCurrency,
  ORDER_STATUSES,
  orderStatusLabel,
  salesDirection,
} from "../utils/sales.js";
import { moduleAllowsPage } from "../utils/moduleRegistry.js";

const pageCopy = {
  "admin-orders": ["Orders", "Track, manage, and create orders for this company.", "الطلبات", "تتبّع طلبات هذه الشركة وإدارتها وإنشاؤها."],
  "admin-tenant-placeholder-sales-subscriptions": ["Subscriptions", "Manage recurring orders and customer subscriptions.", "الاشتراكات", "إدارة الطلبات المتكررة واشتراكات العملاء."],
  "admin-tenant-placeholder-sales-gift-card-sales": ["Gift Card Sales", "Review gift-card sales when gift cards are available.", "مبيعات بطاقات الهدايا", "راجع مبيعات بطاقات الهدايا عند توفرها."],
  "admin-tenant-placeholder-sales-payments-all": ["All Payments", "Review payment information recorded with company orders.", "كل المدفوعات", "راجع معلومات الدفع المسجلة مع طلبات الشركة."],
  "admin-tenant-placeholder-sales-payments-receipts": ["Receipts", "View receipts generated for company orders.", "الإيصالات", "اعرض الإيصالات المنشأة لطلبات الشركة."],
  "admin-tenant-placeholder-sales-analytics-overview": ["Sales Overview", "Understand sales performance from existing orders.", "نظرة عامة على المبيعات", "تعرّف على أداء المبيعات من الطلبات الحالية."],
  "admin-tenant-placeholder-sales-analytics-subscriptions": ["Subscriptions Analytics", "Review subscription performance when subscription data is available.", "تحليلات الاشتراكات", "راجع أداء الاشتراكات عند توفر بياناتها."],
  "admin-tenant-placeholder-sales-abandoned-carts": ["Abandoned Carts", "Recover incomplete checkouts when cart tracking is available.", "السلات المتروكة", "استعد عمليات الشراء غير المكتملة عند توفر تتبع السلات."],
};

function labelsFor(language) {
  const ar = language === "ar";
  return ar ? {
    addOrder: "إضافة طلب جديد", allStatuses: "كل الحالات", amount: "المبلغ", analytics: "عرض التحليلات", average: "متوسط قيمة الطلب", cancel: "إلغاء", comparison: "مقارنة بالفترة السابقة", costUnavailable: "التكلفة غير متوفرة", countableNote: "تُحسب المقاييس من الطلبات المحتسبة فقط (تُستبعد الملغاة والمستردة والفارغة).", customer: "العميل", date: "التاريخ", dateRange: "كل الفترات", delivery: "التوصيل", dismiss: "إخفاء", emptyDescription: "ستظهر البيانات هنا عند توفر سجلات حقيقية لهذه الشركة.", emptyTitle: "لا توجد بيانات حتى الآن", filters: "تصفية", finalTotal: "الإجمالي النهائي", items: "عنصر", learnMore: "معرفة المزيد", managePayments: "إدارة طرق الدفع", manageView: "إدارة العرض", monthlySales: "المبيعات الشهرية", moreActions: "إجراءات أخرى", orderReference: "مرجع الطلب", orders: "الطلبات", paymentMethod: "طريقة الدفع", product: "المنتج", quantity: "الكمية", receiptSettings: "إعدادات الإيصالات", search: "بحث", sales: "المبيعات", saveOrder: "إنشاء الطلب", status: "الحالة", subscriptionSettings: "إعدادات الاشتراك", totalCustomers: "العملاء", unsupported: "هذه الميزة قيد التطوير", view: "طريقة العرض",
  } : {
    addOrder: "Add New Order", allStatuses: "All statuses", amount: "Amount", analytics: "View Analytics", average: "Average order value", cancel: "Cancel", comparison: "Compared with previous period", costUnavailable: "Cost unavailable", countableNote: "Metrics use countable orders only (cancelled, refunded and voided orders are excluded).", customer: "Customer", date: "Date", dateRange: "All time", delivery: "Delivery", dismiss: "Dismiss", emptyDescription: "Real company records will appear here when they become available.", emptyTitle: "No data yet", filters: "Filter", finalTotal: "Final total", items: "items", learnMore: "Learn More", managePayments: "Manage Payment Methods", manageView: "Manage View", monthlySales: "Monthly sales", moreActions: "More Actions", orderReference: "Order reference", orders: "Orders", paymentMethod: "Payment method", product: "Product", quantity: "Quantity", receiptSettings: "Receipt Settings", search: "Search", sales: "Sales", saveOrder: "Create order", status: "Status", subscriptionSettings: "Subscription Settings", totalCustomers: "Customers", unsupported: "This feature is under development", view: "View",
  };
}

function localizedName(product, language) {
  if (typeof product?.name === "string") return product.name;
  return product?.name?.[language] || product?.name?.en || product?.name?.ar || product?.sku || product?.slug || "";
}

function productPrice(product) {
  const variant = product?.variants?.[0];
  const size = product?.sizes?.[0];
  return Number(variant?.price ?? size?.price ?? product?.price ?? 0) || 0;
}

function currencyFormatter(company, language) {
  return (value) => formatCompanyCurrency(value, company, language);
}

function SalesIllustration({ type = "empty" }) {
  return <svg aria-hidden="true" className={`sales-illustration sales-illustration-${type}`} viewBox="0 0 240 150">
    <rect className="sales-illustration-back" height="116" rx="14" width="190" x="25" y="18" />
    <rect className="sales-illustration-sheet" height="82" rx="8" width="132" x="54" y="42" />
    {type === "gift" ? <><path className="sales-illustration-accent" d="M54 69h132v18H54z" /><path className="sales-illustration-line" d="M120 42v82M94 42c-18-12-30 4-15 15 10 7 26 3 41-2M146 42c18-12 30 4 15 15-10 7-26 3-41-2" /></> : null}
    {type === "payment" ? <><rect className="sales-illustration-accent" height="16" rx="3" width="132" x="54" y="57" /><circle className="sales-illustration-dot" cx="160" cy="101" r="9" /><path className="sales-illustration-line" d="M70 96h53M70 107h36" /></> : null}
    {type === "receipt" ? <><path className="sales-illustration-line" d="M75 60h64M75 75h91M75 90h72M75 105h48" /><circle className="sales-illustration-dot" cx="166" cy="105" r="8" /></> : null}
    {type === "cart" || type === "orders" ? <><path className="sales-illustration-line" d="M70 61h15l10 39h55l10-29H91M103 111a6 6 0 1 0 0 .1M143 111a6 6 0 1 0 0 .1" /><circle className="sales-illustration-dot" cx="173" cy="52" r="10" /></> : null}
    {type === "subscription" ? <><path className="sales-illustration-line" d="M83 84a38 38 0 0 1 65-22l8 9M157 60l-1 11-11-1M157 85a38 38 0 0 1-65 22l-8-9M83 109l1-11 11 1" /></> : null}
    {type === "empty" ? <><path className="sales-illustration-line" d="M76 65h88M76 80h70M76 95h48" /><circle className="sales-illustration-dot" cx="171" cy="102" r="10" /></> : null}
  </svg>;
}

function EmptySalesState({ description, illustration = "empty", labels, title }) {
  return <div className="sales-empty-state" data-sales-empty-state>
    <SalesIllustration type={illustration} />
    <h3>{title || labels.emptyTitle}</h3>
    <p>{description || labels.emptyDescription}</p>
  </div>;
}

function SalesMetric({ icon: Icon, label, value }) {
  return <article className="sales-kpi-card">
    <span className="sales-kpi-icon"><Icon size={20} /></span>
    <span>{label}</span>
    <strong><bdi dir="ltr">{value}</bdi></strong>
  </article>;
}

function SalesPageHeader({ actions, subtitle, title }) {
  return <header className="sales-page-header" data-sales-page-header>
    <div><h1>{title}</h1><p>{subtitle}</p></div>
    {actions && <div className="sales-page-actions">{actions}</div>}
  </header>;
}

function SalesToolbar({ children, count, labels, query, setQuery }) {
  return <div className="sales-toolbar">
    {Number.isFinite(count) && <button className="sales-count-button" type="button">{count} {labels.items}<ChevronDown size={15} /></button>}
    <button className="sales-tool-button" type="button"><Eye size={16} />{labels.manageView}</button>
    <button className="sales-tool-button" type="button"><Filter size={16} />{labels.filters}</button>
    <label className="sales-search"><Search size={17} /><input aria-label={labels.search} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} value={query} /></label>
    {children}
  </div>;
}

function UnsupportedDialog({ labels, onClose, t }) {
  React.useEffect(() => {
    const close = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose]);
  return <div className="sales-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()} role="presentation">
    <div aria-label={labels.unsupported} aria-modal="true" className="sales-modal sales-placeholder-modal" role="dialog">
      <button aria-label={labels.cancel} className="sales-modal-close" onClick={onClose} type="button"><X size={19} /></button>
      <AdminUnderDevelopmentContent t={t} />
    </div>
  </div>;
}

function AddOrderDialog({ company, language, labels, onClose, onCreateOrder, products }) {
  const [customer, setCustomer] = React.useState({ address: "", city: "", name: "", phone: "" });
  const [productId, setProductId] = React.useState(products[0]?.id || "");
  const [quantity, setQuantity] = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const product = products.find((entry) => String(entry.id) === String(productId));
  const price = productPrice(product);
  const formatCurrency = currencyFormatter(company, language);
  async function submit(event) {
    event.preventDefault();
    if (!product) return;
    setSubmitting(true);
    setError("");
    const size = product.variants?.[0]?.size || product.sizes?.[0]?.size || "";
    const result = await onCreateOrder({
      customer,
      items: [{ lineTotal: price * quantity, price, productId: product.id, productName: localizedName(product, language), quantity, selectedSize: size, size, slug: product.slug || product.id, variantId: product.variants?.[0]?.id || "" }],
      total: price * quantity,
    });
    setSubmitting(false);
    if (result?.ok) onClose();
    else setError(result?.message || labels.unsupported);
  }
  return <div className="sales-modal-backdrop" role="presentation">
    <form aria-modal="true" className="sales-modal sales-order-modal" onSubmit={submit} role="dialog">
      <div className="sales-modal-heading"><div><h2>{labels.addOrder}</h2><p>{company?.name || ""}</p></div><button aria-label={labels.cancel} className="sales-modal-close" onClick={onClose} type="button"><X size={19} /></button></div>
      {error && <div className="message-panel error" role="alert">{error}</div>}
      <div className="sales-order-form-grid">
        {["name", "phone", "city", "address"].map((field) => <label key={field}><span>{field === "name" ? labels.customer : field}</span><input name={field} onChange={(event) => setCustomer((current) => ({ ...current, [field]: event.target.value }))} required value={customer[field]} /></label>)}
        <label className="sales-form-wide"><span>{labels.product}</span><select disabled={!products.length} onChange={(event) => setProductId(event.target.value)} required value={productId}>{!products.length && <option value="">{language === "ar" ? "لا توجد منتجات متاحة" : "No products available"}</option>}{products.map((entry) => <option key={entry.id} value={entry.id}>{localizedName(entry, language)}</option>)}</select></label>
        <label><span>{labels.quantity}</span><input min="1" onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} type="number" value={quantity} /></label>
        <div className="sales-order-total"><span>{labels.amount}</span><strong><bdi dir="ltr">{formatCurrency(price * quantity)}</bdi></strong></div>
      </div>
      <div className="sales-modal-actions"><button className="secondary-action" onClick={onClose} type="button">{labels.cancel}</button><button className="admin-primary-button" disabled={submitting || !product} type="submit">{submitting ? "…" : labels.saveOrder}</button></div>
    </form>
  </div>;
}

function OrderDetailDialog({ company, employees, language, labels, onClose, order, t }) {
  const money = currencyFormatter(company, language);
  const assigned = employees.find((employee) => String(employee.id) === String(order.assignedToEmployeeId || order.handledByEmployeeId));
  const created = order.createdAt && !Number.isNaN(new Date(order.createdAt).getTime()) ? new Date(order.createdAt).toLocaleString(language) : "—";
  const deliveryCity = order.delivery_city_name || order.deliveryZone?.city_name || order.customer?.city || null;
  const deliveryRegion = order.delivery_region || order.deliveryZone?.region || null;
  const rawDeliveryFee = order.delivery_price ?? order.deliveryPrice;
  const deliveryFeeAmount = rawDeliveryFee == null || rawDeliveryFee === "" ? NaN : Number(rawDeliveryFee);
  const deliveryFeeText = !Number.isFinite(deliveryFeeAmount) ? "—" : deliveryFeeAmount === 0 ? t("sales.deliveryFree") : money(deliveryFeeAmount);

  return (
    <div className="sales-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()} role="presentation">
      <section aria-modal="true" className="sales-modal sales-order-detail" role="dialog">
        <div className="sales-modal-heading">
          <div>
            <span className="sales-eyebrow">{labels.orderReference}</span>
            <h2>{order.id}</h2>
          </div>
          <button aria-label={labels.cancel} className="sales-modal-close" onClick={onClose} type="button">
            <X size={19} />
          </button>
        </div>
        <div className="sales-order-detail-grid">
          <div><span>{labels.customer}</span><strong>{order.customer?.name || "—"}</strong><small>{order.customer?.phone || order.customer?.email || "—"}</small></div>
          <div><span>{labels.status}</span><strong>{orderStatusLabel(t, order.status) || "—"}</strong></div>
          <div><span>{labels.paymentMethod}</span><strong>{order.paymentMethod || "—"}</strong></div>
          <div><span>{labels.date}</span><strong>{created}</strong></div>
          <div><span>{language === "ar" ? "أنشئ بواسطة" : "Created by"}</span><strong>{order.createdByEmployeeName || order.createdBy?.name || order.createdBy?.role || "—"}</strong></div>
          <div><span>{language === "ar" ? "الموظف المعيّن" : "Assigned employee"}</span><strong>{assigned?.name || "—"}</strong></div>
        </div>
        <div className="sales-order-lines">
          <h3>{language === "ar" ? "عناصر الطلب" : "Line items"}</h3>
          {(order.items || []).map((item, index) => (
            <div key={`${item.productId || item.slug}-${index}`}>
              <span>{item.productName || item.name || item.slug || item.productId}<small>{[item.selectedSize || item.size, item.selectedColor || item.colorName].filter(Boolean).join(" · ")}</small></span>
              <bdi dir="ltr">{item.quantity || 1} × {money(item.price)}</bdi>
              <strong><bdi dir="ltr">{money(item.lineTotal ?? Number(item.price || 0) * Number(item.quantity || 1))}</bdi></strong>
            </div>
          ))}
        </div>
        <div className="sales-order-delivery">
          <h3>{t("sales.delivery")}</h3>
          <div className="sales-order-detail-grid">
            <div><span>{t("sales.deliveryZone")}</span><strong>{deliveryCity || "—"}</strong></div>
            <div><span>{t("sales.deliveryRegion")}</span><strong>{deliveryRegion || "—"}</strong></div>
            <div><span>{t("sales.deliveryFee")}</span><strong>{deliveryFeeText}</strong></div>
          </div>
        </div>
        <div className="sales-order-detail-total">
          <span>{labels.amount}</span>
          <strong><bdi dir="ltr">{money(order.total)}</bdi></strong>
        </div>
      </section>
    </div>
  );
}

function OrdersPage({ canAdd, company, employees, language, labels, onAdd, onAssignEmployee, onDeleteOrder, onNavigate, onStatusChange, onUnsupported, orders, products, t, user }) {
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [customer, setCustomer] = React.useState("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [selectedOrder, setSelectedOrder] = React.useState(null);
  const [showOnboarding, setShowOnboarding] = React.useState(true);
  const filtered = filterSalesOrders(orders, { customer, from, query, status, to });
  const customers = [...new Map(orders.map((order) => [String(order.customer?.email || order.customer?.phone || order.customer?.id || order.customer?.name || ""), order.customer]).filter(([key]) => key)).entries()];
  const metrics = buildOrderMetrics(orders);
  const money = currencyFormatter(company, language);
  return <>
    {showOnboarding && <section className="sales-onboarding-banner sales-orders-onboarding">
      <button aria-label={labels.dismiss} className="sales-banner-dismiss" onClick={() => setShowOnboarding(false)} type="button"><X size={17} /></button>
      <div className="sales-onboarding-copy"><span className="sales-feature-icon"><ShoppingCart size={22} /></span><div><strong>{language === "ar" ? "أنشئ طلبات يدوية بسهولة" : "Create manual orders with ease"}</strong><p>{language === "ar" ? "اختر من منتجات الشركة الحالية وسجّل طلبات الهاتف أو الطلبات المباشرة في مكان واحد." : "Use existing company products to record phone and in-person orders in one place."}</p><div className="sales-banner-actions">{canAdd && <button className="admin-primary-button" onClick={onAdd} type="button"><Plus size={16} />{labels.addOrder}</button>}<button className="text-action" onClick={onUnsupported} type="button">{labels.learnMore}<ArrowUpRight size={15} /></button></div></div></div>
      <SalesIllustration type="orders" />
    </section>}
    <section className="sales-summary-bar sales-summary-bar-honest"><div><span>{labels.sales}</span><strong><bdi dir="ltr">{money(metrics.sales)}</bdi></strong></div><div><span>{labels.orders}</span><strong>{metrics.orders}</strong></div><div><span>{labels.quantity}</span><strong>{metrics.quantity}</strong></div><div><span>{labels.delivery}</span><strong><bdi dir="ltr">{money(metrics.delivery)}</bdi></strong></div><div><span>{labels.finalTotal}</span><strong><bdi dir="ltr">{money(metrics.finalTotal)}</bdi></strong></div><div><span>{labels.average}</span><strong><bdi dir="ltr">{money(metrics.averageOrderValue)}</bdi></strong></div><div className="sales-summary-range"><span><CalendarDays size={15} />{labels.dateRange}</span><small>{labels.countableNote}</small><button className="text-action" onClick={() => onNavigate("admin-tenant-placeholder-sales-analytics-overview")} type="button">{labels.analytics}<ArrowUpRight size={15} /></button></div></section>
    <section className="sales-data-card sales-orders-card"><div className="sales-card-heading"><div><h2>{labels.orders}</h2></div></div>
      <SalesToolbar count={filtered.length} labels={labels} query={query} setQuery={setQuery}><select aria-label={labels.status} onChange={(event) => setStatus(event.target.value)} value={status}><option value="all">{labels.allStatuses}</option>{ORDER_STATUSES.map((item) => <option key={item} value={item}>{t(`status.${item}`)}</option>)}</select><select aria-label={labels.customer} onChange={(event) => setCustomer(event.target.value)} value={customer}><option value="all">{language === "ar" ? "كل العملاء" : "All customers"}</option>{customers.map(([key, entry]) => <option key={key} value={key}>{entry?.name || entry?.email || entry?.phone}</option>)}</select><label className="sales-date-filter"><span>{language === "ar" ? "من" : "From"}</span><input onChange={(event) => setFrom(event.target.value)} type="date" value={from} /></label><label className="sales-date-filter"><span>{language === "ar" ? "إلى" : "To"}</span><input onChange={(event) => setTo(event.target.value)} type="date" value={to} /></label></SalesToolbar>
      {filtered.length ? <AdminOrdersTable canDelete={canUseSalesAction(user, "deleteOrder")} canUpdateStatus={canUseSalesAction(user, "updateOrder")} company={company} currency={company?.settings?.currency} employees={employees} language={language} locale={company?.settings?.locale} onAssignEmployee={onAssignEmployee} onDeleteOrder={onDeleteOrder} onStatusChange={onStatusChange} onViewOrder={setSelectedOrder} orders={filtered} products={products} t={t} /> : <EmptySalesState illustration="orders" labels={labels} title={language === "ar" ? "لا توجد طلبات بعد" : "No orders yet"} />}
    </section>
    {selectedOrder && <OrderDetailDialog company={company} employees={employees} labels={labels} language={language} onClose={() => setSelectedOrder(null)} order={selectedOrder} t={t} />}
  </>;
}

function BasicEmptyPage({ action, actionLabel, description, icon, labels, onUnsupported, title }) {
  const Icon = icon;
  return <section className="sales-data-card sales-feature-card"><div className="sales-card-heading"><div><span className="sales-feature-icon"><Icon size={22} /></span><div><h2>{title}</h2><p>{description}</p></div></div>{action && <button className="secondary-action" onClick={onUnsupported} type="button">{actionLabel}</button>}</div><EmptySalesState icon={icon} labels={labels} /></section>;
}

function SubscriptionsPage({ company, language, labels }) {
  const [query, setQuery] = React.useState("");
  const money = currencyFormatter(company, language);
  return <>
    <section className="sales-data-card sales-statistics-card"><div className="sales-card-heading"><div><h2>{language === "ar" ? "الإحصائيات" : "Statistics"}</h2><span>{labels.dateRange}</span></div></div><div className="sales-separated-metrics"><div><span>{language === "ar" ? "الاشتراكات النشطة" : "Active subscriptions"}</span><strong>0</strong></div><div><span>{language === "ar" ? "الإيرادات المتكررة" : "Recurring revenue"}</span><strong>{money(0)}</strong></div><div><span>{labels.totalCustomers}</span><strong>0</strong></div></div></section>
    <section className="sales-data-card sales-list-card"><SalesToolbar count={0} labels={labels} query={query} setQuery={setQuery} /><EmptySalesState illustration="subscription" labels={labels} title={language === "ar" ? "لا توجد اشتراكات" : "No subscriptions yet"} /></section>
  </>;
}

function GiftCardPage({ language, labels, onUnsupported }) {
  const benefits = language === "ar"
    ? ["امنح العملاء طريقة مرنة للتسوق", "شجّع المبيعات المتكررة", "أدر بطاقات الهدايا من مكان واحد"]
    : ["Give customers a flexible way to shop", "Encourage repeat purchases", "Manage gift cards in one place"];
  return <section className="sales-gift-hero">
    <div className="sales-gift-copy"><span className="sales-eyebrow">iGroup Gift Cards</span><h2>{language === "ar" ? "حوّل بطاقات الهدايا إلى تجربة بيع متكاملة" : "Turn gift cards into a complete selling experience"}</h2><div className="sales-benefit-list">{benefits.map((benefit) => <div key={benefit}><span><Check size={15} /></span>{benefit}</div>)}</div><div className="sales-gift-actions"><button className="admin-primary-button" onClick={onUnsupported} type="button"><Gift size={17} />{language === "ar" ? "إضافة بطاقة هدية" : "Add Gift Card"}</button><button className="text-action" onClick={onUnsupported} type="button">{labels.learnMore}<ArrowUpRight size={15} /></button></div></div>
    <div className="sales-gift-visual"><SalesIllustration type="gift" /><div className="sales-gift-mini-card"><Gift size={20} /><span>iGroup</span><strong>{language === "ar" ? "بطاقة هدية" : "Gift Card"}</strong></div></div>
  </section>;
}

function PaymentsPage({ company, language, labels, onUnsupported, orders }) {
  const [query, setQuery] = React.useState("");
  const money = currencyFormatter(company, language);
  const paymentConfigured = Boolean(company?.settings?.paymentsEnabled || company?.settings?.paymentProvider || company?.settings?.paymentMethods?.length);
  const rows = buildPaymentRows(orders).filter((row) => [row.id, row.customer.name, row.customer.email, row.customer.phone, row.method, row.status].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase()));
  return <>{!paymentConfigured && <section className="sales-setup-row"><div><span className="sales-feature-icon"><CreditCard size={22} /></span><div><strong>{language === "ar" ? "أكمل إعداد طرق الدفع" : "Set up payment methods"}</strong><p>{language === "ar" ? "لا توجد طريقة دفع مفعّلة في إعدادات الشركة الحالية." : "No payment method is enabled in the current company settings."}</p></div></div><button className="secondary-action" onClick={onUnsupported} type="button">{labels.managePayments}</button></section>}<section className="sales-data-card sales-payments-card">{rows.length ? <><SalesToolbar count={rows.length} labels={labels} query={query} setQuery={setQuery} /><div className="sales-table-wrap"><table className="sales-table"><thead><tr><th>{labels.date}</th><th>{labels.status}</th><th>{labels.amount}</th><th>{labels.customer}</th><th>{labels.paymentMethod}</th><th>{labels.orderReference}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.date ? new Date(row.date).toLocaleDateString(language) : "—"}</td><td><span className="sales-status-pill">{row.status || "—"}</span></td><td>{money(row.amount)}</td><td>{row.customer.name || row.customer.email || row.customer.phone || "—"}</td><td>{row.method || "—"}</td><td>{row.orderReference}</td></tr>)}</tbody></table></div></> : <div className="sales-central-empty"><SalesIllustration type="payment" /><h2>{language === "ar" ? "لا توجد مدفوعات لعرضها" : "No payments to show"}</h2><p>{language === "ar" ? "ستظهر معاملات الطلبات الحقيقية هنا عند تسجيلها." : "Real order transactions will appear here after they are recorded."}</p><button className="admin-primary-button" onClick={onUnsupported} type="button">{labels.managePayments}</button></div>}</section></>;
}

function ReceiptsPage({ company, language, labels, onUnsupported, orders }) {
  const rows = buildReceiptRows(orders);
  const money = currencyFormatter(company, language);
  return <section className="sales-data-card sales-receipts-card"><div className="sales-list-top"><button className="sales-tool-button" type="button"><Filter size={16} />{labels.filters}</button></div>{rows.length ? <div className="sales-table-wrap"><table className="sales-table"><thead><tr><th>{labels.date}</th><th>{labels.orderReference}</th><th>{labels.customer}</th><th>{labels.amount}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.date ? new Date(row.date).toLocaleDateString(language) : "—"}</td><td>{row.orderReference}</td><td>{row.customer.name || row.customer.email || "—"}</td><td>{money(row.amount)}</td></tr>)}</tbody></table></div> : <EmptySalesState illustration="receipt" labels={labels} title={language === "ar" ? "لا توجد إيصالات" : "No receipts yet"} />}</section>;
}

function RankedList({ empty, money, rows, title, valueKey = "sales" }) {
  return <article className="sales-insight-card"><h3>{title}</h3>{rows.length ? <ol>{rows.map((row) => <li key={row.key}><span>{row.key}</span><strong>{valueKey === "quantity" ? row.quantity : money(row.sales)}</strong></li>)}</ol> : <div className="sales-mini-empty"><span className="sales-zero-mark">0</span><p>{empty}</p></div>}</article>;
}

function AnalyticsPage({ company, language, labels, orders, products, t }) {
  const data = buildSalesAnalytics(orders, products, language, company);
  const money = currencyFormatter(company, language);
  const maxSale = Math.max(0, ...data.daily.map((item) => item.sales));
  const maxMonthlySale = Math.max(0, ...data.monthly.map((item) => item.sales));
  const costProfit = data.costProfit || buildCostProfitSummary(orders, company);
  const statusBreakdown = Object.entries(
    (Array.isArray(orders) ? orders : []).reduce(
      (groups, order) => {
        const key = canonicalOrderStatus(order.status) || "Unknown";
        return { ...groups, [key]: (groups[key] || 0) + 1 };
      },
      {},
    ),
  ).map(([key, count]) => ({ key: orderStatusLabel(t, key), quantity: count }));
  return <div className="sales-analytics-page">
    <div className="sales-kpi-grid four sales-overview-kpis sales-overview-primary">
      <SalesMetric icon={WalletCards} label={labels.sales} value={money(data.metrics.sales)} />
      <SalesMetric icon={ShoppingCart} label={labels.orders} value={data.metrics.orders} />
      <SalesMetric icon={ReceiptText} label={labels.finalTotal} value={money(data.metrics.finalTotal)} />
      <SalesMetric icon={BarChart3} label={labels.average} value={money(data.metrics.averageOrderValue)} />
    </div>
    <section className="sales-data-card sales-secondary-metrics">
      <div className="sales-card-heading"><div><h2>{language === "ar" ? "المبيعات والطلبات" : "Sales & orders"}</h2></div></div>
      <div className="sales-kpi-grid four sales-overview-secondary">
        <SalesMetric icon={PackageOpen} label={labels.quantity} value={data.metrics.quantity} />
        <SalesMetric icon={CreditCard} label={labels.delivery} value={money(data.metrics.delivery)} />
        <SalesMetric icon={RefreshCcw} label={language === "ar" ? "الطلبات المعلقة" : "Pending orders"} value={data.metrics.pendingOrders} />
        <SalesMetric icon={Check} label={language === "ar" ? "الطلبات المكتملة" : "Completed orders"} value={data.metrics.completedOrders} />
      </div>
    </section>
    <section className="sales-data-card sales-secondary-metrics">
      <div className="sales-card-heading"><div><h2>{language === "ar" ? "حالة الطلبات والتكلفة" : "Order status & cost"}</h2></div></div>
      <div className="sales-kpi-grid three sales-overview-secondary">
        <SalesMetric icon={X} label={language === "ar" ? "الطلبات الملغاة" : "Cancelled orders"} value={data.metrics.cancelledOrders} />
        {costProfit.supported ? (
          <>
            <SalesMetric icon={WalletCards} label={language === "ar" ? "التكلفة" : "Cost"} value={money(costProfit.cost)} />
            <SalesMetric icon={WalletCards} label={language === "ar" ? "الربح" : "Profit"} value={money(costProfit.profit)} />
          </>
        ) : (
          <SalesMetric icon={WalletCards} label={language === "ar" ? "التكلفة / الربح" : "Cost / Profit"} value={labels.costUnavailable} />
        )}
      </div>
    </section>
    <section className="sales-data-card sales-chart-card"><div className="sales-card-heading"><div><h2>{language === "ar" ? "المبيعات بمرور الوقت" : "Sales over time"}</h2><span>{labels.dateRange}</span></div></div>{data.daily.length ? <div className="sales-chart" aria-label={language === "ar" ? "مخطط المبيعات" : "Sales chart"}><span className="sales-chart-axis">{money(maxSale)}</span>{data.daily.map((item) => <div className="sales-chart-column" key={item.key}><span style={{ height: `${maxSale ? Math.max(8, (item.sales / maxSale) * 100) : 0}%` }} title={money(item.sales)} /><small>{item.key.slice(5)}</small></div>)}</div> : <EmptySalesState illustration="empty" labels={labels} title={language === "ar" ? "لا توجد مبيعات في هذه الفترة" : "No sales in this period"} />}</section>
    <section className="sales-data-card sales-chart-card sales-monthly-card"><div className="sales-card-heading"><div><h2>{labels.monthlySales}</h2><span>{labels.dateRange}</span></div></div>{data.monthly.length ? <div className="sales-chart" aria-label={labels.monthlySales}><span className="sales-chart-axis">{money(maxMonthlySale)}</span>{data.monthly.map((item) => <div className="sales-chart-column" key={item.key}><span style={{ height: `${maxMonthlySale ? Math.max(8, (item.sales / maxMonthlySale) * 100) : 0}%` }} title={money(item.sales)} /><small>{item.key}</small></div>)}</div> : <EmptySalesState illustration="empty" labels={labels} title={language === "ar" ? "لا توجد مبيعات في هذه الفترة" : "No sales in this period"} />}</section>
    <section className="sales-data-card sales-orders-over-time"><div className="sales-card-heading"><div><h2>{language === "ar" ? "الطلبات بمرور الوقت" : "Orders over time"}</h2><span>{labels.dateRange}</span></div></div>{data.ordersOverTime.length ? <div className="sales-order-bars">{data.ordersOverTime.map((item) => <div key={item.key}><span>{item.key}</span><i style={{ "--sales-order-count": item.orders }} /><strong>{item.orders}</strong></div>)}</div> : <EmptySalesState illustration="orders" labels={labels} />}</section>
    <div className="sales-insight-grid"><RankedList empty={labels.emptyDescription} money={money} rows={data.topProducts} title={language === "ar" ? "أفضل المنتجات" : "Top products"} /><RankedList empty={labels.emptyDescription} money={money} rows={data.topCustomers} title={language === "ar" ? "أفضل العملاء" : "Top customers"} /><RankedList empty={labels.emptyDescription} money={money} rows={data.sources} title={language === "ar" ? "مصادر المبيعات" : "Sales sources"} /><RankedList empty={labels.emptyDescription} money={money} rows={data.locations} title={language === "ar" ? "المواقع" : "Locations"} /><article className="sales-insight-card sales-customer-mix"><h3>{language === "ar" ? "العملاء الجدد والعائدون" : "New vs returning customers"}</h3><div><span><strong>{data.customerMix.newCustomers}</strong>{language === "ar" ? "عملاء جدد" : "New customers"}</span><span><strong>{data.customerMix.returningOrders}</strong>{language === "ar" ? "طلبات عائدة" : "Returning orders"}</span></div></article><RankedList empty={labels.emptyDescription} money={money} rows={statusBreakdown} title={language === "ar" ? "تفصيل المبيعات" : "Sales breakdown"} valueKey="quantity" /></div>
  </div>;
}

function SubscriptionAnalyticsPage({ company, language, labels }) {
  const money = currencyFormatter(company, language);
  const cards = language === "ar" ? ["تنتهي قريباً", "انتهت مؤخراً", "قيمة العميل"] : ["Ending soon", "Recently ended", "Customer value"];
  return <><section className="sales-data-card sales-subscription-key"><div className="sales-card-heading"><div><h2>{language === "ar" ? "المقاييس الرئيسية" : "Key metrics"}</h2><span>{labels.dateRange}</span></div></div><div className="sales-separated-metrics"><div><span>{language === "ar" ? "الاشتراكات النشطة" : "Active subscriptions"}</span><strong>0</strong></div><div><span>{language === "ar" ? "الإيرادات" : "Revenue"}</span><strong>{money(0)}</strong></div><div><span>{language === "ar" ? "معدل الاحتفاظ" : "Retention rate"}</span><strong>0%</strong></div></div></section><section className="sales-data-card sales-chart-card"><div className="sales-card-heading"><div><h2>{language === "ar" ? "الإيرادات بمرور الوقت" : "Revenue over time"}</h2></div></div><EmptySalesState illustration="subscription" labels={labels} /></section><section className="sales-data-card"><div className="sales-card-heading"><div><h2>{language === "ar" ? "الاحتفاظ بالعملاء" : "Customer retention"}</h2></div></div><div className="sales-subscription-trio">{cards.map((card) => <article key={card}><span>{card}</span><strong>0</strong><p>{labels.emptyDescription}</p></article>)}</div></section><section className="sales-data-card sales-retention-table"><h2>{language === "ar" ? "جدول الاحتفاظ" : "Retention table"}</h2><div className="sales-table-wrap"><table className="sales-table"><thead><tr><th>{language === "ar" ? "الفترة" : "Period"}</th><th>{language === "ar" ? "العملاء" : "Customers"}</th><th>{language === "ar" ? "الاحتفاظ" : "Retention"}</th></tr></thead><tbody><tr><td colSpan="3">{labels.emptyDescription}</td></tr></tbody></table></div></section></>;
}

function AbandonedCartsPage({ language, labels, onUnsupported }) {
  const [query, setQuery] = React.useState("");
  return <><section className="sales-automation-card"><div className="sales-automation-switch" aria-hidden="true"><span /></div><div><span className="sales-status-pill">{language === "ar" ? "غير نشط" : "Inactive"}</span><h2>{language === "ar" ? "أتمتة استعادة السلة" : "Cart recovery automation"}</h2><p>{language === "ar" ? "أرسل تذكيرات تلقائية عندما تتوفر أتمتة السلات لهذه الشركة." : "Send automatic reminders when cart automation becomes available for this company."}</p></div><button className="secondary-action" onClick={onUnsupported} type="button">{language === "ar" ? "تعديل" : "Edit"}</button></section><section className="sales-data-card sales-carts-card"><SalesToolbar count={0} labels={labels} query={query} setQuery={setQuery} /><EmptySalesState illustration="cart" labels={labels} title={language === "ar" ? "لا توجد سلات متروكة" : "No abandoned carts"} /></section></>;
}

export default function AdminSalesPage({ activePage, company, currentUser, employees = [], language = "en", modules = [], onAssignEmployee, onCreateOrder, onDeleteOrder, onNavigate, onStatusChange, orders = [], products = [], statusMessage, statusMessageType, t, ...layout }) {
  const [showAddOrder, setShowAddOrder] = React.useState(false);
  const [showUnsupported, setShowUnsupported] = React.useState(false);
  const labels = labelsFor(language);
  const ar = language === "ar";
  const copy = pageCopy[activePage] || pageCopy["admin-orders"];
  const title = ar ? copy[2] : copy[0];
  const subtitle = ar ? copy[3] : copy[1];
  const hasSalesModule = moduleAllowsPage(modules, "admin-orders");
  const canView = hasSalesModule && canUseSalesAction(currentUser, "view");
  const canAdd = canUseSalesAction(currentUser, "addOrder");
  const unsupported = () => setShowUnsupported(true);

  function renderPage() {
    if (!canView) return <EmptySalesState description={ar ? "ليست لديك صلاحية لعرض وحدة المبيعات." : "You do not have access to the Sales module."} labels={labels} title={ar ? "الوصول مرفوض" : "Access denied"} />;
    switch (activePage) {
      case "admin-orders": return <OrdersPage canAdd={canAdd} company={company} employees={employees} language={language} labels={labels} onAdd={() => setShowAddOrder(true)} onAssignEmployee={onAssignEmployee} onDeleteOrder={onDeleteOrder} onNavigate={onNavigate} onStatusChange={onStatusChange} onUnsupported={unsupported} orders={orders} products={products} t={t} user={currentUser} />;
      case "admin-tenant-placeholder-sales-subscriptions": return <SubscriptionsPage company={company} language={language} labels={labels} />;
      case "admin-tenant-placeholder-sales-gift-card-sales": return <GiftCardPage language={language} labels={labels} onUnsupported={unsupported} />;
      case "admin-tenant-placeholder-sales-payments-all": return <PaymentsPage company={company} language={language} labels={labels} onUnsupported={unsupported} orders={orders} />;
      case "admin-tenant-placeholder-sales-payments-receipts": return <ReceiptsPage company={company} language={language} labels={labels} onUnsupported={unsupported} orders={orders} />;
      case "admin-tenant-placeholder-sales-analytics-overview": return <AnalyticsPage company={company} language={language} labels={labels} orders={orders} products={products} t={t} />;
      case "admin-tenant-placeholder-sales-analytics-subscriptions": return <SubscriptionAnalyticsPage company={company} language={language} labels={labels} />;
      case "admin-tenant-placeholder-sales-abandoned-carts": return <AbandonedCartsPage language={language} labels={labels} onUnsupported={unsupported} />;
      default: return null;
    }
  }

  function headerActions() {
    if (!canView) return null;
    if (activePage === "admin-orders" && canAdd) return <button className="admin-primary-button" onClick={() => setShowAddOrder(true)} type="button"><Plus size={17} />{labels.addOrder}</button>;
    if (activePage === "admin-tenant-placeholder-sales-subscriptions") return <button className="secondary-action" onClick={unsupported} type="button"><SlidersHorizontal size={16} />{labels.subscriptionSettings}</button>;
    if (activePage === "admin-tenant-placeholder-sales-payments-receipts") return <><button className="secondary-action" onClick={unsupported} type="button">{labels.moreActions}<ChevronDown size={15} /></button><button className="secondary-action" onClick={unsupported} type="button"><SlidersHorizontal size={16} />{labels.receiptSettings}</button></>;
    if (activePage === "admin-tenant-placeholder-sales-analytics-overview") return <div className="sales-analytics-range"><button className="sales-range-control" type="button"><CalendarDays size={17} />{labels.dateRange}<ChevronDown size={15} /></button><span>{labels.comparison}</span></div>;
    return null;
  }

  return <AdminLayout activePage={activePage} company={company} currentUser={currentUser} hideHeader language={language} modules={modules} onNavigate={onNavigate} subtitle={subtitle} t={t} title={title} {...layout}>
    <div className="tenant-sales-page" data-sales-direction={salesDirection(language)} dir={salesDirection(language)}>
      {activePage === "admin-tenant-placeholder-sales-analytics-subscriptions" && <div className="sales-breadcrumb">{ar ? "المبيعات / التحليلات / الاشتراكات" : "Sales / Analytics / Subscriptions"}</div>}
      <SalesPageHeader actions={headerActions()} subtitle={subtitle} title={title} />
      {statusMessage && <div className={`message-panel ${statusMessageType || "success"}`}>{statusMessage}</div>}
      {renderPage()}
    </div>
    {showAddOrder && <AddOrderDialog company={company} language={language} labels={labels} onClose={() => setShowAddOrder(false)} onCreateOrder={onCreateOrder} products={products} />}
    {showUnsupported && <UnsupportedDialog labels={labels} onClose={() => setShowUnsupported(false)} t={t} />}
  </AdminLayout>;
}
