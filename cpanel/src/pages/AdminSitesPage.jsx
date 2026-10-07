import React from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import { hasPermission } from "../data/permissions.js";
import { isCompanyAdmin } from "../utils/roles.js";
import { archiveSite, createSite, fetchSites, restoreSite } from "../utils/sitesApi.js";
import { getLandingPlatformFlags } from "../utils/landingPlatform/featureFlags.js";
import { isArchivedSite, pickPrimaryDomain } from "../utils/landingPlatform/siteContext.js";
import { activateSiteContext, syncSiteIdToUrl } from "../utils/landingPlatform/activeSiteSession.js";

const sitesLabels = {
  en: {
    title: "Sites",
    mySitesTitle: "My Sites",
    subtitle: "Manage the storefront sites for this company.",
    mySitesSubtitle: "Open and manage the sites for this company.",
    loading: "Loading sites…",
    emptyTitle: "No sites yet",
    emptyDescription: "A default site is created automatically when this page first loads.",
    name: "Name",
    slug: "Slug",
    status: "Status",
    defaultLocale: "Default locale",
    domain: "Domain",
    manageSite: "Manage Site",
    editSite: "Edit Site",
    overflowLabel: "More actions",
    createTitle: "Create a site",
    createName: "Site name",
    createSlug: "Slug (optional)",
    createSubmit: "Create site",
    creating: "Creating…",
    error: "Unable to load sites.",
    createError: "Unable to create the site.",
    manageError: "Unable to open this site.",
    statusActive: "Active",
    statusDraft: "Draft",
    statusArchived: "Archived",
    archiveSite: "Archive Site",
    restoreSite: "Restore Site",
    archiveConfirmTitle: "Archive this site?",
    archiveConfirmDescription:
      "The site will not be deleted. It will only be archived: it is hidden from the site switcher and cannot be managed or edited until you restore it. You can restore it at any time from My Sites.",
    archiveCancel: "Cancel",
    archiving: "Archiving…",
    archiveSuccess: "Site archived. You can restore it at any time.",
    restoreSuccess: "Site restored and active again.",
    archiveError: "Unable to archive the site.",
    restoreError: "Unable to restore the site.",
  },
  ar: {
    title: "المواقع",
    mySitesTitle: "مواقعي",
    subtitle: "إدارة مواقع المتجر لهذه الشركة.",
    mySitesSubtitle: "افتح وأدر مواقع هذه الشركة.",
    loading: "جارٍ تحميل المواقع…",
    emptyTitle: "لا توجد مواقع بعد",
    emptyDescription: "يتم إنشاء موقع افتراضي تلقائيًا عند تحميل هذه الصفحة لأول مرة.",
    name: "الاسم",
    slug: "المعرّف",
    status: "الحالة",
    defaultLocale: "اللغة الافتراضية",
    domain: "النطاق",
    manageSite: "إدارة الموقع",
    editSite: "تحرير الموقع",
    overflowLabel: "إجراءات إضافية",
    createTitle: "إنشاء موقع",
    createName: "اسم الموقع",
    createSlug: "المعرّف (اختياري)",
    createSubmit: "إنشاء الموقع",
    creating: "جارٍ الإنشاء…",
    error: "تعذر تحميل المواقع.",
    createError: "تعذر إنشاء الموقع.",
    manageError: "تعذر فتح هذا الموقع.",
    statusActive: "نشط",
    statusDraft: "مسودة",
    statusArchived: "مؤرشف",
    archiveSite: "أرشفة الموقع",
    restoreSite: "استعادة الموقع",
    archiveConfirmTitle: "هل تريد أرشفة هذا الموقع؟",
    archiveConfirmDescription:
      "لن يتم حذف الموقع، بل ستتم أرشفته فقط: سيُخفى من مبدّل المواقع ولن يمكن إدارته أو تحريره حتى تستعيده. يمكنك استعادته في أي وقت من صفحة مواقعي.",
    archiveCancel: "إلغاء",
    archiving: "جارٍ الأرشفة…",
    archiveSuccess: "تمت أرشفة الموقع. يمكنك استعادته في أي وقت.",
    restoreSuccess: "تمت استعادة الموقع وأصبح نشطًا مجددًا.",
    archiveError: "تعذر أرشفة الموقع.",
    restoreError: "تعذر استعادة الموقع.",
  },
};

function statusLabel(copy, status) {
  if (status === "draft") return copy.statusDraft;
  if (status === "archived") return copy.statusArchived;
  return copy.statusActive;
}

function siteInitials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";
}

