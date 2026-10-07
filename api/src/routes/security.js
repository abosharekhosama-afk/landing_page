import { Router } from "express";
import crypto from "node:crypto";
import {
  companyRepository,
  ipBlockRepository,
  loginHistoryRepository,
  persistCompanyStore,
} from "../data/store.js";
import { recordActivityLog } from "../activityLog/logger.js";
import { requireAuth, requireAnyPermission } from "../middleware/auth.js";
import { getSecurityConfig, updateSecurityConfig } from "../security/bruteForceProtection.js";
import { isValidIpOrCidr } from "../security/ipBlocking.js";

const router = Router();
router.use(requireAuth);

function paginate(items, req) {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  return { items: items.slice(offset, offset + limit), total: items.length, limit, offset };
}

router.get(
  "/login-history",
  requireAnyPermission("security.login_history.view"),
  (req, res) => {
    let items = loginHistoryRepository.getByCompany(req.companyId)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    if (req.query.status) items = items.filter((x) => x.status === String(req.query.status).toUpperCase());
    if (req.query.user) {
      const user = String(req.query.user).toLowerCase();
      items = items.filter((x) => String(x.email || "").toLowerCase().includes(user) || String(x.user_id || "").toLowerCase().includes(user));
    }
    if (req.query.from) items = items.filter((x) => new Date(x.created_at) >= new Date(String(req.query.from)));
    if (req.query.to) {
      const end = new Date(String(req.query.to));
      end.setHours(23, 59, 59, 999);
      items = items.filter((x) => new Date(x.created_at) <= end);
    }
    const q = String(req.query.q || "").toLowerCase();
    if (q) items = items.filter((x) => [x.email, x.user_id, x.ip_address, x.browser, x.device, x.authentication_method, x.failure_reason].join(" ").toLowerCase().includes(q));
    return res.json(paginate(items, req));
  },
);

router.get(
  "/ip-blocks",
  requireAnyPermission("security.ip_blocks.view", "security.ip_blocks.manage"),
  (req, res) => {
    let items = ipBlockRepository.getByCompany(req.companyId)
      .map((item) => ({ ...item, is_expired: Boolean(item.expires_at && new Date(item.expires_at) <= new Date()) }))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const q = String(req.query.q || "").toLowerCase();
    if (q) items = items.filter((x) => [x.ip_address, x.reason, x.block_type, x.created_by].join(" ").toLowerCase().includes(q));
    if (req.query.active !== undefined) {
      const active = String(req.query.active) === "true";
      items = items.filter((x) => x.is_active === active && (!active || !x.is_expired));
    }
    return res.json(paginate(items, req));
  },
);

router.post("/ip-blocks", requireAnyPermission("security.ip_blocks.manage"), async (req, res, next) => {
  try {
    const ip = String(req.body.ip_address || "").trim();
    if (!isValidIpOrCidr(ip)) return res.status(400).json({ message: "A valid IPv4/IPv6 address or CIDR is required." });
    const blockType = String(req.body.block_type || "MANUAL").toUpperCase();
    if (blockType !== "MANUAL") return res.status(400).json({ message: "Manual blocks must use block_type MANUAL." });
    const reason = String(req.body.reason || "").trim().slice(0, 500);
    if (!reason) return res.status(400).json({ message: "A reason is required." });
    const expiresAt = req.body.expires_at ? new Date(req.body.expires_at) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) return res.status(400).json({ message: "Invalid expiration date." });
    if (expiresAt && expiresAt <= new Date()) return res.status(400).json({ message: "Expiration must be in the future." });

    const item = {
      id: crypto.randomUUID(),
      company_id: req.companyId,
      ip_address: ip,
      block_type: "MANUAL",
      reason,
      created_by: req.user.id,
      is_active: true,
      created_at: new Date().toISOString(),
      expires_at: expiresAt ? expiresAt.toISOString() : null,
      unblocked_at: null,
      unblocked_by: null,
    };
    ipBlockRepository.createForCompany(req.companyId, item, { prepend: true });
    await persistCompanyStore(req.companyId);
    await recordActivityLog({ req, companyId: req.companyId, action: "IP_BLOCKED", entityType: "IP_BLOCK", entityId: item.id, summary: `IP blocked: ${ip}` });
    return res.status(201).json(item);
  } catch (error) {
    return next(error);
  }
});

router.post("/ip-blocks/:id/unblock", requireAnyPermission("security.ip_blocks.manage"), async (req, res, next) => {
  try {
    const before = ipBlockRepository.findByCompany(req.companyId, req.params.id);
    if (!before) return res.status(404).json({ message: "Not found." });
    const item = ipBlockRepository.updateForCompany(req.companyId, req.params.id, {
      is_active: false,
      unblocked_at: new Date().toISOString(),
      unblocked_by: req.user.id,
    });
    await persistCompanyStore(req.companyId);
    await recordActivityLog({ req, companyId: req.companyId, action: "IP_UNBLOCKED", entityType: "IP_BLOCK", entityId: item.id, beforeData: before, afterData: item, summary: `IP unblocked: ${item.ip_address}` });
    return res.json(item);
  } catch (error) {
    return next(error);
  }
});

router.get("/settings", requireAnyPermission("security.settings.manage", "security.ip_blocks.view", "security.ip_blocks.manage"), (req, res) => {
  return res.json(getSecurityConfig(req.companyId));
});

router.patch("/settings", requireAnyPermission("security.settings.manage"), async (req, res, next) => {
  try {
    const nextConfig = await updateSecurityConfig(req.companyId, req.body || {});
    await recordActivityLog({ req, companyId: req.companyId, action: "SECURITY_SETTINGS_UPDATED", entityType: "SECURITY_SETTINGS", entityId: req.companyId, summary: "Authentication abuse protection settings updated", afterData: nextConfig });
    return res.json(nextConfig);
  } catch (error) {
    return next(error);
  }
});

export default router;
