import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const files = [
  "../src/velvetDropshipping/domain.js",
  "../src/velvetDropshipping/database.js",
  "../src/velvetDropshipping/orders.js",
  "../src/velvetDropshipping/stock.js",
  "../src/velvetDropshipping/catalog.js",
  "../src/velvetDropshipping/merchants.js",
  "../src/velvetDropshipping/settlements.js",
  "../src/velvetDropshipping/whatsapp.js",
  "../src/routes/velvetDropshipping.js",
  "../src/routes/adminVelvetDropshipping.js",
  "../src/moduleRegistry.js",
];

test("Velvet files do not import iCare dropshipping business modules or name its tables", () => {
  const forbiddenImports = [
    "../dropshipping/",
    "./dropshipping/",
    "src/dropshipping/domain.js",
  ];
  const forbiddenTables = [
    "dropshipping_settings",
    "dropshipper_profiles",
    "dropshipping_products",
    "dropshipping_orders",
    "dropshipper_wallets",
    "withdrawal_requests",
  ];
  for (const file of files) {
    const source = fs.readFileSync(new URL(file, import.meta.url), "utf8");
    if (file.endsWith("moduleRegistry.js")) {
      assert.match(source, /from "\.\/dropshipping\/database\.js"/);
    } else {
      for (const entry of forbiddenImports) assert.equal(source.includes(entry), false, file);
    }
    for (const table of forbiddenTables) {
      if (file.endsWith("moduleRegistry.js")) continue;
      assert.equal(source.includes(table), false, `${file} ${table}`);
    }
  }
});
