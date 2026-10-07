import React from "react";
import { ChevronDown, ChevronUp, LoaderCircle, Plus, RefreshCw, Save, Search, Settings2, X } from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import { canAccessAdminPage, canUseProductSettingsAction, isCompanyAdmin } from "../utils/roles.js";
import { hasPermission } from "../data/permissions.js";
import { fetchProductSchema, saveProductSchema } from "../utils/productSchemaApi.js";
import { fetchCompanySettings, updateCompanySettings } from "../utils/companyApi.js";
import {
  BUCKET_LIMITS,
  PRODUCT_FIELD_TYPES,
  PRODUCT_TAB_KEYS,
  canRemoveField,
  cloneSchema,
  emptyCustomField,
  emptyShowcaseField,
  fieldLabel,
  filterSchemaFields,
  isBuiltInField,
  isProtectedField,
  optionsToText,
  schemaCopy,
  schemaSummary,
  sortedShowcaseFields,
  tabLabel,
  textToOptions,
  validateSchemaDraft,
} from "../utils/productSchemaUi.js";

const BUCKETS = ["fields", "variantAttributes", "mediaFields", "showcase", "tabs"];

function ProductMerchandisingSettingsPanel({
  company,
  currentUser,
  language = "en",
  onCompanyUpdated,
}) {
  const ar = language === "ar";
  const canViewSettings = isCompanyAdmin(currentUser?.role)
    || hasPermission(currentUser, "company_settings.view")
    || hasPermission(currentUser, "company_settings.update");
  const canUpdateSettings = isCompanyAdmin(currentUser?.role)
    || hasPermission(currentUser, "company_settings.update");
  const [draft, setDraft] = React.useState({
    lowStockThreshold: 5,
    costPriceEnabled: false,
    productConditionEnabled: false,
    showCouponBoxAtCheckout: false,
  });
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  const load = React.useCallback(() => {
    if (!canViewSettings) return;
    setLoading(true);
    setError("");
    fetchCompanySettings()
      .then((settings) => {
        setDraft({
          lowStockThreshold: Number.isInteger(settings?.lowStockThreshold) ? settings.lowStockThreshold : 5,
          costPriceEnabled: settings?.costPriceEnabled === true,
          productConditionEnabled: settings?.productConditionEnabled === true,
          showCouponBoxAtCheckout: settings?.showCouponBoxAtCheckout === true,
        });
      })
      .catch((requestError) => {
        setError(requestError?.message || (ar ? "تعذر تحميل إعدادات المنتج." : "Unable to load product settings."));
      })
      .finally(() => setLoading(false));
  }, [ar, canViewSettings]);

  React.useEffect(() => {
    load();
  }, [company?.id, load]);

  async function handleSave(event) {
    event.preventDefault();
    if (!canUpdateSettings) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const threshold = Number(draft.lowStockThreshold);
      if (!Number.isInteger(threshold) || threshold < 0) {
        throw new Error(ar ? "حد المخزون المنخفض غير صالح." : "Low stock threshold must be a non-negative integer.");
      }
      const updatedCompany = await updateCompanySettings({
        lowStockThreshold: threshold,
        costPriceEnabled: draft.costPriceEnabled === true,
        productConditionEnabled: draft.productConditionEnabled === true,
        showCouponBoxAtCheckout: draft.showCouponBoxAtCheckout === true,
      });
      onCompanyUpdated?.(updatedCompany);
      setNotice(ar ? "تم حفظ إعدادات المنتج." : "Product settings saved.");
    } catch (requestError) {
      setError(requestError?.message || (ar ? "تعذر حفظ الإعدادات." : "Unable to save settings."));
    } finally {
      setSaving(false);
    }
  }

  if (!canViewSettings) {
    return (
      <section className="product-merchandising-settings">
        <div className="product-schema-forbidden" role="status">
          <strong>{ar ? "ليست لديك صلاحية عرض إعدادات المنتج." : "You do not have permission to view product settings."}</strong>
        </div>
      </section>
    );
  }

  return (
    <section className="product-merchandising-settings">
      <div className="admin-section-head">
        <div>
          <h2>{ar ? "إعدادات المنتجات" : "Product Settings"}</h2>
          <p>{ar ? "إعدادات الشركة للمخزون والتكلفة وقواعد الشراء." : "Company-level inventory, cost price, and checkout product settings."}</p>
        </div>
        <button className="secondary-action" disabled={loading || saving} onClick={load} type="button">
          <RefreshCw size={16} /> {ar ? "إعادة تحميل" : "Reload"}
        </button>
      </div>
      {error ? <div className="product-schema-error" role="alert">{error}</div> : null}
      {notice ? <div className="product-schema-banner is-success" role="status">{notice}</div> : null}
      <form className="admin-form admin-stack-form product-settings-form" onSubmit={handleSave}>
        <fieldset disabled={loading || saving || !canUpdateSettings}>
          <h3>{ar ? "المخزون" : "Inventory"}</h3>
          <label>
            {ar ? "حد المخزون المنخفض" : "Low stock threshold"}
            <input
              min="0"
              step="1"
              type="number"
              value={draft.lowStockThreshold}
              onChange={(event) => setDraft((current) => ({ ...current, lowStockThreshold: event.target.value }))}
            />
          </label>

          <h3>{ar ? "سعر التكلفة" : "Cost Price"}</h3>
          <label className="checkbox-line">
            <input
              checked={draft.costPriceEnabled === true}
              type="checkbox"
              onChange={(event) => setDraft((current) => ({ ...current, costPriceEnabled: event.target.checked }))}
            />
            {ar ? "تفعيل سعر التكلفة (يتطلب صلاحية منفصلة للتعديل)" : "Enable cost price (editing still requires products.cost_price.manage)"}
          </label>

          <h3>{ar ? "حالة المنتج" : "Product Condition"}</h3>
          <label className="checkbox-line">
            <input
              checked={draft.productConditionEnabled === true}
              type="checkbox"
              onChange={(event) => setDraft((current) => ({ ...current, productConditionEnabled: event.target.checked }))}
            />
            {ar ? "تفعيل حالة المنتج (جديد / مجدد / مستعمل). اختيارية لكل منتج." : "Enable product condition (New / Refurbished / Used). Optional per product."}
          </label>

          <h3>{ar ? "الدفع / القسائم" : "Checkout / Coupons"}</h3>
          <label className="checkbox-line">
            <input
              checked={draft.showCouponBoxAtCheckout === true}
              type="checkbox"
              onChange={(event) => setDraft((current) => ({ ...current, showCouponBoxAtCheckout: event.target.checked }))}
            />
            {ar ? "إظهار مربع القسيمة عند الدفع" : "Show coupon box at checkout"}
          </label>
          <p className="admin-note">
            {ar
              ? "يتحكم هذا الإعداد في إظهار مربع القسيمة في واجهة الدفع فقط. التحقق من القسائم يتم دائماً من الخادم."
              : "Controls coupon box visibility at checkout only. Coupon validation remains server-authoritative."}
          </p>
        </fieldset>
        {canUpdateSettings ? (
          <div className="form-actions">
            <button className="admin-primary-button" disabled={saving || loading} type="submit">
              {saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
              {ar ? "حفظ إعدادات المنتج" : "Save product settings"}
            </button>
          </div>
        ) : null}
      </form>
    </section>
  );
}

