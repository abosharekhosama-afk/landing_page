import React from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import AdminMediaField from "../components/AdminMediaField.jsx";
import { apiRequest } from "../utils/api.js";
import { hasPermission } from "../data/permissions.js";
import AdminAnimationPicker from "../components/AdminAnimationPicker.jsx";
import { useClientPager, ClientPagerControls } from "../components/Employee4Workspace.jsx";
import {
  bannerFormFromItem,
  bannerPreviewModel,
  bannerSavePayload,
  bannerStatusLabel,
  bannerStatusOf,
  emptyBannerForm,
  moveBanner,
  validateBannerForm,
} from "../utils/bannersUi.js";

const localDate = (value) => value ? new Date(value).toISOString().slice(0, 16) : "";

// Small preview of one banner frame fed by the live form state.
function BannerPreviewFrame({ ar, image, label, narrow, title, description, ctaText, ctaTarget }) {
  return (
    <div className={narrow ? "admin-banner-preview-frame narrow" : "admin-banner-preview-frame"}>
      <p className="admin-banner-preview-caption">{label}</p>
      <div className="admin-banner-preview-slide">
        {image ? (
          <img
            alt={title || label}
            src={image}
            onError={(event) => {
              event.currentTarget.src = "/images/products/product-placeholder.svg";
            }}
          />
        ) : (
          <div className="admin-banner-preview-empty">{ar ? "لا توجد صورة بعد" : "No image yet"}</div>
        )}
        <div className="admin-banner-preview-copy">
          {title && <strong>{title}</strong>}
          {description && <span>{description}</span>}
          {ctaText && (
            <button className="primary-action" type="button" onClick={(event) => event.preventDefault()}>
              {ctaText}
            </button>
          )}
        </div>
      </div>
      <p className="admin-banner-preview-target">
        {ar ? "الوجهة" : "Target"}: {ctaTarget.kind} → {ctaTarget.target}
      </p>
    </div>
  );
}

