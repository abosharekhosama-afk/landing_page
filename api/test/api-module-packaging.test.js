import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiSrcRoot = path.join(apiRoot, "src");

function listJavaScriptFiles(dir) {
  const entries = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      entries.push(...listJavaScriptFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".js")) entries.push(fullPath);
  }
  return entries;
}

test("api/src production modules do not import repo-root shared paths", () => {
  const offenders = [];
  for (const filePath of listJavaScriptFiles(apiSrcRoot)) {
    const source = fs.readFileSync(filePath, "utf8");
    if (/from\s+["'][^"']*\/shared\/catalog\/productFilterAttributes\.js["']/.test(source)
      || /from\s+["'][^"']*\.\.\/\.\.\/\.\.\/shared\//.test(source)) {
      offenders.push(path.relative(apiRoot, filePath));
    }
  }
  assert.deepEqual(offenders, []);
});

test("storefront route imports packaged product filter module", () => {
  const source = fs.readFileSync(path.join(apiSrcRoot, "routes", "storefront.js"), "utf8");
  assert.match(source, /from "\.\.\/catalog\/productFilterAttributes\.js"/);
  assert.doesNotMatch(source, /\/shared\/catalog\/productFilterAttributes\.js/);
});

test("api runtime imports resolve when api directory is the application root", async () => {
  const modules = [
    "../src/storefront/publicContent.js",
    "../src/routes/catalogHierarchy.js",
    "../src/catalog/velvetWorkbookAge.js",
    "../src/catalog/productFilterAttributes.js",
  ];

  for (const specifier of modules) {
    const loaded = await import(new URL(specifier, import.meta.url).href);
    assert.ok(loaded, `expected ${specifier} to import`);
  }
});

test("packaged product filter module exposes canonical multi-age vocabulary", async () => {
  const {
    PRODUCT_FILTER_ATTRIBUTE_OPTIONS,
    normalizeProductFilterAttributeValue,
    serializePublicProductFilterAttributes,
  } = await import("../src/catalog/productFilterAttributes.js");

  assert.ok(PRODUCT_FILTER_ATTRIBUTE_OPTIONS.age.some((entry) => entry.id === "3-6y"));
  assert.deepEqual(normalizeProductFilterAttributeValue("age", ["3-6y", "6-10y"]), ["3-6y", "6-10y"]);
  assert.deepEqual(
    serializePublicProductFilterAttributes({ age: ["3-6y", "6-10y"] }).age.map((entry) => entry.id),
    ["3-6y", "6-10y"],
  );
});
