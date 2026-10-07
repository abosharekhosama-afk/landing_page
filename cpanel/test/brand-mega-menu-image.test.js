import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const wizard = fs.readFileSync(new URL("../src/pages/AdminDashboardPage.jsx", import.meta.url), "utf8");
const mediaField = fs.readFileSync(new URL("../src/components/AdminMediaField.jsx", import.meta.url), "utf8");
const brandForm = wizard.slice(wizard.indexOf('kind === "brand"'), wizard.indexOf('kind === "vlog"'));

test("Brand editor exposes independent Mega Menu Image after Brand Logo", () => {
  assert.match(brandForm, /Mega Menu Image/);
  assert.match(brandForm, /صورة القائمة الكبيرة/);
  assert.match(brandForm, /menuImage: current\?\.menuImage \|\| ""/);
  assert.match(brandForm, /menuImage: form\.menuImage \|\| null/);
  assert.match(
    brandForm,
    /name: "logo"[\s\S]*?name: "menuImage"[\s\S]*?name: "heroVideo"/,
  );
  assert.match(brandForm, /type: "media"/);
  assert.doesNotMatch(brandForm, /kids-velvet|velvet-brand-1|brand\.\{slug\}\.menuImage/);
});

test("Mega Menu Image reuses AdminMediaField upload/preview/remove behavior", () => {
  assert.match(wizard, /AdminMediaField/);
  assert.match(mediaField, /upload/);
  assert.match(mediaField, /preview|img|Remove|remove/i);
});

test("headerImage and menuImage remain separately initialized and saved", () => {
  assert.match(brandForm, /headerImage: current\?\.headerImage \|\| ""/);
  assert.match(brandForm, /menuImage: current\?\.menuImage \|\| ""/);
  assert.match(brandForm, /headerImage: form\.headerImage \|\| null/);
  assert.match(brandForm, /menuImage: form\.menuImage \|\| null/);
});

test("Brand and category table thumbs defer src until near viewport", () => {
  const deferred = fs.readFileSync(new URL("../src/components/DeferredAdminThumb.jsx", import.meta.url), "utf8");
  const brandsTable = fs.readFileSync(new URL("../src/components/BrandsCatalogTable.jsx", import.meta.url), "utf8");
  assert.match(deferred, /IntersectionObserver/);
  assert.match(deferred, /setActiveSrc/);
  assert.match(deferred, /resolveAdminPreviewUrl/);
  assert.doesNotMatch(deferred, /resolveProductImageUrl/, "list thumbs must never fall back to the main asset");
  assert.match(deferred, /useProductImagePlaceholder/);
  assert.match(brandsTable, /DeferredAdminThumb/);
  assert.match(wizard, /DeferredAdminThumb/);
  assert.match(wizard, /BrandsCatalogTable/);
});
