import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("shared sidebar nav rows vertically center icon + label at Wix 36px", () => {
  const shell = read("src/styles/dashboard-shell.css");
  const global = read("src/styles/global.css");

  assert.match(shell, /--dashboard-nav-item-height:\s*36px/);
  assert.match(
    shell,
    /\.admin-studio-shell \.admin-nav-button[\s\S]{0,220}align-items:\s*center/,
  );
  assert.match(
    shell,
    /\.admin-studio-shell \.admin-nav-section,\s*\n\.admin-studio-shell \.admin-nav-button[\s\S]{0,280}height:\s*var\(--dashboard-nav-item-height\)/,
  );
  assert.match(
    shell,
    /\.admin-studio-shell \.admin-nav-button > span[\s\S]{0,180}line-height:\s*18px/,
  );
  assert.match(
    shell,
    /\.admin-studio-shell \.admin-nav-button > span[\s\S]{0,180}white-space:\s*nowrap/,
  );
  assert.match(
    shell,
    /\.admin-studio-shell \.admin-nav-button > small[\s\S]{0,180}align-items:\s*center/,
  );
  assert.doesNotMatch(
    global,
    /\.admin-studio-shell \.admin-nav-button\s*\{[^}]*align-items:\s*flex-start/,
  );
});
