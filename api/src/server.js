import cors from "cors";
import compression from "compression";
import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCompany } from "./middleware/company.js";
import { enforceIpBlock } from "./middleware/ipBlock.js";
import { enforceCompanyModuleAccess } from "./middleware/moduleAccess.js";
import { sanitizeTenantRequestBody } from "./middleware/tenantInput.js";
import { companies, companyDomains } from "./data/store.js";
import { normalizeCompanyHost } from "./tenancy/company.js";
import { websiteConnectionSettings } from "./siteEditor/websiteConnection.js";
import { cpanelOrigins } from "./cpanel.js";
import adminRoutes from "./routes/admin.js";
import addressRoutes from "./routes/addresses.js";
import authRoutes from "./routes/auth.js";
import cartRoutes from "./routes/cart.js";
import favoritesRoutes from "./routes/favorites.js";
import brandRoutes from "./routes/brands.js";
import categoryRoutes from "./routes/categories.js";
import companyRoutes from "./routes/company.js";
import customModuleRoutes from "./routes/customModules.js";
import employeeRoutes from "./routes/employee.js";
import homeOfferRoutes from "./routes/homeOffers.js";
import smsRoutes from "./routes/sms.js";
import smsProviderRoutes from "./routes/admin/smsProviders.js";
import announcementRoutes from "./routes/announcements.js";
import splashAdRoutes from "./routes/splashAds.js";
import policyRoutes from "./routes/policies.js";
import legalInformationRoutes from "./routes/legalInformation.js";
import securityRoutes from "./routes/security.js";
import orderRoutes from "./routes/orders.js";
import platformRoutes from "./routes/platform.js";
import productRoutes from "./routes/products.js";
import productFieldDefinitionRoutes from "./routes/productFieldDefinitions.js";
import { adminProductSchemaRouter, publicProductSchemaRouter } from "./routes/productSchema.js";
import reviewRoutes from "./routes/reviews.js";
import uploadRoutes, { uploadsDir } from "./routes/uploads.js";
import workSessionRoutes from "./routes/workSessions.js";
import invoiceRoutes from "./routes/invoices.js";
import { publicRouter as deliveryPublicRouter, adminRouter as deliveryAdminRouter } from "./routes/deliveryZones.js";
import automaticDiscountRoutes from "./routes/automaticDiscounts.js";
import adminBundleRoutes from "./routes/adminBundles.js";
import publicBundleRoutes from "./routes/publicBundles.js";
import { adminRouter as couponAdminRouter, publicRouter as couponPublicRouter } from "./routes/coupons.js";
import activityLogRoutes from "./routes/activityLog.js";
import dropshippingRoutes from "./routes/dropshipping.js";
import adminDropshippingRoutes from "./routes/adminDropshipping.js";
import velvetDropshippingRoutes from "./routes/velvetDropshipping.js";
import adminVelvetDropshippingRoutes from "./routes/adminVelvetDropshipping.js";
import reportsRoutes from "./routes/reports.js";
import dashboardInsightsRoutes from "./routes/dashboardInsights.js";
import analyticsAdminRoutes from "./routes/analyticsAdmin.js";
import inboxRoutes from "./routes/inbox.js";
import inventoryRoutes from "./routes/inventory.js";
import adminProductsRoutes from "./routes/adminProducts.js";
import adminProductDisplayPriorityRoutes from "./routes/adminProductDisplayPriority.js";
import websiteMediaRoutes from "./routes/websiteMedia.js";
import siteEditorRoutes from "./routes/siteEditor.js";
import sitesRoutes from "./routes/sites.js";
import storefrontRoutes from "./routes/storefront.js";
import {
  adminWebsiteTextsRouter,
  publicWebsiteTextsRouter,
} from "./routes/websiteTexts.js";
import vlogRoutes from "./routes/vlogs.js";

const app = express();
const port = Number(process.env.PORT || 5000);
const isProduction = process.env.NODE_ENV === "production";
const localDevelopmentOrigins = [
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173",
];
const ebChemicalProductionOrigins = [
  "https://ebchemi.com",
  "https://www.ebchemi.com",
];
const iGroupProductionOrigins = [
  "https://igroup.website",
  "https://www.igroup.website",
];
const existingEbFrontendOrigin = "https://eb-chemical-full.vercel.app";

