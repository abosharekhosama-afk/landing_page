import test from "node:test";
import assert from "node:assert/strict";
import { getVisibleAnnouncements } from "../../src/engagement/announcements.js";

const now = new Date("2026-09-02T12:00:00Z");

test("announcements: schedule, placement and priority are deterministic", () => {
  const rows = [
    { id: "all", is_active: true, placement: "ALL_PAGES", priority: 1 },
    { id: "home", is_active: true, placement: "HOMEPAGE", priority: 10 },
    { id: "products", is_active: true, placement: "SELECTED_PAGES", selected_pages: ["/products"], priority: 20 },
    { id: "expired", is_active: true, placement: "ALL_PAGES", end_date: "2026-09-01T00:00:00Z", priority: 100 },
  ];
  assert.deepEqual(getVisibleAnnouncements(rows, "/products", now).map((row) => row.id), ["products", "all"]);
  assert.deepEqual(getVisibleAnnouncements(rows, "/", now).map((row) => row.id), ["home", "all"]);
});

test("policy placement uses explicit placement values", () => {
  const policy = { is_active: true, placements: ["FOOTER", "CHECKOUT"] };
  assert.equal(policy.placements.includes("FOOTER"), true);
  assert.equal(policy.placements.includes("CART"), false);
});
