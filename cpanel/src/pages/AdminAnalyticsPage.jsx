import React from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Clock3,
  FileBarChart,
  Globe2,
  Lightbulb,
  Mail,
  Map,
  Megaphone,
  MonitorSmartphone,
  MousePointerClick,
  Package,
  PlayCircle,
  Radio,
  RefreshCw,
  Search,
  ShieldQuestion,
  ShoppingBag,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import { AdminUnderDevelopmentContent } from "./AdminPlaceholderPage.jsx";
import AnalyticsReportsWorkspace, { REPORTS_COPY } from "../components/AnalyticsReportsWorkspace.jsx";
import SearchAnalyticsPanel from "../components/SearchAnalyticsPanel.jsx";
import { SearchTable, searchCopy } from "../components/SearchAnalyticsPanel.jsx";
import SearchQualityPanel from "../components/SearchQualityPanel.jsx";
import { fetchDashboardInsights, fetchLiveVisitors, fetchVisitorAnalytics } from "../utils/dashboardInsightsApi.js";
import { dashboardInsightsCopy, formatInsightsMoney, orderBucketLabel, salesPeriodLabel } from "../utils/dashboardInsights.js";
import { fetchReportsSummary } from "../utils/reportsApi.js";
import {
  analyticsDirection,
  reportCatalog,
} from "../utils/analytics.js";
import { normalizeReportsSummary, reportsRangeForPreset, reportsSummaryMetric } from "../utils/reportsUi.js";

const COPY = {
  en: {
    unavailable: "Unavailable",
    unavailableDetail: "No verified analytics source is connected for this metric.",
    setup: "Setup required",
    notConnected: "Not connected",
    noVerified: "No verified data",
    dateRange: "All available time",
    ask: "Ask a question about your stats",
    askDetail: "An analytics assistant is not available for this company.",
    reports: "Reports",
    alerts: "Set alerts",
    learnMore: "Learn More",
    enable: "Enable analytics",
    showMore: "Show more reports",
    showLess: "Show fewer reports",
    openReport: "Open report",
  },
  ar: {
    unavailable: "غير متاح",
    unavailableDetail: "لا يوجد مصدر تحليلات موثّق متصل بهذا المؤشر.",
    setup: "يتطلب الإعداد",
    notConnected: "غير متصل",
    noVerified: "لا توجد بيانات موثّقة",
    dateRange: "كل الوقت المتاح",
    ask: "اطرح سؤالاً حول إحصاءاتك",
    askDetail: "مساعد التحليلات غير متاح لهذه الشركة.",
    reports: "التقارير",
    alerts: "إعداد التنبيهات",
    learnMore: "معرفة المزيد",
    enable: "تفعيل التحليلات",
    showMore: "عرض المزيد من التقارير",
    showLess: "عرض تقارير أقل",
    openReport: "فتح التقرير",
  },
};

const PAGE_COPY = {
  "admin-analytics-highlights": ["Analytics Highlights", "A clear view of verified company activity and analytics setup.", "أبرز التحليلات", "نظرة واضحة على نشاط الشركة الموثّق وإعداد التحليلات."],
  "admin-analytics-realtime": ["Real-time Analytics", "Monitor live visitor activity when a verified tracking source is connected.", "تحليلات الوقت الفعلي", "راقب نشاط الزوار المباشر عند ربط مصدر تتبع موثّق."],
  "admin-analytics-traffic": ["Traffic Overview", "Understand how visitors reach and use your site when traffic data is available.", "نظرة عامة على الزيارات", "افهم كيفية وصول الزوار إلى موقعك واستخدامه عند توفر بيانات الزيارات."],
  "admin-analytics-behavior": ["Behavior Overview", "Explore verified engagement and navigation events.", "نظرة عامة على السلوك", "استكشف أحداث التفاعل والتنقل الموثّقة."],
  "admin-analytics-marketing": ["Marketing Overview", "Compare verified marketing sources without mixing them with campaign-management tools.", "نظرة عامة على التسويق", "قارن مصادر التسويق الموثّقة دون خلطها بأدوات إدارة الحملات."],
  "admin-analytics-session-recordings": ["Understand every visitor journey", "Session recordings can reveal friction only after consented recording is configured.", "افهم رحلة كل زائر", "يمكن لتسجيلات الجلسات إظهار نقاط التعثر بعد إعداد التسجيل الموافق عليه."],
  "admin-analytics-insights": ["Insights", "Recommended findings appear only after significant verified patterns are available.", "الرؤى", "تظهر النتائج المقترحة فقط بعد توفر أنماط موثّقة وذات دلالة."],
  "admin-analytics-benchmarks": ["Benchmarks", "Compare performance only when a verified and eligible benchmark dataset exists.", "المعايير", "قارن الأداء فقط عند توفر مجموعة بيانات معيارية موثّقة ومؤهلة."],
  "admin-analytics-reports": ["All Reports", "Operational reports from this company’s orders, invoices, catalog, delivery zones, and activity log.", "كل التقارير", "تقارير تشغيلية من طلبات هذه الشركة والفواتير والكتالوج ومناطق التوصيل وسجل النشاط."],
};

function PageHeader({ activePage, ar, labels, onOpenReports, onUnsupported }) {
  const copy = PAGE_COPY[activePage] || PAGE_COPY["admin-analytics-highlights"];
  return <header className="tenant-analytics-header"><div><h1>{ar ? copy[2] : copy[0]}</h1><p>{ar ? copy[3] : copy[1]}</p></div><div className="tenant-analytics-header-actions"><button onClick={onUnsupported} type="button"><AlertCircle size={16}/>{labels.alerts}</button><button onClick={onOpenReports} type="button"><FileBarChart size={16}/>{labels.reports}</button></div></header>;
}

function RangeControl({ labels }) {
  return <button className="tenant-analytics-range" type="button"><CalendarDays size={16}/>{labels.dateRange}<ChevronDown size={15}/></button>;
}

function QuestionPanel({ labels }) {
  return <section className="tenant-analytics-question"><span><Sparkles size={21}/></span><div><strong>{labels.ask}</strong><p>{labels.askDetail}</p></div><button disabled type="button">{labels.unavailable}</button></section>;
}

