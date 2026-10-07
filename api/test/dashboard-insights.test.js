import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDashboardInsights,
  computeProductMetrics,
  orderStatusBucket,
} from "../src/analytics/dashboardInsights.js";
import {
  aggregateSearchEvents,
  resolveSearchRedirect,
  validateSearchRedirectInput,
} from "../src/analytics/searchAnalytics.js";
import {
  aggregateVisitorAnalytics,
  countLiveVisitors,
  upsertVisitorSession,
} from "../src/analytics/visitorAnalytics.js";

test("orderStatusBucket maps known order statuses", () => {
  assert.equal(orderStatusBucket("Pending"), "new");
  assert.equal(orderStatusBucket("Processing"), "confirmed");
  assert.equal(orderStatusBucket("Shipped"), "out_for_delivery");
  assert.equal(orderStatusBucket("Awaiting Delivery"), "out_for_delivery");
  assert.equal(orderStatusBucket("Delivered"), "delivered");
  assert.equal(orderStatusBucket("Returned"), "returned");
  assert.equal(orderStatusBucket("Cancelled"), "cancelled");
  assert.equal(orderStatusBucket("unknown state"), "other");
});

test("computeProductMetrics counts stock states from real product records", () => {
  const metrics = computeProductMetrics([
    { id: "a", price: 10, stockQty: 24, isActive: true, visible: true },
    { id: "b", price: 0, stockQty: 0, isActive: true, visible: true },
    { id: "c", price: 5, stockQty: 2, isActive: false, visible: true },
    {
      id: "d",
      price: 12,
      isActive: true,
      visible: true,
      variants: [{ id: "v1", stock: 3 }, { id: "v2", stock: 0 }],
    },
  ]);
  assert.equal(metrics.total, 4);
  assert.equal(metrics.inStock, 2);
  assert.equal(metrics.outOfStock, 1);
  assert.equal(metrics.lowStock, 2);
  assert.equal(metrics.zeroPrice, 1);
  assert.equal(metrics.partiallyUnavailable, 1);
});

test("buildDashboardInsights derives alerts and sales periods without fake profit", () => {
  const insights = buildDashboardInsights({
    products: [{ id: "p1", name: "Soap", price: 0, stockQty: 0, isActive: true }],
    orders: [{
      id: "o1",
      status: "Pending",
      total: 30,
      delivery_price: 5,
      createdAt: new Date().toISOString(),
      items: [{ quantity: 2, price: 12.5 }],
      customer: { name: "Sam" },
    }],
    liveVisitors: 2,
  });
  assert.equal(insights.profitSupported, false);
  assert.ok(insights.alerts.some((alert) => alert.type === "price_zero"));
  assert.ok(insights.alerts.some((alert) => alert.type === "out_of_stock"));
  assert.equal(insights.latestSales.length, 1);
  assert.equal(insights.salesPeriods.find((row) => row.key === "today")?.ordersCount, 1);
  assert.equal(insights.liveVisitors.count, 2);
});

test("search redirect validation rejects loops when adding reverse mapping", () => {
  const existing = [
    {
      id: "1",
      inputTermNormalized: "lego",
      targetTermNormalized: "toys",
      isActive: true,
    },
  ];
  assert.throws(
    () => validateSearchRedirectInput("toys", "lego", existing),
    /loop/i,
  );
  const resolved = resolveSearchRedirect("lego", existing);
  assert.equal(resolved.term, "toys");
  assert.equal(resolved.redirected, true);
});

test("aggregateSearchEvents groups zero-result and successful searches", () => {
  const summary = aggregateSearchEvents([
    { termNormalized: "lego", termDisplay: "lego", resultsCount: 0, createdAt: "2026-09-01T10:00:00.000Z", siteId: "site-a" },
    { termNormalized: "lego", termDisplay: "lego", resultsCount: 3, createdAt: "2026-09-01T11:00:00.000Z", siteId: "site-a" },
    { termNormalized: "soap", termDisplay: "soap", resultsCount: 2, createdAt: "2026-09-01T09:00:00.000Z", siteId: "site-b" },
  ]);
  assert.equal(summary.allSearches.length, 2);
  assert.equal(summary.zeroResults.length, 0);
  assert.equal(summary.mostSearched[0].termNormalized, "lego");
  assert.equal(summary.totalEvents, 3);
  assert.equal(summary.searchesWithResults, 2);
  assert.equal(summary.zeroResultSearches, 1);

  const siteScoped = aggregateSearchEvents([
    { termNormalized: "lego", termDisplay: "lego", resultsCount: 1, createdAt: "2026-09-01T10:00:00.000Z", siteId: "site-a" },
    { termNormalized: "soap", termDisplay: "soap", resultsCount: 2, createdAt: "2026-09-01T09:00:00.000Z", siteId: "site-b" },
  ], { siteId: "site-a" });
  assert.equal(siteScoped.allSearches.length, 1);
  assert.equal(siteScoped.allSearches[0].termNormalized, "lego");
  assert.equal(siteScoped.totalEvents, 1);
  assert.equal(siteScoped.searchesWithResults, 1);
  assert.equal(siteScoped.zeroResultSearches, 0);
});

test("inactive redirect is ignored during resolution", () => {
  const resolved = resolveSearchRedirect("old", [{
    id: "1",
    inputTermNormalized: "old",
    targetTermNormalized: "new",
    isActive: false,
  }]);
  assert.equal(resolved.term, "old");
  assert.equal(resolved.redirected, false);
});

test("visitor live count expires stale sessions", () => {
  const now = new Date("2026-09-01T12:00:00.000Z");
  const sessions = upsertVisitorSession([], {
    companyId: "demo",
    siteId: "demo-store",
    sessionKey: "s1",
    visitorKey: "v1",
    path: "/",
    eventType: "pageview",
    now: new Date("2026-09-01T11:56:00.000Z"),
  });
  assert.equal(countLiveVisitors(sessions, { companyId: "demo", siteId: "demo-store", now }), 1);
  assert.equal(countLiveVisitors(sessions, {
    companyId: "demo",
    siteId: "demo-store",
    now: new Date("2026-09-01T12:06:00.000Z"),
  }), 0);
});

test("aggregateVisitorAnalytics exposes daily series from recorded sessions", () => {
  const now = new Date("2026-09-01T12:00:00.000Z");
  const sessions = upsertVisitorSession([], {
    companyId: "demo",
    siteId: "demo-store",
    sessionKey: "s1",
    visitorKey: "v1",
    path: "/",
    eventType: "pageview",
    now,
  });
  const summary = aggregateVisitorAnalytics(sessions, [], { companyId: "demo", siteId: "demo-store", now });
  assert.equal(summary.daily.totalVisitors, 1);
  assert.equal(summary.seriesByDay.length, 7);
});
