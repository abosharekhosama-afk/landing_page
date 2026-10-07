import { hasPermission } from "../data/permissions.js";
import { canAccessAdminPage, isTenantOperator } from "./roles.js";

export const salesPageKeys = Object.freeze([
  "admin-orders",
  "admin-tenant-placeholder-sales-subscriptions",
  "admin-tenant-placeholder-sales-gift-card-sales",
  "admin-tenant-placeholder-sales-payments-all",
  "admin-tenant-placeholder-sales-payments-receipts",
  "admin-tenant-placeholder-sales-analytics-overview",
  "admin-tenant-placeholder-sales-analytics-subscriptions",
  "admin-tenant-placeholder-sales-abandoned-carts",
]);

export function isSalesPage(pageKey) {
  return salesPageKeys.includes(pageKey);
}

/** Canonical order statuses offered by the CPanel Orders table + filters. */
export const ORDER_STATUSES = Object.freeze([
  "Awaiting Employee Review",
  "Confirmation 1",
  "Confirmation 2",
  "Awaiting Delivery",
  "Completed",
  "Returned",
  "Cancelled",
]);

export const LEGACY_STATUS_ALIASES = Object.freeze({
  pending: "Awaiting Employee Review",
  processing: "Confirmation 1",
});

const CANONICAL_STATUS_BY_LOWER = new Map(
  ORDER_STATUSES.map((status) => [status.toLocaleLowerCase(), status]),
);

export function canonicalOrderStatus(status = "") {
  const raw = String(status || "").trim();
  if (!raw) return "";
  const lower = raw.toLocaleLowerCase();
  const aliased = LEGACY_STATUS_ALIASES[lower];
  if (aliased) return aliased;
  return CANONICAL_STATUS_BY_LOWER.get(lower) || raw;
}

export function showEbPointsColumn(company = {}) {
  const configured = company?.settings?.ebPointsEnabled;
  if (typeof configured === "boolean") return configured;
  return company?.isDefault === true;
}

export function orderStatusLabel(t, status) {
  const canonical = canonicalOrderStatus(status);
  if (!canonical) return "";
  const label = typeof t === "function" ? t(`status.${canonical}`) : "";
  return label && label !== `status.${canonical}` ? label : canonical;
}

function amount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Honest Sales & Orders metrics — countable orders only.
 *
 * Countable = every order EXCEPT statuses/aliases matching
 * (case-insensitive): cancelled, canceled, refunded, void, voided, returned.
 * Non-countable orders never inflate: orders count, quantity, sales,
 * delivery, best sellers, or analytics charts. They are still counted
 * separately as `cancelledOrders` (info-only) for transparency.
 */
export const NON_COUNTABLE_STATUSES = Object.freeze([
  "cancelled",
  "canceled",
  "refunded",
  "returned",
  "void",
  "voided",
]);

export function normalizeOrderStatus(status = "") {
  return String(status || "").trim().toLocaleLowerCase();
}

const COMPLETED_ORDER_STATUSES = Object.freeze([
  "completed",
  "complete",
  "confirmed",
  "paid",
  "delivered",
]);

export function isOpenOrderStatus(status = "") {
  const canonical = canonicalOrderStatus(status).toLocaleLowerCase();
  if (COMPLETED_ORDER_STATUSES.includes(canonical)) return false;
  return !NON_COUNTABLE_STATUSES.includes(canonical);
}

export function isCountableOrder(order = {}) {
  return !NON_COUNTABLE_STATUSES.includes(normalizeOrderStatus(order.status));
}

export function countableOrders(orders = []) {
  return (Array.isArray(orders) ? orders : []).filter(isCountableOrder);
}

/** Sum of actual ordered item quantities (quantity ?? qty). Never line-count. */
export function orderItemsQuantity(order = {}) {
  const items = Array.isArray(order.items) ? order.items : [];
  return items.reduce((sum, item) => {
    const qty = amount(item.quantity ?? item.qty);
    return sum + Math.max(0, qty);
  }, 0);
}

/**
 * Real stored delivery fee. Safely handles missing/legacy values → 0.
 * Never recalculates from zones.
 */
