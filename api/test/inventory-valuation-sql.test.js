import assert from "node:assert/strict";
import test from "node:test";
import { buildAdminProductListWhere } from "../src/products/productListSql.js";

test("cost-status SQL scopes variants strictly and never invents cost", () => {
  const has = buildAdminProductListWhere({ companyId: "c1", costStatus: "HAS_COST" });
  assert.match(has.whereSql, /product_variants/);
  assert.match(has.whereSql, /= TRUE/);
  assert.match(has.whereSql, /costPrice/);
  assert.deepEqual(has.params, ["c1"]);
  const missing = buildAdminProductListWhere({ companyId: "c1", costStatus: "missing_cost" });
  assert.match(missing.whereSql, /= FALSE/);
  const all = buildAdminProductListWhere({ companyId: "c1", costStatus: "ALL" });
  assert.doesNotMatch(all.whereSql, /costPrice/);
});
