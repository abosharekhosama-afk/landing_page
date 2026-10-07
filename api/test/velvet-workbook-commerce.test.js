import assert from "node:assert/strict";
import test from "node:test";
import {
  VELVET_TARGET_CURRENCY,
  VELVET_TARGET_STOCK,
  buildInventoryPatch,
  buildProductCommercePatch,
  classifySizeForCleanup,
  isCleanCommercePlan,
  isCleanPriceCorrectionPlan,
  parseWorkbookPrice,
  planVelvetSizeCleanup,
  planVelvetWorkbookCommerceUpdate,
  planVelvetWorkbookPriceCorrection,
  readProductStock,
  resolveExistingProductSourceId,
} from "../src/catalog/velvetWorkbookCommerce.js";
import { parseWorkbookImportRows } from "../src/catalog/velvetWorkbookCatalog.js";

const workbookRows = [
  {
    product_id: 564,
    product_title: "Sensory set",
    brand_slug: "baby",
    main_slug: "baby-development",
    leaf_slug: "sensory-toys",
    min_price: 25,
  },
  {
    product_id: 810,
    product_title: "Brand only",
    brand_slug: "kids",
    main_slug: "",
    leaf_slug: "",
    min_price: 35,
  },
];

test("parseWorkbookPrice reads أقل سعر and rejects invalid values", () => {
  assert.equal(parseWorkbookPrice({ min_price: 25 }), 25);
  assert.equal(parseWorkbookPrice({}, { "أقل سعر": 35 }), 35);
  assert.equal(parseWorkbookPrice({ min_price: 0 }), null);
  assert.equal(parseWorkbookPrice({ min_price: "abc" }), null);
});

test("commerce plan matches sourceProductId and requires valid prices", () => {
  const { products } = parseWorkbookImportRows(workbookRows);
  const plan = planVelvetWorkbookCommerceUpdate({
    workbookProducts: products,
    existingProducts: [
      {
        id: "velvet-src-564",
        sourceProductId: "564",
        price: 10,
        stockQty: 0,
        isActive: true,
        active: true,
        visible: true,
        variants: [],
      },
      {
        id: "velvet-src-810",
        sourceProductId: "810",
        price: 35,
        stockQty: 24,
        isActive: false,
        active: true,
        visible: false,
        variants: [],
      },
    ],
    currentCompanyCurrency: "USD",
  });

  assert.equal(plan.MATCHED_TO_WORKBOOK, 2);
  assert.equal(plan.PRICE_INVALID, 0);
  assert.equal(plan.WOULD_UPDATE_PRICE, 1);
  assert.equal(plan.WOULD_SET_STOCK_24, 1);
  assert.equal(plan.WOULD_SET_ACTIVE, 1);
  assert.equal(plan.WOULD_SET_VISIBLE, 1);
  assert.equal(plan.WOULD_SET_CURRENCY, VELVET_TARGET_CURRENCY);
  assert.equal(isCleanCommercePlan(plan), true);
});

test("commerce plan stops when workbook price is missing", () => {
  const plan = planVelvetWorkbookCommerceUpdate({
    workbookProducts: [{ sourceProductId: "999", minPrice: null, title: "x", brandSlug: "baby" }],
    existingProducts: [{ id: "velvet-src-999", sourceProductId: "999", price: 1, variants: [] }],
    currentCompanyCurrency: "ILS",
  });
  assert.equal(plan.PRICE_INVALID, 1);
  assert.equal(plan.CLEAN, false);
});

test("inventory patch uses variant stock when real variants exist", () => {
  const patch = buildInventoryPatch({
    id: "velvet-src-587",
    variants: [{ id: "variant-1", stock: 0 }],
  }, VELVET_TARGET_STOCK);
  assert.equal(patch.mode, "variants");
  assert.deepEqual(patch.body, { variants: [{ id: "variant-1", stock: 24 }] });
});

test("product commerce patch sets ILS price and active flags without images", () => {
  const patch = buildProductCommercePatch(35);
  assert.equal(patch.price, 35);
  assert.equal(patch.isActive, true);
  assert.equal(patch.active, true);
  assert.equal(patch.visible, true);
  assert.equal(patch.stockQty, VELVET_TARGET_STOCK);
  assert.equal("image" in patch, false);
});

test("readProductStock sums variant stock when variants exist", () => {
  assert.equal(readProductStock({ stockQty: 10, variants: [{ stock: 5 }, { stock: 7 }] }), 12);
  assert.equal(readProductStock({ stockQty: 10, variants: [] }), 10);
});

