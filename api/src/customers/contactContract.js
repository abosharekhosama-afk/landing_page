const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNSAFE_TEXT_PATTERN = /[<>]|javascript\s*:|\bon\w+\s*=/i;
const CONTACT_TYPES = new Set(["customer", "lead"]);
const ACCOUNT_TYPES = new Set(["retail", "trader", "wholesale"]);
const EDITABLE_FIELDS = new Set([
  "firstName",
  "lastName",
  "displayName",
  "name",
  "email",
  "phone",
  "type",
  "source",
  "notes",
  "labels",
  "accountType",
]);
const TEXT_LIMITS = {
  firstName: 80,
  lastName: 80,
  displayName: 160,
  name: 160,
  phone: 40,
  source: 80,
  notes: 4000,
};

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function safeText(value, field, limit, errors, { required = false } = {}) {
  if (typeof value !== "string") {
    errors[field] = `${field} must be plain text.`;
    return "";
  }
  const normalized = value.trim();
  if (required && !normalized) errors[field] = `${field} is required.`;
  else if (normalized.length > limit) errors[field] = `${field} must be ${limit} characters or fewer.`;
  else if (UNSAFE_TEXT_PATTERN.test(normalized)) errors[field] = `${field} must not contain HTML or scripts.`;
  return normalized;
}

function validationError(errors) {
  const error = new Error("Validation failed.");
  error.statusCode = 400;
  error.details = errors;
  return error;
}

export function validateContactInput(body, { create = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw validationError({ body: "Request body must be an object." });
  }
  const errors = {};
  const unknown = Object.keys(body).filter((key) => !EDITABLE_FIELDS.has(key));
  if (unknown.length) errors.fields = `Unknown fields: ${unknown.join(", ")}.`;
  const values = {};

  for (const [field, limit] of Object.entries(TEXT_LIMITS)) {
    if (hasOwn(body, field)) values[field] = safeText(body[field], field, limit, errors);
  }

  if (hasOwn(body, "email")) {
    const email = safeText(body.email, "email", 254, errors, { required: true });
    if (email && !EMAIL_PATTERN.test(email)) errors.email = "email must be a valid email address.";
    values.email = email.toLowerCase();
  } else if (create) {
    errors.email = "email is required.";
  }

  if (hasOwn(body, "type")) {
    const type = typeof body.type === "string" ? body.type.trim().toLowerCase() : "";
    if (!CONTACT_TYPES.has(type)) errors.type = "type must be customer or lead.";
    else values.type = type;
  }

  if (hasOwn(body, "accountType")) {
    const accountType = typeof body.accountType === "string" ? body.accountType.trim().toLowerCase() : "";
    if (!ACCOUNT_TYPES.has(accountType)) {
      errors.accountType = "accountType must be retail, trader, or wholesale.";
    } else values.accountType = accountType;
  }

  if (hasOwn(body, "labels")) {
    if (!Array.isArray(body.labels) || body.labels.length > 20) {
      errors.labels = "labels must be an array with no more than 20 items.";
    } else {
      const labels = [];
      for (let index = 0; index < body.labels.length; index += 1) {
        const label = safeText(body.labels[index], `labels[${index}]`, 60, errors, { required: true });
        if (label) labels.push(label);
      }
      values.labels = [...new Set(labels)];
    }
  }

  if (create) {
    const suppliedName = values.displayName || values.name || [values.firstName, values.lastName].filter(Boolean).join(" ");
    if (!suppliedName) errors.displayName = "A display name, name, first name, or last name is required.";
  } else if (!Object.keys(values).length && !unknown.length) {
    errors.body = "At least one editable field is required.";
  }

  if (Object.keys(errors).length) throw validationError(errors);
  const displayName = values.displayName || values.name
    || (create ? [values.firstName, values.lastName].filter(Boolean).join(" ") : "");
  if (displayName) {
    values.displayName = displayName;
    values.name = displayName;
  }
  if (create) {
    values.type ||= "customer";
    values.accountType ||= "retail";
    values.labels ||= [];
    values.notes ||= "";
    values.source ||= "";
    values.phone ||= "";
    values.firstName ||= "";
    values.lastName ||= "";
  }
  return values;
}

export function parseContactQuery(query = {}) {
  const errors = {};
  const parsed = { archived: false, page: null, limit: null, q: "", type: "" };
  if (query.q !== undefined) parsed.q = safeText(String(query.q), "q", 200, errors).toLowerCase();
  if (query.type !== undefined && query.type !== "") {
    const type = String(query.type).trim().toLowerCase();
    if (!CONTACT_TYPES.has(type)) errors.type = "type must be customer or lead.";
    else parsed.type = type;
  }
  if (query.archived !== undefined && query.archived !== "") {
    const archived = String(query.archived).trim().toLowerCase();
    if (!["true", "false", "all"].includes(archived)) errors.archived = "archived must be true, false, or all.";
    else parsed.archived = archived === "all" ? "all" : archived === "true";
  }
  for (const field of ["page", "limit"]) {
    if (query[field] === undefined || query[field] === "") continue;
    const number = Number(query[field]);
    const maximum = field === "limit" ? 100 : Number.MAX_SAFE_INTEGER;
    if (!Number.isInteger(number) || number < 1 || number > maximum) {
      errors[field] = `${field} must be a positive integer${field === "limit" ? " no greater than 100" : ""}.`;
    } else parsed[field] = number;
  }
  if (Object.keys(errors).length) throw validationError(errors);
  if ((parsed.page === null) !== (parsed.limit === null)) {
    throw validationError({ pagination: "page and limit must be supplied together." });
  }
  return parsed;
}

export function safeContactResponse(membership, orderCount = 0, reviewCount = 0) {
  const user = membership?.user || {};
  const displayName = user.displayName || user.name || [user.firstName, user.lastName].filter(Boolean).join(" ");
  const archived = membership?.status !== "active";
  return {
    id: user.id,
    name: displayName || "",
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    displayName: displayName || "",
    email: user.email || "",
    phone: user.phone || "",
    type: CONTACT_TYPES.has(user.type) ? user.type : "customer",
    source: user.source || "",
    notes: user.notes || "",
    labels: Array.isArray(user.labels) ? user.labels : [],
    accountType: ACCOUNT_TYPES.has(user.accountType) ? user.accountType : "retail",
    isArchived: archived,
    isActive: !archived && user.isActive !== false,
    orderCount: Number(orderCount || 0),
    reviewCount: Number(reviewCount || 0),
    createdAt: user.createdAt || membership?.createdAt || null,
    updatedAt: user.updatedAt || membership?.updatedAt || null,
  };
}

export function contactMatchesQuery(contact, query) {
  if (query.archived !== "all" && contact.isArchived !== query.archived) return false;
  if (query.type && contact.type !== query.type) return false;
  if (!query.q) return true;
  return [contact.name, contact.firstName, contact.lastName, contact.email, contact.phone]
    .some((value) => String(value || "").toLowerCase().includes(query.q));
}
