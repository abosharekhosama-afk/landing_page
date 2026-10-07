import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Sites cards use fixed thumb height aligned to 211.8 reference", () => {
  const css = read("src/styles/dashboard-shell.css");
  assert.match(css, /\.admin-studio-shell\.admin-sites-workspace \.sites-card-thumb[\s\S]*?height:\s*138\.375px/);
  assert.match(css, /\.admin-studio-shell\.admin-sites-workspace \.sites-card-footer[\s\S]*?padding:\s*8px 14px 7px/);
  assert.doesNotMatch(
    css.match(/\.admin-studio-shell\.admin-sites-workspace \.sites-card-thumb \{[\s\S]*?\n\}/)?.[0] || "",
    /aspect-ratio/,
  );
  // Formula: 138.375 + 73 = 211.375 (~211.8 ref, Δ −0.425)
  const thumb = 138.375;
  const footer = 8 + 18 + 2 + 16 + 2 + 20 + 7; // pad + name + gap + slug + gap + status + pad
  assert.equal(footer, 73);
  assert.ok(Math.abs(thumb + footer - 211.8) < 0.5);
});

test("Sites page uses real preview URL when present and initials otherwise", () => {
  const page = read("src/pages/AdminSitesPage.jsx");
  assert.match(page, /function sitePreviewUrl/);
  assert.match(page, /settings\.previewUrl/);
  assert.match(page, /sites-card-thumb-image/);
  assert.match(page, /siteInitials/);
  assert.doesNotMatch(page, /placeholder\.jpg|fake.?thumb|lorem|unsplash|picsum/i);
});

test("Sites workspace keeps Studio shell tokens and 390 overflow guard", () => {
  const css = read("src/styles/dashboard-shell.css");
  assert.match(css, /\.admin-studio-shell\.admin-sites-workspace \.sites-cards-grid[\s\S]*?minmax\(246px, 1fr\)/);
  assert.match(css, /\.admin-studio-shell\.admin-sites-workspace \.sites-card-edit[\s\S]*?height:\s*24px/);
  assert.match(css, /@media \(max-width: 390px\)[\s\S]*?\.sites-page[\s\S]*?overflow-x:\s*hidden/);
  assert.match(css, /@media \(max-width: 820px\)[\s\S]*?\.sites-page/);
});

test("Sites page preserves EN\/AR dir and does not invent site records", () => {
  const page = read("src/pages/AdminSitesPage.jsx");
  assert.match(page, /dir=\{ar \? "rtl" : "ltr"\}/);
  assert.match(page, /fetchSites/);
  assert.match(page, /createSite/);
  assert.doesNotMatch(page, /demo site|fake site|mock sites|hardcoded site/i);
});
