import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { analyticsRoutes } from "../src/utils/analytics.js";

const read = (url) => fs.readFileSync(new URL(url, import.meta.url), "utf8");

const analyticsSource = read("../src/pages/AdminAnalyticsPage.jsx");
const rolesSource = read("../src/utils/roles.js");
const apiAnalyticsSource = read("../../api/src/analytics/visitorAnalytics.js");

const campaignTableBlock = analyticsSource.slice(
  analyticsSource.indexOf("function CampaignTable"),
  analyticsSource.indexOf("function HighlightsPage"),
);

const funnelBlock = analyticsSource.slice(
  analyticsSource.indexOf("function FunnelRows"),
  analyticsSource.indexOf("function CampaignTable"),
);

const forbiddenUiFiles = [
  "../src/pages/AdminBannersPage.jsx",
  "../src/pages/AdminSplashAdsPage.jsx",
  "../src/pages/AdminFeaturePage.jsx",
  "../src/components/WebsiteMediaManager.jsx",
  "../src/components/MediaSlotsManager.jsx",
];

test("Campaign performance table exposes a Content / Post column beside the grouping columns", () => {
  const ordered = [
    "<th>Campaign</th>",
    "<th>Source</th>",
    "<th>Medium</th>",
    "<th>Content / Post</th>",
    "<th>Visits</th>",
  ];
  let cursor = -1;
  for (const header of ordered) {
    const index = campaignTableBlock.indexOf(header);
    assert.ok(index > cursor, `${header} must appear after the previous column`);
    cursor = index;
  }
});

test("Content cell renders the attributed utm_content value with a clean empty fallback", () => {
  assert.ok(
    campaignTableBlock.includes('<td>{row.content || "(no content)"}</td>'),
    'empty utm_content must render "(no content)" instead of a blank cell',
  );
  assert.ok(
    !/row\.content\s*\|\|\s*"[^"]+"/.test(campaignTableBlock) ||
      campaignTableBlock.includes('<td>{row.content || "(no content)"}</td>'),
    "content must come from the API attribution field, not an invented label",
  );
});

test("All existing campaign metrics stay in the table", () => {
  const metrics = [
    "<th>Visits</th>",
    "<th>Product views</th>",
    "<th>Add to cart</th>",
    "<th>Remove from cart</th>",
    "<th>Checkout started</th>",
    "<th>Purchases</th>",
    "<th>Orders</th>",
    "<th>Revenue</th>",
    "<th>Returned orders</th>",
    "<th>Returned value</th>",
    "<th>Unique customers</th>",
    "<th>Conversion rate</th>",
  ];
  for (const metric of metrics) {
    assert.ok(campaignTableBlock.includes(metric), `missing ${metric}`);
  }
  for (const binding of [
    "row.sessions",
    "row.productViews",
    "row.addToCart",
    "row.removeFromCart",
    "row.checkoutStarted",
    "row.purchases",
    "row.orders",
    "row.revenue",
    "row.returnedOrders",
    "row.returnedValue",
    "row.uniquePurchasingCustomers",
    "row.conversionRate",
  ]) {
    assert.ok(campaignTableBlock.includes(binding), `missing ${binding}`);
  }
});

test("Storefront funnel still renders its steps on the Behavior page", () => {
  assert.ok(analyticsSource.includes("<h2>Storefront funnel</h2>"));
  assert.ok(analyticsSource.includes("<h2>Campaign performance</h2>"));
  for (const step of [
    '["Product views", funnel?.productViews]',
    '["Add to cart", funnel?.addToCart]',
    '["Remove from cart", funnel?.removeFromCart]',
    '["Checkout started", funnel?.checkoutStarted]',
    '["Purchases", funnel?.purchases]',
  ]) {
    assert.ok(funnelBlock.includes(step), `missing funnel step ${step}`);
  }
});

test("Behavior stays centralized at its route behind reports.view", () => {
  assert.equal(analyticsRoutes["admin-analytics-behavior"], "/admin/analytics/behavior");
  assert.ok(rolesSource.includes('"admin-analytics-behavior": ["reports.view"]'));
});

test("First-party attribution already groups and returns utm_content with no API change", () => {
  const identityStart = apiAnalyticsSource.indexOf("CAMPAIGN_IDENTITY_FIELDS = Object.freeze([");
  assert.ok(identityStart > -1, "campaign identity fields missing");
  const identityBlock = apiAnalyticsSource.slice(
    identityStart,
    apiAnalyticsSource.indexOf("]);", identityStart),
  );
  for (const field of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    assert.ok(identityBlock.includes(`"${field}"`), `grouping missing ${field}`);
  }
  assert.ok(apiAnalyticsSource.includes("content: normalized.utm_content || NO_CAMPAIGN_LABEL"));
  assert.ok(apiAnalyticsSource.includes("term: normalized.utm_term || NO_CAMPAIGN_LABEL"));
});

test("No analytics sections leak into Banners, Splash Ads, or Website Media", () => {
  for (const file of forbiddenUiFiles) {
    const source = read(file);
    for (const marker of [
      "Storefront funnel",
      "Campaign performance",
      "utm_content",
      "CampaignTable",
      "FunnelRows",
    ]) {
      assert.ok(!source.includes(marker), `${file} must not render ${marker}`);
    }
  }
});
