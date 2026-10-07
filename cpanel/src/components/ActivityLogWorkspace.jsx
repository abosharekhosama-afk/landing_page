import React from "react";
import { AlertCircle, RefreshCw, Search, X } from "lucide-react";
import { canAccessAdminPage } from "../utils/roles.js";
import { fetchActivityLog, fetchActivityLogs } from "../utils/activityLogApi.js";
import {
  ACTIVITY_LOG_PAGE_SIZE,
  activityActorLabel,
  activityEntityLabel,
  activityLogQueryFromFilters,
  emptyActivityFilters,
  formatActivityPayload,
  formatActivityWhen,
  normalizeActivityLog,
  normalizeActivityLogList,
} from "../utils/activityLogUi.js";

export const ACTIVITY_LOG_COPY = {
  en: {
    title: "Activity log",
    subtitle: "Review recorded admin actions for this company.",
    readOnly: "Activity records are view-only.",
    action: "Action",
    actor: "Actor",
    actorEmail: "Actor email",
    entity: "Entity",
    entityType: "Entity type",
    summary: "Summary",
    when: "Time",
    role: "Role",
    apply: "Apply filters",
    reset: "Reset",
    retry: "Retry",
    loading: "Loading activity log…",
    loadMore: "Load more",
    loadingMore: "Loading more…",
    empty: "No activity recorded",
    emptyHint: "Actions taken in this company will appear here.",
    emptyFilter: "No activity matches these filters.",
    forbidden: "You do not have permission to view the activity log.",
    loadFailed: "Unable to load the activity log.",
    detailFailed: "Unable to load this activity record.",
    details: "Details",
    close: "Close",
    before: "Before",
    after: "After",
    metadata: "Metadata",
    request: "Request context",
    ip: "IP address",
    userAgent: "User agent",
    noPayload: "No additional data recorded.",
    showing: (count, total) => `Showing ${count} of ${total}`,
  },
  ar: {
    title: "سجل النشاط",
    subtitle: "راجع إجراءات الإدارة المسجّلة لهذه الشركة.",
    readOnly: "سجلات النشاط للعرض فقط.",
    action: "الإجراء",
    actor: "المنفّذ",
    actorEmail: "بريد المنفّذ",
    entity: "الكيان",
    entityType: "نوع الكيان",
    summary: "الملخص",
    when: "الوقت",
    role: "الدور",
    apply: "تطبيق الفلاتر",
    reset: "إعادة تعيين",
    retry: "إعادة المحاولة",
    loading: "جاري تحميل سجل النشاط…",
    loadMore: "تحميل المزيد",
    loadingMore: "جاري التحميل…",
    empty: "لا يوجد نشاط مسجّل",
    emptyHint: "ستظهر هنا الإجراءات التي تتم في هذه الشركة.",
    emptyFilter: "لا يوجد نشاط مطابق لهذه الفلاتر.",
    forbidden: "ليس لديك صلاحية عرض سجل النشاط.",
    loadFailed: "تعذر تحميل سجل النشاط.",
    detailFailed: "تعذر تحميل سجل النشاط هذا.",
    details: "التفاصيل",
    close: "إغلاق",
    before: "قبل",
    after: "بعد",
    metadata: "بيانات إضافية",
    request: "سياق الطلب",
    ip: "عنوان IP",
    userAgent: "وكيل المستخدم",
    noPayload: "لا توجد بيانات إضافية مسجّلة.",
    showing: (count, total) => `عرض ${count} من ${total}`,
  },
};

function PayloadBlock({ title, value, empty }) {
  const text = formatActivityPayload(value);
  return (
    <section className="activity-log-payload">
      <h3>{title}</h3>
      {text ? <pre>{text}</pre> : <p>{empty}</p>}
    </section>
  );
}

