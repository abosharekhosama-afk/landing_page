/**
 * Visitor session analytics (tenant/site scoped).
 *
 * Retention: raw visitor events are capped at MAX_VISITOR_EVENTS_PER_COMPANY per tenant.
 * Sessions persist for live counting and aggregation; stale sessions fall outside the live window.
 * Stored fields exclude PII — sessionKey/visitorKey are opaque client-generated identifiers only.
 */

import crypto from "node:crypto";
import { getRecordCompanyId } from "../data/recordTenancy.js";
import { LIVE_VISITOR_WINDOW_MS } from "./dashboardInsights.js";

export const MAX_VISITOR_EVENTS_PER_COMPANY = 10000;

/**
 * Storefront funnel event types. pageview/product_view/heartbeat are the
 * existing engagement events; the funnel events below describe cart, checkout
 * and purchase steps recorded from the storefront and the order API.
 */
export const FUNNEL_EVENT_TYPES = Object.freeze([
  "add_to_cart",
  "remove_from_cart",
  "initiate_checkout",
  "purchase",
]);

export const VISITOR_EVENT_TYPES = Object.freeze([
  "pageview",
  "product_view",
  "heartbeat",
  ...FUNNEL_EVENT_TYPES,
]);

/** Purchase events are derived from a real order id, never from client input. */
export function purchaseEventSessionKey(orderId) {
  return `order:${String(orderId || "").trim()}`;
}

/**
 * Campaign attribution fields captured from standard URL parameters and the
 * document referrer. Values are opaque campaign labels only — no PII is stored.
 */
export const ATTRIBUTION_FIELDS = Object.freeze([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "referrer",
]);

/** Fields that identify one campaign/post row in reporting. */
export const CAMPAIGN_IDENTITY_FIELDS = Object.freeze([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
]);

const ATTRIBUTION_VALUE_LIMIT = 200;
const ATTRIBUTION_REFERRER_LIMIT = 300;

/** Referrers keep hostname only: a full referrer URL may carry query PII. */
export function referrerHostname(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return String(new URL(raw).hostname || "").trim().toLowerCase().slice(0, ATTRIBUTION_REFERRER_LIMIT);
  } catch {
    return raw.split("/").slice(0, 3).join("/").toLowerCase().slice(0, ATTRIBUTION_REFERRER_LIMIT);
  }
}

/** Whitelisted, length-capped copy of client attribution input. */
export function normalizeAttribution(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const normalized = {};
  for (const field of ATTRIBUTION_FIELDS) {
    const raw = input[field];
    if (raw === undefined || raw === null) continue;
    const limit = field === "referrer" ? ATTRIBUTION_REFERRER_LIMIT : ATTRIBUTION_VALUE_LIMIT;
    const value = field === "referrer"
      ? referrerHostname(raw)
      : String(raw).trim().slice(0, limit);
    if (value) normalized[field] = value;
  }
  return normalized;
}

/**
 * First-touch wins: attribution is captured when the visitor enters the
 * storefront, so a later navigation without UTM never erases the campaign.
 */
export function mergeAttribution(existing, incoming) {
  const merged = { ...(existing || {}) };
  for (const [field, value] of Object.entries(incoming || {})) {
    if (!ATTRIBUTION_FIELDS.includes(field)) continue;
    if (!merged[field]) merged[field] = value;
  }
  return normalizeAttribution(merged);
}

/** Stable grouping key for one campaign/post (referrer is not part of it). */
export function campaignKey(attribution) {
  const normalized = normalizeAttribution(attribution);
  return JSON.stringify(CAMPAIGN_IDENTITY_FIELDS.map((field) => normalized[field] || ""));
}

export function createVisitorSessionKey() {
  return crypto.randomUUID();
}

export function createVisitorEvent({
  companyId,
  siteId = "",
  sessionKey = "",
  eventType = "pageview",
  path = "",
  productId = "",
}) {
  const allowed = new Set(VISITOR_EVENT_TYPES);
  const type = allowed.has(eventType) ? eventType : "pageview";
  return {
    id: crypto.randomUUID(),
    company_id: companyId,
    siteId: String(siteId || ""),
    sessionKey: String(sessionKey || ""),
    eventType: type,
    path: String(path || ""),
    productId: String(productId || ""),
    createdAt: new Date().toISOString(),
  };
}

