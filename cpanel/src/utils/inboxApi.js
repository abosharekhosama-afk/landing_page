import { apiRequest } from "./api.js";

function conversationPath(conversationId, suffix = "") {
  return `/admin/inbox/conversations/${encodeURIComponent(conversationId)}${suffix}`;
}

export function buildInboxQuery(filters = {}) {
  const params = new URLSearchParams();
  for (const key of ["q", "status", "assignedTo", "contactId", "unassigned", "unread", "archived", "cursor", "limit"]) {
    const value = filters[key];
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function fetchInboxConversations(filters = {}, options = {}) {
  return apiRequest(`/admin/inbox/conversations${buildInboxQuery(filters)}`, { signal: options.signal });
}

export function fetchInboxConversation(conversationId, options = {}) {
  return apiRequest(conversationPath(conversationId), { signal: options.signal });
}

export function createInboxConversation(payload) {
  return apiRequest("/admin/inbox/conversations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function replyToInboxConversation(conversationId, body) {
  return apiRequest(conversationPath(conversationId, "/messages"), {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function updateInboxConversation(conversationId, patch) {
  return apiRequest(conversationPath(conversationId), {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function markInboxConversationRead(conversationId) {
  return apiRequest(conversationPath(conversationId, "/read"), {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function assignInboxConversation(conversationId, employeeId) {
  return apiRequest(conversationPath(conversationId, "/assign"), {
    method: "POST",
    body: JSON.stringify({ employeeId }),
  });
}

export function archiveInboxConversation(conversationId) {
  return apiRequest(conversationPath(conversationId, "/archive"), {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function restoreInboxConversation(conversationId) {
  return apiRequest(conversationPath(conversationId, "/restore"), {
    method: "POST",
    body: JSON.stringify({}),
  });
}
