const SENSITIVE_KEYS = new Set([
  "password",
  "password_hash",
  "token",
  "access_token",
  "refresh_token",
  "secret",
  "api_key",
  "apikey",
  "card_number",
  "cvv",
  "cvc",
  "card_cvv",
  "card_cvc",
  "expiry",
  "card_expiry",
  "pin",
]);

export const ACTIVITY_LOG_PAGE_SIZE = 50;

export function emptyActivityFilters() {
  return {
    action: "",
    entityType: "",
    actorEmail: "",
    dateFrom: "",
    dateTo: "",
  };
}

export function activityLogQueryFromFilters(filters, { page = 1, limit = ACTIVITY_LOG_PAGE_SIZE } = {}) {
  return {
    action: String(filters.action || "").trim(),
    entityType: String(filters.entityType || "").trim(),
    actorEmail: String(filters.actorEmail || "").trim(),
    dateFrom: filters.dateFrom ? `${filters.dateFrom}T00:00:00.000` : "",
    dateTo: filters.dateTo ? `${filters.dateTo}T23:59:59.999` : "",
    page,
    limit,
  };
}

function asText(value) {
  return value == null ? "" : String(value);
}

export function sanitizeActivityPayload(value) {
  if (value == null) return null;
  if (Array.isArray(value)) return value.map(sanitizeActivityPayload);
  if (typeof value !== "object") return value;
  const next = {};
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) continue;
    next[key] = sanitizeActivityPayload(item);
  }
  return next;
}

export function formatActivityPayload(value) {
  const sanitized = sanitizeActivityPayload(value);
  if (sanitized == null) return "";
  try {
    return JSON.stringify(sanitized, null, 2);
  } catch {
    return "";
  }
}

export function normalizeActivityLog(row) {
  if (!row || typeof row !== "object") {
    return {
      id: "",
      actor_user_id: "",
      actor_email: "",
      actor_name: "",
      actor_role: "",
      action: "",
      entity_type: "",
      entity_id: "",
      entity_label: "",
      summary: "",
      before_data: null,
      after_data: null,
      metadata: null,
      ip_address: "",
      user_agent: "",
      created_at: "",
    };
  }
  return {
    id: asText(row.id),
    actor_user_id: asText(row.actor_user_id || row.actor_id),
    actor_email: asText(row.actor_email),
    actor_name: asText(row.actor_name),
    actor_role: asText(row.actor_role),
    action: asText(row.action),
    entity_type: asText(row.entity_type),
    entity_id: asText(row.entity_id),
    entity_label: asText(row.entity_label),
    summary: asText(row.summary),
    before_data: sanitizeActivityPayload(row.before_data ?? row.beforeData),
    after_data: sanitizeActivityPayload(row.after_data ?? row.afterData),
    metadata: sanitizeActivityPayload(row.metadata),
    ip_address: asText(row.ip_address || row.ipAddress),
    user_agent: asText(row.user_agent || row.userAgent),
    created_at: (() => {
      const raw = row.created_at || row.createdAt || row.timestamp;
      if (raw instanceof Date) return raw.toISOString();
      return asText(raw);
    })(),
  };
}

export function normalizeActivityLogList(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const logs = Array.isArray(source.logs) ? source.logs.map(normalizeActivityLog) : [];
  const total = Number(source.total);
  const page = Number(source.page);
  const limit = Number(source.limit);
  const totalPages = Number(source.totalPages);
  return {
    logs,
    total: Number.isFinite(total) ? total : logs.length,
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    limit: Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : ACTIVITY_LOG_PAGE_SIZE,
    totalPages: Number.isFinite(totalPages) && totalPages > 0 ? Math.floor(totalPages) : 1,
  };
}

export function activityActorLabel(log) {
  return asText(log?.actor_name) || asText(log?.actor_email) || asText(log?.actor_user_id) || "—";
}

export function activityEntityLabel(log) {
  return asText(log?.entity_label) || asText(log?.entity_id) || "—";
}

export function formatActivityWhen(value, language = "en") {
  if (value == null || value === "") return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(language === "ar" ? "ar" : "en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}
