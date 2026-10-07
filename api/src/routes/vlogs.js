import { Router } from "express";
import { companyRepository } from "../data/store.js";
import { effectiveTenantRole, requireAuth } from "../middleware/auth.js";
import {
  companyVlogHero,
  listCompanyVlogs,
  normalizeVlogEntry,
  normalizeVlogHero,
  saveCompanyVlogHero,
  saveCompanyVlogs,
} from "../storefront/vlogsContent.js";

const router = Router();
const allowedRoles = new Set(["admin", "company_admin", "super_admin", "manager", "employee", "staff"]);
const managePermissions = ["website_texts.manage", "website_media.manage"];

router.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

router.use(requireAuth);

function requireVlogEditor(req, res, next) {
  const role = effectiveTenantRole(req);
  if (!allowedRoles.has(role)) {
    return res.status(403).json({ message: "Admin or employee access required." });
  }
  if (!["admin", "company_admin", "super_admin", "manager"].includes(role)
    && !managePermissions.some((permission) => req.user?.permissions?.includes(permission))) {
    return res.status(403).json({ message: "Website content permission required." });
  }
  return next();
}

router.use(requireVlogEditor);

function currentCompany(req) {
  return companyRepository.getCompanyById(req.companyId);
}

router.get("/", (req, res) => {
  const company = currentCompany(req);
  if (!company) return res.status(404).json({ message: "Company not found." });
  return res.json({
    items: listCompanyVlogs(company),
    hero: companyVlogHero(company),
  });
});

router.post("/", async (req, res, next) => {
  try {
    const company = currentCompany(req);
    if (!company) return res.status(404).json({ message: "Company not found." });
    const entry = normalizeVlogEntry(req.body || {});
    const items = listCompanyVlogs(company);
    if (items.some((item) => item.slug && entry.slug && item.slug === entry.slug)) {
      return res.status(409).json({ message: "A vlog with this slug already exists." });
    }
    const nextItems = [entry, ...items];
    const saved = await saveCompanyVlogs(req.companyId, nextItems);
    return res.status(201).json(saved.find((item) => item.id === entry.id) || entry);
  } catch (error) {
    return next(error);
  }
});

router.patch("/hero", async (req, res, next) => {
  try {
    const company = currentCompany(req);
    if (!company) return res.status(404).json({ message: "Company not found." });
    const hero = await saveCompanyVlogHero(req.companyId, normalizeVlogHero(req.body || {}, companyVlogHero(company)));
    return res.json(hero);
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const company = currentCompany(req);
    if (!company) return res.status(404).json({ message: "Company not found." });
    const items = listCompanyVlogs(company);
    const index = items.findIndex((item) => item.id === req.params.id || item.slug === req.params.id);
    if (index < 0) return res.status(404).json({ message: "Vlog not found." });
    const updated = normalizeVlogEntry(req.body || {}, items[index]);
    const nextItems = [...items];
    nextItems[index] = updated;
    const saved = await saveCompanyVlogs(req.companyId, nextItems);
    return res.json(saved.find((item) => item.id === updated.id) || updated);
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const company = currentCompany(req);
    if (!company) return res.status(404).json({ message: "Company not found." });
    const items = listCompanyVlogs(company);
    const nextItems = items.filter((item) => item.id !== req.params.id && item.slug !== req.params.id);
    if (nextItems.length === items.length) return res.status(404).json({ message: "Vlog not found." });
    await saveCompanyVlogs(req.companyId, nextItems);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