function MetricCard({ icon: Icon = BarChart3, label, value, status }) {
  return <article className="tenant-analytics-metric"><div><span>{label}</span><strong>{value ?? "—"}</strong><small>{status}</small></div><i><Icon size={21}/></i></article>;
}

function EmptyChart({ icon: Icon = BarChart3, label, detail, variant = "line" }) {
  return <div className={`tenant-analytics-empty-chart ${variant}`}><div className="tenant-analytics-chart-grid"><span/><span/><span/><span/></div><Icon size={38}/><strong>{label}</strong><p>{detail}</p></div>;
}

function DataPanel({ children, className = "", title, action }) {
  return <section className={`tenant-analytics-panel ${className}`}><header><h2>{title}</h2>{action}</header>{children}</section>;
}

function StatusRows({ items, labels }) {
  return <div className="tenant-analytics-status-rows">{items.map(([name, icon]) => { const Icon = icon; return <div key={name}><span><Icon size={17}/>{name}</span><b>{labels.noVerified}</b></div>; })}</div>;
}

function SeriesTable({ rows = [], labels }) {
  if (!Array.isArray(rows) || !rows.length) return <EmptyChart label={labels.noVerified} detail={labels.unavailableDetail} />;
  return <div className="admin-data-table-wrap"><table className="admin-data-table"><thead><tr><th>Date</th><th>Visitors</th><th>Page views</th></tr></thead><tbody>{rows.map((row) => <tr key={row.date}><td>{row.date}</td><td>{row.visitors}</td><td>{row.pageViews}</td></tr>)}</tbody></table></div>;
}

function TopPagesTable({ rows = [], labels }) {
  if (!Array.isArray(rows) || !rows.length) return <EmptyChart label={labels.noVerified} detail={labels.unavailableDetail} />;
  return <div className="admin-data-table-wrap"><table className="admin-data-table"><thead><tr><th>Page</th><th>Views</th></tr></thead><tbody>{rows.map((row) => <tr key={row.path}><td>{row.path}</td><td>{row.views}</td></tr>)}</tbody></table></div>;
}

