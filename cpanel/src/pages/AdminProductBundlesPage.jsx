import React from "react";
import { LoaderCircle, PackageOpen, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import { hasPermission } from "../data/permissions.js";
import { canAccessAdminPage, isCompanyAdmin } from "../utils/roles.js";
import {
  createAdminBundle,
  deactivateAdminBundle,
  fetchAdminBundles,
  updateAdminBundle,
} from "../utils/bundlesApi.js";

const PRICING_MODES = ["auto_sum", "percent_discount", "fixed_discount", "fixed_price"];

function pricingModeLabel(mode, ar) {
  const labels = {
    auto_sum: ar ? "مجموع المكونات" : "Sum of components",
    percent_discount: ar ? "خصم نسبة مئوية" : "Percentage discount",
    fixed_discount: ar ? "خصم مبلغ ثابت" : "Fixed amount discount",
    fixed_price: ar ? "سعر ثابت" : "Fixed price",
  };
  return labels[mode] || mode;
}

function productLabel(product, language) {
  if (!product) return "";
  return product.name?.[language] || product.name?.en || product.name || product.slug || product.id;
}

function variantLabel(variant) {
  if (!variant) return "";
  return variant.size || variant.colorName || variant.color_name || variant.id;
}

function emptyItem() {
  return { productId: "", variantId: "", quantity: 1 };
}

function emptyDraft() {
  return {
    id: "",
    name: "",
    nameAr: "",
    slug: "",
    description: "",
    pricingMode: "auto_sum",
    discountValue: 0,
    fixedPrice: "",
    imageUrl: "",
    isActive: true,
    items: [emptyItem()],
  };
}

function draftFromBundle(bundle) {
  return {
    id: bundle.id || "",
    name: bundle.name || "",
    nameAr: bundle.nameAr || "",
    slug: bundle.slug || "",
    description: bundle.description || "",
    pricingMode: bundle.pricingMode || "auto_sum",
    discountValue: Number(bundle.discountValue ?? 0),
    fixedPrice: bundle.fixedPrice == null ? "" : String(bundle.fixedPrice),
    imageUrl: bundle.imageUrl || "",
    isActive: bundle.isActive !== false,
    items: (bundle.items || []).map((item) => ({
      productId: item.productId || "",
      variantId: item.variantId || "",
      quantity: Number(item.quantity) || 1,
    })),
  };
}

function payloadFromDraft(draft) {
  return {
    name: draft.name.trim(),
    nameAr: draft.nameAr.trim(),
    slug: draft.slug.trim().toLowerCase(),
    description: draft.description.trim(),
    pricingMode: draft.pricingMode,
    discountValue: Number(draft.discountValue) || 0,
    fixedPrice: draft.fixedPrice === "" ? null : Number(draft.fixedPrice),
    imageUrl: draft.imageUrl.trim(),
    isActive: draft.isActive,
    items: draft.items
      .filter((item) => item.productId)
      .map((item) => ({
        productId: item.productId,
        variantId: item.variantId || "",
        quantity: Math.max(1, Number(item.quantity) || 1),
      })),
  };
}

function computePreview(draft, products) {
  const resolvedItems = (draft.items || [])
    .filter((item) => item.productId)
    .map((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      const variants = product?.variants || [];
      const variant = variants.find((entry) => entry.id === item.variantId) || variants[0];
      const unitPrice = Number(variant?.price ?? product?.price ?? 0) || 0;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      return { product, variant, unitPrice, quantity, lineTotal: unitPrice * quantity };
    });
  const subtotal = resolvedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  let finalPrice = subtotal;
  if (draft.pricingMode === "percent_discount") {
    finalPrice = subtotal * (1 - Math.min(100, Math.max(0, Number(draft.discountValue) || 0)) / 100);
  } else if (draft.pricingMode === "fixed_discount") {
    finalPrice = Math.max(0, subtotal - (Number(draft.discountValue) || 0));
  } else if (draft.pricingMode === "fixed_price") {
    finalPrice = Math.max(0, Number(draft.fixedPrice) || 0);
  }
  return {
    subtotal,
    finalPrice,
    savings: Math.max(0, subtotal - finalPrice),
    itemCount: resolvedItems.length,
  };
}

export default function AdminProductBundlesPage({
  company,
  currentUser,
  language = "en",
  products = [],
  ...layoutProps
}) {
  const ar = language === "ar";
  const dir = ar ? "rtl" : "ltr";
  const canView = canAccessAdminPage(currentUser, "admin-product-bundles");
  const canManage =
    isCompanyAdmin(currentUser?.role) ||
    hasPermission(currentUser, "products.manage") ||
    hasPermission(currentUser, "products.update") ||
    hasPermission(currentUser, "products.create");
  const [bundles, setBundles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [noticeError, setNoticeError] = React.useState(false);
  const [draft, setDraft] = React.useState(null);
  const [apiPricing, setApiPricing] = React.useState(null);
  const requestRef = React.useRef(0);

  const load = React.useCallback(() => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError("");
    fetchAdminBundles()
      .then((data) => {
        if (requestRef.current !== requestId) return;
        setBundles(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((requestError) => {
        if (requestRef.current !== requestId) return;
        setBundles([]);
        setError(requestError?.message || (ar ? "تعذر تحميل الحزم." : "Unable to load bundles."));
        setLoading(false);
      });
  }, [ar]);

  React.useEffect(() => {
    if (!canView) return undefined;
    load();
    return () => { requestRef.current += 1; };
  }, [canView, company?.id, load]);

  function showNotice(text, isError = false) {
    setNotice(text);
    setNoticeError(isError);
  }

  function startCreate() {
    setDraft(emptyDraft());
    setApiPricing(null);
    setError("");
  }

  function startEdit(bundle) {
    setDraft(draftFromBundle(bundle));
    setApiPricing({
      subtotal: bundle.subtotal,
      finalPrice: bundle.finalPrice,
      savings: bundle.savings,
      available: bundle.available,
    });
    setError("");
  }

  function cancelEdit() {
    setDraft(null);
    setApiPricing(null);
    setError("");
  }

  function updateDraft(patch) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function updateItem(index, patch) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function addItem() {
    setDraft((current) => ({ ...current, items: [...current.items, emptyItem()] }));
  }

  function removeItem(index) {
    setDraft((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!canManage || !draft) return;
    if (!draft.name.trim()) {
      setError(ar ? "اسم الحزمة مطلوب." : "Bundle name is required.");
      return;
    }
    if (!draft.items.some((item) => item.productId)) {
      setError(ar ? "أضف منتجًا واحدًا على الأقل للحزمة." : "Add at least one product to the bundle.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = payloadFromDraft(draft);
      const saved = draft.id
        ? await updateAdminBundle({ ...payload, id: draft.id })
        : await createAdminBundle(payload);
      setDraft(draftFromBundle(saved));
      setApiPricing({
        subtotal: saved.subtotal,
        finalPrice: saved.finalPrice,
        savings: saved.savings,
        available: saved.available,
      });
      showNotice(
        draft.id
          ? (ar ? "تم تحديث الحزمة." : "Bundle updated.")
          : (ar ? "تم إنشاء الحزمة." : "Bundle created."),
      );
      await load();
    } catch (requestError) {
      setError(requestError?.message || (ar ? "تعذر حفظ الحزمة." : "Unable to save bundle."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(bundle) {
    if (!window.confirm(ar ? "هل تريد إلغاء تفعيل هذه الحزمة؟" : "Deactivate this bundle?")) return;
    try {
      await deactivateAdminBundle(bundle.id);
      showNotice(ar ? "تم إلغاء تفعيل الحزمة." : "Bundle deactivated.");
      await load();
    } catch (requestError) {
      setError(requestError?.message || (ar ? "تعذر إلغاء تفعيل الحزمة." : "Unable to deactivate bundle."));
    }
  }

  if (!canView) {
    return (
      <AdminLayout
        activePage="admin-product-bundles"
        company={company}
        currentUser={currentUser}
        hideHeader
        language={language}
        {...layoutProps}
      >
        <div className="product-schema-forbidden" dir={dir}>
          <strong>
            {ar ? "ليس لديك صلاحية الوصول إلى هذه الصفحة." : "You do not have permission to access this page."}
          </strong>
        </div>
      </AdminLayout>
    );
  }

  const preview = draft ? computePreview(draft, products) : null;

  return (
    <AdminLayout
      activePage="admin-product-bundles"
      company={company}
      currentUser={currentUser}
      hideHeader
      language={language}
      {...layoutProps}
    >
      <section className="product-schema-page product-bundles-page" dir={dir}>
        <header className="product-schema-header">
          <div>
            <h1>{ar ? "حزم المنتجات" : "Product Bundles"}</h1>
            <p>
              {ar
                ? "أنشئ حزمًا من منتجات متعددة مع تسعير مخصص."
                : "Create bundles of multiple products with custom pricing."}
            </p>
          </div>
          <div className="product-schema-header-actions">
            <button className="secondary-action" disabled={loading} onClick={load} type="button">
              <RefreshCw size={16} /> {ar ? "إعادة تحميل" : "Reload"}
            </button>
            {canManage && !draft && (
              <button className="admin-primary-button" onClick={startCreate} type="button">
                <Plus size={16} /> {ar ? "حزمة جديدة" : "New bundle"}
              </button>
            )}
          </div>
        </header>

        {error ? <div className="product-schema-error" role="alert">{error}</div> : null}
        {notice ? (
          <div className={`product-schema-banner ${noticeError ? "is-error" : "is-success"}`} role="status">
            {notice}
          </div>
        ) : null}

        {loading && (
          <div className="product-schema-loading">
            <LoaderCircle className="spin" size={28} />
            <span>{ar ? "جارٍ التحميل…" : "Loading…"}</span>
          </div>
        )}

        {!loading && !draft && (
          <div className="admin-data-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>{ar ? "الاسم" : "Name"}</th>
                  <th>{ar ? "الرابط" : "Slug"}</th>
                  <th>{ar ? "التسعير" : "Pricing"}</th>
                  <th>{ar ? "السعر النهائي" : "Final price"}</th>
                  <th>{ar ? "التوفير" : "Savings"}</th>
                  <th>{ar ? "الحالة" : "Status"}</th>
                  <th className="admin-data-table-actions">{ar ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {bundles.map((bundle) => (
                  <tr key={bundle.id}>
                    <td><strong>{bundle.name}</strong></td>
                    <td><code>{bundle.slug}</code></td>
                    <td>{pricingModeLabel(bundle.pricingMode, ar)}</td>
                    <td>{bundle.finalPrice}</td>
                    <td>{bundle.savings}</td>
                    <td>
                      <span className={`product-schema-status ${bundle.isActive !== false ? "is-enabled" : "is-disabled"}`}>
                        {bundle.isActive !== false ? (ar ? "مفعّل" : "Active") : (ar ? "معطّل" : "Inactive")}
                      </span>
                    </td>
                    <td className="admin-data-table-actions">
                      <div className="product-schema-row-actions">
                        <button className="text-action" onClick={() => startEdit(bundle)} type="button">
                          {ar ? "تعديل" : "Edit"}
                        </button>
                        {canManage && bundle.isActive !== false && (
                          <button className="text-action is-danger" onClick={() => handleDeactivate(bundle)} type="button">
                            <Trash2 size={14} /> {ar ? "إلغاء التفعيل" : "Deactivate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!bundles.length && (
              <div className="product-schema-empty">
                <strong>{ar ? "لا توجد حزم بعد" : "No bundles yet"}</strong>
                <span>{ar ? "أنشئ أول حزمة منتجات." : "Create your first product bundle."}</span>
              </div>
            )}
          </div>
        )}

        {!loading && draft && (
          <form className="admin-form admin-stack-form product-bundle-form" onSubmit={handleSave}>
            <fieldset disabled={saving || !canManage}>
              <h3>{ar ? "التفاصيل الأساسية" : "Basic details"}</h3>
              <div className="product-schema-dialog-row">
                <label>
                  {ar ? "الاسم (إنجليزي)" : "Name (English)"}
                  <input
                    onChange={(event) => updateDraft({ name: event.target.value })}
                    value={draft.name}
                  />
                </label>
                <label>
                  {ar ? "الاسم (عربي)" : "Name (Arabic)"}
                  <input
                    dir="rtl"
                    onChange={(event) => updateDraft({ nameAr: event.target.value })}
                    value={draft.nameAr}
                  />
                </label>
              </div>
              <div className="product-schema-dialog-row">
                <label>
                  {ar ? "الرابط (Slug)" : "Slug"}
                  <input
                    onChange={(event) => updateDraft({ slug: event.target.value })}
                    placeholder="my-bundle"
                    value={draft.slug}
                  />
                </label>
                <label>
                  {ar ? "رابط الصورة" : "Image URL"}
                  <input
                    onChange={(event) => updateDraft({ imageUrl: event.target.value })}
                    value={draft.imageUrl}
                  />
                </label>
              </div>
              <label>
                {ar ? "الوصف" : "Description"}
                <textarea
                  onChange={(event) => updateDraft({ description: event.target.value })}
                  rows={3}
                  value={draft.description}
                />
              </label>

              <h3>{ar ? "التسعير" : "Pricing"}</h3>
              <div className="product-schema-dialog-row">
                <label>
                  {ar ? "طريقة التسعير" : "Pricing mode"}
                  <select
                    onChange={(event) => updateDraft({ pricingMode: event.target.value })}
                    value={draft.pricingMode}
                  >
                    {PRICING_MODES.map((mode) => (
                      <option key={mode} value={mode}>{pricingModeLabel(mode, ar)}</option>
                    ))}
                  </select>
                </label>
                {["percent_discount", "fixed_discount"].includes(draft.pricingMode) && (
                  <label>
                    {draft.pricingMode === "percent_discount"
                      ? (ar ? "نسبة الخصم (%)" : "Discount percent (%)")
                      : (ar ? "مبلغ الخصم" : "Discount amount")}
                    <input
                      max={draft.pricingMode === "percent_discount" ? 100 : undefined}
                      min="0"
                      onChange={(event) => updateDraft({ discountValue: event.target.value })}
                      step="any"
                      type="number"
                      value={draft.discountValue}
                    />
                  </label>
                )}
                {draft.pricingMode === "fixed_price" && (
                  <label>
                    {ar ? "السعر الثابت" : "Fixed price"}
                    <input
                      min="0"
                      onChange={(event) => updateDraft({ fixedPrice: event.target.value })}
                      step="any"
                      type="number"
                      value={draft.fixedPrice}
                    />
                  </label>
                )}
              </div>
              <div className="product-schema-checkbox-row">
                <label className="product-schema-checkbox">
                  <input
                    checked={draft.isActive}
                    onChange={(event) => updateDraft({ isActive: event.target.checked })}
                    type="checkbox"
                  />
                  {ar ? "الحزمة مفعّلة" : "Bundle is active"}
                </label>
              </div>

              <h3>{ar ? "المكونات" : "Components"}</h3>
              {draft.items.map((item, index) => {
                const product = products.find((entry) => entry.id === item.productId);
                const variants = product?.variants || [];
                return (
                  <div className="product-bundle-item-row" key={`${index}-${item.productId}`}>
                    <label>
                      {ar ? "المنتج" : "Product"}
                      <select
                        onChange={(event) => updateItem(index, { productId: event.target.value, variantId: "" })}
                        value={item.productId}
                      >
                        <option value="">{ar ? "اختر منتجًا…" : "Select a product…"}</option>
                        {products.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {productLabel(entry, language)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {ar ? "المقاس / النوع" : "Variant"}
                      <select
                        disabled={!variants.length}
                        onChange={(event) => updateItem(index, { variantId: event.target.value })}
                        value={item.variantId}
                      >
                        <option value="">
                          {variants.length
                            ? (ar ? "اختر مقاسًا…" : "Select a variant…")
                            : (ar ? "بدون مقاسات" : "No variants")}
                        </option>
                        {variants.map((variant) => (
                          <option key={variant.id} value={variant.id}>
                            {variantLabel(variant)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {ar ? "الكمية" : "Quantity"}
                      <input
                        min="1"
                        onChange={(event) => updateItem(index, { quantity: event.target.value })}
                        type="number"
                        value={item.quantity}
                      />
                    </label>
                    <button
                      className="text-action is-danger"
                      disabled={draft.items.length <= 1}
                      onClick={() => removeItem(index)}
                      type="button"
                    >
                      <X size={14} /> {ar ? "إزالة" : "Remove"}
                    </button>
                  </div>
                );
              })}
              <button className="secondary-action" onClick={addItem} type="button">
                <Plus size={14} /> {ar ? "إضافة منتج" : "Add product"}
              </button>
            </fieldset>

            {preview && (
              <>
              <h3>{ar ? "الملخص (تقديري)" : "Summary (estimate)"}</h3>
              <div className="product-schema-summary">
                <article>
                  <span>{ar ? "المجموع الفرعي (تقديري)" : "Subtotal (estimate)"}</span>
                  <strong>{preview.subtotal}</strong>
                </article>
                <article>
                  <span>{ar ? "السعر النهائي (تقديري)" : "Final price (estimate)"}</span>
                  <strong>{preview.finalPrice}</strong>
                </article>
                <article>
                  <span>{ar ? "التوفير (تقديري)" : "Savings (estimate)"}</span>
                  <strong>{preview.savings}</strong>
                </article>
              </div>
              </>
            )}
            {apiPricing && (
              <>
              <h3>{ar ? "الملخص (من الخادم)" : "Summary (server)"}</h3>
              <div className="product-schema-summary">
                <article>
                  <span>{ar ? "المجموع الفرعي (من الخادم)" : "Subtotal (server)"}</span>
                  <strong>{apiPricing.subtotal}</strong>
                </article>
                <article>
                  <span>{ar ? "السعر النهائي (من الخادم)" : "Final price (server)"}</span>
                  <strong>{apiPricing.finalPrice}</strong>
                </article>
                <article>
                  <span>{ar ? "التوفير (من الخادم)" : "Savings (server)"}</span>
                  <strong>{apiPricing.savings}</strong>
                </article>
                <article>
                  <span>{ar ? "التوفر" : "Availability"}</span>
                  <strong>
                    {apiPricing.available ? (ar ? "متاح" : "Available") : (ar ? "غير متاح" : "Unavailable")}
                  </strong>
                </article>
              </div>
              </>
            )}

            <div className="form-actions">
              <button className="secondary-action" disabled={saving} onClick={cancelEdit} type="button">
                <X size={16} /> {ar ? "إلغاء" : "Cancel"}
              </button>
              {canManage && (
                <button className="admin-primary-button" disabled={saving} type="submit">
                  {saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
                  {draft.id ? (ar ? "حفظ التغييرات" : "Save changes") : (ar ? "إنشاء الحزمة" : "Create bundle")}
                </button>
              )}
            </div>
          </form>
        )}
      </section>
    </AdminLayout>
  );
}