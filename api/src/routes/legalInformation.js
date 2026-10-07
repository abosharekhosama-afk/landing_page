import { Router } from "express";
import { legalInformationRepository, persistCompanyStore, websiteMediaRepository } from "../data/store.js";
import { recordActivityLog } from "../activityLog/logger.js";
import { requireAuth, requireAnyPermission } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const placements = new Set(["FOOTER", "CHECKOUT", "STANDALONE_PAGE"]);

function validate(input = {}) {
  if (typeof input.business_information !== "object" || Array.isArray(input.business_information)) return "business_information must be an object.";
  if (!Array.isArray(input.placements)) return "placements must be an array.";
  if (input.placements.some((value) => !placements.has(String(value)))) return "Invalid display location.";
  for (const [key, max] of [["registration_number", 160], ["authority_name", 200]]) {
    if (input[key] != null && String(input[key]).length > max) return `${key} is too long.`;
  }
  if (input.authority_logo_media_id != null && String(input.authority_logo_media_id).length > 200) return "authority_logo_media_id is invalid.";
  if (input.authority_logo_url != null && String(input.authority_logo_url).length > 2048) return "authority_logo_url is invalid.";
  return null;
}

function withLogoUrl(companyId, item) {
  if (!item) return null;
  const media = item.authority_logo_media_id
    ? websiteMediaRepository.findByCompany(companyId, item.authority_logo_media_id)
    : null;
  return { ...item, authority_logo_url: item.authority_logo_url || media?.imageUrl || media?.image_url || "" };
}

router.get("/", requireAnyPermission("legal_information.view", "legal_information.manage"), (req, res) => {
  return res.json(withLogoUrl(req.companyId, legalInformationRepository.getByCompany(req.companyId)[0] || null));
});

router.patch("/", requireAnyPermission("legal_information.manage"), async (req, res, next) => {
  try {
    const current = legalInformationRepository.getByCompany(req.companyId)[0] || null;
    const merged = { ...(current || {}), ...(req.body || {}) };
    const error = validate(merged);
    if (error) return res.status(400).json({ message: error });
    const now = new Date().toISOString();
    let item;
    if (current) {
      item = legalInformationRepository.updateForCompany(req.companyId, current.id, {
        registration_number: String(merged.registration_number || "").trim(),
        authority_name: String(merged.authority_name || "").trim(),
        authority_logo_media_id: String(merged.authority_logo_media_id || "").trim(),
        authority_logo_url: String(merged.authority_logo_url || "").trim(),
        business_information: merged.business_information || {},
        placements: [...new Set(merged.placements)],
        updated_at: now,
      });
    } else {
      item = legalInformationRepository.createForCompany(req.companyId, {
        id: `legal-${req.companyId}`,
        company_id: req.companyId,
        registration_number: String(merged.registration_number || "").trim(),
        authority_name: String(merged.authority_name || "").trim(),
        authority_logo_media_id: String(merged.authority_logo_media_id || "").trim(),
        authority_logo_url: String(merged.authority_logo_url || "").trim(),
        business_information: merged.business_information || {},
        placements: [...new Set(merged.placements)],
        created_at: now,
        updated_at: now,
      });
    }
    await persistCompanyStore(req.companyId);
    await recordActivityLog({ req, companyId: req.companyId, action: current ? "LEGAL_INFORMATION_UPDATED" : "LEGAL_INFORMATION_CREATED", entityType: "LEGAL_INFORMATION", entityId: item.id, beforeData: current, afterData: item, summary: "Business and legal information updated" });
    return res.json(withLogoUrl(req.companyId, item));
  } catch (error) { return next(error); }
});

router.delete("/", requireAnyPermission("legal_information.manage"), async (req, res, next) => {
  try {
    const current = legalInformationRepository.getByCompany(req.companyId)[0];
    if (!current) return res.status(404).json({ message: "Business and legal information not found." });
    legalInformationRepository.deleteForCompany(req.companyId, current.id);
    await persistCompanyStore(req.companyId, { pruneMissing: true });
    await recordActivityLog({ req, companyId: req.companyId, action: "LEGAL_INFORMATION_DELETED", entityType: "LEGAL_INFORMATION", entityId: current.id, beforeData: current, summary: "Business and legal information deleted" });
    return res.status(204).end();
  } catch (error) { return next(error); }
});

export default router;
