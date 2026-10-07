import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { unitProfit } from "../src/velvetDropshipping/domain.js";

test("admin prices of 100 and 80 produce a profit of 20", () => {
  assert.equal(unitProfit("100", "80"), "20.00");
});

test("merchant routes do not accept selling or merchant price edits", () => {
  const source = fs.readFileSync(new URL("../src/routes/velvetDropshipping.js", import.meta.url), "utf8");
  assert.equal(source.includes("sellingUnitPrice"), false);
  assert.equal(source.includes("merchantUnitPrice"), false);
  const admin = fs.readFileSync(new URL("../src/routes/adminVelvetDropshipping.js", import.meta.url), "utf8");
  assert.match(admin, /company_dropship\.catalog\.manage/);
  assert.match(admin, /upsertOffer/);
});
