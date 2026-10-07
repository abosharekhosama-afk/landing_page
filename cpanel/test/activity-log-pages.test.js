import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { canAccessAdminPage } from "../src/utils/roles.js";
import {
  activityActorLabel,
  activityLogQueryFromFilters,
  formatActivityPayload,
  formatActivityWhen,
  normalizeActivityLog,
  normalizeActivityLogList,
  sanitizeActivityPayload,
} from "../src/utils/activityLogUi.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("activity log API client maps list filters and detail fetch", () => {
  const api = read("src/utils/activityLogApi.js");
  assert.match(api, /\/admin\/activity-log/);
  assert.match(api, /date_from/);
  assert.match(api, /actor_email/);
  assert.match(api, /entity_type/);
  assert.match(api, /fetchActivityLog\(logId\)/);
});

test("activity log timestamp mapping preserves ISO and Date values", () => {
  assert.equal(normalizeActivityLog({ created_at: "2026-08-30T10:00:00.000Z" }).created_at, "2026-08-30T10:00:00.000Z");
  assert.equal(normalizeActivityLog({ createdAt: "2026-08-30T11:00:00.000Z" }).created_at, "2026-08-30T11:00:00.000Z");
  const fromDate = normalizeActivityLog({ created_at: new Date("2026-08-30T12:00:00.000Z") });
  assert.equal(fromDate.created_at, "2026-08-30T12:00:00.000Z");
  assert.notEqual(formatActivityWhen("2026-08-30T10:00:00.000Z", "en"), "—");
  assert.equal(formatActivityWhen("", "en"), "—");
  assert.equal(formatActivityWhen(null, "en"), "—");
});

test("activity log mapping keeps known fields and strips secrets", () => {
  const mapped = normalizeActivityLog({
    id: "log-1",
    actor_name: "Ada",
    actor_email: "ada@test.local",
    action: "product.updated",
    entity_type: "product",
    entity_label: "Soap",
    summary: "Updated product",
    created_at: "2026-08-30T10:00:00.000Z",
    after_data: { name: "Soap", password: "secret", token: "abc" },
    visitors: 9,
  });
  assert.equal(mapped.action, "product.updated");
  assert.equal(mapped.after_data.name, "Soap");
  assert.equal(mapped.after_data.password, undefined);
  assert.equal(mapped.after_data.token, undefined);
  assert.equal(mapped.visitors, undefined);
  assert.equal(activityActorLabel(mapped), "Ada");
  assert.equal(formatActivityPayload({ api_key: "x", count: 2 }).includes("api_key"), false);
  assert.match(formatActivityPayload({ count: 2 }), /"count": 2/);
});

test("list payload mapping uses logs/total/page from the API", () => {
  const list = normalizeActivityLogList({
    logs: [{ id: "a", action: "x" }],
    total: 12,
    page: 2,
    limit: 50,
    totalPages: 3,
  });
  assert.equal(list.logs.length, 1);
  assert.equal(list.total, 12);
  assert.equal(list.page, 2);
  assert.equal(list.totalPages, 3);
  assert.deepEqual(normalizeActivityLogList(null).logs, []);
  const query = activityLogQueryFromFilters({ action: "order.created", actorEmail: "ada@", dateFrom: "2026-08-01" }, { page: 2 });
  assert.equal(query.action, "order.created");
  assert.equal(query.actorEmail, "ada@");
  assert.match(query.dateFrom, /2026-08-01/);
  assert.equal(query.page, 2);
});

test("sanitizeActivityPayload never invents log events", () => {
  assert.equal(sanitizeActivityPayload(null), null);
  assert.equal(normalizeActivityLog(null).action, "");
});

test("activity log workspace covers list, filters, paging, states, and detail", () => {
  const workspace = read("src/components/ActivityLogWorkspace.jsx");
  const page = read("src/pages/AdminActivityLogPage.jsx");
  const app = read("src/CPanelApp.jsx");
  assert.match(workspace, /fetchActivityLogs/);
  assert.match(workspace, /fetchActivityLog/);
  assert.match(workspace, /activityLogQueryFromFilters/);
  assert.match(workspace, /copy.loading/);
  assert.match(workspace, /copy.empty/);
  assert.match(workspace, /copy.emptyFilter/);
  assert.match(workspace, /copy.retry/);
  assert.match(workspace, /copy.forbidden/);
  assert.match(workspace, /copy.readOnly/);
  assert.match(workspace, /copy.loadMore/);
  assert.match(workspace, /setDetailId/);
  assert.match(workspace, /canAccessAdminPage/);
  assert.match(page, /ActivityLogWorkspace/);
  assert.match(app, /activePage === "admin-activity-log"/);
  assert.match(app, /AdminActivityLogPage/);
  assert.doesNotMatch(workspace, /localStorage|fake log|sampleActivity|Math\.random/i);
});

test("activity_log.view gates the CPanel page", () => {
  assert.equal(canAccessAdminPage({ role: "employee", permissions: ["activity_log.view"] }, "admin-activity-log"), true);
  assert.equal(canAccessAdminPage({ role: "employee", permissions: ["reports.view"] }, "admin-activity-log"), false);
  assert.equal(canAccessAdminPage({ role: "company_admin" }, "admin-activity-log"), true);
});

test("activity log styles stack on tablet and mobile", () => {
  const css = read("src/styles/global.css");
  const section = css.slice(css.indexOf("/* Activity log workspace */"));
  assert.match(section, /\.activity-log-list/);
  assert.match(section, /\.activity-log-dialog/);
  assert.match(section, /@media \(max-width: 820px\)/);
});