/** Real http(s) preview only — never invent placeholder image URLs. */
function sitePreviewUrl(site) {
  const settings = site?.settings && typeof site.settings === "object" ? site.settings : {};
  const candidates = [site?.previewUrl, settings.previewUrl, settings.preview_url, settings.thumbnailUrl, settings.thumbnail];
  for (const value of candidates) {
    const url = String(value || "").trim();
    if (/^https?:\/\//i.test(url)) return url;
  }
  return "";
}

/**
 * Company primary domain for a site card. Domains remain company-scoped in
 * Phase 1 — the API enriches each site with `primaryDomain` (read-only lookup);
 * the company payload is a fallback. Never invents a site-scoped domain.
 */
function siteDomain(site, company) {
  const fromSite = String(site?.primaryDomain || "").trim();
  if (fromSite) return fromSite;
  const fromCompany = pickPrimaryDomain(company?.domains) || String(company?.domain || "").trim();
  return fromCompany || null;
}

function ArchiveSiteConfirmDialog({ ar, busy, copy, onClose, onConfirm, site }) {
  React.useEffect(() => {
    const handler = (event) => event.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [busy, onClose]);
  return (
    <div className="customers-modal-backdrop" onMouseDown={() => !busy && onClose()} role="presentation">
      <div
        aria-labelledby="archive-site-title"
        aria-modal="true"
        className="customers-modal crm-contact-confirm"
        dir={ar ? "rtl" : "ltr"}
        onMouseDown={(event) => event.stopPropagation()}
        role="alertdialog"
      >
        <h2 id="archive-site-title">{copy.archiveConfirmTitle}</h2>
        <p>{copy.archiveConfirmDescription}</p>
        <strong>{site.name}</strong>
        <footer>
          <button className="customers-secondary-button" disabled={busy} onClick={onClose} type="button">{copy.archiveCancel}</button>
          <button className="customers-primary-button crm-danger-button" disabled={busy} onClick={onConfirm} type="button">
            {busy ? copy.archiving : copy.archiveSite}
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function AdminSitesPage({ company, currentUser, language = "en", onNavigate, onSiteStatusChanged, ...layoutProps }) {
  const copy = sitesLabels[language] || sitesLabels.en;
  const ar = language === "ar";
  const flags = getLandingPlatformFlags(company);
  const mySitesOn = flags.mySitesEnabled || flags.landingPlatformEnabled;
  const [sites, setSites] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", slug: "" });
  const [openMenuSiteId, setOpenMenuSiteId] = React.useState(null);
  const [archiveTarget, setArchiveTarget] = React.useState(null);
  const [statusBusySiteId, setStatusBusySiteId] = React.useState(null);
  const [notice, setNotice] = React.useState(null);
  const canManage = isCompanyAdmin(currentUser?.role) || hasPermission(currentUser, "sites.manage");
  const closeArchiveDialog = React.useCallback(() => setArchiveTarget(null), []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSites(await fetchSites());
    } catch (err) {
      setError(err.message || copy.error);
    } finally {
      setLoading(false);
    }
  }, [copy.error]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(event) {
    event.preventDefault();
    if (!canManage || !form.name.trim() || creating) return;
    setCreating(true);
    setError("");
    try {
      await createSite({
        name: form.name.trim(),
        ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
      });
      setForm({ name: "", slug: "" });
      await load();
    } catch (err) {
      setError(err.message || copy.createError);
    } finally {
      setCreating(false);
    }
  }

  /**
   * Manage Site → explicit site context (Phase 0 contract) then the current
   * Site Dashboard. Never silently picks a site for multi-site companies.
   */
  function manageSite(site) {
    setOpenMenuSiteId(null);
    if (isArchivedSite(site)) return;
    if (!company?.id || !site?.id) {
      setError(copy.manageError);
      return;
    }
    try {
      const companyDomains = [...new Set(sites.map((entry) => siteDomain(entry, company)).filter(Boolean))];
      const context = activateSiteContext({
        companyId: company.id,
        siteId: site.id,
        sites,
        membership: currentUser?.activeMembership || null,
        modules: Array.isArray(company?.modules)
          ? company.modules.map((module) => module.module_key).filter(Boolean)
          : null,
        domains: companyDomains.length ? companyDomains : null,
      });
      syncSiteIdToUrl(context.siteId);
      onNavigate("admin-dashboard");
    } catch (err) {
      setError(err.message || copy.manageError);
    }
  }

  function openEditor(site) {
    setOpenMenuSiteId(null);
    if (isArchivedSite(site)) return;
    onNavigate("admin-site-editor", {
      path: `/admin/site-editor?siteId=${encodeURIComponent(site.id)}`,
    });
  }

  function applyUpdatedSite(updated) {
    setSites((current) => current.map((entry) => (entry.id === updated.id ? { ...entry, ...updated } : entry)));
    if (onSiteStatusChanged) onSiteStatusChanged(updated);
  }

  function requestArchive(site) {
    setOpenMenuSiteId(null);
    if (!canManage || isArchivedSite(site)) return;
    setNotice(null);
    setArchiveTarget(site);
  }

  async function confirmArchive() {
    const site = archiveTarget;
    if (!site || statusBusySiteId) return;
    setStatusBusySiteId(site.id);
    try {
      applyUpdatedSite(await archiveSite(site.id));
      setNotice({ type: "success", message: copy.archiveSuccess });
    } catch {
      setNotice({ type: "error", message: copy.archiveError });
    } finally {
      setStatusBusySiteId(null);
      setArchiveTarget(null);
    }
  }

  async function handleRestore(site) {
    setOpenMenuSiteId(null);
    if (!canManage || !isArchivedSite(site) || statusBusySiteId) return;
    setNotice(null);
    setStatusBusySiteId(site.id);
    try {
      applyUpdatedSite(await restoreSite(site.id));
      setNotice({ type: "success", message: copy.restoreSuccess });
    } catch {
      setNotice({ type: "error", message: copy.restoreError });
    } finally {
      setStatusBusySiteId(null);
    }
  }

  const title = mySitesOn ? copy.mySitesTitle : copy.title;
  const subtitle = mySitesOn ? copy.mySitesSubtitle : copy.subtitle;

  return (
    <AdminLayout
      activePage="admin-sites"
      company={company}
      currentUser={currentUser}
      language={language}
      subtitle={subtitle}
      title={title}
      {...layoutProps}
    >
      <div className="sites-page" dir={ar ? "rtl" : "ltr"}>
        {notice && (
          <p
            className={notice.type === "error" ? "sites-page-note sites-page-error" : "sites-page-note"}
            role={notice.type === "error" ? "alert" : "status"}
          >
            {notice.message}
          </p>
        )}
        {loading ? (
          <p className="sites-page-note">{copy.loading}</p>
        ) : error ? (
          <p className="sites-page-note sites-page-error" role="alert">{error}</p>
        ) : sites.length ? (
          <section className="sites-cards-grid" aria-label={title}>
            {sites.map((site) => {
              const previewUrl = sitePreviewUrl(site);
              const domain = siteDomain(site, company);
              const menuOpen = openMenuSiteId === site.id;
              const archived = isArchivedSite(site);
              return (
              <article className={archived ? "sites-card sites-card-archived" : "sites-card"} key={site.id}>
                <div className="sites-card-thumb">
                  {previewUrl ? (
                    <img alt="" className="sites-card-thumb-image" src={previewUrl} />
                  ) : (
                    <span className="sites-card-thumb-mark" aria-hidden="true">
                      {siteInitials(site.name)}
                    </span>
                  )}
                  <div className="sites-card-actions">
                    <button className="sites-card-manage" disabled={archived} onClick={() => manageSite(site)} type="button">{copy.manageSite}</button>
                    <button className="sites-card-edit" disabled={archived} onClick={() => openEditor(site)} type="button">{copy.editSite}</button>
                  </div>
                </div>
                <div className="sites-card-footer">
                  <strong className="sites-card-name" title={site.name}>{site.name}</strong>
                  <span className="sites-card-slug" title={site.slug}>{site.slug}</span>
                  {domain && <span className="sites-card-domain" title={domain}>{domain}</span>}
                  <span className={`sites-status sites-status-${site.status}`}>{statusLabel(copy, site.status)}</span>
                </div>
                <div className="sites-card-overflow" data-admin-popover-root>
                  <button
                    aria-expanded={menuOpen}
                    aria-label={copy.overflowLabel}
                    className="sites-card-overflow-toggle"
                    onClick={() => setOpenMenuSiteId(menuOpen ? null : site.id)}
                    type="button"
                  >⋯</button>
                  {menuOpen && (
                    <div className="sites-card-overflow-menu" role="menu">
                      <button disabled={archived} onClick={() => manageSite(site)} role="menuitem" type="button">{copy.manageSite}</button>
                      <button disabled={archived} onClick={() => openEditor(site)} role="menuitem" type="button">{copy.editSite}</button>
                      {canManage && (archived ? (
                        <button disabled={Boolean(statusBusySiteId)} onClick={() => void handleRestore(site)} role="menuitem" type="button">{copy.restoreSite}</button>
                      ) : (
                        <button disabled={Boolean(statusBusySiteId)} onClick={() => requestArchive(site)} role="menuitem" type="button">{copy.archiveSite}</button>
                      ))}
                    </div>
                  )}
                </div>
              </article>
              );
            })}
          </section>
        ) : (
          <section className="sites-empty">
            <strong>{copy.emptyTitle}</strong>
            <p>{copy.emptyDescription}</p>
          </section>
        )}

        {canManage && (
          <form className="sites-create-form" onSubmit={handleCreate}>
            <h2>{copy.createTitle}</h2>
            <label>
              <span>{copy.createName}</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
                value={form.name}
              />
            </label>
            <label>
              <span>{copy.createSlug}</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                value={form.slug}
              />
            </label>
            <button className="sites-create-submit" disabled={creating} type="submit">
              {creating ? copy.creating : copy.createSubmit}
            </button>
          </form>
        )}
      </div>
      {archiveTarget && (
        <ArchiveSiteConfirmDialog
          ar={ar}
          busy={statusBusySiteId === archiveTarget.id}
          copy={copy}
          onClose={closeArchiveDialog}
          onConfirm={() => void confirmArchive()}
          site={archiveTarget}
        />
      )}
    </AdminLayout>
  );
}