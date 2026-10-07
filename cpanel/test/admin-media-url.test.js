import assert from "node:assert/strict";
import test from "node:test";

import { isAdminMediaVideoUrl } from "../src/utils/adminMediaUrl.js";
import { resolveApiAssetUrl } from "../src/utils/api.js";

test("isAdminMediaVideoUrl detects video by file extension only", () => {
  assert.equal(isAdminMediaVideoUrl("https://api-staging.igroup.website/uploads/kids-velvet/video-poster.jpg"), false);
  assert.equal(isAdminMediaVideoUrl("https://api-staging.igroup.website/uploads/kids-velvet/video-box.png"), false);
  assert.equal(isAdminMediaVideoUrl("https://api-staging.igroup.website/uploads/kids-velvet/clip.mp4"), true);
  assert.equal(isAdminMediaVideoUrl("https://api-staging.igroup.website/uploads/kids-velvet/clip.webm?token=abc"), true);
  assert.equal(isAdminMediaVideoUrl("https://api-staging.igroup.website/uploads/kids-velvet/clip.ogg"), true);
  assert.equal(isAdminMediaVideoUrl("https://api-staging.igroup.website/uploads/kids-velvet/clip.mov"), true);
  assert.equal(isAdminMediaVideoUrl(""), false);
  assert.equal(isAdminMediaVideoUrl(null), false);
});

test("isAdminMediaVideoUrl treats /video/ and /videos/ path segments as video directories", () => {
  assert.equal(isAdminMediaVideoUrl("https://api-staging.igroup.website/uploads/video/poster.jpg"), true);
  assert.equal(isAdminMediaVideoUrl("https://api-staging.igroup.website/uploads/videos/poster.jpg"), true);
  assert.equal(isAdminMediaVideoUrl("https://api-staging.igroup.website/uploads/video-poster.jpg"), false);
  assert.equal(isAdminMediaVideoUrl("https://api-staging.igroup.website/uploads/video-box.png"), false);
});

test("resolveApiAssetUrl rewrites /uploads/ http(s) URLs to the configured API origin", () => {
  const rewritten = resolveApiAssetUrl("https://wrong-host.example/uploads/kids-velvet/video-poster.jpg");
  assert.equal(rewritten, "http://localhost:5000/uploads/kids-velvet/video-poster.jpg");
  const withQuery = resolveApiAssetUrl("https://wrong-host.example/uploads/kids-velvet/clip.mp4?v=1");
  assert.equal(withQuery, "http://localhost:5000/uploads/kids-velvet/clip.mp4?v=1");
  assert.equal(resolveApiAssetUrl("/uploads/kids-velvet/video-poster.jpg"), "http://localhost:5000/uploads/kids-velvet/video-poster.jpg");
  assert.equal(resolveApiAssetUrl("https://cdn.example.com/other/asset.jpg"), "https://cdn.example.com/other/asset.jpg");
  assert.equal(resolveApiAssetUrl(""), null);
  assert.equal(resolveApiAssetUrl(null), null);
});