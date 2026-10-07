import { Router } from "express";
import {
  aggregateSearchEvents,
  createSearchRedirectRecord,
  serializeSearchRedirect,
  validateSearchRedirectInput,
} from "../analytics/searchAnalytics.js";
import { aggregateVisitorAnalytics, countLiveVisitors } from "../analytics/visitorAnalytics.js";
import { recordActivityLog } from "../activityLog/logger.js";
import {
  orderRepository,
  persistAnalyticsStore,
  searchEventRepository,
  searchRedirectRepository,
  searchRedirects,
  visitorEventRepository,
  visitorSessionRepository,
} from "../data/store.js";
import { requireAuth, requireAnyPermission } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireAnyPermission("reports.view"));

router.get("/search", (req, res) => {
  const companyId = req.companyId;
  const siteId = String(req.query.site_id || "").trim();
  const events = searchEventRepository.getByCompany(companyId);
  return res.json(aggregateSearchEvents(events, { siteId }));
});

router.get("/search/redirects", (req, res) => {
  const redirects = searchRedirectRepository.getByCompany(req.companyId)
    .map(serializeSearchRedirect)
    .sort((a, b) => a.inputTerm.localeCompare(b.inputTerm));
  return res.json(redirects);
});

router.post("/search/redirects", async (req, res) => {
  try {
    const companyId = req.companyId;
    const existing = searchRedirectRepository.getByCompany(companyId);
    validateSearchRedirectInput(req.body?.inputTerm, req.body?.targetTerm, existing);
    const record = createSearchRedirectRecord(companyId, {
      inputTerm: req.body.inputTerm,
      targetTerm: req.body.targetTerm,
      isActive: req.body.isActive,
    });
    searchRedirectRepository.createForCompany(companyId, record);
    await persistAnalyticsStore(companyId);
    await recordActivityLog({
      req,
      companyId,
      action: "analytics.search_redirect.created",
      entityType: "search_redirect",
      entityId: record.id,
      entityLabel: `${record.inputTermDisplay} → ${record.targetTermDisplay}`,
      summary: "Created search redirect mapping.",
    });
    return res.status(201).json(serializeSearchRedirect(record));
  } catch (error) {
    const status = Number(error.statusCode || 500);
    return res.status(status >= 400 && status < 500 ? status : 500).json({ message: error.message });
  }
});

router.patch("/search/redirects/:id", async (req, res) => {
  try {
    const companyId = req.companyId;
    const existing = searchRedirectRepository.findByCompany(companyId, req.params.id);
    if (!existing) return res.status(404).json({ message: "Search redirect not found." });
    const siblings = searchRedirectRepository.getByCompany(companyId);
    const inputTerm = req.body?.inputTerm ?? existing.inputTermDisplay;
    const targetTerm = req.body?.targetTerm ?? existing.targetTermDisplay;
    const validated = validateSearchRedirectInput(inputTerm, targetTerm, siblings, existing.id);
    existing.inputTermNormalized = validated.inputNormalized;
    existing.targetTermNormalized = validated.targetNormalized;
    existing.inputTermDisplay = String(inputTerm || "").trim();
    existing.targetTermDisplay = String(targetTerm || "").trim();
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "isActive")) {
      existing.isActive = req.body.isActive !== false;
    }
    existing.updatedAt = new Date().toISOString();
    await persistAnalyticsStore(companyId);
    return res.json(serializeSearchRedirect(existing));
  } catch (error) {
    const status = Number(error.statusCode || 500);
    return res.status(status >= 400 && status < 500 ? status : 500).json({ message: error.message });
  }
});

router.delete("/search/redirects/:id", async (req, res) => {
  const companyId = req.companyId;
  const existing = searchRedirectRepository.findByCompany(companyId, req.params.id);
  if (!existing) return res.status(404).json({ message: "Search redirect not found." });
  const index = searchRedirects.findIndex((entry) => entry.id === existing.id);
  if (index >= 0) searchRedirects.splice(index, 1);
  await persistAnalyticsStore(companyId, { pruneSearchRedirects: true });
  return res.status(204).send();
});

router.get("/visitors", (req, res) => {
  const companyId = req.companyId;
  const siteId = String(req.query.site_id || "").trim();
  const sessions = visitorSessionRepository.getByCompany(companyId);
  const events = visitorEventRepository.getByCompany(companyId);
  const orders = orderRepository.getByCompany(companyId);
  return res.json(aggregateVisitorAnalytics(sessions, events, { companyId, siteId, orders }));
});

router.get("/visitors/live", (req, res) => {
  const companyId = req.companyId;
  const siteId = String(req.query.site_id || "").trim();
  const sessions = visitorSessionRepository.getByCompany(companyId);
  return res.json({
    count: countLiveVisitors(sessions, { companyId, siteId }),
    windowMs: 5 * 60 * 1000,
  });
});

export default router;
