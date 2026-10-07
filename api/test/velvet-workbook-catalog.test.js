import assert from "node:assert/strict";
import test from "node:test";
import {
  OUTSIDE_TREE_PRODUCT_IDS,
  buildProductPayload,
  buildTaxonomyIndex,
  getSourceProductId,
  isCleanImportPlan,
  parseWorkbookImportRows,
  planVelvetWorkbookImport,
  resolveWorkbookTaxonomy,
  slugifyProductTitle,
} from "../src/catalog/velvetWorkbookCatalog.js";
import { validateCatalogHierarchy } from "../src/routes/catalogHierarchy.js";

const brands = [
  { id: "kv-brand-baby", slug: "baby", name: "VELVET BABY", isActive: true },
  { id: "kv-brand-kids", slug: "kids", name: "VELVET KIDS", isActive: true },
  { id: "kv-brand-move", slug: "move", name: "VELVET MOVE", isActive: true },
];

const categories = [
  { id: "kv-main-baby-dev", slug: "baby-development", parentId: null, brandId: "kv-brand-baby", isActive: true },
  { id: "kv-sub-sensory", slug: "sensory-toys", parentId: "kv-main-baby-dev", brandId: "kv-brand-baby", isActive: true },
  { id: "kv-main-kids-school", slug: "school", parentId: null, brandId: "kv-brand-kids", isActive: true },
  { id: "kv-sub-bags", slug: "bags", parentId: "kv-main-kids-school", brandId: "kv-brand-kids", isActive: true },
  // Duplicate leaf slug under a different brand/main — must not match globally.
  { id: "kv-main-move-water", slug: "water-play", parentId: null, brandId: "kv-brand-move", isActive: true },
  { id: "kv-sub-move-bags", slug: "bags", parentId: "kv-main-move-water", brandId: "kv-brand-move", isActive: true },
];

test("workbook import parsing keeps unique source IDs and outside-tree flags", () => {
  const { products, duplicates } = parseWorkbookImportRows([
    {
      product_id: 564,
      product_title: "Sensory set",
      product_link: "https://velvet-kids.com/?app=product.show.564",
      brand_slug: "baby",
      main_slug: "baby-development",
      leaf_slug: "sensory-toys",
      classification_status: "مصنّف",
      min_price: 25,
      variant_count: 2,
    },
    {
      product_id: "810",
      product_title: "Girls backpack",
      brand_slug: "kids",
      main_slug: "",
      leaf_slug: "",
      classification_status: "خارج شجرة المينو الحالية",
    },
    {
      product_id: 564,
      product_title: "duplicate row",
      brand_slug: "baby",
      main_slug: "baby-development",
      leaf_slug: "sensory-toys",
    },
  ]);
  assert.equal(products.length, 2);
  assert.deepEqual(duplicates, ["564"]);
  assert.equal(products[0].outsideTree, false);
  assert.equal(products[1].outsideTree, true);
  assert.ok(OUTSIDE_TREE_PRODUCT_IDS.includes("810"));
});

test("taxonomy resolution uses brand + main + leaf and rejects global leaf collisions", () => {
  const index = buildTaxonomyIndex(brands, categories);
  const ok = resolveWorkbookTaxonomy({
    sourceProductId: "1",
    brandSlug: "kids",
    mainSlug: "school",
    leafSlug: "bags",
    outsideTree: false,
  }, index);
  assert.equal(ok.subcategoryId, "kv-sub-bags");
  assert.equal(ok.errors.length, 0);

  const wrongBrandLeaf = resolveWorkbookTaxonomy({
    sourceProductId: "2",
    brandSlug: "kids",
    mainSlug: "school",
    leafSlug: "missing",
    outsideTree: false,
  }, index);
  assert.ok(wrongBrandLeaf.errors[0].includes("Unknown leaf_slug"));
});

test("taxonomy resolution accepts prefixed staging collision slugs within hierarchy", () => {
  const collisionBrands = [{ id: "kv-brand-learn", slug: "learn", isActive: true }];
  const collisionCategories = [
    { id: "kv-main-discovery", slug: "discovery", parentId: null, brandId: "kv-brand-learn", isActive: true },
    { id: "kv-sub-animals", slug: "learn-discovery-animals", parentId: "kv-main-discovery", brandId: "kv-brand-learn", isActive: true },
    { id: "kv-main-memory", slug: "games-memory-games", parentId: null, brandId: "kv-brand-learn", isActive: true },
    { id: "kv-sub-memory", slug: "learn-games-memory-games-memory", parentId: "kv-main-memory", brandId: "kv-brand-learn", isActive: true },
  ];
  const index = buildTaxonomyIndex(collisionBrands, collisionCategories);
  const leaf = resolveWorkbookTaxonomy({
    sourceProductId: "513",
    brandSlug: "learn",
    mainSlug: "discovery",
    leafSlug: "animals",
    outsideTree: false,
  }, index);
  assert.equal(leaf.subcategoryId, "kv-sub-animals");
  const main = resolveWorkbookTaxonomy({
    sourceProductId: "326",
    brandSlug: "learn",
    mainSlug: "memory-games",
    leafSlug: "memory",
    outsideTree: false,
  }, index);
  assert.equal(main.mainCategoryId, "kv-main-memory");
  assert.equal(main.subcategoryId, "kv-sub-memory");
});

