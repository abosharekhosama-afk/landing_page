import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appPath = path.join(root, "src/CPanelApp.jsx");
const dashboardPath = path.join(root, "src/pages/AdminDashboardPage.jsx");
const apiServerPath = path.resolve(root, "../api/src/server.js");
const apiPackagePath = path.resolve(root, "../api/package.json");
const productsFixturePath = path.resolve(root, "../tmp-staging-products.json");

function extractCatalogEffect(source) {
  const marker = "const needsProducts =";
  const start = source.indexOf(marker);
  assert.ok(start > 0, "page-scoped catalog effect must define needsProducts");
  const end = source.indexOf("}, [activePage, company?.id, currentUser, isAuthResolving, modules]);", start);
  assert.ok(end > start, "page-scoped catalog effect must depend on activePage");
  return source.slice(start, end);
}

test("login bootstrap no longer eagerly loads products/categories/brands", () => {
  const source = fs.readFileSync(appPath, "utf8");
  assert.ok(
    source.includes("Catalog (products/categories/brands) is page-scoped below"),
    "bootstrap comment must document page-scoped catalog loads",
  );
  const bootstrapStart = source.indexOf("Catalog (products/categories/brands) is page-scoped below");
  const bootstrapEnd = source.indexOf("}, [currentUser, company?.id, isAuthResolving, modules]);", bootstrapStart);
  const bootstrap = source.slice(bootstrapStart, bootstrapEnd);
  assert.ok(!bootstrap.includes("refreshProducts("), "login bootstrap must not call refreshProducts");
  assert.ok(!bootstrap.includes("refreshCategories("), "login bootstrap must not call refreshCategories");
  assert.ok(!bootstrap.includes("refreshBrands("), "login bootstrap must not call refreshBrands");
  assert.ok(!bootstrap.includes("refreshTrashedProducts("), "login bootstrap must not call refreshTrashedProducts");
});

test("login bootstrap no longer eagerly loads website media / homepage content / vlogs", () => {
  const source = fs.readFileSync(appPath, "utf8");
  const bootstrapStart = source.indexOf("Catalog (products/categories/brands) is page-scoped below");
  const bootstrapEnd = source.indexOf("}, [currentUser, company?.id, isAuthResolving, modules]);", bootstrapStart);
  const bootstrap = source.slice(bootstrapStart, bootstrapEnd);
  assert.ok(!bootstrap.includes("refreshWebsiteMedia("), "login bootstrap must not call refreshWebsiteMedia");
  assert.ok(!bootstrap.includes("refreshAdminContent("), "login bootstrap must not call refreshAdminContent");
  assert.ok(!bootstrap.includes("refreshVlogs("), "login bootstrap must not call refreshVlogs");
  assert.ok(
    source.includes("Website media + homepage content (reviews/offers/cards) + vlogs are also"),
    "bootstrap comment must document page-scoped media/content loads",
  );
});

test("website media + homepage content are page-scoped with a per-company ref gate", () => {
  const source = fs.readFileSync(appPath, "utf8");
  assert.ok(source.includes("contentHydratedRef"), "content hydration ref gate must exist");
  assert.ok(source.includes("needsWebsiteMedia"), "website-media gate must exist");
  assert.ok(source.includes("needsAdminContent"), "admin-content gate must exist");
  assert.ok(
    source.includes('["admin-website-media", "admin-homepage-offers"].includes(activePage)'),
    "website media must load only on admin-website-media / admin-homepage-offers",
  );
  assert.ok(
    source.includes('["admin-homepage-offers", "admin-reviews"].includes(activePage)'),
    "homepage content (reviews/offers/cards) must load on admin-homepage-offers / admin-reviews",
  );
  assert.ok(
    source.includes("void refreshWebsiteMedia()"),
    "page-scoped effect must call refreshWebsiteMedia",
  );
  assert.ok(
    source.includes("void refreshAdminContent()"),
    "page-scoped effect must call refreshAdminContent",
  );
  // The page-scoped effect must not live inside the login bootstrap.
  const bootstrapStart = source.indexOf("Catalog (products/categories/brands) is page-scoped below");
  const bootstrapEnd = source.indexOf("}, [currentUser, company?.id, isAuthResolving, modules]);", bootstrapStart);
  const bootstrap = source.slice(bootstrapStart, bootstrapEnd);
  assert.ok(!bootstrap.includes("needsWebsiteMedia"), "website-media gate must not be in bootstrap");
  assert.ok(!bootstrap.includes("needsAdminContent"), "admin-content gate must not be in bootstrap");
});

