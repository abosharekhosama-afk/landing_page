import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { listTenantFieldDefinitions, listTenantProductFieldValues, replaceTenantProductFieldValues } from "../productSchema/fieldValues.js";

const router = Router();
router.use(requireAuth);
const can = (req, permission) => ["admin", "company_admin", "super_admin"].includes(req.membershipRole) || req.user?.permissions?.includes(permission);

function sendFieldValueError(req, res, error) {
  if (error?.statusCode) return res.status(error.statusCode).json({ message: error.message });
  console.error("Product field value persistence failed", {
    code: error?.code || "UNKNOWN",
    constraint: error?.constraint || "",
  });
  const arabic = String(req.headers["accept-language"] || "").toLowerCase().startsWith("ar");
  if (error?.code === "23505") {
    return res.status(409).json({
      code: "PRODUCT_FIELD_VALUE_CONFLICT",
      message: arabic
        ? "تعذر حفظ محتوى المنتج بسبب تعارض في القيم. أعد تحميل المنتج وحاول مرة أخرى."
        : "Product content values conflict with existing data. Reload the product and try again.",
    });
  }
  return res.status(500).json({
    code: "PRODUCT_FIELD_VALUE_SAVE_FAILED",
    message: arabic ? "تعذر حفظ محتوى المنتج." : "Product content could not be saved.",
  });
}

router.get("/product-field-definitions", async (req, res, next) => {
  if (!["products.read", "products.view", "products.manage", "product_content.manage"].some((permission) => can(req, permission))) return res.status(403).json({ message: "Product permission required." });
  try { return res.json(await listTenantFieldDefinitions(req.companyId)); } catch (error) { return next(error); }
});
router.get("/products/:productId/field-values", async (req, res, next) => {
  if (!["products.read", "products.view", "product_content.manage", "products.manage"].some((permission) => can(req, permission))) return res.status(403).json({ message: "Product content permission required." });
  try { return res.json(await listTenantProductFieldValues(req.companyId, req.params.productId)); }
  catch (error) { return error.statusCode ? res.status(error.statusCode).json({ message: error.message }) : next(error); }
});
router.put("/products/:productId/field-values", async (req, res, next) => {
  if (!["product_content.manage", "products.manage", "products.update"].some((permission) => can(req, permission))) return res.status(403).json({ message: "Product content permission required." });
  try { return res.json(await replaceTenantProductFieldValues(req.companyId, req.params.productId, req.body?.values)); }
  catch (error) { return sendFieldValueError(req, res, error); }
});

export default router;
