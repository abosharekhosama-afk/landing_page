/**
 * Search analytics + redirect mapping (tenant-scoped).
 *
 * Retention: raw search events are capped at MAX_SEARCH_EVENTS_PER_COMPANY per tenant.
 * Oldest events are dropped in memory and pruned from PostgreSQL on the next analytics persist.
 * Stored fields are minimal (term, results count, locale, site) — no IP, user agent, or PII.
 */

import crypto from "node:crypto";
import { normalizeSearchTerm } from "./dashboardInsights.js";

export const MAX_SEARCH_EVENTS_PER_COMPANY = 5000;

export function createSearchEvent({
  companyId,
  siteId = "",
  term = "",
  resultsCount = 0,
  locale = "",
}) {
  const termNormalized = normalizeSearchTerm(term);
  if (!termNormalized) {
    const error = new Error("Search term is required.");
    error.statusCode = 400;
    throw error;
  }
  return {
    id: crypto.randomUUID(),
    company_id: companyId,
    siteId: String(siteId || ""),
    termNormalized,
    termDisplay: String(term || "").trim(),
    resultsCount: Math.max(0, Number(resultsCount) || 0),
    locale: String(locale || ""),
    createdAt: new Date().toISOString(),
  };
}

export function trimSearchEvents(events = [], companyId, max = MAX_SEARCH_EVENTS_PER_COMPANY) {
  const companyEvents = events.filter((event) => event.company_id === companyId);
  if (companyEvents.length <= max) return events;
  const removeIds = new Set(
    companyEvents
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, companyEvents.length - max)
      .map((event) => event.id),
  );
  return events.filter((event) => !removeIds.has(event.id));
}

export function resolveSearchRedirect(term, redirects = []) {
  const normalized = normalizeSearchTerm(term);
  if (!normalized) return { term: "", redirected: false };
  const active = redirects.filter((entry) => entry.isActive !== false);
  const visited = new Set();
  let current = normalized;
  let display = term;
  let hops = 0;
  while (hops < 8) {
    if (visited.has(current)) break;
    visited.add(current);
    const match = active.find((entry) => entry.inputTermNormalized === current);
    if (!match) break;
    current = match.targetTermNormalized;
    display = match.targetTermDisplay || current;
    hops += 1;
  }
  return {
    term: current,
    display,
    redirected: hops > 0,
  };
}

export function validateSearchRedirectInput(inputTerm, targetTerm, existing = [], excludeId = null) {
  const inputNormalized = normalizeSearchTerm(inputTerm);
  const targetNormalized = normalizeSearchTerm(targetTerm);
  if (!inputNormalized || !targetNormalized) {
    const error = new Error("Input and target terms are required.");
    error.statusCode = 400;
    throw error;
  }
  if (inputNormalized === targetNormalized) {
    const error = new Error("Input and target terms must differ.");
    error.statusCode = 400;
    throw error;
  }
  const duplicate = existing.find(
    (entry) => entry.inputTermNormalized === inputNormalized && entry.id !== excludeId,
  );
  if (duplicate) {
    const error = new Error("A redirect for this input term already exists.");
    error.statusCode = 409;
    throw error;
  }
  const simulated = resolveSearchRedirect(targetNormalized, existing.filter((entry) => entry.id !== excludeId));
  if (simulated.term === inputNormalized) {
    const error = new Error("This redirect would create a loop.");
    error.statusCode = 400;
    throw error;
  }
  return { inputNormalized, targetNormalized };
}

export function aggregateSearchEvents(events = [], { siteId = "", limit = 50 } = {}) {
  const filtered = events.filter((event) => !siteId || event.siteId === siteId);
  const grouped = new Map();
  let searchesWithResults = 0;
  let zeroResultSearches = 0;
  for (const event of filtered) {
    if (Number(event.resultsCount || 0) > 0) {
      searchesWithResults += 1;
    } else {
      zeroResultSearches += 1;
    }
    const key = event.termNormalized;
    const current = grouped.get(key) || {
      term: event.termDisplay || key,
      termNormalized: key,
      searchCount: 0,
      resultsTotal: 0,
      zeroResultCount: 0,
      lastActivity: event.createdAt,
    };
    current.searchCount += 1;
    current.resultsTotal += Number(event.resultsCount || 0);
    if (Number(event.resultsCount || 0) <= 0) current.zeroResultCount += 1;
    if (new Date(event.createdAt).getTime() > new Date(current.lastActivity).getTime()) {
      current.lastActivity = event.createdAt;
      current.term = event.termDisplay || key;
    }
    grouped.set(key, current);
  }
  const all = [...grouped.values()].map((entry) => ({
    ...entry,
    averageResults: entry.searchCount ? entry.resultsTotal / entry.searchCount : 0,
  })).sort((a, b) => b.searchCount - a.searchCount);

  return {
    allSearches: all.slice(0, limit),
    withResults: all.filter((entry) => entry.zeroResultCount < entry.searchCount).slice(0, limit),
    zeroResults: all.filter((entry) => entry.zeroResultCount === entry.searchCount).slice(0, limit),
    mostSearched: all.slice(0, 10),
    totalEvents: filtered.length,
    searchesWithResults,
    zeroResultSearches,
  };
}

export function serializeSearchRedirect(entry = {}) {
  return {
    id: entry.id,
    inputTerm: entry.inputTermDisplay || entry.inputTermNormalized,
    targetTerm: entry.targetTermDisplay || entry.targetTermNormalized,
    inputTermNormalized: entry.inputTermNormalized,
    targetTermNormalized: entry.targetTermNormalized,
    isActive: entry.isActive !== false,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export function createSearchRedirectRecord(companyId, { inputTerm, targetTerm, isActive = true }) {
  const inputNormalized = normalizeSearchTerm(inputTerm);
  const targetNormalized = normalizeSearchTerm(targetTerm);
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    company_id: companyId,
    inputTermNormalized: inputNormalized,
    inputTermDisplay: String(inputTerm || "").trim(),
    targetTermNormalized: targetNormalized,
    targetTermDisplay: String(targetTerm || "").trim(),
    isActive: isActive !== false,
    createdAt: now,
    updatedAt: now,
  };
}
