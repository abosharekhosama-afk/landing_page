import React from "react";
import { Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import {
  deleteSearchRedirect,
  fetchSearchAnalytics,
  fetchSearchRedirects,
  saveSearchRedirect,
  updateSearchRedirect,
} from "../utils/dashboardInsightsApi.js";

export function searchCopy(language = "en") {
  const ar = language === "ar";
  return ar
    ? {
        title: "تحليلات البحث",
        empty: "لا توجد عمليات بحث مسجّلة بعد. تظهر البيانات بعد أن يرسل المتجر عمليات البحث الفعلية.",
        loading: "جاري تحميل تحليلات البحث…",
        error: "تعذّر تحميل تحليلات البحث.",
        retry: "إعادة المحاولة",
        allSearches: "كل عمليات البحث",
        withResults: "عمليات بحث بنتائج",
        zeroResults: "عمليات بحث بدون نتائج",
        mostSearched: "الأكثر بحثاً",
        term: "العبارة",
        count: "العدد",
        avgResults: "متوسط النتائج",
        lastActivity: "آخر نشاط",
        redirects: "إعادة توجيه البحث",
        inputTerm: "عبارة الإدخال",
        targetTerm: "العبارة المستهدفة",
        active: "نشط",
        addRedirect: "إضافة",
        save: "حفظ",
        delete: "حذف",
        noRedirects: "لا توجد قواعد إعادة توجيه.",
        events: "الأحداث",
      }
    : {
        title: "Search analytics",
        empty: "No searches recorded yet. Data appears after the storefront sends real search events.",
        loading: "Loading search analytics…",
        error: "Unable to load search analytics.",
        retry: "Retry",
        allSearches: "All searches",
        withResults: "Searches with results",
        zeroResults: "Zero-result searches",
        mostSearched: "Most searched",
        term: "Term",
        count: "Count",
        avgResults: "Avg results",
        lastActivity: "Last activity",
        redirects: "Search redirects",
        inputTerm: "Input term",
        targetTerm: "Target term",
        active: "Active",
        addRedirect: "Add",
        save: "Save",
        delete: "Delete",
        noRedirects: "No redirect rules yet.",
        events: "Events",
      };
}

export function formatDate(value, language) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(language === "ar" ? "ar" : "en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function SearchTable({ rows, copy, language }) {
  if (!rows.length) {
    return <p className="tenant-dashboard-insights-status">{copy.empty}</p>;
  }
  return (
    <div className="admin-data-table-wrap">
      <table className="admin-data-table">
        <thead>
          <tr>
            <th>{copy.term}</th>
            <th>{copy.count}</th>
            <th>{copy.avgResults}</th>
            <th>{copy.lastActivity}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.termNormalized || row.term}>
              <td>{row.term}</td>
              <td>{row.searchCount}</td>
              <td>{Math.round(row.averageResults ?? 0)}</td>
              <td>{formatDate(row.lastActivity, language)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SearchAnalyticsPanel({ language = "en" }) {
  const copy = searchCopy(language);
  const ar = language === "ar";
  const [state, setState] = React.useState({
    loading: true,
    error: "",
    analytics: null,
    redirects: [],
  });
  const [form, setForm] = React.useState({ inputTerm: "", targetTerm: "", isActive: true });
  const [formError, setFormError] = React.useState("");

  const load = React.useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const [analytics, redirects] = await Promise.all([
        fetchSearchAnalytics(),
        fetchSearchRedirects(),
      ]);
      setState({ loading: false, error: "", analytics, redirects });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error.message || copy.error,
      }));
    }
  }, [copy.error]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleAddRedirect(event) {
    event.preventDefault();
    setFormError("");
    try {
      await saveSearchRedirect(form);
      setForm({ inputTerm: "", targetTerm: "", isActive: true });
      await load();
    } catch (error) {
      setFormError(error.message || copy.error);
    }
  }

  async function toggleRedirect(entry) {
    try {
      await updateSearchRedirect(entry.id, { isActive: !entry.isActive });
      await load();
    } catch (error) {
      setFormError(error.message || copy.error);
    }
  }

  async function removeRedirect(id) {
    try {
      await deleteSearchRedirect(id);
      await load();
    } catch (error) {
      setFormError(error.message || copy.error);
    }
  }

  if (state.loading) {
    return <p className="tenant-dashboard-insights-status">{copy.loading}</p>;
  }

  if (state.error) {
    return (
      <div>
        <p className="tenant-dashboard-insights-status error">{state.error}</p>
        <button className="secondary-action" onClick={load} type="button">
          <RefreshCw size={14} />
          {copy.retry}
        </button>
      </div>
    );
  }

  const analytics = state.analytics || {};
  const hasEvents = (analytics.totalEvents ?? 0) > 0;

  return (
    <div className="tenant-search-analytics" dir={ar ? "rtl" : "ltr"}>
      <div className="tenant-analytics-section-heading">
        <div>
          <h2><Search size={18} /> {copy.title}</h2>
          <p>{hasEvents ? `${copy.events}: ${analytics.totalEvents}` : copy.empty}</p>
        </div>
        <button className="tenant-analytics-range" onClick={load} type="button">
          <RefreshCw size={16} />
          {copy.retry}
        </button>
      </div>

      {!hasEvents ? (
        <p className="tenant-dashboard-insights-status">{copy.empty}</p>
      ) : (
        <div className="tenant-dashboard-insights-split">
          <section className="tenant-dashboard-card tenant-dashboard-insights">
            <h3>{copy.allSearches}</h3>
            <SearchTable copy={copy} language={language} rows={analytics.allSearches || []} />
          </section>
          <section className="tenant-dashboard-card tenant-dashboard-insights">
            <h3>{copy.mostSearched}</h3>
            <SearchTable copy={copy} language={language} rows={analytics.mostSearched || []} />
          </section>
          <section className="tenant-dashboard-card tenant-dashboard-insights">
            <h3>{copy.withResults}</h3>
            <SearchTable copy={copy} language={language} rows={analytics.withResults || []} />
          </section>
          <section className="tenant-dashboard-card tenant-dashboard-insights">
            <h3>{copy.zeroResults}</h3>
            <SearchTable copy={copy} language={language} rows={analytics.zeroResults || []} />
          </section>
        </div>
      )}

      <section className="tenant-dashboard-card tenant-dashboard-insights">
        <h3>{copy.redirects}</h3>
        <form className="tenant-search-redirect-form" onSubmit={handleAddRedirect}>
          <input
            aria-label={copy.inputTerm}
            onChange={(event) => setForm((current) => ({ ...current, inputTerm: event.target.value }))}
            placeholder={copy.inputTerm}
            required
            value={form.inputTerm}
          />
          <input
            aria-label={copy.targetTerm}
            onChange={(event) => setForm((current) => ({ ...current, targetTerm: event.target.value }))}
            placeholder={copy.targetTerm}
            required
            value={form.targetTerm}
          />
          <label>
            <input
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
              type="checkbox"
            />
            {copy.active}
          </label>
          <button type="submit">
            <Plus size={14} />
            {copy.addRedirect}
          </button>
        </form>
        {formError && <p className="tenant-dashboard-insights-status error">{formError}</p>}
        {state.redirects.length ? (
          <ul className="tenant-search-redirect-list">
            {state.redirects.map((entry) => (
              <li key={entry.id}>
                <span>
                  <strong>{entry.inputTerm}</strong>
                  {" → "}
                  <strong>{entry.targetTerm}</strong>
                </span>
                <div>
                  <button onClick={() => toggleRedirect(entry)} type="button">
                    {entry.isActive ? copy.active : (ar ? "غير نشط" : "Inactive")}
                  </button>
                  <button aria-label={copy.delete} onClick={() => removeRedirect(entry.id)} type="button">
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="tenant-dashboard-insights-status">{copy.noRedirects}</p>
        )}
      </section>
    </div>
  );
}
