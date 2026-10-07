import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  MEDIA_SLOT_CATALOGS,
  aboutImageSlotKeys,
  buildWebsiteMediaWorkspace,
  formatMediaGroupLabel,
  groupMediaSlotsByPage,
  isCatalogOwnedMediaKey,
  newsImageSlotKeys,
  resolveMediaSlot,
  resolveMediaSlots,
  siteLogoSlotKey,
  siteMediaSlotKeys,
} from "../src/data/mediaSlots.js";
import { defaultWebsiteMedia, getWebsiteMediaImage } from "../src/data/websiteMedia.js";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const managerSource = read("../src/components/MediaSlotsManager.jsx");
const editorSource = read("../src/components/WebsiteMediaManager.jsx");
const slotsSource = read("../src/data/mediaSlots.js");
const featureSource = read("../src/pages/AdminFeaturePage.jsx");

test("optional storefront-media-v1 catalog keeps persisted key continuity without Velvet labels", () => {
  assert.deepEqual(siteMediaSlotKeys(), [
    "home.hero.video",
    "home.hero.poster",
    "about.hero.video",
    "about.hero.poster",
    "contact.hero.poster",
  ]);
  assert.equal(siteLogoSlotKey(), "site.logo");
  assert.deepEqual(aboutImageSlotKeys(), ["about.0.image", "about.1.image", "about.2.image", "about.3.image"]);
  assert.deepEqual(newsImageSlotKeys(), ["news.0.image", "news.1.image", "news.2.image", "news.3.image", "news.4.image"]);
  const catalog = MEDIA_SLOT_CATALOGS["storefront-media-v1"];
  assert.ok(catalog.every((slot) => slot.label && !/velvet|pocket worlds|odd pals|cloud dough/i.test(slot.label)));
  assert.doesNotMatch(slotsSource, /PARENT_BRAND|ABOUT_SECTIONS|NEWS_ITEMS|VELVET|Pocket Worlds|Odd Pals/i);
});

test("news.banner catalog slot is separate from news card image slots", () => {
  const catalog = MEDIA_SLOT_CATALOGS["storefront-media-v1"];
  const banner = catalog.find((slot) => slot.key === "news.banner");
  assert.ok(banner, "news.banner slot exists in storefront-media-v1 catalog");
  assert.equal(banner.page, "News");
  assert.equal(banner.label, "News Banner");
  assert.equal(banner.kind, "video");
  assert.deepEqual(banner.acceptedTypes, ["video", "image"]);

  assert.deepEqual(newsImageSlotKeys(), ["news.0.image", "news.1.image", "news.2.image", "news.3.image", "news.4.image"]);
  assert.ok(!newsImageSlotKeys().includes("news.banner"));
});

test("news.banner resolves alongside news card images via catalog", () => {
  const viaCatalogId = resolveMediaSlots({
    settings: { websiteContent: { mediaSlotCatalog: "storefront-media-v1" } },
  }, []);
  const keys = viaCatalogId.map((slot) => slot.key);
  assert.ok(keys.includes("news.banner"));
  assert.ok(keys.includes("news.0.image"));
  assert.ok(keys.includes("news.4.image"));
  const banner = viaCatalogId.find((slot) => slot.key === "news.banner");
  assert.equal(banner.page, "News");
  assert.equal(banner.section, "Hero");
  assert.equal(banner.kind, "video");

  const viaExisting = resolveMediaSlots({ settings: {} }, [{ sectionKey: "news.0.image", imageUrl: "/x.jpg" }]);
  assert.ok(viaExisting.some((slot) => slot.key === "news.banner"));
  assert.ok(viaExisting.some((slot) => slot.key === "news.0.image"));
});

test("empty site does not inject storefront media defaults", () => {
  const workspace = buildWebsiteMediaWorkspace({ id: "any-tenant", settings: {} }, []);
  assert.equal(workspace.empty, true);
  assert.deepEqual(workspace.items, []);
  assert.equal(resolveMediaSlots({ settings: {} }, []).length, 0);
});

