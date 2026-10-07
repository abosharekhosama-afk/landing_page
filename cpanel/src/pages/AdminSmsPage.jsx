import React from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import SmsProvidersSection from "../components/SmsProvidersSection.jsx";
import { apiRequest } from "../utils/api.js";
import { hasPermission } from "../data/permissions.js";
import { TRIGGER_LABELS, SMS_VARIABLE_LABELS, SMS_STATUS_LABELS, makeLabeler, joinLabels } from "../utils/employee4Labels.js";
import { useClientPager, ClientPagerControls } from "../components/Employee4Workspace.jsx";

const emptyAutomation = { trigger: "ORDER_CONFIRMATION", message_template: "", sender: "NOTIFY", recipient: "", is_enabled: true };
const pageSize = 10;

const STEP_TRIGGERS = ["ORDER_CONFIRMATION", "ORDER_SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "NEW_ORDER_TO_MANAGER", "POS_PURCHASE_CONFIRMATION"];

function formatDate(value) {
  if (!value) return "â€”";
  return new Date(value).toLocaleString();
}

export default function AdminSmsPage({ company, currentUser, language = "en", modules, onNavigate, onLogout, onLanguageChange, onReturnToPlatform, onSwitchCompany, onToggleDarkMode, isDarkMode }) {
  const ar = language === "ar";
  const tr = (en, arText) => (ar ? arText : en);
  const L = makeLabeler(ar);

  const canManage = hasPermission(currentUser, "sms.manage");
  const canSend = hasPermission(currentUser, "sms.send") || canManage;
  const canView = hasPermission(currentUser, "sms.view") || canManage;
  const canViewLogs = hasPermission(currentUser, "sms.logs.view") || canManage;

  const [automations, setAutomations] = React.useState([]);
  const [variables, setVariables] = React.useState({});
  const [editing, setEditing] = React.useState(null);
  const [logs, setLogs] = React.useState([]);
  const [logTotal, setLogTotal] = React.useState(0);
  const [logFilters, setLogFilters] = React.useState({ q: "", status: "", recipient: "", from: "", to: "" });

  const logPager = useClientPager(logs, pageSize);
  const automationPager = useClientPager(automations, pageSize);

  const [manual, setManual] = React.useState({ recipient: "", sender: "NOTIFY", message: "" });
  const [notice, setNotice] = React.useState("");
  const [error, setError] = React.useState("");
  const [balance, setBalance] = React.useState(null);
  const [recharge, setRecharge] = React.useState(null);

  const layout = { activePage: "admin-sms", company, currentUser, isDarkMode, language, modules, onLanguageChange, onLogout, onNavigate, onReturnToPlatform, onSwitchCompany, onToggleDarkMode };

  const load = React.useCallback(async () => {
    setError("");
    try {
      const [automationData, balanceData, rechargeData] = await Promise.all([
        canView ? apiRequest("/admin/sms/automations") : Promise.resolve(null),
        canView ? apiRequest("/admin/sms/balance") : Promise.resolve(null),
        canView ? apiRequest("/admin/sms/recharge-history") : Promise.resolve(null),
      ]);
      setAutomations(automationData?.items || []);
      setVariables(automationData?.variables || {});
      setBalance(balanceData);
      setRecharge(rechargeData);
    } catch (e) { setError(e.message); }
  }, [canView]);

  const loadLogs = React.useCallback(async () => {
    if (!canViewLogs) return;
    try {
      const params = new URLSearchParams({ limit: "500", offset: "0" });
      Object.entries(logFilters).forEach(([key, value]) => value && params.set(key, value));
      const data = await apiRequest(`/admin/sms/logs?${params.toString()}`);
      setLogs(data.items || []);
      setLogTotal(Number(data.total || 0));
    } catch (e) { setError(e.message); }
  }, [canViewLogs, logFilters]);

  React.useEffect(() => { void load(); }, [load]);
  React.useEffect(() => { void loadLogs(); }, [loadLogs]);

  async function saveAutomation(event) {
    event.preventDefault();
    setError("");
    try {
      const data = editing.id
        ? await apiRequest(`/admin/sms/automations/${editing.id}`, { method: "PATCH", body: JSON.stringify(editing) })
        : await apiRequest("/admin/sms/automations", { method: "POST", body: JSON.stringify(editing) });

      setAutomations((current) => editing.id ? current.map((x) => x.id === data.id ? data : x) : [data, ...current]);
      setEditing(null);
      setNotice(ar ? "طھظ… ط­ظپط¸ ط£طھظ…طھط© SMS." : "SMS automation saved.");
    } catch (e) { setError(e.message); }
  }

  async function deleteAutomation(id) {
    if (!window.confirm(ar ? "ط­ط°ظپ ظ‡ط°ظ‡ ط§ظ„ط£طھظ…طھط©طں" : "Delete this automation?")) return;
    try {
      await apiRequest(`/admin/sms/automations/${id}`, { method: "DELETE" });
      setAutomations((current) => current.filter((x) => x.id !== id));
      setNotice(ar ? "طھظ… ط§ظ„ط­ط°ظپ." : "Deleted.");
    } catch (e) { setError(e.message); }
  }

  async function sendManual(event) {
    event.preventDefault();
    setError("");
    if (!window.confirm(ar ? "ط¥ط±ط³ط§ظ„ ط±ط³ط§ظ„ط© SMS ط§ظ„ط¢ظ†طں" : "Send this SMS now?")) return;
    try {
      const result = await apiRequest("/admin/sms/send", { method: "POST", body: JSON.stringify({ ...manual, sender: manual.sender || "NOTIFY" }) });
      setNotice(result.status === "SENT" ? (ar ? "طھظ… ط¥ط±ط³ط§ظ„ ط§ظ„ط±ط³ط§ظ„ط©." : "SMS sent.") : (ar ? "طھظ… طھط³ط¬ظٹظ„ ظپط´ظ„ ط§ظ„ط¥ط±ط³ط§ظ„." : "SMS failure recorded."));
      setManual({ recipient: "", sender: "NOTIFY", message: "" });
      if (canViewLogs) await loadLogs();
    } catch (e) { setError(e.message); }
  }

  return (
    <AdminLayout {...layout} title={ar ? "ط±ط³ط§ط¦ظ„ SMS" : "SMS"} subtitle={ar ? "ط¥ط¯ط§ط±ط© ط§ظ„ط£طھظ…طھط© ظˆط§ظ„ظ‚ظˆط§ظ„ط¨ ظˆط§ظ„ط³ط¬ظ„ ظˆط§ظ„ط±طµظٹط¯." : "Manage automations, templates, logs and provider balance."}>
      {notice && <div className="message-panel success">{notice}</div>}
      {error && <div className="message-panel error">{error}</div>}

      <SmsProvidersSection language={ar ? "ar" : "en"} canManageProviders={canManage} onNotice={setNotice} />

      <section className="admin-panel-card">
        <div className="admin-section-head">
          <div>
            <h2>{ar ? "ط£طھظ…طھط© SMS" : "SMS Automations"}</h2>
            <p>{ar ? "ظƒظ„ Trigger ظ„ظ‡ ظ…طھط؛ظٹط±ط§طھ ظ…ط³ظ…ظˆط­ط© ظ…ط­ط¯ط¯ط©." : "Each trigger has an explicit variable allowlist."}</p>
          </div>
          {canManage && <button className="admin-primary-button" type="button" onClick={() => setEditing({ ...emptyAutomation })}>{ar ? "ط¥ط¶ط§ظپط© ط£طھظ…طھط©" : "Add automation"}</button>}
        </div>
        <div className="admin-data-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>{ar ? "ط§ظ„ط­ط¯ط«" : "Trigger"}</th>
                <th>{ar ? "ط§ظ„ط­ط§ظ„ط©" : "Status"}</th>
                <th>{ar ? "ط§ظ„ظ‚ط§ظ„ط¨" : "Template"}</th>
                <th>{ar ? "ط§ظ„ظ…طھط؛ظٹط±ط§طھ" : "Variables"}</th>
                <th className="admin-data-table-actions">{ar ? "ط¥ط¬ط±ط§ط،" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {automationPager.pageItems.map((item) => (
                <tr key={item.id}>
                  <td><strong>{L(TRIGGER_LABELS, item.trigger)}</strong></td>
                  <td>{item.is_enabled === false ? tr("Disabled", "ظ…ط¹ط·ظ‘ظ„") : tr("Enabled", "ظ…ظپط¹ظ‘ظ„")}</td>
                  <td><span className="admin-data-table-cell-clip" title={item.message_template}>{item.message_template}</span></td>
                  <td>{joinLabels(SMS_VARIABLE_LABELS, variables[item.trigger] || [], ar)}</td>
                  <td className="admin-data-table-actions" data-label={ar ? "ط§ظ„ط¥ط¬ط±ط§ط،" : "Actions"}>
                    {canManage ? (
                      <div className="row-actions">
                        <button className="text-action" type="button" onClick={() => setEditing({ ...item })}>{ar ? "طھط¹ط¯ظٹظ„" : "Edit"}</button>
                        <button aria-label={ar ? `حذف ${item.id}` : `Delete ${item.id}`} className="text-action danger" type="button" onClick={() => void deleteAutomation(item.id)}>{ar ? "ط­ط°ظپ" : "Delete"}</button>
                      </div>
                    ) : "â€”"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ClientPagerControls {...automationPager} ar={ar} />
      </section>

      {editing && canManage && (
        <section className="admin-panel-card">
          <form onSubmit={saveAutomation} className="admin-form-grid">
            <label>
              {ar ? "ط§ظ„ط­ط¯ط«" : "Trigger"}
              <select value={editing.trigger} onChange={(e) => setEditing({ ...editing, trigger: e.target.value })} disabled={Boolean(editing.id)}>
                {STEP_TRIGGERS.map((key) => (
                  <option key={key} value={key}>
                    {L(TRIGGER_LABELS, key)}{variables[key]?.length ? ` â€” ${(variables[key] || []).map((v) => L(SMS_VARIABLE_LABELS, v)).join(ar ? "طŒ " : ", ")}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {ar ? "ط§ظ„ظ…ط±ط³ظ„" : "Sender"}
              <input value={editing.sender || ""} onChange={(e) => setEditing({ ...editing, sender: e.target.value })} required />
            </label>
            <label>
              {ar ? "طھط¬ط§ظˆط² ط§ظ„ظ…ط³طھظ„ظ…" : "Recipient override"}
              <input value={editing.recipient || ""} onChange={(e) => setEditing({ ...editing, recipient: e.target.value })} placeholder={ar ? "ط§طھط±ظƒظ‡ ظپط§ط±ط؛ط§ظ‹ ظ„ظ„ظ…ط³طھظ„ظ… ط§ظ„طھظ„ظ‚ط§ط¦ظٹ" : "Leave empty for automatic recipient"} />
            </label>
            <label className="full-field">
              <span>{ar ? "ط§ظ„ظ‚ط§ظ„ط¨" : "Template"}</span>
              <textarea rows="5" value={editing.message_template} onChange={(e) => setEditing({ ...editing, message_template: e.target.value })} required />
            </label>
            <div className="template-help">
              <strong>{ar ? "ط§ظ„ظ…ط³ظ…ظˆط­:" : "Allowed:"}</strong>{" "}
              {(variables[editing.trigger] || []).map((key) => (
                <button key={key} type="button" onClick={() => setEditing({ ...editing, message_template: `${editing.message_template} {{${key}}}` })}>
                  {`{{${key}}}`} â€” {L(SMS_VARIABLE_LABELS, key)}
                </button>
              ))}
            </div>
            <div className="row-actions full-field sms-form-actions">
              <label className="checkbox-line sms-enabled-toggle">
                <input type="checkbox" checked={editing.is_enabled !== false} onChange={(e) => setEditing({ ...editing, is_enabled: e.target.checked })} /> {ar ? "ظ…ظپط¹ظ‘ظ„" : "Enabled"}
              </label>
              <div className="row-actions sms-form-actions-buttons">
                <button className="admin-primary-button" type="submit">{ar ? "ط­ظپط¸" : "Save"}</button>
                <button className="admin-secondary-button" type="button" onClick={() => setEditing(null)}>{ar ? "ط¥ظ„ط؛ط§ط،" : "Cancel"}</button>
              </div>
            </div>
          </form>
          <div className="admin-preview-card">
            <strong>{ar ? "ظ…ط¹ط§ظٹظ†ط©" : "Preview"}</strong>
            <p>
              {String(editing.message_template || "").replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_m, key) => {
                if (!variables[editing.trigger]?.includes(key)) return `[unsupported:${key}]`;
                const mockValues = {
                  customer_name: tr("Customer Name", "ط§ط³ظ… ط§ظ„ط¹ظ…ظٹظ„"),
                  order_number: "ORD-12345",
                  order_total: "100",
                  tracking_link: "https://example.com/track/ORD-12345",
                  store_name: company?.name || "Store",
                  order_status: tr("Confirmed", "ظ…ط¤ظƒظ‘ط¯"),
                };
                return mockValues[key] ?? `[${key}]`;
              })}
            </p>
          </div>
        </section>
      )}

      {canView && (
        <section className="admin-panel-card">
          <div className="admin-section-head">
            <div>
              <h2>{ar ? "ط±طµظٹط¯ ط§ظ„ظ…ط²ظˆظ‘ط¯" : "Provider balance"}</h2>
              <p>
                {ar ? "ط§ظ„ط±طµظٹط¯ ط؛ظٹط± ظ…ط¯ط¹ظˆظ… ظ…ظ† ط§ظ„ظ…ط²ظˆظ‘ط¯ ط§ظ„ظ…ظڈظ‡ظٹظ‘ط£." : "Balance is not supported by the configured provider."}
                {balance?.supported ? ` ${balance.value ?? "â€”"} ${balance.currency || ""}` : ""}
              </p>
            </div>
          </div>
          {recharge?.supported && <pre className="admin-code-block">{JSON.stringify(recharge.value, null, 2)}</pre>}
        </section>
      )}

      {canSend && (
        <section className="admin-panel-card">
          <div className="admin-section-head">
            <div>
              <h2>{ar ? "ط±ط³ط§ظ„ط© SMS ظٹط¯ظˆظٹط©" : "Manual SMS"}</h2>
              <p>{ar ? "ظٹطھط·ظ„ط¨ طµظ„ط§ط­ظٹط©" : "Requires"} <code>sms.send</code> {ar ? "ط£ظˆ" : "or"} <code>sms.manage</code>.</p>
            </div>
          </div>
          <form onSubmit={sendManual} className="admin-form-grid">
            <label>
              {ar ? "ط§ظ„ظ…ط³طھظ„ظ…" : "Recipient"}
              <input type="tel" required value={manual.recipient} onChange={(e) => setManual({ ...manual, recipient: e.target.value })} />
            </label>
            <label>
              {ar ? "ط§ظ„ظ…ط±ط³ظ„" : "Sender"}
              <input required value={manual.sender} onChange={(e) => setManual({ ...manual, sender: e.target.value })} />
            </label>
            <label className="full-field">
              {ar ? "ط§ظ„ط±ط³ط§ظ„ط©" : "Message"}
              <textarea rows="4" required value={manual.message} onChange={(e) => setManual({ ...manual, message: e.target.value })} />
            </label>
            <button className="admin-primary-button" type="submit">{ar ? "ط¥ط±ط³ط§ظ„ SMS" : "Send SMS"}</button>
          </form>
        </section>
      )}

      {canViewLogs && (
        <section className="admin-panel-card">
          <div className="admin-section-head">
            <div>
              <h2>{ar ? "ط³ط¬ظ„ SMS" : "SMS Logs"}</h2>
              <p>{logTotal} {ar ? "ط³ط¬ظ„" : "records"}</p>
            </div>
          </div>
          <div className="admin-filter-grid">
            <input placeholder={ar ? "ط¨ط­ط«" : "Search"} value={logFilters.q} onChange={(e) => setLogFilters({ ...logFilters, q: e.target.value })} />
            <input placeholder={ar ? "ط§ظ„ظ…ط³طھظ„ظ…" : "Recipient"} value={logFilters.recipient} onChange={(e) => setLogFilters({ ...logFilters, recipient: e.target.value })} />
            <input aria-label={ar ? "ظ…ظ† طھط§ط±ظٹط®" : "From date"} type="date" value={logFilters.from} onChange={(e) => setLogFilters({ ...logFilters, from: e.target.value })} />
            <input aria-label={ar ? "ط¥ظ„ظ‰ طھط§ط±ظٹط®" : "To date"} type="date" value={logFilters.to} onChange={(e) => setLogFilters({ ...logFilters, to: e.target.value })} />
            <select value={logFilters.status} onChange={(e) => setLogFilters({ ...logFilters, status: e.target.value })}>
              <option value="">{ar ? "ظƒظ„ ط§ظ„ط­ط§ظ„ط§طھ" : "All statuses"}</option>
              <option value="PENDING">{L(SMS_STATUS_LABELS, "PENDING")}</option>
              <option value="SENT">{L(SMS_STATUS_LABELS, "SENT")}</option>
              <option value="FAILED">{L(SMS_STATUS_LABELS, "FAILED")}</option>
              <option value="DELIVERED">{L(SMS_STATUS_LABELS, "DELIVERED")}</option>
            </select>
          </div>
          <div className="admin-data-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>{ar ? "ط§ظ„ظ…ط³طھظ„ظ…" : "Recipient"}</th>
                  <th>{ar ? "ط§ظ„ط­ط§ظ„ط©" : "Status"}</th>
                  <th>{ar ? "ط§ظ„ط±ط³ط§ظ„ط©" : "Message"}</th>
                  <th>{ar ? "ط§ظ„ظ…ط²ظˆط¯" : "Provider"}</th>
                  <th>{ar ? "ط§ظ„طھظƒظ„ظپط©" : "Cost"}</th>
                  <th>{ar ? "ط§ظ„ظ…ط±ط¬ط¹" : "Reference"}</th>
                  <th>{ar ? "طھظ… ط§ظ„ط¥ط±ط³ط§ظ„" : "Sent at"}</th>
                  <th>{ar ? "طھظƒظ„ظپط© SMS" : "SMS Cost"}</th>
                  <th>{ar ? "ط§ظ„ط®ط·ط£" : "Error"}</th>
                  <th className="admin-data-table-actions">{ar ? "ط¥ط¬ط±ط§ط،" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {logPager.pageItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.recipient}</td>
                    <td>{L(SMS_STATUS_LABELS, item.status)}</td>
                    <td><span className="admin-data-table-cell-clip" title={item.message || ""}>{item.message || "â€”"}</span></td>
                    <td>{item.provider}</td>
                    <td>{item.cost == null ? "â€”" : item.cost}</td>
                    <td>{item.provider_reference || "â€”"}</td>
                    <td>{formatDate(item.created_at)}</td>
                    <td>{item.sms_cost == null ? "â€”" : `${item.sms_cost} ${item.currency || ""}`}</td>
                    <td>{item.error_message || "â€”"}</td>
                    <td className="admin-data-table-actions" data-label={ar ? "ط§ظ„ط¥ط¬ط±ط§ط،" : "Actions"}>
                      {canManage ? (
                        <div className="row-actions">
                          <button className="text-action" type="button" onClick={() => {}}>{ar ? "ط¥ط¹ط§ط¯ط©" : "Retry"}</button>
                        </div>
                      ) : "â€”"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ClientPagerControls {...logPager} ar={ar} />
        </section>
      )}
    </AdminLayout>
  );
}
