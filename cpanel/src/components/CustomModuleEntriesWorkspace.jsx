import React from "react";
import { Plus, Search } from "lucide-react";
import {
  canManageCustomModuleEntries,
  displayEntryValue,
  emptyEntryDraft,
  entryDraftFromEntry,
  filterEntries,
  isSupportedCustomFieldType,
  listColumnsForModule,
  unitCreatorCopy,
  validateEntryDraft,
} from "../utils/customModulesUi.js";
import {
  createCustomModuleEntry,
  deleteCustomModuleEntry,
  fetchCustomModuleEntries,
  updateCustomModuleEntry,
} from "../utils/customModulesApi.js";

function toDatetimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EntryFormDialog({ copy, module, entry, language, onCancel, onSave, readOnly }) {
  const fields = module?.fieldsSchema || [];
  const [draft, setDraft] = React.useState(() => {
    const next = entryDraftFromEntry(entry, fields);
    fields.forEach((field) => {
      if (field.type === "datetime") next[field.key] = toDatetimeLocal(next[field.key]);
    });
    return next;
  });
  const [errors, setErrors] = React.useState([]);
  const unsupportedLabel = language === "ar" ? "نوع الحقل غير مدعوم في المحرر." : "This field type cannot be edited in the form.";

  function handleSubmit(event) {
    event.preventDefault();
    if (readOnly) return;
    const payload = {};
    fields.forEach((field) => {
      payload[field.key] = draft[field.key];
    });
    const validation = validateEntryDraft(payload, fields);
    setErrors(validation.errors);
    if (!validation.valid) return;
    onSave(payload);
  }

  function renderInput(field) {
    if (!isSupportedCustomFieldType(field.type)) {
      return (
        <label>
          {field.label}
          <input disabled value={displayEntryValue(field, draft[field.key])} />
          <span className="unit-creator-hint">{unsupportedLabel}</span>
        </label>
      );
    }
    const value = draft[field.key];
    const setValue = (next) => setDraft((current) => ({ ...current, [field.key]: next }));
    if (field.type === "boolean") {
      return <label className="unit-creator-checkbox"><input checked={value === true} disabled={readOnly} onChange={(e) => setValue(e.target.checked)} type="checkbox" /><span>{field.label}</span></label>;
    }
    if (field.type === "textarea") {
      return <label>{field.label}<textarea disabled={readOnly} onChange={(e) => setValue(e.target.value)} placeholder={field.placeholder || ""} rows={3} value={value ?? ""} /></label>;
    }
    if (field.type === "select") {
      return <label>{field.label}<select disabled={readOnly} onChange={(e) => setValue(e.target.value)} value={value ?? ""}><option value="">—</option>{(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
    }
    if (field.type === "multi_select") {
      const selected = new Set(Array.isArray(value) ? value : []);
      return <fieldset className="unit-creator-multi-select"><legend>{field.label}</legend>{(field.options || []).map((option) => (
        <label className="unit-creator-checkbox" key={option.value}>
          <input checked={selected.has(option.value)} disabled={readOnly} onChange={(e) => {
            const next = new Set(selected);
            if (e.target.checked) next.add(option.value);
            else next.delete(option.value);
            setValue([...next]);
          }} type="checkbox" />
          {option.label}
        </label>
      ))}</fieldset>;
    }
    const inputType = field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "datetime" ? "datetime-local" : field.type === "email" ? "email" : field.type === "url" || field.type === "image_url" || field.type === "file_url" ? "url" : "text";
    return <label>{field.label}<input disabled={readOnly} onChange={(e) => setValue(e.target.value)} placeholder={field.placeholder || ""} type={inputType} value={value ?? ""} /></label>;
  }

  return (
    <div className="unit-creator-dialog-backdrop" role="presentation">
      <form className="unit-creator-dialog" dir={language === "ar" ? "rtl" : "ltr"} onSubmit={handleSubmit}>
        <header><h2>{entry?.id ? copy.editEntry : copy.addEntry}</h2><p>{module?.label}</p></header>
        <div className="unit-creator-dialog-body">
          {errors.length > 0 && <div className="unit-creator-error" role="alert"><ul>{errors.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          {fields.map((field) => <div key={field.key}>{renderInput(field)}</div>)}
        </div>
        <footer className="unit-creator-dialog-actions">
          <button className="secondary-action" onClick={onCancel} type="button">{copy.cancel}</button>
          {!readOnly && <button className="admin-primary-button" type="submit">{copy.save}</button>}
        </footer>
      </form>
    </div>
  );
}

export default function CustomModuleEntriesWorkspace({
  currentUser,
  language = "en",
  module,
  showHeader = true,
  extraActions = null,
}) {
  const copy = unitCreatorCopy(language);
  const canManageEntries = canManageCustomModuleEntries(currentUser, module);
  const [entries, setEntries] = React.useState([]);
  const [loadingEntries, setLoadingEntries] = React.useState(false);
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [entryDialog, setEntryDialog] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [noticeError, setNoticeError] = React.useState(false);
  const columns = module ? listColumnsForModule(module) : [];
  const filteredEntries = filterEntries(entries, query, module);

  const loadEntries = React.useCallback(() => {
    if (!module?.id) {
      setEntries([]);
      return Promise.resolve([]);
    }
    setLoadingEntries(true);
    setError("");
    return fetchCustomModuleEntries(module.id)
      .then((data) => {
        const rows = Array.isArray(data) ? data : [];
        setEntries(rows);
        setLoadingEntries(false);
        return rows;
      })
      .catch((requestError) => {
        setEntries([]);
        setError(requestError?.message || copy.loadFailed);
        setLoadingEntries(false);
        return [];
      });
  }, [copy.loadFailed, module?.id]);

  React.useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  async function handleSaveEntry(data) {
    if (!module) return;
    setSaving(true);
    try {
      if (entryDialog?.entry?.id) {
        await updateCustomModuleEntry(module.id, entryDialog.entry.id, data);
      } else {
        await createCustomModuleEntry(module.id, data);
      }
      setEntryDialog(null);
      setNotice(copy.entrySaved);
      setNoticeError(false);
      await loadEntries();
    } catch (requestError) {
      setNotice(requestError?.message || copy.entrySaveFailed);
      setNoticeError(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEntry(entry) {
    if (!module || !window.confirm(copy.confirmDeleteEntry)) return;
    setSaving(true);
    try {
      await deleteCustomModuleEntry(module.id, entry.id);
      setNotice(copy.entryDeleted);
      setNoticeError(false);
      await loadEntries();
    } catch (requestError) {
      setNotice(requestError?.message || copy.entrySaveFailed);
      setNoticeError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="custom-module-workspace">
      {showHeader && (
        <header className="unit-creator-main-header">
          <div>
            <h2>{module?.label}</h2>
            <p>{module?.description || module?.key}</p>
          </div>
          <div className="unit-creator-main-actions">
            {extraActions}
            {canManageEntries && (
              <button className="admin-primary-button" disabled={saving} onClick={() => setEntryDialog({ entry: { data: emptyEntryDraft(module.fieldsSchema) } })} type="button">
                <Plus size={14} /> {copy.addEntry}
              </button>
            )}
          </div>
        </header>
      )}
      {!showHeader && canManageEntries && (
        <div className="unit-creator-main-actions" style={{ justifyContent: "flex-end", marginBottom: 12 }}>
          {extraActions}
          <button className="admin-primary-button" disabled={saving} onClick={() => setEntryDialog({ entry: { data: emptyEntryDraft(module.fieldsSchema) } })} type="button">
            <Plus size={14} /> {copy.addEntry}
          </button>
        </div>
      )}
      {!canManageEntries && <div className="unit-creator-banner" role="status">{copy.readOnly}</div>}
      {notice && <div className={`unit-creator-banner ${noticeError ? "is-error" : "is-success"}`} role="status">{notice}</div>}
      <div className="unit-creator-toolbar">
        <label className="unit-creator-search"><Search size={16} /><input aria-label={copy.searchEntries} onChange={(e) => setQuery(e.target.value)} placeholder={copy.searchEntries} value={query} /></label>
      </div>
      {error && (
        <div className="unit-creator-error" role="alert">
          <span>{error}</span>
          <button className="secondary-action" onClick={loadEntries} type="button">{copy.retry}</button>
        </div>
      )}
      <div className="unit-creator-table-wrap">
        <table className="unit-creator-table">
          <thead>
            <tr>
              {columns.map((field) => <th key={field.key}>{field.label}</th>)}
              <th>{copy.updated}</th>
              <th>{copy.actions}</th>
            </tr>
          </thead>
          <tbody>
            {loadingEntries ? (
              <tr><td colSpan={Math.max(columns.length + 2, 1)}>{copy.loading}</td></tr>
            ) : !filteredEntries.length ? (
              <tr><td colSpan={Math.max(columns.length + 2, 1)}><div className="unit-creator-empty is-inline"><strong>{copy.emptyEntries}</strong><span>{copy.emptyEntriesHint}</span></div></td></tr>
            ) : filteredEntries.map((entry) => (
              <tr key={entry.id}>
                {columns.map((field) => <td key={field.key}>{displayEntryValue(field, entry.data?.[field.key])}</td>)}
                <td>{entry.updatedAt ? new Date(entry.updatedAt).toLocaleString(language === "ar" ? "ar" : "en") : "—"}</td>
                <td>
                  <div className="unit-creator-row-actions">
                    <button className="text-action" onClick={() => setEntryDialog({ entry })} type="button">{copy.editEntry}</button>
                    {canManageEntries && <button className="text-action is-danger" disabled={saving} onClick={() => handleDeleteEntry(entry)} type="button">{copy.deleteEntry}</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {entryDialog && module && (
        <EntryFormDialog
          copy={copy}
          entry={entryDialog.entry}
          language={language}
          module={module}
          onCancel={() => setEntryDialog(null)}
          onSave={handleSaveEntry}
          readOnly={!canManageEntries || saving}
        />
      )}
    </div>
  );
}
