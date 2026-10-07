import { Router } from "express";
import { companyRepository, tenantCompanySiteRepository, websiteMediaRepository } from "../data/store.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import {
  assertManifestMatchesCompany,
  connectionSummary,
  normalizeWebsiteConnectionPatch,
  validateConnectionUrl,
  websiteConnectionSettings,
} from "../siteEditor/websiteConnection.js";
import {
  connectionResolution,
  manifestRoute,
  requireManifestForCompany,
  syncManifestForCompany,
  validateManifestForCompany,
} from "../siteEditor/connector.js";
import { getSiteEditorDraft, saveSiteEditorDraft, siteEditorDraftStorageKind } from "../siteEditor/draftRepository.js";
import { assertDraftPayloadSize, SiteEditorValidationError, validatePageDocument } from "../siteEditor/schema.js";
import {
  buildEditorPageDescriptor,
  manifestPageToDocument,
} from "../siteEditor/siteManifest.js";

const router = Router();

router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  next();
});
router.use(requireAuth, requireTrustedEditorTenant);
router.use(resolveRequestedSite);

function resolveRequestedSite(req, res, next) {
  const siteId = String(req.query?.siteId || "").trim();
  if (!siteId) return next();
  const site = tenantCompanySiteRepository.findByCompany(req.companyId, siteId);
  if (!site) {
    return res.status(404).json({ message: "Site not found.", code: "SITE_NOT_FOUND" });
  }
  req.requestedSiteId = site.id;
  return next();
}

function activeLocale(value) {
  return value === "ar" ? "ar" : "en";
}

function requireTrustedEditorTenant(req, res, next) {
  if (!req.companyId || !req.company || (!req.membership && !req.tenantScope)) {
    return res.status(403).json({ message: "A trusted company scope is required.", code: "TENANT_SCOPE_REQUIRED" });
  }
  return next();
}

function activeMediaUrls(companyId) {
  return new Map(websiteMediaRepository.getByCompany(companyId).filter(
    (asset) => asset.isActive !== false && asset.is_active !== false && !asset.deletedAt && !asset.deleted_at,
  ).flatMap((asset) => {
    const urls = [asset.imageUrl, asset.fallbackImageUrl].filter(Boolean);
    return urls.map((url) => [String(url), asset]);
  }));
}

function imageNodes(document) {
  const images = [];
  const visit = (node) => {
    if (node.type === "image") images.push(node);
    (node.children || []).forEach(visit);
  };
  document.sections.forEach((section) => section.elements.forEach(visit));
  return images;
}

function backgroundImages(document) {
  return (document.sections || []).map((section) => String(section.settings?.backgroundImage || "")).filter(Boolean);
}

function validateTenantMedia(document, currentDocument, companyId) {
  const mediaByUrl = activeMediaUrls(companyId);
  const currentUrls = new Set([
    ...imageNodes(currentDocument).map((node) => node.content.src),
    ...backgroundImages(currentDocument),
  ]);
  for (const image of imageNodes(document)) {
    const source = image.content.src;
    if (currentUrls.has(source)) continue;
    const media = mediaByUrl.get(source);
    if (!media) throw new SiteEditorValidationError("Image must reference active media from the current tenant.", 400, "TENANT_MEDIA_REQUIRED");
    if (image.content.assetId && image.content.assetId !== media.id) {
      throw new SiteEditorValidationError("Image asset identity does not match the current tenant media record.", 400, "TENANT_MEDIA_REQUIRED");
    }
    image.content.assetId = media.id;
  }
  for (const url of backgroundImages(document)) {
    if (currentUrls.has(url)) continue;
    if (!mediaByUrl.get(url)) {
      throw new SiteEditorValidationError("Section background must reference active media from the current tenant.", 400, "TENANT_MEDIA_REQUIRED");
    }
  }
}

async function currentDocument(companyId, page, manifest, locale) {
  return (await getSiteEditorDraft(companyId, page.id, locale, manifest.siteId))?.document
    || manifestPageToDocument(page, manifest, { companyId, locale });
}

function manifestPage(req) {
  const resolved = requireManifestForCompany(req.company);
  const page = manifestRoute(resolved.manifest, req.params.pageId);
  return { resolved, page };
}

