import { Router } from "express";
import { activityLogRepository } from "../data/store.js";
import { requireAuth, requireAnyPermission } from "../middleware/auth.js";
import { sanitizeLogData } from "../activityLog/logger.js";

const router = Router();
router.use(requireAuth, requireAnyPermission("activity_log.view"));

function publicActivityLog(log) {
  if (!log) return null;
  const created = log.created_at || log.createdAt || log.timestamp || "";
  const createdIso = created instanceof Date
    ? created.toISOString()
    : (created ? String(created) : "");
  return {
    id: log.id,
    actor_user_id: log.actor_user_id || log.actor_id || "",
    actor_email: log.actor_email || "",
    actor_name: log.actor_name || "",
    actor_role: log.actor_role || "",
    action: log.action || "",
    entity_type: log.entity_type || "",
    entity_id: log.entity_id || "",
    entity_label: log.entity_label || "",
    summary: log.summary || "",
    before_data: sanitizeLogData(log.before_data),
    after_data: sanitizeLogData(log.after_data),
    metadata: sanitizeLogData(log.metadata),
    ip_address: log.ip_address || "",
    user_agent: log.user_agent || "",
    created_at: createdIso,
  };
}

function safeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

router.get("/", (req, res) => {
  try {
    let logs = activityLogRepository
      .getByCompany(req.companyId)
      .filter((log) => !log.deleted_at)
      .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));

    const { action, entity_type, actor_email, actor_id, date_from, date_to } = req.query;

    if (action) {
      logs = logs.filter((log) => log.action === action);
    }
    if (entity_type) {
      logs = logs.filter((log) => log.entity_type === entity_type);
    }
    if (actor_email) {
      logs = logs.filter((log) => log.actor_email?.toLowerCase().includes(actor_email.toLowerCase()));
    }
    if (actor_id) {
      logs = logs.filter((log) =>
        log.actor_id === actor_id ||
        log.actor_user_id === actor_id ||
        log.user_id === actor_id ||
        log.userId === actor_id ||
        log.employeeId === actor_id,
      );
    }
    if (date_from) {
      const from = parseDate(date_from);
      if (from) {
        logs = logs.filter((log) => String(log.created_at || "") >= from);
      }
    }
    if (date_to) {
      const to = parseDate(date_to);
      if (to) {
        logs = logs.filter((log) => String(log.created_at || "") <= to);
      }
    }

    const limit = safeNumber(req.query.limit, 50);
    const page = safeNumber(req.query.page, 1);
    const start = (page - 1) * limit;
    const paginated = logs.slice(start, start + limit);

    return res.json({
      logs: paginated.map(publicActivityLog),
      total: logs.length,
      page,
      limit,
      totalPages: Math.ceil(logs.length / limit) || 1,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch activity logs." });
  }
});

router.get("/:logId", (req, res) => {
  try {
    const log = activityLogRepository.findByCompany(req.companyId, req.params.logId);
    if (!log || log.deleted_at) {
      return res.status(404).json({ message: "Activity log not found." });
    }
    return res.json(publicActivityLog(log));
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch activity log." });
  }
});

export default router;
