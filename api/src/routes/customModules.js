import crypto from "node:crypto";
import { Router } from "express";
import {
  companyRepository,
  customAdminModuleEntryRepository,
  customAdminModuleRepository,
  persistCompanyStore,
} from "../data/store.js";
import { requireAuth } from "../middleware/auth.js";
import { recordActivityLog } from "../activityLog/logger.js";
import { normalizeCompanyId } from "../tenancy/company.js";
import {
  customModuleValidationError,
  sanitizeEntryData,
  sanitizeModuleConfig,
  userCanManageCustomModule,
  userCanViewCustomModule,
} from "../customModules/schema.js";

const router = Router();
router.use(requireAuth);
router.use((req, res, next) => {
  if (!["admin", "company_admin", "super_admin", "manager", "employee", "staff"].includes(req.user?.role)) {
    return res.status(403).json({ message: "Custom module admin access denied." });
  }
  return next();
});

function requestCompanyId(req) {
  if (req.tenantScope) return req.companyId;
  if (req.user?.role !== "super_admin") return req.companyId;
  const requested = normalizeCompanyId(req.query.companyId || req.body?.companyId || req.companyId);
  if (!companyRepository.getCompanyById(requested)) {
    throw customModuleValidationError("Company not found.", 404);
  }
  return requested;
}

function requireBuilderAccess(req) {
  if (!["admin", "company_admin", "super_admin"].includes(req.user?.role)) {
    throw customModuleValidationError("Company admin access required.", 403);
  }
}

function moduleForRequest(req, { allowDisabled = false } = {}) {
  const companyId = requestCompanyId(req);
  const module = customAdminModuleRepository.findByCompany(
    companyId,
    (item) => item.id === req.params.moduleId || item.key === req.params.moduleId,
  );
  if (!module) throw customModuleValidationError("Custom module not found.", 404);
  if (!allowDisabled && module.enabled === false) {
    throw customModuleValidationError("Custom module is not enabled for this company.", 403);
  }
  return { companyId, module };
}

function entryForRequest(companyId, module, entryId) {
  const entry = customAdminModuleEntryRepository.findByCompany(
    companyId,
    (item) => item.id === entryId && item.moduleId === module.id && item.status !== "deleted",
  );
  if (!entry) throw customModuleValidationError("Custom module entry not found.", 404);
  return entry;
}

function sendError(res, error) {
  return res.status(error.statusCode || 500).json({
    message: error.statusCode ? error.message : "Unable to process custom module request.",
  });
}

