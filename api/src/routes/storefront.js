import { Router } from "express";
import {
  companyRepository,
  getCompanyDomainsByCompany,
  listProductDisplayModes,
  listProductDisplayPositions,
  orderRepository,
  productRepository,
  storePolicyRepository,
  tenantBrandRepository,
  tenantCategoryRepository,
  websiteMediaHiddenKeysRepository,
  websiteMediaRepository,
  websiteTextsRepository,
} from "../data/store.js";
import { publicProductSerializeOptions } from "../products/productSettings.js";
import { isProductTrashed } from "../products/trashLifecycle.js";
import {
  DISPLAY_SURFACES,
  displayConfigFromRow,
  resolveDisplayPriority,
} from "../products/displayPriority.js";
import { verifiedUnitsByProductId } from "../products/verifiedSales.js";
import { attachPublicProductRelations, attachPublicProductRelationsBatch } from "../products/attachPublicRelations.js";
import { normalizeCompanyHost } from "../tenancy/company.js";
import { websiteConnectionDefaults, websiteConnectionSettings } from "../siteEditor/websiteConnection.js";
import {
  serializePublicBrand,
  serializePublicCategory,
  serializePublicProduct,
  serializePublicWebsiteMedia,
  serializePublicWebsiteText,
} from "../storefront/publicContent.js";
import { buildPublicEngagementContent } from "../storefront/publicEngagement.js";
import { serializePublicProductFilterDefinitionsFromProducts } from "../catalog/productFilterAttributes.js";
import {
  publicVlogHeroForCompany,
  publicVlogsForCompany,
} from "../storefront/vlogsContent.js";
import analyticsPublicRoutes from "./analyticsPublic.js";
import { trackSplashEvent } from "./splashAds.js";
import { preferWebpUploadUrl } from "../uploads/preferWebpUploadUrl.js";
import {
  STOREFRONT_PUBLIC_PATHS,
  buildRobotsTxt,
  buildSitemapXml,
  normalizeSeoRobotsValue,
  storefrontPageUrl,
  storefrontSiteUrl,
} from "../storefront/seoContent.js";

const router = Router();
const localePattern = /^[a-z]{2}(?:-[a-z]{2})?$/i;

const seoContentTypes = {
  robots: "text/plain; charset=utf-8",
  sitemap: "application/xml; charset=utf-8",
};

function storefrontSeoNotFound(res) {
  return res.status(404).json({ message: "Storefront not found." });
}

router.get("/robots.txt", (req, res) => {
  if (!req.company || !req.companyId) return storefrontSeoNotFound(res);
  const connection = websiteConnectionSettings(req.company) || websiteConnectionDefaults(req.company);
  const robotsIndexing = normalizeSeoRobotsValue(req.company.settings?.robotsIndexing);
  const siteUrl = storefrontSiteUrl(req.company, connection);
  res.setHeader("Content-Type", seoContentTypes.robots);
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  return res.send(buildRobotsTxt({ siteUrl, robotsIndexing }));
});

router.get("/sitemap.xml", (req, res) => {
  if (!req.company || !req.companyId) return storefrontSeoNotFound(res);
  const connection = websiteConnectionSettings(req.company) || websiteConnectionDefaults(req.company);
  const siteUrl = storefrontSiteUrl(req.company, connection);
  if (!siteUrl) return storefrontSeoNotFound(res);
  const policies = storePolicyRepository.getByCompany(req.companyId)
    .filter((item) => item.is_active !== false)
    .sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0) || String(a.id).localeCompare(String(b.id)));
  const paths = [...STOREFRONT_PUBLIC_PATHS];
  for (const policy of policies) {
    paths.push(`/policies/${encodeURIComponent(policy.id)}`);
  }
  const lastmod = String(req.company.updatedAt || "").slice(0, 10) || null;
  res.setHeader("Content-Type", seoContentTypes.sitemap);
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  return res.send(buildSitemapXml(paths.map((path) => storefrontPageUrl(siteUrl, path)), lastmod));
});

function requestSiteId(req) {
  const header = req.headers["x-site-id"];
  if (Array.isArray(header) || String(header || "").includes(",")) return "";
  return String(header || req.query.siteId || "").trim();
}

