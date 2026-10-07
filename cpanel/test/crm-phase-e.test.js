import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Contacts table renders on the shared admin-data-table system", () => {
  const page = read("src/pages/AdminContactsPage.jsx");
  assert.match(page, /className="admin-data-table-wrap"/);
  assert.match(page, /className="admin-data-table"/);
  assert.match(page, /className="admin-data-table-actions"/);
  assert.match(page, /admin-data-table-cell-clip/);
  assert.doesNotMatch(page, /admin-contacts-table-scroll/);
  assert.doesNotMatch(page, /className="admin-contacts-table"/);
});

test("Reviews table renders on the shared admin-data-table system", () => {
  const page = read("src/pages/AdminReviewsPage.jsx");
  assert.match(page, /className="admin-data-table-wrap"/);
  assert.match(page, /className="admin-data-table"/);
  assert.match(page, /className="admin-data-table-actions"/);
  assert.match(page, /admin-data-table-cell-clip/);
  assert.doesNotMatch(page, /reviews-list-head/);
  assert.doesNotMatch(page, /reviews-list-row/);
});

test("Staff table renders on the shared admin-data-table system", () => {
  const table = read("src/components/EmployeeTable.jsx");
  assert.match(table, /className="admin-data-table-wrap"/);
  assert.match(table, /className="admin-data-table"/);
  assert.match(table, /className="admin-data-table-actions"/);
  assert.doesNotMatch(table, /admin-table-wrap/);
  assert.doesNotMatch(table, /className="admin-table"/);
  const page = read("src/pages/AdminEmployeesPage.jsx");
  assert.match(page, /admin-employees-page/);
});

test("Contact detail nested invoices and orders use the shared admin-data-table system", () => {
  const page = read("src/pages/AdminContactDetailPage.jsx");
  assert.match(page, /className="admin-data-table-wrap"/);
  assert.match(page, /className="admin-data-table"/);
  assert.match(page, /invoice\.invoice_number/);
  assert.match(page, /order\.reference/);
  assert.doesNotMatch(page, /contact-records-scroll table/);
});

test("Inbox keeps Meta connect deferred and internal conversations honest", () => {
  const page = read("src/pages/AdminInboxPage.jsx");
  assert.match(page, /Connect Meta/);
  assert.match(page, /AdminUnderDevelopmentContent/);
  assert.match(page, /externalBanner/);
  assert.match(page, /No conversations yet/);
  assert.doesNotMatch(page, /fake message|fabricated conversation|localStorage/i);
});

test("Forms keeps plan-unavailable strip and honest empty workspace", () => {
  const page = read("src/pages/AdminFormsPage.jsx");
  assert.match(page, /forms-plan-strip/);
  assert.match(page, /planUnavailable/);
  assert.match(page, /forms-workspace-panel/);
  assert.match(page, /forms-empty-layout/);
  assert.match(page, /AdminUnderDevelopmentContent/);
  assert.doesNotMatch(page, /1\/25|\d+\/\d+|quota/i);
});

test("dashboard-shell.css carries tenant CRM admin-data-table and chrome overrides", () => {
  const css = read("src/styles/dashboard-shell.css");
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.admin-contacts-table-card \.admin-data-table-wrap[\s\S]*?--dashboard-bg-card/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.admin-contacts-table-card \.admin-data-table[\s\S]*?min-width:\s*1280px/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.reviews-page \.admin-data-table-wrap[\s\S]*?--dashboard-bg-card/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.reviews-page \.admin-data-table[\s\S]*?min-width:\s*960px/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.admin-employees-page \.admin-data-table-wrap[\s\S]*?--dashboard-bg-card/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.admin-employees-page \.admin-data-table[\s\S]*?min-width:\s*900px/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.admin-inbox-page \.admin-inbox-workspace[\s\S]*?--dashboard-card-radius/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.admin-contact-detail \.admin-contact-identity-card[\s\S]*?--dashboard-card-radius/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.customer-forms-page \.forms-workspace-panel[\s\S]*?--dashboard-bg-card/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.customer-forms-page \.forms-plan-strip[\s\S]*?--dashboard-bg-card/);
});