router.get("/", (req, res) => {
  try {
    const companyId = requestCompanyId(req);
    const modules = customAdminModuleRepository
      .getByCompany(companyId)
      .filter((module) => ["admin", "company_admin", "super_admin"].includes(req.user.role)
        || (module.enabled !== false && userCanViewCustomModule(req.user, module)))
      .sort((a, b) => a.sidebarOrder - b.sidebarOrder || a.label.localeCompare(b.label));
    return res.json(modules);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/", async (req, res) => {
  try {
    requireBuilderAccess(req);
    const companyId = requestCompanyId(req);
    const config = sanitizeModuleConfig(req.body);
    const duplicate = customAdminModuleRepository.findByCompany(companyId, (item) => item.key === config.key);
    if (duplicate) throw customModuleValidationError("A custom module with this key already exists.", 409);
    const now = new Date().toISOString();
    const module = customAdminModuleRepository.createForCompany(companyId, {
      id: crypto.randomUUID(),
      ...config,
      createdBy: req.user.id,
      updatedBy: req.user.id,
      createdAt: now,
      updatedAt: now,
    });
    await persistCompanyStore(companyId);
    recordActivityLog({
      req,
      companyId,
      action: "custom_module.created",
      entityType: "custom_module",
      entityId: module.id,
      entityLabel: module.label || module.key || "",
      summary: `Custom module "${module.label || module.key}" created`,
      afterData: { label: module.label, key: module.key, enabled: module.enabled },
    });
    return res.status(201).json(module);
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/:moduleId", (req, res) => {
  try {
    const allowDisabled = ["admin", "company_admin", "super_admin"].includes(req.user.role);
    const { module } = moduleForRequest(req, { allowDisabled });
    if (!userCanViewCustomModule(req.user, module)) {
      throw customModuleValidationError("Custom module access denied.", 403);
    }
    return res.json(module);
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch("/:moduleId", async (req, res) => {
  try {
    requireBuilderAccess(req);
    const { companyId, module: current } = moduleForRequest(req, { allowDisabled: true });
    const config = sanitizeModuleConfig(req.body, current);
    const module = customAdminModuleRepository.updateForCompany(companyId, current.id, {
      ...current,
      ...config,
      id: current.id,
      key: current.key,
      updatedBy: req.user.id,
      updatedAt: new Date().toISOString(),
    });
    await persistCompanyStore(companyId);
    const disabled = config.enabled === false;
    recordActivityLog({
      req,
      companyId,
      action: disabled ? "custom_module.disabled" : "custom_module.updated",
      entityType: "custom_module",
      entityId: current.id,
      entityLabel: current.label || current.key || "",
      summary: disabled
        ? `Custom module "${current.label || current.key}" disabled`
        : `Custom module "${current.label || current.key}" updated`,
      beforeData: { label: current.label, key: current.key, enabled: current.enabled },
      afterData: { label: module.label, key: module.key, enabled: module.enabled },
    });
    return res.json(module);
  } catch (error) {
    return sendError(res, error);
  }
});

router.delete("/:moduleId", async (req, res) => {
  try {
    requireBuilderAccess(req);
    const { companyId, module: current } = moduleForRequest(req, { allowDisabled: true });
    const module = customAdminModuleRepository.updateForCompany(companyId, current.id, {
      ...current,
      enabled: false,
      updatedBy: req.user.id,
      updatedAt: new Date().toISOString(),
    });
    await persistCompanyStore(companyId);
    recordActivityLog({
      req,
      companyId,
      action: "custom_module.disabled",
      entityType: "custom_module",
      entityId: current.id,
      entityLabel: current.label || current.key || "",
      summary: `Custom module "${current.label || current.key}" disabled via delete`,
      beforeData: { label: current.label, key: current.key, enabled: current.enabled },
      afterData: { enabled: false },
    });
    return res.json(module);
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/:moduleId/entries", (req, res) => {
  try {
    const { companyId, module } = moduleForRequest(req);
    if (!userCanViewCustomModule(req.user, module)) {
      throw customModuleValidationError("Custom module access denied.", 403);
    }
    const entries = customAdminModuleEntryRepository
      .getByCompany(companyId)
      .filter((entry) => entry.moduleId === module.id && entry.status !== "deleted")
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    return res.json(entries);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/:moduleId/entries", async (req, res) => {
  try {
    const { companyId, module } = moduleForRequest(req);
    if (!userCanManageCustomModule(req.user, module)) {
      throw customModuleValidationError("Custom module write access denied.", 403);
    }
    const now = new Date().toISOString();
    const entry = customAdminModuleEntryRepository.createForCompany(companyId, {
      id: crypto.randomUUID(),
      moduleId: module.id,
      data: sanitizeEntryData(req.body?.data, module.fieldsSchema),
      status: "active",
      createdBy: req.user.id,
      updatedBy: req.user.id,
      createdAt: now,
      updatedAt: now,
    });
    await persistCompanyStore(companyId);
    recordActivityLog({
      req,
      companyId,
      action: "custom_module_entry.created",
      entityType: "custom_module_entry",
      entityId: entry.id,
      entityLabel: module.label || module.key || "",
      summary: `Entry created in custom module "${module.label || module.key}"`,
      afterData: { moduleId: module.id, moduleKey: module.key, entryId: entry.id },
    });
    return res.status(201).json(entry);
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/:moduleId/entries/:entryId", (req, res) => {
  try {
    const { companyId, module } = moduleForRequest(req);
    if (!userCanViewCustomModule(req.user, module)) {
      throw customModuleValidationError("Custom module access denied.", 403);
    }
    return res.json(entryForRequest(companyId, module, req.params.entryId));
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch("/:moduleId/entries/:entryId", async (req, res) => {
  try {
    const { companyId, module } = moduleForRequest(req);
    if (!userCanManageCustomModule(req.user, module)) {
      throw customModuleValidationError("Custom module write access denied.", 403);
    }
    const current = entryForRequest(companyId, module, req.params.entryId);
    const entry = customAdminModuleEntryRepository.updateForCompany(companyId, current.id, {
      ...current,
      data: sanitizeEntryData(req.body?.data, module.fieldsSchema),
      updatedBy: req.user.id,
      updatedAt: new Date().toISOString(),
    });
    await persistCompanyStore(companyId);
    recordActivityLog({
      req,
      companyId,
      action: "custom_module_entry.updated",
      entityType: "custom_module_entry",
      entityId: current.id,
      entityLabel: module.label || module.key || "",
      summary: `Entry updated in custom module "${module.label || module.key}"`,
      beforeData: { moduleId: module.id, moduleKey: module.key },
      afterData: { moduleId: module.id, moduleKey: module.key, entryId: entry.id },
    });
    return res.json(entry);
  } catch (error) {
    return sendError(res, error);
  }
});

router.delete("/:moduleId/entries/:entryId", async (req, res) => {
  try {
    const { companyId, module } = moduleForRequest(req);
    if (!userCanManageCustomModule(req.user, module)) {
      throw customModuleValidationError("Custom module write access denied.", 403);
    }
    const current = entryForRequest(companyId, module, req.params.entryId);
    const entry = customAdminModuleEntryRepository.updateForCompany(companyId, current.id, {
      ...current,
      status: "deleted",
      updatedBy: req.user.id,
      updatedAt: new Date().toISOString(),
    });
    await persistCompanyStore(companyId);
    recordActivityLog({
      req,
      companyId,
      action: "custom_module_entry.deleted",
      entityType: "custom_module_entry",
      entityId: current.id,
      entityLabel: module.label || module.key || "",
      summary: `Entry deleted from custom module "${module.label || module.key}"`,
      beforeData: { moduleId: module.id, moduleKey: module.key, entryId: current.id },
    });
    return res.json(entry);
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
