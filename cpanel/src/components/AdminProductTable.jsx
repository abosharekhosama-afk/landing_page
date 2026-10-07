import React from "react";
import { categories } from "../data/categories.js";

function AdminProductTable({
  canDelete = true,
  canEdit = true,
  language,
  onDelete,
  onEdit,
  products,
  t,
}) {
  if (products.length === 0) {
    return <div className="empty-panel compact-empty">{t("admin.noProducts")}</div>;
  }

  return (
    <div className="admin-data-table-wrap">
      <table className="admin-data-table">
        <thead>
          <tr>
            <th>{t("admin.product")}</th>
            <th>{t("admin.category")}</th>
            <th>{t("admin.sizesPrices")}</th>
            <th>{t("admin.stockStatus")}</th>
            {(canEdit || canDelete) && <th className="admin-data-table-actions">{t("admin.actions")}</th>}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const category = categories.find((entry) => entry.id === product.categoryId);

            return (
              <tr key={product.id}>
                <td>
                  <div className="admin-product-cell">
                    <img
                      alt={product.name[language]}
                      src={product.image || "/images/products/product-placeholder.svg"}
                      onError={(event) => {
                        event.currentTarget.src = "/images/products/product-placeholder.svg";
                      }}
                    />
                    <span className="admin-data-table-cell-clip" title={product.name[language]}>{product.name[language]}</span>
                  </div>
                </td>
                <td>{category?.name[language]}</td>
                <td>
                  {product.sizes
                    .map((item) => `${item.size}: ${item.price}`)
                    .join(", ")}
                </td>
                <td>{product.stockStatus || "In stock"}</td>
                {(canEdit || canDelete) && (
                  <td className="admin-data-table-actions">
                    <div className="row-actions">
                      {canEdit && (
                        <button aria-label={t("admin.editProduct")} className="text-action" onClick={() => onEdit(product)}>
                          {t("admin.editProduct")}
                        </button>
                      )}
                      {canDelete && (
                        <button aria-label={t("admin.delete")} className="text-action danger" onClick={() => onDelete(product.id)}>
                          {t("admin.delete")}
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default AdminProductTable;
