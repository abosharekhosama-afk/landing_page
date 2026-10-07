import crypto from "node:crypto";
import {
  smsAutomationRepository,
  smsLogRepository,
  userRepository,
} from "../data/store.js";
import { validateTemplate, renderTemplate } from "./smsTemplateService.js";
import { sendSms } from "./smsService.js";

const inFlightEvents = new Map();

function eventKey({ companyId, trigger, eventId }) {
  return `${companyId}:${trigger}:${eventId}`;
}

function existingEventLog(companyId, trigger, eventId) {
  const key = eventKey({ companyId, trigger, eventId });
  return smsLogRepository.findByCompany(
    companyId,
    (log) => log.related_entity_type === "SMS_AUTOMATION_EVENT"
      && log.related_entity_id === key
      && ["SENT", "DELIVERED"].includes(log.status),
  );
}

function recipientListForAutomation({ companyId, trigger, automation, context }) {
  if (automation.recipient) return [automation.recipient];
  if (trigger === "NEW_ORDER_TO_MANAGER") {
    return userRepository
      .getByCompany(companyId)
      .filter((user) => ["manager", "company_admin", "admin"].includes(user.role) || ["manager", "company_admin", "admin"].includes(user.globalRole) && user.isActive !== false)
      .map((user) => user.phone)
      .filter(Boolean);
  }
  return [context.recipient || context.customer_phone].filter(Boolean);
}

export async function triggerSmsAutomation({ companyId, trigger, context = {}, req = null, eventId = null }) {
  const automation = smsAutomationRepository.findByCompany(
    companyId,
    (entry) => entry.trigger === trigger && entry.is_enabled !== false,
  );
  if (!automation) return { sent: false, reason: "DISABLED_OR_MISSING" };

  const validation = validateTemplate(trigger, automation.message_template);
  if (!validation.valid) {
    return {
      sent: false,
      reason: "INVALID_TEMPLATE",
      unsupported: validation.unsupported,
      malformed: validation.malformed,
    };
  }

  const recipients = [...new Set(
    recipientListForAutomation({ companyId, trigger, automation, context })
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  )];
  if (!recipients.length) return { sent: false, reason: "NO_RECIPIENT" };

  const normalizedEventId = eventId == null ? null : String(eventId).trim();
  if (normalizedEventId) {
    const key = eventKey({ companyId, trigger, eventId: normalizedEventId });
    const existing = existingEventLog(companyId, trigger, normalizedEventId);
    if (existing) return { sent: false, reason: "DUPLICATE_EVENT", log: existing };
    if (inFlightEvents.has(key)) return inFlightEvents.get(key);
  }

  const execute = (async () => {
    const logs = [];
    for (const recipient of recipients) {
      // The lifecycle event key is persisted on every SMS log. This guard
      // protects retries/replayed events even after the process-local
      // in-flight map has been cleared.
      const recipientExisting = normalizedEventId
        ? smsLogRepository.findByCompany(
            companyId,
            (entry) =>
              entry.related_entity_type === "SMS_AUTOMATION_EVENT"
              && entry.related_entity_id === eventKey({ companyId, trigger, eventId: normalizedEventId })
              && ["SENT", "DELIVERED"].includes(entry.status)
              && String(entry.recipient || "").trim() === recipient,
          )
        : null;
      if (recipientExisting) {
        logs.push(recipientExisting);
        continue;
      }

      const log = await sendSms({
        companyId,
        recipient,
        sender: automation.sender,
        message: renderTemplate(automation.message_template, context),
        relatedEntityType: normalizedEventId ? "SMS_AUTOMATION_EVENT" : "SMS_AUTOMATION",
        relatedEntityId: normalizedEventId
          ? eventKey({ companyId, trigger, eventId: normalizedEventId })
          : `automation:${automation.id}:${crypto.randomUUID()}`,
        req,
      });
      logs.push(log);
    }
    return {
      sent: logs.some((log) => log.status === "SENT"),
      logs,
      log: logs[0] || null,
    };
  })();

  if (normalizedEventId) {
    const key = eventKey({ companyId, trigger, eventId: normalizedEventId });
    inFlightEvents.set(key, execute);
    try {
      return await execute;
    } finally {
      inFlightEvents.delete(key);
    }
  }

  return execute;
}
