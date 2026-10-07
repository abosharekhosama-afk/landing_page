import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../src/pages/AdminSplashAdsPage.jsx", import.meta.url), "utf8");

test("Employee 4 splash admin page provides real CRUD and metrics controls", () => {
  for (const pattern of [
    '/admin/splash-ads',
    'method: "PATCH"',
    'method: "POST"',
    'method: "DELETE"',
    '/metrics',
    'desktop_image_id',
    'mobile_image_id',
    'close_delay_seconds',
    'display_duration_seconds',
    'ONCE_PER_SESSION',
    'ONCE_PER_DAY',
    'excluded_pages',
  ]) assert.match(source, new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
