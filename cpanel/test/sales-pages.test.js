import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { createTranslator } from "../src/data/translations.js";
import {
  buildCostProfitSummary,
  buildOrderMetrics,
  buildPaymentRows,
  buildReceiptRows,
  buildSalesAnalytics,
  canUseSalesAction,
  canonicalOrderStatus,
  countableOrders,
  filterSalesOrders,
  formatCompanyCurrency,
  isCountableOrder,
  isCostPriceEnabled,
  isOpenOrderStatus,
  isSalesPage,
  normalizeOrderStatus,
  ORDER_STATUSES,
  orderDeliveryFee,
  orderItemsQuantity,
  orderStatusLabel,
  NON_COUNTABLE_STATUSES,
  salesDirection,
  salesPageKeys,
  showEbPointsColumn,
} from "../src/utils/sales.js";

const salesSource = fs.readFileSync(new URL("../src/pages/AdminSalesPage.jsx", import.meta.url), "utf8");
const appSource = fs.readFileSync(new URL("../src/CPanelApp.jsx", import.meta.url), "utf8");
const salesCss = fs.readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");

const orders = [
  { id: "o1", createdAt: "2026-07-01T10:00:00Z", customer: { city: "Ramallah", email: "one@example.test", name: "One" }, delivery_price: 5, items: [{ productId: "p1", quantity: 2, price: 10, lineTotal: 20 }], paymentMethod: "Cash", status: "Completed", total: 20 },
  { id: "o2", createdAt: "2026-07-02T10:00:00Z", customer: { city: "Nablus", email: "one@example.test", name: "One" }, deliveryPrice: 3, items: [{ productId: "p2", quantity: 1, price: 10 }], status: "Pending", total: 10 },
  { id: "o3", createdAt: "2026-07-03T10:00:00Z", customer: { phone: "123", name: "Two" }, items: [], receiptNumber: "r3", status: "Processing", total: 0 },
];

test("all requested tenant Sales routes render through the centralized Sales page", () => {
  assert.equal(salesPageKeys.length, 8);
  assert.equal(isSalesPage("admin-orders"), true);
  assert.equal(isSalesPage("admin-tenant-placeholder-sales-payments-receipts"), true);
  assert.equal(isSalesPage("admin-products"), false);
  assert.match(appSource, /salesPageKeys\.includes\(activePage\)[\s\S]*?<AdminSalesPage/);
});

test("Sales metrics are calculated only from real loaded orders", () => {
  assert.deepEqual(buildOrderMetrics(orders), {
    averageOrderValue: 10,
    cancelledOrders: 0,
    completedOrders: 1,
    customers: 2,
    delivery: 8,
    finalTotal: 30,
    orders: 3,
    pendingOrders: 2,
    quantity: 3,
    sales: 30,
    totalSales: 30,
  });
  const analytics = buildSalesAnalytics(orders, [{ id: "p1", name: { en: "Serum" } }, { id: "p2", name: { en: "Cream" } }], "en");
  assert.deepEqual(analytics.topProducts.map((item) => item.key), ["Serum", "Cream"]);
  assert.equal(analytics.customerMix.newCustomers, 2);
  assert.equal(analytics.customerMix.returningOrders, 1);
  assert.deepEqual(analytics.ordersOverTime.map((item) => item.orders), [1, 1, 1]);
  assert.deepEqual(analytics.sources, []);
});

test("orders, payments, and receipts expose only existing records", () => {
  assert.deepEqual(filterSalesOrders(orders, { query: "nablus", status: "pending" }).map((item) => item.id), ["o2"]);
  assert.deepEqual(filterSalesOrders(orders, { query: "nablus", status: "Awaiting Employee Review" }).map((item) => item.id), ["o2"]);
  assert.deepEqual(filterSalesOrders(orders, { status: "Confirmation 1" }).map((item) => item.id), ["o3"]);
  assert.deepEqual(filterSalesOrders(orders, { status: "Processing" }).map((item) => item.id), ["o3"]);
  assert.deepEqual(filterSalesOrders(orders, { customer: "one@example.test", from: "2026-07-02", to: "2026-07-02" }).map((item) => item.id), ["o2"]);
  assert.equal(buildPaymentRows(orders).length, 3);
  assert.deepEqual(buildReceiptRows(orders).map((item) => item.id), ["r3"]);
  assert.match(salesSource, /data-sales-empty-state/);
  assert.match(salesSource, /function OrderDetailDialog/);
  assert.match(salesSource, /onViewOrder=\{setSelectedOrder\}/);
});

