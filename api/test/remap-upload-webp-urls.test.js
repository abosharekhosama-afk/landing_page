import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  applyRemapToRecord,
  buildRemapPlan,
  discoverMediaReferences,
  isUploadsImageUrl,
  parseArgs,
  summarize,
  webpCandidateFor,
  webpExists,
} from "../scripts/remap-upload-webp-urls.mjs";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("parseArgs defaults to dry-run and honors --company / --apply", () => {
  assert.deepEqual(parseArgs([]), { dryRun: true, apply: false, company: null });
  assert.deepEqual(parseArgs(["--dry-run"]), { dryRun: true, apply: false, company: null });
  assert.deepEqual(parseArgs(["--company=kids-velvet"]), {
    dryRun: true,
    apply: false,
    company: "kids-velvet",
  });
  const applied = parseArgs(["--apply", "--company=kids-velvet"]);
  assert.equal(applied.apply, true);
  assert.equal(applied.dryRun, false);
  assert.equal(applied.company, "kids-velvet");
});

test("isUploadsImageUrl only matches /uploads/ png/jpg/jpeg references", () => {
  assert.equal(isUploadsImageUrl("/uploads/co/foo.jpg"), true);
  assert.equal(isUploadsImageUrl("/uploads/co/foo.jpeg"), true);
  assert.equal(isUploadsImageUrl("/uploads/co/foo.png"), true);
  assert.equal(isUploadsImageUrl("https://api.example.com/uploads/co/foo.jpg?v=1"), true);
  assert.equal(isUploadsImageUrl("/uploads/co/foo.webp"), false, "already webp");
  assert.equal(isUploadsImageUrl("/uploads/co/foo.gif"), false);
  assert.equal(isUploadsImageUrl("/uploads/co/foo.mp4"), false);
  assert.equal(isUploadsImageUrl("https://cdn.example.com/other/asset.jpg"), false, "not /uploads/");
  assert.equal(isUploadsImageUrl("/images/products/foo.jpg"), false);
  assert.equal(isUploadsImageUrl(""), false);
  assert.equal(isUploadsImageUrl(null), false);
});

test("webpCandidateFor swaps the extension and preserves query strings", () => {
  assert.equal(webpCandidateFor("/uploads/co/foo.jpg"), "/uploads/co/foo.webp");
  assert.equal(webpCandidateFor("/uploads/co/foo.png"), "/uploads/co/foo.webp");
  assert.equal(webpCandidateFor("https://api.example.com/uploads/co/foo.jpeg?v=1"), "https://api.example.com/uploads/co/foo.webp?v=1");
  assert.equal(webpCandidateFor("/uploads/co/foo.webp"), "/uploads/co/foo.webp");
  assert.equal(webpCandidateFor(""), "");
});

test("discoverMediaReferences classifies brand/category/product/gallery/variant/banner/other", () => {
  const catalog = {
    companyId: "kids-velvet",
    brands: [
      {
        id: "velvet",
        logoUrl: "/uploads/kids-velvet/brands/velvet/logo.jpg",
        heroPoster: "https://cdn.example/poster.jpg",
        headerImage: "/uploads/kids-velvet/brands/velvet/header.jpg",
        menuImage: "/uploads/kids-velvet/brands/velvet/menu.png",
      },
    ],
    categories: [{ id: "toys", imageUrl: "/uploads/kids-velvet/categories/toys.png" }],
    products: [
      {
        id: "p1",
        image: "/uploads/kids-velvet/products/toy.jpg",
        hoverImage: "/uploads/kids-velvet/products/toy-hover.jpeg",
        usageVideoPoster: "/uploads/kids-velvet/products/toy-poster.jpg",
        fallbackImage: "/uploads/kids-velvet/products/toy-fallback.jpg",
        detailSectionImages: { howToUse: "/uploads/kids-velvet/products/how.jpg" },
        gallery_images: [{ id: "g1", image_url: "/uploads/kids-velvet/products/toy-g1.jpg" }],
        variants: [{ id: "v1", image_url: "/uploads/kids-velvet/products/toy-v1.jpg" }],
      },
    ],
    websiteMedia: [
      {
        id: "wm1",
        imageUrl: "/uploads/kids-velvet/website-media/hero.jpg",
        fallbackImageUrl: "/uploads/kids-velvet/website-media/fallback.png",
      },
    ],
    companies: [
      {
        id: "kids-velvet",
        settings: {
          logoUrl: "/uploads/kids-velvet/logo.png",
          faviconUrl: "/uploads/kids-velvet/favicon.jpg",
        },
      },
    ],
  };

  const refs = discoverMediaReferences(catalog);
  const byType = (type) => refs.filter((ref) => ref.entityType === type);

  assert.equal(byType("brand").length, 3, "logoUrl/headerImage/menuImage; CDN heroPoster skipped");
  assert.equal(byType("category").length, 1);
  assert.equal(byType("product").length, 5, "image/hoverImage/usageVideoPoster/fallbackImage/detailSectionImages");
  assert.equal(byType("gallery").length, 1);
  assert.equal(byType("variant").length, 1);
  assert.equal(byType("banner").length, 2, "imageUrl + fallbackImageUrl");
  assert.equal(byType("other").length, 2, "company settings logoUrl + faviconUrl");
  assert.ok(refs.every((ref) => ref.from.startsWith("/uploads/")), "external/CDN URLs are never remapped");
  assert.ok(refs.every((ref) => Array.isArray(ref.path) && ref.path.length > 0), "every ref carries a write path");
});