test("tenant isolation: missing workbook products are reported, not invented", () => {
  const plan = planVelvetWorkbookCommerceUpdate({
    workbookProducts: [{ sourceProductId: "1", minPrice: 10, title: "A", brandSlug: "baby", mainSlug: "m", leafSlug: "s" }],
    existingProducts: [{ id: "other-tenant-product", sourceProductId: "999", price: 10, variants: [] }],
    currentCompanyCurrency: "ILS",
  });
  assert.equal(plan.MISSING_SOURCE_IDS, 1);
  assert.equal(plan.CLEAN, false);
});

test("idempotent rerun produces no updates when already at target", () => {
  const { products } = parseWorkbookImportRows(workbookRows);
  const existing = products.map((row, index) => ({
    id: `velvet-src-${row.sourceProductId}`,
    sourceProductId: row.sourceProductId,
    price: row.minPrice,
    stockQty: VELVET_TARGET_STOCK,
    isActive: true,
    active: true,
    visible: true,
    variants: [],
  }));
  const plan = planVelvetWorkbookCommerceUpdate({
    workbookProducts: products,
    existingProducts: existing,
    currentCompanyCurrency: VELVET_TARGET_CURRENCY,
  });
  assert.equal(plan.WOULD_SET_STOCK_24, 0);
  assert.equal(plan.WOULD_UPDATE_PRICE, 0);
  assert.equal(plan.WOULD_SET_CURRENCY, null);
  assert.equal(plan.wouldUpdate.length, 0);
});

// ---------------------------------------------------------------------------
// PART A — price correction planner (أقل سعر only)
// ---------------------------------------------------------------------------

test("resolveExistingProductSourceId covers all documented match paths", () => {
  assert.equal(resolveExistingProductSourceId({ sourceProductId: "564" }), "564");
  assert.equal(resolveExistingProductSourceId({ data: { sourceProductId: "810" } }), "810");
  assert.equal(resolveExistingProductSourceId({ legacyVelvetProductId: "999" }), "999");
  assert.equal(
    resolveExistingProductSourceId({ sourceProductUrl: "https://example.com/product?app=product.show.123" }),
    "123",
  );
  assert.equal(resolveExistingProductSourceId({ id: "velvet-src-456" }), "456");
  assert.equal(resolveExistingProductSourceId({ id: "other-tenant-product" }), "");
  assert.equal(resolveExistingProductSourceId(null), "");
});

test("price correction plan sets product price and single stale variant price", () => {
  const plan = planVelvetWorkbookPriceCorrection({
    workbookProducts: [
      { sourceProductId: "564", minPrice: 25 },
      { sourceProductId: "810", minPrice: 35 },
    ],
    existingProducts: [
      {
        id: "velvet-src-564",
        sourceProductId: "564",
        price: 18,
        variants: [{ id: "v-564", price: 18 }],
      },
      {
        id: "velvet-src-810",
        sourceProductId: "810",
        price: 35,
        variants: [{ id: "v-810", price: 35 }],
      },
    ],
  });

  assert.equal(plan.TOTAL_WORKBOOK_PRODUCTS, 2);
  assert.equal(plan.EXACT_MATCHED, 2);
  assert.equal(plan.UNMATCHED, 0);
  assert.equal(plan.PRICE_CHANGED, 1);
  assert.equal(plan.ALREADY_CORRECT, 1);
  assert.equal(plan.MULTI_VARIANT_CASES, 0);
  assert.equal(plan.ERRORS, 0);
  assert.equal(isCleanPriceCorrectionPlan(plan), true);

  const changed = plan.priceChanged[0];
  assert.equal(changed.sourceProductId, "564");
  assert.equal(changed.currentPrice, 18);
  assert.equal(changed.targetPrice, 25);
  assert.equal(changed.needsPrice, true);
  assert.deepEqual(changed.variantPatch, { variantId: "v-564", price: 25 });
});

