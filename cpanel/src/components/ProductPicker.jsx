import React from "react";
import { Search, X } from "lucide-react";
import AdminTable from "./AdminTable.jsx";

function productLabel(product) {
  const name = product?.name;
  if (typeof name === "string") return name;
  if (name && typeof name === "object") return name.en || name.ar || product.slug || product.id;
  return product?.slug || product?.id || "";
}

function productSku(product) {
  return String(product?.sku || "").trim();
}

/**
 * Multi-select product picker for Related Products / FBT.
 * Caller supplies a tenant-scoped, non-trashed catalog; this component
 * additionally filters inactive products and excluded IDs.
 */
export default function ProductPicker({
  products = [],
  selectedIds = [],
  excludeIds = [],
  onChange,
  disabled = false,
  language = "en",
  loading = false,
  error = "",
  emptyLabel = "",
  searchPlaceholder = "",
}) {
  const ar = language === "ar";
  const [query, setQuery] = React.useState("");

  const excludeSet = React.useMemo(
    () => new Set((excludeIds || []).map((id) => String(id))),
    [excludeIds],
  );
  const selectedSet = React.useMemo(
    () => new Set((selectedIds || []).map((id) => String(id))),
    [selectedIds],
  );

  const selectable = React.useMemo(() => {
    return (products || []).filter((product) => {
      if (!product?.id) return false;
      if (excludeSet.has(String(product.id))) return false;
      if (product.isActive === false || product.active === false) return false;
      if (product.deletedAt || product.deleted_at) return false;
      return true;
    });
  }, [products, excludeSet]);

  const selectedProducts = React.useMemo(() => {
    const byId = new Map(selectable.map((product) => [String(product.id), product]));
    // Keep selected order; include already-selected even if later filtered out of search.
    const fromCatalog = new Map((products || []).map((product) => [String(product.id), product]));
    return (selectedIds || [])
      .map((id) => byId.get(String(id)) || fromCatalog.get(String(id)))
      .filter(Boolean);
  }, [selectable, products, selectedIds]);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    const pool = selectable.filter((product) => !selectedSet.has(String(product.id)));
    if (!needle) return pool;
    return pool.filter((product) => {
      const haystack = [
        productLabel(product),
        productSku(product),
        product.slug,
        product.id,
      ].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [selectable, selectedSet, query]);

  function addProduct(id) {
    if (disabled) return;
    const next = [...selectedIds.map(String)];
    if (next.includes(String(id))) return;
    onChange?.([...next, String(id)]);
  }

  function removeProduct(id) {
    if (disabled) return;
    onChange?.((selectedIds || []).map(String).filter((item) => item !== String(id)));
  }

  const copy = {
    search: searchPlaceholder || (ar ? "ابحث عن منتج..." : "Search products..."),
    empty: emptyLabel || (ar ? "لا توجد منتجات متاحة" : "No products available"),
    selected: ar ? "المحدد" : "Selected",
    add: ar ? "إضافة" : "Add",
    loading: ar ? "جاري التحميل..." : "Loading...",
    noneSelected: ar ? "لم يتم اختيار منتجات بعد" : "No products selected yet",
  };

  return (
    <div className="product-picker">
      {error ? <p className="admin-inline-error" role="alert">{error}</p> : null}
      {loading ? <p className="admin-muted">{copy.loading}</p> : null}

      <div className="product-picker-selected">
        <strong>{copy.selected}</strong>
        {selectedProducts.length === 0 ? (
          <p className="admin-muted">{copy.noneSelected}</p>
        ) : (
          <ul className="product-picker-chips">
            {selectedProducts.map((product) => (
              <li key={product.id}>
                <span>{productLabel(product)}</span>
                {!disabled && (
                  <button
                    className="icon-action"
                    type="button"
                    aria-label={ar ? "إزالة" : "Remove"}
                    onClick={() => removeProduct(product.id)}
                  >
                    <X size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="admin-search-field">
        <Search size={15} />
        <input
          disabled={disabled || loading}
          placeholder={copy.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <AdminTable>
        <thead>
          <tr>
            <th>{ar ? "المنتج" : "Product"}</th>
            <th>SKU</th>
            <th>{ar ? "إجراء" : "Action"}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={3}>{copy.empty}</td>
            </tr>
          ) : (
            filtered.slice(0, 50).map((product) => (
              <tr key={product.id}>
                <td>{productLabel(product)}</td>
                <td>{productSku(product) || "—"}</td>
                <td>
                  <button
                    className="secondary-action"
                    disabled={disabled || loading}
                    type="button"
                    onClick={() => addProduct(product.id)}
                  >
                    {copy.add}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </AdminTable>
    </div>
  );
}
