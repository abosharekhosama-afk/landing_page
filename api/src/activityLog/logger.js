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

function removeSensitiveKeys(data) {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(removeSensitiveKeys);
  const sanitized = {};
  for (const key of Object.keys(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) continue;
    const value = data[key];
    if (value && typeof value === "object") {
      sanitized[key] = removeSensitiveKeys(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function sanitizeLogData(data) {
  if (data == null) return null;
  try {
    return removeSensitiveKeys(JSON.parse(JSON.stringify(data)));
  } catch {
    return null;
  }
}

function getClientIp(req) {
  return req?.ip
    || req?.headers?.["x-forwarded-for"]
    || req?.headers?.["x-real-ip"]
    || req?.connection?.remoteAddress
    || "";
}

function getUserAgent(req) {
  return req?.headers?.["user-agent"] || "";
}

export async function recordActivityLog({
  req = null,
  companyId = "",
  action = "",
  entityType = "",
  entityId = "",
  entityLabel = "",
  summary = "",
  beforeData = null,
  afterData = null,
  metadata = null,
} = {}) {
  try {
    const { activityLogRepository, persistActivityLogEntry } = await import("../data/store.js");
    const crypto = await import("node:crypto");

    const id = crypto.default?.randomUUID?.() || crypto.randomUUID();
    const userId = req?.user?.id || "";
    const email = req?.user?.email || "";
    const name = req?.user?.name || "";
    const role = req?.user?.role || "";

    const logEntry = {
      id,
      company_id: companyId,
      actor_user_id: userId,
      actor_email: email,
      actor_name: name,
      actor_role: role,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: entityLabel,
      summary,
      before_data: sanitizeLogData(beforeData),
      after_data: sanitizeLogData(afterData),
      metadata: sanitizeLogData(metadata),
      ip_address: req ? getClientIp(req).slice(0, 80) : "",
      user_agent: req ? getUserAgent(req).slice(0, 500) : "",
      created_at: new Date().toISOString(),
    };

    try {
      activityLogRepository.createForCompany(companyId, logEntry);
      await persistActivityLogEntry(companyId, logEntry);
    } catch (error) {
      console.error("Activity log write failed (non-fatal):", error.message);
    }
  } catch (error) {
    console.error("Activity log setup failed (non-fatal):", error.message);
  }
}
