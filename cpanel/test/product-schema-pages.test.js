import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { canUseProductSettingsAction } from "../src/utils/roles.js";
import {
  canRemoveField,
  cloneSchema,
  emptyShowcaseField,
  filterSchemaFields,
  isProtectedField,
  schemaCopy,
  sortedShowcaseFields,
  validateSchemaDraft,
} from "../src/utils/productSchemaUi.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("product schema workspace replaces generic feature page route", () => {
  const page = read("src/pages/AdminProductSettingsPage.jsx");
  const app = read("src/CPanelApp.jsx");
  const feature = read("src/pages/AdminFeaturePage.jsx");
  assert.match(page, /fetchProductSchema\(/);
  assert.match(page, /saveProductSchema\(/);
  assert.match(page, /validateSchemaDraft\(/);
  assert.match(app, /activePage === "admin-product-settings"/);
  assert.match(app, /AdminProductSettingsPage/);
  assert.match(app, /activePage !== "admin-product-settings"/);
  assert.doesNotMatch(feature, /admin-product-settings/);
  assert.doesNotMatch(page, /localStorage/);
});

test("product schema editor covers load, dirty, validation, and read-only states", () => {
  const page = read("src/pages/AdminProductSettingsPage.jsx");
  assert.match(page, /copy\.loading/);
  assert.match(page, /copy\.forbidden/);
  assert.match(page, /copy\.readOnly/);
  assert.match(page, /copy\.retry/);
  assert.match(page, /copy\.dirty/);
  assert.match(page, /copy\.reset/);
  assert.match(page, /copy\.empty/);
  assert.match(page, /copy\.noMatches/);
  assert.match(page, /dir=\{dir\}/);
  assert.match(page, /schemaCopy\(language\)/);
});

test("product schema tables use the shared admin-data-table system", () => {
  const page = read("src/pages/AdminProductSettingsPage.jsx");
  assert.match(page, /className="admin-data-table-wrap"/);
  assert.match(page, /className="admin-data-table"/);
  assert.match(page, /admin-data-table--nested/);
  assert.match(page, /admin-data-table-actions/);
  assert.doesNotMatch(page, /product-schema-table-wrap/);
  assert.doesNotMatch(page, /className="product-schema-table"/);
});

test("product settings permissions use product_settings.view and product_settings.manage", () => {
  const roles = read("src/utils/roles.js");
  const permissions = read("src/data/permissions.js");
  const page = read("src/pages/AdminProductSettingsPage.jsx");
  assert.match(roles, /"admin-product-settings": \["product_settings\.view"\]/);
  assert.match(roles, /canUseProductSettingsAction/);
  assert.match(permissions, /product_settings\.view/);
  assert.match(permissions, /product_settings\.manage/);
  assert.match(page, /canUseProductSettingsAction\(currentUser, "product_settings\.manage"\)/);
  assert.equal(canUseProductSettingsAction({ role: "company_admin" }, "product_settings.manage"), true);
  assert.equal(canUseProductSettingsAction({ role: "employee", permissions: ["product_settings.view"] }, "product_settings.manage"), false);
  assert.equal(canUseProductSettingsAction({ role: "employee", permissions: ["product_settings.manage"] }, "product_settings.manage"), true);
});

test("schema helpers protect hierarchy fields and validate select options", () => {
  const schema = cloneSchema({
    version: 1,
    tabs: [],
    fields: [
      {
        key: "categoryId",
        tab: "basic",
        label: { en: "Category", ar: "الفئة" },
        type: "select",
        required: true,
        enabled: true,
        protected: true,
        sortOrder: 10,
        options: [],
      },
      {
        key: "customNote",
        tab: "custom_sections",
        label: { en: "Note", ar: "ملاحظة" },
        type: "select",
        required: false,
        enabled: true,
        sortOrder: 20,
        options: [],
      },
    ],
    variantAttributes: [],
    mediaFields: [],
    showcaseSections: [],
    storefrontVisibility: { customFields: true, customSections: true },
  });
  assert.equal(isProtectedField(schema.fields[0]), true);
  assert.equal(canRemoveField(schema.fields[0], "fields"), false);
  const invalid = validateSchemaDraft(schema);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some((message) => /select fields need at least one option/i.test(message)));
  schema.fields[1].options = [{ value: "a", label: { en: "A", ar: "أ" } }];
  assert.equal(validateSchemaDraft(schema).valid, true);
  assert.equal(filterSchemaFields(schema.fields, { query: "category" }).length, 1);
  assert.ok(schemaCopy("ar").title.length > 0);
  assert.ok(schemaCopy("en").title.length > 0);
});

test("showcase nested field editor supports add, edit, remove, and reorder wiring", () => {
  const page = read("src/pages/AdminProductSettingsPage.jsx");
  assert.match(page, /upsertShowcaseField\(/);
  assert.match(page, /removeShowcaseField\(/);
  assert.match(page, /moveShowcaseField\(/);
  assert.match(page, /emptyShowcaseField\(/);
  assert.match(page, /sortedShowcaseFields\(/);
  assert.match(page, /bucket: "showcaseField"/);
  assert.match(page, /copy\.emptySectionFields/);
  assert.match(page, /copy\.moveUp/);
  assert.match(page, /copy\.moveDown/);
  assert.match(page, /copy\.confirmRemove/);
  assert.doesNotMatch(page, /product-schema-nested-fields/);
});

test("showcase field helpers validate nested fields and protect hierarchy keys", () => {
  const field = emptyShowcaseField();
  assert.equal(field.tab, "showcase");
  const schema = cloneSchema({
    version: 1,
    tabs: [],
    fields: [],
    variantAttributes: [],
    mediaFields: [],
    showcaseSections: [{
      key: "how_it_works",
      title: { en: "How it Works", ar: "طريقة الاستخدام" },
      enabled: true,
      storefrontVisible: true,
      sortOrder: 10,
      fields: [{
        key: "customNote",
        tab: "showcase",
        label: { en: "Note", ar: "ملاحظة" },
        type: "select",
        required: false,
        enabled: true,
        sortOrder: 10,
        options: [{ value: "a", label: { en: "A", ar: "أ" } }],
      }],
    }],
    storefrontVisibility: { customFields: true, customSections: true },
  });
  assert.equal(validateSchemaDraft(schema).valid, true);
  assert.equal(sortedShowcaseFields(schema.showcaseSections[0].fields)[0].key, "customNote");
  assert.equal(canRemoveField(schema.showcaseSections[0].fields[0], "showcaseField"), true);
  const protectedField = { key: "categoryId", protected: true, label: { en: "Cat", ar: "فئة" }, type: "select" };
  assert.equal(canRemoveField(protectedField, "showcaseField"), false);
  assert.equal(isProtectedField(protectedField), true);
});