function bucketList(schema, bucket) {
  if (bucket === "showcase") return schema?.showcaseSections || [];
  if (bucket === "tabs") return schema?.tabs || [];
  return schema?.[bucket] || [];
}

function updateBucketList(schema, bucket, list) {
  const next = cloneSchema(schema);
  if (bucket === "showcase") next.showcaseSections = list;
  else if (bucket === "tabs") next.tabs = list;
  else next[bucket] = list;
  return next;
}

function FieldEditorDialog({
  copy,
  language,
  bucket,
  field,
  isNew,
  onCancel,
  onSave,
  readOnly,
}) {
  const [draft, setDraft] = React.useState(() => cloneSchema(field));
  const [optionsText, setOptionsText] = React.useState(() => optionsToText(field?.options));
  const [error, setError] = React.useState("");
  const protectedField = isProtectedField(draft);
  const builtIn = bucket === "showcaseField" ? false : isBuiltInField(draft, bucket);

  function handleSubmit(event) {
    event.preventDefault();
    if (readOnly) return;
    try {
      const next = cloneSchema(draft);
      if (["select", "multi_select"].includes(next.type)) {
        next.options = textToOptions(optionsText);
      } else {
        next.options = [];
      }
      if (!String(next.label?.en || "").trim() || !String(next.label?.ar || "").trim()) {
        setError(language === "ar" ? "التسميات مطلوبة." : "Labels are required.");
        return;
      }
      if (isNew && (!next.key || !/^[a-z][a-zA-Z0-9_]{1,63}$/.test(next.key))) {
        setError(language === "ar" ? "المفتاح غير صالح." : "Field key is invalid.");
        return;
      }
      if (bucket === "showcaseField") next.tab = "showcase";
      onSave(next);
    } catch (requestError) {
      setError(requestError.message || copy.saveFailed);
    }
  }

  return (
    <div className="product-schema-dialog-backdrop" role="presentation">
      <form className="product-schema-dialog" dir={language === "ar" ? "rtl" : "ltr"} onSubmit={handleSubmit}>
        <header>
          <h2>{isNew ? copy.newFieldTitle : copy.editFieldTitle}</h2>
        </header>
        <div className="product-schema-dialog-body">
          {error && <div className="product-schema-error" role="alert">{error}</div>}
          <label>
            {copy.key}
            <input
              disabled={readOnly || !isNew || protectedField || builtIn}
              onChange={(event) => setDraft((current) => ({ ...current, key: event.target.value.trim() }))}
              value={draft.key || ""}
            />
          </label>
          <div className="product-schema-dialog-row">
            <label>
              {copy.labelEn}
              <input
                disabled={readOnly}
                onChange={(event) => setDraft((current) => ({ ...current, label: { ...current.label, en: event.target.value } }))}
                value={draft.label?.en || ""}
              />
            </label>
            <label>
              {copy.labelAr}
              <input
                dir="rtl"
                disabled={readOnly}
                onChange={(event) => setDraft((current) => ({ ...current, label: { ...current.label, ar: event.target.value } }))}
                value={draft.label?.ar || ""}
              />
            </label>
          </div>
          <div className="product-schema-dialog-row">
            <label>
              {copy.type}
              <select
                disabled={readOnly || protectedField}
                onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))}
                value={draft.type || "text"}
              >
                {PRODUCT_FIELD_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label>
              {copy.sortOrder}
              <input
                disabled={readOnly}
                min="0"
                max="9999"
                onChange={(event) => setDraft((current) => ({ ...current, sortOrder: Number(event.target.value) || 0 }))}
                type="number"
                value={draft.sortOrder ?? 0}
              />
            </label>
          </div>
          {bucket === "fields" && (
            <label>
              {copy.tab}
              <select
                disabled={readOnly || protectedField}
                onChange={(event) => setDraft((current) => ({ ...current, tab: event.target.value }))}
                value={draft.tab || "custom_sections"}
              >
                {PRODUCT_TAB_KEYS.map((tab) => <option key={tab} value={tab}>{tab}</option>)}
              </select>
            </label>
          )}
          <div className="product-schema-checkbox-row">
            <label className="product-schema-checkbox">
              <input
                checked={draft.required === true}
                disabled={readOnly || protectedField}
                onChange={(event) => setDraft((current) => ({ ...current, required: event.target.checked }))}
                type="checkbox"
              />
              {copy.required}
            </label>
            <label className="product-schema-checkbox">
              <input
                checked={draft.enabled !== false}
                disabled={readOnly || protectedField}
                onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))}
                type="checkbox"
              />
              {copy.enabled}
            </label>
            <label className="product-schema-checkbox">
              <input
                checked={draft.storefrontVisible === true}
                disabled={readOnly}
                onChange={(event) => setDraft((current) => ({ ...current, storefrontVisible: event.target.checked }))}
                type="checkbox"
              />
              {copy.storefront}
            </label>
          </div>
          {["select", "multi_select"].includes(draft.type) && !["categoryId", "brandId"].includes(draft.key) && (
            <label>
              {copy.options}
              <textarea
                disabled={readOnly}
                onChange={(event) => setOptionsText(event.target.value)}
                placeholder={copy.optionsHint}
                rows={4}
                value={optionsText}
              />
              <span className="product-schema-hint">{copy.optionsHint}</span>
            </label>
          )}
        </div>
        <footer className="product-schema-dialog-actions">
          <button className="secondary-action" onClick={onCancel} type="button">{copy.cancel}</button>
          {!readOnly && <button className="admin-primary-button" type="submit">{copy.save}</button>}
        </footer>
      </form>
    </div>
  );
}

