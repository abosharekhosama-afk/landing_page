import React from "react";
import { MoreHorizontal, Plus, X } from "lucide-react";
import ProductPicker from "./ProductPicker.jsx";
import {
  createAutomaticDiscount,
  deactivateAutomaticDiscount,
  fetchAutomaticDiscounts,
  updateAutomaticDiscount,
} from "../utils/discountsApi.js";
import {
  createCoupon,
  deactivateCoupon,
  fetchCoupons,
  updateCoupon,
} from "../utils/couponsApi.js";
import { fetchProducts } from "../utils/productsApi.js";
import { hasPermission } from "../data/permissions.js";
import { isTenantOperator } from "../utils/roles.js";

function CatalogIllustration({ type = "empty" }) {
  return (
    <svg aria-hidden="true" className={`catalog-illustration catalog-illustration-${type}`} viewBox="0 0 320 210">
      <rect className="catalog-illustration-bg" height="168" rx="20" width="270" x="25" y="20" />
      <rect className="catalog-illustration-window" height="122" rx="10" width="214" x="54" y="44" />
      <path className="catalog-illustration-top" d="M54 58a14 14 0 0 1 14-14h186a14 14 0 0 1 14 14v13H54z" />
      <circle className="catalog-illustration-dot" cx="70" cy="57" r="3" />
      <circle className="catalog-illustration-dot" cx="80" cy="57" r="3" />
      {type === "coupon" ? (
        <>
          <path className="catalog-illustration-accent" d="M102 88h116v52H102a12 12 0 0 0 0-24 12 12 0 0 0 0-24z" />
          <path className="catalog-illustration-line" d="M159 92v43M180 103l-18 20M166 103h.1M180 123h.1" />
        </>
      ) : null}
      {type === "discount" ? (
        <>
          <circle className="catalog-illustration-accent" cx="161" cy="113" r="37" />
          <path className="catalog-illustration-line" d="M145 130l32-34M145 99h.1M177 127h.1" />
        </>
      ) : null}
    </svg>
  );
}

