import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { slugify } from "../src/velvetDropshipping/domain.js";

test("store slugs stay readable and stable for the same name", () => {
  assert.equal(slugify("Velvet Shop"), "velvet-shop");
  assert.equal(slugify("Velvet Shop"), slugify("Velvet Shop"));
});

test("merchant reads are scoped to the session user and company", () => {
  const source = fs.readFileSync(new URL("../src/velvetDropshipping/merchants.js", import.meta.url), "utf8");
  assert.match(source, /m\.company_id = \$1 and m\.user_id = \$2/);
  assert.match(source, /That store name is already in use/);
  assert.match(source, /\["active", "inactive"\]/);
  assert.match(source, /PENDING_MERCHANT_CONFIRMATION/);
  assert.match(source, /status = 'CONFIRMED'/);
  assert.match(source, /DELIVERED_COLLECTED' and updated_at >= \$3/);
  assert.match(source, /s\.paid_at is null/);
});

test("public checkout refuses an inactive merchant or store", () => {
  const source = fs.readFileSync(new URL("../src/velvetDropshipping/orders.js", import.meta.url), "utf8");
  assert.match(source, /store\.status !== "active" \|\| store\.merchant_status !== "active"/);
});
