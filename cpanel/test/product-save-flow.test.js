import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { fieldStateToValues, normalizeLegacyLocalizedList, valuesToFieldState } from "../src/utils/productFields.js";

const dashboard = fs.readFileSync(new URL("../src/pages/AdminDashboardPage.jsx", import.meta.url), "utf8");
const productVariantsForm = fs.readFileSync(new URL("../src/utils/productVariantsForm.js", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../src/CPanelApp.jsx", import.meta.url), "utf8");
const apiClient = fs.readFileSync(new URL("../src/utils/api.js", import.meta.url), "utf8");
const productsApi = fs.readFileSync(new URL("../src/utils/productsApi.js", import.meta.url), "utf8");
const stagingEnvironment = fs.readFileSync(new URL("../.env.staging", import.meta.url), "utf8");
const productImages = fs.readFileSync(new URL("../src/utils/productImages.js", import.meta.url), "utf8");

test("the staging CPanel build uses VITE_API_URL and no legacy product API host", () => {
  assert.match(stagingEnvironment, /^VITE_API_URL=https:\/\/api-staging\.igroup\.website\s*$/m);
  assert.match(apiClient, /import\.meta\.env\?\.VITE_API_URL/);
  assert.doesNotMatch(apiClient, /backend\.igroup\.website/);
  assert.doesNotMatch(productsApi, /https?:\/\//);
  assert.match(productsApi, /apiRequest\("\/products"/);
  assert.match(productsApi, /apiRequest\(`\/products\/\$\{product\.id\}`/);
});

test("new variants do not receive reusable client-generated product variant IDs", () => {
  assert.match(productVariantsForm, /id: variant\.id \|\| ""/);
  assert.match(productVariantsForm, /id: variant\.id \|\| undefined/);
  assert.doesNotMatch(dashboard, /product\.id \|\| "product"\}-variant/);
});

test("structured fields run only after the base product succeeds and retry is content-only", () => {
  const baseSave = dashboard.indexOf("result = await onSave(productPayload)");
  const fieldSave = dashboard.indexOf("await productFieldApi.saveValues(result.product.id");
  const retry = dashboard.slice(dashboard.indexOf("async function retryContentSave"), dashboard.indexOf("async function uploadVideo"));
  assert.ok(baseSave >= 0 && fieldSave > baseSave);
  assert.match(retry, /productFieldApi\.saveValues/);
  assert.doesNotMatch(retry, /onSave\(/);
});

test("product form preserves bilingual values and localizes repeaters", () => {
  const translations = fs.readFileSync(new URL("../src/data/translations.js", import.meta.url), "utf8");
  const tenantFields = fs.readFileSync(new URL("../src/components/TenantProductFields.jsx", import.meta.url), "utf8");
  assert.match(dashboard, /name="shortDescriptionAr"/);
  assert.match(dashboard, /name="fullDescriptionAr"/);
  assert.match(dashboard, /dir=\{language === "ar" \? "rtl" : "ltr"\}/);
  assert.match(translations, /"productForm\.addItem": "Add item"/);
  assert.match(translations, /"productForm\.addItem": "إضافة عنصر"/);
  assert.match(tenantFields, /createTranslator\(language\)/);
  assert.match(tenantFields, /productForm\.remove/);
});

test("save is single-flight and waits for media uploads", () => {
  assert.match(dashboard, /if \(readOnly \|\| isSaving\) return/);
  assert.match(dashboard, /if \(activeChildUploads > 0 \|\| uploadingField \|\| uploadingVariantIndex >= 0 \|\| uploadingGalleryIndex >= 0\)/);
  assert.match(dashboard, /disabled=\{isSaving \|\| activeChildUploads > 0 \|\| Boolean\(uploadingField\)/);
});

test("product and variant state round-trip through the save payload", () => {
  assert.match(dashboard, /visible: editingProduct\?\.visible !== false/);
  assert.match(dashboard, /newArrival: Boolean\(editingProduct\?\.isNewArrival\)/);
  assert.match(productVariantsForm, /isVisible: variant\.isVisible !== false/);
  assert.match(productVariantsForm, /sale_price:/);
});

test("product editing uses a reload-safe id route", () => {
  assert.match(app, /\/admin\\\/products\\\/\[\^\/\]\+\\\/edit/);
  assert.match(dashboard, /\/admin\/products\/\$\{encodeURIComponent\(product\.id\)\}\/edit/);
});

test("card image uploads use independent primary and hover controls", () => {
  assert.match(dashboard, /function CardImageUpload/);
  assert.match(dashboard, /label=\{t\("productForm\.mainImage"\)\}/);
  assert.match(dashboard, /label=\{t\("productForm\.hoverImage"\)\}/);
  assert.match(dashboard, /name="image"/);
  assert.match(dashboard, /name="hoverImage"/);
});

test("card image form bootstrap reads primary and secondary aliases", () => {
  assert.match(dashboard, /image: editingProduct\?\.image \|\| editingProduct\?\.primaryImage/);
  assert.match(dashboard, /hoverImage: editingProduct\?\.hoverImage \|\| editingProduct\?\.secondaryImage/);
});

test("tenant card image uploads require a saved product first", () => {
  assert.match(dashboard, /tenantSpecific=\{usesTenantDefinitions\}/);
  assert.match(dashboard, /uploadBlocked \? t\("productForm\.saveFirst"\)/);
  assert.match(dashboard, /disabled=\{isUploading \|\| uploadBlocked\}/);
  assert.match(dashboard, /validateProductMediaFile\(file, \{ allowVideo: false \}\)/);
});

test("CPanel resolves API images and bundles its broken-image placeholder", () => {
  assert.match(productImages, /import productPlaceholderUrl from "\.\.\/assets\/product-placeholder\.svg"/);
  assert.match(productImages, /resolveApiAssetUrl\(source\)/);
  assert.match(apiClient, /new URL\(value, `\$\{new URL\(apiBaseUrl\)\.origin\}\/`\)/);
  assert.match(dashboard, /resolveProductImageUrl\(basicImagePreview\)/);
  assert.match(dashboard, /onError=\{useProductImagePlaceholder\}/);
});

test("text-only edits omit empty image fields and preserve explicit per-field removal", () => {
  assert.match(productVariantsForm, /\.\.\.\(form\.image \? \{ image: form\.image \} : \{\}\)/);
  assert.match(productVariantsForm, /removedImageFields: form\.removedImageFields \|\| \[\]/);
  assert.match(dashboard, /removeImage: true/);
  assert.match(dashboard, /clearGalleryImages/);
  assert.match(productVariantsForm, /detailSectionImages: Object\.fromEntries/);
});

test("localized repeaters preserve legacy arrays and save English and Arabic independently", () => {
  assert.deepEqual(normalizeLegacyLocalizedList("Sensitive"), ["Sensitive"]);
  assert.deepEqual(normalizeLegacyLocalizedList(["Dry", "Oily"]), ["Dry", "Oily"]);
  const definitions = [{ field_key: "skin_types", field_type: "repeatable_list", translatable: true }];
  assert.deepEqual(valuesToFieldState([{ field_key: "skin_types", locale: "neutral", value: ["Dry"] }], definitions), {
    skin_types: { en: ["Dry"], ar: [] },
  });
  assert.deepEqual(valuesToFieldState([
    { field_key: "skin_types", locale: "en", value: "Dry" },
    { field_key: "skin_types", locale: "ar", value: "جافة" },
  ], definitions), { skin_types: { en: ["Dry"], ar: ["جافة"] } });
  assert.deepEqual(fieldStateToValues(definitions, { skin_types: { en: ["Dry"], ar: ["جافة"] } }), [
    { key: "skin_types", locale: "en", value: ["Dry"] },
    { key: "skin_types", locale: "ar", value: ["جافة"] },
  ]);
});

test("Arabic repeater actions use translated accessible labels and RTL", () => {
  const tenantFields = fs.readFileSync(new URL("../src/components/TenantProductFields.jsx", import.meta.url), "utf8");
  const translations = fs.readFileSync(new URL("../src/data/translations.js", import.meta.url), "utf8");
  for (const key of ["item", "addItem", "remove", "moveUp", "moveDown", "english", "arabic"]) {
    assert.match(tenantFields, new RegExp(`productForm\\.${key}`));
  }
  assert.match(tenantFields, /dir=\{language === "ar" \? "rtl" : "ltr"\}/);
  assert.match(translations, /"productForm\.moveUp": "تحريك لأعلى"/);
  assert.match(translations, /"productForm\.moveDown": "تحريك لأسفل"/);
});