test("discoverMediaReferences scans vlogs + vlogHero from company website content", () => {
  const catalog = {
    companyId: "kids-velvet",
    brands: [],
    categories: [],
    products: [],
    websiteMedia: [],
    companies: [],
    vlogs: [
      {
        id: "vlog-1",
        posterUrl: "/uploads/kids-velvet/vlogs/vlog-1.jpg",
        imageUrl: "/uploads/kids-velvet/vlogs/vlog-1-cover.png",
        thumbnail: "https://cdn.example/vlog-1-thumb.jpg",
        videoUrl: "/uploads/kids-velvet/vlogs/vlog-1.mp4",
      },
      { id: "vlog-2", posterUrl: "/uploads/kids-velvet/vlogs/vlog-2.jpg" },
    ],
    vlogHero: {
      imageUrl: "/uploads/kids-velvet/vlogs/hero.jpg",
      posterUrl: "/uploads/kids-velvet/vlogs/hero-poster.png",
      videoUrl: "/uploads/kids-velvet/vlogs/hero.mp4",
    },
  };

  const refs = discoverMediaReferences(catalog);
  const vlogRefs = refs.filter((ref) => ref.entityType === "vlog");
  const heroRefs = refs.filter((ref) => ref.entityType === "vlogHero");

  assert.equal(vlogRefs.length, 3, "vlog-1 posterUrl+imageUrl, vlog-2 posterUrl; CDN thumbnail + mp4 skipped");
  assert.equal(heroRefs.length, 2, "vlogHero imageUrl + posterUrl; mp4 skipped");

  assert.deepEqual(vlogRefs[0], {
    companyId: "kids-velvet",
    entityType: "vlog",
    entityId: "vlog-1",
    field: "vlogs[0].posterUrl",
    path: ["settings", "websiteContent", "vlogs", 0, "posterUrl"],
    from: "/uploads/kids-velvet/vlogs/vlog-1.jpg",
  });
  assert.deepEqual(heroRefs[0], {
    companyId: "kids-velvet",
    entityType: "vlogHero",
    entityId: "kids-velvet",
    field: "vlogHero.imageUrl",
    path: ["settings", "websiteContent", "vlogHero", "imageUrl"],
    from: "/uploads/kids-velvet/vlogs/hero.jpg",
  });
});

test("buildRemapPlan only includes remaps whose WebP sibling exists (mocked existence)", async () => {
  const catalog = {
    companyId: "kids-velvet",
    brands: [
      {
        id: "velvet",
        logoUrl: "/uploads/kids-velvet/brands/velvet/logo.jpg",
        heroPoster: "/uploads/kids-velvet/brands/velvet/poster.jpg",
      },
    ],
    categories: [],
    products: [],
    websiteMedia: [],
    companies: [],
  };
  const exists = async (candidate) => candidate.endsWith("logo.webp");
  const remaps = await buildRemapPlan(catalog, { exists });

  assert.equal(remaps.length, 1);
  assert.deepEqual(remaps[0], {
    companyId: "kids-velvet",
    entityType: "brand",
    entityId: "velvet",
    field: "logoUrl",
    path: ["logoUrl"],
    from: "/uploads/kids-velvet/brands/velvet/logo.jpg",
    to: "/uploads/kids-velvet/brands/velvet/logo.webp",
  });
});

