import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.resolve(root, "../supabase/migrations/019_media_ownership_entity_fields.sql");
const backfillPath = path.resolve(root, "../scripts/backfill-legacy-website-media-to-entity-fields.sql");
const migration = fs.readFileSync(migrationPath, "utf8");
const backfill = fs.readFileSync(backfillPath, "utf8");

test("migration 019 is tenant-neutral schema only", () => {
  assert.match(migration, /add column if not exists hero_video text/);
  assert.match(migration, /add column if not exists hero_poster text/);
  assert.match(migration, /add column if not exists brand_id text/);
  assert.match(migration, /add column if not exists usage_video text/);
  assert.match(migration, /add column if not exists usage_video_poster text/);
  assert.doesNotMatch(migration, /kids-velvet/i);
  assert.doesNotMatch(migration, /from\s+public\.website_media/i);
  assert.doesNotMatch(migration, /delete\s+from/i);
});

test("optional backfill script reads website media video and fallback values from persisted JSONB data", () => {
  assert.match(backfill, /data\s*->>\s*'videoUrl'/);
  assert.match(backfill, /data\s*->>\s*'video_url'/);
  assert.match(backfill, /data\s*->>\s*'fallbackImageUrl'/);
  assert.match(backfill, /data\s*->>\s*'fallback_image_url'/);
  assert.match(backfill, /target_company_id/);
  assert.match(backfill, /set_config\('app\.target_company_id'/);
  assert.doesNotMatch(backfill, /delete\s+from\s+public\.website_media/i);
});
