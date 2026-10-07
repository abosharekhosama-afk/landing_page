import React from "react";
import { Globe, Plus, ShieldAlert, Trash2 } from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import { fetchPlatformCompanies } from "../utils/platformCompaniesApi.js";
import { effectivePlatformRole, isPlatformAdmin } from "../utils/roles.js";
import { apiRequest } from "../utils/api.js";

const emptyForm = {
  company_id: "",
  domain: "",
  is_primary: false,
  is_active: true,
  is_verified: false,
};

function AdminDomainsPage({
  activePage,
  company,
  currentUser,
  language,
  modules,
  onLogout,
  onNavigate,
  onLanguageChange,
  onReturnToPlatform,
  onSwitchCompany,
  isDarkMode,
  onToggleDarkMode,
}) {
  const [accessDenied, setAccessDenied] = React.useState(false);
  const [domains, setDomains] = React.useState([]);
  const [companies, setCompanies] = React.useState([]);
  const [busy, setBusy] = React.useState(true);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [form, setForm] = React.useState(emptyForm);
  const [editingId, setEditingId] = React.useState(null);
  const [showForm, setShowForm] = React.useState(false);

  const ar = language === "ar";
  const labels = {
    title: ar ? "نطاقات المتجر" : "Storefront Domains",
    subtitle: ar
      ? "إدارة ربط النطاقات بالشركات لحل المستأجرين."
      : "Manage company domain mappings for tenant resolution.",
    addDomain: ar ? "إضافة نطاق" : "Add domain",
    editDomain: ar ? "تعديل النطاق" : "Edit domain",
    company: ar ? "الشركة" : "Company",
    hostname: ar ? "اسم المضيف" : "Hostname",
    selectCompany: ar ? "-- اختر الشركة --" : "-- Select company --",
    active: ar ? "نشط" : "Active",
    verified: ar ? "موثّق" : "Verified",
    primary: ar ? "أساسي" : "Primary",
    cancel: ar ? "إلغاء" : "Cancel",
    saving: ar ? "جارٍ الحفظ..." : "Saving...",
    update: ar ? "تحديث" : "Update",
    domain: ar ? "النطاق" : "Domain",
    actions: ar ? "إجراءات" : "Actions",
    yes: ar ? "نعم" : "Yes",
    no: ar ? "لا" : "No",
    loading: ar ? "جارٍ تحميل النطاقات..." : "Loading domains...",
    empty: ar ? "لا توجد سجلات نطاقات مكوّنة." : "No domain records configured.",
    edit: ar ? "تعديل" : "Edit",
    delete: ar ? "حذف" : "Delete",
    selectCompanyError: ar ? "اختر شركة." : "Select a company.",
    hostnameRequired: ar ? "اسم المضيف مطلوب." : "Hostname is required.",
    domainUpdated: ar ? "تم تحديث النطاق." : "Domain updated.",
    domainAdded: ar ? "تمت إضافة النطاق." : "Domain added.",
    domainDeleted: ar ? "تم حذف النطاق." : "Domain deleted.",
    deleteConfirm: ar
      ? "حذف سجل النطاق هذا؟"
      : "Delete this domain record?",
    loadFailed: ar ? "فشل تحميل النطاقات." : "Failed to load domains.",
    saveFailed: ar ? "فشل الحفظ." : "Save failed.",
    deleteFailed: ar ? "فشل الحذف." : "Delete failed.",
    accessDeniedTitle: ar ? "تم رفض الوصول" : "Access Denied",
    accessDeniedBody: ar
      ? "مطلوب صلاحية مدير المنصة."
      : "Super Admin access required.",
  };

  React.useEffect(() => {
    if (!isPlatformAdmin(effectivePlatformRole(currentUser))) {
      setAccessDenied(true);
      return;
    }
    load();
  }, [currentUser]);

  async function load() {
    setBusy(true);
    setError("");
    try {
      const [domainsData, companiesData] = await Promise.all([
        apiRequest("/platform/domains"),
        fetchPlatformCompanies(),
      ]);
      setDomains(Array.isArray(domainsData) ? domainsData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
    } catch (err) {
      setError(err?.message || labels.loadFailed);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setError("");
    setSuccess("");
    if (!form.company_id) {
      setError(labels.selectCompanyError);
      return;
    }
    if (!form.domain.trim()) {
      setError(labels.hostnameRequired);
      return;
    }

    setBusy(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const path = editingId
        ? `/platform/domains/${encodeURIComponent(editingId)}`
        : "/platform/domains";
      await apiRequest(path, { method, body: JSON.stringify(form) });
      setSuccess(editingId ? labels.domainUpdated : labels.domainAdded);
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err?.message || labels.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!window.confirm(labels.deleteConfirm)) return;
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      await apiRequest(`/platform/domains/${encodeURIComponent(id)}`, { method: "DELETE" });
      setSuccess(labels.domainDeleted);
      if (editingId === id) {
        setForm(emptyForm);
        setEditingId(null);
        setShowForm(false);
      }
      await load();
    } catch (err) {
      setError(err?.message || labels.deleteFailed);
    } finally {
      setBusy(false);
    }
  }

  function edit(entry) {
    setForm({
      company_id: entry.company_id,
      domain: entry.domain,
      is_primary: entry.is_primary,
      is_active: entry.is_active,
      is_verified: entry.is_verified,
    });
    setEditingId(entry.id);
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function cancel() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  if (accessDenied) {
    return (
      <AdminLayout
        {...{
          activePage,
          company,
          currentUser,
          language,
          modules,
          onLogout,
          onNavigate,
          onLanguageChange,
          onReturnToPlatform,
          onSwitchCompany,
          isDarkMode,
          onToggleDarkMode,
        }}
        title={labels.accessDeniedTitle}
      >
        <div className="admin-access-denied">
          <ShieldAlert size={48} />
          <h2>{labels.accessDeniedTitle}</h2>
          <p>{labels.accessDeniedBody}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      {...{
        activePage,
        company,
        currentUser,
        language,
        modules,
        onLogout,
        onNavigate,
        onLanguageChange,
        onReturnToPlatform,
        onSwitchCompany,
        isDarkMode,
        onToggleDarkMode,
      }}
      subtitle={labels.subtitle}
      title={labels.title}
    >
      <div className="admin-data-toolbar platform-domains-toolbar">
        {!showForm && (
          <button
            className="admin-primary-button"
            onClick={() => {
              setForm(emptyForm);
              setEditingId(null);
              setShowForm(true);
            }}
            type="button"
          >
            <Plus size={16} /> {labels.addDomain}
          </button>
        )}
      </div>

      {error && (
        <div className="admin-message admin-message-error" onClick={() => setError("")}>
          {error}
        </div>
      )}
      {success && (
        <div className="admin-message admin-message-success" onClick={() => setSuccess("")}>
          {success}
        </div>
      )}

      {showForm && (
        <section className="admin-panel-card">
          <div className="admin-section-head">
            <div>
              <h2>{editingId ? labels.editDomain : labels.addDomain}</h2>
            </div>
          </div>
          <div className="admin-form-grid">
            <label>
              {labels.company}
              <select
                value={form.company_id}
                onChange={(e) => setForm({ ...form, company_id: e.target.value })}
              >
                <option value="">{labels.selectCompany}</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            </label>
            <label>
              {labels.hostname}
              <input
                type="text"
                placeholder="storefront.vercel.app"
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
              />
            </label>
            <label className="admin-checkbox-label">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />{" "}
              {labels.active}
            </label>
            <label className="admin-checkbox-label">
              <input
                type="checkbox"
                checked={form.is_verified}
                onChange={(e) => setForm({ ...form, is_verified: e.target.checked })}
              />{" "}
              {labels.verified}
            </label>
            <label className="admin-checkbox-label">
              <input
                type="checkbox"
                checked={form.is_primary}
                onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
              />{" "}
              {labels.primary}
            </label>
          </div>
          <div className="form-actions">
            <button className="secondary-action" disabled={busy} onClick={cancel} type="button">
              {labels.cancel}
            </button>
            <button className="admin-primary-button" disabled={busy} onClick={save} type="button">
              {busy ? labels.saving : editingId ? labels.update : labels.addDomain}
            </button>
          </div>
        </section>
      )}

      <div className="admin-data-table-wrap">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>{labels.domain}</th>
              <th>{labels.company}</th>
              <th>{labels.active}</th>
              <th>{labels.verified}</th>
              <th>{labels.primary}</th>
              <th className="admin-data-table-actions">{labels.actions}</th>
            </tr>
          </thead>
          <tbody>
            {busy && !domains.length ? (
              <tr>
                <td className="admin-data-loading" colSpan="6">
                  {labels.loading}
                </td>
              </tr>
            ) : !domains.length ? (
              <tr>
                <td className="admin-data-empty" colSpan="6">
                  {labels.empty}
                </td>
              </tr>
            ) : (
              domains.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <code className="admin-data-table-cell-clip" title={entry.domain}>
                      {entry.domain}
                    </code>
                  </td>
                  <td>{entry.company_name || entry.company_id}</td>
                  <td>{entry.is_active ? labels.yes : labels.no}</td>
                  <td>{entry.is_verified ? labels.yes : labels.no}</td>
                  <td>{entry.is_primary ? labels.yes : labels.no}</td>
                  <td className="admin-data-table-actions">
                    <button
                      className="secondary-action"
                      disabled={busy}
                      onClick={() => edit(entry)}
                      type="button"
                      aria-label={`${labels.edit} ${entry.domain}`}
                    >
                      {labels.edit}
                    </button>
                    <button
                      className="danger-action"
                      disabled={busy}
                      onClick={() => remove(entry.id)}
                      type="button"
                      aria-label={`${labels.delete} ${entry.domain}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

export default AdminDomainsPage;