import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-website-video-"));
const now = "2026-08-10T00:00:00.000Z";
const password = "Website-video-2026!";
const passwordHash = await hashPassword(password);

const users = [
  ["kids-admin", "kids-admin@test.local", "company_admin", []],
  ["kids-media-employee", "kids-media@test.local", "employee", ["website_media.manage"]],
  ["kids-texts-employee", "kids-texts@test.local", "employee", ["website_texts.manage"]],
  ["kids-plain-employee", "kids-plain@test.local", "employee", []],
  ["icare-media-employee", "icare-media@test.local", "employee", ["website_media.manage"]],
].map(([id, email, role, permissions]) => ({
  id, name: id, email, password: passwordHash, role, permissions, isActive: true, createdAt: now, updatedAt: now,
}));

const memberships = [
  ["kids-velvet", "kids-admin", "company_admin", []],
  ["kids-velvet", "kids-media-employee", "employee", ["website_media.manage"]],
  ["kids-velvet", "kids-texts-employee", "employee", ["website_texts.manage"]],
  ["kids-velvet", "kids-plain-employee", "employee", []],
  ["icare", "icare-media-employee", "employee", ["website_media.manage"]],
].map(([companyId, userId, role, permissions]) => ({
  id: `${companyId}:${userId}`, companyId, userId, role, status: "active", permissions, createdAt: now, updatedAt: now,
}));

fs.writeFileSync(path.join(dataStoreDir, "store.json"), `${JSON.stringify({
  version: 2,
  companies: [
    { id: "kids-velvet", slug: "kids-velvet", name: "i-play", status: "active", settings: { websiteConnection: { siteId: "kids-velvet-storefront", storefrontBaseUrl: "https://i-play-preview.vercel.app", defaultLocale: "ar", supportedLocales: ["ar", "en"] } } },
    { id: "icare", slug: "icare", name: "iCare", status: "active" },
  ],
  domains: [
    { id: "kids-domain", company_id: "kids-velvet", domain: "i-play-preview.vercel.app", is_primary: true, is_active: true, is_verified: true, created_at: now, updated_at: now },
  ],
  users,
  memberships,
  websiteTexts: [],
  websiteMedia: [
    { id: "icare-video", company_id: "icare", sectionKey: "home.hero.video", sectionLabel: "iCare home hero", groupKey: "home", videoUrl: "/uploads/icare/website-media/icare.mp4", mediaType: "video", isActive: true, createdAt: now, updatedAt: now },
    { id: "icare-image", company_id: "icare", sectionKey: "home.hero.poster", sectionLabel: "iCare home poster", groupKey: "home", imageUrl: "/uploads/icare/website-media/icare-poster.jpg", isActive: true, createdAt: now, updatedAt: now },
  ],
  websiteMediaHiddenKeys: [],
}, null, 2)}\n`, "utf8");

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "website-media-video-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });
const { app } = await import("../src/server.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

async function request(pathname, { token, body, method = body ? "POST" : "GET", headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(body && !(body instanceof Buffer) ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body && !(body instanceof Buffer) ? JSON.stringify(body) : body,
  });
  return { response, body: await response.json().catch(() => null) };
}

async function login(email) {
  const result = await request("/auth/login", { body: { email, password } });
  assert.equal(result.response.status, 200);
  return result.body.token;
}

function boundaryHeader(filename, contentType, boundary) {
  return `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`;
}

// A valid MP4-shaped container whose bytes 4..8 carry the "ftyp" signature.
function mp4Bytes(extra = 80) {
  return Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x18]),
    Buffer.from("ftypisom"),
    Buffer.alloc(extra, 0x42),
  ]);
}

test.after(() => {
  server.close();
  fs.rmSync(dataStoreDir, { recursive: true, force: true });
});

