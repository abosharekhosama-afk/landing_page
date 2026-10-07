import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../scripts/data-migrations/kids-velvet-legacy-complete-catalog-hierarchy.sql", import.meta.url),
  "utf8",
);

const seedMatch = migration.match(/values \(\$catalog\$([\s\S]+?)\$catalog\$::jsonb\)/);
assert.ok(seedMatch, "migration 021 must contain a static canonical catalog seed");
const seed = JSON.parse(seedMatch[1]);

test("migration 021 contains the complete static Kids Velvet hierarchy", () => {
  assert.equal(seed.brands.length, 12);
  assert.equal(seed.mains.length, 127);
  assert.equal(seed.subs.length, 412);
  assert.deepEqual(seed.brands.map((brand) => brand.slug), [
    "baby", "kids", "play", "build", "learn", "create",
    "games", "move", "collect", "plush", "books", "muslim",
  ]);

  const mainIds = new Set(seed.mains.map((category) => category.id));
  const brandSlugs = new Set(seed.brands.map((brand) => brand.slug));
  assert.equal(mainIds.size, 127);
  assert.equal(new Set(seed.subs.map((category) => category.id)).size, 412);
  assert.equal(new Set([...seed.mains, ...seed.subs].map((category) => category.slug)).size, 539);
  assert.ok(seed.mains.every((category) => brandSlugs.has(category.brandSlug)));
  assert.ok(seed.subs.every((category) => brandSlugs.has(category.brandSlug) && mainIds.has(category.mainId)));
});

test("migration 021 uses the declared JSON record field names consistently", () => {
  assert.match(
    migration,
    /as definition\(id text, slug text, name text, "sortOrder" integer\)/,
  );
  assert.match(migration, /definition\."sortOrder", true, now\(\), now\(\)/);
  assert.doesNotMatch(migration, /definition\.sort_order/);

  for (const field of ["brandSlug", "nameEn", "nameAr", "sortOrder"]) {
    assert.match(migration, new RegExp(`definition\\."${field}"`));
  }
  assert.match(migration, /"canonicalSlug" text/);
  assert.match(migration, /definition\."mainId"/);
  assert.match(migration, /brand\.slug = definition\."brandSlug"/);
  assert.match(migration, /main\.id = definition\."mainId"/);
  assert.match(migration, /definition\.slug/);
  assert.match(migration, /definition\.name/);
});

test("migration 021 includes zero-product branches independently of products", () => {
  assert.ok(seed.brands.some((brand) => brand.slug === "baby"));
  assert.ok(seed.brands.some((brand) => brand.slug === "muslim"));
  assert.ok(seed.mains.some((category) => category.brandSlug === "baby" && category.canonicalSlug === "baby-development"));
  assert.ok(seed.mains.some((category) => category.brandSlug === "muslim" && category.canonicalSlug === "quran-learning"));

  const babyDevelopment = seed.mains.find(
    (category) => category.brandSlug === "baby" && category.canonicalSlug === "baby-development",
  );
  assert.deepEqual(
    seed.subs.filter((category) => category.mainId === babyDevelopment.id).map((category) => category.canonicalSlug),
    ["sensory-toys", "fine-motor", "cognitive-toys", "developmental-toys"],
  );
});

test("migration 021 preserves migration 020 entities and the eight resolved products", () => {
  assert.ok(seed.mains.some((category) => category.id === "kv-main-blind-boxes" && category.slug === "blind-boxes"));
  assert.ok(seed.subs.some((category) => category.id === "kv-sub-mini-figures" && category.slug === "mini-figures"));
  assert.match(migration, /resolved_products <> 8/);
  assert.match(migration, /main\.brand_id = brand\.id/);
  assert.match(migration, /sub\.parent_id = main\.id/);
  assert.doesNotMatch(migration, /update\s+public\.products/i);
});

test("migration 021 is idempotent, Kids Velvet-only, and leaves iCare and legacy media untouched", () => {
  assert.match(migration, /on conflict \(company_id, slug\) do update/gi);
  assert.match(migration, /company_id = 'kids-velvet'/g);
  assert.match(migration, /legacy_count < 7/);
  assert.doesNotMatch(migration, /['"]icare['"]/i);
  assert.doesNotMatch(migration, /\b(?:delete|truncate)\b\s+(?:from\s+)?public\./i);
  assert.doesNotMatch(migration, /(?:insert\s+into|update|delete\s+from)\s+public\.website_media/i);
});
