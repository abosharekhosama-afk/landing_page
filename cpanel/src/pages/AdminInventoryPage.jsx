import React from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import { hasPermission } from "../data/permissions.js";
import { isCompanyAdmin } from "../utils/roles.js";
import { DEFAULT_INVENTORY_PAGE_SIZE, fetchInventory, fetchInventoryValuation, updateInventory } from "../utils/inventoryApi.js";
import { formatInventoryDate } from "../utils/inventoryDate.js";
import { canSeeInventoryCost } from "../utils/inventoryValuation.js";
import { resolveLowStockThreshold } from "../utils/lowStockThreshold.js";
import { formatCompanyCurrency } from "../utils/sales.js";
import { INVENTORY_PRODUCT_QUERY_KEY } from "../utils/inventoryProductQuery.js";

const text = (value, language) => value && typeof value === "object"
  ? value[language] || value.en || value.ar || ""
  : String(value || "");

const statusFor = (stock, threshold) => stock <= 0 ? "out" : stock <= threshold ? "low" : "in";
const labels = {
  en: { title: "Inventory", subtitle: "Track and update real product and variant stock.", total: "Total Products", in: "In Stock", low: "Low Stock", out: "Out of Stock", product: "Product", variant: "Variant", brand: "Brand", main: "Main Category", sub: "Subcategory", sku: "SKU", stock: "Current Stock", status: "Status", updated: "Last Updated", actions: "Actions", save: "Save", empty: "No inventory matches these filters.", all: "All", search: "Search product or SKU", variants: "variants", previous: "Previous", next: "Next", page: "Page", valuationTitle: "Inventory valuation", valuationSubtitle: "Financial view from real stock, cost, and selling prices.", costValue: "Cost value", retailValue: "Retail value", margin: "Potential margin", missingCost: "Missing cost", totalQty: "Total units", productsWithStock: "Products with stock", partial: "Partial valuation", costHidden: "Cost is hidden: enable cost price and grant products.cost_price.manage.", costStatus: "Cost status", hasCost: "Has cost", missingCostFilter: "Missing cost", quantity: "Qty", costUnit: "Cost / unit", retailUnit: "Retail / unit", costTotal: "Cost value", retailTotal: "Retail value", valuationEmpty: "No valuation rows match these filters.", prev: "Previous", of: "of" },
  ar: { title: "المخزون", subtitle: "تتبع وتحديث مخزون المنتجات والمتغيرات الفعلي.", total: "إجمالي المنتجات", in: "متوفر", low: "مخزون منخفض", out: "غير متوفر", product: "المنتج", variant: "المتغير", brand: "العلامة", main: "الفئة الرئيسية", sub: "الفئة الفرعية", sku: "SKU", stock: "المخزون الحالي", status: "الحالة", updated: "آخر تحديث", actions: "الإجراءات", save: "حفظ", empty: "لا توجد نتائج مطابقة.", all: "الكل", search: "ابحث عن منتج أو SKU", variants: "متغيرات", previous: "السابق", next: "التالي", page: "صفحة", valuationTitle: "تقييم المخزون", valuationSubtitle: "عرض مالي من المخزون والتكلفة وأسعار البيع الفعلية.", costValue: "قيمة التكلفة", retailValue: "قيمة البيع", margin: "هامش الربح المحتمل", missingCost: "تكلفة مفقودة", totalQty: "إجمالي الوحدات", productsWithStock: "منتجات بمخزون", partial: "تقييم جزئي", costHidden: "التكلفة مخفية: فعّل سعر التكلفة وامنح products.cost_price.manage.", costStatus: "حالة التكلفة", hasCost: "بتكلفة", missingCostFilter: "بدون تكلفة", quantity: "الكمية", costUnit: "التكلفة / وحدة", retailUnit: "البيع / وحدة", costTotal: "قيمة التكلفة", retailTotal: "قيمة البيع", valuationEmpty: "لا توجد صفوف تقييم مطابقة.", prev: "السابق", of: "من" },
};

