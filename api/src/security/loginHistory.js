import crypto from "node:crypto";
import { loginHistoryRepository, persistCompanyStore } from "../data/store.js";

function parseClient(userAgent) {
  const ua = String(userAgent || "");
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : /MSIE|Trident/.test(ua) ? "Internet Explorer" : "Unknown";
  const device = /Mobile|Android|iPhone|iPad/i.test(ua) ? "Mobile" : /Windows|Macintosh|Linux/i.test(ua) ? "Desktop" : "Unknown";
  return { browser, device };
}

export async function recordLoginAttempt({ companyId, user = null, email = "", status, req = null, authenticationMethod = "PASSWORD", failureReason = "", attemptId = null }) {
  const userAgent = req?.headers?.["user-agent"] || "";
  const client = parseClient(userAgent);
  const normalizedEmail = String(email).trim().toLowerCase();
  const safeIdentifier = user ? normalizedEmail : (normalizedEmail ? `unknown:${crypto.createHash("sha256").update(normalizedEmail).digest("hex").slice(0, 24)}` : "unknown");
  const entry = { id: crypto.randomUUID(), attempt_id: attemptId || crypto.randomUUID(), company_id: companyId || "", user_id: user?.id || null, email: safeIdentifier, status, ip_address: req?.clientIp || req?.ip || "", user_agent: userAgent, browser: client.browser, device: client.device, authentication_method: authenticationMethod, failure_reason: String(failureReason || "").slice(0, 200), created_at: new Date().toISOString() };
  loginHistoryRepository.createForCompany(companyId, entry, { prepend: true });
  await persistCompanyStore(companyId);
  return entry;
}

export async function listLoginHistory(companyId) {
  return loginHistoryRepository.getByCompany(companyId);
}
