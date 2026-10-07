import React from "react";
import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Package,
  RefreshCw,
  ShoppingBag,
  Users,
  Warehouse,
} from "lucide-react";
import { hasPermission } from "../data/permissions.js";
import {
  buildDashboardQuickActions,
  dashboardInsightsCopy,
  formatInsightsMoney,
  orderBucketLabel,
  salesPeriodLabel,
} from "../utils/dashboardInsights.js";
import { fetchDashboardInsights } from "../utils/dashboardInsightsApi.js";

function getDisplayText(value, language = "en") {
  if (value == null || value === "") return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return String(value[language] ?? value.en ?? value.ar ?? "");
  }
  return String(value);
}

function StatChip({ label, value, onClick, tone = "neutral" }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      className={`tenant-dashboard-insight-chip tone-${tone}`}
      onClick={onClick}
      type={onClick ? "button" : undefined}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </Tag>
  );
}

export default function DashboardInsightsPanel({
  company,
  currentUser,
  language = "en",
  modules = [],
  onNavigate,
}) {
  const copy = dashboardInsightsCopy(language);
  const ar = language === "ar";
  const currency = company?.settings?.currency || "";
  const canView = hasPermission(currentUser, "dashboard.view")
    || hasPermission(currentUser, "reports.view")
    || ["company_admin", "admin", "manager"].includes(currentUser?.role);

  const [state, setState] = React.useState({ loading: true, error: "", data: null });
  const quickActions = React.useMemo(
    () => buildDashboardQuickActions({ company, currentUser, modules }),
    [company, currentUser, modules],
  );

  const load = React.useCallback(async () => {
    if (!canView) {
      setState({ loading: false, error: "forbidden", data: null });
      return;
    }
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const timezoneOffsetMinutes = -new Date().getTimezoneOffset();
      const data = await fetchDashboardInsights({ timezoneOffsetMinutes });
      setState({ loading: false, error: "", data });
    } catch (error) {
      const forbidden = /403|permission|forbidden/i.test(error.message || "");
      setState({
        loading: false,
        error: forbidden ? "forbidden" : error.message || copy.error,
        data: null,
      });
    }
  }, [canView, copy.error]);

  React.useEffect(() => {
    load();
  }, [load, company?.id]);

  if (state.loading) {
    return (
      <section className="tenant-dashboard-card tenant-dashboard-insights" aria-busy="true">
        <p className="tenant-dashboard-insights-status">{copy.loading}</p>
      </section>
    );
  }

  if (state.error === "forbidden") {
    return (
      <section className="tenant-dashboard-card tenant-dashboard-insights">
        <p className="tenant-dashboard-insights-status">{copy.forbidden}</p>
      </section>
    );
  }

  if (state.error) {
    return (
      <section className="tenant-dashboard-card tenant-dashboard-insights">
        <p className="tenant-dashboard-insights-status error">{state.error}</p>
        <button className="secondary-action" onClick={load} type="button">
          <RefreshCw size={14} />
          {copy.retry}
        </button>
      </section>
    );
  }

  const insights = state.data;
  if (!insights) return null;

  const products = insights.products || {};
  const orders = insights.orders || {};
  const alerts = insights.alerts || [];
  const salesPeriods = insights.salesPeriods || [];
  const latestSales = insights.latestSales || [];
  const inventory = insights.inventoryMonitor || {};
  const liveVisitors = insights.liveVisitors?.count ?? 0;

  function go(pageKey) {
    if (pageKey && onNavigate) onNavigate(pageKey);
  }

  function formatMoney(value) {
    return formatInsightsMoney(value, currency, language);
  }

  function formatDate(value) {
    if (value == null || value === "") return "—";
    if (typeof value === "object") return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    try {
      return new Intl.DateTimeFormat(ar ? "ar" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
    } catch {
      return "—";
    }
  }

  return (
    <section className="tenant-dashboard-insights-stack" dir={ar ? "rtl" : "ltr"}>
      <section className="tenant-dashboard-card tenant-dashboard-insights">
        <header className="tenant-dashboard-insights-header">
          <div>
            <h2>{copy.title}</h2>
            <p className="tenant-dashboard-insights-live">
              <Users size={15} />
              {copy.liveVisitors}: <strong>{liveVisitors}</strong>
            </p>
          </div>
          <div className="tenant-dashboard-insights-links">
            <button onClick={() => go("admin-orders")} type="button">{copy.viewAllOrders}</button>
            <button onClick={() => go("admin-inventory")} type="button">{copy.viewInventory}</button>
            <button onClick={() => go("admin-analytics-reports")} type="button">{copy.viewReports}</button>
            <button onClick={() => go("admin-analytics-highlights")} type="button">{copy.viewAnalytics}</button>
          </div>
        </header>

        <div className="tenant-dashboard-insights-grid">
          <article className="tenant-dashboard-insight-panel">
            <h3><Package size={16} />{copy.products}</h3>
            <div className="tenant-dashboard-insight-chips">
              <StatChip label={copy.totalProducts} onClick={() => go("admin-products")} value={products.total ?? 0} />
              <StatChip label={copy.inStock} tone="success" value={products.inStock ?? 0} />
              <StatChip label={copy.outOfStock} onClick={() => go("admin-inventory")} tone="danger" value={products.outOfStock ?? 0} />
              <StatChip label={copy.lowStock} onClick={() => go("admin-inventory")} tone="warning" value={products.lowStock ?? 0} />
              <StatChip label={copy.inactive} value={products.inactive ?? 0} />
              {(products.partiallyUnavailable ?? 0) > 0 && (
                <StatChip label={copy.partiallyUnavailable} value={products.partiallyUnavailable} tone="warning" />
              )}
            </div>
          </article>

          <article className="tenant-dashboard-insight-panel">
            <h3><ClipboardList size={16} />{copy.orders}</h3>
            <div className="tenant-dashboard-insight-chips">
              <StatChip label={ar ? "الإجمالي" : "Total"} onClick={() => go("admin-orders")} value={orders.total ?? 0} />
              {Object.entries(orders.statusCounts || {}).filter(([, count]) => count > 0).map(([key, count]) => (
                <StatChip key={key} label={orderBucketLabel(key, language)} value={count} />
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="tenant-dashboard-card tenant-dashboard-insights">
        <h3><AlertTriangle size={16} />{copy.alerts}</h3>
        {alerts.length ? (
          <ul className="tenant-dashboard-alerts-list">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <div>
                  <strong>{getDisplayText(alert.message, language)}</strong>
                  <small>{formatDate(alert.timestamp)}</small>
                </div>
                {alert.href && (
                  <button onClick={() => onNavigate?.(alert.href.startsWith("/admin/orders") ? "admin-orders" : alert.href.includes("inventory") ? "admin-inventory" : "admin-products")} type="button">
                    {copy.open}
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="tenant-dashboard-insights-status">{copy.noAlerts}</p>
        )}
      </section>

      <section className="tenant-dashboard-card tenant-dashboard-insights">
        <h3><BarChart3 size={16} />{copy.salesReport}</h3>
        <p className="tenant-dashboard-insights-note">{copy.unsupportedProfit}</p>
        <div className="tenant-dashboard-table-wrap">
          <table className="tenant-dashboard-table">
            <thead>
              <tr>
                <th>{copy.period}</th>
                <th>{copy.ordersCount}</th>
                <th>{copy.itemsQty}</th>
                <th>{copy.subtotal}</th>
                <th>{copy.deliveryFees}</th>
                <th>{copy.finalTotal}</th>
              </tr>
            </thead>
            <tbody>
              {salesPeriods.map((row) => (
                <tr key={row.key}>
                  <td>{salesPeriodLabel(row.key, language)}</td>
                  <td>{row.ordersCount}</td>
                  <td>{row.itemsQuantity}</td>
                  <td>{formatMoney(row.salesSubtotal)}</td>
                  <td>{formatMoney(row.deliveryFees)}</td>
                  <td>{formatMoney(row.finalTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="tenant-dashboard-insights-split">
        <section className="tenant-dashboard-card tenant-dashboard-insights">
          <h3><ShoppingBag size={16} />{copy.latestSales}</h3>
          {latestSales.length ? (
            <div className="tenant-dashboard-table-wrap">
              <table className="tenant-dashboard-table compact">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{copy.customer}</th>
                    <th>{copy.city}</th>
                    <th>{copy.quantity}</th>
                    <th>{copy.finalTotal}</th>
                    <th>{copy.date}</th>
                  </tr>
                </thead>
                <tbody>
                  {latestSales.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <button className="tenant-dashboard-link-button" onClick={() => go("admin-orders")} type="button">
                          {row.orderNumber}
                        </button>
                      </td>
                      <td>{getDisplayText(row.customerName, language) || "—"}</td>
                      <td>{getDisplayText(row.city, language) || "—"}</td>
                      <td>{row.quantity}</td>
                      <td>{formatMoney(row.finalTotal)}</td>
                      <td>{formatDate(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="tenant-dashboard-insights-status">{copy.noSales}</p>
          )}
        </section>

        <section className="tenant-dashboard-card tenant-dashboard-insights">
          <h3><Warehouse size={16} />{copy.inventory}</h3>
          <div className="tenant-dashboard-insight-chips">
            <StatChip label={copy.outOfStock} onClick={() => go("admin-inventory")} tone="danger" value={inventory.current?.outOfStock ?? 0} />
            <StatChip label={copy.lowStock} onClick={() => go("admin-inventory")} tone="warning" value={inventory.current?.lowStock ?? 0} />
            {(inventory.current?.partiallyUnavailable ?? 0) > 0 && (
              <StatChip label={copy.partiallyUnavailable} value={inventory.current.partiallyUnavailable} tone="warning" />
            )}
          </div>
          <p className="tenant-dashboard-insights-note">{copy.historicalInventoryNote}</p>
        </section>
      </div>

      {quickActions.length > 0 && (
        <section className="tenant-dashboard-card tenant-dashboard-insights">
          <h3>{copy.quickActions}</h3>
          <div className="tenant-dashboard-quick-actions">
            {quickActions.map((action) => (
              <button key={action.pageKey} onClick={() => go(action.pageKey)} type="button">
                {ar ? action.labelAr : action.labelEn}
              </button>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