export function trimVisitorEvents(events = [], companyId, max = MAX_VISITOR_EVENTS_PER_COMPANY) {
  const companyEvents = events.filter((event) => getRecordCompanyId(event) === companyId);
  if (companyEvents.length <= max) return events;
  const removeIds = new Set(
    companyEvents
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, companyEvents.length - max)
      .map((event) => event.id),
  );
  return events.filter((event) => !removeIds.has(event.id));
}

export function upsertVisitorSession(sessions = [], {
  companyId,
  siteId = "",
  sessionKey = "",
  visitorKey = "",
  path = "",
  eventType = "pageview",
  attribution = {},
  now = new Date(),
}) {
  const timestamp = now.toISOString();
  const incomingAttribution = normalizeAttribution(attribution);
  const existingIndex = sessions.findIndex(
    (session) => getRecordCompanyId(session) === companyId
      && session.siteId === siteId
      && session.sessionKey === sessionKey,
  );
  const isReturning = Boolean(visitorKey) && sessions.some(
    (session) => getRecordCompanyId(session) === companyId
      && session.visitorKey === visitorKey
      && session.sessionKey !== sessionKey,
  );

  if (existingIndex >= 0) {
    const current = { ...sessions[existingIndex] };
    current.lastSeenAt = timestamp;
    current.pageViews += eventType === "pageview" ? 1 : 0;
    current.productViews += eventType === "product_view" ? 1 : 0;
    current.lastPath = path || current.lastPath;
    if (visitorKey && !current.visitorKey) current.visitorKey = visitorKey;
    current.attribution = mergeAttribution(current.attribution, incomingAttribution);
    const next = [...sessions];
    next[existingIndex] = current;
    return next;
  }

  return [
    ...sessions,
    {
      id: crypto.randomUUID(),
      company_id: companyId,
      siteId,
      sessionKey,
      visitorKey: String(visitorKey || ""),
      firstSeenAt: timestamp,
      lastSeenAt: timestamp,
      pageViews: eventType === "pageview" ? 1 : 0,
      productViews: eventType === "product_view" ? 1 : 0,
      isReturning,
      lastPath: String(path || ""),
      attribution: mergeAttribution({}, incomingAttribution),
    },
  ];
}

export function countLiveVisitors(sessions = [], {
  companyId,
  siteId = "",
  windowMs = LIVE_VISITOR_WINDOW_MS,
  now = new Date(),
} = {}) {
  const cutoff = now.getTime() - windowMs;
  return sessions.filter((session) => {
    if (getRecordCompanyId(session) !== companyId) return false;
    if (siteId && session.siteId !== siteId) return false;
    const lastSeen = new Date(session.lastSeenAt || 0).getTime();
    return Number.isFinite(lastSeen) && lastSeen >= cutoff;
  }).length;
}

/**
 * Campaign performance over the same rolling 7-day window as behavior and
 * funnel. Visits/funnel steps come from stored sessions and events joined by
 * sessionKey; orders, revenue and returns come from backend-confirmed order
 * records that stored attribution at checkout. No value is estimated: a metric
 * that cannot be derived from the stored records stays null.
 */
const NON_PURCHASE_ORDER_STATUSES = new Set(["cancelled", "canceled", "refunded", "returned", "void", "voided"]);
const RETURNED_ORDER_STATUSES = new Set(["refunded", "returned"]);
const MAX_CAMPAIGN_ROWS = 100;
const NO_CAMPAIGN_LABEL = "";

/**
 * Event types that increment a funnel counter on their campaign row. Purchase
 * events are excluded on purpose: they carry an `order:<id>` session key with
 * no storefront session, and purchases are counted from order records only.
 */
const EVENT_ROW_COUNTS = Object.freeze(new Set([
  "product_view",
  "add_to_cart",
  "remove_from_cart",
  "initiate_checkout",
]));