test("configured media slots drive page/section grouping for two sites", () => {
  const siteA = {
    settings: {
      websiteContent: {
        mediaSlots: [
          { key: "home.hero.image", page: "Home", section: "Hero", label: "Hero image", kind: "image" },
          { key: "about.hero.image", page: "About", section: "Hero", label: "About image", kind: "image" },
        ],
      },
    },
  };
  const siteB = {
    settings: {
      websiteContent: {
        mediaSlots: [
          { key: "home.hero.video", page: "Home", section: "Hero", label: "Hero video", kind: "video" },
          { key: "news.0.image", page: "News", section: "Cards", label: "News image", kind: "image" },
          { key: "footer.logo", page: "Footer", section: "Identity", label: "Footer logo", kind: "logo" },
        ],
      },
    },
  };

  const pagesA = groupMediaSlotsByPage(resolveMediaSlots(siteA)).map((entry) => entry.page);
  const pagesB = groupMediaSlotsByPage(resolveMediaSlots(siteB)).map((entry) => entry.page);
  assert.deepEqual(pagesA, ["Home", "About"]);
  assert.deepEqual(pagesB, ["Home", "News", "Footer"]);

  const workspaceA = buildWebsiteMediaWorkspace(siteA, [
    { sectionKey: "home.hero.image", imageUrl: "/a.jpg", updatedAt: "2026-01-01T00:00:00.000Z" },
  ]);
  assert.equal(workspaceA.existingCount, 1);
  assert.equal(workspaceA.missingCount, 1);
  assert.equal(workspaceA.items.find((item) => item.key === "about.hero.image").status, "missing");
  assert.equal(workspaceA.items.find((item) => item.key === "home.hero.image").label, "Hero image");

  const workspaceB = buildWebsiteMediaWorkspace(siteB, []);
  assert.equal(workspaceB.existingCount, 0);
  assert.equal(workspaceB.missingCount, 3);
  assert.deepEqual(workspaceB.pages, ["Footer", "Home", "News"]);
});

test("mediaKey from Website Content slots becomes media workspace fields", () => {
  const company = {
    settings: {
      websiteContent: {
        slots: [
          { key: "news.0.title", page: "News", section: "Cards", label: "Card 1 title", mediaKey: "news.0.image" },
          { key: "home.hero.title", page: "Home", section: "Hero", label: "Hero title", mediaKey: "home.hero.poster" },
        ],
      },
    },
  };
  const slots = resolveMediaSlots(company, []);
  assert.ok(slots.some((slot) => slot.key === "news.0.image" && slot.page === "News"));
  assert.ok(slots.some((slot) => slot.key === "home.hero.poster" && slot.page === "Home"));
});

test("existing persisted media fallback keeps records visible without catalog injection for unrelated keys", () => {
  const workspace = buildWebsiteMediaWorkspace({ settings: {} }, [
    { sectionKey: "custom.banner", sectionLabel: "Promo banner", imageUrl: "/promo.jpg", groupKey: "Home", updatedAt: "2026-08-01T00:00:00.000Z" },
  ]);
  assert.equal(workspace.empty, false);
  assert.equal(workspace.items[0].key, "custom.banner");
  assert.equal(workspace.items[0].status, "existing");
  assert.equal(workspace.items[0].label, "Promo banner");
});

test("catalog auto-attach only when existing keys match catalog metadata", () => {
  const blank = resolveMediaSlots({ settings: {} }, []);
  assert.deepEqual(blank, []);

  const viaCatalogId = resolveMediaSlots({
    settings: { websiteContent: { mediaSlotCatalog: "storefront-media-v1" } },
  }, []);
  assert.ok(viaCatalogId.some((slot) => slot.key === "site.logo"));
  assert.ok(viaCatalogId.some((slot) => slot.key === "news.0.image"));

  const viaExisting = resolveMediaSlots({ settings: {} }, [{ sectionKey: "home.hero.poster", imageUrl: "/x.jpg" }]);
  assert.ok(viaExisting.some((slot) => slot.key === "home.hero.poster"));
  assert.ok(viaExisting.some((slot) => slot.key === "about.0.image"));
});

test("catalog-owned brand/category/product keys stay out of Website Media", () => {
  assert.equal(isCatalogOwnedMediaKey("brand.velvet.logo"), true);
  assert.equal(isCatalogOwnedMediaKey("category.1.heroVideo"), true);
  assert.equal(isCatalogOwnedMediaKey("product.abc.usageVideo"), true);
  assert.equal(isCatalogOwnedMediaKey("home.hero.poster"), false);
  const workspace = buildWebsiteMediaWorkspace({ settings: {} }, [
    { sectionKey: "brand.x.logo", imageUrl: "/logo.jpg" },
    { sectionKey: "home.hero.poster", imageUrl: "/poster.jpg" },
  ]);
  assert.ok(!workspace.items.some((item) => item.key.startsWith("brand.")));
  assert.ok(workspace.items.some((item) => item.key === "home.hero.poster"));
});

