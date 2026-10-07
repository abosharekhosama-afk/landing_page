import { Router } from "express";
import { buildDashboardInsights } from "../analytics/dashboardInsights.js";
import { aggregateSearchEvents } from "../analytics/searchAnalytics.js";
import { aggregateVisitorAnalytics, countLiveVisitors } from "../analytics/visitorAnalytics.js";
import {
  companyRepository,
  orderRepository,
  productRepository,
  reviewRepository,
  searchEventRepository,
  userRepository,
  visitorEventRepository,
  visitorSessionRepository,
} from "../data/store.js";
import { requireAuth, requireAnyPermission } from "../middleware/auth.js";
import { filterActiveProducts } from "../products/trashLifecycle.js";
import { companyLowStockThreshold } from "../products/productSettings.js";

const router = Router();

router.use(requireAuth, requireAnyPermission("dashboard.view", "reports.view"));

router.get("/insights", async (req, res) => {
  try {
    const companyId = req.companyId;
    const company = companyRepository.getCompanyById(companyId);
    const lowStockThreshold = companyLowStockThreshold(company);
    const siteId = String(req.headers["x-site-id"] || req.query.site_id || "").trim();
    const timezoneOffsetMinutes = Number(req.query.tz_offset);
    const products = filterActiveProducts(productRepository.getByCompany(companyId));
    const orders = orderRepository.getByCompany(companyId);
    const searchEvents = searchEventRepository.getByCompany(companyId);
    const visitorSessions = visitorSessionRepository.getByCompany(companyId);
    const visitorEvents = visitorEventRepository.getByCompany(companyId);

    const searchSummary = searchEvents.length
      ? aggregateSearchEvents(searchEvents, { siteId, limit: 10 })
      : { totalEvents: 0, allSearches: [], withResults: [], zeroResults: [], mostSearched: [] };

    const visitorSummary = visitorSessions.length || visitorEvents.length
      ? aggregateVisitorAnalytics(visitorSessions, visitorEvents, { companyId, siteId })
      : null;

    const liveVisitors = countLiveVisitors(visitorSessions, { companyId, siteId });

    return res.json(buildDashboardInsights({
      products,
      orders,
      reviews: reviewRepository.getByCompany(companyId),
      users: userRepository.getByCompany(companyId),
      liveVisitors,
      searchSummary,
      visitorSummary,
      timezoneOffsetMinutes: Number.isFinite(timezoneOffsetMinutes) ? timezoneOffsetMinutes : 0,
      lowStockThreshold,
    }));
  } catch (error) {
    console.error("Dashboard insights error:", error.message);
    return res.status(500).json({ message: "Unable to load dashboard insights." });
  }
});

export default router;
