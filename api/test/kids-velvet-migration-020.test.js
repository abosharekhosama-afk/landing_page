import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../scripts/data-migrations/kids-velvet-legacy-catalog-hierarchy-backfill.sql", import.meta.url),
  "utf8",
);

const expected = [
  ["pocket-worlds-starter-set", "collect", "blind-boxes", "mini-figures"],
  ["odd-pals-plush", "plush", "collectible-plush", "mini-plush"],
  ["tiny-table-bake-studio", "create", "kids-cooking", "baking-kits"],
  ["neon-racers-twin-pack", "move", "ride-ons", "push-cars"],
  ["bloom-pets-surprise-pod", "collect", "blind-boxes", "mystery-boxes"],
  ["splash-lab-water-blaster", "move", "water-play", "water-guns"],
  ["build-club-maker-kit", "build", "building-blocks", "classic-blocks"],
  ["cloud-dough-color-pack", "create", "clay-and-modeling", "play-dough"],
];

test("migration 020 contains the exact canonical Kids Velvet hierarchy", () => {
  for (const hierarchy of expected) {
    const fields = hierarchy.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    assert.match(migration, new RegExp(`\\('${fields.join("'\\s*,\\s*'")}'`));
  }
  assert.equal(new Set(expected.map((row) => row[0])).size, 8);
  assert.equal(new Set(expected.map((row) => row[1])).size, 5);
  assert.equal(new Set(expected.map((row) => row[2])).size, 7);
  assert.equal(new Set(expected.map((row) => row[3])).size, 8);
});

test("migration 020 is tenant-scoped, idempotent, and preserves unrelated data", () => {
  assert.match(migration, /on conflict \(company_id, slug\) do update/gi);
  assert.match(migration, /where product\.company_id = 'kids-velvet'/);
  assert.match(migration, /brand\.company_id = 'kids-velvet'/);
  assert.match(migration, /main\.company_id = 'kids-velvet'/);
  assert.doesNotMatch(migration, /\b(?:delete|truncate)\b\s+(?:from\s+)?public\./i);
  assert.doesNotMatch(migration, /['"]icare['"]/i);
  assert.doesNotMatch(migration, /website_media\s+(?:set|where|values)/i);
});

test("migration 020 resolves tenant-scoped brand, main-category, subcategory and product links", () => {
  assert.match(migration, /main\.brand_id = brand\.id/);
  assert.match(migration, /sub\.parent_id = main\.id/);
  assert.match(migration, /'mainCategoryId', resolved\.main_id/);
  assert.match(migration, /'subcategoryId', resolved\.sub_id/);
  assert.match(migration, /resolved_count <> 8/);
});
