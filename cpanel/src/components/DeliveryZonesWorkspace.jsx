import React from "react";
import { Plus, Search, Truck } from "lucide-react";
import { canUseDeliveryAction } from "../utils/roles.js";
import { formatCompanyCurrency } from "../utils/sales.js";
import {
  createDeliveryZone,
  deleteDeliveryZone,
  fetchDeliveryZones,
  updateDeliveryZone,
} from "../utils/deliveryZonesApi.js";
import {
  emptyZoneDraft,
  zoneDraftFromRecord,
  zonePayloadFromDraft,
} from "../utils/deliveryZonesUi.js";

const labels = {
  en: {
    title: "Delivery zones",
    subtitle: "Configure city-based delivery prices for checkout.",
    total: "Total zones",
    enabled: "Enabled",
    disabled: "Disabled",
    search: "Search city or region",
    all: "All",
    city: "City",
    key: "Key",
    region: "Region",
    price: "Delivery price",
    currency: "Currency",
    order: "Display order",
    status: "Status",
    actions: "Actions",
    active: "Enabled",
    inactive: "Disabled",
    create: "Add zone",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    enable: "Enable",
    disable: "Disable",
    empty: "No delivery zones yet",
    emptyHint: "Add your first city zone to show delivery prices at checkout.",
    noMatches: "No zones match these filters.",
    readOnly: "View only — you do not have permission to manage delivery zones.",
    loading: "Loading delivery zones…",
    forbidden: "You do not have permission to view delivery zones.",
    loadFailed: "Unable to load delivery zones.",
    saveFailed: "Unable to save delivery zone.",
    deleteFailed: "Unable to delete delivery zone.",
    created: "Delivery zone created.",
    updated: "Delivery zone updated.",
    deleted: "Delivery zone deleted.",
    confirmDelete: "Delete this delivery zone?",
    openFull: "Open full delivery page",
    newZone: "New delivery zone",
    editZone: "Edit delivery zone",
    cityRequired: "City name is required.",
    priceInvalid: "Delivery price must be 0 or greater.",
  },
  ar: {
    title: "مناطق التوصيل",
    subtitle: "اضبط أسعار التوصيل حسب المدينة عند الدفع.",
    total: "إجمالي المناطق",
    enabled: "مفعّلة",
    disabled: "معطّلة",
    search: "ابحث عن مدينة أو منطقة",
    all: "الكل",
    city: "المدينة",
    key: "المفتاح",
    region: "المنطقة",
    price: "سعر التوصيل",
    currency: "العملة",
    order: "ترتيب العرض",
    status: "الحالة",
    actions: "الإجراءات",
    active: "مفعّلة",
    inactive: "معطّلة",
    create: "إضافة منطقة",
    edit: "تعديل",
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    enable: "تفعيل",
    disable: "تعطيل",
    empty: "لا توجد مناطق توصيل بعد",
    emptyHint: "أضف أول منطقة مدينة لإظهار أسعار التوصيل عند الدفع.",
    noMatches: "لا توجد مناطق مطابقة لهذه الفلاتر.",
    readOnly: "وضع العرض فقط — ليس لديك صلاحية إدارة مناطق التوصيل.",
    loading: "جاري تحميل مناطق التوصيل…",
    forbidden: "ليس لديك صلاحية عرض مناطق التوصيل.",
    loadFailed: "تعذر تحميل مناطق التوصيل.",
    saveFailed: "تعذر حفظ منطقة التوصيل.",
    deleteFailed: "تعذر حذف منطقة التوصيل.",
    created: "تم إنشاء منطقة التوصيل.",
    updated: "تم تحديث منطقة التوصيل.",
    deleted: "تم حذف منطقة التوصيل.",
    confirmDelete: "هل تريد حذف منطقة التوصيل هذه؟",
    openFull: "فتح صفحة التوصيل الكاملة",
    newZone: "منطقة توصيل جديدة",
    editZone: "تعديل منطقة التوصيل",
    cityRequired: "اسم المدينة مطلوب.",
    priceInvalid: "يجب أن يكون سعر التوصيل 0 أو أكثر.",
  },
};

