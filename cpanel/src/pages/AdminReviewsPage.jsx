import React from "react";
import { LoaderCircle, Plus, Search, ShieldCheck, Star, X } from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import { canAccessAdminPage, canUseReviewAction } from "../utils/roles.js";
import {
  deleteReview,
  fetchAllReviews,
  saveReview,
  updateReviewFeatured,
  updateReviewStatus,
} from "../utils/homeContentApi.js";
import { AdminUnderDevelopmentContent } from "./AdminPlaceholderPage.jsx";
import {
  canFeatureReview,
  emptyReviewForm,
  employeeOptionLabel,
  filterReviews,
  formatReviewDate,
  isHomepageStoreReview,
  productOptionLabel,
  reviewComment,
  reviewCopy,
  reviewFeaturedOf,
  reviewFormFromReview,
  reviewProductLabel,
  reviewSavePayload,
  reviewStatusLabel,
  reviewStatusOf,
  reviewTypeLabel,
} from "../utils/reviewsUi.js";

const emptyForm = emptyReviewForm;

function formFromReview(review, language) {
  return reviewFormFromReview(review, language);
}

export default function AdminReviewsPage({
  company,
  currentUser,
  employees = [],
  language = "en",
  products = [],
  t,
  ...layoutProps
}) {
  const copy = reviewCopy(language);
  const dir = language === "ar" ? "rtl" : "ltr";
  const canView = canAccessAdminPage(currentUser, "admin-reviews");
  const canManage = canUseReviewAction(currentUser, "reviews.manage");
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [forbidden, setForbidden] = React.useState(false);
  const [filters, setFilters] = React.useState({ query: "", status: "all", type: "all", rating: "all" });
  const [selectedId, setSelectedId] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState("");
  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [confirmId, setConfirmId] = React.useState("");
  const [unsupported, setUnsupported] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [noticeError, setNoticeError] = React.useState(false);
  const requestRef = React.useRef(0);

  const load = React.useCallback(() => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError("");
    setForbidden(false);
    fetchAllReviews()
      .then((data) => {
        if (requestRef.current !== requestId) return;
        setRows(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((requestError) => {
        if (requestRef.current !== requestId) return;
        setRows([]);
        setForbidden(requestError?.status === 403);
        setError(requestError?.status === 403 ? "" : (requestError?.message || copy.requestFailed));
        setLoading(false);
      });
  }, [copy.requestFailed]);

  React.useEffect(() => {
    if (!canView) return undefined;
    load();
    return () => { requestRef.current += 1; };
  }, [canView, company?.id, load]);

  const filtered = filterReviews(rows, filters);
  const selected = rows.find((row) => row.id === selectedId) || null;

  function showNotice(text, isError = false) {
    setNotice(text);
    setNoticeError(isError);
  }

  async function moderate(id, status) {
    if (!canManage) return;
    try {
      await updateReviewStatus(id, status, status === "approved");
      showNotice(copy.moderatedNotice);
      load();
    } catch (requestError) {
      showNotice(requestError?.message || copy.requestFailed, true);
    }
  }

  async function toggleFeatured(review) {
    if (!canManage || !canFeatureReview(review)) return;
    try {
      await updateReviewFeatured(review.id, !reviewFeaturedOf(review));
      showNotice(copy.featuredNotice);
      load();
    } catch (requestError) {
      showNotice(requestError?.message || copy.requestFailed, true);
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!canManage || !String(form.customerName || "").trim()) return;
    // A product-linked review cannot be saved without a product from this company.
    if (form.type === "product" && !String(form.productId || "").trim()) {
      showNotice(copy.productRequired, true);
      return;
    }
    // An employee-linked review cannot be saved without an employee from this company.
    if (form.type === "employee" && !String(form.employeeId || "").trim()) {
      showNotice(copy.employeeRequired, true);
      return;
    }
    setSaving(true);
    try {
      await saveReview(reviewSavePayload(form, editingId));
      setFormOpen(false);
      setEditingId("");
      showNotice(copy.createdNotice);
      load();
    } catch (requestError) {
      showNotice(requestError?.message || copy.requestFailed, true);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!canManage || !confirmId) return;
    try {
      await deleteReview(confirmId);
      if (selectedId === confirmId) setSelectedId("");
      setConfirmId("");
      showNotice(copy.deletedNotice);
      load();
    } catch (requestError) {
      showNotice(requestError?.message || copy.requestFailed, true);
    }
  }

  const statusOptions = ["all", "pending", "approved", "rejected", "hidden"];
  const typeOptions = ["all", "website", "store", "site", "product", "order", "employee"];

  function content() {
    if (!canView) {
      return (
        <section className="reviews-state" role="alert">
          <ShieldCheck size={32} />
          <h2>{copy.forbidden}</h2>
        </section>
      );
    }
    if (loading) {
      return (
        <section className="reviews-state">
          <LoaderCircle size={22} />
          <p>{copy.loading}</p>
        </section>
      );
    }
    if (forbidden) {
      return (
        <section className="reviews-state" role="alert">
          <ShieldCheck size={32} />
          <h2>{copy.forbidden}</h2>
        </section>
      );
    }
    if (error) {
      return (
        <section className="reviews-state" role="alert">
          <strong>{copy.loadFailed}</strong>
          <p>{error}</p>
          <button className="admin-primary-button" onClick={load} type="button">{copy.retry}</button>
        </section>
      );
    }
    if (!rows.length) {
      return (
        <section className="reviews-state">
          <Star size={32} />
          <h2>{copy.empty}</h2>
          <p>{copy.emptyText}</p>
          {canManage && (
            <button className="admin-primary-button" onClick={() => { setEditingId(""); setForm(emptyForm()); setFormOpen(true); }} type="button">
              <Plus size={16} />
              {copy.create}
            </button>
          )}
        </section>
      );
    }
    return (
      <section className="reviews-panel">
        <div className="reviews-toolbar">
          <label className="reviews-search">
            <Search size={16} />
            <input
              aria-label={copy.search}
              onChange={(event) => setFilters({ ...filters, query: event.target.value })}
              placeholder={copy.search}
              type="search"
              value={filters.query}
            />
          </label>
          <select aria-label={copy.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} value={filters.status}>
            {statusOptions.map((value) => <option key={value} value={value}>{value === "all" ? copy.all : reviewStatusLabel(language, value)}</option>)}
          </select>
          <select aria-label={copy.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })} value={filters.type}>
            {typeOptions.map((value) => <option key={value} value={value}>{value === "all" ? copy.all : reviewTypeLabel(language, value)}</option>)}
          </select>
          <select aria-label={copy.rating} onChange={(event) => setFilters({ ...filters, rating: event.target.value })} value={filters.rating}>
            <option value="all">{copy.all}</option>
            {[5, 4, 3, 2, 1].map((value) => <option key={value} value={String(value)}>{copy.stars(value)}</option>)}
          </select>
          {canManage && (
            <button className="admin-primary-button" onClick={() => { setEditingId(""); setForm(emptyForm()); setFormOpen(true); }} type="button">
              <Plus size={16} />
              {copy.create}
            </button>
          )}
        </div>
        {filtered.length ? (
          <div className="admin-data-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>{copy.rating}</th>
                  <th>{copy.review}</th>
                  <th>{copy.reviewer}</th>
                  <th>{copy.product}</th>
                  <th>{copy.status}</th>
                  <th>{copy.created}</th>
                  <th className="admin-data-table-actions">{copy.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((review) => {
                  const status = reviewStatusOf(review);
                  return (
                    <tr key={review.id}>
                      <td>{"★".repeat(Number(review.rating || 0)) || "—"}</td>
                      <td><span className="admin-data-table-cell-clip" title={reviewComment(review, language)}>{reviewComment(review, language) || "—"}</span></td>
                      <td>{review.customerName || "—"}</td>
                      <td><span className="admin-data-table-cell-clip" title={reviewProductLabel(review, products, language)}>{reviewProductLabel(review, products, language) || "—"}</span></td>
                      <td><em className={`reviews-status is-${status}`}>{reviewStatusLabel(language, status)}</em></td>
                      <td>{formatReviewDate(review.createdAt, language)}</td>
                      <td className="admin-data-table-actions">
                        <div className="reviews-actions">
                          <button className="reviews-text-action" onClick={() => setSelectedId(review.id)} type="button">{copy.detail}</button>
                          {canManage && status !== "approved" && (
                            <button className="reviews-text-action" onClick={() => moderate(review.id, "approved")} type="button">{copy.approve}</button>
                          )}
                          {canManage && status !== "rejected" && (
                            <button className="reviews-text-action" onClick={() => moderate(review.id, "rejected")} type="button">{copy.reject}</button>
                          )}
                          {canManage && isHomepageStoreReview(review) && canFeatureReview(review) && (
                            <button className="reviews-text-action" onClick={() => toggleFeatured(review)} type="button">{reviewFeaturedOf(review) ? copy.unfeature : copy.feature}</button>
                          )}
                          {canManage && (
                            <button aria-label={`${copy.delete} ${review.customerName || review.id}`} className="reviews-text-action danger" onClick={() => setConfirmId(review.id)} type="button">{copy.delete}</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="reviews-state compact">
            <p>{copy.noMatches}</p>
            <button className="reviews-text-action" onClick={() => setFilters({ query: "", status: "all", type: "all", rating: "all" })} type="button">{copy.clear}</button>
          </div>
        )}
      </section>
    );
  }

  return (
    <AdminLayout
      activePage="admin-reviews"
      company={company}
      currentUser={currentUser}
      language={language}
      subtitle={copy.subtitle}
      t={t}
      title={copy.title}
      {...layoutProps}
    >
      <div className="reviews-page" dir={dir}>
        {!canManage && canView && !loading && !forbidden && !error && (
          <div className="message-panel warning" role="status">{copy.readOnly}</div>
        )}
        {notice && (
          <div className={`message-panel ${noticeError ? "error" : "success"}`} role={noticeError ? "alert" : "status"}>
            <span>{notice}</span>
            <button aria-label={copy.close} className="reviews-text-action" onClick={() => setNotice("")} type="button"><X size={15} /></button>
          </div>
        )}
        {content()}
      </div>

      {selected && (
        <div className="reviews-modal-backdrop" onMouseDown={() => setSelectedId("")} role="presentation">
          <div aria-modal="true" className="reviews-modal" dir={dir} onMouseDown={(event) => event.stopPropagation()} role="dialog">
            <button aria-label={copy.close} onClick={() => setSelectedId("")} type="button"><X size={18} /></button>
            <h2>{copy.detail}</h2>
            <dl className="reviews-detail">
              <div><dt>{copy.reviewer}</dt><dd>{selected.customerName || "—"}</dd></div>
              <div><dt>{copy.rating}</dt><dd>{"★".repeat(Number(selected.rating || 0)) || "—"}</dd></div>
              <div><dt>{copy.status}</dt><dd>{reviewStatusLabel(language, reviewStatusOf(selected))}</dd></div>
              <div><dt>{copy.featured}</dt><dd>{reviewFeaturedOf(selected) ? (language === "ar" ? "نعم" : "Yes") : (language === "ar" ? "لا" : "No")}</dd></div>
              <div><dt>{copy.type}</dt><dd>{reviewTypeLabel(language, selected.type)}</dd></div>
              <div><dt>{copy.product}</dt><dd>{reviewProductLabel(selected, products, language) || "—"}</dd></div>
              <div><dt>{copy.created}</dt><dd>{formatReviewDate(selected.createdAt, language)}</dd></div>
              <div><dt>{copy.review}</dt><dd>{reviewComment(selected, language) || "—"}</dd></div>
            </dl>
            <footer className="reviews-actions">
              {canManage && (
                <>
                  <button className="admin-primary-button" onClick={() => moderate(selected.id, "approved")} type="button">{copy.approve}</button>
                  <button type="button" onClick={() => moderate(selected.id, "rejected")}>{copy.reject}</button>
                  <button type="button" onClick={() => moderate(selected.id, "hidden")}>{copy.hide}</button>
                  <button type="button" onClick={() => moderate(selected.id, "pending")}>{copy.pendingAction}</button>
                  {isHomepageStoreReview(selected) && canFeatureReview(selected) && (
                    <button type="button" onClick={() => toggleFeatured(selected)}>{reviewFeaturedOf(selected) ? copy.unfeature : copy.feature}</button>
                  )}
                  <button type="button" onClick={() => { setEditingId(selected.id); setForm(formFromReview(selected, language)); setFormOpen(true); setSelectedId(""); }}>{copy.edit}</button>
                  <button className="reviews-text-action danger" onClick={() => setConfirmId(selected.id)} type="button">{copy.delete}</button>
                </>
              )}
              <button type="button" onClick={() => setUnsupported(true)}>{copy.reply}</button>
              <button type="button" onClick={() => setSelectedId("")}>{copy.close}</button>
            </footer>
          </div>
        </div>
      )}

      {formOpen && canManage && (
        <div className="reviews-modal-backdrop" onMouseDown={() => !saving && setFormOpen(false)} role="presentation">
          <form aria-modal="true" className="reviews-modal" dir={dir} onMouseDown={(event) => event.stopPropagation()} onSubmit={handleSave} role="dialog">
            <button aria-label={copy.close} onClick={() => setFormOpen(false)} type="button"><X size={18} /></button>
            <h2>{editingId ? copy.edit : copy.createTitle}</h2>
            <label>{copy.customerName}<input onChange={(event) => setForm({ ...form, customerName: event.target.value })} required value={form.customerName} /></label>
            <label>{copy.rating}
              <select onChange={(event) => setForm({ ...form, rating: event.target.value })} value={form.rating}>
                {[5, 4, 3, 2, 1].map((value) => <option key={value} value={String(value)}>{copy.stars(value)}</option>)}
              </select>
            </label>
            <label>{copy.type}
              <select
                onChange={(event) =>
                  // Switching away from "product"/"employee" drops that type's
                  // association from form state so a stale productId or
                  // employeeId is never submitted.
                  setForm((current) => ({
                    ...current,
                    type: event.target.value,
                    productId: event.target.value === "product" ? current.productId : "",
                    employeeId: event.target.value === "employee" ? current.employeeId : "",
                    employeeName: event.target.value === "employee" ? current.employeeName : "",
                  }))
                }
                value={form.type}
              >
                <option value="website">{copy.website}</option>
                <option value="product">{copy.productType}</option>
                {/* Order reviews come from completed orders, so the option is
                    offered only while an existing order review is being edited;
                    it must stay selectable so the stored type is preserved
                    instead of being silently remapped to website. */}
                {form.type === "order" && <option value="order">{copy.order}</option>}
                {/* Same preservation rule for legacy store/site reviews. */}
                {form.type === "store" && <option value="store">{copy.store}</option>}
                {form.type === "site" && <option value="site">{copy.site}</option>}
                <option value="employee">{copy.employee}</option>
              </select>
            </label>
            {form.type === "product" && (
              <label>{copy.productPicker}
                <select
                  onChange={(event) => setForm({ ...form, productId: event.target.value })}
                  required
                  value={form.productId}
                >
                  <option value="">{products.length ? copy.selectProduct : copy.noProducts}</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {productOptionLabel(product, language)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {form.type === "employee" && (
              <label>{copy.employeePicker}
                <select
                  onChange={(event) => {
                    const selected = employees.find(
                      (employee) => String(employee.id) === event.target.value,
                    );
                    setForm({
                      ...form,
                      employeeId: event.target.value,
                      employeeName: selected?.name || "",
                    });
                  }}
                  required
                  value={form.employeeId}
                >
                  <option value="">{employees.length ? copy.selectEmployee : copy.noEmployees}</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employeeOptionLabel(employee)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>{copy.commentEn}<textarea dir="ltr" onChange={(event) => setForm({ ...form, commentEn: event.target.value })} value={form.commentEn} /></label>
            <label>{copy.commentAr}<textarea dir="rtl" onChange={(event) => setForm({ ...form, commentAr: event.target.value })} value={form.commentAr} /></label>
            <footer className="reviews-actions">
              <button disabled={saving} type="button" onClick={() => setFormOpen(false)}>{copy.cancel}</button>
              <button className="admin-primary-button" disabled={saving} type="submit">{saving ? copy.loading : copy.save}</button>
            </footer>
          </form>
        </div>
      )}

      {confirmId && (
        <div className="reviews-modal-backdrop" onMouseDown={() => setConfirmId("")} role="presentation">
          <div aria-modal="true" className="reviews-modal" dir={dir} onMouseDown={(event) => event.stopPropagation()} role="alertdialog">
            <h2>{copy.delete}</h2>
            <p>{copy.confirmDelete}</p>
            <footer className="reviews-actions">
              <button type="button" onClick={() => setConfirmId("")}>{copy.cancel}</button>
              <button className="admin-primary-button" onClick={handleDelete} type="button">{copy.confirmDeleteAction}</button>
            </footer>
          </div>
        </div>
      )}

      {unsupported && (
        <div className="reviews-modal-backdrop" onMouseDown={() => setUnsupported(false)} role="presentation">
          <div aria-modal="true" className="reviews-modal" dir={dir} onMouseDown={(event) => event.stopPropagation()} role="dialog">
            <button aria-label={copy.close} onClick={() => setUnsupported(false)} type="button"><X size={18} /></button>
            <div className="reviews-state compact" role="status"><strong>{copy.replyUnsupported}</strong></div>
            <AdminUnderDevelopmentContent t={t} />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
