import { Router } from "express";
import crypto from "node:crypto";
import { requireAuth, requireAnyPermission } from "../middleware/auth.js";
import { smsLogRepository, smsAutomationRepository, persistCompanyStore } from "../data/store.js";
import { sendSms, getSmsBalance, getSmsRechargeHistory } from "../sms/smsService.js";
import { SMS_TEMPLATE_VARIABLES, validateTemplate } from "../sms/smsTemplateService.js";
import { validateRecipient, validateMessage, validateSender } from "../sms/smsValidation.js";
import { recordActivityLog } from "../activityLog/logger.js";

const triggers = Object.freeze(Object.keys(SMS_TEMPLATE_VARIABLES));
const r = Router();
r.use(requireAuth);

r.get("/logs", requireAnyPermission("sms.logs.view", "sms.manage"), (req, res) => {
  let items = smsLogRepository.getByCompany(req.companyId);
  const q = String(req.query.q || "").trim().toLowerCase();
  const recipient = String(req.query.recipient || "").trim().toLowerCase();
  const status = String(req.query.status || "").trim().toUpperCase();
  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;
  if (status) items = items.filter((item) => item.status === status);
  if (recipient) items = items.filter((item) => String(item.recipient || "").toLowerCase().includes(recipient));
  if (q) items = items.filter((item) => [item.recipient, item.sender, item.provider_reference, item.message].join(" ").toLowerCase().includes(q));
  if (from && !Number.isNaN(from.getTime())) items = items.filter((item) => new Date(item.created_at) >= from);
  if (to && !Number.isNaN(to.getTime())) {
    const endOfDay = new Date(to);
    endOfDay.setHours(23, 59, 59, 999);
    items = items.filter((item) => new Date(item.created_at) <= endOfDay);
  }
  items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  return res.json({ items: items.slice(offset, offset + limit), total: items.length, limit, offset });
});

r.get("/recharge-history", requireAnyPermission("sms.view", "sms.manage"), async (req, res, next) => {
  try { return res.json(await getSmsRechargeHistory()); } catch (error) { return next(error); }
});

r.get("/balance", requireAnyPermission("sms.view", "sms.manage"), async (req, res, next) => {
  try { return res.json(await getSmsBalance()); } catch (error) { return next(error); }
});

r.post("/send", requireAnyPermission("sms.send", "sms.manage"), async (req, res, next) => {
  try {
    const recipient = validateRecipient(req.body?.recipient);
    const message = validateMessage(req.body?.message);
    const sender = validateSender(req.body?.sender);
    const log = await sendSms({ companyId: req.companyId, recipient, sender, message, req });
    await recordActivityLog({
      req,
      companyId: req.companyId,
      action: log.status === "SENT" ? "SMS_SENT_MANUAL" : "SMS_FAILED_MANUAL",
      entityType: "SMS",
      entityId: log.id,
      summary: log.status === "SENT" ? "Manual SMS sent" : "Manual SMS failed",
    });
    return res.status(201).json(log);
  } catch (error) { return next(error); }
});

r.get("/automations", requireAnyPermission("sms.view", "sms.manage"), (req, res) => res.json({
  items: smsAutomationRepository.getByCompany(req.companyId),
  triggers,
  variables: SMS_TEMPLATE_VARIABLES,
}));

r.post("/automations", requireAnyPermission("sms.manage"), async (req, res, next) => {
  try {
    const trigger = String(req.body?.trigger || "").trim();
    if (!triggers.includes(trigger)) return res.status(400).json({ message: "Invalid SMS automation trigger." });
    if (smsAutomationRepository.findByCompany(req.companyId, (item) => item.trigger === trigger)) {
      return res.status(409).json({ message: "An automation for this trigger already exists." });
    }
    const template = String(req.body?.message_template || "");
    const validation = validateTemplate(trigger, template);
    if (!validation.valid) return res.status(400).json({ message: validation.error || "Unsupported template variables.", unsupported: validation.unsupported, malformed: validation.malformed });
    const sender = validateSender(req.body?.sender || "NOTIFY");
    const now = new Date().toISOString();
    const item = { id: crypto.randomUUID(), company_id: req.companyId, trigger, is_enabled: req.body?.is_enabled !== false, message_template: template, sender, recipient: String(req.body?.recipient || "").trim(), created_at: now, updated_at: now };
    smsAutomationRepository.createForCompany(req.companyId, item);
    await persistCompanyStore(req.companyId);
    await recordActivityLog({ req, companyId: req.companyId, action: "SMS_AUTOMATION_CREATED", entityType: "SMS_AUTOMATION", entityId: item.id, summary: `SMS automation ${trigger} created`, afterData: item });
    return res.status(201).json(item);
  } catch (error) { return next(error); }
});

r.patch("/automations/:id", requireAnyPermission("sms.manage"), async (req, res, next) => {
  try {
    const current = smsAutomationRepository.findByCompany(req.companyId, req.params.id);
    if (!current) return res.status(404).json({ message: "Not found." });
    const patch = { ...(req.body || {}) };
    delete patch.id;
    delete patch.company_id;
    delete patch.created_at;
    delete patch.updated_at;
    const nextItem = { ...current, ...patch };
    if (!triggers.includes(String(nextItem.trigger || ""))) return res.status(400).json({ message: "Invalid SMS automation trigger." });
    const duplicate = smsAutomationRepository.findByCompany(req.companyId, (item) => item.trigger === nextItem.trigger && item.id !== current.id);
    if (duplicate) return res.status(409).json({ message: "An automation for this trigger already exists." });
    const validation = validateTemplate(nextItem.trigger, nextItem.message_template);
    if (!validation.valid) return res.status(400).json({ message: validation.error || "Unsupported template variables.", unsupported: validation.unsupported, malformed: validation.malformed });
    if (nextItem.sender != null) nextItem.sender = validateSender(nextItem.sender || "NOTIFY");
    const item = smsAutomationRepository.updateForCompany(req.companyId, current.id, { ...nextItem, updated_at: new Date().toISOString() });
    await persistCompanyStore(req.companyId);
    await recordActivityLog({ req, companyId: req.companyId, action: "SMS_AUTOMATION_UPDATED", entityType: "SMS_AUTOMATION", entityId: item.id, summary: `SMS automation ${item.trigger} updated`, beforeData: current, afterData: item });
    return res.json(item);
  } catch (error) { return next(error); }
});

r.delete("/automations/:id", requireAnyPermission("sms.manage"), async (req, res, next) => {
  try {
    const current = smsAutomationRepository.findByCompany(req.companyId, req.params.id);
    if (!current) return res.status(404).json({ message: "Not found." });
    smsAutomationRepository.deleteForCompany(req.companyId, current.id);
    await persistCompanyStore(req.companyId, { pruneMissing: true });
    await recordActivityLog({ req, companyId: req.companyId, action: "SMS_AUTOMATION_DELETED", entityType: "SMS_AUTOMATION", entityId: current.id, summary: `SMS automation ${current.trigger} deleted`, beforeData: current });
    return res.status(204).end();
  } catch (error) { return next(error); }
});

export default r;
