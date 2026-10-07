import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { canAccessAdminPage } from "../src/utils/roles.js";
import {
  countBarWidth,
  EMPTY_REPORTS_SUMMARY,
  normalizeReportsSummary,
  reportsHasPeriodRecords,
  reportsRangeForPreset,
  reportsSummaryMetric,
} from "../src/utils/reportsUi.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("reports API client sends date_from and date_to query params", () => {
  const api = read("src/utils/reportsApi.js");
  assert.match(api, /\/admin\/reports\/summary/);
  assert.match(api, /date_from/);
  assert.match(api, /date_to/);
});

test("normalizeReportsSummary maps known API fields and ignores unknown metrics", () => {
  const mapped = normalizeReportsSummary({
    range: { date_from: "a", date_to: "b" },
    summary: { orders_count: "4", revenue_total: 12.5, sessions: 999, customers_count: 3 },
    orders: { by_status: [{ status: "pending", count: 2 }], latest: [{ id: "o1", total: "9" }] },
    extra: { visitors: 50 },
  });
  assert.equal(mapped.summary.orders_count, 4);
  assert.equal(mapped.summary.revenue_total, 12.5);
  assert.equal(mapped.summary.customers_count, 3);
  assert.equal(mapped.summary.sessions, undefined);
  assert.equal(mapped.orders.by_status[0].count, 2);
  assert.equal(mapped.orders.latest[0].total, 9);
  assert.equal(mapped.extra, undefined);
});

test("empty or invalid payloads do not invent analytics values", () => {
  assert.deepEqual(normalizeReportsSummary(null).summary, EMPTY_REPORTS_SUMMARY.summary);
  assert.equal(reportsHasPeriodRecords(normalizeReportsSummary({})), false);
  assert.equal(reportsHasPeriodRecords(normalizeReportsSummary({ summary: { orders_count: 1 } })), true);
});

test("reportsSummaryMetric returns explicit zeros and stays unavailable when a field is missing", () => {
  assert.equal(reportsSummaryMetric(null, "orders_count"), null);
  assert.equal(reportsSummaryMetric({}, "orders_count"), null);
  assert.equal(reportsSummaryMetric({ summary: { customers_count: 2 } }, "orders_count"), null);
  assert.equal(reportsSummaryMetric({ summary: { orders_count: 0, customers_count: "5" } }, "orders_count"), 0);
  assert.equal(reportsSummaryMetric({ summary: { orders_count: 0, customers_count: "5" } }, "customers_count"), 5);
  assert.equal(reportsSummaryMetric({ summary: { orders_count: null, customers_count: "" } }, "orders_count"), null);
  assert.equal(reportsSummaryMetric({ summary: { orders_count: null, customers_count: "" } }, "customers_count"), null);
  assert.equal(reportsSummaryMetric({ summary: { orders_count: "n/a", customers_count: true } }, "orders_count"), null);
  assert.equal(reportsSummaryMetric({ summary: { orders_count: "n/a", customers_count: true } }, "customers_count"), null);
  assert.equal(reportsSummaryMetric({ summary: { orders_count: "0", customers_count: 0 } }, "orders_count"), 0);
  assert.equal(reportsSummaryMetric({ summary: { orders_count: "0", customers_count: 0 } }, "customers_count"), 0);
});

test("date presets produce ISO from/to without fabricating series points", () => {
  const now = new Date("2026-08-30T12:00:00.000Z");
  const week = reportsRangeForPreset("7d", "", "", now);
  assert.equal(Number.isFinite(Date.parse(week.date_from)), true);
  assert.equal(Number.isFinite(Date.parse(week.date_to)), true);
  assert.ok(Date.parse(week.date_from) < Date.parse(week.date_to));
  const custom = reportsRangeForPreset("custom", "2026-08-01", "2026-08-10", now);
  const from = new Date(custom.date_from);
  const to = new Date(custom.date_to);
  assert.equal(from.getFullYear(), 2026);
  assert.equal(from.getMonth(), 7);
  assert.equal(from.getDate(), 1);
  assert.equal(to.getDate(), 10);
  assert.ok(from.getTime() < to.getTime());
});

test("count bars scale from real counts only", () => {
  assert.equal(countBarWidth(5, [{ count: 10 }, { count: 5 }]), "50%");
  assert.equal(countBarWidth(0, []), "0%");
});

test("reports workspace covers KPI, filters, loading, empty, error, and permissions", () => {
  const workspace = read("src/components/AnalyticsReportsWorkspace.jsx");
  const page = read("src/pages/AdminAnalyticsPage.jsx");
  const app = read("src/CPanelApp.jsx");
  assert.match(workspace, /analytics-reports-kpis/);
  assert.match(workspace, /copy.revenue/);
  assert.match(workspace, /copy.orders/);
  assert.match(workspace, /copy.customers/);
  assert.match(workspace, /preset === "custom"/);
  assert.match(workspace, /copy.loading/);
  assert.match(workspace, /copy.emptyPeriod/);
  assert.match(workspace, /copy.retry/);
  assert.match(workspace, /canAccessAdminPage/);
  assert.match(page, /function ReportsPage/);
  assert.match(page, /analytics-reports-page/);
  assert.match(app, /activePage === "admin-reports"/);
  assert.doesNotMatch(workspace, /live visitors|unique visitors|bounce rate/i);
});

test("reports.view still gates Analytics Reports access", () => {
  assert.equal(canAccessAdminPage({ role: "employee", permissions: ["reports.view"] }, "admin-analytics-reports"), true);
  assert.equal(canAccessAdminPage({ role: "employee", permissions: ["customers.view"] }, "admin-analytics-reports"), false);
  const roles = read("src/utils/roles.js");
  assert.match(roles, /"admin-analytics-reports": \["reports\.view"\]/);
});
