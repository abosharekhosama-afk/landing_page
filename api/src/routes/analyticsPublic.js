import { Router } from "express";
import { normalizeSearchTerm } from "../analytics/dashboardInsights.js";
import {
  createSearchEvent,
  resolveSearchRedirect,
  trimSearchEvents,
} from "../analytics/searchAnalytics.js";
import {
  createVisitorEvent,
  normalizeAttribution,
  referrerHostname,
  trimVisitorEvents,
  upsertVisitorSession,
} from "../analytics/visitorAnalytics.js";
import {
  persistAnalyticsStore,
  productRepository,
  searchEventRepository,
  searchEvents,
  searchRedirectRepository,
  getRecordCompanyId,
  visitorEventRepository,
  visitorEvents,
  visitorSessionRepository,
  visitorSessions,
} from "../data/store.js";
import { isProductTrashed } from "../products/trashLifecycle.js";

const router = Router();

function requestSiteId(req) {
  return String(req.headers["x-site-id"] || req.query.siteId || req.storefront?.siteId || "").trim();
}

function isStorefrontVisitorPath(path = "") {
  const normalized = String(path || "").trim().toLowerCase();
  if (!normalized) return true;
  if (normalized.startsWith("/admin") || normalized.startsWith("/cpanel")) return false;
  if (normalized.includes("/api/admin")) return false;
  return true;
}

function countProductSearchResults(companyId, term) {
  const normalized = normalizeSearchTerm(term);
  if (!normalized) return 0;
  return productRepository.getByCompany(companyId).filter((product) => {
    if (isProductTrashed(product) || product.isActive === false || product.active === false || product.visible === false) return false;
    const name = typeof product.name === "object"
      ? `${product.name.en || ""} ${product.name.ar || ""}`
      : String(product.name || "");
    const haystack = `${name} ${product.slug || ""} ${product.sku || ""}`.toLocaleLowerCase();
    return haystack.includes(normalized);
  }).length;
}

function replaceCompanyRecords(collection, companyId, nextCompanyRecords) {
  const others = collection.filter((record) => getRecordCompanyId(record) !== companyId);
  collection.splice(0, collection.length, ...others, ...nextCompanyRecords);
}

router.post("/search", async (req, res) => {
  try {
    const companyId = req.companyId;
    const siteId = requestSiteId(req);
    if (!siteId) return res.status(400).json({ message: "X-Site-Id is required." });
    const originalTerm = String(req.body?.term || "").trim();
    if (!originalTerm) return res.status(400).json({ message: "Search term is required." });

    const redirects = searchRedirectRepository.getByCompany(companyId).filter((entry) => entry.isActive !== false);
    const resolved = resolveSearchRedirect(originalTerm, redirects);
    const searchTermForResults = resolved.term || originalTerm;
    const resultsCount = Number.isFinite(Number(req.body?.resultsCount))
      ? Math.max(0, Number(req.body.resultsCount))
      : countProductSearchResults(companyId, searchTermForResults);

    const event = createSearchEvent({
      companyId,
      siteId,
      term: originalTerm,
      resultsCount,
      locale: req.body?.locale || req.storefront?.locale || "",
    });
    searchEventRepository.createForCompany(companyId, event);
    replaceCompanyRecords(
      searchEvents,
      companyId,
      trimSearchEvents(searchEventRepository.getByCompany(companyId), companyId),
    );
    await persistAnalyticsStore(companyId, { pruneSearchEvents: true });

    return res.status(201).json({
      ok: true,
      originalTerm,
      term: searchTermForResults,
      resolvedTerm: resolved.display || searchTermForResults,
      redirected: resolved.redirected,
      resultsCount,
    });
  } catch (error) {
    const status = Number(error.statusCode || 500);
    return res.status(status >= 400 && status < 500 ? status : 500).json({ message: error.message });
  }
});

router.post("/visitor", async (req, res) => {
  try {
    const companyId = req.companyId;
    const siteId = requestSiteId(req);
    if (!siteId) return res.status(400).json({ message: "X-Site-Id is required." });
    const sessionKey = String(req.body?.sessionKey || "").trim();
    if (!sessionKey) return res.status(400).json({ message: "sessionKey is required." });
    const eventType = String(req.body?.eventType || "pageview");
    const path = String(req.body?.path || "");
    const productId = String(req.body?.productId || "");
    const visitorKey = String(req.body?.visitorKey || "").trim();

    // Campaign attribution: URL parameters captured by the storefront, with the
    // HTTP referer hostname as a fallback. Values are whitelisted and capped.
    const bodyAttribution = normalizeAttribution(req.body?.attribution);
    const attribution = bodyAttribution.referrer
      ? bodyAttribution
      : { ...bodyAttribution, referrer: referrerHostname(req.headers.referer || req.headers.referrer) };
    if (!attribution.referrer) delete attribution.referrer;

    if (eventType === "purchase") {
      return res.status(400).json({
        message: "Purchase events are recorded by the order API after a successful order.",
      });
    }

    if (!isStorefrontVisitorPath(path)) {
      return res.status(400).json({ message: "Admin or CPanel paths cannot be tracked as storefront visitor activity." });
    }

    visitorEventRepository.createForCompany(companyId, createVisitorEvent({
      companyId,
      siteId,
      sessionKey,
      eventType,
      path,
      productId,
    }));

    const nextSessions = upsertVisitorSession(
      visitorSessionRepository.getByCompany(companyId),
      { companyId, siteId, sessionKey, visitorKey, path, eventType, attribution },
    );
    replaceCompanyRecords(visitorSessions, companyId, nextSessions);

    replaceCompanyRecords(
      visitorEvents,
      companyId,
      trimVisitorEvents(visitorEventRepository.getByCompany(companyId), companyId),
    );

    await persistAnalyticsStore(companyId, { pruneVisitorEvents: true });
    return res.status(201).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: "Unable to record visitor event." });
  }
});

export default router;
