import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const dashboardPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/pages/AdminDashboardPage.jsx",
);

test("Products UI never renders raw brand.name objects as React children", () => {
  const source = fs.readFileSync(dashboardPath, "utf8");
  const rawBrandChildren = source.match(/\{brand\.name\}/g) || [];
  assert.equal(
    rawBrandChildren.length,
    0,
    "brand.name is a localized object; rendering it causes React error #31 / white screen",
  );
  assert.ok(
    source.includes("getText(brand.name") || source.includes("getText(brands.find"),
    "brand labels must go through getText()",
  );
});
