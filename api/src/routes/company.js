import { Router } from "express";
import { companyRepository } from "../data/store.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import {
  THEME_TOKEN_KEYS,
  createPlatformCompanySummary,
  createPublicCompanyContext,
} from "../tenancy/company.js";
import {
  assertAllowedFields,
  catalogError,
  requireTenantPermission,
  validateOptionalUrl,
} from "./catalogValidation.js";
import { listCompanyModules, modulesVisibleToUser } from "../moduleRegistry.js";
import { validateProductSettingsPatch } from "../products/productSettings.js";

const router = Router();

router.get("/resolve", (req, res) => {
  return res.json({
    company: req.company ? { id: req.company.id, name: req.company.name, slug: req.company.slug } : null,
    companyId: req.companyId || null,
    companyHost: req.companyHost || null,
  });
});

router.post("/resolve", (req, res) => {
  return res.json({
    company: req.company ? { id: req.company.id, name: req.company.name, slug: req.company.slug } : null,
    companyId: req.companyId || null,
    companyHost: req.companyHost || null,
  });
});

router.get("/resolve-auth", optionalAuth, (req, res) => {
  return res.json({
    company: req.company ? { id: req.company.id, name: req.company.name, slug: req.company.slug } : null,
    companyId: req.companyId || null,
    companyHost: req.companyHost || null,
    user: req.user ? { id: req.user.id, role: req.user.role } : null,
  });
});

router.get("/resolve-storefront", (req, res) => {
  const host = String(req.query.host || "");
  const path = String(req.query.path || "/");
  const company = companyRepository.resolveStorefront(host, path);
  if (!company) return res.status(404).json({ message: "Storefront company not found or inactive." });
  const summary = createPlatformCompanySummary(company);
  const { adminModules: _internalAdminModules, ...publicSettings } = summary.settings;
  return res.json({
    id: summary.id,
    slug: summary.slug,
    name: summary.name,
    status: summary.status,
    isDefault: summary.isDefault,
    domain: summary.domain,
    storefrontUrl: summary.storefrontUrl,
    storefrontPath: summary.storefrontPath,
    settings: publicSettings,
  });
});
const settingFields = new Set([
  "name",
  "logoUrl",
  "faviconUrl",
  "language",
  "locale",
  "direction",
  "currency",
  "supportEmail",
  "supportPhone",
  "socialLinks",
  "theme",
  // SEO Site Settings
  "siteTitle",
  "metaDescription",
  "metaKeywords",
  // Technical SEO — crawler indexing policy (robots meta + robots.txt)
  "robotsIndexing",
  // Phase H — product merchandising (company_settings.settings)
  "lowStockThreshold",
  "costPriceEnabled",
  "productConditionEnabled",
  "showCouponBoxAtCheckout",
  "ebPointsEnabled",
]);
const socialLinkKeys = new Set([
  "facebook", "instagram", "linkedin", "tiktok", "whatsapp", "x", "youtube",
]);
const themeTokenKeys = new Set(THEME_TOKEN_KEYS);
const safeThemeValue = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function validateNullableText(value, field, maxLength) {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw catalogError(`${field} must be a string of ${maxLength} characters or fewer.`);
  }
  return value.trim();
}