test("applyRemapToRecord writes only when the current value still matches from", () => {
  const record = {
    image: "/uploads/co/foo.jpg",
    gallery_images: [{ id: "g1", image_url: "/uploads/co/bar.jpg" }],
    variants: [{ id: "v1", image_url: "/uploads/co/baz.png" }],
  };

  assert.equal(
    applyRemapToRecord(record, { path: ["image"], from: "/uploads/co/foo.jpg", to: "/uploads/co/foo.webp" }),
    true,
  );
  assert.equal(record.image, "/uploads/co/foo.webp");

  // Stale `from` must not clobber a newer value.
  assert.equal(
    applyRemapToRecord(record, { path: ["image"], from: "/uploads/co/old.jpg", to: "/uploads/co/old.webp" }),
    false,
  );
  assert.equal(record.image, "/uploads/co/foo.webp");

  assert.equal(
    applyRemapToRecord(record, { path: ["gallery_images", 0, "image_url"], from: "/uploads/co/bar.jpg", to: "/uploads/co/bar.webp" }),
    true,
  );
  assert.equal(record.gallery_images[0].image_url, "/uploads/co/bar.webp");

  assert.equal(
    applyRemapToRecord(record, { path: ["variants", 0, "image_url"], from: "/uploads/co/baz.png", to: "/uploads/co/baz.webp" }),
    true,
  );
  assert.equal(record.variants[0].image_url, "/uploads/co/baz.webp");
});

