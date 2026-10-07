import crypto from "node:crypto";
import { Router } from "express";
import { recordActivityLog } from "../activityLog/logger.js";
import {
  companyMembershipRepository,
  captureInboxMutationState,
  inboxConversationReadRepository,
  inboxConversationRepository,
  inboxMessageRepository,
  persistInboxMutation,
} from "../data/store.js";
import {
  parseConversationQuery,
  safeConversationResponse,
  safeMessageResponse,
  validateAssignmentInput,
  validateConversationPatch,
  validateCreateConversationInput,
  validateNoWritableInput,
  validateReplyInput,
} from "../inbox/inboxContract.js";
import { requireAnyPermission, requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const canView = requireAnyPermission("inbox.view", "inbox.manage");
const canCreate = requireAnyPermission("inbox.create", "inbox.manage");
const canReply = requireAnyPermission("inbox.reply", "inbox.manage");
const canAssign = requireAnyPermission("inbox.assign", "inbox.manage");
const canUpdate = requireAnyPermission("inbox.update", "inbox.manage");
const canArchive = requireAnyPermission("inbox.archive", "inbox.manage");

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function inboxError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function conversationForRequest(req) {
  const conversation = inboxConversationRepository.findByCompany(
    req.companyId,
    req.params.conversationId,
  );
  if (!conversation) throw inboxError("Conversation not found.", 404);
  return conversation;
}

async function membershipsById(companyId) {
  const memberships = await companyMembershipRepository.listUsersForCompany(companyId);
  return new Map(memberships.map((membership) => [membership.userId, membership]));
}

function contactFromMembership(membership) {
  if (!membership?.user || membership.role !== "customer") return null;
  return {
    id: membership.userId,
    name: membership.user.name || "",
    email: membership.user.email || "",
    phone: membership.user.phone || "",
    isArchived: membership.status !== "active" || membership.user.isActive === false,
  };
}

function employeeFromMembership(membership) {
  if (!membership?.user || membership.role !== "employee" || membership.status !== "active") return null;
  if (membership.user.isActive === false) return null;
  return membership.user;
}

function messagesFor(companyId, conversationId) {
  return inboxMessageRepository.listForConversation(companyId, conversationId);
}

function unreadCount(companyId, conversationId, userId) {
  const read = inboxConversationReadRepository.findForUser(companyId, conversationId, userId);
  return messagesFor(companyId, conversationId).filter(
    (message) => !read?.lastReadAt || String(message.createdAt) > String(read.lastReadAt),
  ).length;
}

function lastMessage(companyId, conversationId) {
  return messagesFor(companyId, conversationId).at(-1) || null;
}

async function responseContext(req, conversation, membershipMap = null) {
  const memberships = membershipMap || await membershipsById(req.companyId);
  const contact = contactFromMembership(memberships.get(conversation.contactId));
  const assignedEmployee = employeeFromMembership(memberships.get(conversation.assignedEmployeeId));
  const senderById = new Map(
    [...memberships.values()].filter((membership) => membership.user)
      .map((membership) => [membership.userId, membership.user]),
  );
  senderById.set(req.user.id, req.user);
  return {
    contact,
    assignedEmployee,
    unreadCount: unreadCount(req.companyId, conversation.id, req.user.id),
    lastMessage: lastMessage(req.companyId, conversation.id),
    senderById,
  };
}

async function persistMutation(req, checkpoint) {
  await persistInboxMutation(req.companyId, checkpoint);
}

function administrativeLog(req, action, conversation, summary, metadata = null) {
  return recordActivityLog({
    req,
    companyId: req.companyId,
    action,
    entityType: "inbox_conversation",
    entityId: conversation.id,
    entityLabel: conversation.subject || conversation.id,
    summary,
    metadata,
  });
}

router.get("/conversations", canView, asyncRoute(async (req, res) => {
  const query = parseConversationQuery(req.query);
  const memberships = await membershipsById(req.companyId);
  let conversations = inboxConversationRepository.getByCompany(req.companyId)
    .filter((conversation) => query.archived ? Boolean(conversation.archivedAt) : !conversation.archivedAt)
    .filter((conversation) => !query.status || conversation.status === query.status)
    .filter((conversation) => !query.contactId || conversation.contactId === query.contactId)
    .filter((conversation) => !query.unassigned || !conversation.assignedEmployeeId)
    .filter((conversation) => !query.assignedTo || conversation.assignedEmployeeId === query.assignedTo)
    .sort((a, b) => {
      const activity = String(b.lastMessageAt || b.updatedAt).localeCompare(String(a.lastMessageAt || a.updatedAt));
      return activity || b.id.localeCompare(a.id);
    });

  if (query.q) {
    conversations = conversations.filter((conversation) => {
      const contact = contactFromMembership(memberships.get(conversation.contactId));
      return [conversation.subject, contact?.name, contact?.email, contact?.phone]
        .some((value) => String(value || "").toLowerCase().includes(query.q));
    });
  }
  if (query.unread !== null) {
    conversations = conversations.filter(
      (conversation) => (unreadCount(req.companyId, conversation.id, req.user.id) > 0) === query.unread,
    );
  }
  if (query.cursor) {
    const cursorIndex = conversations.findIndex((conversation) => conversation.id === query.cursor);
    if (cursorIndex === -1) throw inboxError("Invalid pagination cursor.", 400);
    conversations = conversations.slice(cursorIndex + 1);
  }
  const page = conversations.slice(0, query.limit);
  const nextCursor = conversations.length > query.limit ? page.at(-1)?.id || null : null;
  const safe = await Promise.all(page.map(async (conversation) =>
    safeConversationResponse(conversation, await responseContext(req, conversation, memberships))));
  res.json({ conversations: safe, nextCursor });
}));

router.post("/conversations", canCreate, asyncRoute(async (req, res) => {
  const input = validateCreateConversationInput(req.body);
  const membership = await companyMembershipRepository.getMembershipByCompanyAndUser(
    req.companyId,
    input.contactId,
  );
  const contact = contactFromMembership(membership);
  if (!contact) throw inboxError("Contact not found.", 404);
  if (contact.isArchived) throw inboxError("Archived contacts cannot start conversations.", 409);

  const now = new Date().toISOString();
  const checkpoint = captureInboxMutationState(req.companyId);
  const conversation = inboxConversationRepository.createForCompany(req.companyId, {
    id: crypto.randomUUID(),
    contactId: input.contactId,
    subject: input.subject,
    channel: "internal",
    status: "open",
    assignedEmployeeId: null,
    createdByUserId: req.user.id,
    lastMessageAt: now,
    createdAt: now,
    updatedAt: now,
    closedAt: null,
    archivedAt: null,
  });
  inboxMessageRepository.appendForCompany(req.companyId, {
    id: crypto.randomUUID(),
    conversationId: conversation.id,
    senderType: "staff",
    senderUserId: req.user.id,
    body: input.initialMessage,
    createdAt: now,
  });
  inboxConversationReadRepository.markRead(req.companyId, conversation.id, req.user.id, now);
  await persistMutation(req, checkpoint);
  await administrativeLog(req, "inbox.conversation.created", conversation, "Conversation created.");
  res.status(201).json(safeConversationResponse(
    conversation,
    await responseContext(req, conversation),
  ));
}));

router.get("/conversations/:conversationId", canView, asyncRoute(async (req, res) => {
  const conversation = conversationForRequest(req);
  const context = await responseContext(req, conversation);
  const read = inboxConversationReadRepository.findForUser(req.companyId, conversation.id, req.user.id);
  res.json({
    conversation: safeConversationResponse(conversation, context),
    messages: messagesFor(req.companyId, conversation.id)
      .map((message) => safeMessageResponse(message, context)),
    read: { lastReadAt: read?.lastReadAt || null, unreadCount: context.unreadCount },
  });
}));

router.post("/conversations/:conversationId/messages", canReply, asyncRoute(async (req, res) => {
  const input = validateReplyInput(req.body);
  const conversation = conversationForRequest(req);
  if (conversation.archivedAt) throw inboxError("Restore the conversation before replying.", 409);
  if (conversation.status === "closed") throw inboxError("Reopen the conversation before replying.", 409);
  const membership = await companyMembershipRepository.getMembershipByCompanyAndUser(
    req.companyId,
    conversation.contactId,
  );
  const contact = contactFromMembership(membership);
  if (!contact) throw inboxError("Contact not found.", 404);
  if (contact.isArchived) throw inboxError("Archived contacts cannot receive replies.", 409);

  const now = new Date().toISOString();
  const checkpoint = captureInboxMutationState(req.companyId);
  const message = inboxMessageRepository.appendForCompany(req.companyId, {
    id: crypto.randomUUID(),
    conversationId: conversation.id,
    senderType: "staff",
    senderUserId: req.user.id,
    body: input.body,
    createdAt: now,
  });
  inboxConversationRepository.updateForCompany(req.companyId, conversation.id, {
    ...conversation,
    lastMessageAt: now,
    updatedAt: now,
  });
  inboxConversationReadRepository.markRead(req.companyId, conversation.id, req.user.id, now);
  await persistMutation(req, checkpoint);
  res.status(201).json(safeMessageResponse(message, { sender: req.user }));
}));

router.patch("/conversations/:conversationId", canUpdate, asyncRoute(async (req, res) => {
  const patch = validateConversationPatch(req.body);
  const conversation = conversationForRequest(req);
  if (conversation.archivedAt) throw inboxError("Restore the conversation before updating it.", 409);
  const now = new Date().toISOString();
  const checkpoint = captureInboxMutationState(req.companyId);
  const updated = inboxConversationRepository.updateForCompany(req.companyId, conversation.id, {
    ...conversation,
    ...patch,
    updatedAt: now,
    closedAt: patch.status === "closed" ? now : patch.status === "open" ? null : conversation.closedAt,
  });
  await persistMutation(req, checkpoint);
  if (patch.status && patch.status !== conversation.status) {
    await administrativeLog(req, "inbox.conversation.status_changed", updated, "Conversation status changed.", {
      previousStatus: conversation.status,
      status: updated.status,
    });
  }
  res.json(safeConversationResponse(updated, await responseContext(req, updated)));
}));

router.post("/conversations/:conversationId/read", canView, asyncRoute(async (req, res) => {
  validateNoWritableInput(req.body);
  const conversation = conversationForRequest(req);
  const now = new Date().toISOString();
  const checkpoint = captureInboxMutationState(req.companyId);
  const read = inboxConversationReadRepository.markRead(req.companyId, conversation.id, req.user.id, now);
  await persistMutation(req, checkpoint);
  res.json({ lastReadAt: read.lastReadAt, unreadCount: 0 });
}));

router.post("/conversations/:conversationId/assign", canAssign, asyncRoute(async (req, res) => {
  const { employeeId } = validateAssignmentInput(req.body);
  const conversation = conversationForRequest(req);
  if (conversation.archivedAt) throw inboxError("Restore the conversation before assigning it.", 409);
  if (employeeId) {
    const membership = await companyMembershipRepository.getMembershipByCompanyAndUser(
      req.companyId,
      employeeId,
    );
    if (!employeeFromMembership(membership)) throw inboxError("Employee not found.", 404);
  }
  const previousEmployeeId = conversation.assignedEmployeeId || null;
  const checkpoint = captureInboxMutationState(req.companyId);
  const updated = inboxConversationRepository.updateForCompany(req.companyId, conversation.id, {
    ...conversation,
    assignedEmployeeId: employeeId,
    updatedAt: new Date().toISOString(),
  });
  await persistMutation(req, checkpoint);
  await administrativeLog(req, "inbox.conversation.assignment_changed", updated, "Conversation assignment changed.", {
    previousEmployeeId,
    employeeId,
  });
  res.json(safeConversationResponse(updated, await responseContext(req, updated)));
}));

router.post("/conversations/:conversationId/archive", canArchive, asyncRoute(async (req, res) => {
  validateNoWritableInput(req.body);
  const conversation = conversationForRequest(req);
  if (conversation.archivedAt) throw inboxError("Conversation is already archived.", 409);
  const now = new Date().toISOString();
  const checkpoint = captureInboxMutationState(req.companyId);
  const updated = inboxConversationRepository.updateForCompany(req.companyId, conversation.id, {
    ...conversation,
    archivedAt: now,
    updatedAt: now,
  });
  await persistMutation(req, checkpoint);
  await administrativeLog(req, "inbox.conversation.archived", updated, "Conversation archived.");
  res.json(safeConversationResponse(updated, await responseContext(req, updated)));
}));

router.post("/conversations/:conversationId/restore", canArchive, asyncRoute(async (req, res) => {
  validateNoWritableInput(req.body);
  const conversation = conversationForRequest(req);
  if (!conversation.archivedAt) throw inboxError("Conversation is not archived.", 409);
  const checkpoint = captureInboxMutationState(req.companyId);
  const updated = inboxConversationRepository.updateForCompany(req.companyId, conversation.id, {
    ...conversation,
    archivedAt: null,
    updatedAt: new Date().toISOString(),
  });
  await persistMutation(req, checkpoint);
  await administrativeLog(req, "inbox.conversation.restored", updated, "Conversation restored.");
  res.json(safeConversationResponse(updated, await responseContext(req, updated)));
}));

router.use((error, _req, res, _next) => {
  const status = Number(error?.statusCode || 500);
  const safeStatus = [400, 401, 403, 404, 409].includes(status) ? status : 500;
  if (safeStatus === 500) console.error("Inbox request failed:", error?.message || error);
  res.status(safeStatus).json({
    message: safeStatus === 500 ? "Inbox request failed." : error.message,
    ...(safeStatus === 400 && error?.details ? { errors: error.details } : {}),
  });
});

export default router;