export default function AdminInventoryPage({ brands = [], categories = [], company, currentUser, language = "en", ...layoutProps }) {
  const copy = labels[language] || labels.en;
  const lowStockThreshold = resolveLowStockThreshold(company);
  const [rows, setRows] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [summary, setSummary] = React.useState({ total: 0, in: 0, low: 0, out: 0 });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_INVENTORY_PAGE_SIZE);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [searchInput, setSearchInput] = React.useState(() => {
    try {
      const pending = sessionStorage.getItem(INVENTORY_PRODUCT_QUERY_KEY) || "";
      if (pending) sessionStorage.removeItem(INVENTORY_PRODUCT_QUERY_KEY);
      return pending;
    } catch {
      return "";
    }
  });
  const [query, setQuery] = React.useState(searchInput);
  const [brandId, setBrandId] = React.useState("");
  const [mainId, setMainId] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [costStatus, setCostStatus] = React.useState("ALL");
  const [valuation, setValuation] = React.useState(null);
  const [valuationLoading, setValuationLoading] = React.useState(false);
  const [valuationError, setValuationError] = React.useState("");
  const [valuationPage, setValuationPage] = React.useState(1);
  const [expanded, setExpanded] = React.useState(new Set());
  const [drafts, setDrafts] = React.useState({});
  const [saving, setSaving] = React.useState("");
  const [reloadToken, setReloadToken] = React.useState(0);
  const canSeeCost = canSeeInventoryCost(currentUser, company);
  const canManage = isCompanyAdmin(currentUser?.role) || ["inventory.manage", "products.manage", "products.update"].some((permission) => hasPermission(currentUser, permission));

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(searchInput);
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchInventory({
      page,
      limit: pageSize,
      q: query,
      brand: brandId || "all",
      mainCategory: mainId || "all",
      stock: status || "all",
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        setRows(Array.isArray(result.items) ? result.items : []);
        setTotal(Number(result.total) || 0);
        if (result.summary) {
          setSummary({
            total: Number(result.summary.total) || 0,
            in: Number(result.summary.in) || 0,
            low: Number(result.summary.low) || 0,
            out: Number(result.summary.out) || 0,
          });
        } else {
          setSummary({ total: Number(result.total) || 0, in: 0, low: 0, out: 0 });
        }
        if (Number(result.page) > 0 && Number(result.page) !== page) setPage(Number(result.page));
      })
      .catch((loadError) => {
        if (controller.signal.aborted) return;
        setRows([]);
        setTotal(0);
        setError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, pageSize, query, brandId, mainId, status, reloadToken, company?.id]);

  React.useEffect(() => { setValuationPage(1); }, [query, brandId, mainId, status, costStatus]);

  const loadValuation = React.useCallback(async (nextPage) => {
    setValuationLoading(true);
    setValuationError("");
    try {
      const result = await fetchInventoryValuation({
        q: query,
        brand: brandId || undefined,
        category: mainId || undefined,
        // Toolbar stock tone (in/low/out) — not product active/inactive.
        stock: status || undefined,
        costStatus,
        page: nextPage,
        limit: 25,
      });
      setValuation(result);
    } catch (valuationLoadError) {
      setValuationError(valuationLoadError.message);
    } finally {
      setValuationLoading(false);
    }
  }, [query, brandId, mainId, status, costStatus]);

  React.useEffect(() => { loadValuation(valuationPage); }, [loadValuation, valuationPage, company?.id, reloadToken]);

  const categoryById = React.useMemo(() => new Map(categories.map((item) => [String(item.id), item])), [categories]);
  const brandById = React.useMemo(() => new Map(brands.map((item) => [String(item.id), item])), [brands]);
  const mainCategories = React.useMemo(() => categories.filter((item) => !item.parentId && item.brandId), [categories]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const setDraft = (key, value) => setDrafts((current) => ({ ...current, [key]: value }));
  async function saveRow(row) {
    const variants = row.variants || [];
    const body = variants.length
      ? { variants: variants.map((variant) => ({ id: variant.id, stock: drafts[`${row.id}:${variant.id}`] ?? variant.stock })) }
      : { stock: drafts[row.id] ?? row.stock };
    setSaving(row.id);
    setError("");
    try {
      await updateInventory(row.id, body);
      setReloadToken((value) => value + 1);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving("");
    }
  }

  return (
    <AdminLayout
      activePage="admin-inventory"
      company={company}
      currentUser={currentUser}
      hideHeader
      language={language}
      {...layoutProps}
    >
      <div className="inventory-page" data-inventory-direction={language === "ar" ? "rtl" : "ltr"} dir={language === "ar" ? "rtl" : "ltr"}>
        <header className="catalog-page-header inventory-page-header">
          <div>
            <div className="catalog-title-line">
              <h1>{copy.title}</h1>
              <span>{summary.total}</span>
            </div>
            <p>{copy.subtitle}</p>
          </div>
        </header>
        <section className="inventory-summary" aria-label={copy.title}>
          {[
            [copy.total, summary.total, "total"],
            [copy.in, summary.in, "in"],
            [copy.low, summary.low, "low"],
            [copy.out, summary.out, "out"],
          ].map(([label, value, tone]) => (
            <article className={`inventory-summary__card is-${tone}`} key={tone}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </section>
        <section className="inventory-panel admin-panel-card">
          <div className="inventory-toolbar">
            <label className="inventory-search">
              <Search size={18} />
              <input aria-label={copy.search} placeholder={copy.search} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
            </label>
            <select aria-label={copy.brand} value={brandId} onChange={(event) => { setBrandId(event.target.value); setMainId(""); setPage(1); }}>
              <option value="">{copy.all} {copy.brand}</option>
              {brands.map((brand) => <option value={brand.id} key={brand.id}>{text(brand.name, language)}</option>)}
            </select>
            <select aria-label={copy.main} value={mainId} onChange={(event) => { setMainId(event.target.value); setPage(1); }}>
              <option value="">{copy.all} {copy.main}</option>
              {mainCategories.filter((item) => !brandId || String(item.brandId) === brandId).map((item) => (
                <option value={item.id} key={item.id}>{text(item.name, language)}</option>
              ))}
            </select>
            <select aria-label={copy.status} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="">{copy.all} {copy.status}</option>
              <option value="in">{copy.in}</option>
              <option value="low">{copy.low}</option>
              <option value="out">{copy.out}</option>
            </select>
            <select aria-label={copy.costStatus} value={costStatus} onChange={(event) => setCostStatus(event.target.value)}>
              <option value="ALL">{copy.all} {copy.costStatus}</option>
              <option value="HAS_COST">{copy.hasCost}</option>
              <option value="MISSING_COST">{copy.missingCostFilter}</option>
            </select>
            <select aria-label={copy.page} value={pageSize} onChange={(event) => { setPage(1); setPageSize(Number(event.target.value) || DEFAULT_INVENTORY_PAGE_SIZE); }}>
              {[25, 50, 100].map((size) => <option key={size} value={size}>{size} / page</option>)}
            </select>
          </div>
          {error && <div className="inventory-error" role="alert">{error}</div>}
          <div className="admin-data-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>{copy.product}</th>
                  <th>{copy.brand}</th>
                  <th>{copy.main}</th>
                  <th>{copy.sub}</th>
                  <th>{copy.sku}</th>
                  <th>{copy.stock}</th>
                  <th>{copy.status}</th>
                  <th>{copy.updated}</th>
                  <th className="admin-data-table-actions">{copy.actions}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9">Loading…</td></tr>
                ) : rows.length ? rows.map((row) => {
                  const hasVariants = row.variants?.length > 0;
                  const open = expanded.has(row.id);
                  const tone = statusFor(row.stock, lowStockThreshold);
                  return (
                    <React.Fragment key={row.id}>
                      <tr>
                        <td>
                          <button
                            aria-label={text(row.name, language)}
                            className="inventory-product"
                            disabled={!hasVariants}
                            onClick={() => setExpanded((current) => {
                              const next = new Set(current);
                              next.has(row.id) ? next.delete(row.id) : next.add(row.id);
                              return next;
                            })}
                            type="button"
                          >
                            {hasVariants ? (open ? <ChevronDown size={17} /> : <ChevronRight size={17} />) : <span className="inventory-product__spacer" />}
                            <span>
                              <strong className="admin-data-table-cell-clip" title={text(row.name, language)}>{text(row.name, language)}</strong>
                              {hasVariants && <small>{row.variants.length} {copy.variants}</small>}
                            </span>
                          </button>
                        </td>
                        <td>{text(brandById.get(String(row.brandId))?.name, language) || "—"}</td>
                        <td>{text(categoryById.get(String(row.mainCategoryId))?.name, language) || "—"}</td>
                        <td>{text(categoryById.get(String(row.subcategoryId))?.name, language) || "—"}</td>
                        <td>{row.sku || "—"}</td>
                        <td>
                          {hasVariants
                            ? row.stock
                            : <input className="inventory-stock-input" min="0" type="number" disabled={!canManage} value={drafts[row.id] ?? row.stock} onChange={(event) => setDraft(row.id, event.target.value)} />}
                        </td>
                        <td><span className={`inventory-status is-${tone}`}>{copy[tone]}</span></td>
                        <td>{formatInventoryDate(row.updatedAt, language)}</td>
                        <td className="admin-data-table-actions">
                          <button aria-label={copy.save} className="admin-primary-button inventory-save" disabled={!canManage || saving === row.id} onClick={() => saveRow(row)} type="button">
                            {saving === row.id ? "…" : copy.save}
                          </button>
                        </td>
                      </tr>
                      {open && row.variants.map((variant) => {
                        const key = `${row.id}:${variant.id}`;
                        const variantTone = statusFor(Number(drafts[key] ?? variant.stock), lowStockThreshold);
                        return (
                          <tr className="inventory-variant-row" key={variant.id}>
                            <td colSpan="4">
                              <span>
                                {text(variant.colorName, language)}
                                {text(variant.size, language) ? ` · ${text(variant.size, language)}` : ""}
                              </span>
                            </td>
                            <td>{variant.sku || row.sku || "—"}</td>
                            <td>
                              <input className="inventory-stock-input" min="0" type="number" disabled={!canManage} value={drafts[key] ?? variant.stock} onChange={(event) => setDraft(key, event.target.value)} />
                            </td>
                            <td><span className={`inventory-status is-${variantTone}`}>{copy[variantTone]}</span></td>
                            <td colSpan="2" />
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                }) : (
                  <tr><td colSpan="9">{copy.empty}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="admin-table-pagination inventory-pagination" data-inventory-pagination>
            <span>{total === 0 ? copy.empty : `${from}–${to} / ${total}`}</span>
            <div className="row-actions">
              <button className="secondary-action" disabled={loading || page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">{copy.previous}</button>
              <span>{copy.page} {page} / {totalPages}</span>
              <button className="secondary-action" disabled={loading || page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} type="button">{copy.next}</button>
            </div>
          </footer>
        </section>

        <section className="inventory-panel admin-panel-card" aria-label={copy.valuationTitle}>
          <div className="inventory-valuation-head">
            <div>
              <h2>{copy.valuationTitle}</h2>
              <p>{copy.valuationSubtitle}</p>
            </div>
            {valuation?.summary && valuation.summary.costVisible === false && <p className="inventory-valuation-notice">{copy.costHidden}</p>}
            {valuation?.summary && valuation.summary.costVisible !== false && valuation.summary.valuationComplete === false && (
              <p className="inventory-valuation-notice">{copy.partial}: {valuation.summary.missingCostCount} {copy.missingCost}</p>
            )}
          </div>
          {valuationError && <div className="inventory-error" role="alert">{valuationError}</div>}
          <div className="inventory-summary" aria-label={copy.valuationTitle}>
            <article className="inventory-summary__card"><span>{copy.totalQty}</span><strong>{valuation?.summary?.totalQuantity ?? "—"}</strong></article>
            <article className="inventory-summary__card"><span>{copy.productsWithStock}</span><strong>{valuation?.summary?.productsWithStock ?? "—"}</strong></article>
            {canSeeCost && <article className="inventory-summary__card"><span>{copy.costValue}</span><strong>{valuation?.summary?.costValue == null ? "—" : formatCompanyCurrency(valuation.summary.costValue, company, language)}</strong></article>}
            <article className="inventory-summary__card"><span>{copy.retailValue}</span><strong>{valuation?.summary?.retailValue == null ? "—" : formatCompanyCurrency(valuation.summary.retailValue, company, language)}</strong></article>
            {canSeeCost && <article className="inventory-summary__card"><span>{copy.margin}</span><strong>{valuation?.summary?.potentialMargin == null ? "—" : formatCompanyCurrency(valuation.summary.potentialMargin, company, language)}</strong></article>}
            {canSeeCost && <article className="inventory-summary__card"><span>{copy.missingCost}</span><strong>{valuation?.summary?.missingCostCount ?? "—"}</strong></article>}
          </div>
          <div className="admin-data-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>{copy.product}</th>
                  <th>{copy.variant}</th>
                  <th>{copy.sku}</th>
                  <th>{copy.brand}</th>
                  <th>{copy.main}</th>
                  <th>{copy.quantity}</th>
                  {canSeeCost && <th>{copy.costUnit}</th>}
                  <th>{copy.retailUnit}</th>
                  {canSeeCost && <th>{copy.costTotal}</th>}
                  <th>{copy.retailTotal}</th>
                  {canSeeCost && <th>{copy.margin}</th>}
                </tr>
              </thead>
              <tbody>
                {valuationLoading ? (
                  <tr><td colSpan={canSeeCost ? 11 : 8}>Loading…</td></tr>
                ) : (valuation?.items?.length ? valuation.items.map((item) => (
                  <tr key={`${item.productId}:${item.variantId || "plain"}`}>
                    <td><span className="admin-data-table-cell-clip" title={text(item.productName, language)}>{text(item.productName, language) || item.slug}</span></td>
                    <td>{item.variantLabel || "—"}</td>
                    <td>{item.sku || "—"}</td>
                    <td>{text(brandById.get(String(item.brandId))?.name, language) || "—"}</td>
                    <td>{text(categoryById.get(String(item.mainCategoryId))?.name, language) || "—"}</td>
                    <td>{item.quantity}</td>
                    {canSeeCost && <td>{item.costPerUnit == null ? "—" : formatCompanyCurrency(item.costPerUnit, company, language)}</td>}
                    <td>{item.retailPerUnit == null ? "—" : formatCompanyCurrency(item.retailPerUnit, company, language)}</td>
                    {canSeeCost && <td>{item.costValue == null ? "—" : formatCompanyCurrency(item.costValue, company, language)}</td>}
                    <td>{item.retailValue == null ? "—" : formatCompanyCurrency(item.retailValue, company, language)}</td>
                    {canSeeCost && <td>{item.potentialMargin == null ? "—" : formatCompanyCurrency(item.potentialMargin, company, language)}</td>}
                  </tr>
                )) : (
                  <tr><td colSpan={canSeeCost ? 11 : 8}>{copy.valuationEmpty}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {valuation && valuation.totalPages > 1 && (
            <div className="inventory-valuation-pager">
              <span>{copy.page} {valuation.page} {copy.of} {valuation.totalPages}</span>
              <button className="admin-primary-button" disabled={valuation.page <= 1} onClick={() => setValuationPage((value) => Math.max(1, value - 1))} type="button">{copy.prev}</button>
              <button className="admin-primary-button" disabled={valuation.page >= valuation.totalPages} onClick={() => setValuationPage((value) => value + 1)} type="button">{copy.next}</button>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
