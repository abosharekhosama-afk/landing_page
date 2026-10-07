import React, { useState } from "react";
import { BarChart3, Database, Filter, Gauge, Search, ServerCog } from "lucide-react";
import { DeveloperPageHeader, DeveloperToolsPage, DeveloperUnavailable, ml } from "./AdminDeveloperToolsShared.jsx";

const tabs = [
  ["data", "Data Requests", "طلبات البيانات"],
  ["backend", "Backend Requests", "طلبات الخلفية"],
  ["storage", "CMS Collection Storage", "تخزين مجموعات المحتوى"],
];

function MonitoringToolbar({ language }) {
  return <div className="developer-monitoring-toolbar">
    <label className="developer-tools-search"><Search size={18} /><input disabled placeholder={ml(language, "Search", "بحث")} /></label>
    <button className="developer-tools-secondary-button" disabled type="button"><Filter size={17} />{ml(language, "Filter", "تصفية")}</button>
  </div>;
}

function DataRequests({ language }) {
  return <div className="developer-monitoring-stack">
    <section className="developer-monitoring-overview">
      <div className="developer-monitoring-card-heading"><div><h2>{ml(language, "Request overview", "نظرة عامة على الطلبات")}</h2><p>{ml(language, "Tenant data-request telemetry", "بيانات قياس طلبات المستأجر")}</p></div><div className="developer-segmented"><button className="active" disabled type="button">{ml(language, "Daily", "يومي")}</button><button disabled type="button">{ml(language, "Hourly", "بالساعة")}</button></div></div>
      <div className="developer-chart-shell"><DeveloperUnavailable icon={BarChart3} title={ml(language, "Analytics unavailable", "التحليلات غير متاحة")} description={ml(language, "No verified tenant request-monitoring source is connected.", "لا يوجد مصدر موثق لمراقبة طلبات المستأجر متصل.")} /></div>
    </section>
    <section className="developer-monitoring-details"><div className="developer-monitoring-card-heading"><div><h2>{ml(language, "Request details", "تفاصيل الطلبات")}</h2><p>{ml(language, "Collection and endpoint activity appears here when monitoring is available.", "يظهر نشاط المجموعات ونقاط النهاية هنا عند توفر المراقبة.")}</p></div></div><MonitoringToolbar language={language} /><div className="developer-table-shell"><span>{ml(language, "No request records available", "لا توجد سجلات طلبات متاحة")}</span></div></section>
  </div>;
}

function BackendRequests({ language }) {
  return <div className="developer-monitoring-stack">
    <section className="developer-monitoring-overview developer-backend-telemetry"><div className="developer-monitoring-card-heading"><div><h2>{ml(language, "Backend telemetry", "قياس الخلفية")}</h2><p>{ml(language, "Performance and reliability signals from verified backend monitoring.", "إشارات الأداء والموثوقية من مراقبة خلفية موثقة.")}</p></div></div><div className="developer-chart-shell"><DeveloperUnavailable icon={ServerCog} title={ml(language, "Backend telemetry is not connected", "قياس الخلفية غير متصل")} description={ml(language, "No backend requests or performance graphs can be shown without a tenant-scoped monitoring source.", "لا يمكن عرض طلبات الخلفية أو رسوم الأداء دون مصدر مراقبة خاص بالمستأجر.")} /></div></section>
    <section className="developer-monitoring-details"><div className="developer-monitoring-card-heading"><div><h2>{ml(language, "Backend requests", "طلبات الخلفية")}</h2><p>{ml(language, "Verified request details will appear in this table.", "ستظهر تفاصيل الطلبات الموثقة في هذا الجدول.")}</p></div></div><MonitoringToolbar language={language} /><div className="developer-table-shell"><span>{ml(language, "No backend request records available", "لا توجد سجلات طلبات خلفية متاحة")}</span></div></section>
  </div>;
}

function Storage({ language, showUnavailable }) {
  return <div className="developer-monitoring-stack">
    <section className="developer-storage-summary"><div><span><Database size={22} /></span><div><h2>{ml(language, "CMS collection storage", "تخزين مجموعات المحتوى")}</h2><p>{ml(language, "No verified collection-storage metadata is available.", "لا تتوفر بيانات وصفية موثقة لتخزين المجموعات.")}</p></div></div><dl><div><dt>{ml(language, "Collections", "المجموعات")}</dt><dd>{ml(language, "Unavailable", "غير متاح")}</dd></div><div><dt>{ml(language, "Stored items", "العناصر المخزنة")}</dt><dd>{ml(language, "Unavailable", "غير متاح")}</dd></div><div><dt>{ml(language, "Storage usage", "استخدام التخزين")}</dt><dd>{ml(language, "Unavailable", "غير متاح")}</dd></div></dl></section>
    <section className="developer-monitoring-details"><div className="developer-monitoring-card-heading"><div><h2>{ml(language, "Collection details", "تفاصيل المجموعات")}</h2><p>{ml(language, "Real collection counts will appear only when a verified source is connected.", "ستظهر أعداد المجموعات الحقيقية فقط عند اتصال مصدر موثق.")}</p></div></div><MonitoringToolbar language={language} /><div className="developer-table-shell"><span>{ml(language, "Collection storage details unavailable", "تفاصيل تخزين المجموعات غير متاحة")}</span></div></section>
    <div className="developer-recommendation-grid"><article><Gauge size={24} /><h3>{ml(language, "Storage recommendations", "توصيات التخزين")}</h3><p>{ml(language, "Connect verified monitoring to review usage recommendations.", "اربط مراقبة موثقة لمراجعة توصيات الاستخدام.")}</p><button className="developer-tools-secondary-button" onClick={showUnavailable} type="button">{ml(language, "Learn More", "معرفة المزيد")}</button></article><article><Database size={24} /><h3>{ml(language, "Monitoring integrations", "تكاملات المراقبة")}</h3><p>{ml(language, "Use a supported server-side connection when one becomes available.", "استخدم اتصالاً مدعوماً من جهة الخادم عند توفره.")}</p><button className="developer-tools-primary-button" onClick={showUnavailable} type="button">{ml(language, "Connect", "اتصال")}</button></article></div>
  </div>;
}

export default function AdminMonitoringPage({ activePage, company, language = "en", onNavigate, ...layout }) {
  const [tab, setTab] = useState("data");
  return <DeveloperToolsPage activePage={activePage} company={company} language={language} onNavigate={onNavigate} {...layout}>{(showUnavailable) => <>
    <DeveloperPageHeader description={ml(language, "Review tenant-scoped request and storage telemetry when verified monitoring is available.", "راجع بيانات قياس الطلبات والتخزين الخاصة بالمستأجر عند توفر مراقبة موثقة.")} language={language} onNavigate={onNavigate} title={ml(language, "Monitoring", "المراقبة")} />
    <section className="developer-monitoring-tabs-card">
      <div className="developer-monitoring-topline"><div className="developer-monitoring-tabs" role="tablist">{tabs.map(([id, en, ar]) => <button aria-selected={tab === id} className={tab === id ? "active" : ""} key={id} onClick={() => setTab(id)} role="tab" type="button">{ml(language, en, ar)}</button>)}</div><select aria-label={ml(language, "Date range", "النطاق الزمني")} disabled><option>{ml(language, "Date range unavailable", "النطاق الزمني غير متاح")}</option></select></div>
      <div className="developer-monitoring-content" role="tabpanel">{tab === "data" && <DataRequests language={language} />}{tab === "backend" && <BackendRequests language={language} />}{tab === "storage" && <Storage language={language} showUnavailable={showUnavailable} />}</div>
    </section>
  </>}</DeveloperToolsPage>;
}