export default function AdminProductSettingsPage({
  company,
  currentUser,
  language = "en",
  ...layoutProps
}) {
  const copy = schemaCopy(language);
  const dir = language === "ar" ? "rtl" : "ltr";
  const canView = canAccessAdminPage(currentUser, "admin-product-settings");
  const canManage = canUseProductSettingsAction(currentUser, "product_settings.manage");
  const [saved, setSaved] = React.useState(null);
  const [draft, setDraft] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [forbidden, setForbidden] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [noticeError, setNoticeError] = React.useState(false);
  const [activeBucket, setActiveBucket] = React.useState("fields");
  const [filters, setFilters] = React.useState({ query: "", tab: "all", enabled: "all" });
  const [editorState, setEditorState] = React.useState(null);
  const [validationErrors, setValidationErrors] = React.useState([]);
  const requestRef = React.useRef(0);

  const dirty = Boolean(saved && draft && JSON.stringify(saved) !== JSON.stringify(draft));
  const summary = schemaSummary(draft || saved || {});

  const load = React.useCallback(() => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError("");
    setForbidden(false);
    setValidationErrors([]);
    fetchProductSchema()
      .then((data) => {
        if (requestRef.current !== requestId) return;
        const normalized = cloneSchema(data);
        setSaved(normalized);
        setDraft(normalized);
        setLoading(false);
      })
      .catch((requestError) => {
        if (requestRef.current !== requestId) return;
        setSaved(null);
        setDraft(null);
        setForbidden(requestError?.status === 403);
        setError(requestError?.status === 403 ? "" : (requestError?.message || copy.loadFailed));
        setLoading(false);
      });
  }, [copy.loadFailed]);

  React.useEffect(() => {
    if (!canView) return undefined;
    load();
    return () => { requestRef.current += 1; };
  }, [canView, company?.id, load]);

  function showNotice(text, isError = false) {
    setNotice(text);
    setNoticeError(isError);
  }

  function resetDraft() {
    if (!saved) return;
    setDraft(cloneSchema(saved));
    setValidationErrors([]);
    setEditorState(null);
  }

  async function handleSave() {
    if (!canManage || !draft) return;
    const validation = validateSchemaDraft(draft);
    setValidationErrors(validation.errors);
    if (!validation.valid) return;
    setSaving(true);
    try {
      const persisted = await saveProductSchema(draft);
      const normalized = cloneSchema(persisted);
      setSaved(normalized);
      setDraft(normalized);
      setValidationErrors([]);
      setEditorState(null);
      showNotice(copy.saved);
    } catch (requestError) {
      showNotice(requestError?.message || copy.saveFailed, true);
    } finally {
      setSaving(false);
    }
  }

  function upsertField(bucket, field, originalKey = "") {
    setDraft((current) => {
      const list = [...bucketList(current, bucket)];
      const index = list.findIndex((item) => item.key === (originalKey || field.key));
      if (index >= 0) list[index] = field;
      else list.push(field);
      return updateBucketList(current, bucket, list);
    });
    setEditorState(null);
  }

  function removeField(bucket, key) {
    if (!window.confirm(copy.confirmRemove)) return;
    setDraft((current) => {
      const list = bucketList(current, bucket).filter((item) => item.key !== key);
      return updateBucketList(current, bucket, list);
    });
  }

  function removeShowcaseField(sectionKey, key) {
    if (!window.confirm(copy.confirmRemove)) return;
    setDraft((current) => ({
      ...current,
      showcaseSections: (current?.showcaseSections || []).map((section) => (
        section.key === sectionKey
          ? { ...section, fields: (section.fields || []).filter((item) => item.key !== key) }
          : section
      )),
    }));
  }

  function upsertShowcaseField(sectionKey, field, originalKey = "") {
    setDraft((current) => ({
      ...current,
      showcaseSections: (current?.showcaseSections || []).map((section) => {
        if (section.key !== sectionKey) return section;
        const fields = [...(section.fields || [])];
        const normalized = { ...field, tab: "showcase" };
        const index = fields.findIndex((item) => item.key === (originalKey || field.key));
        if (index >= 0) fields[index] = normalized;
        else fields.push(normalized);
        return { ...section, fields: sortedShowcaseFields(fields) };
      }),
    }));
    setEditorState(null);
  }

  function moveShowcaseField(sectionKey, key, direction) {
    setDraft((current) => ({
      ...current,
      showcaseSections: (current?.showcaseSections || []).map((section) => {
        if (section.key !== sectionKey) return section;
        const fields = sortedShowcaseFields(section.fields);
        const index = fields.findIndex((item) => item.key === key);
        if (index < 0) return section;
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= fields.length) return section;
        const currentOrder = Number(fields[index].sortOrder ?? index * 10);
        const targetOrder = Number(fields[targetIndex].sortOrder ?? targetIndex * 10);
        fields[index] = { ...fields[index], sortOrder: targetOrder };
        fields[targetIndex] = { ...fields[targetIndex], sortOrder: currentOrder };
        return { ...section, fields: sortedShowcaseFields(fields) };
      }),
    }));
  }

  function updateTab(tabKey, patch) {
    setDraft((current) => {
      const tabs = (current?.tabs || []).map((tab) => (
        tab.key === tabKey ? { ...tab, ...patch } : tab
      ));
      return { ...current, tabs };
    });
  }

  function updateShowcaseSection(sectionKey, patch) {
    setDraft((current) => {
      const sections = (current?.showcaseSections || []).map((section) => (
        section.key === sectionKey ? { ...section, ...patch } : section
      ));
      return { ...current, showcaseSections: sections };
    });
  }

  function updateStorefrontVisibility(key, value) {
    setDraft((current) => ({
      ...current,
      storefrontVisibility: {
        ...(current?.storefrontVisibility || {}),
        [key]: value,
      },
    }));
  }

  const fieldBuckets = ["fields", "variantAttributes", "mediaFields"];
  const visibleFields = fieldBuckets.includes(activeBucket)
    ? filterSchemaFields(bucketList(draft, activeBucket), filters)
    : [];

  const canAddField = canManage && fieldBuckets.includes(activeBucket)
    && bucketList(draft, activeBucket).length < BUCKET_LIMITS[activeBucket];

  if (!canView) {
    return (
      <AdminLayout
        activePage="admin-product-settings"
        company={company}
        currentUser={currentUser}
        hideHeader
        language={language}
        {...layoutProps}
      >
        <div className="product-schema-forbidden" dir={dir}><strong>{copy.forbidden}</strong></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      activePage="admin-product-settings"
      company={company}
      currentUser={currentUser}
      hideHeader
      language={language}
      {...layoutProps}
    >
      <section className="product-schema-page product-settings-page" dir={dir}>
        <header className="product-schema-header">
          <div>
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </div>
          <div className="product-schema-header-actions">
            {!forbidden && (
              <button className="secondary-action" disabled={loading} onClick={load} type="button">
                <RefreshCw size={16} /> {copy.reload}
              </button>
            )}
            {canManage && !forbidden && (
              <>
                <button className="secondary-action" disabled={!dirty || saving} onClick={resetDraft} type="button">
                  <X size={16} /> {copy.reset}
                </button>
                <button className="admin-primary-button" disabled={!dirty || saving} onClick={handleSave} type="button">
                  {saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
                  {copy.save}
                </button>
              </>
            )}
          </div>
        </header>

        <ProductMerchandisingSettingsPanel
          company={company}
          currentUser={currentUser}
          language={language}
          onCompanyUpdated={layoutProps.onCompanyUpdated}
        />

        {!canManage && <div className="product-schema-banner" role="status">{copy.readOnly}</div>}
        {dirty && canManage && <div className="product-schema-banner is-dirty" role="status">{copy.dirty}</div>}
        {notice && <div className={`product-schema-banner ${noticeError ? "is-error" : "is-success"}`} role="status">{notice}</div>}
        {validationErrors.length > 0 && (
          <div className="product-schema-error" role="alert">
            <strong>{copy.validationTitle}</strong>
            <ul>{validationErrors.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        )}

        {loading && (
          <div className="product-schema-loading">
            <LoaderCircle className="spin" size={28} />
            <span>{copy.loading}</span>
          </div>
        )}

        {!loading && forbidden && (
          <div className="product-schema-forbidden">
            <Settings2 size={28} />
            <strong>{copy.forbidden}</strong>
          </div>
        )}

        {!loading && error && (
          <div className="product-schema-error">
            <span>{error}</span>
            <button className="secondary-action" onClick={load} type="button">{copy.retry}</button>
          </div>
        )}

        {!loading && !error && !forbidden && draft && (
          <>
            <div className="product-schema-summary">
              <article><span>{copy.buckets.fields}</span><strong>{summary.fields}</strong></article>
              <article><span>{copy.enabled}</span><strong>{summary.enabledFields}</strong></article>
              <article><span>{copy.buckets.variantAttributes}</span><strong>{summary.variantAttributes}</strong></article>
              <article><span>{copy.buckets.mediaFields}</span><strong>{summary.mediaFields}</strong></article>
            </div>

            <nav className="product-schema-buckets" aria-label={copy.title}>
              {BUCKETS.map((bucket) => (
                <button
                  className={activeBucket === bucket ? "active" : ""}
                  key={bucket}
                  onClick={() => {
                    setActiveBucket(bucket);
                    setEditorState(null);
                  }}
                  type="button"
                >
                  {copy.buckets[bucket]}
                </button>
              ))}
            </nav>

            {fieldBuckets.includes(activeBucket) && (
              <section className="product-schema-panel">
                <div className="product-schema-toolbar">
                  <label className="product-schema-search">
                    <Search size={16} />
                    <input
                      aria-label={copy.search}
                      onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                      placeholder={copy.search}
                      value={filters.query}
                    />
                  </label>
                  {activeBucket === "fields" && (
                    <select
                      aria-label={copy.tab}
                      onChange={(event) => setFilters((current) => ({ ...current, tab: event.target.value }))}
                      value={filters.tab}
                    >
                      <option value="all">{copy.all}</option>
                      {PRODUCT_TAB_KEYS.map((tab) => <option key={tab} value={tab}>{tabLabel(tab, draft, language)}</option>)}
                    </select>
                  )}
                  <select
                    aria-label={copy.enabled}
                    onChange={(event) => setFilters((current) => ({ ...current, enabled: event.target.value }))}
                    value={filters.enabled}
                  >
                    <option value="all">{copy.all}</option>
                    <option value="enabled">{copy.enabled}</option>
                    <option value="disabled">{copy.disabled}</option>
                  </select>
                  {canAddField && (
                    <button
                      className="admin-primary-button"
                      onClick={() => setEditorState({ bucket: activeBucket, field: emptyCustomField(activeBucket), isNew: true })}
                      type="button"
                    >
                      <Plus size={16} /> {copy.addField}
                    </button>
                  )}
                </div>

                {!visibleFields.length ? (
                  <div className="product-schema-empty">
                    <strong>{filters.query || filters.tab !== "all" || filters.enabled !== "all" ? copy.noMatches : copy.empty}</strong>
                    <span>{copy.emptyHint}</span>
                  </div>
                ) : (
                  <div className="admin-data-table-wrap">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>{copy.key}</th>
                          <th>{language === "ar" ? copy.labelAr : copy.labelEn}</th>
                          <th>{copy.type}</th>
                          {activeBucket === "fields" && <th>{copy.tab}</th>}
                          <th>{copy.sortOrder}</th>
                          <th>{copy.enabled}</th>
                          <th className="admin-data-table-actions">{copy.actions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleFields.map((field) => (
                          <tr className={field.enabled === false ? "is-disabled" : ""} key={field.key}>
                            <td>
                              <strong>{field.key}</strong>
                              <div className="product-schema-badges">
                                {isProtectedField(field) && <span className="is-protected">{copy.protected}</span>}
                                {isBuiltInField(field, activeBucket) && <span className="is-built-in">{copy.builtIn}</span>}
                              </div>
                            </td>
                            <td>{fieldLabel(field, language)}</td>
                            <td>{field.type}</td>
                            {activeBucket === "fields" && <td>{tabLabel(field.tab, draft, language)}</td>}
                            <td>{field.sortOrder ?? 0}</td>
                            <td>
                              <span className={`product-schema-status ${field.enabled !== false ? "is-enabled" : "is-disabled"}`}>
                                {field.enabled !== false ? copy.enabled : copy.disabled}
                              </span>
                            </td>
                            <td className="admin-data-table-actions">
                              <div className="product-schema-row-actions">
                                <button
                                  className="text-action"
                                  onClick={() => setEditorState({ bucket: activeBucket, field, isNew: false })}
                                  type="button"
                                >
                                  {copy.editField}
                                </button>
                                {canManage && canRemoveField(field, activeBucket) && (
                                  <button className="text-action is-danger" onClick={() => removeField(activeBucket, field.key)} type="button">
                                    {copy.removeField}
                                  </button>
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
            )}

            {activeBucket === "showcase" && (
              <section className="product-schema-panel product-schema-showcase">
                {(draft.showcaseSections || []).map((section) => (
                  <article className="product-schema-showcase-card" key={section.key}>
                    <header>
                      <div>
                        <strong>{fieldLabel({ label: section.title, key: section.key }, language)}</strong>
                        <code>{section.key}</code>
                      </div>
                      <span className={`product-schema-status ${section.enabled !== false ? "is-enabled" : "is-disabled"}`}>
                        {section.enabled !== false ? copy.enabled : copy.disabled}
                      </span>
                    </header>
                    <div className="product-schema-dialog-row">
                      <label>
                        {copy.sectionTitleEn}
                        <input
                          disabled={!canManage}
                          onChange={(event) => updateShowcaseSection(section.key, { title: { ...section.title, en: event.target.value } })}
                          value={section.title?.en || ""}
                        />
                      </label>
                      <label>
                        {copy.sectionTitleAr}
                        <input
                          dir="rtl"
                          disabled={!canManage}
                          onChange={(event) => updateShowcaseSection(section.key, { title: { ...section.title, ar: event.target.value } })}
                          value={section.title?.ar || ""}
                        />
                      </label>
                    </div>
                    <div className="product-schema-checkbox-row">
                      <label className="product-schema-checkbox">
                        <input
                          checked={section.enabled !== false}
                          disabled={!canManage}
                          onChange={(event) => updateShowcaseSection(section.key, { enabled: event.target.checked })}
                          type="checkbox"
                        />
                        {copy.enabled}
                      </label>
                      <label className="product-schema-checkbox">
                        <input
                          checked={section.storefrontVisible !== false}
                          disabled={!canManage}
                          onChange={(event) => updateShowcaseSection(section.key, { storefrontVisible: event.target.checked })}
                          type="checkbox"
                        />
                        {copy.storefront}
                      </label>
                      <label>
                        {copy.sortOrder}
                        <input
                          disabled={!canManage}
                          min="0"
                          onChange={(event) => updateShowcaseSection(section.key, { sortOrder: Number(event.target.value) || 0 })}
                          type="number"
                          value={section.sortOrder ?? 0}
                        />
                      </label>
                    </div>
                    <div className="product-schema-showcase-fields">
                      <header className="product-schema-showcase-fields-header">
                        <strong>{copy.sectionFields}</strong>
                        {canManage && (section.fields || []).length < BUCKET_LIMITS.showcaseField && (
                          <button
                            className="secondary-action"
                            onClick={() => setEditorState({
                              bucket: "showcaseField",
                              sectionKey: section.key,
                              field: emptyShowcaseField(),
                              isNew: true,
                            })}
                            type="button"
                          >
                            <Plus size={14} /> {copy.addField}
                          </button>
                        )}
                      </header>
                      {!sortedShowcaseFields(section.fields).length ? (
                        <div className="product-schema-empty is-compact">
                          <span>{copy.emptySectionFields}</span>
                        </div>
                      ) : (
                        <div className="admin-data-table-wrap">
                          <table className="admin-data-table admin-data-table--nested">
                            <thead>
                              <tr>
                                <th>{copy.key}</th>
                                <th>{language === "ar" ? copy.labelAr : copy.labelEn}</th>
                                <th>{copy.type}</th>
                                <th>{copy.sortOrder}</th>
                                <th>{copy.enabled}</th>
                                <th className="admin-data-table-actions">{copy.actions}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedShowcaseFields(section.fields).map((field, fieldIndex, fieldRows) => (
                                <tr className={field.enabled === false ? "is-disabled" : ""} key={field.key}>
                                  <td>
                                    <strong>{field.key}</strong>
                                    {isProtectedField(field) && (
                                      <div className="product-schema-badges">
                                        <span className="is-protected">{copy.protected}</span>
                                      </div>
                                    )}
                                  </td>
                                  <td>{fieldLabel(field, language)}</td>
                                  <td>{field.type}</td>
                                  <td>{field.sortOrder ?? 0}</td>
                                  <td>
                                    <span className={`product-schema-status ${field.enabled !== false ? "is-enabled" : "is-disabled"}`}>
                                      {field.enabled !== false ? copy.enabled : copy.disabled}
                                    </span>
                                  </td>
                                  <td className="admin-data-table-actions">
                                    <div className="product-schema-row-actions">
                                      {canManage && (
                                        <>
                                          <button
                                            aria-label={copy.moveUp}
                                            className="text-action"
                                            disabled={fieldIndex === 0}
                                            onClick={() => moveShowcaseField(section.key, field.key, "up")}
                                            type="button"
                                          >
                                            <ChevronUp size={14} />
                                          </button>
                                          <button
                                            aria-label={copy.moveDown}
                                            className="text-action"
                                            disabled={fieldIndex === fieldRows.length - 1}
                                            onClick={() => moveShowcaseField(section.key, field.key, "down")}
                                            type="button"
                                          >
                                            <ChevronDown size={14} />
                                          </button>
                                        </>
                                      )}
                                      <button
                                        className="text-action"
                                        onClick={() => setEditorState({
                                          bucket: "showcaseField",
                                          sectionKey: section.key,
                                          field,
                                          isNew: false,
                                        })}
                                        type="button"
                                      >
                                        {copy.editField}
                                      </button>
                                      {canManage && canRemoveField(field, "showcaseField") && (
                                        <button
                                          className="text-action is-danger"
                                          onClick={() => removeShowcaseField(section.key, field.key)}
                                          type="button"
                                        >
                                          {copy.removeField}
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </section>
            )}

            {activeBucket === "tabs" && (
              <section className="product-schema-panel">
                <div className="admin-data-table-wrap">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>{copy.key}</th>
                        <th>{language === "ar" ? copy.labelAr : copy.labelEn}</th>
                        <th>{copy.sortOrder}</th>
                        <th>{copy.enabled}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(draft.tabs || []).map((tab) => (
                        <tr key={tab.key}>
                          <td>
                            <strong>{tab.key}</strong>
                            {tab.protected && <span className="product-schema-badges is-protected">{copy.protected}</span>}
                          </td>
                          <td>{fieldLabel({ label: tab.label, key: tab.key }, language)}</td>
                          <td>
                            <input
                              disabled={!canManage}
                              min="0"
                              onChange={(event) => updateTab(tab.key, { sortOrder: Number(event.target.value) || 0 })}
                              type="number"
                              value={tab.sortOrder ?? 0}
                            />
                          </td>
                          <td>
                            <label className="product-schema-checkbox">
                              <input
                                checked={tab.enabled !== false}
                                disabled={!canManage || tab.key === "basic"}
                                onChange={(event) => updateTab(tab.key, { enabled: event.target.checked })}
                                type="checkbox"
                              />
                              {tab.enabled !== false ? copy.enabled : copy.disabled}
                            </label>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="product-schema-storefront-flags">
                  <label className="product-schema-checkbox">
                    <input
                      checked={draft.storefrontVisibility?.customFields !== false}
                      disabled={!canManage}
                      onChange={(event) => updateStorefrontVisibility("customFields", event.target.checked)}
                      type="checkbox"
                    />
                    {copy.customFieldsVisible}
                  </label>
                  <label className="product-schema-checkbox">
                    <input
                      checked={draft.storefrontVisibility?.customSections !== false}
                      disabled={!canManage}
                      onChange={(event) => updateStorefrontVisibility("customSections", event.target.checked)}
                      type="checkbox"
                    />
                    {copy.customSectionsVisible}
                  </label>
                </div>
              </section>
            )}
          </>
        )}

        {editorState && (
          <FieldEditorDialog
            bucket={editorState.bucket}
            copy={copy}
            field={editorState.field}
            isNew={editorState.isNew}
            language={language}
            onCancel={() => setEditorState(null)}
            onSave={(field) => {
              if (editorState.bucket === "showcaseField") {
                upsertShowcaseField(
                  editorState.sectionKey,
                  field,
                  editorState.isNew ? "" : editorState.field.key,
                );
                return;
              }
              upsertField(editorState.bucket, field, editorState.isNew ? "" : editorState.field.key);
            }}
            readOnly={!canManage}
          />
        )}
      </section>
    </AdminLayout>
  );
}
