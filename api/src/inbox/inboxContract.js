const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/;
const HTML_PATTERN = /<\/?[a-z][^>]*>|<script\b|javascript:/i;
const SUBJECT_LIMIT = 200;
const MESSAGE_LIMIT = 10_000;

function validationError(message, details = null) {
  const error = new Error(message);
  error.statusCode = 400;
  if (details) error.details = details;
  return error;
}

function assertObject(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw validationError("A JSON object is required.");
  }
}

function rejectUnknown(input, allowed) {
  const unknown = Object.keys(input).filter((key) => !allowed.includes(key));
  if (unknown.length) {
    throw validationError("Unknown writable fields are not allowed.", { fields: unknown });
  }
}

function plainText(value, field, { required = false, limit }) {
  if (value == null && !required) return undefined;
  if (typeof value !== "string") throw validationError(`${field} must be text.`);
  const normalized = value.trim();
  if (required && !normalized) throw validationError(`${field} is required.`);
  if (normalized.length > limit) throw validationError(`${field} is too long.`);
  if (HTML_PATTERN.test(normalized)) throw validationError(`${field} must be plain text.`);
  return normalized;
}

export function validateInboxId(value, field = "ID", { nullable = false } = {}) {
  if (nullable && value === null) return null;
  if (typeof value !== "string" || !ID_PATTERN.test(value.trim())) {
    throw validationError(`${field} is invalid.`);
  }
  return value.trim();
}

export function validateCreateConversationInput(input) {
  assertObject(input);
  rejectUnknown(input, ["contactId", "subject", "initialMessage"]);
  return {
    contactId: validateInboxId(input.contactId, "contactId"),
    subject: plainText(input.subject ?? "", "subject", { limit: SUBJECT_LIMIT }),
    initialMessage: plainText(input.initialMessage, "initialMessage", {
      required: true,
      limit: MESSAGE_LIMIT,
    }),
  };
}

export function validateReplyInput(input) {
  assertObject(input);
  rejectUnknown(input, ["body"]);
  return { body: plainText(input.body, "body", { required: true, limit: MESSAGE_LIMIT }) };
}

export function validateConversationPatch(input) {
  assertObject(input);
  rejectUnknown(input, ["subject", "status"]);
  if (!Object.keys(input).length) throw validationError("No supported changes were provided.");
  const patch = {};
  if (Object.hasOwn(input, "subject")) {
    patch.subject = plainText(input.subject, "subject", { limit: SUBJECT_LIMIT });
  }
  if (Object.hasOwn(input, "status")) {
    if (!new Set(["open", "closed"]).has(input.status)) {
      throw validationError("status must be open or closed.");
    }
    patch.status = input.status;
  }
  return patch;
}

export function validateAssignmentInput(input) {
  assertObject(input);
  rejectUnknown(input, ["employeeId"]);
  if (!Object.hasOwn(input, "employeeId")) throw validationError("employeeId is required.");
  return { employeeId: validateInboxId(input.employeeId, "employeeId", { nullable: true }) };
}

export function validateNoWritableInput(input) {
  if (input == null) return;
  assertObject(input);
  rejectUnknown(input, []);
}

export function parseConversationQuery(query = {}) {
  const allowed = ["q", "status", "assignedTo", "contactId", "unassigned", "unread", "archived", "cursor", "limit"];
  rejectUnknown(query, allowed);
  const status = query.status == null || query.status === "" ? null : String(query.status);
  if (status && !new Set(["open", "closed"]).has(status)) {
    throw validationError("status must be open or closed.");
  }
  const booleanValue = (value, field, fallback = null) => {
    if (value == null || value === "") return fallback;
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    throw validationError(`${field} must be true or false.`);
  };
  const requestedLimit = query.limit == null || query.limit === "" ? 50 : Number(query.limit);
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
    throw validationError("limit must be a positive integer.");
  }
  const assignedTo = query.assignedTo ? validateInboxId(String(query.assignedTo), "assignedTo") : null;
  const unassigned = booleanValue(query.unassigned, "unassigned", false);
  if (assignedTo && unassigned) {
    throw validationError("assignedTo and unassigned cannot be used together.");
  }
  return {
    q: plainText(String(query.q || ""), "q", { limit: 200 }).toLowerCase(),
    status,
    assignedTo,
    contactId: query.contactId ? validateInboxId(String(query.contactId), "contactId") : null,
    unassigned,
    unread: booleanValue(query.unread, "unread"),
    archived: booleanValue(query.archived, "archived", false),
    cursor: query.cursor ? validateInboxId(String(query.cursor), "cursor") : null,
    limit: Math.min(requestedLimit, 100),
  };
}

export function safeInboxUser(user) {
  if (!user) return null;
  return { id: user.id, name: user.name || "", email: user.email || "", phone: user.phone || "" };
}

export function safeConversationResponse(conversation, context = {}) {
  const { contact = null, assignedEmployee = null, unreadCount = 0, lastMessage = null } = context;
  return {
    id: conversation.id,
    contactId: conversation.contactId,
    contact: contact ? { ...safeInboxUser(contact), isArchived: Boolean(contact.isArchived) } : null,
    subject: conversation.subject || "",
    channel: "internal",
    status: conversation.status,
    assignedEmployeeId: conversation.assignedEmployeeId || null,
    assignedEmployee: safeInboxUser(assignedEmployee),
    unreadCount: Math.max(0, Number(unreadCount || 0)),
    lastMessage: lastMessage ? safeMessageResponse(lastMessage, context) : null,
    lastMessageAt: conversation.lastMessageAt || null,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    archivedAt: conversation.archivedAt || null,
  };
}

export function safeMessageResponse(message, context = {}) {
  const sender = context.senderById?.get?.(message.senderUserId) || context.sender || null;
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderType: message.senderType,
    senderUserId: message.senderUserId || null,
    sender: safeInboxUser(sender),
    body: message.body,
    createdAt: message.createdAt,
  };
}