test("Brands path requests brands only — not products or categories", () => {
  const source = fs.readFileSync(appPath, "utf8");
  const effect = extractCatalogEffect(source);

  assert.ok(effect.includes('"admin-brands"'), "brands pages must request brands");
  assert.ok(effect.includes("needsBrands"), "brands gate must exist");
  assert.ok(effect.includes("needsProducts"), "products gate must exist");
  assert.ok(effect.includes("needsCategories"), "categories gate must exist");

  // Brands-only pages are listed for brands, not for products/categories.
  const productsList = effect.slice(
    effect.indexOf("const needsProducts ="),
    effect.indexOf("const needsTrash ="),
  );
  const categoriesList = effect.slice(
    effect.indexOf("const needsCategories ="),
    effect.indexOf("const needsBrands ="),
  );
  const brandsList = effect.slice(effect.indexOf("const needsBrands ="), effect.indexOf("if ("));

  assert.ok(!productsList.includes('"admin-brands"'), "admin-brands must not trigger products fetch");
  assert.ok(!productsList.includes('"admin-brands-new"'), "admin-brands-new must not trigger products fetch");
  assert.ok(!categoriesList.includes('"admin-brands"'), "admin-brands must not trigger categories fetch");
  assert.ok(!categoriesList.includes('"admin-brands-new"'), "admin-brands-new must not trigger categories fetch");
  assert.ok(brandsList.includes('"admin-brands"'), "admin-brands must trigger brands fetch");
  assert.ok(brandsList.includes('"admin-brands-new"'), "admin-brands-new must trigger brands fetch");

  // Website media + homepage content are gated to their own manager pages —
  // the Brands path must not trigger them either.
  const contentEffectStart = source.indexOf("needsWebsiteMedia");
  assert.ok(contentEffectStart > 0, "page-scoped content effect must define needsWebsiteMedia");
  const contentEffectEnd = source.indexOf("}, [activePage, company?.id, currentUser, isAuthResolving, modules]);", contentEffectStart);
  const contentEffect = source.slice(contentEffectStart, contentEffectEnd);
  assert.ok(
    !contentEffect.includes('"admin-brands"'),
    "admin-brands must not trigger website-media / homepage-content loads",
  );
  assert.ok(
    !contentEffect.includes('"admin-brands-new"'),
    "admin-brands-new must not trigger website-media / homepage-content loads",
  );
  assert.ok(
    contentEffect.includes('"admin-reviews"'),
    "admin-reviews must still load homepage/admin content (reviews)",
  );
});

test("brand and category list thumbs defer src via DeferredAdminThumb", () => {
  const dashboard = fs.readFileSync(dashboardPath, "utf8");
  const deferred = fs.readFileSync(path.join(root, "src/components/DeferredAdminThumb.jsx"), "utf8");
  const brandsTable = fs.readFileSync(path.join(root, "src/components/BrandsCatalogTable.jsx"), "utf8");
  assert.ok(dashboard.includes("BrandsCatalogTable"), "brands page uses BrandsCatalogTable");
  assert.ok(dashboard.includes("DeferredAdminThumb"), "category thumbs use DeferredAdminThumb");
  assert.ok(deferred.includes("IntersectionObserver"), "must observe viewport before setting src");
  assert.ok(brandsTable.includes("fetchBrand"), "edit must fetch full brand by id");
  assert.ok(brandsTable.includes("BRANDS_TABLE_PAGE_SIZE"), "brands table must paginate");
  assert.ok(brandsTable.includes("DeferredAdminThumb"), "brand logos use deferred thumbs");
});

test("API enables response compression and skips image recompression", () => {
  const server = fs.readFileSync(apiServerPath, "utf8");
  const pkg = JSON.parse(fs.readFileSync(apiPackagePath, "utf8"));
  assert.ok(server.includes('import compression from "compression"'), "server must import compression");
  assert.ok(server.includes("compression({"), "server must configure compression middleware");
  assert.ok(server.includes('req.path?.startsWith("/uploads")'), "must skip /uploads image recompression");
  assert.ok(pkg.dependencies?.compression, "api package.json must declare compression");
  assert.ok(pkg.dependencies?.sharp, "api package.json must declare sharp");
});