const EVENT_ROW_FIELD = Object.freeze({
  product_view: "productViews",
  add_to_cart: "addToCart",
  remove_from_cart: "removeFromCart",
  initiate_checkout: "checkoutStarted",
});

function orderCustomerIdentity(order) {
  const userId = String(order?.customerUserId || "").trim();
  if (userId) return `id:${userId}`;
  const phone = String(order?.customer?.phone || "").replace(/\D+/g, "");
  return phone ? `phone:${phone}` : "";
}

export function buildCampaignSummary(scopedSessions = [], scopedEvents = [], scopedOrders = [], now = new Date()) {
  const windowStart = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)).getTime();
  const rowsByKey = new Map();
  const customerKeys = new Map();
  const customersComplete = new Map();

  function ensureRow(attribution) {
    const normalized = normalizeAttribution(attribution);
    const key = campaignKey(normalized);
    let row = rowsByKey.get(key);
    if (!row) {
      row = {
        key,
        campaign: normalized.utm_campaign || NO_CAMPAIGN_LABEL,
        source: normalized.utm_source || NO_CAMPAIGN_LABEL,
        medium: normalized.utm_medium || NO_CAMPAIGN_LABEL,
        content: normalized.utm_content || NO_CAMPAIGN_LABEL,
        term: normalized.utm_term || NO_CAMPAIGN_LABEL,
        sessions: 0,
        productViews: 0,
        addToCart: 0,
        removeFromCart: 0,
        checkoutStarted: 0,
        purchases: 0,
        orders: 0,
        revenue: 0,
        returnedOrders: 0,
        returnedValue: 0,
        uniquePurchasingCustomers: null,
        conversionRate: null,
      };
      rowsByKey.set(key, row);
      customerKeys.set(key, new Set());
      customersComplete.set(key, true);
    }
    return row;
  }

  const sessionAttribution = new Map();
  for (const session of scopedSessions) {
    const attribution = normalizeAttribution(session.attribution);
    sessionAttribution.set(`${session.siteId}\u0000${session.sessionKey}`, attribution);
  }

  for (const session of scopedSessions) {
    const seen = safeTimestamp(session.firstSeenAt);
    if (seen === null || seen < windowStart) continue;
    ensureRow(sessionAttribution.get(`${session.siteId}\u0000${session.sessionKey}`)).sessions += 1;
  }

  for (const event of scopedEvents) {
    const created = safeTimestamp(event.createdAt);
    if (created === null || created < windowStart) continue;
    const countsTowardFunnel = EVENT_ROW_COUNTS.has(event.eventType);
    if (!countsTowardFunnel) continue;
    const row = ensureRow(sessionAttribution.get(`${event.siteId}\u0000${event.sessionKey}`) || {});
    row[EVENT_ROW_FIELD[event.eventType]] += 1;
  }

  for (const order of scopedOrders) {
    const created = safeTimestamp(order.createdAt);
    if (created === null || created < windowStart) continue;
    const row = ensureRow(order.attribution);
    const key = row.key;
    const status = String(order.status || "").trim().toLowerCase();
    const total = Number(order.total || 0);

    row.orders += 1;
    if (!NON_PURCHASE_ORDER_STATUSES.has(status)) {
      row.purchases += 1;
      row.revenue += total;
      const identity = orderCustomerIdentity(order);
      if (identity) customerKeys.get(key).add(identity);
      else customersComplete.set(key, false);
    }
    if (RETURNED_ORDER_STATUSES.has(status)) {
      row.returnedOrders += 1;
      row.returnedValue += total;
    }
  }

  const rows = [...rowsByKey.values()].map((row) => {
    const identityCount = customerKeys.get(row.key).size;
    const reliable = customersComplete.get(row.key) === true;
    return {
      ...row,
      revenue: Math.round(row.revenue * 100) / 100,
      returnedValue: Math.round(row.returnedValue * 100) / 100,
      // Null when a purchase carried no account id and no phone to dedupe on.
      uniquePurchasingCustomers: row.purchases === 0 ? 0 : reliable ? identityCount : null,
      // Orders per attributed visit; can exceed 1 when one visit orders twice.
      conversionRate: rate(row.orders, row.sessions),
    };
  });

  rows.sort((a, b) => b.sessions - a.sessions || b.orders - a.orders || a.key.localeCompare(b.key));

  return {
    range: {
      days: 7,
      from: new Date(windowStart).toISOString(),
      to: now.toISOString(),
    },
    rows: rows.slice(0, MAX_CAMPAIGN_ROWS),
    truncated: rows.length > MAX_CAMPAIGN_ROWS,
  };
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date) {
  return new Date(date.getFullYear(), 0, 1);
}

