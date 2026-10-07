import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  canMoveProductDown,
  canMoveProductUp,
  moveProductInFilteredOrder,
  productIdsInSortOrder,
  sortProductsBySortOrder,
} from "../src/utils/productOrdering.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboard = fs.readFileSync(path.join(root, "src/pages/AdminDashboardPage.jsx"), "utf8");
const productsApi = fs.readFileSync(path.join(root, "src/utils/productsApi.js"), "utf8");
const app = fs.readFileSync(path.join(root, "src/CPanelApp.jsx"), "utf8");
const translations = fs.readFileSync(path.join(root, "src/data/translations.js"), "utf8");

test("sortProductsBySortOrder orders by sortOrder then slug", () => {
  const sorted = sortProductsBySortOrder([
    { id: "c", slug: "c", sortOrder: 2 },
    { id: "a", slug: "a", sortOrder: 0 },
    { id: "b", slug: "b", sortOrder: 1 },
  ]);
  assert.deepEqual(sorted.map((p) => p.id), ["a", "b", "c"]);
  assert.deepEqual(productIdsInSortOrder(sorted), ["a", "b", "c"]);
});

test("moveProductInFilteredOrder moves within filtered subset only", () => {
  const full = ["a", "b", "c", "d"];
  const filtered = ["a", "c", "d"];
  assert.deepEqual(moveProductInFilteredOrder(full, filtered, 0, 2), ["c", "b", "d", "a"]);
  assert.deepEqual(moveProductInFilteredOrder(full, filtered, 2, 0), ["d", "b", "a", "c"]);
  assert.deepEqual(moveProductInFilteredOrder(full, filtered, 0, 0), full);
});

test("up/down boundary helpers", () => {
  assert.equal(canMoveProductUp(0), false);
  assert.equal(canMoveProductUp(1), true);
  assert.equal(canMoveProductDown(0, 3), true);
  assert.equal(canMoveProductDown(2, 3), false);
});

test("ProductsListPage wires drag-and-drop and up/down ordering controls", () => {
  assert.match(dashboard, /onDragStart/);
  assert.match(dashboard, /onDropRow|onDrop=/);
  assert.match(dashboard, /canMoveProductUp/);
  assert.match(dashboard, /canMoveProductDown/);
  assert.match(dashboard, /moveProductInFilteredOrder/);
  assert.match(dashboard, /onReorderProducts/);
  assert.match(dashboard, /reorderSaving/);
  assert.match(dashboard, /product-order-controls|ChevronUp/);
});

test("reorder uses dedicated PATCH /admin/products/reorder — not multi-PUT", () => {
  assert.match(productsApi, /function reorderProducts/);
  assert.match(productsApi, /\/admin\/products\/reorder/);
  assert.match(productsApi, /method:\s*"PATCH"/);
  assert.match(app, /reorderProductsApi|handleReorderProducts/);
  assert.match(app, /handleReorderProducts/);
  assert.doesNotMatch(app, /for\s*\(.*productIds[\s\S]*updateProductApi/);
  assert.doesNotMatch(dashboard, /updateProduct\(/);
});

test("ordering UI shows loading and error messaging hooks", () => {
  assert.match(dashboard, /productReordering|reorderSaving/);
  assert.match(app, /productReorderSaving|setProductReorderSaving/);
  assert.match(app, /adminMessageType.*error|setAdminMessageType\("error"\)/);
  assert.match(translations, /productReordered/);
  assert.match(translations, /productReorderFailed/);
});

test("Phase C ordering remains free of barcode/relations/discount UI (Phase G trash is allowed)", () => {
  assert.doesNotMatch(productsApi, /barcode|costPrice|product_relations|coupon/i);
  assert.doesNotMatch(dashboard, /Frequently Bought|Limited Offers/i);
});