test("Sales actions respect tenant order permissions", () => {
  assert.equal(canUseSalesAction({ role: "company_admin" }, "addOrder"), true);
  assert.equal(canUseSalesAction({ role: "employee", permissions: ["orders.view"] }, "addOrder"), false);
  assert.equal(canUseSalesAction({ role: "employee", permissions: ["orders.view", "orders.create"] }, "addOrder"), true);
  assert.equal(canUseSalesAction({ role: "employee", permissions: ["orders.view"] }, "updateOrder"), false);
  assert.match(salesSource, /canUseSalesAction\(currentUser, "addOrder"\)/);
});

test("Sales pages render one page heading and hide the duplicate shell heading", () => {
  assert.match(salesSource, /<AdminLayout[\s\S]*?hideHeader/);
  assert.match(salesSource, /function SalesPageHeader/);
  assert.equal((salesSource.match(/data-sales-page-header/g) || []).length, 1);
});

test("company currency formatting uses locale safely without RTL control artifacts", () => {
  const formatted = formatCompanyCurrency(1234.5, { settings: { currency: "USD", locale: "ar-PS" } }, "ar");
  assert.match(formatted, /USD/);
  assert.match(formatted, /1[,.]234[,.]50/);
  assert.doesNotMatch(formatted, /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/);
  assert.match(formatCompanyCurrency(20, { settings: { currency: "EUR", locale: "en-US" } }, "en"), /€|EUR/);
});

