import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { buildWebsiteMediaWorkspace } from "../data/mediaSlots.js";
import { hasPermission } from "../data/permissions.js";
import { isTenantOperator } from "../utils/roles.js";
import { MediaEditor } from "./WebsiteMediaManager.jsx";

function canManageWebsiteMedia(user) {
  if (!user) return false;
  if (user.globalRole === "super_admin" || user.role === "super_admin") return true;
  if (isTenantOperator(user.role)) return true;
  return hasPermission(user, "website_media.manage");
}

function focusKeyFromLocation() {
  if (typeof window === "undefined") return "";
  const hash = window.location.hash || "";
  const match = hash.match(/(?:mediaKey|media-key|slot)=([^&]+)/i);
  if (match) return decodeURIComponent(match[1]);
  const params = new URLSearchParams(window.location.search || "");
  return params.get("mediaKey") || params.get("media-key") || "";
}

function Accordion({ summary, count, defaultOpen = false, children }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <section className="website-media-accordion website-media-page-group">
      <button
        aria-expanded={open}
        className="website-media-accordion-toggle"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="website-media-accordion-summary">{summary}</span>
        {Number(count) > 0 && <span className="website-media-accordion-count">{count}</span>}
        {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
      </button>
      {open && <div className="website-media-accordion-body">{children}</div>}
    </section>
  );
}

function MediaSlotsManager({
  company,
  currentUser,
  error = "",
  items = [],
  language = "en",
  onDelete,
  onSave,
}) {
  const isArabic = language === "ar";
  const canEdit = canManageWebsiteMedia(currentUser);
  const [pageFilter, setPageFilter] = React.useState("all");
  const [focusKey, setFocusKey] = React.useState(() => focusKeyFromLocation());

  React.useEffect(() => {
    const sync = () => setFocusKey(focusKeyFromLocation());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const workspace = React.useMemo(
    () => buildWebsiteMediaWorkspace(company, Array.isArray(items) ? items : []),
    [company, items],
  );

  const labels = isArabic ? {
    title: "وسائط الموقع",
    helper: "أدر صور وفيديوهات الصفحات بأسماء واضحة. وسائط الكتالوج تُدار من العلامات والأقسام والمنتجات.",
    viewOnly: "وضع العرض فقط — ليست لديك صلاحية رفع أو حفظ وسائط الموقع.",
    allPages: "كل الصفحات",
    existing: "موجود",
    missing: "ناقص",
    empty: "لا توجد حقول وسائط موقع مُعدّة لهذا الموقع.",
    emptyHint: "أضف إعدادات وسائط الموقع أو ارفع محتوى عبر واجهة إدارة المحتوى عند توفرها.",
    missingHelp: "مسجّل لهذا الموقع لكن لا توجد وسائط محفوظة بعد.",
    catalogNote: "وسائط العلامات والفئات والمنتجات تُدار من الكتالوج، وليست هنا.",
  } : {
    title: "Website Media",
    helper: "Manage page images and videos using human-readable labels. Catalog media stays in Brands, Categories, and Products.",
    viewOnly: "View only — you do not have permission to upload or save website media.",
    allPages: "All pages",
    existing: "Existing",
    missing: "Missing",
    empty: "No website media fields are configured for this site.",
    emptyHint: "Configure media slots for this site, or add Website Content slots that reference media keys.",
    missingHelp: "Registered for this site but no saved media yet.",
    catalogNote: "Brand, category, and product media are managed in Catalog — not here.",
  };

  const visibleItems = React.useMemo(() => {
    return workspace.items.filter((item) => pageFilter === "all" || item.page === pageFilter);
  }, [workspace.items, pageFilter]);

  const pageGroups = React.useMemo(() => {
    const map = new Map();
    visibleItems.forEach((item) => {
      if (!map.has(item.page)) map.set(item.page, new Map());
      const sections = map.get(item.page);
      if (!sections.has(item.section)) sections.set(item.section, []);
      sections.get(item.section).push(item);
    });
    return [...map.entries()].map(([page, sections]) => ({
      page,
      sections: [...sections.entries()].map(([section, sectionItems]) => ({ section, items: sectionItems })),
      count: [...sections.values()].reduce((total, list) => total + list.length, 0),
    }));
  }, [visibleItems]);

  React.useEffect(() => {
    if (!focusKey) return;
    const target = workspace.items.find((item) => item.key === focusKey);
    if (target) setPageFilter(target.page);
  }, [focusKey, workspace.items]);

  return (
    <section className="website-media-manager website-media-workspace" dir={isArabic ? "rtl" : "ltr"}>
      <header className="website-media-head">
        <div>
          <h2>{labels.title}</h2>
          <p>{labels.helper}</p>
          <p className="website-media-catalog-note">{labels.catalogNote}</p>
        </div>
      </header>

      {!canEdit && <p className="website-media-message" role="status">{labels.viewOnly}</p>}
      {error && <p className="website-media-message" role="alert">{error}</p>}

      {!workspace.empty && (
        <nav className="website-media-page-nav" aria-label={isArabic ? "صفحات الوسائط" : "Media pages"}>
          <button className={pageFilter === "all" ? "active" : ""} onClick={() => setPageFilter("all")} type="button">
            {labels.allPages}
          </button>
          {workspace.pages.map((page) => (
            <button className={pageFilter === page ? "active" : ""} key={page} onClick={() => setPageFilter(page)} type="button">
              {page}
            </button>
          ))}
        </nav>
      )}

      {workspace.empty ? (
        <div className="admin-empty-state website-media-empty">
          <strong>{labels.empty}</strong>
          <span>{labels.emptyHint}</span>
        </div>
      ) : pageGroups.map((group) => (
        <Accordion
          count={group.count}
          defaultOpen={pageFilter !== "all" || Boolean(focusKey && group.sections.some((section) => section.items.some((item) => item.key === focusKey)))}
          key={group.page}
          summary={group.page}
        >
          {group.sections.map((section) => (
            <section className="website-media-section" key={`${group.page}-${section.section}`}>
              <header className="website-media-section-head">
                <div>
                  <p className="website-media-eyebrow">{group.page}</p>
                  <h3>{section.section}</h3>
                </div>
                <span>{section.items.length}</span>
              </header>
              <div className="website-media-grid">
                {section.items.map((item) => (
                  <div
                    className={`website-media-slot-wrap is-${item.status}${focusKey === item.key ? " is-focused" : ""}`}
                    id={`media-slot-${encodeURIComponent(item.key)}`}
                    key={item.key}
                  >
                    <div className="website-media-slot-meta">
                      <strong>{item.label}</strong>
                      <code className="website-text-key">{item.key}</code>
                      <span className={`website-texts-status-pill ${item.status}`}>
                        {item.status === "missing" ? labels.missing : labels.existing}
                      </span>
                    </div>
                    {item.status === "missing" && <p className="website-media-missing-copy">{labels.missingHelp}</p>}
                    <MediaEditor
                      item={item.draft}
                      language={language}
                      lockSectionKey
                      onDelete={canEdit ? onDelete : undefined}
                      onSave={canEdit ? onSave : undefined}
                      readOnly={!canEdit}
                      slotMeta={item}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </Accordion>
      ))}
    </section>
  );
}

export default MediaSlotsManager;