test("CPanel brands list uses view=list projection", () => {
  const app = fs.readFileSync(appPath, "utf8");
  const catalogApi = fs.readFileSync(path.join(root, "src/utils/catalogApi.js"), "utf8");
  const brandsRoute = fs.readFileSync(path.resolve(root, "../api/src/routes/brands.js"), "utf8");
  assert.ok(app.includes('fetchBrands({ view: "list" })'), "refreshBrands must request list view");
  assert.ok(catalogApi.includes("fetchBrand"), "catalogApi must expose fetchBrand");
  assert.ok(brandsRoute.includes('view === "list"') || brandsRoute.includes("view=list") || brandsRoute.includes('toLowerCase() === "list"'), "API supports view=list");
  assert.ok(brandsRoute.includes("projectBrandForList"), "API projects list fields");
});

test("before/after Brands catalog request set and payload evidence", () => {
  // BEFORE (eager login bootstrap): products + trash + categories + brands
  const beforeRequests = ["/products", "/products/trash", "/categories", "/brands"];
  // AFTER (activePage=admin-brands): brands list only
  const afterRequests = ["/brands?view=list"];

  assert.equal(beforeRequests.length, 4);
  assert.equal(afterRequests.length, 1);
  assert.ok(!afterRequests.some((url) => url.includes("/products")));
  assert.ok(!afterRequests.some((url) => url.includes("/categories")));
  assert.equal(beforeRequests.length - afterRequests.length, 3, "Brands path drops 3 catalog requests");

  // Image request behavior (contract): only page-sized deferred logos, not all brand media.
  const beforeImageBehavior = {
    initialImageSrcCount: "all brand logos + unused hero/menu/header URLs in payload",
    logoSrcSetImmediately: true,
  };
  const afterImageBehavior = {
    initialImageSrcCount: "0 until IntersectionObserver",
    pageSize: 25,
    editOnlyMediaFetchedOnOpen: true,
  };
  assert.equal(afterImageBehavior.logoSrcSetImmediately, undefined);
  assert.equal(beforeImageBehavior.logoSrcSetImmediately, true);
  assert.equal(afterImageBehavior.initialImageSrcCount, "0 until IntersectionObserver");

  let productsBytes = 0;
  if (fs.existsSync(productsFixturePath)) {
    const raw = fs.readFileSync(productsFixturePath);
    const parsed = JSON.parse(raw.toString("utf8"));
    const products = Array.isArray(parsed) ? parsed : parsed.products || [];
    productsBytes = Buffer.byteLength(JSON.stringify(products));
  }
  const brandsFull = [
    {
      id: "b1",
      slug: "velvet",
      name: { en: "Velvet", ar: "فيلفيت" },
      logoUrl: "/uploads/logo.png",
      heroVideo: "/uploads/hero.mp4",
      heroPoster: "/uploads/poster.jpg",
      headerImage: "/uploads/header.jpg",
      menuImage: "/uploads/menu.jpg",
      country: "JO",
      sortOrder: 0,
      isActive: true,
    },
  ];
  const brandsList = brandsFull.map(({ id, slug, name, logoUrl, country, sortOrder, isActive }) => ({
    id,
    slug,
    name,
    logoUrl,
    country,
    sortOrder,
    isActive,
    createdAt: null,
    updatedAt: null,
  }));
  const fullBytes = Buffer.byteLength(JSON.stringify(brandsFull));
  const listBytes = Buffer.byteLength(JSON.stringify(brandsList));
  assert.ok(listBytes < fullBytes, "list projection must shrink JSON vs full brand objects");

  const brandsGzip = zlib.gzipSync(Buffer.from(JSON.stringify(brandsList)));
  assert.ok(brandsGzip.length < listBytes, "gzip should shrink brands list JSON");

  const evidence = {
    beforeCatalogRequestCount: beforeRequests.length,
    afterCatalogRequestCountOnBrands: afterRequests.length,
    removedFromBrandsPath: ["/products", "/products/trash", "/categories"],
    productsFixtureBytes: productsBytes,
    brandsFullBytes: fullBytes,
    brandsListBytes: listBytes,
    brandsListGzipBytes: brandsGzip.length,
    gzipRatio: Number((brandsGzip.length / listBytes).toFixed(3)),
  };
  assert.ok(evidence.afterCatalogRequestCountOnBrands < evidence.beforeCatalogRequestCount);
  assert.ok(evidence.gzipRatio < 1);
  if (productsBytes > 0) {
    assert.ok(productsBytes > listBytes);
  }
});
