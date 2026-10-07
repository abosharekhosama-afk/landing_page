import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { assertCleanSource } from "../src/velvetDropshipping/images.js";
import { resolveMerchantImage, UNBRANDED_FALLBACK } from "../src/velvetDropshipping/domain.js";

test("a catalog image is refused as the clean source", () => {
  assert.throws(() => assertCleanSource({
    cleanImageUrl: "/products/branded.jpg",
    catalogImageUrl: "/products/branded.jpg",
  }), /clean source/);
});

test("a missing clean image stays selectable and uses the unbranded fallback", () => {
  const image = resolveMerchantImage({ cleanImageUrl: null });
  assert.equal(image.imageStatus, "fallback");
  assert.equal(image.displayUrl, UNBRANDED_FALLBACK);
});

test("merchant product list is limited to the session merchant's active selections", () => {
  const source = fs.readFileSync(new URL("../src/velvetDropshipping/catalog.js", import.meta.url), "utf8");
  const list = source.slice(source.indexOf("export async function listSelections"), source.indexOf("export async function addSelection"));
  assert.match(list, /mp\.company_id = \$1 and mp\.merchant_id = \$2 and mp\.active = true/);
  const route = fs.readFileSync(new URL("../src/routes/velvetDropshipping.js", import.meta.url), "utf8");
  assert.match(route, /router\.get\("\/merchant-products"/);
  const page = fs.readFileSync(new URL("../../cpanel/src/pages/VelvetDropshipping/MerchantVelvetDashboardPage.jsx", import.meta.url), "utf8");
  assert.match(page, /velvetApi\.removeProduct/);
  assert.match(page, /velvetApi\.retryImage/);
  assert.match(page, /velvetApi\.updateStore/);
});

test("the public store returns shared available quantity", () => {
  const source = fs.readFileSync(new URL("../src/velvetDropshipping/catalog.js", import.meta.url), "utf8");
  const store = source.slice(source.indexOf("export async function publicStore"));
  assert.match(store, /p\.stock_qty/);
});

test("store identity updates do not regenerate existing merchant images", () => {
  const source = fs.readFileSync(new URL("../src/velvetDropshipping/merchants.js", import.meta.url), "utf8");
  const storeUpdate = source.slice(source.indexOf("export async function updateStoreIdentity"));
  assert.equal(storeUpdate.includes("generated_image_url"), false);
  assert.equal(storeUpdate.includes("generateMerchantImage"), false);
});