test("price correction never rewrites multi-variant prices and reports them", () => {
  const plan = planVelvetWorkbookPriceCorrection({
    workbookProducts: [{ sourceProductId: "564", minPrice: 25 }],
    existingProducts: [
      {
        id: "velvet-src-564",
        sourceProductId: "564",
        price: 18,
        variants: [
          { id: "v-1", price: 18 },
          { id: "v-2", price: 22 },
        ],
      },
    ],
  });

  assert.equal(plan.EXACT_MATCHED, 1);
  assert.equal(plan.MULTI_VARIANT_CASES, 1);
  assert.equal(plan.PRICE_CHANGED, 1);
  assert.equal(plan.priceChanged[0].variantPatch, null);
  assert.equal(plan.multiVariantCases[0].variantCount, 2);
});

test("price correction leaves unmatched existing products untouched", () => {
  const plan = planVelvetWorkbookPriceCorrection({
    workbookProducts: [{ sourceProductId: "564", minPrice: 25 }],
    existingProducts: [
      { id: "velvet-src-564", sourceProductId: "564", price: 18, variants: [] },
      { id: "other-tenant-product", sourceProductId: "999", price: 10, variants: [] },
    ],
  });

  assert.equal(plan.EXACT_MATCHED, 1);
  assert.equal(plan.UNMATCHED, 1);
  assert.equal(plan.PRICE_CHANGED, 1);
  assert.equal(plan.unmatched[0].id, "other-tenant-product");
});

test("price correction does not touch a single variant that is not stale 18", () => {
  const plan = planVelvetWorkbookPriceCorrection({
    workbookProducts: [{ sourceProductId: "564", minPrice: 25 }],
    existingProducts: [
      {
        id: "velvet-src-564",
        sourceProductId: "564",
        price: 18,
        variants: [{ id: "v-564", price: 30 }],
      },
    ],
  });

  assert.equal(plan.PRICE_CHANGED, 1);
  assert.equal(plan.priceChanged[0].variantPatch, null);
  assert.equal(plan.priceChanged[0].needsPrice, true);
});

test("price correction reports invalid workbook prices as errors", () => {
  const plan = planVelvetWorkbookPriceCorrection({
    workbookProducts: [{ sourceProductId: "564", minPrice: null }],
    existingProducts: [{ id: "velvet-src-564", sourceProductId: "564", price: 18, variants: [] }],
  });

  assert.equal(plan.ERRORS, 1);
  assert.equal(plan.EXACT_MATCHED, 0);
  assert.equal(isCleanPriceCorrectionPlan(plan), false);
});

// ---------------------------------------------------------------------------
// PART B — automatic size/volume cleanup planner
// ---------------------------------------------------------------------------

test("classifySizeForCleanup detects automatic defaults and keeps manual sizes", () => {
  assert.equal(classifySizeForCleanup("500ml"), "automatic");
  assert.equal(classifySizeForCleanup("500 ML"), "automatic");
  assert.equal(classifySizeForCleanup("1L"), "automatic");
  assert.equal(classifySizeForCleanup("1.5L"), "automatic");
  assert.equal(classifySizeForCleanup("500 مل"), "automatic");
  assert.equal(classifySizeForCleanup({ en: "500ml", ar: "500 مل" }), "automatic");
  assert.equal(classifySizeForCleanup("S"), "manual");
  assert.equal(classifySizeForCleanup("1 Liter"), "manual");
  assert.equal(classifySizeForCleanup(""), "manual");
  assert.equal(classifySizeForCleanup(null), "manual");
  assert.equal(classifySizeForCleanup({ en: "500ml", ar: "500 ملليلتر" }), "ambiguous");
});

test("planVelvetSizeCleanup clears automatic defaults and reports ambiguous only", () => {
  const plan = planVelvetSizeCleanup({
    existingProducts: [
      {
        id: "velvet-src-564",
        sourceProductId: "564",
        variants: [
          { id: "v-1", size: "500ml" },
          { id: "v-2", size: "S" },
        ],
      },
      {
        id: "velvet-src-810",
        sourceProductId: "810",
        variants: [{ id: "v-3", size: { en: "500ml", ar: "500 ملليلتر" } }],
      },
      {
        id: "velvet-src-999",
        sourceProductId: "999",
        variants: [{ id: "v-4", size: "1 Liter" }],
      },
    ],
  });

  assert.equal(plan.SIZE_CLEAR_CANDIDATES, 1);
  assert.equal(plan.MANUAL_REVIEW, 1);
  assert.equal(plan.UNTOUCHED, 1);
  assert.equal(plan.wouldClear[0].clearable.length, 1);
  assert.equal(plan.wouldClear[0].clearable[0].variantId, "v-1");
  assert.equal(plan.manualReview[0].sizes.length, 1);
});
