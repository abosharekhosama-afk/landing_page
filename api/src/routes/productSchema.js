import { Router } from "express";
import {
  companyProductSchemaRepository,
  companyRepository,
  persistCompanyStore,
} from "../data/store.js";
import { optionalAuth, requireAnyPermission, requireAuth } from "../middleware/auth.js";
import { isProductSettingsModuleEnabled } from "../tenancy/company.js";
import {
  resolveDefaultProductSchema,
  sanitizeProductSchema,
} from "../productSchema/schema.js";

export const publicProductSchemaRouter = Router();
export const adminProductSchemaRouter = Router();

function schemaForCompany(companyId) {
  const record = companyProductSchemaRepository.findByCompany(companyId, (item) => item.id === `product-schema-${companyId}`)
    || companyProductSchemaRepository.findByCompany(companyId, () => true);
  return record?.schema || resolveDefaultProductSchema(companyId);
}

publicProductSchemaRouter.get("/", optionalAuth, (req, res) => {
  res.json(schemaForCompany(req.companyId));
});

function requireProductSettingsModule(req, res, next) {
  const company = companyRepository.getCompanyById(req.companyId);
  if (!company) return res.status(404).json({ message: "Company not found." });
  if (!isProductSettingsModuleEnabled(company)) {
    return res.status(403).json({
      message: "Product Settings module is not enabled for this company.",
    });
  }
  return next();
}

const schemaRead = requireAnyPermission("product_settings.view", "product_settings.manage");
const schemaWrite = requireAnyPermission("product_settings.manage");

adminProductSchemaRouter.use(requireAuth, requireProductSettingsModule);

adminProductSchemaRouter.get("/", schemaRead, (req, res) => {
  res.json(schemaForCompany(req.companyId));
});

adminProductSchemaRouter.patch("/", schemaWrite, async (req, res) => {

  try {
    const schema = sanitizeProductSchema(req.body);
    const current = companyProductSchemaRepository.findByCompany(req.companyId, () => true);
    const now = new Date().toISOString();
    const record = {
      id: current?.id || `product-schema-${req.companyId}`,
      schema,
      createdAt: current?.createdAt || now,
      updatedAt: now,
    };
    if (current) companyProductSchemaRepository.updateForCompany(req.companyId, current.id, record);
    else companyProductSchemaRepository.createForCompany(req.companyId, record);
    await persistCompanyStore(req.companyId);
    return res.json(schema);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Unable to save product schema.",
    });
  }
});
