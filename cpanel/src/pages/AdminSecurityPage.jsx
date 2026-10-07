import React from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import { hasPermission } from "../data/permissions.js";
import { apiRequest } from "../utils/api.js";
import { LOGIN_STATUS_LABELS, AUTH_METHOD_LABELS, BLOCK_TYPE_LABELS, makeLabeler } from "../utils/employee4Labels.js";
import { useClientPager, ClientPagerControls } from "../components/Employee4Workspace.jsx";

const emptyBlock = { ip_address: "", reason: "", expires_at: "" };

const pageSize = 10;

export default function AdminSecurityPage({ company, currentUser, language = "en", modules, onNavigate, onLogout, onLanguageChange, onReturnToPlatform, onSwitchCompany, onToggleDarkMode, isDarkMode }) {
  const ar = language === "ar";
  const L = makeLabeler(ar);
  const canViewHistory = hasPermission(currentUser, "security.login_history.view");
  const canViewBlocks = hasPermission(currentUser, "security.ip_blocks.view") || hasPermission(currentUser, "security.ip_blocks.manage");
  const canManageBlocks = hasPermission(currentUser, "security.ip_blocks.manage");
  const canManageSettings = hasPermission(currentUser, "security.settings.manage");
  const [history, setHistory] = React.useState([]);
  const [blocks, setBlocks] = React.useState([]);
  const [settings, setSettings] = React.useState({ accountFailedAttempts: 5, accountLockMinutes: 15, ipFailedAttempts: 5, ipBlockMinutes: 15 });
  const [filters, setFilters] = React.useState({ q: "", status: "", from: "", to: "" });
  const [blockFilter, setBlockFilter] = React.useState({ q: "", active: "true" });
  const historyPager = useClientPager(history, pageSize);
  const blocksPager = useClientPager(blocks, pageSize);
  const [editingBlock, setEditingBlock] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const layout = { activePage: "admin-security", company, currentUser, isDarkMode, language, modules, onLanguageChange, onLogout, onNavigate, onReturnToPlatform, onSwitchCompany, onToggleDarkMode };

  const loadHistory = React.useCallback(async () => {
    if (!canViewHistory) return;
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
      const data = await apiRequest(`/admin/security/login-history?${params.toString()}`);
      setHistory(Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : []);
    } catch (e) { setError(e.message); }
  }, [canViewHistory, filters]);

  const loadBlocks = React.useCallback(async () => {
    if (!canViewBlocks) return;
    try {
      const params = new URLSearchParams();
      Object.entries(blockFilter).forEach(([key, value]) => value && params.set(key, value));
      const data = await apiRequest(`/admin/security/ip-blocks?${params.toString()}`);
      setBlocks(Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : []);
    } catch (e) { setError(e.message); }
  }, [blockFilter, canViewBlocks]);

  const loadSettings = React.useCallback(async () => {
    if (!canManageSettings && !canViewBlocks) return;
    setSettings(await apiRequest("/admin/security/settings"));
  }, [canManageSettings, canViewBlocks]);

  async function refresh() {
    setLoading(true); setError("");
    try { await Promise.all([loadHistory(), loadBlocks(), loadSettings()]); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  React.useEffect(() => { void refresh(); }, [refresh]);

  async function saveSettings(event) {
    event.preventDefault(); setError(""); setNotice("");
    try { setSettings(await apiRequest("/admin/security/settings", { method: "PATCH", body: JSON.stringify(settings) })); setNotice(ar ? "تم حفظ إعدادات الحماية." : "Security settings saved."); } catch (e) { setError(e.message); }
  }

  async function createBlock(event) {
    event.preventDefault(); setError(""); setNotice("");
    try {
      const created = await apiRequest("/admin/security/ip-blocks", { method: "POST", body: JSON.stringify({ ...editingBlock, expires_at: editingBlock.expires_at ? new Date(editingBlock.expires_at).toISOString() : null }) });
      setBlocks((current) => [created, ...current]);
      setEditingBlock(null); setNotice(ar ? "تم حظر العنوان." : "IP block created.");
    } catch (e) { setError(e.message); }
  }

  async function unblock(id) {
    if (!window.confirm(ar ? "إلغاء حظر عنوان IP؟" : "Unblock this IP?")) return;
    try { await apiRequest(`/admin/security/ip-blocks/${id}/unblock`, { method: "POST" }); await loadBlocks(); setNotice(ar ? "تم إلغاء الحظر." : "IP unblocked."); } catch (e) { setError(e.message); }
  }

  return <AdminLayout {...layout} title={ar ? "الأمان وسجل الدخول" : "Security & Login History"} subtitle={ar ? "تدقيق المصادقة وحماية الحسابات وعناوين IP." : "Authentication auditing, account protection and IP blocking."}>
    {error && <div className="message-panel error" role="alert">{error}</div>}
    {notice && <div className="message-panel success" role="status">{notice}</div>}
    {canManageSettings && <section className="admin-panel-card"><div className="admin-section-head"><div><h2>{ar ? "إعدادات الحماية" : "Protection settings"}</h2><p>{ar ? "الافتراضيات: 5 محاولات ثم قفل لمدة 15 دقيقة." : "Defaults: 5 failures then a 15-minute lock/block."}</p></div></div><form className="admin-form-grid" onSubmit={saveSettings}><label>{ar ? "محاولات فشل الحساب" : "Account failed attempts"}<input type="number" min="1" max="100" value={settings.accountFailedAttempts} onChange={(e) => setSettings({ ...settings, accountFailedAttempts: Number(e.target.value) })} /></label><label>{ar ? "قفل الحساب (دقائق)" : "Account lock minutes"}<input type="number" min="1" max="1440" value={settings.accountLockMinutes} onChange={(e) => setSettings({ ...settings, accountLockMinutes: Number(e.target.value) })} /></label><label>{ar ? "محاولات فشل IP" : "IP failed attempts"}<input type="number" min="1" max="100" value={settings.ipFailedAttempts} onChange={(e) => setSettings({ ...settings, ipFailedAttempts: Number(e.target.value) })} /></label><label>{ar ? "حظر IP (دقائق)" : "IP block minutes"}<input type="number" min="1" max="1440" value={settings.ipBlockMinutes} onChange={(e) => setSettings({ ...settings, ipBlockMinutes: Number(e.target.value) })} /></label><div className="row-actions"><button className="admin-primary-button" type="submit">{ar ? "حفظ الإعدادات" : "Save settings"}</button></div></form></section>}

    {canViewHistory && <section className="admin-panel-card"><div className="admin-section-head"><div><h2>{ar ? "سجل الدخول" : "Login history"}</h2><p>{historyPager.totalItems} {ar ? "سجل" : "records"}</p></div></div><div className="admin-filter-grid"><input placeholder={ar ? "بحث عن مستخدم، IP، متصفح…" : "Search user, IP, browser…"} value={filters.q} onChange={(e) => { setFilters({ ...filters, q: e.target.value }); }} /><select value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); }}><option value="">{ar ? "كل الحالات" : "All statuses"}</option><option value="SUCCESS">{L(LOGIN_STATUS_LABELS, "SUCCESS")}</option><option value="FAILURE">{L(LOGIN_STATUS_LABELS, "FAILURE")}</option></select><input type="date" value={filters.from} onChange={(e) => { setFilters({ ...filters, from: e.target.value }); }} /><input type="date" value={filters.to} onChange={(e) => { setFilters({ ...filters, to: e.target.value }); }} /></div><div className="admin-data-table-wrap"><table className="admin-data-table"><thead><tr><th>{ar ? "المستخدم" : "User"}</th><th>{ar ? "الحالة" : "Status"}</th><th>IP</th><th>{ar ? "المتصفح" : "Browser"}</th><th>{ar ? "الجهاز" : "Device"}</th><th>{ar ? "الطريقة" : "Method"}</th><th>{ar ? "السبب" : "Reason"}</th><th>{ar ? "التاريخ" : "Date"}</th></tr></thead><tbody>{historyPager.pageItems.map((item) => <tr key={item.id}><td><span className="admin-data-table-cell-clip" title={item.email || item.user_id || ""}>{item.email || item.user_id || (ar ? "غير معروف" : "Unknown")}</span></td><td>{L(LOGIN_STATUS_LABELS, item.status)}</td><td>{item.ip_address || "—"}</td><td>{item.browser || "—"}</td><td>{item.device || "—"}</td><td>{L(AUTH_METHOD_LABELS, item.authentication_method)}</td><td><span className="admin-data-table-cell-clip" title={item.failure_reason || ""}>{item.failure_reason || "—"}</span></td><td>{new Date(item.created_at).toLocaleString()}</td></tr>)}</tbody></table></div><ClientPagerControls {...historyPager} ar={ar} /></section>}

    {canViewBlocks && <section className="admin-panel-card"><div className="admin-section-head"><div><h2>{ar ? "حظر عناوين IP" : "IP blocking"}</h2><p>{ar ? "يدعم عناوين IPv4 وIPv6 وCIDR." : "Supports IPv4, IPv6 and CIDR ranges."}</p></div>{canManageBlocks && <button className="admin-primary-button" type="button" onClick={() => setEditingBlock({ ...emptyBlock })}>{ar ? "حظر IP" : "Block IP"}</button>}</div><div className="admin-filter-grid"><input placeholder={ar ? "بحث عن IP، سبب…" : "Search IP, reason…"} value={blockFilter.q} onChange={(e) => { setBlockFilter({ ...blockFilter, q: e.target.value }); }} /><select value={blockFilter.active} onChange={(e) => { setBlockFilter({ ...blockFilter, active: e.target.value }); }}><option value="true">{ar ? "نشط" : "Active"}</option><option value="false">{ar ? "غير نشط / منتهي" : "Inactive / expired"}</option><option value="">{ar ? "الكل" : "All"}</option></select></div><div className="admin-data-table-wrap"><table className="admin-data-table"><thead><tr><th>IP / CIDR</th><th>{ar ? "النوع" : "Type"}</th><th>{ar ? "السبب" : "Reason"}</th><th>{ar ? "الإنشاء" : "Created"}</th><th>{ar ? "الانتهاء" : "Expires"}</th><th>{ar ? "أنشأها" : "Created by"}</th><th className="admin-data-table-actions">{ar ? "إجراء" : "Action"}</th></tr></thead><tbody>{blocksPager.pageItems.map((item) => <tr key={item.id}><td>{item.ip_address}</td><td>{L(BLOCK_TYPE_LABELS, item.block_type)}</td><td><span className="admin-data-table-cell-clip" title={item.reason || ""}>{item.reason || "—"}</span></td><td>{item.created_at ? new Date(item.created_at).toLocaleString() : "—"}</td><td>{item.expires_at ? new Date(item.expires_at).toLocaleString() : (ar ? "أبداً" : "Never")}</td><td>{item.created_by || "system"}</td><td className="admin-data-table-actions">{canManageBlocks && item.is_active && !item.is_expired ? <button aria-label={ar ? `إلغاء حظر ${item.ip_address}` : `Unblock ${item.ip_address}`} className="text-action danger" type="button" onClick={() => void unblock(item.id)}>{ar ? "إلغاء الحظر" : "Unblock"}</button> : "—"}</td></tr>)}</tbody></table></div><ClientPagerControls {...blocksPager} ar={ar} /></section>}

    {editingBlock && canManageBlocks && <section className="admin-panel-card"><form className="admin-form-grid" onSubmit={createBlock}><label>IP / CIDR<input required value={editingBlock.ip_address} onChange={(e) => setEditingBlock({ ...editingBlock, ip_address: e.target.value })} placeholder="203.0.113.10 or 2001:db8::/32" /></label><label>{ar ? "تاريخ الانتهاء" : "Expires at"}<input type="datetime-local" value={editingBlock.expires_at} onChange={(e) => setEditingBlock({ ...editingBlock, expires_at: e.target.value })} /></label><label className="full-field">{ar ? "السبب" : "Reason"}<textarea required rows="3" maxLength="500" value={editingBlock.reason} onChange={(e) => setEditingBlock({ ...editingBlock, reason: e.target.value })} /></label><div className="row-actions"><button className="admin-primary-button" type="submit">{ar ? "إنشاء الحظر" : "Create block"}</button><button className="text-action" type="button" onClick={() => setEditingBlock(null)}>{ar ? "إلغاء" : "Cancel"}</button></div></form></section>}
    {loading && <div className="admin-loading-state">{ar ? "جارٍ التحديث…" : "Refreshing…"}</div>}
  </AdminLayout>;
}
