import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const source = (file) => fs.readFileSync(path.join(root, "src", file), "utf8");

test("Insights page fetches the real dashboard insights endpoint", () => {
  const page = source("pages/AdminAnalyticsPage.jsx");
  const api = source("utils/dashboardInsightsApi.js");
  assert.match(page, /fetchDashboardInsights/);
  assert.match(page, /fetchDashboardInsights\(\{ timezoneOffsetMinutes \}\)/);
  assert.match(api, /\/admin\/dashboard\/insights/);
  assert.match(page, /case "admin-analytics-insights": content = <InsightsPage/);
  assert.doesNotMatch(page, /Math\.random|mockInsights|fakeInsights|sampleInsights/);
});

test("Insights page renders Sales periods from the API salesPeriods payload", () => {
  const page = source("pages/AdminAnalyticsPage.jsx");
  assert.match(page, /insights\.salesPeriods/);
  assert.match(page, /salesPeriodLabel\(row\.key, language\)/);
  assert.match(page, /row\.ordersCount/);
  assert.match(page, /formatInsightsMoney/);
  assert.match(page, /copy\.unsupportedProfit/);
});

test("Insights page renders order status, stock attention, and latest sales from real API data", () => {
  const page = source("pages/AdminAnalyticsPage.jsx");
  assert.match(page, /orders\.statusCounts/);
  assert.match(page, /orderBucketLabel\(key, language\)/);
  assert.match(page, /insights\.latestSales/);
  assert.match(page, /insights\.alerts/);
  assert.match(page, /"low_stock"/);
  assert.match(page, /"out_of_stock"/);
  assert.match(page, /"price_zero"/);
});

test("Insights page surfaces search summary only when the API provides search events", () => {
  const page = source("pages/AdminAnalyticsPage.jsx");
  assert.match(page, /insights\.search/);
  assert.match(page, /search\.totalEvents/);
  assert.match(page, /search\.mostSearched/);
  assert.match(page, /searchCopy\(language\)/);
  assert.match(page, /copy\.noSearch/);
});

test("Insights page surfaces visitors only when the API provides visitor analytics", () => {
  const page = source("pages/AdminAnalyticsPage.jsx");
  assert.match(page, /insights\.visitors/);
  assert.match(page, /visitors\.daily/);
  assert.match(page, /visitorSeries/);
  assert.match(page, /SeriesTable rows=\{visitorSeries\}/);
  assert.match(page, /copy\.noVisitors/);
});

test("Insights page handles loading, forbidden, error, and malformed states honestly", () => {
  const page = source("pages/AdminAnalyticsPage.jsx");
  assert.match(page, /aria-busy="true"/);
  assert.match(page, /state\.error === "forbidden"/);
  assert.match(page, /RefreshCw/);
  assert.match(page, /copy\.retry/);
  assert.match(page, /!insights \|\| typeof insights !== "object"/);
  assert.match(page, /typeof insights !== "object"/);
});

test("Insights page keeps honest empty states when API data is unavailable", () => {
  const page = source("pages/AdminAnalyticsPage.jsx");
  assert.match(page, /copy\.noOrders/);
  assert.match(page, /copy\.noStockIssues/);
  assert.match(page, /copy\.noSearch/);
  assert.match(page, /copy\.noVisitors/);
  assert.match(page, /copy\.noSales/);
  assert.match(page, /insights\.visitors && typeof insights\.visitors === "object"/);
  assert.match(page, /insights\.search && typeof insights\.search === "object"/);
});

test("Insights page insight sections derive only from supplied API fields", () => {
  const page = source("pages/AdminAnalyticsPage.jsx");
  assert.match(page, /insights\.alerts/, "stock attention must come from API alerts");
  assert.match(page, /insights\.salesPeriods/);
  assert.match(page, /insights\.order|orders\.statusCounts/);
  assert.doesNotMatch(page, /fakeTraffic|mockSales|sampleRecord|hardcodedMetrics|Math\.random/);
});

test("Insights copy includes EN and AR labels", () => {
  const page = source("pages/AdminAnalyticsPage.jsx");
  assert.match(page, /recommendedActions:/);
  assert.match(page, /searchSummary:/);
  assert.match(page, /stockAttention:/);
  assert.match(page, /visitorsDetail:/);
  assert.match(page, /جاري تحميل الرؤى/);
  assert.match(page, /لا توجد رؤى موثّقة بعد/);
  assert.match(page, /فترات المبيعات/);
  assert.match(page, /حالة الطلبات/);
});