function formatDuration(seconds) {
  if (seconds == null) return null;
  const total = Math.max(0, Math.round(Number(seconds)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

function formatNumber(value) {
  if (value == null) return null;
  return Number(value).toFixed(2);
}

function formatPercent(fraction) {
  if (fraction == null) return null;
  return `${(Number(fraction) * 100).toFixed(1)}%`;
}

function EngagementRows({ behavior, labels }) {
  const values = [
    ["Session duration", formatDuration(behavior?.avgSessionDurationSeconds)],
    ["Pages per session", formatNumber(behavior?.pagesPerSession)],
    ["Bounce rate", formatPercent(behavior?.bounceRate)],
  ];
  return <div className="tenant-analytics-status-rows">{values.map(([name, value]) => <div key={name}><span>{name}</span><b>{value ?? labels.noVerified}</b></div>)}</div>;
}

function FunnelRows({ funnel, labels }) {
  const values = [
    ["Product views", funnel?.productViews],
    ["Add to cart", funnel?.addToCart],
    ["Remove from cart", funnel?.removeFromCart],
    ["Checkout started", funnel?.checkoutStarted],
    ["Purchases", funnel?.purchases],
    ["Add-to-cart rate", formatPercent(funnel?.addToCartRate)],
    ["Checkout rate", formatPercent(funnel?.checkoutRate)],
    ["Purchase conversion rate", formatPercent(funnel?.purchaseConversionRate)],
  ];
  return <div className="tenant-analytics-status-rows">{values.map(([name, value]) => <div key={name}><span>{name}</span><b>{value ?? labels.noVerified}</b></div>)}</div>;
}

function CampaignTable({ campaigns, labels }) {
  const rows = Array.isArray(campaigns?.rows) ? campaigns.rows : [];
  if (!rows.length) {
    return <EmptyChart icon={BarChart3} label={labels.noVerified} detail="Campaign rows appear once recorded storefront visits carry campaign (UTM) parameters." />;
  }
  return (
    <div className="admin-data-table-wrap">
      <table className="admin-data-table">
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Source</th>
            <th>Medium</th>
            <th>Content / Post</th>
            <th>Visits</th>
            <th>Product views</th>
            <th>Add to cart</th>
            <th>Remove from cart</th>
            <th>Checkout started</th>
            <th>Purchases</th>
            <th>Orders</th>
            <th>Revenue</th>
            <th>Returned orders</th>
            <th>Returned value</th>
            <th>Unique customers</th>
            <th>Conversion rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.campaign || "(no campaign)"}</td>
              <td>{row.source || "—"}</td>
              <td>{row.medium || "—"}</td>
              <td>{row.content || "(no content)"}</td>
              <td>{row.sessions}</td>
              <td>{row.productViews}</td>
              <td>{row.addToCart}</td>
              <td>{row.removeFromCart}</td>
              <td>{row.checkoutStarted}</td>
              <td>{row.purchases}</td>
              <td>{row.orders}</td>
              <td>{formatNumber(row.revenue) ?? "—"}</td>
              <td>{row.returnedOrders}</td>
              <td>{formatNumber(row.returnedValue) ?? "—"}</td>
              <td>{row.uniquePurchasingCustomers ?? labels.noVerified}</td>
              <td>{formatPercent(row.conversionRate) ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HighlightsPage({ companyId, labels, language = "en", onOpenReports, visitorData }) {
  const liveCount = visitorData?.live?.count ?? 0;
  const analytics = visitorData?.analytics;
  const hasVisitorData = Boolean(analytics);
  const behavior = analytics?.behavior;
  const series = analytics?.seriesByDay || [];
  const dailyVisitors = analytics?.daily?.totalVisitors ?? 0;
  const dailyPageViews = analytics?.daily?.pageViews ?? 0;
  const reportsCopy = REPORTS_COPY[language] || REPORTS_COPY.en;
  const [reportsPayload, setReportsPayload] = React.useState(null);
  const [reportsUnavailable, setReportsUnavailable] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const range = reportsRangeForPreset("30d");
    setReportsPayload(null);
    setReportsUnavailable(false);
    fetchReportsSummary({
      dateFrom: range.date_from,
      dateTo: range.date_to,
    }).then((payload) => {
      if (cancelled) return;
      setReportsPayload(normalizeReportsSummary(payload));
    }).catch(() => {
      if (cancelled) return;
      setReportsPayload(null);
      setReportsUnavailable(true);
    });
    return () => { cancelled = true; };
  }, [companyId]);

  const ordersValue = reportsUnavailable ? null : reportsSummaryMetric(reportsPayload, "orders_count");
  const customersValue = reportsUnavailable ? null : reportsSummaryMetric(reportsPayload, "customers_count");
  return <div className="analytics-highlights-page">
    <div className="tenant-analytics-top-grid"><DataPanel className="analytics-live-card" title="Live visitors"><div className="analytics-live-value"><Radio size={27}/><strong>{liveCount}</strong><span>{hasVisitorData ? (liveCount ? "Active in the last 5 minutes" : labels.noVerified) : labels.noVerified}</span></div></DataPanel><QuestionPanel labels={labels}/></div>
    <div className="tenant-analytics-section-heading"><div><h2>Key statistics</h2><p>{hasVisitorData ? "Visitor metrics below come from recorded storefront events for this company." : "Visitor analytics stay empty until storefront events are recorded. Company operational reports are on All Reports."}</p></div><button className="tenant-analytics-range" onClick={onOpenReports} type="button"><FileBarChart size={16}/>{labels.reports}</button></div>
    <div className="tenant-analytics-metrics four"><MetricCard icon={Globe2} label="Site sessions" value={hasVisitorData ? dailyVisitors : null} status={hasVisitorData ? `${dailyPageViews} page views today` : labels.unavailable}/><MetricCard icon={Users} label="Unique visitors" value={hasVisitorData ? dailyVisitors : null} status={hasVisitorData ? labels.dateRange : labels.unavailableDetail}/><MetricCard icon={BarChart3} label="Orders" value={ordersValue} status={ordersValue == null ? labels.unavailableDetail : reportsCopy.inRange}/><MetricCard icon={Users} label="Customers" value={customersValue} status={customersValue == null ? labels.unavailableDetail : reportsCopy.currentTotal}/></div>
    {hasVisitorData && <div className="tenant-analytics-section-heading"><div><h2>Get to know your visitors</h2><p>Visitor trends below come from recorded storefront events for this company.</p></div></div>}
    <div className="tenant-analytics-grid three"><DataPanel title="Sessions over time"><SeriesTable rows={series} labels={labels}/></DataPanel><DataPanel title="Top traffic sources"><StatusRows labels={labels} items={[["Direct", Globe2],["Search", Search],["Referrals", ArrowUpRight]]}/></DataPanel><DataPanel title="Sessions by location"><EmptyChart icon={Map} label={labels.noVerified} detail={labels.unavailableDetail} variant="map"/></DataPanel></div>
    <div className="tenant-analytics-section-heading"><div><h2>Explore visitor engagement</h2><p>{hasVisitorData ? "Engagement metrics below are derived from stored visitor sessions for the last 7 days." : labels.unavailableDetail}</p></div></div>
    <div className="tenant-analytics-grid three"><DataPanel title="Most visited pages"><TopPagesTable rows={behavior?.topPages || []} labels={labels}/></DataPanel><DataPanel title="Engagement statistics"><EngagementRows behavior={hasVisitorData ? behavior : null} labels={labels}/></DataPanel><DataPanel title="Click tracking"><EmptyChart icon={MousePointerClick} label={labels.setup} detail="Configure a supported event source before click data appears."/></DataPanel></div>
    <DataPanel title="Analyze marketing performance"><StatusRows labels={labels} items={[["Organic search", Search],["Email marketing", Mail],["Paid advertising", Megaphone]]}/></DataPanel>
  </div>;
}

function RealtimePage({ labels, visitorData }) {
  const liveCount = visitorData?.live?.count ?? 0;
  const hasVisitorData = Boolean(visitorData?.analytics);
  return <div className="analytics-realtime-page"><div className="tenant-analytics-metrics two"><MetricCard icon={Clock3} label="Visitors in the last 30 minutes" value={hasVisitorData ? liveCount : "0"} status={hasVisitorData ? "Based on recent storefront heartbeats/pageviews" : labels.noVerified}/><MetricCard icon={Radio} label="Live visitors" value={hasVisitorData ? liveCount : "0"} status={hasVisitorData ? "5-minute activity window" : labels.noVerified}/></div><div className="analytics-realtime-layout"><DataPanel className="analytics-map-panel" title="Live visitor map"><EmptyChart icon={Map} label={hasVisitorData ? "Map unavailable" : "No live visitor source"} detail={hasVisitorData ? "Geographic live visitor mapping is not stored by the platform." : labels.unavailableDetail} variant="map"/><div className="tenant-analytics-grid three compact"><StatusRows labels={labels} items={[["Page views", FileBarChart]]}/><StatusRows labels={labels} items={[["Traffic source", Globe2]]}/><StatusRows labels={labels} items={[["Devices", MonitorSmartphone]]}/></div></DataPanel><aside><DataPanel title="Recent visitors"><EmptyChart icon={Users} label={hasVisitorData ? "Recent visitor identities are not stored" : "No verified visitors"} detail={hasVisitorData ? "Only aggregate counts are available from storefront events." : "Recent visitor identities are not available."}/></DataPanel><DataPanel title="Live activity"><EmptyChart icon={Activity} label={hasVisitorData ? "No per-event live stream UI yet" : "No live activity"} detail={hasVisitorData ? "Use the live visitor count while detailed event streams are not exposed here." : "A verified event stream is required."}/></DataPanel></aside></div></div>;
}

function TrafficPage({ labels, language = "en", visitorData }) {
  const hasVisitorData = Boolean(visitorData?.analytics);
  const analytics = visitorData?.analytics;
  const daily = analytics?.daily;
  const series = analytics?.seriesByDay || [];
  return (
    <div className="analytics-traffic-page">
      <div className="tenant-analytics-control-row"><RangeControl labels={labels} /></div>
      <QuestionPanel labels={labels} />
      <div className="tenant-analytics-metrics two">
        <MetricCard
          icon={Globe2}
          label="Site sessions"
          status={hasVisitorData ? `${daily?.pageViews ?? 0} page views today` : labels.unavailable}
          value={hasVisitorData ? daily?.totalVisitors : null}
        />
        <MetricCard
          icon={Users}
          label="Unique visitors"
          status={hasVisitorData ? labels.dateRange : labels.unavailable}
          value={hasVisitorData ? daily?.totalVisitors : null}
        />
      </div>
      <DataPanel title="Sessions over time">
        {hasVisitorData && series.length ? (
          <div className="admin-data-table-wrap">
            <table className="admin-data-table">
              <thead><tr><th>Date</th><th>Visitors</th><th>Page views</th></tr></thead>
              <tbody>
                {series.map((row) => (
                  <tr key={row.date}><td>{row.date}</td><td>{row.visitors}</td><td>{row.pageViews}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyChart label={hasVisitorData ? labels.noVerified : "Historical traffic unavailable"} detail={hasVisitorData ? labels.unavailableDetail : "No verified time-series dataset is connected."} />
        )}
      </DataPanel>
      <div className="tenant-analytics-grid three">
        <DataPanel title="Monthly visitors">
          <MetricCard icon={CalendarDays} label="This month" value={hasVisitorData ? analytics?.monthly?.totalVisitors : null} status={hasVisitorData ? `${analytics?.monthly?.pageViews ?? 0} page views` : labels.unavailable} />
        </DataPanel>
        <DataPanel title="Yearly visitors">
          <MetricCard icon={BarChart3} label="This year" value={hasVisitorData ? analytics?.yearly?.totalVisitors : null} status={hasVisitorData ? `${analytics?.yearly?.pageViews ?? 0} page views` : labels.unavailable} />
        </DataPanel>
        <DataPanel title="New vs returning visitors">
          {hasVisitorData && analytics?.returningVisitorIdentitySupported ? (
            <StatusRows labels={labels} items={[
              [`First-time: ${daily?.firstTimeVisitors ?? 0}`, Users],
              [`Returning: ${daily?.returningVisitors ?? 0}`, Users],
            ]} />
          ) : (
            <EmptyChart icon={Users} label={labels.noVerified} detail="Returning visitor identity requires a stable visitorKey from the storefront." />
          )}
        </DataPanel>
      </div>
      <SearchQualityPanel language={language} />
    </div>
  );
}

function BehaviorPage({ labels, language, visitorData }) {
  const analytics = visitorData?.analytics;
  const hasVisitorData = Boolean(analytics);
  const behavior = analytics?.behavior;
  const series = analytics?.seriesByDay || [];
  const duration = hasVisitorData ? formatDuration(behavior?.avgSessionDurationSeconds) : null;
  const pages = hasVisitorData ? formatNumber(behavior?.pagesPerSession) : null;
  const bounce = hasVisitorData ? formatPercent(behavior?.bounceRate) : null;
  return (
    <div className="analytics-behavior-page">
      <SearchAnalyticsPanel language={language} />
      <div className="tenant-analytics-section-heading">
        <div>
          <h2>{hasVisitorData ? "Recorded engagement over the last 7 days" : labels.noVerified}</h2>
          <p>{hasVisitorData ? "All metrics below are derived from stored storefront visitor events and sessions." : labels.unavailableDetail}</p>
        </div>
      </div>
      <div className="tenant-analytics-metrics three">
        <MetricCard icon={Clock3} label="Average session duration" value={duration} status={duration != null ? "Across sessions" : labels.noVerified} />
        <MetricCard icon={FileBarChart} label="Average pages per session" value={pages} status={pages != null ? "Per session" : labels.noVerified} />
        <MetricCard icon={Activity} label="Bounce rate" value={bounce} status={bounce != null ? "Single-page sessions" : labels.noVerified} />
      </div>
      <div className="tenant-analytics-section-heading">
        <div>
          <h2>Storefront funnel</h2>
          <p>{hasVisitorData ? "Cart, checkout, and purchase steps from recorded storefront events over the last 7 days." : labels.unavailableDetail}</p>
        </div>
      </div>
      <DataPanel className="analytics-full-span" title="Product views to purchases">
        <FunnelRows funnel={analytics?.funnel} labels={labels} />
      </DataPanel>
      <div className="tenant-analytics-section-heading">
        <div>
          <h2>Campaign performance</h2>
          <p>
            {hasVisitorData
              ? `Recorded visits, funnel steps, and backend-confirmed orders grouped by the campaign parameters captured on entry (last 7 days).${analytics?.campaigns?.truncated ? " Showing the top 100 campaigns." : ""}`
              : labels.unavailableDetail}
          </p>
        </div>
      </div>
      <DataPanel className="analytics-full-span" title="Campaign performance">
        <CampaignTable campaigns={analytics?.campaigns} labels={labels} />
      </DataPanel>
      <div className="tenant-analytics-grid two">
        <DataPanel title="Sessions over time"><SeriesTable rows={series} labels={labels} /></DataPanel>
        <DataPanel title="Top pages"><TopPagesTable rows={behavior?.topPages || []} labels={labels} /></DataPanel>
      </div>
      <div className="tenant-analytics-grid two">
        <DataPanel className="analytics-full-span" title="Top clicks"><EmptyChart icon={MousePointerClick} label="Click tracking is not configured" detail="No click events are collected by a verified source." /></DataPanel>
      </div>
    </div>
  );
}

function MarketingPage({ labels }) {
  return <div className="analytics-marketing-page"><div className="tenant-analytics-control-row"><RangeControl labels={labels}/></div><QuestionPanel labels={labels}/><DataPanel title="Performance by"><div className="analytics-performance-tabs"><button className="active" type="button">Sessions</button><button type="button">Leads</button></div><div className="analytics-performance-columns"><StatusRows labels={labels} items={[["Traffic source", Globe2]]}/><StatusRows labels={labels} items={[["Traffic category", BarChart3]]}/></div></DataPanel><DataPanel title="Sessions over time"><EmptyChart label="No verified marketing timeline" detail="Historical marketing sessions are unavailable."/></DataPanel><div className="tenant-analytics-grid three"><DataPanel title="Organic Search"><EmptyChart icon={Search} label={labels.notConnected} detail="No verified Search Console connection."/></DataPanel><DataPanel title="AI platforms visibility"><EmptyChart icon={Sparkles} label={labels.noVerified} detail="No verified AI visibility source is connected."/></DataPanel><DataPanel title="Email marketing"><EmptyChart icon={Mail} label={labels.notConnected} detail="No verified sender or campaign source is connected."/></DataPanel></div></div>;
}

function RecordingsPage({ labels, onUnsupported }) {
  const benefits = [[PlayCircle,"See journeys clearly"],[MousePointerClick,"Understand interaction friction"],[ShieldQuestion,"Use consent-aware setup"]];
  return <section className="analytics-recordings-page"><div className="analytics-recordings-copy"><span className="tenant-analytics-eyebrow">Session recordings</span><h2>Turn visitor journeys into clear improvements</h2><p>No verified recording source is enabled. The preview is decorative and contains no tenant sessions.</p><div>{benefits.map(([Icon,text])=><article key={text}><i><Icon size={20}/></i><div><strong>{text}</strong><p>Available after a supported recording integration is configured.</p></div></article>)}</div><div className="analytics-recordings-actions"><button onClick={onUnsupported} type="button">{labels.enable}</button><button onClick={onUnsupported} type="button">{labels.learnMore}</button></div></div><div className="analytics-recordings-visual" aria-label="Decorative session recording preview"><div className="recording-browser"><header><i/><i/><i/></header><aside/><main><span/><span/><span/><div className="recording-cursor"><MousePointerClick size={25}/></div></main><footer><PlayCircle size={20}/><b/><small>Decorative preview</small></footer></div></div></section>;
}

const INSIGHTS_COPY = {
  en: {
    recommendedActions: "Recommended Actions",
    loading: "Loading insights…",
    error: "Unable to load insights.",
    forbidden: "You do not have permission to view these insights.",
    retry: "Retry",
    learnMore: "Learn More",
    emptyTitle: "No verified insights yet",
    emptyDetail: "Insights will appear once orders, products, visitors, or search activity are recorded for this company.",
    overview: "Overview",
    overviewDetail: "Figures below come from the live dashboard insights endpoint for this company.",
    liveVisitors: "Live visitors",
    liveWindow: "Active in the last 5 minutes",
    noLiveWindow: "No visitors in the tracking window",
    totalOrders: "Total orders",
    allOrders: "Across all statuses",
    totalProductsInCatalog: "total products in catalog",
    outOfStockProducts: "Out of stock products",
    lowStockProducts: "Low stock products",
    stockThresholdNote: "At or below the store low-stock threshold",
    orderStatus: "Order status",
    orderStatusDetail: "Counts by order status from the company records.",
    noOrders: "No orders yet.",
    stockAttention: "Stock attention",
    stockAttentionDetail: "Products that currently need stock or price attention.",
    noStockIssues: "No stock issues right now.",
    salesPeriods: "Sales periods",
    salesPeriodsDetail: "Order totals per period from the company records.",
    latestSales: "Latest sales",
    noSales: "No sales yet.",
    searchSummary: "Search summary",
    searchSummaryDetail: "Search events come from the storefront search integration.",
    noSearch: "No search activity recorded yet.",
    searchTotal: "Total searches",
    zeroResultSearches: "Zero-result searches",
    mostSearched: "Most searched",
    visitors: "Visitors",
    visitorsDetail: "Daily totals and the 7-day series come from recorded storefront events.",
    noVisitors: "No visitor data recorded yet.",
    dailyVisitors: "Visitors today",
    pageViewsToday: "Page views today",
    sessionsLast7: "Sessions (7 days)",
    perDay: "Today",
    perSessions: "Last 7 days",
    ratings: "Ratings",
    ratingsDetail: "Store and product ratings derived from approved reviews for this company.",
    storeAverageRating: "Store average rating",
    approvedStoreReviewCount: "Approved store reviews",
    productReviewCount: "Product reviews",
    mostRatedProducts: "Most-rated products",
    mostFavoritedProducts: "Most-favorited products",
    noRatings: "No approved reviews yet.",
    noFavorites: "No favorited products yet.",
    reviewsCount: "reviews",
    favoritesCount: "favorites",
    ratingOf: "rating",
  },
  ar: {
    recommendedActions: "إجراءات مقترحة",
    loading: "جاري تحميل الرؤى…",
    error: "تعذّر تحميل الرؤى.",
    forbidden: "لا تملك صلاحية عرض هذه الرؤى.",
    retry: "إعادة المحاولة",
    learnMore: "معرفة المزيد",
    emptyTitle: "لا توجد رؤى موثّقة بعد",
    emptyDetail: "ستظهر الرؤى بعد تسجيل الطلبات أو المنتجات أو الزوار أو نشاط البحث لهذه الشركة.",
    overview: "نظرة عامة",
    overviewDetail: "الأرقام أدناه من نقطة رؤى لوحة التحكم الفعلية لهذه الشركة.",
    liveVisitors: "زوار متصلون الآن",
    liveWindow: "نشطون خلال آخر 5 دقائق",
    noLiveWindow: "لا زوار في نافذة التتبع",
    totalOrders: "إجمالي الطلبات",
    allOrders: "بجميع الحالات",
    totalProductsInCatalog: "منتجاً في الكتالوج",
    outOfStockProducts: "منتجات غير متوفرة",
    lowStockProducts: "منتجات بمخزون منخفض",
    stockThresholdNote: "عند حد المخزون المنخفض أو أقل",
    orderStatus: "حالة الطلبات",
    orderStatusDetail: "عدد الطلبات حسب الحالة من سجلات الشركة.",
    noOrders: "لا توجد طلبات بعد.",
    stockAttention: "تنبيهات المخزون",
    stockAttentionDetail: "منتجات تحتاج اهتماماً بالمخزون أو السعر حالياً.",
    noStockIssues: "لا توجد مشكلات مخزون حالياً.",
    salesPeriods: "فترات المبيعات",
    salesPeriodsDetail: "إجماليات الطلبات حسب الفترة من سجلات الشركة.",
    latestSales: "أحدث المبيعات",
    noSales: "لا توجد مبيعات بعد.",
    searchSummary: "ملخص البحث",
    searchSummaryDetail: "أحداث البحث مصدرها تكامل البحث في المتجر.",
    noSearch: "لا يوجد نشاط بحث مسجّل بعد.",
    searchTotal: "إجمالي عمليات البحث",
    zeroResultSearches: "عمليات بحث بلا نتائج",
    mostSearched: "الأكثر بحثاً",
    visitors: "الزوار",
    visitorsDetail: "إجماليات اليوم وسلسلة الأيام السبعة من أحداث المتجر المسجّلة.",
    noVisitors: "لا توجد بيانات زوار مسجّلة بعد.",
    dailyVisitors: "زوار اليوم",
    pageViewsToday: "مشاهدات الصفحات اليوم",
    sessionsLast7: "الجلسات (7 أيام)",
    perDay: "اليوم",
    perSessions: "آخر 7 أيام",
    ratings: "التقييمات",
    ratingsDetail: "تقييمات المتجر والمنتجات المستمدة من المراجعات المقبولة لهذه الشركة.",
    storeAverageRating: "متوسط تقييم المتجر",
    approvedStoreReviewCount: "مراجعات المتجر المقبولة",
    productReviewCount: "مراجعات المنتجات",
    mostRatedProducts: "المنتجات الأكثر تقييماً",
    mostFavoritedProducts: "المنتجات الأكثر تفضيلاً",
    noRatings: "لا توجد مراجعات مقبولة بعد.",
    noFavorites: "لا توجد منتجات مفضلة بعد.",
    reviewsCount: "مراجعات",
    favoritesCount: "تفضيلات",
    ratingOf: "تقييم",
  },
};

function insightDisplayText(value, language = "en") {
  if (value == null || value === "") return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object" && !Array.isArray(value)) return String(value[language] ?? value.en ?? value.ar ?? "");
  return String(value);
}

function insightFormatDate(value, language = "en") {
  if (value == null || value === "") return "—";
  try {
    return new Intl.DateTimeFormat(language === "ar" ? "ar" : "en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function InsightsPage({ company, companyId, labels, language = "en", onUnsupported }) {
  const ar = language === "ar";
  const copy = { ...dashboardInsightsCopy(language), ...INSIGHTS_COPY[ar ? "ar" : "en"] };
  const currency = company?.settings?.currency || "";
  const [state, setState] = React.useState({ loading: true, error: "", insights: null });

  const load = React.useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const timezoneOffsetMinutes = -new Date().getTimezoneOffset();
      const insights = await fetchDashboardInsights({ timezoneOffsetMinutes });
      setState({ loading: false, error: "", insights });
    } catch (error) {
      const forbidden = /403|permission|forbidden/i.test(error.message || "");
      setState({ loading: false, error: forbidden ? "forbidden" : error.message || copy.error, insights: null });
    }
  }, [copy.error]);

  React.useEffect(() => {
    load();
  }, [load, companyId]);

  if (state.loading) {
    return <div className="analytics-insights-page"><div className="tenant-analytics-control-row"><button className="tenant-analytics-primary" onClick={onUnsupported} type="button"><Sparkles size={16}/>{copy.recommendedActions}</button></div><section className="analytics-insights-state" aria-busy="true"><p className="tenant-dashboard-insights-status">{copy.loading}</p></section></div>;
  }

  if (state.error === "forbidden") {
    return <div className="analytics-insights-page"><section className="analytics-insights-state" role="alert"><AlertCircle size={22}/><strong>{copy.forbidden}</strong></section></div>;
  }

  if (state.error) {
    return <div className="analytics-insights-page"><section className="analytics-insights-state is-error" role="alert"><AlertCircle size={22}/><strong>{state.error}</strong><button className="secondary-action" onClick={load} type="button"><RefreshCw size={14}/>{copy.retry}</button></section></div>;
  }

  const insights = state.insights;

  if (!insights || typeof insights !== "object") {
    return <div className="analytics-insights-page"><section className="analytics-insights-empty"><div className="analytics-insights-illustration"><Lightbulb size={54}/><span/><span/></div><h2>{copy.emptyTitle}</h2><p>{copy.emptyDetail}</p><button onClick={onUnsupported} type="button">{copy.learnMore}</button></section></div>;
  }

  const products = insights.products || {};
  const orders = insights.orders || {};
  const statusEntries = Object.entries(orders.statusCounts || {}).filter(([, count]) => Number(count) > 0);
  const alerts = Array.isArray(insights.alerts) ? insights.alerts : [];
  const stockAlerts = alerts.filter((alert) => alert && ["low_stock", "out_of_stock", "price_zero"].includes(alert.type));
  const salesPeriods = Array.isArray(insights.salesPeriods) ? insights.salesPeriods : [];
  const latestSales = Array.isArray(insights.latestSales) ? insights.latestSales : [];
  const liveCount = insights.liveVisitors?.count ?? 0;
  const search = insights.search && typeof insights.search === "object" ? insights.search : null;
  const hasSearch = Boolean(search && (Number(search.totalEvents) > 0 || (Array.isArray(search.mostSearched) && search.mostSearched.length)));
  const searchRows = hasSearch && Array.isArray(search.mostSearched) && search.mostSearched.length ? search.mostSearched : hasSearch && Array.isArray(search.allSearches) ? search.allSearches : [];
  const visitors = insights.visitors && typeof insights.visitors === "object" ? insights.visitors : null;
  const visitorSeries = Array.isArray(visitors?.seriesByDay) ? visitors.seriesByDay : [];
  const ratings = insights.ratings && typeof insights.ratings === "object" ? insights.ratings : null;
  const mostRatedProducts = Array.isArray(ratings?.mostRatedProducts) ? ratings.mostRatedProducts : [];
  const mostFavoritedProducts = Array.isArray(ratings?.mostFavoritedProducts) ? ratings.mostFavoritedProducts : [];
  const hasRatings = Boolean(ratings && (Number(ratings.approvedStoreReviewCount) > 0 || Number(ratings.productReviewCount) > 0 || mostRatedProducts.length || mostFavoritedProducts.length));

  const hasAnyData = Number(orders.total) > 0 || statusEntries.length > 0 || Number(products.total) > 0 || stockAlerts.length > 0 || hasSearch || Boolean(visitors) || liveCount > 0 || hasRatings;

  if (!hasAnyData) {
    return <div className="analytics-insights-page"><div className="tenant-analytics-control-row"><button className="tenant-analytics-primary" onClick={onUnsupported} type="button"><Sparkles size={16}/>{copy.recommendedActions}</button></div><section className="analytics-insights-empty"><div className="analytics-insights-illustration"><Lightbulb size={54}/><span/><span/></div><h2>{copy.emptyTitle}</h2><p>{copy.emptyDetail}</p><button onClick={onUnsupported} type="button">{copy.learnMore}</button></section></div>;
  }

  const money = (value) => formatInsightsMoney(value, currency, language);

  return (
    <div className="analytics-insights-page">
      <div className="tenant-analytics-control-row"><button className="tenant-analytics-primary" onClick={onUnsupported} type="button"><Sparkles size={16}/>{copy.recommendedActions}</button></div>
      <div className="tenant-analytics-section-heading"><div><h2>{copy.overview}</h2><p>{copy.overviewDetail}</p></div></div>
      <div className="tenant-analytics-metrics four">
        <MetricCard icon={Users} label={copy.liveVisitors} value={liveCount} status={liveCount > 0 ? copy.liveWindow : copy.noLiveWindow}/>
        <MetricCard icon={ClipboardList} label={copy.totalOrders} value={orders.total ?? 0} status={copy.allOrders}/>
        <MetricCard icon={Package} label={copy.outOfStockProducts} value={products.outOfStock ?? 0} status={`${products.total ?? 0} ${copy.totalProductsInCatalog}`}/>
        <MetricCard icon={Package} label={copy.lowStockProducts} value={products.lowStock ?? 0} status={copy.stockThresholdNote}/>
      </div>
      <DataPanel className="analytics-full-span" title={copy.salesPeriods}>
        <p className="analytics-reports-empty-copy">{copy.unsupportedProfit}</p>
        <div className="admin-data-table-wrap"><table className="admin-data-table"><thead><tr><th>{copy.period}</th><th>{copy.ordersCount}</th><th>{copy.itemsQty}</th><th>{copy.subtotal}</th><th>{copy.deliveryFees}</th><th>{copy.finalTotal}</th></tr></thead><tbody>{salesPeriods.map((row) => <tr key={row.key}><td>{salesPeriodLabel(row.key, language)}</td><td>{row.ordersCount}</td><td>{row.itemsQuantity}</td><td>{money(row.salesSubtotal)}</td><td>{money(row.deliveryFees)}</td><td>{money(row.finalTotal)}</td></tr>)}</tbody></table></div>
      </DataPanel>
      <div className="tenant-analytics-grid two">
        <DataPanel title={copy.orderStatus}>
          {statusEntries.length ? (
            <div className="tenant-analytics-status-rows">{statusEntries.map(([key, count]) => <div key={key}><span>{orderBucketLabel(key, language)}</span><b>{count}</b></div>)}</div>
          ) : <p className="tenant-dashboard-insights-status">{copy.noOrders}</p>}
        </DataPanel>
        <DataPanel title={copy.stockAttention}>
          {stockAlerts.length ? (
            <ul className="tenant-dashboard-alerts-list">{stockAlerts.map((alert) => <li key={alert.id}><div><strong>{insightDisplayText(alert.message, language)}</strong><small>{insightFormatDate(alert.timestamp, language)}</small></div></li>)}</ul>
          ) : <p className="tenant-dashboard-insights-status">{copy.noStockIssues}</p>}
        </DataPanel>
      </div>
      <div className="tenant-analytics-grid two">
        <DataPanel title={copy.latestSales}>
          {latestSales.length ? (
            <div className="admin-data-table-wrap"><table className="admin-data-table"><thead><tr><th>#</th><th>{copy.customer}</th><th>{copy.city}</th><th>{copy.quantity}</th><th>{copy.finalTotal}</th><th>{copy.date}</th></tr></thead><tbody>{latestSales.map((row) => <tr key={row.id}><td>{row.orderNumber || row.id}</td><td>{insightDisplayText(row.customerName, language) || "—"}</td><td>{insightDisplayText(row.city, language) || "—"}</td><td>{row.quantity}</td><td>{money(row.finalTotal)}</td><td>{insightFormatDate(row.createdAt, language)}</td></tr>)}</tbody></table></div>
          ) : <p className="tenant-dashboard-insights-status">{copy.noSales}</p>}
        </DataPanel>
        <DataPanel title={copy.searchSummary}>
          {hasSearch ? (
            <>
              <div className="tenant-analytics-metrics two"><MetricCard icon={Search} label={copy.searchTotal} value={search.totalEvents} status={copy.searchSummaryDetail}/><MetricCard icon={FileBarChart} label={copy.zeroResultSearches} value={search.zeroResultSearches} status={copy.searchSummaryDetail}/></div>
              <h3 className="analytics-insights-subheading">{copy.mostSearched}</h3>
              <SearchTable copy={searchCopy(language)} language={language} rows={searchRows}/>
            </>
          ) : <p className="tenant-dashboard-insights-status">{copy.noSearch}</p>}
        </DataPanel>
      </div>
      <DataPanel className="analytics-full-span" title={copy.visitors}>
        {visitors ? (
          <>
            <div className="tenant-analytics-metrics three"><MetricCard icon={Users} label={copy.dailyVisitors} value={visitors.daily?.totalVisitors} status={copy.perDay}/><MetricCard icon={FileBarChart} label={copy.pageViewsToday} value={visitors.daily?.pageViews} status={copy.perDay}/><MetricCard icon={Clock3} label={copy.sessionsLast7} value={visitors.behavior?.sessions} status={copy.perSessions}/></div>
            <SeriesTable rows={visitorSeries} labels={labels}/>
          </>
        ) : <p className="tenant-dashboard-insights-status">{copy.noVisitors}</p>}
      </DataPanel>
      <DataPanel className="analytics-full-span" title={copy.ratings}>
        <p className="analytics-reports-empty-copy">{copy.ratingsDetail}</p>
        <div className="tenant-analytics-metrics three">
          <MetricCard icon={Star} label={copy.storeAverageRating} value={Number(ratings?.storeAverageRating) > 0 ? ratings.storeAverageRating : null} status={Number(ratings?.approvedStoreReviewCount) > 0 ? `${ratings.approvedStoreReviewCount} ${copy.reviewsCount}` : copy.noRatings}/>
          <MetricCard icon={Star} label={copy.approvedStoreReviewCount} value={Number(ratings?.approvedStoreReviewCount) > 0 ? ratings.approvedStoreReviewCount : null} status={copy.noRatings}/>
          <MetricCard icon={Star} label={copy.productReviewCount} value={Number(ratings?.productReviewCount) > 0 ? ratings.productReviewCount : null} status={Number(ratings?.productReviewCount) > 0 ? copy.ratingsDetail : copy.noRatings}/>
        </div>
        <div className="tenant-analytics-grid two">
          <DataPanel title={copy.mostRatedProducts}>
            {mostRatedProducts.length ? (
              <div className="admin-data-table-wrap"><table className="admin-data-table"><thead><tr><th>{copy.product}</th><th>{copy.reviewsCount}</th><th>{copy.ratingOf}</th></tr></thead><tbody>{mostRatedProducts.map((row) => <tr key={row.productId}><td>{insightDisplayText(row.name, language) || row.productId}</td><td>{row.reviewCount}</td><td>{Number(row.averageRating) > 0 ? row.averageRating : "—"}</td></tr>)}</tbody></table></div>
            ) : <p className="tenant-dashboard-insights-status">{copy.noRatings}</p>}
          </DataPanel>
          <DataPanel title={copy.mostFavoritedProducts}>
            {mostFavoritedProducts.length ? (
              <div className="admin-data-table-wrap"><table className="admin-data-table"><thead><tr><th>{copy.product}</th><th>{copy.favoritesCount}</th></tr></thead><tbody>{mostFavoritedProducts.map((row) => <tr key={row.productId}><td>{insightDisplayText(row.name, language) || row.productId}</td><td>{row.favoriteCount}</td></tr>)}</tbody></table></div>
            ) : <p className="tenant-dashboard-insights-status">{copy.noFavorites}</p>}
          </DataPanel>
        </div>
      </DataPanel>
    </div>
  );
}

function BenchmarksPage({ labels }) {
  const metrics=["Site sessions","Unique visitors","Conversion rate","Average order value","Returning visitors"];
  return <div className="analytics-benchmarks-page"><div className="analytics-period-note"><CalendarDays size={18}/><div><strong>Current period</strong><p>No eligible comparison period is available.</p></div></div><div className="analytics-benchmark-layout"><DataPanel title="Benchmark metrics"><div className="analytics-benchmark-table"><header><span>Metric</span><span>Your business</span><span>Benchmark</span></header>{metrics.map(metric=><div key={metric}><strong>{metric}</strong><span>{labels.unavailable}</span><span>{labels.unavailable}</span></div>)}</div></DataPanel><DataPanel title="Competition radar"><div className="analytics-radar"><span/><span/><span/><span/><i>{labels.noVerified}</i></div><p className="analytics-panel-note">No claim is made about competitor performance because an eligible benchmark dataset is unavailable.</p></DataPanel></div></div>;
}

function ReportsPage({ company, currentUser, language, onUnsupported }) {
  const unsupportedCatalog = reportCatalog.filter(([category]) => !["Sales", "Accounting", "People"].includes(category));
  return (
    <div className="analytics-reports-page">
      <AnalyticsReportsWorkspace
        company={company}
        currentUser={currentUser}
        language={language}
        onUnsupported={onUnsupported}
        unsupportedCatalog={unsupportedCatalog}
      />
    </div>
  );
}

export default function AdminAnalyticsPage({ activePage, company, currentUser, language = "en", modules = [], onNavigate, t, ...layout }) {
  const ar = language === "ar";
  const labels = COPY[ar ? "ar" : "en"];
  const [unsupported, setUnsupported] = React.useState(false);
  const [visitorData, setVisitorData] = React.useState(null);
  const common = { labels, onUnsupported: () => setUnsupported(true) };
  const reportPage = activePage === "admin-analytics-reports" || activePage === "admin-reports";

  React.useEffect(() => {
    const analyticsPages = new Set([
      "admin-analytics-highlights",
      "admin-analytics-realtime",
      "admin-analytics-traffic",
      "admin-analytics-behavior",
    ]);
    if (!analyticsPages.has(activePage)) return undefined;
    let cancelled = false;
    Promise.all([
      fetchLiveVisitors().catch(() => ({ count: 0 })),
      fetchVisitorAnalytics().catch(() => null),
    ]).then(([live, analytics]) => {
      if (!cancelled) setVisitorData({ live, analytics });
    });
    return () => { cancelled = true; };
  }, [activePage, company?.id]);

  let content;
  switch (activePage) {
    case "admin-analytics-realtime": content = <RealtimePage labels={labels} visitorData={visitorData}/>; break;
    case "admin-analytics-traffic": content = <TrafficPage labels={labels} language={language} visitorData={visitorData} />; break;
    case "admin-analytics-behavior": content = <BehaviorPage labels={labels} language={language} visitorData={visitorData}/>; break;
    case "admin-analytics-marketing": content = <MarketingPage labels={labels}/>; break;
    case "admin-analytics-session-recordings": content = <RecordingsPage {...common}/>; break;
    case "admin-analytics-insights": content = <InsightsPage company={company} companyId={company?.id} language={language} {...common}/>; break;
    case "admin-analytics-benchmarks": content = <BenchmarksPage labels={labels}/>; break;
    case "admin-analytics-reports":
    case "admin-reports":
      content = <ReportsPage company={company} currentUser={currentUser} language={language} onUnsupported={() => setUnsupported(true)}/>; break;
    default: content = <HighlightsPage companyId={company?.id} labels={labels} language={language} onOpenReports={() => onNavigate?.("admin-analytics-reports")} visitorData={visitorData}/>;
  }
  return <AdminLayout activePage={reportPage ? "admin-analytics-reports" : activePage} company={company} currentUser={currentUser} hideHeader language={language} modules={modules} onNavigate={onNavigate} t={t} {...layout}><div className="tenant-analytics-page" dir={analyticsDirection(language)}><PageHeader activePage={reportPage ? "admin-analytics-reports" : activePage} ar={ar} labels={labels} onOpenReports={() => onNavigate?.("admin-analytics-reports")} onUnsupported={() => setUnsupported(true)}/>{content}{unsupported&&<div className="tenant-analytics-modal" role="dialog" aria-modal="true"><button aria-label="Close" onClick={()=>setUnsupported(false)} type="button"><X size={18}/></button><AdminUnderDevelopmentContent t={t}/></div>}</div></AdminLayout>;
}
