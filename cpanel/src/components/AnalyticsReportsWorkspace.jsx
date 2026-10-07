import React from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  FileText,
  Package,
  RefreshCw,
  Truck,
  Users,
} from "lucide-react";
import { canAccessAdminPage } from "../utils/roles.js";
import { formatCompanyCurrency } from "../utils/sales.js";
import { fetchReportsSummary } from "../utils/reportsApi.js";
import {
  countBarWidth,
  formatReportsWhen,
  normalizeReportsSummary,
  reportsHasPeriodRecords,
  reportsRangeForPreset,
} from "../utils/reportsUi.js";

export const REPORTS_COPY = {
  en: {
    title: "Company reports",
    subtitle: "Operational totals from this company’s orders, invoices, catalog, delivery zones, and activity log.",
    rangeHint: "Order, invoice, and activity totals use the selected dates. Catalog, customer, and delivery-zone counts are current totals.",
    citiesHint: "City counts use all recorded orders, not only the selected dates.",
    last7: "Last 7 days",
    last30: "Last 30 days",
    last90: "Last 90 days",
    custom: "Custom",
    from: "From",
    to: "To",
    apply: "Apply",
    retry: "Retry",
    loading: "Loading reports…",
    forbidden: "You do not have permission to view reports.",
    readOnly: "Reports are view-only.",
    loadFailed: "Unable to load reports.",
    emptyPeriod: "No orders, invoices, or activity in this date range.",
    emptyHint: "Totals below still show current catalog, customer, and delivery-zone counts.",
    revenue: "Order revenue",
    orders: "Orders",
    pending: "Pending orders",
    completed: "Completed orders",
    invoices: "Invoices",
    paid: "Paid invoices",
    customers: "Customers",
    products: "Products",
    zones: "Delivery zones",
    inRange: "In selected dates",
    currentTotal: "Current total",
    orderStatus: "Orders by status",
    invoiceStatus: "Invoices by status",
    latestOrders: "Latest orders",
    latestInvoices: "Latest invoices",
    latestProducts: "Recently updated products",
    productVisibility: "Product visibility",
    visible: "Visible",
    hidden: "Hidden",
    delivery: "Delivery zones",
    enabled: "Enabled",
    disabled: "Disabled",
    topCities: "Top delivery cities",
    activity: "Recent activity",
    activityByAction: "Activity by action",
    activityByActor: "Activity by actor",
    emptyTable: "No records in this range.",
    emptyCities: "No order cities recorded.",
    emptyActivity: "No activity in this range.",
    emptyStatus: "No statuses to show.",
    customer: "Customer",
    total: "Total",
    status: "Status",
    date: "Date",
    invoice: "Invoice",
    product: "Product",
    action: "Action",
    actor: "Actor",
    city: "City",
    count: "Count",
    detail: "Summary",
    otherReports: "Reports without a connected data source",
    otherHint: "These templates stay closed until a verified source exists. No sample values are shown.",
    openUnavailable: "Unavailable",
  },
  ar: {
    title: "تقارير الشركة",
    subtitle: "إجماليات تشغيلية من طلبات هذه الشركة والفواتير والكتالوج ومناطق التوصيل وسجل النشاط.",
    rangeHint: "إجماليات الطلبات والفواتير والنشاط تستخدم التواريخ المحددة. أعداد الكتالوج والعملاء ومناطق التوصيل هي الإجماليات الحالية.",
    citiesHint: "أعداد المدن تستخدم كل الطلبات المسجّلة، وليس التواريخ المحددة فقط.",
    last7: "آخر 7 أيام",
    last30: "آخر 30 يوماً",
    last90: "آخر 90 يوماً",
    custom: "مخصص",
    from: "من",
    to: "إلى",
    apply: "تطبيق",
    retry: "إعادة المحاولة",
    loading: "جاري تحميل التقارير…",
    forbidden: "ليس لديك صلاحية عرض التقارير.",
    readOnly: "التقارير للعرض فقط.",
    loadFailed: "تعذر تحميل التقارير.",
    emptyPeriod: "لا توجد طلبات أو فواتير أو نشاط في هذا النطاق الزمني.",
    emptyHint: "الإجماليات أدناه ما زالت تعرض أعداد الكتالوج والعملاء ومناطق التوصيل الحالية.",
    revenue: "إيرادات الطلبات",
    orders: "الطلبات",
    pending: "طلبات قيد الانتظار",
    completed: "طلبات مكتملة",
    invoices: "الفواتير",
    paid: "فواتير مدفوعة",
    customers: "العملاء",
    products: "المنتجات",
    zones: "مناطق التوصيل",
    inRange: "ضمن التواريخ المحددة",
    currentTotal: "الإجمالي الحالي",
    orderStatus: "الطلبات حسب الحالة",
    invoiceStatus: "الفواتير حسب الحالة",
    latestOrders: "أحدث الطلبات",
    latestInvoices: "أحدث الفواتير",
    latestProducts: "منتجات محدّثة مؤخراً",
    productVisibility: "ظهور المنتجات",
    visible: "ظاهر",
    hidden: "مخفي",
    delivery: "مناطق التوصيل",
    enabled: "مفعّلة",
    disabled: "معطّلة",
    topCities: "أكثر مدن التوصيل",
    activity: "النشاط الأخير",
    activityByAction: "النشاط حسب الإجراء",
    activityByActor: "النشاط حسب المنفّذ",
    emptyTable: "لا توجد سجلات في هذا النطاق.",
    emptyCities: "لا توجد مدن طلبات مسجّلة.",
    emptyActivity: "لا يوجد نشاط في هذا النطاق.",
    emptyStatus: "لا توجد حالات للعرض.",
    customer: "العميل",
    total: "الإجمالي",
    status: "الحالة",
    date: "التاريخ",
    invoice: "الفاتورة",
    product: "المنتج",
    action: "الإجراء",
    actor: "المنفّذ",
    city: "المدينة",
    count: "العدد",
    detail: "الملخص",
    otherReports: "تقارير بلا مصدر بيانات متصل",
    otherHint: "تبقى هذه القوالب مغلقة حتى يتوفر مصدر موثّق. لا تُعرض قيم تجريبية.",
    openUnavailable: "غير متاح",
  },
};

