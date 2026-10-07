import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("shared admin stack-form + form-grid + checkbox reset foundation exists", () => {
  const css = read("src/styles/global.css");
  assert.match(css, /\.admin-stack-form\s*\{/);
  assert.match(css, /\.admin-stack-form\s*>\s*\*\s*\{/);
  assert.match(css, /\.admin-form-grid\s*\{[\s\S]*?display:\s*grid/);
  assert.match(css, /\.admin-form-grid\s*\{[\s\S]*?align-items:\s*start/);
  assert.match(css, /\.product-schema-summary\s*\{[\s\S]*?align-items:\s*start/);
  assert.match(
    css,
    /\.admin-studio-shell input\[type="checkbox"\][\s\S]*?min-height:\s*16px\s*!important/,
  );
  assert.match(
    css,
    /\.admin-layout \.admin-form input\[type="checkbox"\]/,
  );
  assert.match(
    css,
    /\.admin-studio-shell \.product-schema-checkbox input/,
  );
});

test("Product Bundles component rows use product-bundle-item-row (page + CSS)", () => {
  const page = read("src/pages/AdminProductBundlesPage.jsx");
  const css = read("src/styles/global.css");
  assert.match(page, /product-bundle-item-row/);
  // Basic Details / Pricing pairs keep the 2-col dialog-row; only the
  // 4-child component row (product, variant, qty, remove) uses the new class.
  assert.equal((page.match(/product-schema-dialog-row/g) || []).length, 3);
  assert.equal((page.match(/product-bundle-item-row/g) || []).length, 1);
  assert.match(css, /\.product-bundle-item-row\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1\.4fr\)/);
  assert.match(css, /\.admin-form\.admin-stack-form\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test("Marketing SEO form uses admin-stack-form (single column)", () => {
  const page = read("src/pages/AdminMarketingPage.jsx");
  assert.match(page, /admin-form admin-stack-form marketing-seo-settings-form/);
});

test("page-scoped bundles/settings checkbox band-aid was removed from dashboard-shell", () => {
  const shell = read("src/styles/dashboard-shell.css");
  assert.doesNotMatch(
    shell,
    /\.product-bundles-page input\[type="checkbox"\][\s\S]{0,120}\.product-settings-page input\[type="checkbox"\]/,
  );
});

test("Product Bundles Create/Edit uses one AdminLayout + stack-form (no stretch sibling layout)", () => {
  const page = read("src/pages/AdminProductBundlesPage.jsx");
  const app = read("src/CPanelApp.jsx");
  assert.match(page, /AdminLayout/);
  assert.equal((page.match(/<AdminLayout/g) || []).length, 2); // denied + main shells
  assert.match(page, /admin-form admin-stack-form product-bundle-form/);
  assert.match(page, /product-schema-summary/);
  assert.match(app, /activePage !== "admin-product-bundles"/);
  assert.match(app, /activePage === "admin-product-bundles"/);
});

test("Product Settings keeps one shell/header; forbidden hides schema mutation actions", () => {
  const page = read("src/pages/AdminProductSettingsPage.jsx");
  assert.match(page, /AdminLayout/);
  assert.match(page, /product-schema-page product-settings-page/);
  assert.match(page, /product-merchandising-settings/);
  assert.match(page, /admin-form admin-stack-form product-settings-form/);
  assert.match(page, /canManage && !forbidden/);
  assert.doesNotMatch(page, /product-schema-page[\s\S]*product-schema-page/);
});

test("Homepage Offers form uses admin-form-grid and separated offers list", () => {
  const page = read("src/components/HomeContentManager.jsx");
  const translations = read("src/data/translations.js");
  assert.match(page, /admin-form-grid home-offers-form/);
  assert.match(page, /home-offers-list/);
  assert.match(page, /homeContent\.offersListTitle/);
  assert.match(translations, /offersListTitle:\s*"Existing homepage offers"/);
  assert.match(translations, /offersListTitle:\s*"عروض الصفحة الرئيسية الحالية"/);
});
