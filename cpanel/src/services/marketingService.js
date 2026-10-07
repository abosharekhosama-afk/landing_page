// T-003 — Local marketing service layer.
// Promise-based in-memory store so the UI is backend-integration ready.
// Guarantees: no emails are sent, no OAuth, no API keys, no persistence beyond this module.

import { campaignTemplates, createCampaignDraft } from "../data/marketingCampaigns.js";
import { recipientLabels, recipientSegments, recipientSources } from "../data/marketingRecipients.js";
import { automationSeeds, automationSuggestions } from "../data/marketingAutomations.js";

const delay = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = (value) => JSON.parse(JSON.stringify(value));

export const marketingIntegration = {
  mode: "local-mock",
  sendsEmail: false,
  persistsData: false,
  usesOAuth: false,
};

/** Honest copy for actions that imply real email delivery (Send Now / Schedule / Send Test). */
export const EMAIL_SENDING_UNDER_DEVELOPMENT = "Email sending is still under development.";

const campaigns = [];
let campaignSequence = 0;
const automations = clone(automationSeeds);
let automationSequence = 0;

function upsertCampaign(draft) {
  const record = { ...clone(draft), status: draft.status || "draft" };
  if (record.id) {
    const index = campaigns.findIndex((item) => item.id === record.id);
    if (index >= 0) campaigns[index] = record;
    else campaigns.unshift(record);
    return record;
  }
  campaignSequence += 1;
  const created = { ...record, id: `campaign-${campaignSequence}` };
  campaigns.unshift(created);
  return created;
}

export async function fetchCampaignWorkspace() {
  await delay();
  return { campaigns: clone(campaigns), templates: clone(campaignTemplates) };
}

export async function createCampaign(draft) {
  await delay();
  return clone(upsertCampaign(draft));
}

export async function updateCampaign(id, patch) {
  await delay();
  const index = campaigns.findIndex((item) => item.id === id);
  if (index < 0) return null;
  campaigns[index] = { ...campaigns[index], ...clone(patch) };
  return clone(campaigns[index]);
}

export async function saveCampaignDraft(draft) {
  await delay();
  return clone(upsertCampaign({ ...draft, status: "draft" }));
}

export async function scheduleCampaign(id, _schedule) {
  await delay();
  const index = campaigns.findIndex((item) => item.id === id);
  // Do not fake a scheduled/sent state — delivery is not implemented yet.
  return {
    record: index >= 0 ? clone(campaigns[index]) : null,
    scheduled: false,
    detail: EMAIL_SENDING_UNDER_DEVELOPMENT,
  };
}

export async function sendCampaign(id) {
  await delay();
  const index = campaigns.findIndex((item) => item.id === id);
  // Do not mutate campaign status as if a send occurred.
  return {
    record: index >= 0 ? clone(campaigns[index]) : null,
    sent: false,
    detail: EMAIL_SENDING_UNDER_DEVELOPMENT,
  };
}

export async function sendTestEmail({ email } = {}) {
  await delay();
  return {
    sent: false,
    recipient: email || null,
    detail: EMAIL_SENDING_UNDER_DEVELOPMENT,
  };
}

export async function fetchRecipientOptions() {
  await delay();
  return {
    sources: clone(recipientSources),
    segments: clone(recipientSegments),
    labels: clone(recipientLabels),
  };
}

export async function fetchAutomations() {
  await delay();
  return { automations: clone(automations), suggestions: clone(automationSuggestions) };
}

export async function setAutomationStatus(id, active) {
  await delay();
  const index = automations.findIndex((item) => item.id === id);
  if (index < 0) return null;
  automations[index] = { ...automations[index], status: active ? "active" : "inactive" };
  return clone(automations[index]);
}

export async function createAutomationFromTemplate(template) {
  await delay();
  automationSequence += 1;
  const created = {
    id: `automation-${automationSequence}`,
    nameEn: template.en,
    nameAr: template.ar,
    triggerEn: template.en,
    triggerAr: template.ar,
    status: "inactive",
    steps: [
      { kind: "trigger", icon: "zap", titleEn: `Trigger: ${template.en}`, titleAr: `المشغّل: ${template.ar}`, descEn: template.textEn, descAr: template.textAr },
      { kind: "action", icon: "send", titleEn: "Action: send email", titleAr: "الإجراء: إرسال بريد", descEn: "Prepared for integration — nothing is sent yet.", descAr: "مُجهّز للربط — لا يتم الإرسال بعد." },
    ],
  };
  automations.unshift(created);
  return clone(created);
}

export { createCampaignDraft };