function ZoneDialog({ copy, draft, editing, busy, error, language, onChange, onClose, onSave }) {
  const ar = language === "ar";
  return (
    <div className="delivery-zones-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="delivery-zones-dialog"
        dir={ar ? "rtl" : "ltr"}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-zone-dialog-title"
      >
        <header>
          <h2 id="delivery-zone-dialog-title">{editing ? copy.editZone : copy.newZone}</h2>
        </header>
        <div className="delivery-zones-dialog-body">
          <label>
            {copy.city}
            <input
              aria-label={copy.city}
              autoFocus
              disabled={busy}
              onChange={(event) => onChange({ ...draft, city_name: event.target.value })}
              value={draft.city_name}
            />
          </label>
          <label>
            {copy.key}
            <input
              aria-label={copy.key}
              disabled={busy}
              onChange={(event) => onChange({ ...draft, city_key: event.target.value })}
              placeholder={draft.city_name || copy.key}
              value={draft.city_key}
            />
          </label>
          <label>
            {copy.region}
            <input
              aria-label={copy.region}
              disabled={busy}
              onChange={(event) => onChange({ ...draft, region: event.target.value })}
              value={draft.region}
            />
          </label>
          <div className="delivery-zones-dialog-row">
            <label>
              {copy.price}
              <input
                aria-label={copy.price}
                disabled={busy}
                min="0"
                step="0.01"
                type="number"
                onChange={(event) => onChange({ ...draft, delivery_price: event.target.value })}
                value={draft.delivery_price}
              />
            </label>
            <label>
              {copy.currency}
              <input
                aria-label={copy.currency}
                disabled={busy}
                maxLength={3}
                onChange={(event) => onChange({ ...draft, currency: event.target.value.toUpperCase() })}
                value={draft.currency}
              />
            </label>
          </div>
          <label>
            {copy.order}
            <input
              aria-label={copy.order}
              disabled={busy}
              min="0"
              type="number"
              onChange={(event) => onChange({ ...draft, display_order: event.target.value })}
              value={draft.display_order}
            />
          </label>
          <label className="delivery-zones-checkbox">
            <input
              checked={draft.enabled !== false}
              disabled={busy}
              onChange={(event) => onChange({ ...draft, enabled: event.target.checked })}
              type="checkbox"
            />
            {copy.active}
          </label>
          {error && <div className="delivery-zones-error" role="alert">{error}</div>}
        </div>
        <footer className="delivery-zones-dialog-actions">
          <button className="tenant-secondary-button" disabled={busy} onClick={onClose} type="button">{copy.cancel}</button>
          <button className="tenant-primary-button" disabled={busy} onClick={onSave} type="button">{busy ? "…" : copy.save}</button>
        </footer>
      </div>
    </div>
  );
}