test("webpExists prefers the UPLOADS_DIR filesystem when provided", async () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "remap-exists-"));
  try {
    const uploadsDir = path.join(fixtureRoot, "uploads");
    fs.mkdirSync(path.join(uploadsDir, "kids-velvet", "brands", "velvet"), { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, "kids-velvet", "brands", "velvet", "logo.webp"), Buffer.from("webp"));

    assert.equal(
      await webpExists("/uploads/kids-velvet/brands/velvet/logo.webp", { uploadsDir }),
      true,
    );
    assert.equal(
      await webpExists("/uploads/kids-velvet/brands/velvet/missing.webp", { uploadsDir }),
      false,
    );
    assert.equal(
      await webpExists("https://api.example.com/uploads/kids-velvet/brands/velvet/logo.webp", { uploadsDir }),
      true,
      "absolute /uploads/ URLs resolve against the same filesystem",
    );
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("webpExists falls back to HEAD requests against PUBLIC_API_URL (mocked fetch)", async () => {
  const originalFetch = global.fetch;
  const requested = [];
  global.fetch = async (url, options) => {
    requested.push({ url, options });
    return { ok: String(url).endsWith("logo.webp") };
  };
  try {
    assert.equal(
      await webpExists("/uploads/kids-velvet/logo.webp", { publicApiUrl: "https://api-staging.igroup.website" }),
      true,
    );
    assert.equal(
      await webpExists("/uploads/kids-velvet/missing.webp", { publicApiUrl: "https://api-staging.igroup.website" }),
      false,
    );
    assert.equal(requested.length, 2);
    assert.equal(requested[0].url, "https://api-staging.igroup.website/uploads/kids-velvet/logo.webp");
    assert.equal(requested[0].options.method, "HEAD");
  } finally {
    global.fetch = originalFetch;
  }
});

test("summarize reports mode, company filter, counts by entity type, remaps, and totals", () => {
  const remaps = [
    { companyId: "kids-velvet", entityType: "brand", entityId: "velvet", field: "logoUrl", path: ["logoUrl"], from: "/uploads/a.jpg", to: "/uploads/a.webp" },
    { companyId: "kids-velvet", entityType: "gallery", entityId: "p1", field: "gallery[0].image_url", path: ["gallery_images", 0, "image_url"], from: "/uploads/b.jpg", to: "/uploads/b.webp" },
  ];
  const summary = summarize(remaps, { apply: false, company: "kids-velvet" }, "run-1", {
    companiesScanned: 1,
    references: 5,
  });

  assert.equal(summary.mode, "dry-run");
  assert.equal(summary.runId, "run-1");
  assert.equal(summary.companyFilter, "kids-velvet");
  assert.equal(summary.companiesScanned, 1);
  assert.equal(summary.countsByEntityType.brand, 1);
  assert.equal(summary.countsByEntityType.gallery, 1);
  assert.equal(summary.countsByEntityType.product, 0);
  assert.equal(summary.totals.references, 5);
  assert.equal(summary.totals.remaps, 2);
  assert.equal(summary.totals.missingWebp, 3);
  assert.ok(summary.remaps.every((entry) => !("path" in entry)), "public remap entries must not leak the internal path");
  assert.deepEqual(Object.keys(summary.remaps[0]).sort(), ["companyId", "entityId", "entityType", "field", "from", "to"]);
});

test("remap dry-run on temp fixture store classifies and reports without writing", () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "remap-fixture-"));
  try {
    const dataStoreDir = path.join(fixtureRoot, "data-store");
    const uploadsDir = path.join(fixtureRoot, "uploads");
    fs.mkdirSync(dataStoreDir, { recursive: true });
    fs.mkdirSync(path.join(uploadsDir, "kids-velvet", "brands", "velvet"), { recursive: true });
    fs.mkdirSync(path.join(uploadsDir, "kids-velvet", "categories"), { recursive: true });
    fs.mkdirSync(path.join(uploadsDir, "kids-velvet", "products"), { recursive: true });
    fs.mkdirSync(path.join(uploadsDir, "kids-velvet", "website-media"), { recursive: true });

    const now = "2026-09-13T00:00:00.000Z";
    fs.writeFileSync(
      path.join(dataStoreDir, "store.json"),
      `${JSON.stringify({
        version: 2,
        companies: [
          {
            id: "kids-velvet",
            slug: "kids-velvet",
            name: "i-play",
            status: "active",
            settings: {
              logoUrl: "/uploads/kids-velvet/logo.png",
              websiteContent: {
                vlogs: [
                  {
                    id: "vlog-1",
                    slug: "story-1",
                    title: { en: "Story 1", ar: "قصة ١" },
                    posterUrl: "/uploads/kids-velvet/vlogs/vlog-1.jpg",
                    imageUrl: "/uploads/kids-velvet/vlogs/vlog-1-cover.png",
                  },
                ],
                vlogHero: {
                  title: { en: "Hero", ar: "واجهة" },
                  imageUrl: "/uploads/kids-velvet/vlogs/hero.jpg",
                },
              },
            },
            createdAt: now,
            updatedAt: now,
          },
        ],
        brands: [
          {
            id: "velvet",
            company_id: "kids-velvet",
            slug: "velvet",
            name: { en: "VELVET", ar: "VELVET" },
            logoUrl: "/uploads/kids-velvet/brands/velvet/logo.jpg",
            heroPoster: "/uploads/kids-velvet/brands/velvet/poster.jpg",
            headerImage: "/uploads/kids-velvet/brands/velvet/header.jpg",
            menuImage: "/uploads/kids-velvet/brands/velvet/menu.jpg",
            sortOrder: 0,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
        ],
        categories: [
          {
            id: "toys",
            company_id: "kids-velvet",
            slug: "toys",
            name: { en: "Toys", ar: "ألعاب" },
            imageUrl: "/uploads/kids-velvet/categories/toys.jpg",
            sortOrder: 0,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
        ],
        products: [
          {
            id: "p1",
            company_id: "kids-velvet",
            slug: "toy",
            name: { en: "Toy", ar: "لعبة" },
            image: "/uploads/kids-velvet/products/toy.jpg",
            hoverImage: "/uploads/kids-velvet/products/toy-hover.jpg",
            gallery_images: [
              { id: "g1", image_url: "/uploads/kids-velvet/products/toy-g1.jpg", sort_order: 0 },
            ],
            variants: [
              {
                id: "v1",
                color_name: "Default",
                color_value: "",
                size: "S",
                price: 10,
                stock: 2,
                image_url: "/uploads/kids-velvet/products/toy-v1.jpg",
                sort_order: 0,
              },
            ],
            sortOrder: 0,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
        ],
        websiteMedia: [
          {
            id: "wm1",
            company_id: "kids-velvet",
            sectionKey: "home.hero",
            sectionLabel: "Home hero",
            groupKey: "home",
            imageUrl: "/uploads/kids-velvet/website-media/hero.jpg",
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
        ],
      }, null, 2)}\n`,
      "utf8",
    );

    // WebP siblings that exist on disk (others intentionally missing).
    for (const relative of [
      "kids-velvet/brands/velvet/logo.webp",
      "kids-velvet/brands/velvet/header.webp",
      "kids-velvet/categories/toys.webp",
      "kids-velvet/products/toy.webp",
      "kids-velvet/products/toy-g1.webp",
      "kids-velvet/website-media/hero.webp",
      "kids-velvet/logo.webp",
      "kids-velvet/vlogs/vlog-1.webp",
      "kids-velvet/vlogs/vlog-1-cover.webp",
      "kids-velvet/vlogs/hero.webp",
    ]) {
      const full = path.join(uploadsDir, relative);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, Buffer.from("webp"));
    }

    const result = spawnSync(
      process.execPath,
      ["scripts/remap-upload-webp-urls.mjs", "--dry-run", "--company=kids-velvet"],
      {
        cwd: apiRoot,
        env: {
          ...process.env,
          NODE_ENV: "test",
          ALLOW_LOCAL_CATALOG_STORAGE: "true",
          DATA_STORE_DIR: dataStoreDir,
          UPLOADS_DIR: uploadsDir,
          DATABASE_URL: "",
          POSTGRES_URL: "",
          SUPABASE_URL: "",
          SUPABASE_SERVICE_ROLE_KEY: "",
        },
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr);

    const summary = JSON.parse(result.stdout);
    assert.equal(summary.mode, "dry-run");
    assert.equal(summary.companyFilter, "kids-velvet");
    assert.equal(summary.companiesScanned, 1);
    assert.equal(summary.countsByEntityType.brand, 2, "logoUrl + headerImage remap; poster/menu missing");
    assert.equal(summary.countsByEntityType.category, 1);
    assert.equal(summary.countsByEntityType.product, 1, "image remaps; hoverImage missing");
    assert.equal(summary.countsByEntityType.gallery, 1);
    assert.equal(summary.countsByEntityType.variant, 0, "variant webp missing");
    assert.equal(summary.countsByEntityType.banner, 1);
    assert.equal(summary.countsByEntityType.other, 1, "company settings logoUrl remaps");
    assert.equal(summary.countsByEntityType.vlog, 2, "vlog posterUrl + imageUrl remap");
    assert.equal(summary.countsByEntityType.vlogHero, 1, "vlogHero imageUrl remaps");
    assert.equal(summary.totals.references, 14);
    assert.equal(summary.totals.remaps, 10);
    assert.equal(summary.totals.missingWebp, 4);

    const byField = Object.fromEntries(summary.remaps.map((entry) => [entry.field, entry]));
    assert.deepEqual(byField.logoUrl, {
      companyId: "kids-velvet",
      entityType: "brand",
      entityId: "velvet",
      field: "logoUrl",
      from: "/uploads/kids-velvet/brands/velvet/logo.jpg",
      to: "/uploads/kids-velvet/brands/velvet/logo.webp",
    });
    assert.deepEqual(byField["gallery[0].image_url"], {
      companyId: "kids-velvet",
      entityType: "gallery",
      entityId: "p1",
      field: "gallery[0].image_url",
      from: "/uploads/kids-velvet/products/toy-g1.jpg",
      to: "/uploads/kids-velvet/products/toy-g1.webp",
    });
    assert.deepEqual(byField["settings.logoUrl"], {
      companyId: "kids-velvet",
      entityType: "other",
      entityId: "kids-velvet",
      field: "settings.logoUrl",
      from: "/uploads/kids-velvet/logo.png",
      to: "/uploads/kids-velvet/logo.webp",
    });

    // Dry-run must not write anything.
    assert.ok(!fs.existsSync(path.join(apiRoot, "scripts", ".remap-backup")), "no backup dir on dry-run");
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("remap --apply without CONFIRM=STAGING refuses", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/remap-upload-webp-urls.mjs", "--apply"],
    {
      cwd: apiRoot,
      env: { ...process.env, NODE_ENV: "test", DATABASE_URL: "", POSTGRES_URL: "" },
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 2, result.stdout);
  assert.match(result.stderr, /CONFIRM=STAGING/);
});

test("remap refuses when a production marker is detected", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/remap-upload-webp-urls.mjs", "--dry-run"],
    {
      cwd: apiRoot,
      env: { ...process.env, NODE_ENV: "production", DATABASE_URL: "", POSTGRES_URL: "" },
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 2, result.stdout);
  assert.match(result.stderr, /production marker detected/);
});