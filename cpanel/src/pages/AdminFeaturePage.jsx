import React from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import {
  buildWebsiteContentWorkspace,
  contentSlotCreatePayload,
} from "../data/websiteTextSlots.js";
import { apiRequest } from "../utils/api.js";
import { hasPermission } from "../data/permissions.js";
import { isTenantOperator } from "../utils/roles.js";

const features = {
  "admin-website-texts": { title: "Website Content", endpoint: "/admin/website-texts" },
};

const textValue = (value) => value == null ? "" : String(value);

function canManageWebsiteTexts(user) {
  if (!user) return false;
  if (user.globalRole === "super_admin" || user.role === "super_admin") return true;
  if (isTenantOperator(user.role)) return true;
  return hasPermission(user, "website_texts.manage");
}

function canManageWebsiteMedia(user) {
  if (!user) return false;
  if (user.globalRole === "super_admin" || user.role === "super_admin") return true;
  if (isTenantOperator(user.role)) return true;
  return hasPermission(user, "website_media.manage");
}

function WebsiteTextsPanel({
  company,
  currentUser,
  language = "en",
  onNavigate,
  rows,
  onReload,
}) {
  const ar = language === "ar";
  const canEdit = canManageWebsiteTexts(currentUser);
  const canMedia = canManageWebsiteMedia(currentUser);
  const [query, setQuery] = React.useState("");
  const [pageFilter, setPageFilter] = React.useState("all");
  const [editingKey, setEditingKey] = React.useState("");
  const [draft, setDraft] = React.useState(null);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [busyKey, setBusyKey] = React.useState("");
  const [ensuring, setEnsuring] = React.useState(false);

  const workspace = React.useMemo(
    () => buildWebsiteContentWorkspace(company, rows),
    [company, rows],
  );

  const labels = ar ? {
    search: "ابحث بالعنوان أو القيمة...",
    allPages: "كل الصفحات",
    existing: "موجود",
    missing: "ناقص",
    english: "الإنجليزية",
    arabic: "العربية",
    edit: "تعديل",
    save: "حفظ",
    cancel: "إلغاء",
    add: "إضافة",
    adding: "جاري الإضافة...",
    addAll: (count) => `إضافة ${count} نصوص ناقصة`,
    empty: "لا توجد نصوص مطابقة",
    emptyHint: "غيّر الصفحة أو البحث، أو أضف النصوص الناقصة المسجّلة لهذا الموقع.",
    viewOnly: "وضع العرض فقط — ليست لديك صلاحية حفظ نصوص الموقع.",
    media: "فتح وسائط الموقع",
    helper: "عدّل نصوص الصفحات بأسماء واضحة. المفتاح التقني اختياري للتوضيح فقط.",
    missingHelp: "مسجّل لهذا الموقع لكن لا يوجد سجل محفوظ بعد. لن يتم إنشاء محتوى افتراضي.",
    saved: "تم حفظ نص الموقع.",
    created: "تمت إضافة النص الناقص. يمكنك تعبئته الآن.",
    ensured: "تمت إضافة سجلات النصوص الناقصة (فارغة).",
    saveFailed: "تعذر حفظ نص الموقع.",
    createFailed: "تعذر إضافة النص الناقص.",
    active: "نشط",
    inactive: "غير نشط",
  } : {
    search: "Search label or value...",
    allPages: "All pages",
    existing: "Existing",
    missing: "Missing",
    english: "English",
    arabic: "Arabic",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    add: "Add",
    adding: "Adding...",
    addAll: (count) => `Add ${count} missing texts`,
    empty: "No matching website texts",
    emptyHint: "Change the page filter or search, or add registered missing texts for this site.",
    viewOnly: "View only — you do not have permission to save website texts.",
    media: "Open Website Media",
    helper: "Edit page copy using human-readable labels. Technical keys stay optional metadata.",
    missingHelp: "Registered for this site but no saved record yet. No default marketing copy is invented.",
    saved: "Website text saved.",
    created: "Missing text record added. You can fill it in now.",
    ensured: "Missing text records were added (empty).",
    saveFailed: "Website text could not be saved.",
    createFailed: "Missing text could not be added.",
    active: "Active",
    inactive: "Inactive",
  };

  const items = React.useMemo(() => {
    const combined = [...workspace.existing, ...workspace.missing];
    return combined.filter((item) => {
      const page = item.location?.page || "—";
      const matchesPage = pageFilter === "all" || page === pageFilter;
      const haystack = [
        item.key,
        item.label,
        item.location?.page,
        item.location?.section,
        item.location?.field,
        item.valueEn,
        item.valueAr,
      ].map(textValue).join(" ").toLowerCase();
      return matchesPage && haystack.includes(query.trim().toLowerCase());
    }).sort((a, b) => {
      const pageCmp = textValue(a.location?.page).localeCompare(textValue(b.location?.page));
      if (pageCmp) return pageCmp;
      const sectionCmp = textValue(a.location?.section).localeCompare(textValue(b.location?.section));
      if (sectionCmp) return sectionCmp;
      return Number(a.sortOrder || a.meta?.sortOrder || 0) - Number(b.sortOrder || b.meta?.sortOrder || 0);
    });
  }, [workspace, pageFilter, query]);

  const sections = React.useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      const page = item.location?.page || "General";
      const section = item.location?.section || "General";
      const key = `${page}:::${section}`;
      if (!map.has(key)) map.set(key, { page, section, items: [] });
      map.get(key).items.push(item);
    });
    return [...map.values()];
  }, [items]);

  function beginEdit(item) {
    if (!canEdit || item.status === "missing") return;
    setEditingKey(item.key);
    setDraft({
      valueEn: textValue(item.valueEn),
      valueAr: textValue(item.valueAr),
      isActive: item.isActive !== false,
    });
    setError("");
    setMessage("");
  }

  function cancelEdit() {
    setEditingKey("");
    setDraft(null);
  }

  async function createMissing(slot) {
    if (!canEdit) return;
    setError("");
    setMessage("");
    setBusyKey(slot.key);
    try {
      await apiRequest("/admin/website-texts", {
        method: "POST",
        body: JSON.stringify(contentSlotCreatePayload(slot)),
      });
      setMessage(labels.created);
      onReload();
    } catch (requestError) {
      setError(requestError.message || labels.createFailed);
    } finally {
      setBusyKey("");
    }
  }

  async function ensureMissing() {
    if (!canEdit || !workspace.missing.length) return;
    setError("");
    setMessage("");
    setEnsuring(true);
    try {
      for (const slot of workspace.missing) {
        await apiRequest("/admin/website-texts", {
          method: "POST",
          body: JSON.stringify(contentSlotCreatePayload(slot)),
        });
      }
      setMessage(labels.ensured);
      onReload();
    } catch (requestError) {
      setError(requestError.message || labels.createFailed);
    } finally {
      setEnsuring(false);
    }
  }

  async function save(item) {
    if (!canEdit || !draft) return;
    setError("");
    setMessage("");
    setBusyKey(item.key);
    try {
      await apiRequest(`/admin/website-texts/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: JSON.stringify(draft),
      });
      cancelEdit();
      setMessage(labels.saved);
      onReload();
    } catch (requestError) {
      setError(requestError.message || labels.saveFailed);
    } finally {
      setBusyKey("");
    }
  }

  return (
    <section className="admin-panel-card website-texts-workspace" dir={ar ? "rtl" : "ltr"}>
      <header className="website-texts-workspace-header">
        <div>
          <h2>{ar ? "نصوص الصفحات" : "Page text"}</h2>
          <p>{labels.helper}</p>
        </div>
        <div className="website-texts-workspace-actions">
          {canMedia && (
            <button className="secondary-action" onClick={() => onNavigate?.("admin-website-media")} type="button">
              {labels.media}
            </button>
          )}
          {canEdit && workspace.missingCount > 0 && (
            <button className="admin-primary-button" disabled={ensuring} onClick={ensureMissing} type="button">
              {ensuring ? labels.adding : labels.addAll(workspace.missingCount)}
            </button>
          )}
        </div>
      </header>

      {!canEdit && <div className="message-panel website-texts-banner" role="status">{labels.viewOnly}</div>}
      {workspace.missingCount > 0 && (
        <div className="message-panel website-texts-banner" role="status">
          {labels.missingHelp} ({workspace.missingCount})
        </div>
      )}

      <div className="website-texts-toolbar">
        <nav className="website-texts-page-nav" aria-label={ar ? "صفحات المحتوى" : "Content pages"}>
          <button className={pageFilter === "all" ? "active" : ""} onClick={() => setPageFilter("all")} type="button">{labels.allPages}</button>
          {workspace.pages.map((page) => (
            <button className={pageFilter === page ? "active" : ""} key={page} onClick={() => setPageFilter(page)} type="button">{page}</button>
          ))}
        </nav>
        <label className="website-texts-search">
          <span className="sr-only">{labels.search}</span>
          <input aria-label={labels.search} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} value={query} />
        </label>
      </div>

      {message && <div className="message-panel success" role="status">{message}</div>}
      {error && <div className="message-panel error" role="alert">{error}</div>}

      {!sections.length ? (
        <div className="admin-empty-state">
          <strong>{labels.empty}</strong>
          <span>{labels.emptyHint}</span>
        </div>
      ) : sections.map((section) => (
        <section className="website-texts-section" key={`${section.page}-${section.section}`}>
          <header>
            <div>
              <p className="website-texts-eyebrow">{section.page}</p>
              <h3>{section.section}</h3>
            </div>
            <span>{section.items.length}</span>
          </header>
          <div className="website-texts-cards">
            {section.items.map((item) => {
              const editing = editingKey === item.key && item.status === "existing";
              const busy = busyKey === item.key;
              return (
                <article className={`website-texts-card is-${item.status}`} key={item.key}>
                  <div className="website-texts-card-head">
                    <div>
                      <strong>{item.location?.field || item.label || item.key}</strong>
                      <code className="website-text-key">{item.key}</code>
                      {(item.mediaKey || item.meta?.mediaKey) && (
                        <p className="website-texts-media-hint">
                          {ar ? "وسائط مرتبطة:" : "Related media:"}{" "}
                          <code>{item.mediaKey || item.meta?.mediaKey}</code>
                          {canMedia && (
                            <button
                              className="text-action"
                              onClick={() => {
                                const mediaKey = item.mediaKey || item.meta?.mediaKey;
                                if (typeof window !== "undefined") {
                                  window.location.hash = `mediaKey=${encodeURIComponent(mediaKey)}`;
                                }
                                onNavigate?.("admin-website-media");
                              }}
                              type="button"
                            >
                              {labels.media}
                            </button>
                          )}
                        </p>
                      )}
                    </div>
                    <span className={`website-texts-status-pill ${item.status}`}>{item.status === "missing" ? labels.missing : labels.existing}</span>
                  </div>
                  {item.status === "missing" ? (
                    <p className="website-texts-missing-copy">{labels.missingHelp}</p>
                  ) : (
                    <div className="website-texts-values">
                      <label>
                        {labels.english}
                        {editing ? (
                          <textarea
                            aria-label={`${labels.english} ${item.key}`}
                            disabled={busy}
                            onChange={(event) => setDraft((current) => ({ ...current, valueEn: event.target.value }))}
                            value={draft?.valueEn || ""}
                          />
                        ) : (
                          <span>{textValue(item.valueEn) || "—"}</span>
                        )}
                      </label>
                      <label>
                        {labels.arabic}
                        {editing ? (
                          <textarea
                            aria-label={`${labels.arabic} ${item.key}`}
                            dir="rtl"
                            disabled={busy}
                            onChange={(event) => setDraft((current) => ({ ...current, valueAr: event.target.value }))}
                            value={draft?.valueAr || ""}
                          />
                        ) : (
                          <span dir="rtl">{textValue(item.valueAr) || "—"}</span>
                        )}
                      </label>
                    </div>
                  )}
                  <footer className="website-texts-card-actions">
                    {item.status === "missing" ? (
                      canEdit && (
                        <button className="admin-primary-button" disabled={busy || ensuring} onClick={() => createMissing(item)} type="button">
                          {busy ? labels.adding : labels.add}
                        </button>
                      )
                    ) : editing ? (
                      <>
                        <label className="checkbox-line">
                          <input
                            checked={draft?.isActive !== false}
                            disabled={busy}
                            onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))}
                            type="checkbox"
                          />
                          {labels.active}
                        </label>
                        <button className="admin-primary-button" disabled={busy} onClick={() => save(item)} type="button">{labels.save}</button>
                        <button className="secondary-action" disabled={busy} onClick={cancelEdit} type="button">{labels.cancel}</button>
                      </>
                    ) : (
                      <>
                        <span className="website-texts-active-label">{item.isActive === false ? labels.inactive : labels.active}</span>
                        {canEdit && <button className="text-action" onClick={() => beginEdit(item)} type="button">{labels.edit}</button>}
                      </>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </section>
  );
}

function rowsFrom(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.logs)) return data.logs;
  if (data && typeof data === "object") {
    const nestedRows = Object.values(data).find(Array.isArray);
    if (nestedRows) return nestedRows;
    if (data.summary && typeof data.summary === "object") return [data.summary];
  }
  return data && typeof data === "object" ? [data] : [];
}

export default function AdminFeaturePage({ activePage, ...layout }) {
  const feature = features[activePage];
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState("");
  const [reloadVersion, setReloadVersion] = React.useState(0);
  React.useEffect(() => {
    let active = true;
    setData(null); setError("");
    apiRequest(feature.endpoint).then((result) => active && setData(result)).catch((requestError) => active && setError(requestError.message));
    return () => { active = false; };
  }, [feature.endpoint, reloadVersion]);
  const rows = rowsFrom(data);
  const keys = rows.length ? Object.keys(rows[0]).filter((key) => typeof rows[0][key] !== "object").slice(0, 10) : [];
  const isWebsiteTexts = activePage === "admin-website-texts";
  return <AdminLayout activePage={activePage} title={feature.title} subtitle="Tenant-scoped company module" {...layout}>
    {error && <div className="message-panel error" role="alert">{error}</div>}
    {data === null && !error && <section className="admin-panel-card">Loading...</section>}
    {data !== null && isWebsiteTexts && (
      <WebsiteTextsPanel
        company={layout.company}
        currentUser={layout.currentUser}
        language={layout.language}
        onNavigate={layout.onNavigate}
        rows={rows}
        onReload={() => setReloadVersion((value) => value + 1)}
      />
    )}
    {data !== null && !isWebsiteTexts && !rows.length && <div className="admin-empty-state"><strong>No records yet</strong><span>This company has no {feature.title.toLowerCase()} data.</span></div>}
    {data !== null && !isWebsiteTexts && rows.length > 0 && <div className="admin-data-table-wrap"><table className="admin-data-table"><thead><tr>{keys.map((key) => <th key={key}>{key.replaceAll("_", " ")}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id || index}>{keys.map((key) => <td key={key}>{typeof row[key] === "boolean" ? String(row[key]) : textValue(row[key]) || "—"}</td>)}</tr>)}</tbody></table></div>}
  </AdminLayout>;
}

export const featurePageKeys = Object.freeze(Object.keys(features));
