import React from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import AdminMediaField from "../components/AdminMediaField.jsx";
import { apiRequest } from "../utils/api.js";
import { hasPermission } from "../data/permissions.js";
import { LEGAL_PLACEMENT_LABELS, makeLabeler } from "../utils/employee4Labels.js";

const placements = ["FOOTER", "CHECKOUT", "STANDALONE_PAGE"];
const empty = { registration_number: "", authority_name: "", authority_logo_media_id: "", authority_logo_url: "", business_information: { en: "", ar: "" }, placements: ["FOOTER"] };

export default function AdminLegalInformationPage({ company, currentUser, language = "en", modules, onNavigate, onLogout, onLanguageChange, onReturnToPlatform, onSwitchCompany, onToggleDarkMode, isDarkMode }) {
  const ar = language === "ar";
  const L = makeLabeler(ar);
  const canManage = hasPermission(currentUser, "legal_information.manage");
  const [form, setForm] = React.useState(empty);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const layout = { activePage: "admin-legal-information", company, currentUser, isDarkMode, language, modules, onLanguageChange, onLogout, onNavigate, onReturnToPlatform, onSwitchCompany, onToggleDarkMode };
  const load = React.useCallback(async () => { setLoading(true); setError(""); try { const data = await apiRequest("/admin/legal-information"); setForm(data ? { ...empty, ...data, business_information: { ...empty.business_information, ...(data.business_information || {}) }, placements: data.placements || ["FOOTER"] } : { ...empty, business_information: { ...empty.business_information }, placements: ["FOOTER"] }); } catch (e) { setError(e.message); } finally { setLoading(false); } }, []);
  React.useEffect(() => { void load(); }, [load]);
  function togglePlacement(value) { setForm((current) => ({ ...current, placements: current.placements.includes(value) ? current.placements.filter((item) => item !== value) : [...current.placements, value] })); }
  async function save(event) { event.preventDefault(); setSaving(true); setError(""); setNotice(""); try { await apiRequest("/admin/legal-information", { method: "PATCH", body: JSON.stringify(form) }); setNotice(ar ? "تم حفظ معلومات النشاط والقانونية." : "Business and legal information saved."); await load(); } catch (e) { setError(e.message); } finally { setSaving(false); } }
  async function remove() { if (!window.confirm(ar ? "حذف معلومات النشاط والقانونية؟" : "Delete business and legal information?")) return; try { await apiRequest("/admin/legal-information", { method: "DELETE" }); setForm({ ...empty, business_information: { ...empty.business_information }, placements: ["FOOTER"] }); setNotice(ar ? "تم حذف المعلومات." : "Business and legal information deleted."); } catch (e) { setError(e.message); } }
  return <AdminLayout {...layout} title={ar ? "معلومات النشاط والقانونية" : "Business & Legal Information"} subtitle={ar ? "إدارة البيانات القانونية ومواقع ظهورها في المتجر." : "Manage registration, authority information, logo and storefront placement."}>
    {notice && <div className="message-panel success">{notice}</div>}{error && <div className="message-panel error">{error}</div>}
    {loading ? <div className="admin-panel-card"><p>{ar ? "جارٍ التحميل…" : "Loading…"}</p></div> : <section className="admin-panel-card"><form onSubmit={save} className="admin-form-grid">
      <label>{ar ? "رقم السجل" : "Registration number"}<input disabled={!canManage} value={form.registration_number || ""} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} maxLength={160} /></label>
      <label>{ar ? "اسم الجهة" : "Authority name"}<input disabled={!canManage} value={form.authority_name || ""} onChange={(e) => setForm({ ...form, authority_name: e.target.value })} maxLength={200} /></label>
      <div className="full-field"><AdminMediaField disabled={!canManage} label={ar ? "شعار الجهة" : "Authority logo"} language={language} legalInformationLogo name="authority_logo_url" value={form.authority_logo_url || ""} onUploaded={(uploaded) => setForm((current) => ({ ...current, authority_logo_media_id: uploaded.mediaId || current.authority_logo_media_id }))} onChange={(e) => setForm({ ...form, authority_logo_url: e.target.value, authority_logo_media_id: e.mediaId || form.authority_logo_media_id })} /></div>
      <label className="full-field">{ar ? "معلومات النشاط (إنجليزي)" : "Business information (EN)"}<textarea rows="5" disabled={!canManage} value={form.business_information?.en || ""} onChange={(e) => setForm({ ...form, business_information: { ...form.business_information, en: e.target.value } })} maxLength={1000} /></label>
      <label className="full-field" dir="rtl">{ar ? "معلومات النشاط (عربي)" : "معلومات النشاط (AR)"}<textarea rows="5" disabled={!canManage} value={form.business_information?.ar || ""} onChange={(e) => setForm({ ...form, business_information: { ...form.business_information, ar: e.target.value } })} maxLength={1000} /></label>
      <fieldset className="full-field"><legend>{ar ? "مواقع الظهور" : "Display locations"}</legend>{placements.map((item) => <label className="checkbox-line" key={item}><input disabled={!canManage} type="checkbox" checked={(form.placements || []).includes(item)} onChange={() => togglePlacement(item)} />{L(LEGAL_PLACEMENT_LABELS, item)}</label>)}</fieldset>
      {canManage && <div className="row-actions"><button className="admin-primary-button" disabled={saving} type="submit">{saving ? (ar ? "جارٍ الحفظ…" : "Saving…") : (ar ? "حفظ" : "Save")}</button><button className="text-action danger" type="button" onClick={() => void remove()}>{ar ? "حذف" : "Delete"}</button></div>}
    </form></section>}
  </AdminLayout>;
}
