import React from "react";
import { CheckCircle2, RefreshCw, Search, SearchX } from "lucide-react";
import { fetchSearchAnalytics } from "../utils/dashboardInsightsApi.js";
import { SearchTable, searchCopy } from "./SearchAnalyticsPanel.jsx";

export default function SearchQualityPanel({ language = "en" }) {
  const ar = language === "ar";
  const copy = {
    ...searchCopy(language),
    title: ar ? "جودة البحث" : "Search quality",
    withResultsShort: ar ? "بنتائج" : "With results",
    zeroResultsShort: ar ? "بدون نتائج" : "No results",
  };
  const [state, setState] = React.useState({ loading: true, error: "", analytics: null });

  const load = React.useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const analytics = await fetchSearchAnalytics();
      setState({ loading: false, error: "", analytics });
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

  if (state.loading) {
    return (
      <section className="tenant-analytics-panel">
        <p className="tenant-dashboard-insights-status">{copy.loading}</p>
      </section>
    );
  }

  if (state.error) {
    return (
      <section className="tenant-analytics-panel">
        <p className="tenant-dashboard-insights-status error">{state.error}</p>
        <button className="secondary-action" onClick={load} type="button">
          <RefreshCw size={14} />
          {copy.retry}
        </button>
      </section>
    );
  }

  const analytics = state.analytics || {};
  const totalSearches = analytics.totalEvents ?? 0;
  const hasEvents = totalSearches > 0;

  return (
    <section className="tenant-analytics-panel">
      <header>
        <h2>
          <Search size={18} /> {copy.title}
        </h2>
        <button className="tenant-analytics-range" onClick={load} type="button">
          <RefreshCw size={16} />
          {copy.retry}
        </button>
      </header>
      {hasEvents ? (
        <>
          <div className="tenant-analytics-metrics three">
            <article className="tenant-analytics-metric">
              <div>
                <span>{copy.allSearches}</span>
                <strong>{totalSearches}</strong>
                <small>{copy.events}</small>
              </div>
              <i>
                <Search size={21} />
              </i>
            </article>
            <article className="tenant-analytics-metric">
              <div>
                <span>{copy.withResults}</span>
                <strong>{analytics.searchesWithResults ?? 0}</strong>
                <small>{copy.withResultsShort}</small>
              </div>
              <i>
                <CheckCircle2 size={21} />
              </i>
            </article>
            <article className="tenant-analytics-metric">
              <div>
                <span>{copy.zeroResults}</span>
                <strong>{analytics.zeroResultSearches ?? 0}</strong>
                <small>{copy.zeroResultsShort}</small>
              </div>
              <i>
                <SearchX size={21} />
              </i>
            </article>
          </div>
          <section className="tenant-dashboard-insights">
            <h3>{copy.mostSearched}</h3>
            <SearchTable copy={copy} language={language} rows={analytics.mostSearched || []} />
          </section>
        </>
      ) : (
        <p className="tenant-dashboard-insights-status">{copy.empty}</p>
      )}
    </section>
  );
}