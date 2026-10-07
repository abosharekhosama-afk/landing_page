import React from "react";
import AdminTable from "./AdminTable.jsx";
import Toolbar from "./Toolbar.jsx";
import DeferredAdminThumb from "./DeferredAdminThumb.jsx";
import { fetchBrand } from "../utils/catalogApi.js";

export const BRANDS_TABLE_PAGE_SIZE = 25;

function getText(value, language = "en") {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return value[language] || value.en || value.ar || "";
  return String(value);
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "—";
  }
}

/**
 * Brands list with pagination + deferred logo loading.
 * Edit fetches full brand details (hero/menu/header) only when opened.
 */
export default function BrandsCatalogTable({
  brands = [],
  canCreate = false,
  canDelete = false,
  canUpdate = false,
  language = "en",
  onAdd,
  onDelete,
  onEdit,
  readOnly = false,
}) {
  const [page, setPage] = React.useState(0);
  const [query, setQuery] = React.useState("");
  const [openingId, setOpeningId] = React.useState("");

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return brands;
    return brands.filter((brand) => {
      const name = String(getText(brand.name, language) || "").toLowerCase();
      const slug = String(brand.slug || "").toLowerCase();
      const country = String(brand.country || "").toLowerCase();
      return name.includes(needle) || slug.includes(needle) || country.includes(needle);
    });
  }, [brands, language, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / BRANDS_TABLE_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    safePage * BRANDS_TABLE_PAGE_SIZE,
    safePage * BRANDS_TABLE_PAGE_SIZE + BRANDS_TABLE_PAGE_SIZE,
  );

  React.useEffect(() => {
    setPage(0);
  }, [query, brands]);

  async function openEdit(row) {
    if (!canUpdate || !row?.id) return;
    setOpeningId(row.id);
    try {
      const full = await fetchBrand(row.id);
      onEdit(full || row);
    } catch {
      onEdit(row);
    } finally {
      setOpeningId("");
    }
  }

  return (
    <section className="admin-panel-card" data-brands-catalog-table>
      <Toolbar addLabel="Add Brand" onAdd={readOnly || !canCreate ? null : onAdd}>
        <label className="admin-search-field">
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name..."
            type="search"
            value={query}
          />
        </label>
      </Toolbar>
      <AdminTable>
        <thead>
          <tr>
            <th>Icon / Logo</th>
            <th>Name</th>
            <th>Country</th>
            <th>Status</th>
            <th>Created</th>
            <th>Updated</th>
            <th className="admin-data-table-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.length ? (
            pageRows.map((row, index) => (
              <tr key={row.id || index}>
                <td>
                  <DeferredAdminThumb
                    placeholder={getText(row.name, language)?.charAt(0) || "B"}
                    src={row.logoUrl}
                  />
                </td>
                <td><code className="admin-data-table-cell-clip" title={getText(row.name, language)}>{getText(row.name, language)}</code></td>
                <td>{row.country}</td>
                <td>
                  <span className={`admin-status-badge ${row.isActive === false ? "inactive" : "active"}`}>
                    {row.isActive === false ? "Inactive" : "Active"}
                  </span>
                </td>
                <td>{formatDate(row.createdAt)}</td>
                <td>{formatDate(row.updatedAt)}</td>
                <td className="admin-data-table-actions">
                  {(canUpdate || canDelete) && (
                    <div className="row-actions">
                      {canUpdate && (
                        <button
                          className="text-action"
                          disabled={openingId === row.id}
                          onClick={() => openEdit(row)}
                          type="button"
                        >
                          {openingId === row.id ? "Opening…" : "Edit"}
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="text-action danger"
                          onClick={() => onDelete(row.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7">
                <div className="admin-empty-state">
                  <strong>No records yet</strong>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </AdminTable>
      {filtered.length > BRANDS_TABLE_PAGE_SIZE ? (
        <div className="admin-table-pagination" data-brands-pagination>
          <button
            disabled={safePage <= 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            type="button"
          >
            Previous
          </button>
          <span>
            {safePage + 1} / {pageCount} ({filtered.length})
          </span>
          <button
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
            type="button"
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
}
