import assert from "node:assert/strict";
import test from "node:test";
import { isVariantVisible, withVariantVisibility } from "../src/products/variantVisibility.js";

test("variant activity and visibility are both respected", () => {
  assert.equal(isVariantVisible({ isActive: true, isVisible: true }), true);
  assert.equal(isVariantVisible({ isActive: false, isVisible: true }), false);
  assert.equal(isVariantVisible({ isActive: true, isVisible: false }), false);
  assert.equal(withVariantVisibility({ is_active: false }).isVisible, false);
});