function CatalogEmpty({ action, actionLabel, description, onAction, title, type }) {
  return (
    <div className="catalog-empty-state" data-catalog-empty={type}>
      <CatalogIllustration type={type} />
      <h2>{title}</h2>
      <p>{description}</p>
      {action ? (
        <button className="admin-primary-button" onClick={onAction} type="button">
          <Plus size={16} />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="catalog-form-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

const emptyDiscount = {
  name: "",
  discountType: "percentage",
  discountValue: "",
  minQuantity: 1,
  productIds: [],
  startsAt: "",
  endsAt: "",
  roundFinalPrice: false,
  isActive: true,
};

const emptyCoupon = {
  code: "",
  name: "",
  adminNote: "",
  discountType: "percentage",
  discountValue: "",
  usageLimit: "",
  minOrderAmount: 0,
  startsAt: "",
  endsAt: "",
  isActive: true,
};

export function AutomaticDiscountsManager({ currentUser, language, labels, company }) {
  const ar = language === "ar";
  const canManage = isTenantOperator(currentUser?.role)
    || ["products.manage", "products.update", "products.create"].some((key) => hasPermission(currentUser, key));
  const [discounts, setDiscounts] = React.useState([]);
  const [products, setProducts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [draft, setDraft] = React.useState(null);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [discountRows, productRows] = await Promise.all([
        fetchAutomaticDiscounts(),
        fetchProducts(),
      ]);
      setDiscounts(Array.isArray(discountRows) ? discountRows : []);
      setProducts(Array.isArray(productRows) ? productRows : []);
    } catch (err) {
      setError(err.message || "Failed to load discounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load, company?.id]);

  async function saveDraft(event) {
    event.preventDefault();
    if (!canManage || !draft) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: draft.name,
        discountType: draft.discountType,
        discountValue: Number(draft.discountValue),
        minQuantity: Math.max(1, Number(draft.minQuantity) || 1),
        productIds: draft.productIds || [],
        categoryIds: [],
        brandIds: [],
        startsAt: draft.startsAt || null,
        endsAt: draft.endsAt || null,
        roundFinalPrice: draft.roundFinalPrice === true,
        isActive: draft.isActive !== false,
      };
      if (draft.id) await updateAutomaticDiscount(draft.id, payload);
      else await createAutomaticDiscount(payload);
      setDraft(null);
      await load();
    } catch (err) {
      setError(err.message || "Unable to save discount.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id) {
    if (!canManage) return;
    setError("");
    try {
      await deactivateAutomaticDiscount(id);
      await load();
    } catch (err) {
      setError(err.message || "Unable to deactivate discount.");
    }
  }

  return (
    <section className="catalog-data-card catalog-discount-card">
      <div className="catalog-list-controls">
        {canManage ? (
          <button className="admin-primary-button" onClick={() => setDraft({ ...emptyDiscount })} type="button">
            <Plus size={16} />
            {labels.createDiscount}
          </button>
        ) : null}
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p>{ar ? "جاري التحميل…" : "Loading…"}</p> : null}
      {!loading && discounts.length ? (
        <div className="admin-data-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>{labels.name}</th>
                <th>{labels.discount}</th>
                <th>{labels.type}</th>
                <th>{ar ? "الحد الأدنى للكمية" : "Min qty"}</th>
                <th>{labels.status}</th>
                <th className="admin-data-table-actions">{labels.actions}</th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((discount) => (
                <tr key={discount.id}>
                  <td><code className="admin-data-table-cell-clip" title={discount.name}>{discount.name}</code></td>
                  <td>{discount.discountValue}{discount.discountType === "percentage" ? "%" : ""}</td>
                  <td>{discount.discountType}</td>
                  <td>{discount.minQuantity}</td>
                  <td>
                    <span className="catalog-status">
                      {discount.isActive ? (ar ? "نشط" : "Active") : (ar ? "غير نشط" : "Inactive")}
                    </span>
                  </td>
                  <td className="admin-data-table-actions">
                    {canManage ? (
                      <>
                        <button className="catalog-icon-button" onClick={() => setDraft({
                          ...emptyDiscount,
                          ...discount,
                          discountValue: discount.discountValue,
                          startsAt: discount.startsAt ? String(discount.startsAt).slice(0, 16) : "",
                          endsAt: discount.endsAt ? String(discount.endsAt).slice(0, 16) : "",
                        })} type="button" aria-label={ar ? "تعديل" : "Edit"}>
                          <MoreHorizontal size={18} />
                        </button>
                        {discount.isActive ? (
                          <button className="text-action" onClick={() => handleDeactivate(discount.id)} type="button" aria-label={ar ? "إيقاف" : "Deactivate"}>
                            {ar ? "إيقاف" : "Deactivate"}
                          </button>
                        ) : null}
                      </>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {!loading && !discounts.length ? (
        <CatalogEmpty
          action={canManage}
          actionLabel={labels.createDiscount}
          description={ar ? "أنشئ خصماً تلقائياً يعتمد على الكمية أو المنتجات." : "Create an automatic discount by quantity and product targets."}
          onAction={() => setDraft({ ...emptyDiscount })}
          title={ar ? "لا توجد خصومات تلقائية" : "No automatic discounts"}
          type="discount"
        />
      ) : null}

      {draft ? (
        <div className="catalog-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setDraft(null)} role="presentation">
          <div className="catalog-placeholder-modal" role="dialog" aria-modal="true">
            <button aria-label="Close" className="catalog-modal-close" onClick={() => setDraft(null)} type="button">
              <X size={18} />
            </button>
            <h2>{draft.id ? (ar ? "تعديل الخصم" : "Edit discount") : labels.createDiscount}</h2>
            <form className="catalog-form-grid" onSubmit={saveDraft}>
              <Field label={labels.name}>
                <input required value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
              </Field>
              <Field label={labels.type}>
                <select value={draft.discountType} onChange={(e) => setDraft((d) => ({ ...d, discountType: e.target.value }))}>
                  <option value="percentage">percentage</option>
                  <option value="fixed">fixed</option>
                </select>
              </Field>
              <Field label={labels.discount}>
                <input required min="0" step="0.01" type="number" value={draft.discountValue} onChange={(e) => setDraft((d) => ({ ...d, discountValue: e.target.value }))} />
              </Field>
              <Field label={ar ? "الحد الأدنى للكمية" : "Min quantity"}>
                <input min="1" step="1" type="number" value={draft.minQuantity} onChange={(e) => setDraft((d) => ({ ...d, minQuantity: e.target.value }))} />
              </Field>
              <Field label={ar ? "يبدأ" : "Starts"}>
                <input type="datetime-local" value={draft.startsAt || ""} onChange={(e) => setDraft((d) => ({ ...d, startsAt: e.target.value }))} />
              </Field>
              <Field label={ar ? "ينتهي" : "Ends"}>
                <input type="datetime-local" value={draft.endsAt || ""} onChange={(e) => setDraft((d) => ({ ...d, endsAt: e.target.value }))} />
              </Field>
              <label className="catalog-form-field checkbox">
                <input type="checkbox" checked={draft.roundFinalPrice === true} onChange={(e) => setDraft((d) => ({ ...d, roundFinalPrice: e.target.checked }))} />
                <span>{ar ? "تقريب السعر النهائي" : "Round final price"}</span>
              </label>
              <label className="catalog-form-field checkbox">
                <input type="checkbox" checked={draft.isActive !== false} onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))} />
                <span>{labels.status}</span>
              </label>
              <div className="catalog-form-field full">
                <span>{ar ? "المنتجات (فارغ = الكل)" : "Products (empty = all)"}</span>
                <ProductPicker
                  products={products}
                  selectedIds={draft.productIds || []}
                  onChange={(ids) => setDraft((d) => ({ ...d, productIds: ids }))}
                  language={language}
                />
              </div>
              <div className="catalog-form-actions">
                <button className="secondary-action" onClick={() => setDraft(null)} type="button">{ar ? "إلغاء" : "Cancel"}</button>
                <button className="admin-primary-button" disabled={saving} type="submit">{saving ? (ar ? "جاري الحفظ…" : "Saving…") : (ar ? "حفظ" : "Save")}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function CouponsManager({ currentUser, language, labels }) {
  const ar = language === "ar";
  const canManage = isTenantOperator(currentUser?.role) || hasPermission(currentUser, "coupons.manage");
  const [coupons, setCoupons] = React.useState([]);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [draft, setDraft] = React.useState(null);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await fetchCoupons();
      setCoupons(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message || "Failed to load coupons.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (canManage) load();
    else {
      setLoading(false);
      setCoupons([]);
    }
  }, [canManage, load]);

  const rows = coupons.filter((coupon) =>
    [coupon.name, coupon.code, coupon.discountType, coupon.isActive ? "active" : "inactive"]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  async function saveDraft(event) {
    event.preventDefault();
    if (!canManage || !draft) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        code: draft.code,
        name: draft.name,
        adminNote: draft.adminNote,
        discountType: draft.discountType,
        discountValue: Number(draft.discountValue),
        usageLimit: draft.usageLimit === "" || draft.usageLimit == null ? null : Number(draft.usageLimit),
        minOrderAmount: Number(draft.minOrderAmount || 0),
        startsAt: draft.startsAt || null,
        endsAt: draft.endsAt || null,
        isActive: draft.isActive !== false,
      };
      if (draft.id) await updateCoupon(draft.id, payload);
      else await createCoupon(payload);
      setDraft(null);
      await load();
    } catch (err) {
      setError(err.message || "Unable to save coupon.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id) {
    if (!canManage) return;
    try {
      await deactivateCoupon(id);
      await load();
    } catch (err) {
      setError(err.message || "Unable to deactivate coupon.");
    }
  }

  if (!canManage) {
    return (
      <CatalogEmpty
        description={ar ? "تتطلب إدارة القسائم صلاحية coupons.manage." : "Coupon management requires the coupons.manage permission."}
        title={ar ? "الوصول مرفوض" : "Access denied"}
        type="coupon"
      />
    );
  }

  return (
    <section className="catalog-data-card catalog-discount-card">
      <div className="catalog-toolbar">
        <button className="admin-primary-button" onClick={() => setDraft({ ...emptyCoupon })} type="button">
          <Plus size={16} />
          {labels.newCoupon}
        </button>
        <label className="catalog-search">
          <input aria-label={labels.search} onChange={(e) => setQuery(e.target.value)} placeholder={labels.search} value={query} />
        </label>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p>{ar ? "جاري التحميل…" : "Loading…"}</p> : null}
      {!loading && rows.length ? (
        <div className="admin-data-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>{labels.name}</th>
                <th>{labels.discount}</th>
                <th>{labels.type}</th>
                <th>{labels.code}</th>
                <th>{labels.uses}</th>
                <th>{labels.status}</th>
                <th className="admin-data-table-actions">{labels.actions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((coupon) => (
                <tr key={coupon.id}>
                  <td><code className="admin-data-table-cell-clip" title={coupon.name || "—"}>{coupon.name || "—"}</code></td>
                  <td>{coupon.discountValue}{coupon.discountType === "percentage" ? "%" : ""}</td>
                  <td>{coupon.discountType}</td>
                  <td>{coupon.code}</td>
                  <td>{coupon.usedCount}{coupon.usageLimit != null ? ` / ${coupon.usageLimit}` : ""}</td>
                  <td>
                    <span className="catalog-status">
                      {coupon.isActive ? (ar ? "نشط" : "Active") : (ar ? "غير نشط" : "Inactive")}
                    </span>
                  </td>
                  <td className="admin-data-table-actions">
                    <button
                      className="catalog-icon-button"
                      onClick={() => setDraft({
                        ...emptyCoupon,
                        ...coupon,
                        usageLimit: coupon.usageLimit ?? "",
                        startsAt: coupon.startsAt ? String(coupon.startsAt).slice(0, 16) : "",
                        endsAt: coupon.endsAt ? String(coupon.endsAt).slice(0, 16) : "",
                      })}
                      type="button"
                      aria-label={ar ? "تعديل" : "Edit"}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    {coupon.isActive ? (
                      <button className="text-action" onClick={() => handleDeactivate(coupon.id)} type="button" aria-label={ar ? "إيقاف" : "Deactivate"}>
                        {ar ? "إيقاف" : "Deactivate"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {!loading && !rows.length ? (
        <CatalogEmpty
          action
          actionLabel={labels.newCoupon}
          description={ar ? "أنشئ أول قسيمة لهذه الشركة." : "Create your first coupon for this company."}
          onAction={() => setDraft({ ...emptyCoupon })}
          title={ar ? "لا توجد قسائم" : "No coupons yet"}
          type="coupon"
        />
      ) : null}

      {draft ? (
        <div className="catalog-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setDraft(null)} role="presentation">
          <div className="catalog-placeholder-modal" role="dialog" aria-modal="true">
            <button aria-label="Close" className="catalog-modal-close" onClick={() => setDraft(null)} type="button">
              <X size={18} />
            </button>
            <h2>{draft.id ? (ar ? "تعديل القسيمة" : "Edit coupon") : labels.newCoupon}</h2>
            <form className="catalog-form-grid" onSubmit={saveDraft}>
              <Field label={labels.code}>
                <input required value={draft.code} onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))} />
              </Field>
              <Field label={labels.name}>
                <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
              </Field>
              <Field label={labels.type}>
                <select value={draft.discountType} onChange={(e) => setDraft((d) => ({ ...d, discountType: e.target.value }))}>
                  <option value="percentage">percentage</option>
                  <option value="fixed">fixed</option>
                </select>
              </Field>
              <Field label={labels.discount}>
                <input required min="0" step="0.01" type="number" value={draft.discountValue} onChange={(e) => setDraft((d) => ({ ...d, discountValue: e.target.value }))} />
              </Field>
              <Field label={ar ? "الحد الأدنى للطلب" : "Min order"}>
                <input min="0" step="0.01" type="number" value={draft.minOrderAmount} onChange={(e) => setDraft((d) => ({ ...d, minOrderAmount: e.target.value }))} />
              </Field>
              <Field label={ar ? "حد الاستخدام" : "Usage limit"}>
                <input min="0" step="1" type="number" placeholder={ar ? "غير محدود" : "Unlimited"} value={draft.usageLimit} onChange={(e) => setDraft((d) => ({ ...d, usageLimit: e.target.value }))} />
              </Field>
              <Field label={ar ? "يبدأ" : "Starts"}>
                <input type="datetime-local" value={draft.startsAt || ""} onChange={(e) => setDraft((d) => ({ ...d, startsAt: e.target.value }))} />
              </Field>
              <Field label={ar ? "ينتهي" : "Ends"}>
                <input type="datetime-local" value={draft.endsAt || ""} onChange={(e) => setDraft((d) => ({ ...d, endsAt: e.target.value }))} />
              </Field>
              <Field label={ar ? "ملاحظة إدارية" : "Admin note"}>
                <input value={draft.adminNote || ""} onChange={(e) => setDraft((d) => ({ ...d, adminNote: e.target.value }))} />
              </Field>
              <label className="catalog-form-field checkbox">
                <input type="checkbox" checked={draft.isActive !== false} onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))} />
                <span>{labels.status}</span>
              </label>
              <div className="catalog-form-actions">
                <button className="secondary-action" onClick={() => setDraft(null)} type="button">{ar ? "إلغاء" : "Cancel"}</button>
                <button className="admin-primary-button" disabled={saving} type="submit">{saving ? (ar ? "جاري الحفظ…" : "Saving…") : (ar ? "حفظ" : "Save")}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
