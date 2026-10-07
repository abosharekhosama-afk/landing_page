import crypto from "node:crypto";
import { Router } from "express";
import { deliveryZoneRepository, persistCompanyStore } from "../data/store.js";
import { optionalAuth, requireAuth, requireAnyPermission } from "../middleware/auth.js";
import { sanitizeCreateZone, sanitizeUpdateZone } from "../delivery/schema.js";
import { recordActivityLog } from "../activityLog/logger.js";

function zoneError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sendError(res, error) {
  return res.status(error.statusCode || 500).json({
    message: error.statusCode ? error.message : "Unable to process delivery zone request.",
  });
}

function companyZones(companyId) {
  return deliveryZoneRepository
    .getByCompany(companyId)
    .filter((z) => !z.deleted_at)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.city_name.localeCompare(b.city_name));
}

function findZone(companyId, zoneId) {
  const zone = deliveryZoneRepository.findByCompany(companyId, zoneId);
  if (!zone || zone.deleted_at) {
    throw zoneError("Delivery zone not found.", 404);
  }
  return zone;
}

// --- Public route: enabled zones only ---
const publicRouter = Router();

publicRouter.get("/", optionalAuth, (req, res) => {
  try {
    const zones = companyZones(req.companyId).filter((z) => z.enabled !== false);
    return res.json(zones);
  } catch (error) {
    return sendError(res, error);
  }
});

// --- Admin routes: full CRUD ---
const adminRouter = Router();
const deliveryRead = requireAnyPermission("delivery.view", "delivery.manage");
const deliveryWrite = requireAnyPermission("delivery.manage");

adminRouter.get("/", requireAuth, deliveryRead, (req, res) => {
  try {
    return res.json(companyZones(req.companyId));
  } catch (error) {
    return sendError(res, error);
  }
});

adminRouter.post("/", requireAuth, deliveryWrite, async (req, res) => {
  try {
    const data = sanitizeCreateZone(req.body);
    const duplicate = deliveryZoneRepository.findByCompany(
      req.companyId,
      (z) => z.city_key === data.city_key && !z.deleted_at,
    );
    if (duplicate) {
      throw zoneError("A delivery zone with this city_key already exists.", 409);
    }
    const now = new Date().toISOString();
    const zone = deliveryZoneRepository.createForCompany(req.companyId, {
      id: crypto.randomUUID(),
      ...data,
      created_by: req.user.id,
      updated_by: req.user.id,
      created_at: now,
      updated_at: now,
    });
    await persistCompanyStore(req.companyId);
    recordActivityLog({
      req,
      companyId: req.companyId,
      action: "delivery_zone.created",
      entityType: "delivery_zone",
      entityId: zone.id,
      entityLabel: zone.city_name || "",
      summary: `Delivery zone created for ${zone.city_name}`,
      afterData: { city_name: zone.city_name, delivery_price: zone.delivery_price, enabled: zone.enabled },
    });
    return res.status(201).json(zone);
  } catch (error) {
    return sendError(res, error);
  }
});

adminRouter.get("/:zoneId", requireAuth, deliveryRead, (req, res) => {
  try {
    return res.json(findZone(req.companyId, req.params.zoneId));
  } catch (error) {
    return sendError(res, error);
  }
});

adminRouter.patch("/:zoneId", requireAuth, deliveryWrite, async (req, res) => {
  try {
    const current = findZone(req.companyId, req.params.zoneId);
    const updates = sanitizeUpdateZone(req.body);
    const now = new Date().toISOString();
    const zone = deliveryZoneRepository.updateForCompany(req.companyId, current.id, {
      ...current,
      ...updates,
      updated_by: req.user.id,
      updated_at: now,
    });
    await persistCompanyStore(req.companyId);
    const enabledChanged = current.enabled !== zone.enabled;
    recordActivityLog({
      req,
      companyId: req.companyId,
      action: enabledChanged ? "delivery_zone.enabled_changed" : "delivery_zone.updated",
      entityType: "delivery_zone",
      entityId: current.id,
      entityLabel: current.city_name || "",
      summary: enabledChanged
        ? `Delivery zone ${current.city_name} ${zone.enabled ? "enabled" : "disabled"}`
        : `Delivery zone ${current.city_name} updated`,
      beforeData: { city_name: current.city_name, delivery_price: current.delivery_price, enabled: current.enabled },
      afterData: { city_name: zone.city_name, delivery_price: zone.delivery_price, enabled: zone.enabled },
    });
    return res.json(zone);
  } catch (error) {
    return sendError(res, error);
  }
});

adminRouter.delete("/:zoneId", requireAuth, deliveryWrite, async (req, res) => {
  try {
    const current = findZone(req.companyId, req.params.zoneId);
    const now = new Date().toISOString();
    const zone = deliveryZoneRepository.updateForCompany(req.companyId, current.id, {
      ...current,
      enabled: false,
      deleted_at: now,
      updated_by: req.user.id,
      updated_at: now,
    });
    await persistCompanyStore(req.companyId);
    recordActivityLog({
      req,
      companyId: req.companyId,
      action: "delivery_zone.deleted",
      entityType: "delivery_zone",
      entityId: current.id,
      entityLabel: current.city_name || "",
      summary: `Delivery zone ${current.city_name} deleted`,
      beforeData: { city_name: current.city_name, delivery_price: current.delivery_price, enabled: current.enabled },
    });
    return res.json(zone);
  } catch (error) {
    return sendError(res, error);
  }
});

export { publicRouter, adminRouter };