export function orderDeliveryFee(order = {}) {
  const raw = order.delivery_price ?? order.deliveryPrice ?? order.deliveryFee;
  if (raw == null || raw === "") return 0;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function orderLineCost(item = {}) {
  const raw = item.costPrice ?? item.cost_price ?? item.cost ?? item.unitCost;
  if (raw == null || raw === "") return NaN;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
}

export function isCostPriceEnabled(company = {}) {
  return company?.settings?.costPriceEnabled === true;
}

/**
 * Cost / Profit gate. Only supported when the company cost-price setting
 * is enabled AND every involved order line carries reliable (finite, >= 0)
 * cost data. Otherwise returns { supported: false } — callers must hide
 * cost/profit or render "Cost unavailable". Never estimate.
 */
export function buildCostProfitSummary(countable = [], company = {}) {
  const orders = (Array.isArray(countable) ? countable : []).filter(isCountableOrder);
  const lines = [];
  orders.forEach((order) => {
    (Array.isArray(order.items) ? order.items : []).forEach((item) => lines.push(item));
  });
  if (!isCostPriceEnabled(company)) {
    return { supported: false, reason: "cost-setting-disabled", cost: 0, profit: 0 };
  }
  if (!lines.length) {
    return { supported: false, reason: "no-cost-lines", cost: 0, profit: 0 };
  }
  let cost = 0;
  for (const item of lines) {
    const unit = orderLineCost(item);
    if (!Number.isFinite(unit)) {
      return { supported: false, reason: "cost-unavailable", cost: 0, profit: 0 };
    }
    cost += unit * Math.max(0, amount(item.quantity ?? item.qty));
  }
  const sales = orders.reduce((sum, order) => sum + amount(order.total), 0);
  return { supported: true, reason: "ok", cost, profit: sales - cost };
}

function customerKey(customer = {}) {
  return customer.email || customer.phone || customer.id || customer.name || "";
}

/**
 * Honest order metrics — countable orders only.
 * - Orders: count of countable orders.
 * - Quantity: Σ item (quantity ?? qty) from countable orders (never line-count).
 * - Sales: Σ stored order.total from countable orders.
 * - Delivery: Σ stored delivery fee (delivery_price ?? deliveryPrice ?? deliveryFee → 0).
 * - Final Total: Σ stored order.total (order.total already includes delivery —
 *   never add delivery twice; delivery is shown separately for transparency).
 * Non-countable orders are reported as `cancelledOrders` (info-only) and
 * never inflate any sum.
 */
export function buildOrderMetrics(orders = []) {
  const list = Array.isArray(orders) ? orders : [];
  const countable = list.filter(isCountableOrder);
  const sales = countable.reduce((sum, order) => sum + amount(order.total), 0);
  const quantity = countable.reduce((sum, order) => sum + orderItemsQuantity(order), 0);
  const delivery = countable.reduce((sum, order) => sum + orderDeliveryFee(order), 0);
  const customers = new Set(countable.map((order) => customerKey(order.customer)).filter(Boolean));
  const statusCounts = list.reduce(
    (counts, order) => {
      const status = normalizeOrderStatus(order.status || "pending");
      if (["completed", "complete", "confirmed", "paid", "delivered"].includes(status)) counts.completed += 1;
      else if (NON_COUNTABLE_STATUSES.includes(status)) counts.cancelled += 1;
      else counts.pending += 1;
      return counts;
    },
    { cancelled: 0, completed: 0, pending: 0 },
  );
  return {
    averageOrderValue: countable.length ? sales / countable.length : 0,
    cancelledOrders: statusCounts.cancelled,
    completedOrders: statusCounts.completed,
    customers: customers.size,
    delivery,
    finalTotal: sales,
    orders: countable.length,
    pendingOrders: statusCounts.pending,
    quantity,
    sales,
    totalSales: sales,
  };
}

export function filterSalesOrders(orders = [], filters = {}) {
  const query = String(filters.query || "").trim().toLocaleLowerCase();
  const status = String(filters.status || "all");
  const customer = String(filters.customer || "all").toLocaleLowerCase();
  const from = filters.from ? new Date(`${filters.from}T00:00:00`).getTime() : null;
  const to = filters.to ? new Date(`${filters.to}T23:59:59.999`).getTime() : null;

  return orders.filter((order) => {
    const orderStatus = canonicalOrderStatus(order.status);
    const createdAt = order.createdAt ? new Date(order.createdAt).getTime() : null;
    const haystack = [
      order.id,
      order.customer?.name,
      order.customer?.email,
      order.customer?.phone,
      order.customer?.city,
      order.paymentMethod,
    ].filter(Boolean).join(" ").toLocaleLowerCase();

    return (!query || haystack.includes(query))
      && (status === "all" || orderStatus === canonicalOrderStatus(status))
      && (customer === "all" || customerKey(order.customer).toLocaleLowerCase() === customer)
      && (!from || (createdAt && createdAt >= from))
      && (!to || (createdAt && createdAt <= to));
  });
}

export function buildPaymentRows(orders = []) {
  return orders.map((order) => ({
    amount: amount(order.total),
    customer: order.customer || {},
    date: order.createdAt || null,
    id: order.id,
    method: order.paymentMethod || "",
    orderReference: order.id,
    status: order.paymentStatus || canonicalOrderStatus(order.status) || "",
  }));
}

export function buildReceiptRows(orders = []) {
  return orders.filter((order) => order.receiptId || order.receiptNumber || order.receiptUrl).map((order) => ({
    amount: amount(order.total),
    customer: order.customer || {},
    date: order.createdAt || null,
    id: order.receiptId || order.receiptNumber || order.id,
    orderReference: order.id,
    url: order.receiptUrl || "",
  }));
}

function itemName(item = {}, products = [], language = "en") {
  const product = products.find((entry) => String(entry.id) === String(item.productId));
  const name = product?.name;
  if (typeof name === "string") return name;
  return name?.[language] || name?.en || name?.ar || item.productName || item.name || item.slug || item.productId || "";
}

function groupOrders(orders, keyForOrder) {
  const groups = new Map();
  orders.forEach((order) => {
    const key = keyForOrder(order);
    if (!key) return;
    const current = groups.get(key) || { key, orders: 0, sales: 0 };
    current.orders += 1;
    current.sales += amount(order.total);
    groups.set(key, current);
  });
  return [...groups.values()].sort((a, b) => b.sales - a.sales);
}

export function buildSalesAnalytics(orders = [], products = [], language = "en", company = {}) {
  const list = Array.isArray(orders) ? orders : [];
  const countable = list.filter(isCountableOrder);
  const productGroups = new Map();
  countable.forEach((order) => {
    (Array.isArray(order.items) ? order.items : []).forEach((item) => {
      const name = itemName(item, products, language);
      if (!name) return;
      const current = productGroups.get(name) || { key: name, quantity: 0, sales: 0 };
      const quantity = Math.max(0, amount(item.quantity ?? item.qty));
      current.quantity += quantity;
      current.sales += amount(item.lineTotal ?? amount(item.price) * quantity);
      productGroups.set(name, current);
    });
  });

  const daily = groupOrders(countable, (order) => (order.createdAt ? String(order.createdAt).slice(0, 10) : ""));
  const monthly = groupOrders(countable, (order) => (order.createdAt ? String(order.createdAt).slice(0, 7) : ""));
  const customerGroups = groupOrders(countable, (order) => customerKey(order.customer));
  const sources = groupOrders(countable, (order) => order.source || order.channel || "");
  const locations = groupOrders(countable, (order) => order.customer?.city || order.customer?.country || "");
  const returningOrders = customerGroups.reduce((sum, customer) => sum + Math.max(0, customer.orders - 1), 0);
  const costProfit = buildCostProfitSummary(countable, company);

  return {
    costProfit,
    countableOrders: countable.length,
    customerMix: {
      newCustomers: customerGroups.length,
      returningOrders,
    },
    daily: daily.sort((a, b) => a.key.localeCompare(b.key)),
    excludedOrders: list.length - countable.length,
    monthly: monthly.sort((a, b) => a.key.localeCompare(b.key)),
    monthlyOrders: monthly
      .slice()
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((entry) => ({ key: entry.key, orders: entry.orders })),
    ordersOverTime: daily.map((entry) => ({ key: entry.key, orders: entry.orders })),
    locations: locations.slice(0, 5),
    // Pass the full list so cancelled/pending/completed KPIs stay accurate;
    // sales/qty/delivery/finalTotal still use countable orders only inside.
    metrics: buildOrderMetrics(list),
    sources: sources.slice(0, 5),
    topCustomers: customerGroups.slice(0, 5),
    topProducts: [...productGroups.values()].sort((a, b) => b.sales - a.sales).slice(0, 5),
  };
}

export function salesDirection(language) {
  return language === "ar" ? "rtl" : "ltr";
}

export function formatCompanyCurrency(value, company = {}, language = "en") {
  const configuredCurrency = String(company?.settings?.currency || "ILS").toUpperCase();
  const currency = /^[A-Z]{3}$/.test(configuredCurrency) ? configuredCurrency : "ILS";
  const locale = company?.settings?.locale || (language === "ar" ? "ar-PS" : "en-US");
  try {
    const formatted = new Intl.NumberFormat(locale, {
      currency,
      currencyDisplay: language === "ar" ? "code" : "symbol",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      numberingSystem: language === "ar" ? "latn" : undefined,
      style: "currency",
    }).format(Number(value || 0));
    return formatted
      .replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
      .replace(/\s+/g, "\u00a0")
      .trim();
  } catch {
    return `${Number(value || 0).toFixed(2)}\u00a0${currency}`;
  }
}

export function canUseSalesAction(currentUser, action) {
  if (!canAccessAdminPage(currentUser, "admin-orders")) return false;
  if (isTenantOperator(currentUser?.role)) return true;
  const permissions = {
    addOrder: "orders.create",
    deleteOrder: "orders.delete",
    updateOrder: "orders.updateStatus",
  };
  return permissions[action] ? hasPermission(currentUser, permissions[action]) : true;
}
