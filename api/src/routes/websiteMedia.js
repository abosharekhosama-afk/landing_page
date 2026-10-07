import { Router } from "express";
import {
  persistCompanyStore,
  websiteMediaHiddenKeysRepository,
  websiteMediaRepository,
} from "../data/store.js";
import { effectiveTenantRole, optionalAuth, requireAuth } from "../middleware/auth.js";

const router = Router();
const allowedRoles = new Set(["admin", "company_admin", "super_admin", "manager", "employee", "staff"]);
const mediaPermission = "website_media.manage";

router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

function requireMediaEditor(req, res, next) {
  const role = effectiveTenantRole(req);
  if (!allowedRoles.has(role)) {
    return res.status(403).json({ message: "Admin or employee access required." });
  }

  if (!["admin", "company_admin", "super_admin"].includes(role) && !req.user?.permissions?.includes(mediaPermission)) {
    return res.status(403).json({ message: "Website media permission required." });
  }

  return next();
}

function sortMedia(items) {
  return [...items].sort((a, b) => {
    const groupComparison = String(a.groupKey || "").localeCompare(String(b.groupKey || ""));
    return groupComparison || Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
  });
}

function normalizeMedia(input, existing = {}) {
  const videoUrl = input.videoUrl ?? input.video_url ?? existing.videoUrl ?? existing.video_url ?? "";
  return {
    ...existing,
    ...input,
    id: input.id || existing.id || `website-media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sectionKey: input.sectionKey || existing.sectionKey || "custom_section",
    sectionLabel: input.sectionLabel || existing.sectionLabel || input.sectionKey || "Website image",
    groupKey: input.groupKey || existing.groupKey || "sections",
    fallbackImageUrl: input.fallbackImageUrl ?? input.fallback_image_url ?? existing.fallbackImageUrl ?? "",
    imageUrl: input.imageUrl ?? input.image_url ?? existing.imageUrl ?? "",
    videoUrl,
    mediaType: input.mediaType ?? input.media_type ?? existing.mediaType ?? (videoUrl ? "video" : "image"),
    title: input.title ?? existing.title ?? "",
    subtitle: input.subtitle ?? existing.subtitle ?? "",
    linkUrl: input.linkUrl ?? input.link_url ?? existing.linkUrl ?? "",
    sortOrder: Number(input.sortOrder ?? input.sort_order ?? existing.sortOrder ?? 0),
    isActive: input.isActive !== false,
    createdAt: existing.createdAt || input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function hiddenSectionKeys(companyId) {
  return new Set(
    websiteMediaHiddenKeysRepository
      .getByCompany(companyId)
      .map((item) => item.sectionKey)
      .filter(Boolean),
  );
}

function visibleCompanyMedia(companyId, { includeInactive = false } = {}) {
  const hiddenKeys = hiddenSectionKeys(companyId);
  return websiteMediaRepository.getByCompany(companyId).filter(
    (item) => !hiddenKeys.has(item.sectionKey) && (includeInactive || item.isActive !== false),
  );
}

function hideSection(companyId, sectionKey) {
  const normalizedKey = String(sectionKey || "").trim().slice(0, 160);
  if (!normalizedKey) return null;
  const existing = websiteMediaHiddenKeysRepository.findByCompany(
    companyId,
    (item) => item.sectionKey === normalizedKey,
  );
  if (existing) return existing;
  const now = new Date().toISOString();
  return websiteMediaHiddenKeysRepository.createForCompany(companyId, {
    id: `hidden-media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sectionKey: normalizedKey,
    createdAt: now,
    updatedAt: now,
  });
}

function restoreSection(companyId, sectionKey) {
  const existing = websiteMediaHiddenKeysRepository.findByCompany(
    companyId,
    (item) => item.sectionKey === sectionKey,
  );
  return existing
    ? websiteMediaHiddenKeysRepository.deleteForCompany(companyId, existing.id)
    : null;
}

router.get("/", optionalAuth, (req, res) => {
  const hiddenMarkers = [...hiddenSectionKeys(req.companyId)].map((sectionKey) => ({
    sectionKey,
    isHidden: true,
  }));
  res.json([...sortMedia(visibleCompanyMedia(req.companyId)), ...hiddenMarkers]);
});

router.get("/all", requireAuth, requireMediaEditor, (req, res) => {
  res.json({
    items: sortMedia(visibleCompanyMedia(req.companyId, { includeInactive: true })),
    hiddenSectionKeys: [...hiddenSectionKeys(req.companyId)],
  });
});

router.delete("/by-section/:sectionKey", requireAuth, requireMediaEditor, async (req, res) => {
  const sectionKey = String(req.params.sectionKey || "").trim();
  if (!sectionKey) return res.status(400).json({ message: "Website media section key is required." });

  hideSection(req.companyId, sectionKey);
  await persistCompanyStore(req.companyId, { pruneMissing: true });
  return res.json({ sectionKey });
});

router.post("/by-section/:sectionKey/restore", requireAuth, requireMediaEditor, async (req, res) => {
  const sectionKey = String(req.params.sectionKey || "").trim();
  restoreSection(req.companyId, sectionKey);
  await persistCompanyStore(req.companyId, { pruneMissing: true });
  return res.json({ sectionKey });
});

router.get("/:sectionKey", optionalAuth, (req, res) => {
  res.json(sortMedia(visibleCompanyMedia(req.companyId).filter(
    (item) => item.sectionKey === req.params.sectionKey,
  )));
});

router.post("/", requireAuth, requireMediaEditor, async (req, res) => {
  const item = normalizeMedia(req.body);
  restoreSection(req.companyId, item.sectionKey);
  websiteMediaRepository.createForCompany(req.companyId, item);
  await persistCompanyStore(req.companyId, { pruneMissing: true });
  return res.status(201).json(item);
});

router.put("/:id", requireAuth, requireMediaEditor, async (req, res) => {
  const existing = websiteMediaRepository.findByCompany(req.companyId, req.params.id);
  if (!existing) return res.status(404).json({ message: "Website media item not found." });

  const updated = websiteMediaRepository.updateForCompany(
    req.companyId,
    req.params.id,
    normalizeMedia({ ...req.body, id: req.params.id }, existing),
  );
  restoreSection(req.companyId, updated.sectionKey);
  await persistCompanyStore(req.companyId, { pruneMissing: true });
  return res.json(updated);
});

router.delete("/:id", requireAuth, requireMediaEditor, async (req, res) => {
  const existing = websiteMediaRepository.findByCompany(req.companyId, req.params.id);
  if (!existing) return res.status(404).json({ message: "Website media item not found." });

  const removed = websiteMediaRepository.deleteForCompany(req.companyId, req.params.id);
  if (!removed) return res.status(404).json({ message: "Website media item not found." });

  hideSection(req.companyId, existing.sectionKey);
  await persistCompanyStore(req.companyId, { pruneMissing: true });
  return res.json({ id: removed.id, sectionKey: existing.sectionKey });
});

export default router;
