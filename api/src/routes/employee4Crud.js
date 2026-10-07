import { Router } from "express";
import crypto from "node:crypto";
import { requireAuth, requireAnyPermission } from "../middleware/auth.js";
import { persistCompanyStore } from "../data/store.js";
import { recordActivityLog } from "../activityLog/logger.js";

export function createCrudRouter({
  repository,
  viewPermission,
  managePermission,
  entityType,
  actionPrefix,
  validate = () => null,
}) {
  const r = Router();
  r.use(requireAuth);

  r.get("/", requireAnyPermission(viewPermission, managePermission), (req, res) => {
    res.json({ items: repository.getByCompany(req.companyId) });
  });

  r.post("/", requireAnyPermission(managePermission), async (req, res, next) => {
    try {
      const error = validate(req.body || {});
      if (error) return res.status(400).json({ message: error });
      const now = new Date().toISOString();
      const body = { ...(req.body || {}) };
      delete body.id;
      delete body.company_id;
      delete body.created_at;
      delete body.updated_at;
      const item = {
        ...body,
        id: crypto.randomUUID(),
        company_id: req.companyId,
        created_at: now,
        updated_at: now,
      };
      repository.createForCompany(req.companyId, item, { prepend: true });
      await persistCompanyStore(req.companyId);
      await recordActivityLog({
        req,
        companyId: req.companyId,
        action: `${actionPrefix}_CREATED`,
        entityType,
        entityId: item.id,
        summary: `${entityType} created`,
        afterData: item,
      });
      return res.status(201).json(item);
    } catch (error) {
      return next(error);
    }
  });

  r.patch("/:id", requireAnyPermission(managePermission), async (req, res, next) => {
    try {
      const before = repository.findByCompany(req.companyId, req.params.id);
      if (!before) return res.status(404).json({ message: "Not found." });
      const body = { ...(req.body || {}) };
      delete body.id;
      delete body.company_id;
      delete body.created_at;
      delete body.updated_at;
      const merged = { ...before, ...body };
      const error = validate(merged);
      if (error) return res.status(400).json({ message: error });
      const item = repository.updateForCompany(req.companyId, req.params.id, {
        ...body,
        updated_at: new Date().toISOString(),
      });
      await persistCompanyStore(req.companyId);
      await recordActivityLog({
        req,
        companyId: req.companyId,
        action: `${actionPrefix}_UPDATED`,
        entityType,
        entityId: item.id,
        beforeData: before,
        afterData: item,
        summary: `${entityType} updated`,
      });
      return res.json(item);
    } catch (error) {
      return next(error);
    }
  });

  r.delete("/:id", requireAnyPermission(managePermission), async (req, res, next) => {
    try {
      const before = repository.findByCompany(req.companyId, req.params.id);
      if (!before) return res.status(404).json({ message: "Not found." });
      repository.deleteForCompany(req.companyId, req.params.id);
      await persistCompanyStore(req.companyId, { pruneMissing: true });
      await recordActivityLog({
        req,
        companyId: req.companyId,
        action: `${actionPrefix}_DELETED`,
        entityType,
        entityId: before.id,
        beforeData: before,
        summary: `${entityType} deleted`,
      });
      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  });

  return r;
}
