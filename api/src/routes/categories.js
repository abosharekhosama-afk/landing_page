import crypto from "node:crypto";
import { Router } from "express";
import { tenantBrandRepository, tenantCategoryRepository } from "../data/store.js";
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
const categoryFields = new Set([
  "slug", "name", "description", "parentId", "brandId", "imageUrl", "heroVideo", "sortOrder", "isActive",
]);

// Kids Velvet owns a strict Brand -> Main Category -> Subcategory hierarchy:
// a Main Category must carry an explicit brandId and a Subcategory must point
// to a Main Category (brand is inherited from the parent). Other tenants keep
// the legacy flat category behavior untouched (iCare etc.).
const KIDS_VELVET_COMPANY_ID = "kids-velvet";

function isKidsVelvetCompany(companyId) {
  return String(companyId || "") === KIDS_VELVET_COMPANY_ID;
}

async function assertBrandExistsForCompany(companyId, brandId) {
  if (!brandId) return null;
  const brand = await tenantBrandRepository.findByCompany(companyId, brandId);
  if (!brand) throw catalogError("Brand not found.", 404);
  if (brand.isActive === false) throw catalogError("Brand is inactive.");
  return brand;
}

// Applies the Kids Velvet hierarchy rules to a category payload:
//   - Main Category: brandId required.
//   - Subcategory: parent required and must be a Main Category; brandId is
//     inherited from the parent when omitted (never required on the sub).
async function applyKidsVelvetRules(companyId, category, { current = null } = {}) {
  const parentId = Object.hasOwn(category, "parentId") ? category.parentId : current?.parentId || null;
  const brandId = Object.hasOwn(category, "brandId") ? category.brandId : current?.brandId || null;

  if (parentId) {
    const parent = await tenantCategoryRepository.findByCompany(companyId, parentId);
    if (!parent) throw catalogError("Parent category not found.", 404);
    if (parent.parentId) {
      throw catalogError("Parent category must be a Main Category (a Subcategory cannot have a Subcategory parent).");
    }
    if (brandId) {
      await assertBrandExistsForCompany(companyId, brandId);
    }
    // Inherit the parent's brand (never required on a Subcategory).
    return { ...category, brandId: brandId || parent.brandId || null };
  }

  // Main Category (no parent).
  await assertBrandExistsForCompany(companyId, brandId);
  if (!brandId) {
    throw catalogError("brandId is required for a Main Category.");
  }
  return category;
}

function validatedCategory(body, current = null) {
  assertAllowedFields(body, categoryFields, { requireNonEmpty: Boolean(current) });
  const result = {};
  if (!current || Object.hasOwn(body, "slug")) result.slug = validateSlug(body.slug);
  if (!current || Object.hasOwn(body, "name")) {
    result.name = validateLocalized(body.name, "name", { required: true });
  }
  if (Object.hasOwn(body, "description")) {
    result.description = validateLocalized(body.description, "description");
  }
  if (Object.hasOwn(body, "parentId")) {
    if (body.parentId !== null && typeof body.parentId !== "string") {
      throw catalogError("parentId must be a string or null.");
    }
    result.parentId = body.parentId?.trim() || null;
  }
  if (Object.hasOwn(body, "brandId")) {
    if (body.brandId !== null && typeof body.brandId !== "string") {
      throw catalogError("brandId must be a string or null.");
    }
    result.brandId = body.brandId?.trim() || null;
  }
  if (Object.hasOwn(body, "imageUrl")) result.imageUrl = validateOptionalUrl(body.imageUrl, "imageUrl");
  if (Object.hasOwn(body, "heroVideo")) result.heroVideo = validateOptionalUrl(body.heroVideo, "heroVideo");
  if (Object.hasOwn(body, "sortOrder")) result.sortOrder = validateSortOrder(body.sortOrder);
  if (Object.hasOwn(body, "isActive")) {
    if (typeof body.isActive !== "boolean") throw catalogError("isActive must be a boolean.");
    result.isActive = body.isActive;
  }
  return result;
}


router.get("/", optionalAuth, async (req, res) => {
  try {
    return res.json(await tenantCategoryRepository.listByCompany(req.companyId));
  } catch (error) {
    return sendCatalogError(res, error);
  }
});

router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const category = await tenantCategoryRepository.findByCompany(req.companyId, req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found." });
    return res.json(category);
  } catch (error) {
    return sendCatalogError(res, error);
  }
});

