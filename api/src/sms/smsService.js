import { getSmsProviderResolver } from "./providers/providerResolver.js";
import { getSmsProvider } from "./providers/providerRegistry.js";
import { smsLogRepository, persistCompanyStore } from "../data/store.js";
import { recordActivityLog } from "../activityLog/logger.js";
import { normalizeSendResult, normalizeBalanceResult, normalizeRechargeHistoryResult, normalizeDeliveryStatusResult } from "./providers/SmsProvider.js";
import { validateSmsInput, validateRecipient, validateMessage, validateSender } from "./smsValidation.js";
import { sanitizeLogValue, sanitizeError, buildSmsLog } from "./smsSanitizer.js";

/**
 * Prefer explicit SMS_PROVIDER / registry (tests + env overrides), then DB resolver.
 */
async function resolveSendableProvider(companyId) {
  const configured = String(process.env.SMS_PROVIDER || "").trim();
  if (configured) {
    try {
      return { provider: getSmsProvider(), providerName: configured.toLowerCase() };
    } catch (error) {
      if (process.env.NODE_ENV === "test") throw error;
    }
  }
  const provider = await getSmsProviderResolver().resolve(companyId);
  const providerName = String(process.env.SMS_PROVIDER || provider?.getInfo?.()?.type || provider?.getInfo?.()?.name || "dynamic").toLowerCase();
  return { provider, providerName };
}

/**
 * sendSms — application-level SMS sending facade.
 * Uses SmartProviderResolver to select provider per company from DB.
 */
export async function sendSms({ companyId, recipient, sender = "", message, relatedEntityType = "", relatedEntityId = "", req = null }) {
  const { to, text, senderId } = validateSmsInput({ to: recipient, message, sender });
  const { provider, providerName } = await resolveSendableProvider(companyId);

  const log = buildSmsLog({ companyId, to, text, senderId, providerName, relatedEntityType, relatedEntityId });
  smsLogRepository.createForCompany(companyId, log, { prepend: true });

  try {
    if (!provider) throw new Error("SMS provider is not configured.");
    const result = normalizeSendResult(await provider.send({ to, message: text, sender: senderId }));
    log.status = result.success ? "SENT" : "FAILED";
    log.provider_reference = result.providerReference || null;
    log.cost = result.cost;
    log.sent_at = result.success ? new Date().toISOString() : null;
    log.failed_at = result.success ? null : new Date().toISOString();
    log.error_message = result.success ? null : sanitizeError(result.error || "Send failed.");
    await recordActivityLog({ req, companyId, action: result.success ? "SMS_SENT" : "SMS_FAILED", entityType: "SMS", entityId: log.id, summary: result.success ? "SMS sent" : "SMS failed", metadata: result.success ? {} : { error: log.error_message } });
  } catch (error) {
    log.status = "FAILED";
    log.failed_at = new Date().toISOString();
    log.error_message = sanitizeError(error);
    await recordActivityLog({ req, companyId, action: "SMS_FAILED", entityType: "SMS", entityId: log.id, summary: "SMS failed", metadata: { error: log.error_message } });
  }

  await persistCompanyStore(companyId);
  return log;
}

export async function getSmsBalance(companyId) {
  const resolver = getSmsProviderResolver();
  const provider = await resolver.resolve(companyId);
  if (!provider) return normalizeBalanceResult({ supported: false });
  if (!provider.capabilities?.balance) return normalizeBalanceResult({ supported: false });
  return normalizeBalanceResult(await provider.getBalance());
}

export async function getSmsRechargeHistory(companyId) {
  const resolver = getSmsProviderResolver();
  const provider = await resolver.resolve(companyId);
  if (!provider) return normalizeRechargeHistoryResult({ supported: false });
  return normalizeRechargeHistoryResult(await provider.getRechargeHistory());
}

export async function getSmsDeliveryStatus(companyId, providerReference) {
  if (typeof providerReference !== "string" || !providerReference) return normalizeDeliveryStatusResult({ supported: false });
  const resolver = getSmsProviderResolver();
  const provider = await resolver.resolve(companyId);
  if (!provider) return normalizeDeliveryStatusResult({ supported: false });
  if (!provider.capabilities?.deliveryStatus) return normalizeDeliveryStatusResult({ supported: false });
  return normalizeDeliveryStatusResult(await provider.getDeliveryStatus(providerReference));
}

export { validateRecipient, validateMessage, validateSender };
