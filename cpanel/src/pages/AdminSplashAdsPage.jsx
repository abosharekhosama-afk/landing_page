import React from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import AdminMediaField from "../components/AdminMediaField.jsx";
import { apiRequest } from "../utils/api.js";
import { hasPermission } from "../data/permissions.js";
import { SPLASH_FREQUENCY_LABELS, makeLabeler } from "../utils/employee4Labels.js";
import { useClientPager, ClientPagerControls } from "../components/Employee4Workspace.jsx";
import AdminAnimationPicker from "../components/AdminAnimationPicker.jsx";

const empty = {
  title: "",
  desktop_image_id: "",
  mobile_image_id: "",
  link: "",
  is_active: true,
  start_date: "",
  end_date: "",
  close_delay_seconds: 0,
  display_duration_seconds: 5,
  frequency: "EVERY_VISIT",
  excluded_pages: [],
};

const frequencies = ["EVERY_VISIT", "ONCE_PER_SESSION", "ONCE_PER_DAY"];
const localDate = (value) => (value ? new Date(value).toISOString().slice(0, 16) : "");

export default function AdminSplashAdsPage({ company, currentUser, language = "en", modules, onNavigate, onLogout, onLanguageChange, onReturnToPlatform, onSwitchCompany, onToggleDarkMode, isDarkMode }) {
  const ar = language === "ar";
  const L = makeLabeler(ar);
  const canManage = hasPermission(currentUser, "splash_ads.manage");
  const canView = hasPermission(currentUser, "splash_ads.view") || canManage;
  const [items, setItems] = React.useState([]);
  const [editing, setEditing] = React.useState(null);
  const [metrics, setMetrics] = React.useState({});
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const pager = useClientPager(items, 10);
  const layout = { activePage: "admin-splash-ads", company, currentUser, isDarkMode, language, modules, onLanguageChange, onLogout, onNavigate, onReturnToPlatform, onSwitchCompany, onToggleDarkMode };
  const canManageAnnouncements = hasPermission(currentUser, "announcements.manage");
  const [globalAnim, setGlobalAnim] = React.useState({});
  const [applyingAnim, setApplyingAnim] = React.useState(false);

  // Global animation settings — applied from one place to every splash ad and,
  // optionally, every urgent announcement bar so the whole storefront moves alike.
  async function applyGlobalAnimation(scope) {
    if (!canManage || applyingAnim) return;
    setApplyingAnim(true);
    setError("");
    setNotice("");
    try {
      if (scope === "announcements") {
        const data = await apiRequest("/admin/announcements");
        const targets = Array.isArray(data?.items) ? data.items : [];
        await Promise.all(targets.map((item) =>
          apiRequest(`/admin/announcements/${item.id}`, { method: "PATCH", body: JSON.stringify(globalAnim) })));
        setNotice(ar ? `تم تطبيق إعداد الأنميشن على ${targets.length} إعلان عاجل.` : `Animation settings applied to ${targets.length} announcement bars.`);
      } else {
        await Promise.all(items.map((item) =>
          apiRequest(`/admin/splash-ads/${item.id}`, { method: "PATCH", body: JSON.stringify(globalAnim) })));
        setNotice(ar ? `تم تطبيق إعداد الأنميشن على ${items.length} إعلان بداية.` : `Animation settings applied to ${items.length} splash ads.`);
        await load();
      }
    } catch (e) { setError(e.message); } finally { setApplyingAnim(false); }
  }

  const load = React.useCallback(async () => {
    setError("");
    try {
      const data = await apiRequest("/admin/splash-ads");
      const next = Array.isArray(data?.items) ? data.items : [];
      setItems(next);
      const metricEntries = await Promise.all(next.map(async (item) => {
        try { return [item.id, await apiRequest(`/admin/splash-ads/${item.id}/metrics`)]; }
        catch { return [item.id, null]; }
      }));
      setMetrics(Object.fromEntries(metricEntries.filter(([, value]) => value)));
    } catch (e) { setError(e.message); }
  }, []);

  React.useEffect(() => { if (canView) void load(); }, [canView, load]);

  async function save(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const payload = {
        ...editing,
        desktop_image_id: String(editing.desktop_image_id || "").trim(),
        mobile_image_id: String(editing.mobile_image_id || "").trim(),
        start_date: editing.start_date ? new Date(editing.start_date).toISOString() : null,
        end_date: editing.end_date ? new Date(editing.end_date).toISOString() : null,
        close_delay_seconds: Number(editing.close_delay_seconds || 0),
        display_duration_seconds: Number(editing.display_duration_seconds || 5),
        excluded_pages: Array.isArray(editing.excluded_pages) ? editing.excluded_pages : [],
      };
      const saved = editing.id
        ? await apiRequest(`/admin/splash-ads/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await apiRequest("/admin/splash-ads", { method: "POST", body: JSON.stringify(payload) });
      setNotice(ar ? "تم حفظ الإعلان المنبثق." : "Splash ad saved.");
      setEditing(null);
      setItems((current) => editing.id
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...current]);
      await load();
    } catch (e) { setError(e.message); }
  }

  async function remove(id) {
    if (!window.confirm(ar ? "حذف الإعلان المنبثق؟" : "Delete this splash ad?")) return;
    try {
      await apiRequest(`/admin/splash-ads/${id}`, { method: "DELETE" });
      setItems((current) => current.filter((item) => item.id !== id));
      setNotice(ar ? "تم حذف الإعلان." : "Splash ad deleted.");
    } catch (e) { setError(e.message); }
  }

  function startEdit(item) {
    setEditing({ ...empty, ...item, excluded_pages: Array.isArray(item.excluded_pages) ? item.excluded_pages : [] });
  }

  return <AdminLayout {...layout} title={ar ? "الإعلانات المنبثقة" : "Splash Ads"} subtitle={ar ? "إدارة الإعلانات المجدولة وقياس المشاهدات والنقرات." : "Manage scheduled splash ads, exclusions, frequency and view/click metrics."}>
    {error && <div className="message-panel error">{error}</div>}
    {notice && <div className="message-panel success">{notice}</div>}
    {canManage && (
      <section className="admin-panel-card admin-anim-picker">
        <div className="admin-section-head">
          <div>
            <h2>{ar ? "إعداد الأنميشن العام" : "Global animation settings"}</h2>
            <p>{ar ? "اختر نمط الحركة مرة واحدة وطبّقه على جميع إعلانات البداية، وعلى الإعلانات العاجلة أيضاً ليتحرك المتجر كواجهة واحدة متناسقة." : "Pick the motion style once and apply it to every splash ad — and to the urgent announcement bars too — so the whole storefront animates consistently."}</p>
          </div>
        </div>
        <AdminAnimationPicker language={language} value={globalAnim} onChange={setGlobalAnim} />
        <div className="admin-anim-actions">
          <button className="admin-primary-button" type="button" disabled={applyingAnim || !items.length} onClick={() => void applyGlobalAnimation("splash")}>
            {applyingAnim ? (ar ? "جارٍ التطبيق…" : "Applying…") : (ar ? `تطبيق على جميع إعلانات البداية (${items.length})` : `Apply to all splash ads (${items.length})`)}
          </button>
          {canManageAnnouncements && (
            <button className="admin-secondary-button" type="button" disabled={applyingAnim} onClick={() => void applyGlobalAnimation("announcements")}>
              {ar ? "تطبيق على الإعلانات العاجلة أيضاً" : "Also apply to announcement bars"}
            </button>
          )}
        </div>
      </section>
    )}
    <section className="admin-panel-card">
      <div className="admin-section-head">
        <div><h2>{ar ? "الإعلانات" : "Splash ads"}</h2><p>{ar ? "لا يتم إنشاء نظام إعلانات ثانٍ؛ البيانات تمر عبر API الحالي." : "Uses the existing tenant API and persistence architecture."}</p></div>
        <div className="splash-header-actions">{canView && <button className="admin-secondary-button" type="button" onClick={() => void load()}>{ar ? "تحديث" : "Refresh"}</button>}{canManage && <button className="admin-primary-button" type="button" onClick={() => setEditing({ ...empty })}>{ar ? "إضافة إعلان" : "Add splash ad"}</button>}</div>
      </div>
      <div className="admin-data-table-wrap"><table className="admin-data-table"><thead><tr><th>{ar ? "العنوان" : "Title"}</th><th>{ar ? "نشط" : "Active"}</th><th>{ar ? "التكرار" : "Frequency"}</th><th>{ar ? "التأخير" : "Delay"}</th><th>{ar ? "المدة" : "Duration"}</th><th>{ar ? "المشاهدات" : "Views"}</th><th>{ar ? "النقرات" : "Clicks"}</th><th>CTR</th><th className="admin-data-table-actions">{ar ? "إجراء" : "Actions"}</th></tr></thead><tbody>
        {pager.pageItems.map((item) => { const stat = metrics[item.id]; return <tr key={item.id}><td><span className="admin-data-table-cell-clip" title={item.title || ""}>{item.title || "—"}</span></td><td>{item.is_active === false ? (ar ? "معطّل" : "Disabled") : (ar ? "مفعّل" : "Enabled")}</td><td>{L(SPLASH_FREQUENCY_LABELS, item.frequency)}</td><td>{item.close_delay_seconds ?? 0}s</td><td>{item.display_duration_seconds ?? 0}s</td><td>{stat?.views ?? "—"}</td><td>{stat?.clicks ?? "—"}</td><td>{stat ? `${(Number(stat.ctr || 0) * 100).toFixed(2)}%` : "—"}</td><td className="admin-data-table-actions" data-label={ar ? "الإجراء" : "Actions"}>{canManage ? <div className="row-actions"><button className="text-action" type="button" onClick={() => startEdit(item)}>{ar ? "تعديل" : "Edit"}</button><button aria-label={ar ? `حذف ${item.id}` : `Delete ${item.id}`} className="text-action danger" type="button" onClick={() => void remove(item.id)}>{ar ? "حذف" : "Delete"}</button></div> : "—"}</td></tr>; })}
      </tbody></table></div>
      <ClientPagerControls {...pager} ar={ar} />
    </section>

    {editing && canManage && <section className="admin-panel-card"><form className="admin-form-grid" onSubmit={save}>
      <label>{ar ? "العنوان" : "Title"}<input required value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} maxLength={200} /></label>
      <label>{ar ? "الرابط" : "Link"}<input value={editing.link || ""} onChange={(e) => setEditing({ ...editing, link: e.target.value })} maxLength={1000} /></label>
      <div className="full-field"><AdminMediaField label={ar ? "صورة سطح المكتب" : "Desktop image"} name="desktop_image_id" value={editing.desktop_image_id || ""} onChange={(e) => setEditing({ ...editing, desktop_image_id: e.target.value })} /></div>
      <div className="full-field"><AdminMediaField label={ar ? "صورة الجوال" : "Mobile image"} name="mobile_image_id" value={editing.mobile_image_id || ""} onChange={(e) => setEditing({ ...editing, mobile_image_id: e.target.value })} /></div>
      <label className="checkbox-line"><input type="checkbox" checked={editing.is_active !== false} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> {ar ? "مفعّل" : "Enabled"}</label>
      <label>{ar ? "التكرار" : "Frequency"}<select value={editing.frequency || "EVERY_VISIT"} onChange={(e) => setEditing({ ...editing, frequency: e.target.value })}>{frequencies.map((value) => <option key={value} value={value}>{L(SPLASH_FREQUENCY_LABELS, value)}</option>)}</select></label>
      <label>{ar ? "تأخير الإغلاق (ثوانٍ)" : "Close delay (seconds)"}<input type="number" min="0" max="3600" value={editing.close_delay_seconds ?? 0} onChange={(e) => setEditing({ ...editing, close_delay_seconds: Number(e.target.value) })} /></label>
      <label>{ar ? "مدة العرض (ثوانٍ)" : "Display duration (seconds)"}<input type="number" min="1" max="86400" value={editing.display_duration_seconds ?? 5} onChange={(e) => setEditing({ ...editing, display_duration_seconds: Number(e.target.value) })} /></label>
      <label>{ar ? "البداية" : "Start"}<input type="datetime-local" value={localDate(editing.start_date)} onChange={(e) => setEditing({ ...editing, start_date: e.target.value ? new Date(e.target.value).toISOString() : "" })} /></label>
      <label>{ar ? "النهاية" : "End"}<input type="datetime-local" value={localDate(editing.end_date)} onChange={(e) => setEditing({ ...editing, end_date: e.target.value ? new Date(e.target.value).toISOString() : "" })} /></label>
      <label className="full-field">{ar ? "الصفحات المستثناة" : "Excluded pages"}<textarea rows="3" value={(editing.excluded_pages || []).join("\n")} onChange={(e) => setEditing({ ...editing, excluded_pages: e.target.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean) })} placeholder="/checkout\n/payment\n/order-confirmation" /></label>
      <div className="splash-form-actions"><button className="admin-primary-button" type="submit">{ar ? "حفظ" : "Save"}</button><button className="admin-secondary-button" type="button" onClick={() => setEditing(null)}>{ar ? "إلغاء" : "Cancel"}</button></div>
    </form></section>}
  </AdminLayout>;
}