router.get("/pages", requirePermission("site_editor.access"), async (req, res) => {
  try {
    const locale = activeLocale(req.query.locale);
    const { manifest } = requireManifestForCompany(req.company);
    const siteId = req.requestedSiteId || manifest.siteId;
    const pages = await Promise.all(manifest.pages.map(async (page) => ({
      ...buildEditorPageDescriptor(page, manifest, {
        companyId: req.companyId,
        locale,
        draftStatus: await getSiteEditorDraft(req.companyId, page.id, locale, siteId) ? "draft" : "published-source",
      }),
    })));
    return res.json({ items: pages, source: "site-manifest", siteId, locale });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Unable to load editor pages.", code: error.code || "EDITOR_PAGES_LOAD_FAILED" });
  }
});

router.get("/pages/:pageId", requirePermission("site_editor.access"), async (req, res) => {
  try {
    const locale = activeLocale(req.query.locale);
    const { manifest } = requireManifestForCompany(req.company);
    const page = manifestRoute(manifest, req.params.pageId);
    if (!page) return res.status(404).json({ message: "Editable page not found.", code: "EDITOR_PAGE_NOT_FOUND" });
    const siteId = req.requestedSiteId || manifest.siteId;
    const draft = await getSiteEditorDraft(req.companyId, page.id, locale, siteId);
    const document = draft?.document || manifestPageToDocument(page, manifest, { companyId: req.companyId, locale });
    return res.json({ document, source: draft ? `${siteEditorDraftStorageKind()}-draft` : "site-manifest" });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Unable to load the editor document.", code: error.code || "EDITOR_DOCUMENT_LOAD_FAILED" });
  }
});

router.put(
  "/pages/:pageId/draft",
  requirePermission("site_editor.access"),
  requirePermission("site_editor.edit"),
  requirePermission("site_editor.save"),
  async (req, res) => {
    try {
      const { manifest } = requireManifestForCompany(req.company);
      const page = manifestRoute(manifest, req.params.pageId);
      if (!page) return res.status(404).json({ message: "Editable page not found.", code: "EDITOR_PAGE_NOT_FOUND" });
      const locale = activeLocale(req.body?.document?.locale);
      const siteId = req.requestedSiteId || manifest.siteId;
      const expectedRevision = Number(req.body?.revision);
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
        throw new SiteEditorValidationError("Expected revision is required.");
      }
      assertDraftPayloadSize(req.body?.document);
      const before = await currentDocument(req.companyId, page, manifest, locale);
      const document = validatePageDocument(req.body?.document, {
        companyId: req.companyId,
        pageId: req.params.pageId,
        previewPath: page.previewPath,
        routePattern: page.routePattern,
      });
      validateTenantMedia(document, before, req.companyId);
      const saved = await saveSiteEditorDraft({
        companyId: req.companyId,
        siteId,
        pageId: req.params.pageId,
        locale,
        expectedRevision,
        document,
        actor: req.user,
      });
      return res.json({ document: saved.document, revision: saved.document.revision, audit: saved.audit });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message: error.statusCode ? error.message : "Unable to save the site draft.",
        code: error.code || "DRAFT_SAVE_FAILED",
        ...(error.currentRevision !== undefined ? { currentRevision: error.currentRevision } : {}),
      });
    }
  },
);

router.get("/section-library", requirePermission("site_editor.access"), (req, res) => {
  try {
    const resolved = requireManifestForCompany(req.company);
    return res.json({
      sectionLibrary: resolved.manifest.sectionLibrary || null,
      source: resolved.source,
      siteId: req.requestedSiteId || resolved.manifest.siteId,
      ...(resolved.source === "legacy" ? { requiresConnection: true } : {}),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Unable to load the section library.",
      code: error.code || "SECTION_LIBRARY_LOAD_FAILED",
    });
  }
});