test("resolveMediaSlot picks the newest matching item by sectionKey", () => {
  const items = [
    { id: "old", sectionKey: "home.hero.poster", imageUrl: "/old.jpg", updatedAt: "2026-01-01T00:00:00.000Z", sortOrder: 1 },
    { id: "new", sectionKey: "home.hero.poster", imageUrl: "/new.jpg", updatedAt: "2026-08-01T00:00:00.000Z", sortOrder: 2 },
  ];
  assert.equal(resolveMediaSlot(items, "home.hero.poster").id, "new");
  assert.equal(resolveMediaSlot(items, "missing"), null);
});

test("Website Media manager is config-driven with manager UX and no Velvet branding", () => {
  assert.match(managerSource, /buildWebsiteMediaWorkspace/);
  assert.match(managerSource, /website-media-workspace/);
  assert.match(managerSource, /website-media-page-nav/);
  assert.match(managerSource, /No website media fields are configured for this site/);
  assert.match(managerSource, /website_media\.manage/);
  assert.match(managerSource, /View only/);
  assert.match(managerSource, /dir=\{isArabic \? "rtl" : "ltr"\}/);
  assert.doesNotMatch(managerSource, /VELVET|PARENT_BRAND|aboutImageSlots\(\)|newsImageSlots\(\)|SITE_MEDIA_SLOTS/);
  assert.doesNotMatch(managerSource, /kids-velvet|eb-chemical|iPlay|i-play|companyId\s*===|siteId\s*===/i);
});

test("Website Media no longer owns Brand/Category/Product media editors", () => {
  assert.doesNotMatch(managerSource, /VELVET_BRANCHES/);
  assert.doesNotMatch(managerSource, /brandMediaSlots|brand\.\$\{group\.key\}\.logo/);
  assert.doesNotMatch(managerSource, /CategoryImageEditor/);
  assert.doesNotMatch(managerSource, /categoryHeroMediaSlots/);
  assert.doesNotMatch(managerSource, /productMediaSlots|productQuery|filteredProducts/);
  assert.doesNotMatch(slotsSource, /export function brandMediaSlots/);
  assert.doesNotMatch(slotsSource, /export function categoryHeroMediaSlots/);
  assert.doesNotMatch(slotsSource, /export function productMediaSlots/);
});

test("shared media slot registry has no storefront tenant hardcoding", () => {
  assert.doesNotMatch(slotsSource, /kids-velvet|eb-chemical|iPlay|i-play|Velvet Kids/i);
  assert.doesNotMatch(slotsSource, /companyId\s*===|siteId\s*===|if\s*\(\s*company\.id/);
  assert.doesNotMatch(slotsSource, /slug:\s*"velvet"/);
});

test("Website Content links to Website Media with mediaKey focus", () => {
  assert.match(featureSource, /mediaKey=\$\{encodeURIComponent\(mediaKey\)\}/);
  assert.match(featureSource, /admin-website-media/);
  assert.match(managerSource, /mediaKey|media-key/);
});

test("MediaEditor supports view-only and upload/replace/remove when editable", () => {
  assert.match(editorSource, /readOnly = false/);
  assert.match(editorSource, /Upload \/ Replace|رفع \/ استبدال/);
  assert.match(editorSource, /"Remove video"|"إزالة الفيديو"/);
  assert.match(editorSource, /readOnly=\{lockSectionKey\}|lockSectionKey/);
  assert.match(editorSource, /uploadWebsiteVideo/);
  assert.match(editorSource, /\{!readOnly && \(/);
});

test("legacy free-form Website Media groups use generic labels without EB Points branding", () => {
  assert.doesNotMatch(editorSource, /EB Points|نقاط EB|eb_points:\s*\{/);
  assert.match(editorSource, /formatMediaGroupLabel/);
  assert.equal(formatMediaGroupLabel("eb_points", "en"), "Eb Points");
  assert.equal(formatMediaGroupLabel("home", "en"), "Home");
  assert.equal(formatMediaGroupLabel("sections", "en"), "Other website images");
});

test("cpanel websiteMedia defaults do not inject storefront assets into shared admin", () => {
  assert.deepEqual([...defaultWebsiteMedia], []);
  assert.equal(getWebsiteMediaImage([], "home.hero.poster", ""), "");
  assert.equal(getWebsiteMediaImage([], "home.hero.poster"), "");
  const mediaSource = read("../src/data/websiteMedia.js");
  assert.doesNotMatch(mediaSource, /limescale-remover|ep-chemical-logo|eb_points_lifestyle|homepage-categories/);
});