function storefrontContext(req, res, next) {
  if (!req.company || !req.companyId) return res.status(404).json({ message: "Storefront not found." });
  const connection = websiteConnectionSettings(req.company) || websiteConnectionDefaults(req.company);
  const siteId = requestSiteId(req);
  if (!siteId || siteId !== connection.siteId) return res.status(404).json({ message: "Storefront not found." });

  const origin = String(req.headers.origin || "").trim();
  if (origin) {
    let originHost = "";
    try { originHost = normalizeCompanyHost(new URL(origin).hostname); } catch {}
    let connectedStorefrontHost = "";
    try { connectedStorefrontHost = normalizeCompanyHost(new URL(connection.storefrontBaseUrl || "").hostname); } catch {}
    const ownsVerifiedDomain = getCompanyDomainsByCompany(req.companyId).some(
      (entry) => entry.is_active === true && entry.is_verified === true && normalizeCompanyHost(entry.domain) === originHost,
    );
    if (!originHost || (!ownsVerifiedDomain && originHost !== connectedStorefrontHost)) {
      return res.status(404).json({ message: "Storefront not found." });
    }
  }

  const supportedLocales = [...new Set((connection.supportedLocales || [connection.defaultLocale || "en"])
    .map((locale) => String(locale || "").trim().toLowerCase())
    .filter((locale) => localePattern.test(locale)))];
  const defaultLocale = supportedLocales.includes(String(connection.defaultLocale || "").toLowerCase())
    ? String(connection.defaultLocale).toLowerCase()
    : supportedLocales[0] || "en";
  const requestedLocale = String(req.query.locale || "").trim().toLowerCase();
  req.storefront = {
    connection,
    siteId,
    supportedLocales: supportedLocales.length ? supportedLocales : [defaultLocale],
    defaultLocale,
    locale: supportedLocales.includes(requestedLocale) ? requestedLocale : defaultLocale,
  };
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  return next();
}

function serializeCompanyPublicProduct(companyId, product) {
  const company = companyRepository.getCompanyById(companyId);
  return serializePublicProduct(product, publicProductSerializeOptions(company));
}

function publicProducts(companyId) {
  return productRepository.getByCompany(companyId)
    .filter((product) => !isProductTrashed(product) && product.isActive !== false && product.active !== false && product.visible !== false)
    .map((product) => serializeCompanyPublicProduct(companyId, product))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug));
}

router.use(storefrontContext);
router.use("/analytics", analyticsPublicRoutes);

/**
 * Public display priority payload (Spec 004 / T012, T014).
 *
 * Ordered ids only — no product copies and no verified unit counts. Verified
 * sales ordering falls back to catalog order when the verified units drop to
 * zero; the public read never returns 409.
 */
async function publicDisplayPriority(companyId, activeBrands, products) {
  const [modes, positions] = await Promise.all([
    listProductDisplayModes(companyId),
    listProductDisplayPositions(companyId),
  ]);
  const verifiedUnits = verifiedUnitsByProductId(orderRepository.getByCompany(companyId));
  const globalConfig = (surface) => displayConfigFromRow(
    modes.find((row) => row.surface === surface && (row.brandId ?? null) === null) || null,
  );

  const pick = (result) => ({
    inheritedSelection: result.inheritedSelection,
    inheritedOrdering: result.inheritedOrdering,
    orderingKey: result.orderingKey,
    orderedIds: result.orderedIds,
  });

  const resolve = (options) => {
    // Manual positions are stored per surface and brand scope. Only the rows
    // for the scope being resolved may reach the resolver — a brand scope must
    // never inherit another brand's (or the global) manual ordering, and the
    // global scope must never see brand-scoped rows.
    const scopeBrandId = options.brandId ?? null;
    const scopedPositions = positions.filter(
      (row) => row.surface === options.surface && (row.brandId ?? null) === scopeBrandId,
    );
    try {
      return resolveDisplayPriority({
        ...options,
        products,
        brands: activeBrands,
        verifiedUnits,
        manualPositions: scopedPositions,
      });
    } catch (error) {
      // A stored rule that no longer matches the catalog vocabulary must not
      // break the storefront read; that scope falls back to catalog order.
      console.error("displayPriority scope fallback:", error?.message || error);
      return resolveDisplayPriority({
        surface: options.surface,
        brandId: scopeBrandId,
        globalConfig: null,
        brandConfig: null,
        products,
        brands: activeBrands,
        verifiedUnits,
        manualPositions: scopedPositions,
      });
    }
  };

  const displayPriority = { home: null, shop: null, brands: {} };
  for (const surface of DISPLAY_SURFACES) {
    displayPriority[surface] = pick(resolve({ surface, globalConfig: globalConfig(surface), brandConfig: null }));
  }
  for (const brand of activeBrands) {
    const entry = {};
    for (const surface of DISPLAY_SURFACES) {
      const brandRow = modes.find(
        (row) => row.surface === surface && (row.brandId ?? null) === String(brand.id),
      ) || null;
      entry[surface] = pick(resolve({
        surface,
        brandId: brand.id,
        globalConfig: globalConfig(surface),
        brandConfig: displayConfigFromRow(brandRow),
      }));
    }
    displayPriority.brands[String(brand.id)] = entry;
  }
  return displayPriority;
}

