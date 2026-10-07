import crypto from "node:crypto";
import { Router } from "express";
import { tenantBrandRepository } from "../data/store.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import {
  assertAllowedFields,
  catalogError,
  requireTenantPermission,
  sendCatalogError,
  validateLocalized,
  validateOptionalUrl,
  validateSlug,
  validateSortOrder,
} from "./catalogValidation.js";

const router = Router();
const brandFields = new Set(["slug", "name", "logoUrl", "heroVideo", "heroPoster", "headerImage", "menuImage", "country", "sortOrder", "isActive"]);
const BRAND_LIST_KEYS = [
  "id",
  "slug",
  "name",
  "logoUrl",
  "country",
  "sortOrder",
  "isActive",
  "createdAt",
  "updatedAt",
];

function projectBrandForList(brand) {
  const projected = {};
  for (const key of BRAND_LIST_KEYS) {
    projected[key] = brand?.[key] ?? null;
  }
  return projected;
}

function validateText(value, field, { required = false, maxLength = 160 } = {}) {
  if ((value === null || value === "") && !required) return null;
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw catalogError(`${field} must be a non-empty string of ${maxLength} characters or fewer.`);
  }
  return value.trim();
}

function validateBrandName(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return validateLocalized(value, "name", { required: true });
  }
  return validateText(value, "name", { required: true });
}

function validatedBrand(body, current = null) {
  assertAllowedFields(body, brandFields, { requireNonEmpty: Boolean(current) });
  const result = {};
  if (!current || Object.hasOwn(body, "slug")) result.slug = validateSlug(body.slug);
  if (!current || Object.hasOwn(body, "name")) result.name = validateBrandName(body.name);
  if (Object.hasOwn(body, "logoUrl")) result.logoUrl = validateOptionalUrl(body.logoUrl, "logoUrl");
  if (Object.hasOwn(body, "heroVideo")) result.heroVideo = validateOptionalUrl(body.heroVideo, "heroVideo");
  if (Object.hasOwn(body, "heroPoster")) result.heroPoster = validateOptionalUrl(body.heroPoster, "heroPoster");
  if (Object.hasOwn(body, "headerImage")) result.headerImage = validateOptionalUrl(body.headerImage, "headerImage");
  if (Object.hasOwn(body, "menuImage")) result.menuImage = validateOptionalUrl(body.menuImage, "menuImage");
  if (Object.hasOwn(body, "country")) result.country = validateText(body.country, "country", { maxLength: 120 });
  if (Object.hasOwn(body, "sortOrder")) result.sortOrder = validateSortOrder(body.sortOrder);
  if (Object.hasOwn(body, "isActive")) {
    if (typeof body.isActive !== "boolean") throw catalogError("isActive must be a boolean.");
    result.isActive = body.isActive;
  }
  return result;
}

router.get("/", optionalAuth, async (req, res) => {
  try {
    const brands = await tenantBrandRepository.listByCompany(req.companyId);
    // Explicit list projection for CPanel Brands table — omit edit-only media URLs.
    // Default remains full objects for storefront/legacy callers unless view=list.
    if (String(req.query.view || "").toLowerCase() === "list") {
      return res.json(brands.map(projectBrandForList));
    }
    return res.json(brands);
  } catch (error) {
    return sendCatalogError(res, error);
  }
});

router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const brand = await tenantBrandRepository.findByCompany(req.companyId, req.params.id);
    if (!brand) return res.status(404).json({ message: "Brand not found." });
    return res.json(brand);
  } catch (error) {
    return sendCatalogError(res, error);
  }
});

router.post("/", requireAuth, requireTenantPermission("brands", "create"), async (req, res) => {
  try {
    const values = validatedBrand(req.body);
    if (await tenantBrandRepository.findBySlugForCompany(req.companyId, values.slug)) {
      throw catalogError("Brand slug already exists.", 409);
    }
    const now = new Date().toISOString();
    const brand = await tenantBrandRepository.createForCompany(req.companyId, {
      id: crypto.randomUUID(),
      ...values,
      logoUrl: values.logoUrl ?? null,
      heroVideo: values.heroVideo ?? null,
      heroPoster: values.heroPoster ?? null,
      headerImage: values.headerImage ?? null,
      menuImage: values.menuImage ?? null,
      country: values.country ?? null,
      sortOrder: values.sortOrder ?? 0,
      isActive: values.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
    return res.status(201).json(brand);
  } catch (error) {
    return sendCatalogError(res, error, { entity: "brand", operation: "create" });
  }
});

router.patch("/:id/status", requireAuth, requireTenantPermission("brands", "update"), async (req, res) => {
  try {
    assertAllowedFields(req.body, new Set(["isActive"]), { requireNonEmpty: true });
    if (typeof req.body.isActive !== "boolean") throw catalogError("isActive must be a boolean.");
    const updated = await tenantBrandRepository.updateStatusForCompany(req.companyId, req.params.id, req.body.isActive);
    if (!updated) throw catalogError("Brand not found.", 404);
    return res.json(updated);
  } catch (error) {
    return sendCatalogError(res, error, { entity: "brand", operation: "update" });
  }
});

router.patch("/:id", requireAuth, requireTenantPermission("brands", "update"), async (req, res) => {
  try {
    const current = await tenantBrandRepository.findByCompany(req.companyId, req.params.id);
    if (!current) throw catalogError("Brand not found.", 404);
    const values = validatedBrand(req.body, current);
    if (values.slug) {
      const duplicate = await tenantBrandRepository.findBySlugForCompany(req.companyId, values.slug);
      if (duplicate && duplicate.id !== current.id) throw catalogError("Brand slug already exists.", 409);
    }
    const updated = await tenantBrandRepository.updateForCompany(req.companyId, current.id, {
      ...values,
      updatedAt: new Date().toISOString(),
    });
    if (!updated) throw catalogError("Brand not found.", 404);
    return res.json(updated);
  } catch (error) {
    return sendCatalogError(res, error, { entity: "brand", operation: "update" });
  }
});

router.delete("/:id", requireAuth, requireTenantPermission("brands", "delete"), async (req, res) => {
  try {
    const brand = await tenantBrandRepository.findByCompany(req.companyId, req.params.id);
    if (!brand) throw catalogError("Brand not found.", 404);
    if (await tenantBrandRepository.countProductReferencesForCompany(req.companyId, brand.id)) {
      throw catalogError("Brand is referenced by products and cannot be deleted.", 409);
    }
    const removed = await tenantBrandRepository.deleteForCompany(req.companyId, brand.id);
    if (!removed) throw catalogError("Brand not found.", 404);
    return res.status(204).end();
  } catch (error) {
    return sendCatalogError(res, error, { entity: "brand", operation: "delete" });
  }
});

export default router;
