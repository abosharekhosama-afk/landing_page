/**
 * Purchase funnel recording.
 *
 * A purchase event is written only after the order API has committed a real
 * order, and it carries the authoritative order id so duplicate writes for the
 * same order are rejected. The event is company-scoped like every other visitor
 * event and stores no customer data.
 */

import {
  companyRepository,
  getRecordCompanyId,
  persistAnalyticsStore,
  visitorEventRepository,
  visitorEvents,
} from "../data/store.js";
import { websiteConnectionDefaults, websiteConnectionSettings } from "../siteEditor/websiteConnection.js";
import { createVisitorEvent, purchaseEventSessionKey, trimVisitorEvents } from "./visitorAnalytics.js";

function storefrontSiteId(company) {
  if (!company) return "";
  const connection = websiteConnectionSettings(company);
  if (connection && connection.siteId) return String(connection.siteId);
  return websiteConnectionDefaults(company).siteId || "";
}

export async function recordPurchaseEvent(companyId, orderId) {
  try {
    const normalizedCompanyId = String(companyId || "").trim();
    const normalizedOrderId = String(orderId || "").trim();
    if (!normalizedCompanyId || !normalizedOrderId) {
      return { recorded: false, reason: "missing_reference" };
    }

    const sessionKey = purchaseEventSessionKey(normalizedOrderId);
    const existing = visitorEventRepository.getByCompany(normalizedCompanyId);
    const duplicate = existing.some(
      (event) => event.eventType === "purchase" && event.sessionKey === sessionKey,
    );
    if (duplicate) return { recorded: false, reason: "duplicate" };

    const company = companyRepository.getCompanyById(normalizedCompanyId);
    visitorEventRepository.createForCompany(normalizedCompanyId, createVisitorEvent({
      companyId: normalizedCompanyId,
      siteId: storefrontSiteId(company),
      sessionKey,
      eventType: "purchase",
      path: "",
      productId: "",
    }));

    const nextEvents = trimVisitorEvents(visitorEventRepository.getByCompany(normalizedCompanyId), normalizedCompanyId);
    const otherTenantEvents = visitorEvents.filter((event) => getRecordCompanyId(event) !== normalizedCompanyId);
    visitorEvents.splice(0, visitorEvents.length, ...otherTenantEvents, ...nextEvents);

    await persistAnalyticsStore(normalizedCompanyId, { pruneVisitorEvents: true });
    return { recorded: true };
  } catch (error) {
    // Funnel reporting must never break order creation.
    console.warn("Purchase funnel event was not recorded:", error.message);
    return { recorded: false, reason: "error" };
  }
}