router.get("/context", requirePermission("site_editor.access"), (req, res) => {
  try {
    const resolved = requireManifestForCompany(req.company);
    const manifest = resolved.manifest;
    const company = companyRepository.getCompanyById(req.companyId);
    return res.json({
      company: company ? { id: company.id, slug: company.slug, name: company.name } : null,
      site: {
        id: req.requestedSiteId || manifest.siteId,
        name: manifest.siteName,
        baseUrl: manifest.baseUrl,
        routePrefix: manifest.routePrefix,
        defaultLocale: manifest.defaultLocale,
        supportedLocales: manifest.supportedLocales,
      },
      connection: connectionSummary(req.company),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Unable to load the editor context.", code: error.code || "EDITOR_CONTEXT_LOAD_FAILED" });
  }
});

router.get("/connection", requirePermission("site_editor.access"), (req, res) => {
  const company = companyRepository.getCompanyById(req.companyId);
  if (!company) return res.status(404).json({ message: "Company not found." });
  const resolution = connectionResolution(company);
  const connection = websiteConnectionSettings(company);
  return res.json({
    companyId: company.id,
    ...connectionSummary(company),
    siteDesign: connection?.lastManifest?.siteDesign || null,
    resolvedSource: resolution.source,
    resolution: resolution.resolution,
  });
});

router.post("/connection/validate", requirePermission("site_editor.connection.manage"), async (req, res) => {
  try {
    const report = await validateManifestForCompany(req.company, { url: req.body?.siteManifestUrl });
    return res.json(report);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Unable to validate the website connection.", code: error.code || "CONNECTION_VALIDATION_FAILED" });
  }
});

router.post("/manifest/sync", requirePermission("site_editor.manifest.sync"), async (req, res) => {
  try {
    const result = await syncManifestForCompany(req.company, { url: req.body?.siteManifestUrl });
    assertManifestMatchesCompany(result.manifest, req.company);
    let connection;
    if (result.source === "remote") {
      await companyRepository.recordWebsiteManifestSync(req.companyId, {
        manifest: result.manifest,
        syncedAt: result.syncedAt,
        siteManifestUrl: result.siteManifestUrl,
      });
      connection = connectionSummary(companyRepository.getCompanyById(req.companyId));
    } else {
      connection = connectionSummary(req.company);
    }
    return res.json({
      synced: true,
      source: result.source,
      siteManifestUrl: result.siteManifestUrl,
      schemaVersion: result.manifest.schemaVersion,
      companyId: result.manifest.companyId,
      siteId: result.manifest.siteId,
      siteName: result.manifest.siteName,
      pageCount: result.manifest.pages.length,
      syncedAt: result.syncedAt,
      connection,
    });
  } catch (error) {
    const connection = websiteConnectionSettings(req.company);
    if (connection?.siteManifestUrl) {
      await companyRepository.recordWebsiteManifestSync(req.companyId, {
        siteManifestUrl: connection.siteManifestUrl,
        connectionError: error.message || "Unable to synchronize the site manifest.",
      }).catch(() => {});
    }
    return res.status(error.statusCode || 500).json({ message: error.message || "Unable to synchronize the site manifest.", code: error.code || "MANIFEST_SYNC_FAILED" });
  }
});

router.put("/connection", requirePermission("site_editor.connection.manage"), async (req, res) => {
  try {
    const patch = normalizeWebsiteConnectionPatch(req.body);
    for (const key of ["siteManifestUrl", "storefrontBaseUrl"]) {
      if (patch[key] !== undefined && patch[key]) {
        patch[key] = validateConnectionUrl(patch[key], key);
      }
    }
    const hasManifestUrlPatch = Object.prototype.hasOwnProperty.call(patch, "siteManifestUrl");
    const disconnected = hasManifestUrlPatch && !patch.siteManifestUrl;
    const reconfiguring = hasManifestUrlPatch && !disconnected;
    const updated = await companyRepository.updateWebsiteConnection(req.companyId, {
      ...patch,
      ...(disconnected
        ? {
            connectionStatus: "not-configured",
            connectionError: "",
            lastManifest: null,
            lastManifestSyncAt: null,
            manifestSchemaVersion: null,
          }
        : reconfiguring
          ? {
              connectionStatus: "not-configured",
              connectionError: "",
            }
          : {}),
    });
    return res.json(updated);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Unable to update the website connection.", code: error.code || "CONNECTION_UPDATE_FAILED" });
  }
});

export default router;