export function aggregateVisitorAnalytics(sessions = [], events = [], {
  companyId,
  siteId = "",
  orders = [],
  now = new Date(),
} = {}) {
  const scopedSessions = sessions.filter(
    (session) => getRecordCompanyId(session) === companyId && (!siteId || session.siteId === siteId),
  );
  const scopedEvents = events.filter(
    (event) => getRecordCompanyId(event) === companyId && (!siteId || event.siteId === siteId),
  );
  const scopedOrders = orders.filter((order) => getRecordCompanyId(order) === companyId);

  const dayStart = startOfDay(now).getTime();
  const monthStart = startOfMonth(now).getTime();
  const yearStart = startOfYear(now).getTime();

  const sessionsInRange = (startMs) => scopedSessions.filter(
    (session) => new Date(session.firstSeenAt).getTime() >= startMs,
  );

  const eventsInRange = (startMs) => scopedEvents.filter(
    (event) => new Date(event.createdAt).getTime() >= startMs,
  );

  const dailySessions = sessionsInRange(dayStart);
  const monthlySessions = sessionsInRange(monthStart);
  const yearlySessions = sessionsInRange(yearStart);

  const dailyEvents = eventsInRange(dayStart);
  const monthlyEvents = eventsInRange(monthStart);
  const yearlyEvents = eventsInRange(yearStart);

  const returningSupported = scopedSessions.some((session) => session.visitorKey);
  const firstTimeDaily = returningSupported
    ? dailySessions.filter((session) => !session.isReturning).length
    : null;
  const returningDaily = returningSupported
    ? dailySessions.filter((session) => session.isReturning).length
    : null;

  const seriesByDay = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setDate(day.getDate() - offset);
    const start = startOfDay(day).getTime();
    const end = start + 24 * 60 * 60 * 1000;
    const count = scopedSessions.filter((session) => {
      const seen = new Date(session.firstSeenAt).getTime();
      return seen >= start && seen < end;
    }).length;
    seriesByDay.push({
      date: startOfDay(day).toISOString().slice(0, 10),
      visitors: count,
      pageViews: scopedEvents.filter((event) => {
        const created = new Date(event.createdAt).getTime();
        return created >= start && created < end && event.eventType === "pageview";
      }).length,
    });
  }

  /**
   * Behavior metrics use the same rolling 7-day window as seriesByDay so every
   * figure (Sessions over time, Top Pages, and engagement) shares one range.
   * Every value is derived from real stored visitor events/sessions only.
   * Metrics that cannot be computed from the available record stay null.
   */
  const behavior = buildBehaviorSummary(scopedSessions, scopedEvents, now);

  /**
   * Funnel metrics share the same rolling 7-day window as behavior so every
   * conversion figure is derived from real recorded storefront events only.
   */
  const funnel = buildFunnelSummary(scopedEvents, now);

  /**
   * Campaign performance joins the same sessions/events to backend-confirmed
   * orders so media buyers can read one post or campaign end to end.
   */
  const campaigns = buildCampaignSummary(scopedSessions, scopedEvents, scopedOrders, now);

  return {
    daily: {
      totalVisitors: dailySessions.length,
      pageViews: dailyEvents.filter((event) => event.eventType === "pageview").length,
      productViews: dailyEvents.filter((event) => event.eventType === "product_view").length,
      firstTimeVisitors: firstTimeDaily,
      returningVisitors: returningDaily,
    },
    monthly: {
      totalVisitors: monthlySessions.length,
      pageViews: monthlyEvents.filter((event) => event.eventType === "pageview").length,
      productViews: monthlyEvents.filter((event) => event.eventType === "product_view").length,
    },
    yearly: {
      totalVisitors: yearlySessions.length,
      pageViews: yearlyEvents.filter((event) => event.eventType === "pageview").length,
      productViews: yearlyEvents.filter((event) => event.eventType === "product_view").length,
    },
    seriesByDay,
    behavior,
    funnel,
    campaigns,
    returningVisitorIdentitySupported: returningSupported,
    liveVisitors: countLiveVisitors(scopedSessions, { companyId, siteId, now }),
    liveVisitorWindowMs: LIVE_VISITOR_WINDOW_MS,
  };
}