test("tenant-scoped website video upload, serialization and isolation", async (t) => {
  const kidsAdmin = await login("kids-admin@test.local");
  const kidsMedia = await login("kids-media@test.local");
  const kidsTexts = await login("kids-texts@test.local");
  const kidsPlain = await login("kids-plain@test.local");
  const icareMedia = await login("icare-media@test.local");

  await t.test("1 unauthenticated video upload is rejected", async () => {
    const boundary = `----B${Date.now()}`;
    const body = Buffer.concat([Buffer.from(boundaryHeader("a.mp4", "video/mp4", boundary)), mp4Bytes(), Buffer.from(`\r\n--${boundary}--\r\n`)]);
    const result = await request("/uploads/website-media", {
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body,
    });
    assert.equal(result.response.status, 401);
  });

  await t.test("2 employee without website_media.manage is denied video upload", async () => {
    const boundary = `----B${Date.now()}`;
    const body = Buffer.concat([Buffer.from(boundaryHeader("a.mp4", "video/mp4", boundary)), mp4Bytes(), Buffer.from(`\r\n--${boundary}--\r\n`)]);
    const result = await request("/uploads/website-media", {
      token: kidsTexts,
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body,
    });
    assert.equal(result.response.status, 403);
    assert.equal(result.body.message, "Website media permission required.");
  });

  await t.test("3 employee with no permissions is denied video upload", async () => {
    const result = await request("/uploads/website-media", { token: kidsPlain, method: "POST" });
    assert.equal(result.response.status, 403);
  });

  await t.test("4 non-video bytes declared as mp4 are rejected by container validation", async () => {
    const boundary = `----B${Date.now()}`;
    const body = Buffer.concat([Buffer.from(boundaryHeader("fake.mp4", "video/mp4", boundary)), Buffer.alloc(100, 0x41), Buffer.from(`\r\n--${boundary}--\r\n`)]);
    const result = await request("/uploads/website-media", {
      token: kidsMedia,
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body,
    });
    assert.equal(result.response.status, 400);
  });

  await t.test("5 MP4 container declared as webm is rejected as a mismatch", async () => {
    const boundary = `----B${Date.now()}`;
    const body = Buffer.concat([Buffer.from(boundaryHeader("a.webm", "video/webm", boundary)), mp4Bytes(), Buffer.from(`\r\n--${boundary}--\r\n`)]);
    const result = await request("/uploads/website-media", {
      token: kidsMedia,
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body,
    });
    assert.equal(result.response.status, 400);
    assert.match(result.body.message, /does not match/i);
  });
  await t.test("6 employee with website_media.manage can upload a website video", async () => {
    const boundary = `----B${Date.now()}`;
    const body = Buffer.concat([Buffer.from(boundaryHeader("play.mp4", "video/mp4", boundary)), mp4Bytes(), Buffer.from(`\r\n--${boundary}--\r\n`)]);
    const result = await request("/uploads/website-media", {
      token: kidsMedia,
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body,
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.body.mediaType, "video");
    assert.equal(result.body.contentType, "video/mp4");
    assert.ok(result.body.path);
    assert.ok(result.body.path.startsWith("/uploads/kids-velvet/website-media/"), `video must be tenant-scoped, got ${result.body.path}`);
    const resolved = path.resolve(process.env.UPLOADS_DIR, ...result.body.path.replace("/uploads/", "").split("/"));
    assert.equal(fs.existsSync(resolved), true, "uploaded video must persist on disk");
    assert.ok(!resolved.includes(".."), "no path traversal in persisted video path");
  });

  await t.test("7 icare employee uploads are scoped away from kids-velvet", async () => {
    const boundary = `----B${Date.now()}`;
    const body = Buffer.concat([Buffer.from(boundaryHeader("icare.mp4", "video/mp4", boundary)), mp4Bytes(), Buffer.from(`\r\n--${boundary}--\r\n`)]);
    const result = await request("/uploads/website-media", {
      token: icareMedia,
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body,
    });
    assert.equal(result.response.status, 201);
    assert.ok(result.body.path.startsWith("/uploads/icare/website-media/"));
  });

  await t.test("8 kids-velvet employee cannot read or mutate iCare website media", async () => {
    const all = await request("/website-media/all", { token: kidsMedia });
    assert.equal(all.response.status, 200);
    const ids = all.body.items.map((item) => item.id);
    assert.equal(ids.includes("icare-video"), false, "kids-velvet must not see iCare media");
    const mutateIcare = await request("/website-media/icare-video", {
      token: kidsMedia,
      method: "PUT",
      body: { videoUrl: "/uploads/kids-velvet/website-media/hijack.mp4", sectionKey: "home.hero.video" },
    });
    assert.equal(mutateIcare.response.status, 404, "cross-tenant mutation must not resolve");
  });

  await t.test("9 company_admin can create a website media item carrying a video", async () => {
    const create = await request("/website-media", {
      token: kidsAdmin,
      method: "POST",
      body: {
        sectionKey: "home.hero.video",
        sectionLabel: "Home hero video",
        groupKey: "home",
        videoUrl: "/uploads/kids-velvet/website-media/play.mp4",
        mediaType: "video",
        sortOrder: 5,
        isActive: true,
      },
    });
    assert.equal(create.response.status, 201);
    assert.equal(create.body.mediaType, "video");
    assert.equal(create.body.videoUrl, "/uploads/kids-velvet/website-media/play.mp4");
  });

  await t.test("10 persisted website media round-trips mediaType/videoUrl via the all endpoint", async () => {
    const all = await request("/website-media/all", { token: kidsAdmin });
    assert.equal(all.response.status, 200);
    const video = all.body.items.find((item) => item.sectionKey === "home.hero.video");
    assert.ok(video, "video media item must be present");
    assert.equal(video.mediaType, "video");
    assert.equal(video.videoUrl, "/uploads/kids-velvet/website-media/play.mp4");
  });

  await t.test("11 public storefront serialization exposes only safe video fields", async () => {
    const response = await fetch(`${baseUrl.replace("/api", "")}/api/storefront/content?locale=ar`, {
      headers: { "X-Company-Id": "kids-velvet", "X-Site-Id": "kids-velvet-storefront", Origin: "https://i-play-preview.vercel.app" },
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    const video = body.media.find((item) => item.sectionKey === "home.hero.video");
    assert.ok(video, "storefront media must include the video slot");
    assert.equal(video.mediaType, "video");
    assert.equal(video.video, "/uploads/kids-velvet/website-media/play.mp4");
    assert.ok("image" in video);
    assert.ok("fallbackImage" in video);
    assert.ok("sortOrder" in video);
    assert.ok("sectionKey" in video);
    assert.equal("company_id" in video, false, "no internal company id in public media");
    assert.equal("videoUrl" in video, false, "camelCase internal field must not leak to storefront");
    assert.equal("updatedAt" in video, false, "admin timestamps must not leak to storefront");
  });
});