function normalizeOrigin(origin = "") {
  return origin.trim().replace(/\/+$/, "");
}

function parseAllowedOrigins(value = "") {
  return [...new Set(value.split(",").map(normalizeOrigin).filter(Boolean))];
}

function isLocalDevelopmentOrigin(origin) {
  if (isProduction) return false;
  try {
    const url = new URL(origin);
    return url.protocol === "http:"
      && ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
      && Boolean(url.port);
  } catch {
    return false;
  }
}

function dynamicStorefrontOrigins() {
  const origins = [];
  for (const entry of companyDomains) {
    if (entry.is_active && entry.is_verified) {
      origins.push(`https://${entry.domain}`);
    }
  }
  return origins;
}

const configuredOrigins = parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);
const fallbackFrontendOrigin = normalizeOrigin(process.env.FRONTEND_ORIGIN);
const deploymentOrigins = configuredOrigins.length
  ? configuredOrigins
  : [fallbackFrontendOrigin || existingEbFrontendOrigin, existingEbFrontendOrigin];

if (deploymentOrigins.includes("*")) {
  throw new Error("Wildcard CORS origins are not supported. Configure exact frontend origins.");
}

function isAllowedStorefrontOrigin(origin) {
  const normalizedOrigin = normalizeOrigin(origin);
  try {
    const url = new URL(normalizedOrigin);
    if (url.protocol !== "https:") return false;
    const hostname = normalizeCompanyHost(url.hostname);
    if (!hostname) return false;
    for (const entry of companyDomains) {
      if (entry.is_active && entry.is_verified && normalizeCompanyHost(entry.domain) === hostname) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

function isAllowedConnectedStorefrontOrigin(origin) {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;
  return companies.some((company) => {
    const connection = websiteConnectionSettings(company);
    if (!connection?.storefrontBaseUrl) return false;
    try {
      return normalizeOrigin(new URL(connection.storefrontBaseUrl).origin) === normalizedOrigin;
    } catch {
      return false;
    }
  });
}

app.set("trust proxy", 1);
app.use(
  compression({
    filter(req, res) {
      // Do not recompress already-optimized image binaries under /uploads or image responses.
      if (req.path?.startsWith("/uploads")) return false;
      const type = res.getHeader("Content-Type");
      if (typeof type === "string" && /^image\//i.test(type)) return false;
      return compression.filter(req, res);
    },
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = normalizeOrigin(origin);
      const allowed = deploymentOrigins.includes(normalizedOrigin)
        || ebChemicalProductionOrigins.includes(normalizedOrigin)
        || iGroupProductionOrigins.includes(normalizedOrigin)
        || cpanelOrigins.includes(normalizedOrigin)
        || isLocalDevelopmentOrigin(normalizedOrigin)
        || isAllowedStorefrontOrigin(normalizedOrigin)
        || isAllowedConnectedStorefrontOrigin(normalizedOrigin);
      return callback(null, allowed);
    },
    credentials: true,
  }),
);
app.use("/uploads", express.static(uploadsDir));
app.use(express.json({ limit: "1mb" }));
app.use(sanitizeTenantRequestBody);
app.use(resolveCompany);
app.use(enforceIpBlock);
app.use(enforceCompanyModuleAccess);
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "eb-chemical-backend" });
});