export default function DeliveryZonesWorkspace({
  company,
  compact = false,
  currentUser,
  language = "en",
  onNavigate,
}) {
  const copy = labels[language] || labels.en;
  const ar = language === "ar";
  const canManage = canUseDeliveryAction(currentUser, "delivery.manage");
  const [zones, setZones] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState("");
  const [draft, setDraft] = React.useState(emptyZoneDraft(company));
  const [dialogError, setDialogError] = React.useState("");
  const [busy, setBusy] = React.useState("");
  const [forbidden, setForbidden] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    setForbidden(false);
    try {
      const rows = await fetchDeliveryZones();
      setZones(Array.isArray(rows) ? rows : []);
    } catch (loadError) {
      if (/403|forbidden|access denied/i.test(loadError.message || "")) {
        setForbidden(true);
      } else {
        setError(loadError.message || copy.loadFailed);
      }
      setZones([]);
    } finally {
      setLoading(false);
    }
  }, [copy.loadFailed]);

  React.useEffect(() => {
    load();
  }, [load, company?.id]);

  const summary = zones.reduce(
    (result, zone) => ({
      enabled: result.enabled + (zone.enabled !== false ? 1 : 0),
      disabled: result.disabled + (zone.enabled === false ? 1 : 0),
    }),
    { enabled: 0, disabled: 0 },
  );

  const filtered = zones.filter((zone) => {
    const haystack = `${zone.city_name || ""} ${zone.city_key || ""} ${zone.region || ""}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query.trim().toLowerCase());
    const matchesStatus = !statusFilter
      || (statusFilter === "enabled" && zone.enabled !== false)
      || (statusFilter === "disabled" && zone.enabled === false);
    return matchesQuery && matchesStatus;
  });

  function openCreate() {
    if (!canManage) return;
    setEditingId("");
    setDraft(emptyZoneDraft(company));
    setDialogError("");
    setDialogOpen(true);
  }

  function openEdit(zone) {
    if (!canManage) return;
    setEditingId(zone.id);
    setDraft(zoneDraftFromRecord(zone));
    setDialogError("");
    setDialogOpen(true);
  }

  function closeDialog() {
    if (busy) return;
    setDialogOpen(false);
    setDialogError("");
  }

  async function saveDialog() {
    if (!canManage) return;
    const cityName = String(draft.city_name || "").trim();
    if (!cityName) {
      setDialogError(copy.cityRequired);
      return;
    }
    const price = Number(draft.delivery_price || 0);
    if (!Number.isFinite(price) || price < 0) {
      setDialogError(copy.priceInvalid);
      return;
    }
    setBusy("save");
    setDialogError("");
    setError("");
    setMessage("");
    try {
      const payload = zonePayloadFromDraft(draft);
      if (editingId) {
        await updateDeliveryZone(editingId, payload);
        setMessage(copy.updated);
      } else {
        await createDeliveryZone(payload);
        setMessage(copy.created);
      }
      setDialogOpen(false);
      await load();
    } catch (saveError) {
      setDialogError(saveError.message || copy.saveFailed);
    } finally {
      setBusy("");
    }
  }

  async function toggleEnabled(zone) {
    if (!canManage || busy) return;
    setBusy(zone.id);
    setError("");
    setMessage("");
    try {
      await updateDeliveryZone(zone.id, { enabled: zone.enabled === false });
      setMessage(copy.updated);
      await load();
    } catch (toggleError) {
      setError(toggleError.message || copy.saveFailed);
    } finally {
      setBusy("");
    }
  }

  async function removeZone(zone) {
    if (!canManage || busy) return;
    if (!window.confirm(copy.confirmDelete)) return;
    setBusy(zone.id);
    setError("");
    setMessage("");
    try {
      await deleteDeliveryZone(zone.id);
      setMessage(copy.deleted);
      await load();
    } catch (deleteError) {
      setError(deleteError.message || copy.deleteFailed);
    } finally {
      setBusy("");
    }
  }

  if (forbidden) {
    return (
      <section className="delivery-zones-forbidden" dir={ar ? "rtl" : "ltr"}>
        <strong>{copy.forbidden}</strong>
      </section>
    );
  }

  return (
    <div className={`delivery-zones-page${compact ? " is-compact" : ""}`} dir={ar ? "rtl" : "ltr"}>
      {!compact && (
        <header className="delivery-zones-header">
          <div>
            <h2>{copy.title}</h2>
            <p>{copy.subtitle}</p>
          </div>
          {canManage && (
            <button className="tenant-primary-button" onClick={openCreate} type="button">
              <Plus size={18} />
              {copy.create}
            </button>
          )}
        </header>
      )}

      {compact && (
        <div className="delivery-zones-compact-actions">
          {onNavigate && (
            <button className="tenant-secondary-button" onClick={() => onNavigate("admin-delivery")} type="button">
              {copy.openFull}
            </button>
          )}
          {canManage && (
            <button className="tenant-primary-button" onClick={openCreate} type="button">
              <Plus size={18} />
              {copy.create}
            </button>
          )}
        </div>
      )}

      {!canManage && <div className="delivery-zones-banner" role="status">{copy.readOnly}</div>}
      {message && <div className="delivery-zones-banner is-success" role="status">{message}</div>}
      {error && <div className="delivery-zones-error" role="alert">{error}</div>}

      <section className="delivery-zones-summary" aria-label={copy.title}>
        <article className="delivery-zones-summary__card is-total"><span>{copy.total}</span><strong>{zones.length}</strong></article>
        <article className="delivery-zones-summary__card is-enabled"><span>{copy.enabled}</span><strong>{summary.enabled}</strong></article>
        <article className="delivery-zones-summary__card is-disabled"><span>{copy.disabled}</span><strong>{summary.disabled}</strong></article>
      </section>

      <section className="delivery-zones-panel">
        <div className="delivery-zones-toolbar">
          <label className="delivery-zones-search">
            <Search size={18} />
            <input
              aria-label={copy.search}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.search}
              value={query}
            />
          </label>
          <select
            aria-label={copy.status}
            onChange={(event) => setStatusFilter(event.target.value)}
            value={statusFilter}
          >
            <option value="">{copy.all} {copy.status}</option>
            <option value="enabled">{copy.enabled}</option>
            <option value="disabled">{copy.disabled}</option>
          </select>
        </div>

        {loading ? (
          <div className="delivery-zones-loading">{copy.loading}</div>
        ) : !zones.length ? (
          <div className="delivery-zones-empty">
            <Truck size={28} />
            <strong>{copy.empty}</strong>
            <span>{copy.emptyHint}</span>
            {canManage && (
              <button className="tenant-primary-button" onClick={openCreate} type="button">{copy.create}</button>
            )}
          </div>
        ) : !filtered.length ? (
          <div className="delivery-zones-empty">
            <strong>{copy.noMatches}</strong>
          </div>
        ) : (
          <div className="admin-data-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>{copy.city}</th>
                  <th>{copy.region}</th>
                  <th>{copy.price}</th>
                  <th>{copy.order}</th>
                  <th>{copy.status}</th>
                  <th className="admin-data-table-actions">{copy.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((zone) => (
                  <tr className={zone.enabled === false ? "is-disabled" : ""} key={zone.id}>
                    <td>
                      <strong className="admin-data-table-cell-clip" title={zone.city_name}>{zone.city_name}</strong>
                      <code>{zone.city_key}</code>
                    </td>
                    <td>{zone.region || "—"}</td>
                    <td>{formatCompanyCurrency(zone.delivery_price, { settings: { currency: zone.currency } }, language)}</td>
                    <td>{zone.display_order ?? 0}</td>
                    <td>
                      <span className={`delivery-zones-status is-${zone.enabled === false ? "disabled" : "enabled"}`}>
                        {zone.enabled === false ? copy.inactive : copy.active}
                      </span>
                    </td>
                    <td className="admin-data-table-actions">
                      <div className="delivery-zones-row-actions">
                        {canManage ? (
                          <>
                            <button aria-label={copy.edit} className="text-action" disabled={busy === zone.id} onClick={() => openEdit(zone)} type="button">{copy.edit}</button>
                            <button aria-label={zone.enabled === false ? copy.enable : copy.disable} className="text-action" disabled={busy === zone.id} onClick={() => toggleEnabled(zone)} type="button">
                              {zone.enabled === false ? copy.enable : copy.disable}
                            </button>
                            <button aria-label={copy.delete} className="text-action is-danger" disabled={busy === zone.id} onClick={() => removeZone(zone)} type="button">{copy.delete}</button>
                          </>
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {dialogOpen && (
        <ZoneDialog
          busy={busy === "save"}
          copy={copy}
          draft={draft}
          editing={Boolean(editingId)}
          error={dialogError}
          language={language}
          onChange={setDraft}
          onClose={closeDialog}
          onSave={saveDialog}
        />
      )}
    </div>
  );
}

export { labels as deliveryZoneLabels };