router.get("/content", async (req, res, next) => {
  try {
    const hiddenMedia = new Set(websiteMediaHiddenKeysRepository.getByCompany(req.companyId).map((item) => item.sectionKey));
    const [categories, brands] = await Promise.all([
      tenantCategoryRepository.listByCompany(req.companyId),
      tenantBrandRepository.listByCompany(req.companyId),
    ]);
    const rawProducts = productRepository.getByCompany(req.companyId)
      .filter((product) => !isProductTrashed(product) && product.isActive !== false && product.active !== false && product.visible !== false);
    const products = await attachPublicProductRelationsBatch(
      req.companyId,
      rawProducts.map((product) => serializeCompanyPublicProduct(req.companyId, product))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug)),
    );
    const texts = websiteTextsRepository.getByCompany(req.companyId)
      .filter((item) => item.isActive !== false && !item.deletedAt)
      .map((item) => serializePublicWebsiteText(item, req.storefront.locale));
    const media = websiteMediaRepository.getByCompany(req.companyId)
      .filter((item) => item.isActive !== false && !hiddenMedia.has(item.sectionKey))
      .map(serializePublicWebsiteMedia);

    const engagement = buildPublicEngagementContent(
      req.company,
      req.companyId,
      String(req.query.page || "/"),
    );

    const activeBrands = brands.filter((brand) => brand.isActive !== false);
    const displayPriority = await publicDisplayPriority(req.companyId, activeBrands, rawProducts);

    return res.json({
      site: {
        id: req.storefront.siteId,
        companyId: req.companyId,
        name: String(req.company.name || ""),
        slug: String(req.company.slug || req.companyId),
        defaultLocale: req.storefront.defaultLocale,
        supportedLocales: req.storefront.supportedLocales,
        locale: req.storefront.locale,
        currency: String(req.company.settings?.currency || req.company.currency || "USD"),
        logo: preferWebpUploadUrl(String(req.company.logo || req.company.logoUrl || "")),
        siteUrl: storefrontSiteUrl(req.company, req.storefront.connection),
        robotsIndexing: normalizeSeoRobotsValue(req.company.settings?.robotsIndexing),
        siteTitle: typeof req.company.settings?.siteTitle === "string" ? req.company.settings.siteTitle : null,
        metaDescription: typeof req.company.settings?.metaDescription === "string" ? req.company.settings.metaDescription : null,
        metaKeywords: typeof req.company.settings?.metaKeywords === "string" ? req.company.settings.metaKeywords : null,
      },
      brands: brands.filter((brand) => brand.isActive !== false).map(serializePublicBrand),
      categories: categories.filter((category) => category.isActive !== false).map(serializePublicCategory),
      products,
      displayPriority,
      filterDefinitions: serializePublicProductFilterDefinitionsFromProducts(rawProducts),
      texts,
      media,
      vlogs: publicVlogsForCompany(req.company, req.storefront.locale),
      vlogHero: publicVlogHeroForCompany(req.company, req.storefront.locale),
      announcements: engagement.announcements,
      splashAds: engagement.splashAds,
      policies: engagement.policies,
      legalInformation: engagement.legalInformation,
      displayRules: engagement.displayRules,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/splash-ads/:id/view", async (req, res, next) => {
  try {
    const event = await trackSplashEvent("VIEW", req.companyId, req.params.id);
    if (!event) return res.status(404).json({ message: "Not found." });
    return res.status(201).json({ id: event.id, event_type: "VIEW" });
  } catch (error) {
    return next(error);
  }
});

router.post("/splash-ads/:id/click", async (req, res, next) => {
  try {
    const event = await trackSplashEvent("CLICK", req.companyId, req.params.id);
    if (!event) return res.status(404).json({ message: "Not found." });
    return res.status(201).json({ id: event.id, event_type: "CLICK" });
  } catch (error) {
    return next(error);
  }
});

router.get("/products/:slug", async (req, res, next) => {
  try {
    const product = publicProducts(req.companyId).find((item) => item.slug === req.params.slug);
    if (!product) return res.status(404).json({ message: "Product not found." });
    return res.json(await attachPublicProductRelations(req.companyId, product));
  } catch (error) {
    return next(error);
  }
});

export default router;