function safeTimestamp(value) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function buildTopPages(pageviewEvents, limit = 10) {
  const counts = new Map();
  for (const event of pageviewEvents) {
    const path = String(event.path || "").trim();
    if (!path) continue;
    counts.set(path, (counts.get(path) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views || String(a.path).localeCompare(String(b.path)))
    .slice(0, limit);
}

function buildBehaviorSummary(scopedSessions = [], scopedEvents = [], now = new Date()) {
  const behaviorStart = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)).getTime();

  const sessions = scopedSessions.filter((session) => {
    const firstSeen = safeTimestamp(session.firstSeenAt);
    return firstSeen !== null && firstSeen >= behaviorStart;
  });

  const pageviewEvents = scopedEvents.filter((event) => {
    const created = safeTimestamp(event.createdAt);
    return created !== null && created >= behaviorStart && event.eventType === "pageview";
  });

  const sessionCount = sessions.length;
  let pageViews = 0;
  let bounces = 0;
  let eligibleSessions = 0;
  let accumulatedSeconds = 0;
  let durationSamples = 0;

  for (const session of sessions) {
    const pageCount = Number(session.pageViews) || 0;
    pageViews += pageCount;
    if (pageCount > 0) {
      eligibleSessions += 1;
      if (pageCount === 1) bounces += 1;
    }
    const firstSeen = safeTimestamp(session.firstSeenAt);
    const lastSeen = safeTimestamp(session.lastSeenAt);
    if (firstSeen !== null && lastSeen !== null && lastSeen >= firstSeen) {
      accumulatedSeconds += (lastSeen - firstSeen) / 1000;
      durationSamples += 1;
    }
  }

  return {
    range: {
      startDate: startOfDay(new Date(behaviorStart)).toISOString().slice(0, 10),
      endDate: startOfDay(now).toISOString().slice(0, 10),
      days: 7,
    },
    sessions: sessionCount,
    pageViews,
    avgSessionDurationSeconds: durationSamples
      ? Math.round((accumulatedSeconds / durationSamples) * 10) / 10
      : null,
    pagesPerSession: sessionCount
      ? Math.round((pageViews / sessionCount) * 100) / 100
      : null,
    bounceRate: eligibleSessions
      ? Math.round((bounces / eligibleSessions) * 1000) / 1000
      : null,
    topPages: buildTopPages(pageviewEvents),
  };
}

function rate(value, denominator) {
  if (!denominator || denominator <= 0) return null;
  return Math.round((value / denominator) * 1000) / 1000;
}

function buildFunnelSummary(scopedEvents = [], now = new Date()) {
  const funnelStart = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)).getTime();
  const windowedEvents = scopedEvents.filter((event) => {
    const created = safeTimestamp(event.createdAt);
    return created !== null && created >= funnelStart;
  });

  const count = (eventType) => windowedEvents.filter((event) => event.eventType === eventType).length;
  const productViews = count("product_view");
  const addToCart = count("add_to_cart");
  const removeFromCart = count("remove_from_cart");
  const checkoutStarted = count("initiate_checkout");
  const purchases = count("purchase");

  return {
    range: {
      startDate: startOfDay(new Date(funnelStart)).toISOString().slice(0, 10),
      endDate: startOfDay(now).toISOString().slice(0, 10),
      days: 7,
    },
    productViews,
    addToCart,
    removeFromCart,
    checkoutStarted,
    purchases,
    addToCartRate: rate(addToCart, productViews),
    checkoutRate: rate(checkoutStarted, addToCart),
    purchaseConversionRate: rate(purchases, checkoutStarted),
  };
}