app.use("/api/company", companyRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/platform", platformRoutes);
app.use("/api/products", productRoutes);
app.use("/api/admin/inventory", inventoryRoutes);
app.use("/api/admin/products", adminProductsRoutes);
app.use("/api/admin/product-display-priority", adminProductDisplayPriorityRoutes);
app.use("/api/storefront", storefrontRoutes);
app.use("/api/product-schema", publicProductSchemaRouter);
app.use("/api/auth", authRoutes);
app.use("/api/dropshipping", dropshippingRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/home-offers", homeOfferRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/admin/custom-modules", customModuleRoutes);
app.use("/api/admin/product-schema", adminProductSchemaRouter);
app.use("/api/admin", productFieldDefinitionRoutes);
app.use("/api/admin/invoices", invoiceRoutes);
app.use("/api/admin/delivery-zones", deliveryAdminRouter);
app.use("/api/admin/discounts", automaticDiscountRoutes);
app.use("/api/admin/bundles", adminBundleRoutes);
app.use("/api/bundles", publicBundleRoutes);
app.use("/api/admin/coupons", couponAdminRouter);
app.use("/api/coupons", couponPublicRouter);
app.use("/api/admin/sms", smsRoutes);
app.use("/api/admin/sms/providers", smsProviderRoutes);
app.use("/api/admin/announcements", announcementRoutes);
app.use("/api/admin/splash-ads", splashAdRoutes);
app.use("/api/admin/policies", policyRoutes);
app.use("/api/admin/legal-information", legalInformationRoutes);
app.use("/api/admin/security", securityRoutes);
app.use("/api/admin/dropshipping", adminDropshippingRoutes);
app.use("/api/velvet-dropshipping", velvetDropshippingRoutes);
app.use("/api/admin/velvet-dropshipping", adminVelvetDropshippingRoutes);
app.use("/api/admin/inbox", inboxRoutes);
app.use("/api/admin/website-texts", adminWebsiteTextsRouter);
app.use("/api/admin/sites", sitesRoutes);
app.use("/api/admin/vlogs", vlogRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/delivery-zones", deliveryPublicRouter);
app.use("/api/admin/activity-log", activityLogRoutes);
app.use("/api/admin/reports", reportsRoutes);
app.use("/api/admin/dashboard", dashboardInsightsRoutes);
app.use("/api/admin/analytics", analyticsAdminRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/work-sessions", workSessionRoutes);
app.use("/api/website-media", websiteMediaRoutes);
app.use("/api/site-editor", siteEditorRoutes);
app.use("/api/website-texts", publicWebsiteTextsRouter);

app.use((_req, res) => {
  res.status(404).json({ message: "API route not found." });
});

function setCorsOnError(err, req, res) {
  const origin = req.headers?.origin || req.headers?.["Origin"] || "";
  const normalizedOrigin = normalizeOrigin(String(origin));
  const allowed = deploymentOrigins.includes(normalizedOrigin)
    || ebChemicalProductionOrigins.includes(normalizedOrigin)
    || iGroupProductionOrigins.includes(normalizedOrigin)
    || cpanelOrigins.includes(normalizedOrigin)
    || isLocalDevelopmentOrigin(normalizedOrigin)
    || isAllowedStorefrontOrigin(normalizedOrigin)
    || isAllowedConnectedStorefrontOrigin(normalizedOrigin);
  if (normalizedOrigin && allowed) {
    res.setHeader("Access-Control-Allow-Origin", normalizedOrigin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "https://ebchemi.com");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Company-Id, x-company-id, X-Site-Id, x-site-id");
  res.setHeader("Access-Control-Allow-Credentials", "true");
}

app.use((err, req, res, _next) => {
  console.error("Unhandled route error:", err?.message || err);
  setCorsOnError(err, req, res);
  res.status(500).json({ message: "Internal server error." });
});

export async function startServer(listenPort = port) {
  process.on("uncaughtException", (err) => {
    console.error("Fatal uncaught exception:", err?.message || err);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason?.message || reason);
  });
  if (process.env.NODE_ENV === "development" && process.env.VELVET_LOCAL_OPT_IN) {
    const { CPANEL_MODULE_DEFINITIONS, replaceCompanyModules } = await import("./moduleRegistry.js");
    await replaceCompanyModules(process.env.VELVET_LOCAL_OPT_IN, CPANEL_MODULE_DEFINITIONS
      .filter((entry) => entry.module_key.startsWith("company_dropship."))
      .map((entry) => ({ module_key: entry.module_key, enabled: true, sort_order: entry.sort_order })));
  }
  return app.listen(listenPort, "0.0.0.0", () => {
    console.log(`EB Chemical API running on http://0.0.0.0:${listenPort}`);
  });
}

export { app };

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entryPath === path.resolve(fileURLToPath(import.meta.url))) {
  startServer();
}
