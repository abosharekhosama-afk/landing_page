export const REPORTS_PRESETS = Object.freeze(["7d", "30d", "90d", "custom"]);

export const EMPTY_REPORTS_SUMMARY = Object.freeze({
  range: { date_from: "", date_to: "" },
  summary: {
    orders_count: 0,
    revenue_total: 0,
    pending_orders: 0,
    completed_orders: 0,
    invoices_count: 0,
    paid_invoices: 0,
    void_invoices: 0,
    products_count: 0,
    customers_count: 0,
    delivery_zones_count: 0,
  },
  orders: { by_status: [], latest: [] },
  invoices: { by_status: [], latest: [] },
  products: { visible: 0, hidden: 0, latest: [] },
  delivery: { enabled: 0, disabled: 0, top_cities: [] },
  activity: { latest: [], by_action: [], by_actor: [] },
});

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asText(value) {
  return value == null ? "" : String(value);
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function reportsRangeForPreset(preset, customFrom = "", customTo = "", now = new Date()) {
  const to = new Date(now);
  if (preset === "custom") {
    const fromDate = customFrom ? startOfDay(customFrom) : startOfDay(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
    const toDate = customTo ? endOfDay(customTo) : to;
    return { date_from: fromDate.toISOString(), date_to: toDate.toISOString() };
  }
  const days = preset === "7d" ? 7 : preset === "90d" ? 90 : 30;
  const from = startOfDay(new Date(to.getTime() - (days - 1) * 24 * 60 * 60 * 1000));
  return { date_from: from.toISOString(), date_to: to.toISOString() };
}

export function normalizeReportsSummary(payload) {
  if (!payload || typeof payload !== "object") return structuredClone(EMPTY_REPORTS_SUMMARY);
  const summary = payload.summary && typeof payload.summary === "object" ? payload.summary : {};
  const orders = payload.orders && typeof payload.orders === "object" ? payload.orders : {};
  const invoices = payload.invoices && typeof payload.invoices === "object" ? payload.invoices : {};
  const products = payload.products && typeof payload.products === "object" ? payload.products : {};
  const delivery = payload.delivery && typeof payload.delivery === "object" ? payload.delivery : {};
  const activity = payload.activity && typeof payload.activity === "object" ? payload.activity : {};
  const range = payload.range && typeof payload.range === "object" ? payload.range : {};

  return {
    range: {
      date_from: asText(range.date_from),
      date_to: asText(range.date_to),
    },
    summary: {
      orders_count: asNumber(summary.orders_count),
      revenue_total: asNumber(summary.revenue_total),
      pending_orders: asNumber(summary.pending_orders),
      completed_orders: asNumber(summary.completed_orders),
      invoices_count: asNumber(summary.invoices_count),
      paid_invoices: asNumber(summary.paid_invoices),
      void_invoices: asNumber(summary.void_invoices),
      products_count: asNumber(summary.products_count),
      customers_count: asNumber(summary.customers_count),
      delivery_zones_count: asNumber(summary.delivery_zones_count),
    },
    orders: {
      by_status: asList(orders.by_status).map((row) => ({
        status: asText(row?.status) || "Unknown",
        count: asNumber(row?.count),
      })),
      latest: asList(orders.latest).map((row) => ({
        id: asText(row?.id),
        customer_name: asText(row?.customer_name),
        total: asNumber(row?.total),
        status: asText(row?.status),
        created_at: asText(row?.created_at),
      })),
    },
    invoices: {
      by_status: asList(invoices.by_status).map((row) => ({
        status: asText(row?.status) || "Unknown",
        count: asNumber(row?.count),
      })),
      latest: asList(invoices.latest).map((row) => ({
        id: asText(row?.id),
        invoice_number: asText(row?.invoice_number),
        customer_name: asText(row?.customer_name),
        total: asNumber(row?.total),
        status: asText(row?.status),
        created_at: asText(row?.created_at),
      })),
    },
    products: {
      visible: asNumber(products.visible),
      hidden: asNumber(products.hidden),
      latest: asList(products.latest).map((row) => ({
        id: asText(row?.id),
        name: asText(row?.name),
        slug: asText(row?.slug),
        visible: row?.visible !== false,
      })),
    },
    delivery: {
      enabled: asNumber(delivery.enabled),
      disabled: asNumber(delivery.disabled),
      top_cities: asList(delivery.top_cities).map((row) => ({
        city: asText(row?.city),
        count: asNumber(row?.count),
      })),
    },
    activity: {
      latest: asList(activity.latest).map((row) => ({
        id: asText(row?.id),
        action: asText(row?.action),
        actor_name: asText(row?.actor_name),
        entity_type: asText(row?.entity_type),
        entity_label: asText(row?.entity_label),
        summary: asText(row?.summary),
        created_at: asText(row?.created_at),
      })),
      by_action: asList(activity.by_action).map((row) => ({
        action: asText(row?.action) || "Unknown",
        count: asNumber(row?.count),
      })),
      by_actor: asList(activity.by_actor).map((row) => ({
        actor: asText(row?.actor) || "Unknown",
        count: asNumber(row?.count),
      })),
    },
  };
}

export function reportsSummaryMetric(payload, key) {
  if (!payload || typeof payload !== "object") return null;
  const summary = payload.summary && typeof payload.summary === "object" ? payload.summary : null;
  if (!summary || !Object.prototype.hasOwnProperty.call(summary, key)) return null;
  if (!Object.prototype.hasOwnProperty.call(EMPTY_REPORTS_SUMMARY.summary, key)) return null;
  const raw = summary[key];
  if (typeof raw !== "number" && typeof raw !== "string") return null;
  if (raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function reportsHasPeriodRecords(report) {
  if (!report) return false;
  return report.summary.orders_count > 0
    || report.summary.invoices_count > 0
    || report.activity.latest.length > 0;
}

export function countBarWidth(count, items) {
  const max = Math.max(1, ...asList(items).map((item) => asNumber(item?.count)));
  return `${Math.round((asNumber(count) / max) * 100)}%`;
}

export function formatReportsWhen(value, language = "en") {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(language === "ar" ? "ar" : "en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}
