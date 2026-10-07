import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("inbox workspace covers list filters, thread actions, and pagination wiring", () => {
  const page = read("src/pages/AdminInboxPage.jsx");
  assert.match(page, /fetchInboxConversations/);
  assert.match(page, /fetchInboxConversation/);
  assert.match(page, /createInboxConversation/);
  assert.match(page, /replyToInboxConversation/);
  assert.match(page, /markInboxConversationRead/);
  assert.match(page, /assignInboxConversation/);
  assert.match(page, /updateInboxConversation/);
  assert.match(page, /archiveInboxConversation/);
  assert.match(page, /restoreInboxConversation/);
  assert.match(page, /listFilter === "archived"/);
  assert.match(page, /filters\.unread = true/);
  assert.match(page, /filters\.status = "open"/);
  assert.match(page, /filters\.unassigned = true/);
  assert.match(page, /filters\.assignedTo/);
  assert.match(page, /nextCursor/);
  assert.match(page, /loadMoreConversations/);
  assert.match(page, /admin-inbox-load-more/);
  assert.match(page, /canUseInboxAction/);
  assert.match(page, /has-selection/);
  assert.match(page, /admin-inbox-mobile-back/);
  assert.match(page, /labels\.backToList/);
  assert.match(page, /labels\.readOnly/);
  assert.match(page, /labels\.emptyMessages/);
  assert.doesNotMatch(page, /localStorage|fake conversation|mock inbox/i);
});

test("inbox API client exposes contact and assignee query params", () => {
  const client = read("src/utils/inboxApi.js");
  assert.match(client, /contactId/);
  assert.match(client, /unassigned/);
});

test("contact inbox tab uses contactId server filter and create/reply flows", () => {
  const page = read("src/pages/AdminContactDetailPage.jsx");
  assert.match(page, /contactId: contact\.id/);
  assert.match(page, /createInboxConversation/);
  assert.match(page, /replyToInboxConversation/);
  assert.match(page, /canUseInboxAction/);
  assert.match(page, /inboxReplyBlocked/);
  assert.match(page, /onNavigate\?\.\("admin-inbox"\)/);
});

test("inbox thread links back to contact detail by contactId", () => {
  const page = read("src/pages/AdminInboxPage.jsx");
  assert.match(page, /admin-customers-detail/);
  assert.match(page, /conversation\.contactId/);
});

test("shared inbox UI helpers stay presentation-only", () => {
  const ui = read("src/utils/inboxUi.js");
  assert.match(ui, /formatInboxWhen/);
  assert.match(ui, /inboxReplyBlocked/);
  assert.doesNotMatch(ui, /fetch|apiRequest|localStorage/i);
});

test("inbox styles include mobile list-thread toggle and overflow guards", () => {
  const css = read("src/styles/global.css");
  const section = css.slice(css.indexOf("/* Inbox and Customers & Leads pages */"));
  assert.match(section, /\.admin-inbox-workspace\.has-selection/);
  assert.match(section, /\.admin-inbox-mobile-back/);
  assert.match(section, /\.admin-inbox-assign-filter/);
  assert.match(section, /\.admin-inbox-load-more/);
  assert.match(section, /@media \(max-width: 820px\)/);
});