test("sourceProductId idempotency updates instead of duplicating", () => {
  const workbookProducts = parseWorkbookImportRows([
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
      product_title: "Girls backpack",
      brand_slug: "kids",
      classification_status: "خارج",
    },
  ]).products;

  const existing = [
    {
      id: "play-2",
      slug: "odd-pals-plush",
      sku: "IPLAY-002",
      name: { en: "Odd Pals" },
    },
    {
      id: "existing-564",
      slug: "old-slug",
      sourceProductId: "564",
      name: { en: "Old title" },
    },
  ];

  const first = planVelvetWorkbookImport({
    workbookProducts,
    existingProducts: existing,
    brands,
    categories,
  });
  assert.equal(first.summary.WOULD_REMOVE, 1);
  assert.equal(first.summary.WOULD_CREATE, 1);
  assert.equal(first.summary.WOULD_UPDATE, 1);
  assert.equal(first.WOULD_UPDATE[0].existingId, "existing-564");
  assert.equal(first.WOULD_CREATE[0].sourceProductId, "810");
  assert.equal(first.summary.TAXONOMY_ERRORS, 0);
  assert.ok(isCleanImportPlan(first));

  const afterImport = [
    first.WOULD_UPDATE[0].payload,
    first.WOULD_CREATE[0].payload,
  ];
  const second = planVelvetWorkbookImport({
    workbookProducts,
    existingProducts: afterImport,
    brands,
    categories,
  });
  assert.equal(second.summary.WOULD_REMOVE, 0);
  assert.equal(second.summary.WOULD_CREATE, 0);
  assert.equal(second.summary.WOULD_UPDATE, 2);
  assert.ok(isCleanImportPlan(second));
});

test("generated payload avoids fabricated commerce fields and keeps brand-only products brand-only", () => {
  const index = buildTaxonomyIndex(brands, categories);
  const classified = parseWorkbookImportRows([{
    product_id: 564,
    product_title: "Sensory set",
    brand_slug: "baby",
    main_slug: "baby-development",
    leaf_slug: "sensory-toys",
    min_price: 25,
    variant_count: 3,
  }]).products[0];
  const taxonomy = resolveWorkbookTaxonomy(classified, index);
  const payload = buildProductPayload(classified, taxonomy);
  assert.equal(payload.sourceProductId, "564");
  assert.equal(payload.price, 25);
  assert.deepEqual(payload.variants, []);
  assert.deepEqual(payload.sizes, []);
  assert.equal(payload.image, "");
  assert.equal(payload.sku, "");
  assert.equal(payload.isActive, true);
  assert.equal(payload.visible, true);
  assert.match(payload.slug, /^velvet-564-/);

  const brandOnly = parseWorkbookImportRows([{
    product_id: 75,
    product_title: "Bottle cleaner",
    brand_slug: "baby",
  }]).products[0];
  const brandTaxonomy = resolveWorkbookTaxonomy(brandOnly, index);
  assert.equal(brandTaxonomy.mainCategoryId, null);
  assert.equal(brandTaxonomy.subcategoryId, null);
  const brandPayload = buildProductPayload(brandOnly, brandTaxonomy);
  assert.equal(brandPayload.mainCategoryId, null);
  assert.equal(brandPayload.subcategoryId, null);
  assert.equal(brandPayload.brandId, "kv-brand-baby");
});

test("duplicate slug safety embeds sourceProductId", () => {
  const a = slugifyProductTitle("Same Title", "11");
  const b = slugifyProductTitle("Same Title", "12");
  assert.notEqual(a, b);
  assert.match(a, /velvet-11/);
  assert.match(b, /velvet-12/);
});

test("getSourceProductId reads nested data payload", () => {
  assert.equal(getSourceProductId({ sourceProductId: "42" }), "42");
  assert.equal(getSourceProductId({ data: { sourceProductId: "99" } }), "99");
  assert.equal(getSourceProductId({ id: "play-1" }), "");
});

test("allowBrandOnly accepts brand-only products under requireFullHierarchy", () => {
  assert.throws(
    () => validateCatalogHierarchy({
      brands,
      categories,
      product: { brandId: "kv-brand-baby" },
      requireFullHierarchy: true,
    }),
    /Main Category is required/,
  );
  const result = validateCatalogHierarchy({
    brands,
    categories,
    product: { brandId: "kv-brand-baby" },
    requireFullHierarchy: true,
    allowBrandOnly: true,
  });
  assert.equal(result.brandId, "kv-brand-baby");
  assert.equal(result.mainCategoryId, null);
  assert.equal(result.subcategoryId, null);
});

test("tenant isolation: plan only considers provided kids-velvet catalog rows", () => {
  const workbookProducts = parseWorkbookImportRows([{
    product_id: 564,
    product_title: "Sensory set",
    brand_slug: "baby",
    main_slug: "baby-development",
    leaf_slug: "sensory-toys",
  }]).products;
  const plan = planVelvetWorkbookImport({
    workbookProducts,
    existingProducts: [{ id: "icare-only", companyId: "icare", slug: "x" }],
    brands,
    categories,
  });
  // Existing product without sourceProductId is scheduled for removal from THIS tenant list only.
  assert.equal(plan.summary.WOULD_REMOVE, 1);
  assert.equal(plan.WOULD_REMOVE[0].id, "icare-only");
  assert.equal(plan.summary.WOULD_CREATE, 1);
});