router.post("/", requireAuth, requireTenantPermission("categories", "create"), async (req, res) => {
  try {
    const values = validatedCategory(req.body);
    if (await tenantCategoryRepository.findBySlugForCompany(req.companyId, values.slug)) {
      throw catalogError("Category slug already exists.", 409);
    }
    if (values.parentId && !(await tenantCategoryRepository.validateParentForCompany(req.companyId, values.parentId))) {
      throw catalogError("Parent category not found.", 404);
    }
    // Kids Velvet: Main Category must carry a tenant-scoped brandId; a
    // Subcategory inherits its brand from its Main Category parent.
    const finalValues = isKidsVelvetCompany(req.companyId)
      ? await applyKidsVelvetRules(req.companyId, values)
      : values;
    if (finalValues.brandId) {
      await assertBrandExistsForCompany(req.companyId, finalValues.brandId);
    }
    const now = new Date().toISOString();
    const category = await tenantCategoryRepository.createForCompany(req.companyId, {
      id: crypto.randomUUID(),
      ...finalValues,
      description: finalValues.description ?? null,
      parentId: finalValues.parentId ?? null,
      brandId: finalValues.brandId ?? null,
      imageUrl: finalValues.imageUrl ?? null,
      heroVideo: finalValues.heroVideo ?? null,
      sortOrder: finalValues.sortOrder ?? 0,
      isActive: finalValues.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
    return res.status(201).json(category);
  } catch (error) {
    return sendCatalogError(res, error, { entity: "category", operation: "create" });
  }
});

router.patch("/:id/status", requireAuth, requireTenantPermission("categories", "update"), async (req, res) => {
  try {
    assertAllowedFields(req.body, new Set(["isActive"]), { requireNonEmpty: true });
    if (typeof req.body.isActive !== "boolean") throw catalogError("isActive must be a boolean.");
    const updated = await tenantCategoryRepository.updateStatusForCompany(
      req.companyId,
      req.params.id,
      req.body.isActive,
    );
    if (!updated) throw catalogError("Category not found.", 404);
    return res.json(updated);
  } catch (error) {
    return sendCatalogError(res, error, { entity: "category", operation: "update" });
  }
});

router.patch("/:id", requireAuth, requireTenantPermission("categories", "update"), async (req, res) => {
  try {
    const current = await tenantCategoryRepository.findByCompany(req.companyId, req.params.id);
    if (!current) throw catalogError("Category not found.", 404);
    const values = validatedCategory(req.body, current);
    if (values.slug) {
      const duplicate = await tenantCategoryRepository.findBySlugForCompany(req.companyId, values.slug);
      if (duplicate && duplicate.id !== current.id) throw catalogError("Category slug already exists.", 409);
    }
    if (Object.hasOwn(values, "parentId")) {
      if (values.parentId && !(await tenantCategoryRepository.validateParentForCompany(req.companyId, values.parentId))) {
        throw catalogError("Parent category not found.", 404);
      }
      if (await tenantCategoryRepository.parentWouldCycle(req.companyId, current.id, values.parentId)) {
        throw catalogError("Category parent would create a cycle.");
      }
    }
    // Kids Velvet: re-derive ownership on the resulting category. A Subcategory
    // inherits its Main Category parent's brand; a Main Category requires a
    // tenant-scoped brandId.
    const resultingValues = isKidsVelvetCompany(req.companyId)
      ? await applyKidsVelvetRules(req.companyId, { ...current, ...values })
      : values;
    if (resultingValues.brandId) {
      await assertBrandExistsForCompany(req.companyId, resultingValues.brandId);
    }
    const updated = await tenantCategoryRepository.updateForCompany(req.companyId, current.id, {
      ...resultingValues,
      brandId: resultingValues.brandId,
      updatedAt: new Date().toISOString(),
    });
    if (!updated) throw catalogError("Category not found.", 404);
    return res.json(updated);
  } catch (error) {
    return sendCatalogError(res, error, { entity: "category", operation: "update" });
  }
});

router.delete("/:id", requireAuth, requireTenantPermission("categories", "delete"), async (req, res) => {
  try {
    const category = await tenantCategoryRepository.findByCompany(req.companyId, req.params.id);
    if (!category) throw catalogError("Category not found.", 404);
    if (await tenantCategoryRepository.countChildrenForCompany(req.companyId, category.id)) {
      throw catalogError("Category has child categories and cannot be deleted.", 409);
    }
    if (await tenantCategoryRepository.countProductReferencesForCompany(req.companyId, category.id)) {
      throw catalogError("Category is referenced by products and cannot be deleted.", 409);
    }
    const removed = await tenantCategoryRepository.deleteForCompany(req.companyId, category.id);
    if (!removed) throw catalogError("Category not found.", 404);
    return res.status(204).end();
  } catch (error) {
    return sendCatalogError(res, error, { entity: "category", operation: "delete" });
  }
});

export default router;