function ActivityDetailDialog({ copy, language, log, loading, error, onClose }) {
  return (
    <div className="activity-log-dialog-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="activity-log-detail-title"
        aria-modal="true"
        className="activity-log-dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header>
          <div>
            <h2 id="activity-log-detail-title">{copy.details}</h2>
            <p>{log?.action || copy.loading}</p>
          </div>
          <button aria-label={copy.close} onClick={onClose} type="button"><X size={18} /></button>
        </header>
        {loading && <div className="activity-log-state">{copy.loading}</div>}
        {error && <div className="activity-log-state is-error" role="alert">{error}</div>}
        {!loading && log && (
          <div className="activity-log-dialog-body">
            <dl className="activity-log-meta">
              <div><dt>{copy.when}</dt><dd>{formatActivityWhen(log.created_at, language)}</dd></div>
              <div><dt>{copy.actor}</dt><dd>{activityActorLabel(log)}</dd></div>
              <div><dt>{copy.actorEmail}</dt><dd>{log.actor_email || "—"}</dd></div>
              <div><dt>{copy.role}</dt><dd>{log.actor_role || "—"}</dd></div>
              <div><dt>{copy.action}</dt><dd>{log.action || "—"}</dd></div>
              <div><dt>{copy.entityType}</dt><dd>{log.entity_type || "—"}</dd></div>
              <div><dt>{copy.entity}</dt><dd>{activityEntityLabel(log)}</dd></div>
              <div><dt>{copy.summary}</dt><dd>{log.summary || "—"}</dd></div>
            </dl>
            <PayloadBlock empty={copy.noPayload} title={copy.before} value={log.before_data} />
            <PayloadBlock empty={copy.noPayload} title={copy.after} value={log.after_data} />
            <PayloadBlock empty={copy.noPayload} title={copy.metadata} value={log.metadata} />
            <section className="activity-log-payload">
              <h3>{copy.request}</h3>
              <dl className="activity-log-meta">
                <div><dt>{copy.ip}</dt><dd>{log.ip_address || "—"}</dd></div>
                <div><dt>{copy.userAgent}</dt><dd>{log.user_agent || "—"}</dd></div>
              </dl>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ActivityLogWorkspace({ company, currentUser, language = "en" }) {
  const copy = ACTIVITY_LOG_COPY[language] || ACTIVITY_LOG_COPY.en;
  const ar = language === "ar";
  const canView = canAccessAdminPage(currentUser, "admin-activity-log");
  const [draft, setDraft] = React.useState(emptyActivityFilters);
  const [applied, setApplied] = React.useState(emptyActivityFilters);
  const [logs, setLogs] = React.useState([]);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState("");
  const [forbidden, setForbidden] = React.useState(!canView);
  const [detailId, setDetailId] = React.useState("");
  const [detail, setDetail] = React.useState(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState("");

  const load = React.useCallback(async ({ page: nextPage = 1, append = false } = {}) => {
    if (!canView) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");
    setForbidden(false);
    try {
      const payload = await fetchActivityLogs(activityLogQueryFromFilters(applied, {
        page: nextPage,
        limit: ACTIVITY_LOG_PAGE_SIZE,
      }));
      const result = normalizeActivityLogList(payload);
      setLogs((current) => (append ? [...current, ...result.logs] : result.logs));
      setPage(result.page);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (loadError) {
      if (loadError.status === 403 || /403|forbidden|access denied|module is disabled/i.test(loadError.message || "")) {
        setForbidden(true);
        setLogs([]);
      } else {
        setError(loadError.message || copy.loadFailed);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [applied, canView, copy.loadFailed]);

  React.useEffect(() => {
    load({ page: 1, append: false });
  }, [load, company?.id]);

  React.useEffect(() => {
    if (!detailId) return undefined;
    let active = true;
    setDetailLoading(true);
    setDetailError("");
    setDetail(null);
    fetchActivityLog(detailId)
      .then((row) => {
        if (active) setDetail(normalizeActivityLog(row));
      })
      .catch((requestError) => {
        if (active) setDetailError(requestError.message || copy.detailFailed);
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => { active = false; };
  }, [copy.detailFailed, detailId]);

  function applyFilters(event) {
    event.preventDefault();
    setApplied({ ...draft });
  }

  function resetFilters() {
    const empty = emptyActivityFilters();
    setDraft(empty);
    setApplied(empty);
  }

  if (forbidden) {
    return (
      <section className="activity-log-state" dir={ar ? "rtl" : "ltr"} role="alert">
        <AlertCircle size={22} />
        <strong>{copy.forbidden}</strong>
      </section>
    );
  }

  const hasFilters = Object.values(applied).some(Boolean);

  return (
    <div className="activity-log-page" dir={ar ? "rtl" : "ltr"}>
      <p className="activity-log-banner" role="status">{copy.readOnly}</p>

      <form className="activity-log-filters" onSubmit={applyFilters}>
        <label>
          {copy.action}
          <input
            aria-label={copy.action}
            onChange={(event) => setDraft((current) => ({ ...current, action: event.target.value }))}
            value={draft.action}
          />
        </label>
        <label>
          {copy.entityType}
          <input
            aria-label={copy.entityType}
            onChange={(event) => setDraft((current) => ({ ...current, entityType: event.target.value }))}
            value={draft.entityType}
          />
        </label>
        <label>
          {copy.actorEmail}
          <span className="activity-log-search-field">
            <Search size={16} />
            <input
              aria-label={copy.actorEmail}
              onChange={(event) => setDraft((current) => ({ ...current, actorEmail: event.target.value }))}
              value={draft.actorEmail}
            />
          </span>
        </label>
        <label>
          {copy.when}
          <span className="activity-log-dates">
            <input
              aria-label={`${copy.when} from`}
              onChange={(event) => setDraft((current) => ({ ...current, dateFrom: event.target.value }))}
              type="date"
              value={draft.dateFrom}
            />
            <input
              aria-label={`${copy.when} to`}
              onChange={(event) => setDraft((current) => ({ ...current, dateTo: event.target.value }))}
              type="date"
              value={draft.dateTo}
            />
          </span>
        </label>
        <div className="activity-log-filter-actions">
          <button className="tenant-primary-button" type="submit">{copy.apply}</button>
          <button className="tenant-secondary-button" onClick={resetFilters} type="button">{copy.reset}</button>
        </div>
      </form>

      {error && (
        <div className="activity-log-state is-error" role="alert">
          <strong>{error}</strong>
          <button className="tenant-primary-button" onClick={() => load({ page: 1 })} type="button">
            <RefreshCw size={16} />
            {copy.retry}
          </button>
        </div>
      )}

      {loading ? (
        <div className="activity-log-state">{copy.loading}</div>
      ) : !logs.length ? (
        <div className="activity-log-state">
          <strong>{hasFilters ? copy.emptyFilter : copy.empty}</strong>
          <span>{hasFilters ? "" : copy.emptyHint}</span>
        </div>
      ) : (
        <>
          <p className="activity-log-count">{copy.showing(logs.length, total)}</p>
          <div className="activity-log-list">
            <div className="activity-log-list-head">
              <span>{copy.when}</span>
              <span>{copy.actor}</span>
              <span>{copy.action}</span>
              <span>{copy.entity}</span>
              <span>{copy.summary}</span>
            </div>
            {logs.map((log) => (
              <button
                className="activity-log-row"
                key={log.id}
                onClick={() => setDetailId(log.id)}
                type="button"
              >
                <span data-label={copy.when}>{formatActivityWhen(log.created_at, language)}</span>
                <span data-label={copy.actor}>
                  <strong>{activityActorLabel(log)}</strong>
                  <small>{log.actor_email || log.actor_role || ""}</small>
                </span>
                <span data-label={copy.action}><code>{log.action || "—"}</code></span>
                <span data-label={copy.entity}>
                  <strong>{activityEntityLabel(log)}</strong>
                  <small>{log.entity_type || ""}</small>
                </span>
                <span data-label={copy.summary}>{log.summary || "—"}</span>
              </button>
            ))}
          </div>
          {page < totalPages && (
            <button
              className="activity-log-load-more"
              disabled={loadingMore}
              onClick={() => load({ page: page + 1, append: true })}
              type="button"
            >
              {loadingMore ? copy.loadingMore : copy.loadMore}
            </button>
          )}
        </>
      )}

      {detailId && (
        <ActivityDetailDialog
          copy={copy}
          error={detailError}
          language={language}
          loading={detailLoading}
          log={detail}
          onClose={() => { setDetailId(""); setDetail(null); setDetailError(""); }}
        />
      )}
    </div>
  );
}