function MetricCard({ icon: Icon, label, value, status }) {
  return (
    <article className="tenant-analytics-metric analytics-reports-metric">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{status}</small>
      </div>
      <i><Icon size={21} /></i>
    </article>
  );
}

function CountBars({ items, labelKey, empty }) {
  if (!items.length) return <p className="analytics-reports-empty-copy">{empty}</p>;
  return (
    <ul className="analytics-reports-bars">
      {items.map((item) => (
        <li key={item[labelKey]}>
          <span>{item[labelKey]}</span>
          <div className="analytics-reports-bar-track">
            <span style={{ width: countBarWidth(item.count, items) }} />
          </div>
          <b>{item.count}</b>
        </li>
      ))}
    </ul>
  );
}

function DataTable({ columns, rows, empty, language }) {
  if (!rows.length) return <p className="analytics-reports-empty-copy">{empty}</p>;
  return (
    <div className="analytics-reports-table">
      <div className="analytics-reports-table-head" role="row">
        {columns.map((column) => <span key={column.key}>{column.label}</span>)}
      </div>
      {rows.map((row) => (
        <div className="analytics-reports-table-row" key={row.id || row.key} role="row">
          {columns.map((column) => (
            <span data-label={column.label} key={column.key}>
              {column.render ? column.render(row, language) : row[column.key] || "—"}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsReportsWorkspace({
  company,
  currentUser,
  language = "en",
  onUnsupported,
  unsupportedCatalog = [],
}) {
  const copy = REPORTS_COPY[language] || REPORTS_COPY.en;
  const canView = canAccessAdminPage(currentUser, "admin-analytics-reports");
  const [preset, setPreset] = React.useState("30d");
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo] = React.useState("");
  const [appliedRange, setAppliedRange] = React.useState(() => reportsRangeForPreset("30d"));
  const [report, setReport] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [forbidden, setForbidden] = React.useState(!canView);

  const load = React.useCallback(async () => {
    if (!canView) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setForbidden(false);
    try {
      const payload = await fetchReportsSummary({
        dateFrom: appliedRange.date_from,
        dateTo: appliedRange.date_to,
      });
      setReport(normalizeReportsSummary(payload));
    } catch (loadError) {
      if (loadError.status === 403 || /403|forbidden|access denied|module is disabled/i.test(loadError.message || "")) {
        setForbidden(true);
        setReport(null);
      } else {
        setError(loadError.message || copy.loadFailed);
      }
    } finally {
      setLoading(false);
    }
  }, [appliedRange, canView, copy.loadFailed]);

  React.useEffect(() => {
    load();
  }, [load, company?.id]);

  function applyRange() {
    setAppliedRange(reportsRangeForPreset(preset, customFrom, customTo));
  }

  if (forbidden) {
    return (
      <section className="analytics-reports-state" role="alert">
        <AlertCircle size={22} />
        <strong>{copy.forbidden}</strong>
      </section>
    );
  }

  const money = (value) => formatCompanyCurrency(value, company, language);
  const periodEmpty = report && !loading && !reportsHasPeriodRecords(report);

  return (
    <div className="analytics-reports-workspace">
      <p className="analytics-reports-banner" role="status">{copy.readOnly}</p>
      <p className="analytics-reports-hint">{copy.rangeHint}</p>

      <div className="analytics-reports-filters">
        <div className="analytics-reports-presets" role="group" aria-label={copy.last30}>
          {[["7d", copy.last7], ["30d", copy.last30], ["90d", copy.last90], ["custom", copy.custom]].map(([id, label]) => (
            <button
              className={preset === id ? "active" : ""}
              key={id}
              onClick={() => {
                setPreset(id);
                if (id !== "custom") setAppliedRange(reportsRangeForPreset(id));
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="analytics-reports-custom">
            <label>
              {copy.from}
              <input aria-label={copy.from} onChange={(event) => setCustomFrom(event.target.value)} type="date" value={customFrom} />
            </label>
            <label>
              {copy.to}
              <input aria-label={copy.to} onChange={(event) => setCustomTo(event.target.value)} type="date" value={customTo} />
            </label>
          </div>
        )}
        <button className="tenant-analytics-primary" onClick={applyRange} type="button">{copy.apply}</button>
      </div>

      {error && (
        <div className="analytics-reports-state is-error" role="alert">
          <strong>{error}</strong>
          <button className="tenant-analytics-primary" onClick={load} type="button">
            <RefreshCw size={16} />
            {copy.retry}
          </button>
        </div>
      )}

      {loading && <div className="analytics-reports-state">{copy.loading}</div>}

      {!loading && report && (
        <>
          {periodEmpty && (
            <div className="analytics-reports-state" role="status">
              <strong>{copy.emptyPeriod}</strong>
              <span>{copy.emptyHint}</span>
            </div>
          )}

          <div className="tenant-analytics-metrics four analytics-reports-kpis">
            <MetricCard icon={BarChart3} label={copy.revenue} status={copy.inRange} value={money(report.summary.revenue_total)} />
            <MetricCard icon={FileText} label={copy.orders} status={copy.inRange} value={report.summary.orders_count} />
            <MetricCard icon={Package} label={copy.completed} status={copy.inRange} value={report.summary.completed_orders} />
            <MetricCard icon={AlertCircle} label={copy.pending} status={copy.inRange} value={report.summary.pending_orders} />
            <MetricCard icon={FileText} label={copy.invoices} status={copy.inRange} value={report.summary.invoices_count} />
            <MetricCard icon={FileText} label={copy.paid} status={copy.inRange} value={report.summary.paid_invoices} />
            <MetricCard icon={Users} label={copy.customers} status={copy.currentTotal} value={report.summary.customers_count} />
            <MetricCard icon={Package} label={copy.products} status={copy.currentTotal} value={report.summary.products_count} />
            <MetricCard icon={Truck} label={copy.zones} status={copy.currentTotal} value={report.summary.delivery_zones_count} />
          </div>

          <div className="tenant-analytics-grid two">
            <section className="tenant-analytics-panel">
              <header><h2>{copy.orderStatus}</h2></header>
              <CountBars empty={copy.emptyStatus} items={report.orders.by_status} labelKey="status" />
            </section>
            <section className="tenant-analytics-panel">
              <header><h2>{copy.invoiceStatus}</h2></header>
              <CountBars empty={copy.emptyStatus} items={report.invoices.by_status} labelKey="status" />
            </section>
          </div>

          <section className="tenant-analytics-panel">
            <header><h2>{copy.latestOrders}</h2></header>
            <DataTable
              columns={[
                { key: "id", label: "ID" },
                { key: "customer_name", label: copy.customer },
                { key: "total", label: copy.total, render: (row) => money(row.total) },
                { key: "status", label: copy.status },
                { key: "created_at", label: copy.date, render: (row) => formatReportsWhen(row.created_at, language) },
              ]}
              empty={copy.emptyTable}
              language={language}
              rows={report.orders.latest}
            />
          </section>

          <section className="tenant-analytics-panel">
            <header><h2>{copy.latestInvoices}</h2></header>
            <DataTable
              columns={[
                { key: "invoice_number", label: copy.invoice },
                { key: "customer_name", label: copy.customer },
                { key: "total", label: copy.total, render: (row) => money(row.total) },
                { key: "status", label: copy.status },
                { key: "created_at", label: copy.date, render: (row) => formatReportsWhen(row.created_at, language) },
              ]}
              empty={copy.emptyTable}
              language={language}
              rows={report.invoices.latest}
            />
          </section>

          <div className="tenant-analytics-grid two">
            <section className="tenant-analytics-panel">
              <header><h2>{copy.productVisibility}</h2></header>
              <CountBars
                empty={copy.emptyStatus}
                items={[
                  { status: copy.visible, count: report.products.visible },
                  { status: copy.hidden, count: report.products.hidden },
                ]}
                labelKey="status"
              />
            </section>
            <section className="tenant-analytics-panel">
              <header><h2>{copy.delivery}</h2></header>
              <CountBars
                empty={copy.emptyStatus}
                items={[
                  { status: copy.enabled, count: report.delivery.enabled },
                  { status: copy.disabled, count: report.delivery.disabled },
                ]}
                labelKey="status"
              />
            </section>
          </div>

          <section className="tenant-analytics-panel">
            <header><h2>{copy.latestProducts}</h2></header>
            <DataTable
              columns={[
                { key: "name", label: copy.product },
                { key: "slug", label: "Slug" },
                { key: "visible", label: copy.status, render: (row) => (row.visible ? copy.visible : copy.hidden) },
              ]}
              empty={copy.emptyTable}
              language={language}
              rows={report.products.latest}
            />
          </section>

          <section className="tenant-analytics-panel">
            <header><h2>{copy.topCities}</h2></header>
            <p className="analytics-reports-hint">{copy.citiesHint}</p>
            <CountBars empty={copy.emptyCities} items={report.delivery.top_cities.map((row) => ({ status: row.city, count: row.count }))} labelKey="status" />
          </section>

          <section className="tenant-analytics-panel">
            <header><h2>{copy.activity}</h2></header>
            <DataTable
              columns={[
                { key: "action", label: copy.action },
                { key: "actor_name", label: copy.actor },
                { key: "summary", label: copy.detail },
                { key: "created_at", label: copy.date, render: (row) => formatReportsWhen(row.created_at, language) },
              ]}
              empty={copy.emptyActivity}
              language={language}
              rows={report.activity.latest}
            />
          </section>

          <div className="tenant-analytics-grid two">
            <section className="tenant-analytics-panel">
              <header><h2>{copy.activityByAction}</h2></header>
              <CountBars empty={copy.emptyActivity} items={report.activity.by_action} labelKey="action" />
            </section>
            <section className="tenant-analytics-panel">
              <header><h2>{copy.activityByActor}</h2></header>
              <CountBars empty={copy.emptyActivity} items={report.activity.by_actor} labelKey="actor" />
            </section>
          </div>
        </>
      )}

      {unsupportedCatalog.length > 0 && (
        <section className="tenant-analytics-panel analytics-reports-unsupported">
          <header>
            <h2>{copy.otherReports}</h2>
          </header>
          <p className="analytics-reports-hint">{copy.otherHint}</p>
          <ul className="analytics-reports-unsupported-list">
            {unsupportedCatalog.map(([category, description]) => (
              <li key={category}>
                <div>
                  <strong>{category}</strong>
                  <span>{description}</span>
                </div>
                <button onClick={onUnsupported} type="button">{copy.openUnavailable}</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
