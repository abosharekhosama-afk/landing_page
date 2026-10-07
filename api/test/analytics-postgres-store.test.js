import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const postgresSource = fs.readFileSync(new URL("../src/data/postgresStore.js", import.meta.url), "utf8");
const storeSource = fs.readFileSync(new URL("../src/data/store.js", import.meta.url), "utf8");
const migrationSource = fs.readFileSync(
  new URL("../supabase/migrations/020_company_analytics_insights.sql", import.meta.url),
  "utf8",
);

test("postgres store includes analytics tenant tables in platform load", () => {
  for (const table of [
    "company_search_events",
    "company_search_redirects",
    "company_visitor_sessions",
    "company_visitor_events",
  ]) {
    assert.match(postgresSource, new RegExp(`"${table}"`));
  }
  assert.match(postgresSource, /saveAnalyticsStoreToSupabase/);
  assert.match(postgresSource, /mergeSearchEvent/);
  assert.match(postgresSource, /mergeVisitorSession/);
});

test("store exposes analytics-only postgres persistence helper", () => {
  assert.match(storeSource, /saveAnalyticsStoreToSupabase/);
  assert.match(storeSource, /export async function persistAnalyticsStore/);
});

test("analytics migration enables RLS with service-owned write policies", () => {
  assert.match(migrationSource, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migrationSource, /service_insert_search_events/);
  assert.match(migrationSource, /service_manage_search_redirects/);
  assert.match(migrationSource, /company_admins_select_search_events/);
});

test("analytics migration defines tenant indexes for query patterns", () => {
  assert.match(migrationSource, /idx_search_events_company_created/);
  assert.match(migrationSource, /idx_visitor_sessions_company_last_seen/);
});