export default function AdminBannersPage({ company, currentUser, language = "en", modules, onNavigate, onLogout, onLanguageChange, onReturnToPlatform, onSwitchCompany, onToggleDarkMode, isDarkMode }) {
  const ar = language === "ar";
  const canManage = hasPermission(currentUser, "banners.manage");
  const [items, setItems] = React.useState([]);
  const [editing, setEditing] = React.useState(null);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [listStatus, setListStatus] = React.useState("loading");
  const [saveState, setSaveState] = React.useState("idle");
  const [movingId, setMovingId] = React.useState(null);
  const [fieldErrors, setFieldErrors] = React.useState({});
  const pager = useClientPager(items, 10);
  const layout = { activePage: "admin-banners", company, currentUser, isDarkMode, language, modules, onLanguageChange, onLogout, onNavigate, onReturnToPlatform, onSwitchCompany, onToggleDarkMode };
  const [globalAnim, setGlobalAnim] = React.useState({});
  const [applyingAnim, setApplyingAnim] = React.useState(false);

  // Global animation settings — one place, applied to every home banner at once
  // (and optionally to splash ads and urgent announcement bars) so the whole
  // storefront animates consistently. Each banner keeps its own scheduling,
  // activation state and display order; only the animation fields change.
  async function applyGlobalAnimation(scope) {
    if (!canManage || applyingAnim) return;
    setApplyingAnim(true);
    setError("");
    setNotice("");
    try {
      if (scope === "splash" || scope === "announcements") {
        const url = scope === "splash" ? "/admin/splash-ads" : "/admin/announcements";
        const data = await apiRequest(url);
        const targets = Array.isArray(data?.items) ? data.items : [];
        await Promise.all(targets.map((item) =>
          apiRequest(`${url}/${item.id}`, { method: "PATCH", body: JSON.stringify(globalAnim) })));
        setNotice(ar ? `تم تطبيق إعداد الأنميشن على ${targets.length} عنصر.` : `Animation settings applied to ${targets.length} items.`);
      } else {
        await Promise.all(items.map((item) =>
          apiRequest(`/home-offers/${item.id}`, {
            method: "PUT",
            body: JSON.stringify({
              ...globalAnim,
              isActive: item.isActive !== false,
              autoplay: item.autoplay !== false,
              displayOrder: Number(item.displayOrder || 0),
              transitionDurationMs: Number(item.transitionDurationMs || 5000),
            }),
          })));
        setNotice(ar ? `تم تطبيق إعداد الأنميشن على ${items.length} لافتة.` : `Animation settings applied to ${items.length} banners.`);
        await load();
      }
    } catch (e) { setError(e.message); } finally { setApplyingAnim(false); }
  }
  // Initial list load with a real loading state (skeleton) and an honest
  // error state with retry — never a silent empty table on failure.
  const load = React.useCallback(async () => {
    setListStatus("loading");
    setError("");
    try {
      setItems(await apiRequest("/home-offers/all"));
      setListStatus("ready");
    } catch (e) {
      setError(e.message);
      setListStatus("error");
    }
  }, []);
  React.useEffect(() => { void load(); }, [load]);
  function field(name, value) {
    setEditing((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  }
  function startCreate() {
    setEditing(emptyBannerForm());
    setFieldErrors({});
    setError("");
    setNotice("");
  }
  function startEdit(item) {
    setEditing(bannerFormFromItem(item));
    setFieldErrors({});
    setError("");
    setNotice("");
  }
  // Create/update through the existing home-offers API (the single source of
  // truth). The form is validated with the same contract the server enforces
  // (validateOffer on the merged document), so field errors appear instantly
  // and the request only fires when the payload is valid.
  async function save(event) {
    event.preventDefault();
    if (!editing || saveState === "saving") return;
    const errors = validateBannerForm(editing, language);
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;
    setSaveState("saving");
    setError("");
    setNotice("");
    try {
      const payload = bannerSavePayload(editing);
      const saved = editing.id
        ? await apiRequest(`/home-offers/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) })
        : await apiRequest("/home-offers", { method: "POST", body: JSON.stringify(payload) });
      setItems((current) => [...(editing.id ? current.filter((x) => x.id !== saved.id) : current), saved].sort((a, b) => Number(a.displayOrder) - Number(b.displayOrder)));
      setEditing(null);
      setFieldErrors({});
      setNotice(ar ? "تم حفظ اللافتة." : "Banner saved.");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaveState("idle");
    }
  }
  async function remove(id) {
    if (!window.confirm(ar ? "حذف اللافتة؟" : "Delete this banner?")) return;
    try {
      await apiRequest(`/home-offers/${id}`, { method: "DELETE" });
      setItems((current) => current.filter((x) => x.id !== id));
    } catch (e) { setError(e.message); }
  }
  // Optional display-order controls: swap the banner with its visual neighbor
  // and persist the two touched rows through the same home-offers API.
  async function move(id, direction) {
    if (!canManage || movingId) return;
    const previousById = new Map(items.map((item) => [String(item.id), item]));
    const { items: next, moved } = moveBanner(items, id, direction);
    if (!moved) return;
    const changed = next.filter((item) => previousById.get(String(item.id))?.displayOrder !== item.displayOrder);
    setMovingId(id);
    setError("");
    try {
      for (const item of changed) {
        await apiRequest(`/home-offers/${item.id}`, { method: "PUT", body: JSON.stringify(item) });
      }
      setItems(next);
    } catch (e) {
      setError(e.message);
    } finally {
      setMovingId(null);
    }
  }
  const preview = editing ? bannerPreviewModel(editing, language) : null;
  const previewStatus = preview ? bannerStatusLabel(preview.status, language) : "";
  const saving = saveState === "saving";
  return (
    <AdminLayout {...layout} title={ar ? "لافتات الصفحة الرئيسية" : "Home Banners"} subtitle={ar ? "تحديث نظام العروض الحالي دون إنشاء نظام لافتات موازٍ." : "Upgrade the existing home-offer/banner system without creating a parallel banner system."}>
      {error && <div className="message-panel error" role="alert">{error}</div>}
      {notice && <div className="message-panel success" aria-live="polite">{notice}</div>}
      {canManage && (() => { const canSplash = hasPermission(currentUser, "splash_ads.manage"); const canAnnouncements = hasPermission(currentUser, "announcements.manage"); return (
        <section className="admin-panel-card admin-anim-picker">
          <div className="admin-section-head">
            <div>
              <h2>{ar ? "إعداد الأنميشن العام" : "Global animation settings"}</h2>
              <p>{ar ? "اختر نمط الحركة مرة واحدة وطبّقه على جميع اللافتات، وعلى إعلانات البداية والإعلانات العاجلة أيضاً ليتحرك المتجر كواجهة واحدة متناسقة." : "Pick the motion style once and apply it to every banner — and to splash ads and announcement bars too — so the whole storefront animates consistently."}</p>
            </div>
          </div>
          <AdminAnimationPicker language={language} value={globalAnim} onChange={setGlobalAnim} />
          <div className="admin-anim-actions">
            <button className="admin-primary-button" type="button" disabled={applyingAnim || !items.length} onClick={() => void applyGlobalAnimation("banners")}>
              {applyingAnim ? (ar ? "جارٍ التطبيق…" : "Applying…") : (ar ? `تطبيق على جميع اللافتات (${items.length})` : `Apply to all banners (${items.length})`)}
            </button>
            {canSplash && <button className="admin-secondary-button" type="button" disabled={applyingAnim} onClick={() => void applyGlobalAnimation("splash")}>{ar ? "تطبيق على إعلانات البداية أيضاً" : "Also apply to splash ads"}</button>}
            {canAnnouncements && <button className="admin-secondary-button" type="button" disabled={applyingAnim} onClick={() => void applyGlobalAnimation("announcements")}>{ar ? "تطبيق على الإعلانات العاجلة أيضاً" : "Also apply to announcement bars"}</button>}
          </div>
        </section>
      ); })()}
      <section className="admin-panel-card">
        <div className="admin-section-head">
          <div>
            <h2>{ar ? "اللافتات الحالية" : "Existing banners"}</h2>
            <p>{ar ? "تُطبَّق التغييرات عبر واجهة العروض الرئيسية الحالية." : "Changes are applied through the existing homepage offer API."}</p>
          </div>
          {canManage && <button className="admin-primary-button" type="button" onClick={startCreate}>{ar ? "إضافة لافتة" : "Add banner"}</button>}
        </div>
        {listStatus === "loading" && (
          <div className="admin-loading-state" aria-busy="true">
            <div className="home-offers-skeleton" />
            <p>{ar ? "جارٍ تحميل اللافتات…" : "Loading banners…"}</p>
          </div>
        )}
        {listStatus === "error" && (
          <div className="admin-error-state">
            <p>{ar ? "تعذر تحميل اللافتات." : "Banners could not be loaded."}</p>
            <button className="admin-secondary-button" type="button" onClick={() => void load()}>{ar ? "إعادة المحاولة" : "Retry"}</button>
          </div>
        )}
        {listStatus === "ready" && (
          <>
            <div className="admin-data-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>{ar ? "الترتيب" : "Order"}</th>
                    <th>{ar ? "العنوان" : "Title"}</th>
                    <th>{ar ? "الحالة" : "Status"}</th>
                    <th>{ar ? "التشغيل التلقائي" : "Autoplay"}</th>
                    <th>{ar ? "الجدول" : "Schedule"}</th>
                    <th className="admin-data-table-actions">{ar ? "إجراء" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {pager.pageItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.displayOrder}</td>
                      <td><span className="admin-data-table-cell-clip" title={item.title?.[language] || item.title?.en || item.title?.ar || ""}>{item.title?.[language] || item.title?.en || item.title?.ar || "—"}</span></td>
                      <td><span className={`admin-status-pill status-${bannerStatusOf(item)}`}>{bannerStatusLabel(bannerStatusOf(item), language)}</span></td>
                      <td>{item.autoplay === false ? (ar ? "لا" : "No") : (ar ? "نعم" : "Yes")}</td>
                      <td>{item.startAt ? new Date(item.startAt).toLocaleString() : (ar ? "أي وقت" : "Any")} → {item.endAt ? new Date(item.endAt).toLocaleString() : (ar ? "أي وقت" : "Any")}</td>
                      <td className="admin-data-table-actions">
                        {canManage ? (
                          <div className="row-actions">
                            <button className="text-action" type="button" disabled={movingId === item.id} title={ar ? "تحريك لأعلى" : "Move up"} aria-label={ar ? `تحريك ${item.id} لأعلى` : `Move ${item.id} up`} onClick={() => void move(item.id, "up")}>↑</button>
                            <button className="text-action" type="button" disabled={movingId === item.id} title={ar ? "تحريك لأسفل" : "Move down"} aria-label={ar ? `تحريك ${item.id} لأسفل` : `Move ${item.id} down`} onClick={() => void move(item.id, "down")}>↓</button>
                            <button className="text-action" type="button" onClick={() => startEdit(item)}>{ar ? "تعديل" : "Edit"}</button>
                            <button aria-label={ar ? `حذف ${item.id}` : `Delete ${item.id}`} className="text-action danger" type="button" onClick={() => void remove(item.id)}>{ar ? "حذف" : "Delete"}</button>
                          </div>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ClientPagerControls {...pager} ar={ar} />
          </>
        )}
      </section>
      {editing && canManage && (
        <section className="admin-panel-card" aria-busy={saving}>
          <div className="admin-section-head">
            <div>
              <h2>{editing.id ? (ar ? "تعديل اللافتة" : "Edit banner") : (ar ? "لافتة جديدة" : "New banner")}</h2>
              <p>{ar ? "المعاينة تعكس بيانات الفورم الحالية مباشرة." : "The preview mirrors the current form data live."}</p>
            </div>
            <span className={`admin-status-pill status-${bannerStatusOf(editing)}`}>{bannerStatusLabel(bannerStatusOf(editing), language)}</span>
          </div>
          <form className="admin-form-grid" onSubmit={save}>
            <label>
              {ar ? "العنوان (إنجليزي)" : "Title EN"}
              <input required value={editing.title?.en || ""} onChange={(e) => field("title", { ...(editing.title || {}), en: e.target.value })} />
              {fieldErrors.title && <small className="field-error" role="alert">{fieldErrors.title}</small>}
            </label>
            <label dir="rtl">
              {ar ? "العنوان (عربي)" : "العنوان AR"}
              <input value={editing.title?.ar || ""} onChange={(e) => field("title", { ...(editing.title || {}), ar: e.target.value })} />
            </label>
            <label>
              {ar ? "زر الإجراء (إنجليزي)" : "CTA EN"}
              <input value={editing.ctaText?.en || ""} onChange={(e) => field("ctaText", { ...(editing.ctaText || {}), en: e.target.value })} />
              {fieldErrors.ctaText && <small className="field-error" role="alert">{fieldErrors.ctaText}</small>}
            </label>
            <label>
              {ar ? "زر الإجراء (عربي)" : "CTA AR"}
              <input value={editing.ctaText?.ar || ""} onChange={(e) => field("ctaText", { ...(editing.ctaText || {}), ar: e.target.value })} />
            </label>
            <label>
              {ar ? "رابط الزر" : "CTA link"}
              <input value={editing.ctaLink || ""} placeholder="products, /offers, https://…" onChange={(e) => field("ctaLink", e.target.value)} />
              <small className="field-hint">{ar ? "مسموح: products أو اسم قسم أو /مسار أو https://… — ممنوع: javascript: وأي رابط غير آمن." : "Allowed: products, a category slug, /path or https://… — blocked: javascript: and any unsafe URL."}</small>
              {fieldErrors.ctaLink && <small className="field-error" role="alert">{fieldErrors.ctaLink}</small>}
            </label>
            <label>
              {ar ? "ترتيب العرض" : "Display order"}
              <input type="number" min="0" value={editing.displayOrder ?? 0} onChange={(e) => field("displayOrder", Number(e.target.value))} />
              {fieldErrors.displayOrder && <small className="field-error" role="alert">{fieldErrors.displayOrder}</small>}
            </label>
            <label className="full-field">
              {ar ? "الوصف (إنجليزي)" : "Description EN"}
              <textarea rows="3" value={editing.description?.en || ""} onChange={(e) => field("description", { ...(editing.description || {}), en: e.target.value })} />
            </label>
            <label className="full-field" dir="rtl">
              {ar ? "الوصف (عربي)" : "الوصف AR"}
              <textarea rows="3" value={editing.description?.ar || ""} onChange={(e) => field("description", { ...(editing.description || {}), ar: e.target.value })} />
            </label>
            <div className="full-field">
              <AdminMediaField bannerImage label={ar ? "صورة سطح المكتب" : "Desktop image"} name="desktopImage" value={editing.desktopImage || editing.image || ""} onChange={(e) => field("desktopImage", e.target.value)} />
            </div>
            <div className="full-field">
              <AdminMediaField bannerImage label={ar ? "صورة الجوال" : "Mobile image"} name="mobileImage" value={editing.mobileImage || editing.image || ""} onChange={(e) => field("mobileImage", e.target.value)} />
            </div>
            <label className="checkbox-line">
              <input type="checkbox" checked={editing.isActive !== false} onChange={(e) => field("isActive", e.target.checked)} /> {ar ? "مفعّلة" : "Enabled"}
            </label>
            <label className="checkbox-line">
              <input type="checkbox" checked={editing.autoplay !== false} onChange={(e) => field("autoplay", e.target.checked)} /> {ar ? "التشغيل التلقائي" : "Autoplay"}
            </label>
            <label>
              {ar ? "مدة الانتقال (مللي ثانية)" : "Transition duration (ms)"}
              <input type="number" min="500" max="60000" value={editing.transitionDurationMs || 5000} onChange={(e) => field("transitionDurationMs", Number(e.target.value))} />
              {fieldErrors.transitionDurationMs && <small className="field-error" role="alert">{fieldErrors.transitionDurationMs}</small>}
            </label>
            <label>
              {ar ? "البداية" : "Start"}
              <input type="datetime-local" value={localDate(editing.startAt)} onChange={(e) => field("startAt", e.target.value ? new Date(e.target.value).toISOString() : null)} />
              {fieldErrors.startAt && <small className="field-error" role="alert">{fieldErrors.startAt}</small>}
            </label>
            <label>
              {ar ? "النهاية" : "End"}
              <input type="datetime-local" value={localDate(editing.endAt)} onChange={(e) => field("endAt", e.target.value ? new Date(e.target.value).toISOString() : null)} />
              {fieldErrors.endAt && <small className="field-error" role="alert">{fieldErrors.endAt}</small>}
            </label>
            <div className="row-actions">
              <button className="admin-primary-button" type="submit" disabled={saving}>{saving ? (ar ? "جارٍ الحفظ…" : "Saving…") : (ar ? "حفظ" : "Save")}</button>
              <button className="text-action" type="button" disabled={saving} onClick={() => { setEditing(null); setFieldErrors({}); }}>{ar ? "إلغاء" : "Cancel"}</button>
            </div>
          </form>
          {preview && (
            <div className="admin-banner-preview" aria-live="polite">
              <div className="admin-section-head">
                <div>
                  <h3>{ar ? "معاينة اللافتة" : "Banner preview"}</h3>
                  <p>{ar ? "نفس بيانات الفورم — الحالة" : "Same form data — status"}: {previewStatus}</p>
                </div>
              </div>
              <div className="admin-banner-preview-frames">
                <BannerPreviewFrame ar={ar} label={ar ? "سطح المكتب" : "Desktop"} image={preview.desktopImage} title={preview.title} description={preview.description} ctaText={preview.ctaText} ctaTarget={preview.ctaTarget} />
                <BannerPreviewFrame ar={ar} narrow label={ar ? "الجوال" : "Mobile"} image={preview.mobileImage} title={preview.title} description={preview.description} ctaText={preview.ctaText} ctaTarget={preview.ctaTarget} />
              </div>
            </div>
          )}
        </section>
      )}
    </AdminLayout>
  );
}
