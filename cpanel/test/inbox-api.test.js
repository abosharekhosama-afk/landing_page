import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("inbox API client targets authenticated admin inbox routes", () => {
  const client = read("src/utils/inboxApi.js");
  assert.match(client, /function buildInboxQuery/);
  assert.match(client, /contactId/);
  assert.match(client, /unassigned/);
  assert.match(client, /fetchInboxConversations/);
  assert.match(client, /fetchInboxConversation/);
  assert.match(client, /createInboxConversation/);
  assert.match(client, /replyToInboxConversation/);
  assert.match(client, /markInboxConversationRead/);
  assert.match(client, /assignInboxConversation/);
  assert.match(client, /archiveInboxConversation/);
  assert.match(client, /restoreInboxConversation/);
  assert.match(client, /updateInboxConversation/);
  assert.doesNotMatch(client, /companyId|X-Company-Id|localStorage/i);
});

test("inbox permissions helper mirrors customer action checks", () => {
  const roles = read("src/utils/roles.js");
  assert.match(roles, /canUseInboxAction/);
  assert.match(roles, /inbox\.manage/);
});