function validateSettingsPatch(body) {
  assertAllowedFields(body, settingFields);
  if (!Object.keys(body).length) throw catalogError("At least one supported setting is required.");
  const changes = {};

  if (Object.hasOwn(body, "name")) {
    const name = validateNullableText(body.name, "name", 120);
    if (!name) throw catalogError("name cannot be empty.");
    changes.name = name;
  }
  for (const field of ["logoUrl", "faviconUrl"]) {
    if (Object.hasOwn(body, field)) changes[field] = validateOptionalUrl(body[field], field);
  }
  if (Object.hasOwn(body, "language")) {
    const language = validateNullableText(body.language, "language", 20);
    if (language && !/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(language)) {
      throw catalogError("language must be a valid language tag.");
    }
    changes.language = language;
  }
  if (Object.hasOwn(body, "locale")) {
    const locale = validateNullableText(body.locale, "locale", 35);
    if (locale && !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale)) {
      throw catalogError("locale must be a valid locale tag.");
    }
    changes.locale = locale;
  }
  if (Object.hasOwn(body, "direction")) {
    if (body.direction !== null && !["ltr", "rtl"].includes(body.direction)) {
      throw catalogError("direction must be ltr or rtl.");
    }
    changes.direction = body.direction;
  }
  if (Object.hasOwn(body, "currency")) {
    const currency = validateNullableText(body.currency, "currency", 3);
    if (currency && !/^[A-Z]{3}$/.test(currency)) {
      throw catalogError("currency must be a three-letter uppercase ISO code.");
    }
    changes.currency = currency;
  }
  if (Object.hasOwn(body, "supportEmail")) {
    const email = validateNullableText(body.supportEmail, "supportEmail", 254);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw catalogError("supportEmail must be a valid email address.");
    }
    changes.supportEmail = email;
  }
  if (Object.hasOwn(body, "supportPhone")) {
    const phone = validateNullableText(body.supportPhone, "supportPhone", 40);
    if (phone && !/^[+\d][\d\s().-]*$/.test(phone)) {
      throw catalogError("supportPhone contains unsupported characters.");
    }
    changes.supportPhone = phone;
  }
  if (Object.hasOwn(body, "socialLinks")) {
    if (!body.socialLinks || typeof body.socialLinks !== "object" || Array.isArray(body.socialLinks)) {
      throw catalogError("socialLinks must be an object.");
    }
    const unknown = Object.keys(body.socialLinks).find((key) => !socialLinkKeys.has(key));
    if (unknown) throw catalogError(`Unknown socialLinks field: ${unknown}.`);
    changes.socialLinks = Object.fromEntries(
      Object.entries(body.socialLinks).map(([key, value]) => [
        key,
        validateOptionalUrl(value, `socialLinks.${key}`, { allowRelative: false }),
      ]),
    );
  }
  if (Object.hasOwn(body, "theme")) {
    if (!body.theme || typeof body.theme !== "object" || Array.isArray(body.theme)) {
      throw catalogError("theme must be an object.");
    }
    const unknown = Object.keys(body.theme).find((key) => !themeTokenKeys.has(key));
    if (unknown) throw catalogError(`Unknown theme token: ${unknown}.`);
    changes.theme = Object.fromEntries(
      Object.entries(body.theme).map(([key, value]) => {
        if (value === null || value === "") return [key, null];
        if (typeof value !== "string" || !safeThemeValue.test(value.trim())) {
          throw catalogError(`theme.${key} must be a safe CSS color value.`);
        }
        return [key, value.trim()];
      }),
    );
  }
  if (Object.hasOwn(body, "siteTitle")) {
    changes.siteTitle = validateNullableText(body.siteTitle, "siteTitle", 120);
  }
  if (Object.hasOwn(body, "metaDescription")) {
    changes.metaDescription = validateNullableText(body.metaDescription, "metaDescription", 320);
  }
  if (Object.hasOwn(body, "metaKeywords")) {
    changes.metaKeywords = validateNullableText(body.metaKeywords, "metaKeywords", 500);
  }
  if (Object.hasOwn(body, "robotsIndexing")) {
    if (body.robotsIndexing !== null && !["index,follow", "noindex,nofollow"].includes(body.robotsIndexing)) {
      throw catalogError("robotsIndexing must be index,follow or noindex,nofollow.");
    }
    changes.robotsIndexing = body.robotsIndexing;
  }
  if (Object.hasOwn(body, "ebPointsEnabled")) {
    if (typeof body.ebPointsEnabled !== "boolean") {
      throw catalogError("ebPointsEnabled must be a boolean.");
    }
    changes.ebPointsEnabled = body.ebPointsEnabled;
  }
  validateProductSettingsPatch(body, changes);
  return changes;
}

function authenticatedContext(req, company) {
  return createPublicCompanyContext(company, {
    host: req.user ? "" : req.companyHost,
    includeBrandingDefaults: Boolean(req.user),
    includeAdminSettings: Boolean(req.user),
  });
}

router.get("/context", optionalAuth, async (req, res) => {
  const company = companyRepository.getCompanyById(req.companyId) || req.company;
  const context = authenticatedContext(req, company);
  if (!req.user || !company?.id) return res.json(context);
  const modules = modulesVisibleToUser(await listCompanyModules(company.id), req.user);
  return res.json({ ...context, modules });
});

router.get(
  "/settings",
  requireAuth,
  requireTenantPermission("company_settings", "view"),
  (req, res) => {
    const company = companyRepository.getCompanyById(req.companyId);
    if (!company) return res.status(404).json({ message: "Company not found." });
    const context = createPublicCompanyContext(company, {
      includeBrandingDefaults: true,
      includeAdminSettings: true,
    });
    return res.json({ name: context.name, ...context.settings });
  },
);

router.patch(
  "/settings",
  requireAuth,
  requireTenantPermission("company_settings", "update"),
  async (req, res) => {
    try {
      const current = companyRepository.getCompanyById(req.companyId);
      if (!current) throw catalogError("Company not found.", 404);
      const changes = validateSettingsPatch(req.body);
      const { name, ...settingChanges } = changes;
      const updated = await companyRepository.updateCompanyBrandingAndSettings(current.id, {
        ...(name ? { name } : {}),
        settingsPatch: settingChanges,
      });
      const context = createPublicCompanyContext(updated, {
        includeBrandingDefaults: true,
        includeAdminSettings: true,
      });
      return res.json({ name: context.name, ...context.settings });
    } catch (error) {
      const status = Number(error?.statusCode || 500);
      if (status >= 500) console.error("Company settings update failed:", error?.message || error);
      return res.status(status).json({
        message: status >= 500 ? "Company settings update failed." : error.message,
      });
    }
  },
);

export default router;
