import React from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import { apiRequest } from "../utils/api.js";
import { hasPermission } from "../data/permissions.js";
import { ANNOUNCEMENT_PLACEMENT_LABELS, joinLabels } from "../utils/employee4Labels.js";
import AdminAnimationPicker from "../components/AdminAnimationPicker.jsx";
import { useClientPager, ClientPagerControls } from "../components/Employee4Workspace.jsx";

const empty = { title: "", text: "", link: "", text_color: "#ffffff", background_color: "#111827", alignment: "CENTER", is_active: true, priority: 0, placement: "ALL_PAGES", selected_pages: [], start_date: "", end_date: "" };
const pages = ["/", "/products", "/about", "/sustainability", "/how-it-works", "/cleanups", "/eb-points", "/follow-us", "/cart", "/checkout"];

export default function AdminAnnouncementsPage({ company, currentUser, language = "en", modules, onNavigate, onLogout, onLanguageChange, onReturnToPlatform, onSwitchCompany, onToggleDarkMode, isDarkMode }) {
  const ar = language === "ar";
  const tr = (en, arText) => (ar ? arText : en);
  const canManage = hasPermission(currentUser, "announcements.manage");
  const [items, setItems] = React.useState([]); const [editing, setEditing] = React.useState(null); const [error, setError] = React.useState(""); const [notice, setNotice] = React.useState("");
  const pager = useClientPager(items, 10);
  const layout = { activePage: "admin-announcements", company, currentUser, isDarkMode, language, modules, onLanguageChange, onLogout, onNavigate, onReturnToPlatform, onSwitchCompany, onToggleDarkMode };
  const canManageSplashAds = hasPermission(currentUser, "splash_ads.manage");
  const [globalAnim, setGlobalAnim] = React.useState({});
  const [applyingAnim, setApplyingAnim] = React.useState(false);

  // Global animation settings — one place, applied to every announcement bar at once
  // (and optionally to all splash ads) so the whole storefront moves consistently.
  async function applyGlobalAnimation(scope) {
    if (!canManage || applyingAnim) return;
    setApplyingAnim(true);
    setError("");
    setNotice("");
    try {
      if (scope === "splash") {
        const data = await apiRequest("/admin/splash-ads");
        const targets = Array.isArray(data?.items) ? data.items : [];
        await Promise.all(targets.map((item) =>
          apiRequest(`/admin/splash-ads/${item.id}`, { method: "PATCH", body: JSON.stringify(globalAnim) })));
        setNotice(ar ? `تم تطبيق إعداد الأنميشن على ${targets.length} إعلان بداية.` : `Animation settings applied to ${targets.length} splash ads.`);
      } else {
        await Promise.all(items.map((item) =>
          apiRequest(`/admin/announcements/${item.id}`, { method: "PATCH", body: JSON.stringify(globalAnim) })));
        setNotice(ar ? `تم تطبيق إعداد الأنميشن على ${items.length} إعلان عاجل.` : `Animation settings applied to ${items.length} announcement bars.`);
        await load();
      }
    } catch (e) { setError(e.message); } finally { setApplyingAnim(false); }
  }
  const load = React.useCallback(async () => { try { setItems((await apiRequest("/admin/announcements")).items || []); } catch (e) { setError(e.message); } }, []);
  React.useEffect(() => { void load(); }, [load]);
  async function save(e) { e.preventDefault(); try { const data = editing.id ? await apiRequest(`/admin/announcements/${editing.id}`, { method: "PATCH", body: JSON.stringify(editing) }) : await apiRequest("/admin/announcements", { method: "POST", body: JSON.stringify(editing) }); setItems((cur) => editing.id ? cur.map((x) => x.id === data.id ? data : x) : [data, ...cur]); setEditing(null); setNotice(ar ? "تم حفظ الإعلان." : "Announcement saved."); } catch (e2) { setError(e2.message); } }
  async function remove(id) { if (!window.confirm(ar ? "حذف هذا الإعلان؟" : "Delete announcement?")) return; try { await apiRequest(`/admin/announcements/${id}`, { method: "DELETE" }); setItems((cur) => cur.filter((x) => x.id !== id)); } catch (e) { setError(e.message); } }
  return <AdminLayout {...layout} title={ar ? "الإعلانات العاجلة" : "Announcements"} subtitle={ar ? "شريط إعلانات مجدول مع استهداف الصفحات." : "Scheduled announcement bars with page targeting and priority."}>
    {notice && <div className="message-panel success">{notice}</div>}{error && <div className="message-panel error">{error}</div>}
    {canManage && (
      <section className="admin-panel-card admin-anim-picker">
        <div className="admin-section-head">
          <div>
            <h2>{ar ? "إعداد الأنميشن العام" : "Global animation settings"}</h2>
            <p>{ar ? "اختر نمط الحركة مرة واحدة وطبّقه على جميع الإعلانات العاجلة، وعلى إعلانات البداية أيضاً ليتحرك المتجر كواجهة واحدة متناسقة." : "Pick the motion style once and apply it to every announcement bar — and to all splash ads too — so the whole storefront animates consistently."}</p>
          </div>
        </div>
        <AdminAnimationPicker language={language} value={globalAnim} onChange={setGlobalAnim} />
        <div className="admin-anim-actions">
          <button className="admin-primary-button" type="button" disabled={applyingAnim || !items.length} onClick={() => void applyGlobalAnimation("announcements")}>
            {applyingAnim ? (ar ? "جارٍ التطبيق…" : "Applying…") : (ar ? `تطبيق على جميع الإعلانات العاجلة (${items.length})` : `Apply to all announcement bars (${items.length})`)}
          </button>
          {canManageSplashAds && (
            <button className="admin-secondary-button" type="button" disabled={applyingAnim} onClick={() => void applyGlobalAnimation("splash")}>
              {ar ? "تطبيق على إعلانات البداية أيضاً" : "Also apply to splash ads"}
            </button>
          )}
        </div>
      </section>
    )}
    <section className="admin-panel-card"><div className="admin-section-head"><div><h2>{ar ? "الإعلانات" : "Announcements"}</h2><p>{ar ? "تستهلك واجهة المتجر التغييرات ديناميكياً." : "Changes are consumed dynamically by the storefront API."}</p></div><div className="announcement-header-actions">{canManage && <button className="admin-primary-button" onClick={() => setEditing({ ...empty })} type="button">{ar ? "إضافة إعلان" : "Add announcement"}</button>}</div></div><div className="admin-data-table-wrap"><table className="admin-data-table"><thead><tr><th>{ar ? "العنوان" : "Title"}</th><th>{ar ? "نشط" : "Active"}</th><th>{ar ? "الأولوية" : "Priority"}</th><th>{ar ? "الموضع" : "Placement"}</th><th>{ar ? "الجدول" : "Schedule"}</th><th className="admin-data-table-actions">{ar ? "إجراء" : "Actions"}</th></tr></thead><tbody>{pager.pageItems.map((x) => <tr key={x.id}><td><strong className="admin-data-table-cell-clip" title={x.title}>{x.title}</strong><span className="table-muted">{x.text}</span></td><td>{x.is_active === false ? (ar ? "معطّل" : "Disabled") : (ar ? "مفعّل" : "Enabled")}</td><td>{x.priority}</td><td>{joinLabels(ANNOUNCEMENT_PLACEMENT_LABELS, [x.placement], ar)}</td><td>{x.start_date || (ar ? "أي وقت" : "Any")} → {x.end_date || (ar ? "أي وقت" : "Any")}</td><td className="admin-data-table-actions" data-label={ar ? "الإجراء" : "Actions"}>{canManage ? <div className="row-actions"><button className="text-action" onClick={() => setEditing({ ...x, selected_pages: x.selected_pages || [] })}>{ar ? "تعديل" : "Edit"}</button><button className="text-action danger" onClick={() => void remove(x.id)}>{ar ? "حذف" : "Delete"}</button></div> : "—"}</td></tr>)}</tbody></table></div><ClientPagerControls {...pager} ar={ar} /></section>
{editing && canManage &&<section className="admin-panel-card"><form onSubmit={save} className="admin-form-grid"><label>{ar ? "العنوان" : "Title"}<input required value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label><label>{ar ? "الرابط" : "Link"}<input type="url" value={editing.link || ""} onChange={(e) => setEditing({ ...editing, link: e.target.value })} /></label><label className="full-field">{ar ? "النص" : "Text"}<textarea required rows="4" value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} /></label><label>{ar ? "لون النص" : "Text color"}<input type="color" value={editing.text_color || "#ffffff"} onChange={(e) => setEditing({ ...editing, text_color: e.target.value })} /></label><label>{ar ? "الخلفية" : "Background"}<input type="color" value={editing.background_color || "#111827"} onChange={(e) => setEditing({ ...editing, background_color: e.target.value })} /></label><label>{ar ? "المحاذاة" : "Alignment"}<select value={editing.alignment || "CENTER"} onChange={(e) => setEditing({ ...editing, alignment: e.target.value })}><option value="LEFT">{ar ? "يسار" : "Left"}</option><option value="CENTER">{ar ? "وسط" : "Center"}</option><option value="RIGHT">{ar ? "يمين" : "Right"}</option></select></label><label>{ar ? "الموضع" : "Placement"}<select value={editing.placement || "ALL_PAGES"} onChange={(e) => setEditing({ ...editing, placement: e.target.value })}><option value="ALL_PAGES">{ar ? "كل الصفحات" : "All pages"}</option><option value="HOMEPAGE">{ar ? "الصفحة الرئيسية فقط" : "Homepage only"}</option><option value="SELECTED_PAGES">{ar ? "صفحات محددة" : "Selected pages"}</option></select></label><label>{ar ? "الأولوية" : "Priority"}<input type="number" value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })} /></label><label>{ar ? "البداية" : "Start"}<input type="datetime-local" value={editing.start_date ? editing.start_date.slice(0,16) : ""} onChange={(e) => setEditing({ ...editing, start_date: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label><label>{ar ? "النهاية" : "End"}<input type="datetime-local" value={editing.end_date ? editing.end_date.slice(0,16) : ""} onChange={(e) => setEditing({ ...editing, end_date: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label><label className="checkbox-line"><input type="checkbox" checked={editing.is_active !== false} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> {ar ? "نشط" : "Active"}</label>{editing.placement === "SELECTED_PAGES" && <fieldset className="full-field"><legend>{ar ? "الصفحات المحددة" : "Selected pages"}</legend>{pages.map((page) => <label className="checkbox-line" key={page}><input type="checkbox" checked={(editing.selected_pages || []).includes(page)} onChange={(e) => setEditing({ ...editing, selected_pages: e.target.checked ? [...new Set([...(editing.selected_pages || []), page])] : (editing.selected_pages || []).filter((x) => x !== page) })} />{page}</label>)}<label className="full-field">{ar ? "مسارات الصفحات المخصصة" : "Custom page paths"}<textarea rows="3" value={(editing.selected_pages || []).filter((page) => !pages.includes(page)).join("\n")} onChange={(e) => setEditing({ ...editing, selected_pages: [...new Set([...(editing.selected_pages || []).filter((page) => pages.includes(page)), ...e.target.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean)])] })} placeholder="/campaign/summer\n/faq" /></label></fieldset>}<div className="row-actions"><button className="admin-primary-button" type="submit">{ar ? "حفظ" : "Save"}</button><button className="text-action" type="button" onClick={() => setEditing(null)}>{ar ? "إلغاء" : "Cancel"}</button></div></form><div className="announcement-preview" style={{ color: editing.text_color, background: editing.background_color, textAlign: String(editing.alignment || "center").toLowerCase() }}><strong>{editing.title || (ar ? "عنوان المعاينة" : "Preview title")}</strong><span>{editing.text || (ar ? "نص المعاينة" : "Preview text")}</span></div></section>}
  </AdminLayout>;
}
