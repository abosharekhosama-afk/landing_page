import { Router } from "express";
import {
  activityLogRepository,
  deliveryZoneRepository,
  invoiceRepository,
  orderRepository,
  productRepository,
  userRepository,
} from "../data/store.js";
import { requireAuth, requireAnyPermission } from "../middleware/auth.js";
import { filterActiveProducts } from "../products/trashLifecycle.js";

const router = Router();
router.use(requireAuth, requireAnyPermission("reports.view"));

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function field(value, ...alternatives) {
  for (const alt of alternatives) {
    if (value != null) return value;
    value = alt;
  }
  return "";
}

function getDateRange(query) {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 30);
  defaultFrom.setHours(0, 0, 0, 0);
  const date_from = query.date_from || defaultFrom.toISOString();
  const date_to = query.date_to || now.toISOString();
  return { date_from, date_to };
}

function getTime(value) {
  if (!value) return 0;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.getTime() : 0;
}

function inRange(item, dateFrom, dateTo) {
  const t = getTime(item.created_at || item.createdAt || "");
  return t >= getTime(dateFrom) && t <= getTime(dateTo);
}

const OPEN_ORDER_STATUSES = new Set([
  "pending",
  "awaiting employee review",
  "processing",
  "confirmation 1",
  "confirmation 2",
  "awaiting delivery",
]);

function canonicalOrderStatus(status) {
  const raw = String(status || "").trim();
  if (!raw) return "Unknown";
  const lower = raw.toLocaleLowerCase();
  if (lower === "pending") return "Awaiting Employee Review";
  if (lower === "processing") return "Confirmation 1";
  return raw;
}

function sortByCreatedDesc(a, b) {
  return getTime(b.created_at || b.createdAt || "") - getTime(a.created_at || a.createdAt || "");
}

function sortByUpdatedDesc(a, b) {
  return getTime(b.updatedAt || b.updated_at || "") - getTime(a.updatedAt || a.updated_at || "");
}

router.get("/summary", (req, res) => {
  try {
    const companyId = req.companyId;
    const { date_from, date_to } = getDateRange(req.query);

    const orders = orderRepository.getByCompany(companyId);
    const invoices = invoiceRepository.getByCompany(companyId).filter((inv) => !inv.deleted_at);
    const products = filterActiveProducts(productRepository.getByCompany(companyId));
    const users = userRepository.getByCompany(companyId);
    const deliveryZones = deliveryZoneRepository.getByCompany(companyId).filter((z) => !z.deleted_at);
    const activityLogs = activityLogRepository.getByCompany(companyId);

    const filteredOrders = orders.filter((o) => inRange(o, date_from, date_to));
    const filteredInvoices = invoices.filter((inv) => inRange(inv, date_from, date_to));
    const filteredLogs = activityLogs.filter((log) => inRange(log, date_from, date_to));

    const summary = {
      orders_count: filteredOrders.length,
      revenue_total: filteredOrders.reduce((sum, o) => sum + safeNumber(o.total), 0),
      pending_orders: filteredOrders.filter((o) => {
        const s = (o.status || "").trim().toLowerCase();
        return OPEN_ORDER_STATUSES.has(s);
      }).length,
      completed_orders: filteredOrders.filter((o) => {
        const s = (o.status || "").toLowerCase();
        return s === "completed" || s === "delivered" || s === "shipped";
      }).length,
      invoices_count: filteredInvoices.length,
      paid_invoices: filteredInvoices.filter((inv) => (inv.status || "").toLowerCase() === "paid").length,
      void_invoices: filteredInvoices.filter((inv) => {
        const s = (inv.status || "").toLowerCase();
        return s === "void" || s === "cancelled";
      }).length,
      products_count: products.length,
      customers_count: users.filter((u) => u.role === "customer").length,
      delivery_zones_count: deliveryZones.length,
    };

    const statusCounts = {};
    for (const o of filteredOrders) {
      const s = canonicalOrderStatus(o.status);
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }

    const invoiceStatusCounts = {};
    for (const inv of filteredInvoices) {
      const s = inv.status || "Unknown";
      invoiceStatusCounts[s] = (invoiceStatusCounts[s] || 0) + 1;
    }

    const visibleProducts = products.filter((p) => p.visible !== false);
    const hiddenProducts = products.filter((p) => p.visible === false);

    const enabledZones = deliveryZones.filter((z) => z.enabled !== false);
    const disabledZones = deliveryZones.filter((z) => z.enabled === false);

    const cityCounts = {};
    for (const o of orders) {
      const city = o.delivery_city_name || o.customer?.city || "";
      if (city) {
        cityCounts[city] = (cityCounts[city] || 0) + 1;
      }
    }
    const topCities = Object.entries(cityCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([city, count]) => ({ city, count }));

    const actionCounts = {};
    for (const log of filteredLogs) {
      const a = log.action || "Unknown";
      actionCounts[a] = (actionCounts[a] || 0) + 1;
    }
    const actorCounts = {};
    for (const log of filteredLogs) {
      const a = log.actor_email || log.actor_name || log.actor_user_id || "Unknown";
      actorCounts[a] = (actorCounts[a] || 0) + 1;
    }

    return res.json({
      range: { date_from, date_to },
      summary,
      orders: {
        by_status: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
        latest: [...filteredOrders].sort(sortByCreatedDesc).slice(0, 10).map((o) => ({
          id: o.id,
          customer_name: o.customer?.name || "",
          total: safeNumber(o.total),
          status: o.status || "",
          created_at: o.createdAt || o.created_at || "",
        })),
      },
      invoices: {
        by_status: Object.entries(invoiceStatusCounts).map(([status, count]) => ({ status, count })),
        latest: [...filteredInvoices].sort(sortByCreatedDesc).slice(0, 10).map((inv) => ({
          id: inv.id,
          invoice_number: inv.invoice_number || "",
          customer_name: inv.customer_name || "",
          total: safeNumber(inv.total),
          status: inv.status || "",
          created_at: inv.created_at || "",
        })),
      },
      products: {
        visible: visibleProducts.length,
        hidden: hiddenProducts.length,
        latest: [...products].sort(sortByUpdatedDesc).slice(0, 10).map((p) => ({
          id: p.id,
          name: typeof p.name === "object" ? p.name.en || p.name.ar || "" : p.name || p.slug || "",
          slug: p.slug || "",
          visible: p.visible !== false,
        })),
      },
      delivery: {
        enabled: enabledZones.length,
        disabled: disabledZones.length,
        top_cities: topCities,
      },
      activity: {
        latest: [...filteredLogs].sort(sortByCreatedDesc).slice(0, 10).map((log) => ({
          id: log.id,
          action: log.action || "",
          actor_name: log.actor_name || log.actor_email || "",
          entity_type: log.entity_type || "",
          entity_label: log.entity_label || "",
          summary: log.summary || "",
          created_at: log.created_at || "",
        })),
        by_action: Object.entries(actionCounts).map(([action, count]) => ({ action, count })),
        by_actor: Object.entries(actorCounts).map(([actor, count]) => ({ actor, count })),
      },
    });
  } catch (error) {
    console.error("Reports summary error:", error.message);
    return res.status(500).json({ message: "Unable to generate reports summary." });
  }
});

export default router;
