import { Router } from "express";
import { persistCompanyStore, websiteTextsRepository } from "../data/store.js";
import { effectiveTenantRole, optionalAuth, requireAuth } from "../middleware/auth.js";

export const publicWebsiteTextsRouter = Router();
export const adminWebsiteTextsRouter = Router();
const allowedRoles = new Set(["admin", "company_admin", "super_admin", "manager", "employee", "staff"]);
const textsPermissions = ["website_texts.manage"];

function noStore(_req, res, next) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
}

publicWebsiteTextsRouter.use(noStore, optionalAuth);
adminWebsiteTextsRouter.use(noStore, requireAuth, requireTextsEditor);

function requireTextsEditor(req, res, next) {
  const role = effectiveTenantRole(req);
  if (!allowedRoles.has(role)) {
    return res.status(403).json({ message: "Admin or employee access required." });
  }

  if (!["admin", "company_admin", "super_admin"].includes(role) && !textsPermissions.some((p) => req.user?.permissions?.includes(p))) {
    return res.status(403).json({ message: "Website texts permission required." });
  }

  return next();
}

function sortTexts(items) {
  return [...items].sort((a, b) => {
    const groupComparison = String(a.group || "").localeCompare(String(b.group || ""));
    return groupComparison || Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
  });
}

function plainText(value, maxLength = 10000) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\u0000/g, "")
    .slice(0, maxLength);
}

function textKey(value) {
  const key = String(value || "").trim().slice(0, 160);
  if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/i.test(key)) {
    const error = new Error("Website text key is invalid.");
    error.statusCode = 400;
    throw error;
  }
  return key;
}

function normalizeWebsiteText(input, existing = {}) {
  return {
    ...existing,
    ...input,
    id: input.id || existing.id || `website-text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    key: textKey(input.key || existing.key || `text_${Date.now()}`),
    group: plainText(input.group || existing.group || "general", 80),
    label: plainText(input.label || existing.label || input.key || "Website text", 240),
    valueEn: plainText(input.valueEn ?? input.value?.en ?? existing.valueEn ?? ""),
    valueAr: plainText(input.valueAr ?? input.value?.ar ?? existing.valueAr ?? ""),
    valueHe: plainText(input.valueHe ?? input.value?.he ?? existing.valueHe ?? ""),
    isActive: input.isActive !== false,
    sortOrder: Number(input.sortOrder ?? existing.sortOrder ?? 0),
    createdAt: existing.createdAt || input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
}

publicWebsiteTextsRouter.get("/", (req, res) => {
  res.json(sortTexts(websiteTextsRepository.getByCompany(req.companyId).filter(
    (item) => item.isActive !== false && !item.deletedAt,
  )));
});

adminWebsiteTextsRouter.get("/", (req, res) => {
  res.json(sortTexts(websiteTextsRepository.getByCompany(req.companyId).filter(
    (item) => !item.deletedAt,
  )));
});

publicWebsiteTextsRouter.get("/:key", (req, res) => {
  const items = websiteTextsRepository.getByCompany(req.companyId).filter(
    (item) => item.isActive !== false && !item.deletedAt,
  );
  const text = items.find((item) => item.key === req.params.key);
  if (!text) return res.status(404).json({ message: "Website text not found." });
  return res.json(text);
});

adminWebsiteTextsRouter.post("/", async (req, res) => {
  try {
    const requestedKey = textKey(req.body?.key || req.body?.textKey);
    const existing = websiteTextsRepository.findByCompany(
      req.companyId,
      (item) => item.key === requestedKey,
    );
    const item = normalizeWebsiteText({ ...req.body, key: requestedKey }, existing || {});
    if (existing) websiteTextsRepository.updateForCompany(req.companyId, existing.id, item);
    else websiteTextsRepository.createForCompany(req.companyId, item);
    await persistCompanyStore(req.companyId);
    return res.status(existing ? 200 : 201).json(item);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Unable to save website text." });
  }
});

adminWebsiteTextsRouter.patch("/:id", async (req, res) => {
  const existing = websiteTextsRepository.findByCompany(req.companyId, req.params.id);
  if (!existing) return res.status(404).json({ message: "Website text not found." });

  try {
    const updated = websiteTextsRepository.updateForCompany(
      req.companyId,
      req.params.id,
      normalizeWebsiteText({ ...req.body, id: req.params.id }, existing),
    );
    await persistCompanyStore(req.companyId);
    return res.json(updated);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Unable to save website text." });
  }
});

adminWebsiteTextsRouter.delete("/:id", async (req, res) => {
  const existing = websiteTextsRepository.findByCompany(req.companyId, req.params.id);
  if (!existing) return res.status(404).json({ message: "Website text not found." });

  websiteTextsRepository.updateForCompany(req.companyId, req.params.id, {
    ...existing,
    isActive: false,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await persistCompanyStore(req.companyId);
  return res.status(204).end();
});

export default publicWebsiteTextsRouter;
