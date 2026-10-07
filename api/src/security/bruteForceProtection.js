import crypto from "node:crypto";
import { companyRepository, ipBlockRepository, ipSecurityRepository, loginSecurityRepository, persistCompanyStore } from "../data/store.js";
import { recordActivityLog } from "../activityLog/logger.js";
import { isValidIpOrCidr, normalizeIp } from "./ipBlocking.js";

const DEFAULT_MAX_FAILED_ATTEMPTS = 5;
const DEFAULT_LOCK_MINUTES = 15;

export function getSecurityDefaults() {
  return { accountFailedAttempts: DEFAULT_MAX_FAILED_ATTEMPTS, accountLockMinutes: DEFAULT_LOCK_MINUTES, ipFailedAttempts: DEFAULT_MAX_FAILED_ATTEMPTS, ipBlockMinutes: DEFAULT_LOCK_MINUTES };
}
export function getSecurityConfig(companyId) {
  const company = companyRepository.getCompanyById(companyId); const configured = company?.settings?.securityProtection; const defaults = getSecurityDefaults();
  return { accountFailedAttempts: Math.min(100, Math.max(1, Number(configured?.accountFailedAttempts || defaults.accountFailedAttempts))), accountLockMinutes: Math.min(1440, Math.max(1, Number(configured?.accountLockMinutes || defaults.accountLockMinutes))), ipFailedAttempts: Math.min(100, Math.max(1, Number(configured?.ipFailedAttempts || defaults.ipFailedAttempts))), ipBlockMinutes: Math.min(1440, Math.max(1, Number(configured?.ipBlockMinutes || defaults.ipBlockMinutes))) };
}

export function getSecuritySettings(companyId) {
  const config = getSecurityConfig(companyId);
  return {
    accountMaxFailedAttempts: config.accountFailedAttempts,
    accountLockMinutes: config.accountLockMinutes,
    ipMaxFailedAttempts: config.ipFailedAttempts,
    ipBlockMinutes: config.ipBlockMinutes,
  };
}
export async function updateSecurityConfig(companyId, patch) {
  const current = getSecurityConfig(companyId);
  const next = { accountFailedAttempts: Math.min(100, Math.max(1, Number(patch.accountFailedAttempts ?? current.accountFailedAttempts))), accountLockMinutes: Math.min(1440, Math.max(1, Number(patch.accountLockMinutes ?? current.accountLockMinutes))), ipFailedAttempts: Math.min(100, Math.max(1, Number(patch.ipFailedAttempts ?? current.ipFailedAttempts))), ipBlockMinutes: Math.min(1440, Math.max(1, Number(patch.ipBlockMinutes ?? current.ipBlockMinutes))) };
  await companyRepository.updateCompanyBrandingAndSettings(companyId, { settingsPatch: { securityProtection: next } });
  return next;
}
export function checkLoginLock(companyId, email) {
  const normalized = String(email || "").trim().toLowerCase(); const record = loginSecurityRepository.findByCompany(companyId, (entry) => entry.email === normalized);
  if (!record) return null;
  if (record.locked_until && new Date(record.locked_until) > new Date()) return record;
  if (record.locked_until) { record.locked_until = null; record.failed_attempts = 0; }
  return null;
}

export async function recordIpFailure(companyId, ip, req = null) {
  const normalizedIp = normalizeIp(ip);
  if (!companyId || !isValidIpOrCidr(normalizedIp)) return null;
  const config = getSecurityConfig(companyId);
  let record = ipSecurityRepository.findByCompany(companyId, (entry) => normalizeIp(entry.ip_address) === normalizedIp);
  if (!record) { record = { id: `ip-security-${companyId}-${crypto.createHash("sha256").update(normalizedIp).digest("hex").slice(0, 24)}`, company_id: companyId, ip_address: normalizedIp, failed_attempts: 0, last_failed_at: null }; ipSecurityRepository.createForCompany(companyId, record); }
  record.failed_attempts = Number(record.failed_attempts || 0) + 1; record.last_failed_at = new Date().toISOString();
  let block = null;
  if (record.failed_attempts >= config.ipFailedAttempts) {
    block = ipBlockRepository.findByCompany(companyId, (entry) => entry.is_active !== false && normalizeIp(entry.ip_address) === normalizedIp && entry.block_type === "AUTOMATIC_TEMPORARY" && (!entry.expires_at || new Date(entry.expires_at) > new Date()));
    if (!block) {
      block = { id: crypto.randomUUID(), company_id: companyId, ip_address: normalizedIp, block_type: "AUTOMATIC_TEMPORARY", reason: `Automatic temporary block after ${config.ipFailedAttempts} failed authentication attempts.`, is_active: true, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + config.ipBlockMinutes * 60_000).toISOString(), created_by: "system", unblocked_at: null, unblocked_by: null };
      ipBlockRepository.createForCompany(companyId, block, { prepend: true });
    }
  }
  await persistCompanyStore(companyId);
  if (block && req) await recordActivityLog({ req, companyId, action: "IP_BLOCKED_AUTOMATICALLY", entityType: "IP_BLOCK", entityId: block.id, summary: `IP automatically blocked: ${normalizedIp}`, metadata: { threshold: config.ipFailedAttempts, expiresAt: block.expires_at } });
  return { ip: record, block };
}

export async function recordFailedLogin(companyId, email, ip = "", req = null) {
  const normalizedEmail = String(email || "").trim().toLowerCase(); const config = getSecurityConfig(companyId);
  let record = loginSecurityRepository.findByCompany(companyId, (entry) => entry.email === normalizedEmail);
  if (!record) { record = { id: `login-security-${companyId}-${crypto.createHash("sha256").update(normalizedEmail).digest("hex").slice(0, 24)}`, company_id: companyId, email: normalizedEmail, failed_attempts: 0, last_failed_at: null, locked_until: null }; loginSecurityRepository.createForCompany(companyId, record); }
  record.failed_attempts = Number(record.failed_attempts || 0) + 1; record.last_failed_at = new Date().toISOString();
  if (record.failed_attempts >= config.accountFailedAttempts) record.locked_until = new Date(Date.now() + config.accountLockMinutes * 60_000).toISOString();
  await recordIpFailure(companyId, ip, req);
  return record;
}

export async function clearFailedLogin(companyId, email, ip = "") {
  const normalizedEmail = String(email || "").trim().toLowerCase(); const record = loginSecurityRepository.findByCompany(companyId, (entry) => entry.email === normalizedEmail);
  if (record) { record.failed_attempts = 0; record.locked_until = null; }
  const normalizedIp = normalizeIp(ip); const ipRecord = ipSecurityRepository.findByCompany(companyId, (entry) => entry.ip_address === normalizedIp);
  if (ipRecord) { ipRecord.failed_attempts = 0; ipRecord.last_failed_at = null; }
  await persistCompanyStore(companyId);
}