test("Add Order uses the existing scoped createOrder API and refreshes real orders", () => {
  assert.match(appSource, /import \{ assignOrderEmployee, createOrder, deleteOrder, getOrders, updateOrderStatus \}/);
  assert.match(appSource, /async function handleCreateManualOrder\(payload\)[\s\S]*?createOrder\([\s\S]*?await refreshOrders\(\)/);
  assert.match(salesSource, /onCreateOrder\(\{[\s\S]*?customer,[\s\S]*?items:/);
});

test("unsupported Sales actions reuse the shared bilingual under-development content", () => {
  assert.match(salesSource, /AdminUnderDevelopmentContent/);
  assert.match(salesSource, /setShowUnsupported\(true\)/);
  assert.match(salesSource, /role="dialog"/);
});

test("each Sales empty state uses a page-specific original illustration", () => {
  for (const illustration of ["orders", "subscription", "gift", "payment", "receipt", "cart"]) {
    assert.match(salesSource, new RegExp(`type=\\"${illustration}\\"|illustration=\\"${illustration}\\"`));
  }
  assert.match(salesSource, /sales-gift-hero/);
  assert.match(salesSource, /sales-automation-card/);
  assert.match(salesSource, /sales-summary-bar/);
});

test("Sales pages explicitly support English LTR and Arabic RTL", () => {
  assert.equal(salesDirection("en"), "ltr");
  assert.equal(salesDirection("ar"), "rtl");
  assert.match(salesSource, /dir=\{salesDirection\(language\)\}/);
  assert.match(salesCss, /\[dir="rtl"\] \.sales-page-header/);
});

test("Sales layout has responsive Wix-style cards, tables, and empty states", () => {
  const scoped = salesCss.slice(salesCss.indexOf("\/\* Tenant Sales module \*\/"));
  assert.match(scoped, /\.sales-kpi-grid\.four \{ grid-template-columns: repeat\(4, minmax\(0, 1fr\)\); \}/);
  assert.match(scoped, /\.sales-kpi-card,[\s\S]*?\.sales-data-card,[\s\S]*?border-radius: 12px/);
  assert.match(scoped, /@media \(max-width: 760px\)[\s\S]*?\.sales-kpi-grid\.three/);
});

test("Orders table prioritizes server delivery zone over legacy customer city", () => {
  const ordersTableSource = fs.readFileSync(new URL("../src/components/AdminOrdersTable.jsx", import.meta.url), "utf8");
  assert.match(ordersTableSource, /order\.delivery_city_name[\s\S]*?order\.customer\?\.city/);
  assert.match(ordersTableSource, /order\.delivery_region \|\| order\.deliveryZone\?\.region/);
  assert.match(ordersTableSource, /storedDeliveryFeeLabel\(order, formatAmount, t\)/);
  assert.doesNotMatch(ordersTableSource, /deliveryZone\.delivery_price|zone\.delivery_price\s*\*|recalculate/);
});

test("Orders table uses the shared admin-data-table system with sticky actions", () => {
  const ordersTableSource = fs.readFileSync(new URL("../src/components/AdminOrdersTable.jsx", import.meta.url), "utf8");
  assert.match(ordersTableSource, /className="admin-data-table-wrap"/);
  assert.match(ordersTableSource, /className="admin-data-table"/);
  assert.match(ordersTableSource, /className="admin-data-table-actions"/);
  assert.match(ordersTableSource, /admin-data-table-cell-clip/);
  assert.match(ordersTableSource, /aria-label=\{t\("admin\.delete"\)\}/);
  assert.doesNotMatch(ordersTableSource, /admin-table-wrap/);
  assert.doesNotMatch(ordersTableSource, /className="admin-table"/);
});

test("Order detail dialog surfaces delivery zone, region, and authoritative server fee", () => {
  assert.match(salesSource, /function OrderDetailDialog\(\{[^)]*t\b[^)]*\}\)/);
  assert.match(salesSource, /order\.delivery_city_name [^\n]*order\.deliveryZone/);
  assert.match(salesSource, /order\.delivery_price \?\? order\.deliveryPrice/);
  assert.match(salesSource, /t\("sales\.deliveryFree"\)/);
  assert.match(salesSource, /order=\{selectedOrder\} t=\{t\} \/>/);
  assert.match(salesSource, /<h3>\{t\("sales\.delivery"\)\}<\/h3>/);
});

test("Delivery i18n labels exist in both English and Arabic dictionaries", () => {
  const translationsSource = fs.readFileSync(new URL("../src/data/translations.js", import.meta.url), "utf8");
  assert.match(translationsSource, /deliveryFree: "Free delivery"/);
  assert.match(translationsSource, /deliveryFree: "توصيل مجاني"/);
  assert.match(translationsSource, /deliveryZone: "Delivery zone"/);
  assert.match(translationsSource, /deliveryFee: "Delivery fee"/);
  assert.match(salesSource, /countableNote: "Metrics use countable orders only/);
  assert.match(salesSource, /delivery: "Delivery"/);
  assert.match(salesSource, /finalTotal: "Final total"/);
  assert.match(salesSource, /monthlySales: "Monthly sales"/);
  assert.match(salesSource, /costUnavailable: "Cost unavailable"/);
});

test("non-countable statuses never inflate honest metrics", () => {
  assert.deepEqual([...NON_COUNTABLE_STATUSES].sort(), ["canceled", "cancelled", "refunded", "returned", "void", "voided"]);
  for (const status of ["cancelled", "Cancelled", "CANCELLED", "canceled", "refunded", "returned", "Returned", "void", "voided", " VOIDED "]) {
    assert.equal(isCountableOrder({ status }), false);
  }
  for (const status of ["Pending", "Processing", "Awaiting Delivery", "Completed", "Delivered", "Confirmed", ""]) {
    assert.equal(isCountableOrder({ status }), true);
  }
  assert.equal(orderItemsQuantity({ items: [{ quantity: 2 }, { qty: 3 }, {}] }), 5);
  assert.equal(orderDeliveryFee({ delivery_price: 4 }), 4);
  assert.equal(orderDeliveryFee({ deliveryPrice: "6.5" }), 6.5);
  assert.equal(orderDeliveryFee({}), 0);
  assert.equal(isCostPriceEnabled({}), false);
  assert.equal(isCostPriceEnabled({ settings: { costPriceEnabled: true } }), true);

  const mixed = [
    { id: "m1", createdAt: "2026-08-05T10:00:00Z", customer: { email: "a@test" }, delivery_price: 4, items: [{ productId: "p1", quantity: 2, price: 10, lineTotal: 20 }], status: "Pending", total: 24 },
    { id: "m2", createdAt: "2026-08-06T10:00:00Z", customer: { email: "b@test" }, delivery_price: 6, items: [{ productId: "p1", qty: 3, price: 5, lineTotal: 15 }], status: "Processing", total: 21 },
    { id: "m3", createdAt: "2026-08-06T12:00:00Z", customer: { email: "c@test" }, delivery_price: 2, items: [{ productId: "p2", quantity: 1, price: 30, lineTotal: 30 }], status: "Completed", total: 32 },
    { id: "m8", createdAt: "2026-08-07T10:00:00Z", customer: { email: "h@test" }, items: [{ productId: "p1", quantity: 1, price: 7, lineTotal: 7 }], status: "Completed", total: 7 },
    { id: "m4", createdAt: "2026-08-06T13:00:00Z", customer: { email: "d@test" }, delivery_price: 100, items: [{ productId: "p1", quantity: 50, price: 10, lineTotal: 500 }], status: "Cancelled", total: 600 },
    { id: "m5", createdAt: "2026-09-01T10:00:00Z", customer: { email: "e@test" }, delivery_price: 100, items: [{ productId: "p2", quantity: 40, price: 10, lineTotal: 400 }], status: "Canceled", total: 500 },
    { id: "m6", createdAt: "2026-09-02T10:00:00Z", customer: { email: "f@test" }, delivery_price: 100, items: [{ productId: "p1", quantity: 30, price: 10, lineTotal: 300 }], status: "Refunded", total: 400 },
    { id: "m7", createdAt: "2026-09-03T10:00:00Z", customer: { email: "g@test" }, items: [{ productId: "p2", quantity: 20, price: 10, lineTotal: 200 }], status: "Void", total: 200 },
  ];
  assert.deepEqual(countableOrders(mixed).map((order) => order.id), ["m1", "m2", "m3", "m8"]);
  const metrics = buildOrderMetrics(mixed);
  assert.equal(metrics.orders, 4);
  assert.equal(metrics.quantity, 7);
  assert.equal(metrics.sales, 84);
  assert.equal(metrics.delivery, 12);
  assert.equal(metrics.finalTotal, 84);
  assert.equal(metrics.averageOrderValue, 21);
  assert.equal(metrics.cancelledOrders, 4);
  const products = [{ id: "p1", name: { en: "Serum" } }, { id: "p2", name: { en: "Cream" } }];
  const analytics = buildSalesAnalytics(mixed, products, "en", {});
  assert.equal(analytics.countableOrders, 4);
  assert.equal(analytics.excludedOrders, 4);
  assert.deepEqual(analytics.topProducts.map((item) => item.key), ["Serum", "Cream"]);
  assert.deepEqual(analytics.topProducts.map((item) => item.quantity), [6, 1]);
  assert.deepEqual(analytics.daily.map((item) => item.key), ["2026-08-05", "2026-08-06", "2026-08-07"]);
  assert.deepEqual(analytics.daily.map((item) => item.orders), [1, 2, 1]);
  assert.deepEqual(analytics.monthly.map((item) => item.key), ["2026-08"]);
  assert.equal(analytics.monthly[0].orders, 4);
  assert.equal(analytics.monthly[0].sales, 84);
  assert.equal(analytics.metrics.quantity, 7);
  assert.equal(analytics.metrics.cancelledOrders, 4);
  assert.equal(analytics.metrics.orders, 4);
  assert.equal(analytics.costProfit.supported, false);
  assert.equal(buildCostProfitSummary(countableOrders(mixed), {}).supported, false);
  const costed = countableOrders(mixed).map((order) => ({
    ...order,
    items: (order.items || []).map((item) => ({ ...item, costPrice: 1 })),
  }));
  const costSummary = buildCostProfitSummary(costed, { settings: { costPriceEnabled: true } });
  assert.equal(costSummary.supported, true);
  assert.equal(costSummary.cost, 7);
  assert.equal(costSummary.profit, 77);
  assert.match(salesSource, /sales-summary-bar-honest/);
  assert.match(salesSource, /sales-monthly-card/);
});

test("order statuses come from one shared list with EN and AR labels", () => {
  assert.deepEqual(
    [...ORDER_STATUSES],
    ["Awaiting Employee Review", "Confirmation 1", "Confirmation 2", "Awaiting Delivery", "Completed", "Returned", "Cancelled"],
  );

  const table = fs.readFileSync(new URL("../src/components/AdminOrdersTable.jsx", import.meta.url), "utf8");
  assert.match(table, /ORDER_STATUSES\.map\(\(status\)/);
  assert.match(table, /value=\{canonicalOrderStatus\(order\.status\)\}/);
  assert.doesNotMatch(table, /const statuses = \[/);

  assert.match(salesSource, /ORDER_STATUSES\.map\(\(item\)/);
  assert.match(salesSource, /t\(`status\.\$\{item\}`\)/);
  assert.match(salesSource, /const key = canonicalOrderStatus\(order\.status\) \|\| "Unknown"/);

  const employeeSource = fs.readFileSync(new URL("../src/pages/EmployeeDashboardPage.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(employeeSource, /const statuses = \["Pending"/);
  assert.doesNotMatch(employeeSource, /order\.status === "Pending"/);
  assert.match(employeeSource, /isOpenOrderStatus\(order\.status\)/);
  assert.match(employeeSource, /canonicalOrderStatus\(order\.status\) === "Completed"/);

  const badge = fs.readFileSync(new URL("../src/components/StatusBadge.jsx", import.meta.url), "utf8");
  assert.match(badge, /replace\(\/\\s\+\/g, "-"\)/);
  assert.match(badge, /canonicalOrderStatus\(status\)/);

  assert.match(salesCss, /\.status-awaiting-employee-review \{/);
  assert.match(salesCss, /\.status-confirmation-1 \{/);
  assert.match(salesCss, /\.status-confirmation-2 \{/);
  assert.match(salesCss, /\.status-awaiting-delivery \{/);
  assert.match(salesCss, /\.status-returned \{/);

  const t = (key) => ({
    "status.Awaiting Delivery": "Awaiting Delivery",
    "status.Completed": "Completed",
    "status.Shipped": "status.Shipped",
  }[key] ?? key);
  assert.equal(orderStatusLabel(t, "Awaiting Delivery"), "Awaiting Delivery");
  assert.equal(orderStatusLabel(t, "Completed"), "Completed");
  assert.equal(orderStatusLabel(t, "Shipped"), "Shipped");
  assert.equal(orderStatusLabel(t, ""), "");
  assert.equal(orderStatusLabel(undefined, "Returned"), "Returned");

  assert.match(salesSource, /orderStatusLabel\(t, order\.status\) \|\| "—"/);
  assert.match(salesSource, /\{ key: orderStatusLabel\(t, key\), quantity: count \}/);
});

test("order status labels exist in both English and Arabic dictionaries", () => {
  const en = createTranslator("en");
  const ar = createTranslator("ar");

  assert.equal(en("status.Awaiting Employee Review"), "Awaiting Employee Review");
  assert.equal(en("status.Confirmation 1"), "Confirmation 1");
  assert.equal(en("status.Confirmation 2"), "Confirmation 2");
  assert.equal(en("status.Awaiting Delivery"), "Awaiting Delivery");
  assert.equal(en("status.Completed"), "Completed");
  assert.equal(en("status.Returned"), "Return / Returned");
  assert.equal(en("status.Cancelled"), "Cancelled");

  assert.equal(ar("status.Awaiting Employee Review"), "بانتظار مراجعة الموظف");
  assert.equal(ar("status.Confirmation 1"), "تأكيد 1");
  assert.equal(ar("status.Confirmation 2"), "تأكيد 2");
  assert.equal(ar("status.Awaiting Delivery"), "في انتظار التوصيل");
  assert.equal(ar("status.Completed"), "مكتمل");
  assert.equal(ar("status.Returned"), "استرجاع");
  assert.equal(ar("status.Cancelled"), "ملغي");
});

test("legacy Pending and Processing rows interpret under the new workflow names", () => {
  assert.equal(canonicalOrderStatus("Pending"), "Awaiting Employee Review");
  assert.equal(canonicalOrderStatus("pending"), "Awaiting Employee Review");
  assert.equal(canonicalOrderStatus("Processing"), "Confirmation 1");
  assert.equal(canonicalOrderStatus("processing"), "Confirmation 1");
  assert.equal(canonicalOrderStatus("Confirmation 1"), "Confirmation 1");
  assert.equal(canonicalOrderStatus("confirmation 2"), "Confirmation 2");
  assert.equal(canonicalOrderStatus("Awaiting Delivery"), "Awaiting Delivery");
  assert.equal(canonicalOrderStatus("Shipped"), "Shipped");
  assert.equal(canonicalOrderStatus(""), "");

  const en = createTranslator("en");
  const ar = createTranslator("ar");
  assert.equal(orderStatusLabel(en, "Pending"), "Awaiting Employee Review");
  assert.equal(orderStatusLabel(en, "Processing"), "Confirmation 1");
  assert.equal(orderStatusLabel(ar, "Pending"), "بانتظار مراجعة الموظف");
  assert.equal(orderStatusLabel(ar, "Processing"), "تأكيد 1");
  assert.equal(orderStatusLabel(ar, "Awaiting Delivery"), "في انتظار التوصيل");
  assert.equal(orderStatusLabel(en, "Confirmation 2"), "Confirmation 2");

  assert.equal(isOpenOrderStatus("Pending"), true);
  assert.equal(isOpenOrderStatus("Confirmation 1"), true);
  assert.equal(isOpenOrderStatus("Confirmation 2"), true);
  assert.equal(isOpenOrderStatus("Awaiting Delivery"), true);
  assert.equal(isOpenOrderStatus("Completed"), false);
  assert.equal(isOpenOrderStatus("Returned"), false);
  assert.equal(isOpenOrderStatus("Cancelled"), false);

  assert.equal(isCountableOrder({ status: "Returned" }), false);
  assert.equal(isCountableOrder({ status: "Pending" }), true);
  assert.equal(buildPaymentRows([{ status: "Pending" }])[0].status, "Awaiting Employee Review");
  assert.equal(buildPaymentRows([{ paymentStatus: "paid", status: "Pending" }])[0].status, "paid");
});

test("EB Points column renders only for companies whose tenant setting allows it", () => {
  assert.equal(showEbPointsColumn({}), false);
  assert.equal(showEbPointsColumn({ id: "kids-velvet" }), false);
  assert.equal(showEbPointsColumn({ id: "eb-chemical", isDefault: true }), true);
  assert.equal(showEbPointsColumn({ isDefault: true, settings: {} }), true);
  assert.equal(showEbPointsColumn({ isDefault: true, settings: { ebPointsEnabled: false } }), false);
  assert.equal(showEbPointsColumn({ isDefault: false, settings: { ebPointsEnabled: true } }), true);

  const table = fs.readFileSync(new URL("../src/components/AdminOrdersTable.jsx", import.meta.url), "utf8");
  assert.match(table, /const showEbPoints = showEbPointsColumn\(company\)/);
  assert.match(table, /\{showEbPoints && <th>[^\n]*EB Points/);
  assert.match(table, /\{showEbPoints && <td>\{Math\.max\(0, Number\(order\.pointsEarned/);

  assert.match(salesSource, /company=\{company\} currency=\{company\?\.settings\?\.currency\}/);

  const dashboardSource = fs.readFileSync(new URL("../src/pages/AdminDashboardPage.jsx", import.meta.url), "utf8");
  assert.match(dashboardSource, /<AdminOrdersTable company=\{company\}/);

  const contextSource = fs.readFileSync(new URL("../src/utils/companyContext.js", import.meta.url), "utf8");
  assert.match(contextSource, /ebPointsEnabled: settings\.ebPointsEnabled/);
});
