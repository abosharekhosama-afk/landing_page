import React from "react";
import { Filter, Pause, Search, TerminalSquare } from "lucide-react";
import { DeveloperPageHeader, DeveloperToolsPage, DeveloperUnavailable, ml } from "./AdminDeveloperToolsShared.jsx";
import { getCompanyStorefrontUrl } from "../utils/developerTools.js";

export default function AdminSiteLogsPage({ activePage, company, language = "en", onNavigate, ...layout }) {
  const storefrontUrl = getCompanyStorefrontUrl(company);
  return (
    <DeveloperToolsPage activePage={activePage} company={company} language={language} onNavigate={onNavigate} {...layout}>
      {(showUnavailable) => <>
        <DeveloperPageHeader
          actions={<button className="developer-tools-secondary-button" onClick={() => onNavigate("admin-developer-advanced-log-tools")} type="button">{ml(language, "Advanced Log Tools", "أدوات السجل المتقدمة")}</button>}
          breadcrumbs={[{ label: ml(language, "Logging Tools", "أدوات التسجيل") }, { label: ml(language, "Site Logs", "سجلات الموقع") }]}
          description={ml(language, "Inspect live storefront and application events when a tenant logging connection is available.", "افحص أحداث المتجر والتطبيق المباشرة عند توفر اتصال تسجيل خاص بالمستأجر.")}
          language={language}
          onNavigate={onNavigate}
          title={ml(language, "Site Logs", "سجلات الموقع")}
        />
        <section className="developer-logs-card">
          <div className="developer-logs-toolbar" aria-label={ml(language, "Log controls", "عناصر تحكم السجل")}>
            <select aria-label={ml(language, "Stream", "التدفق")} disabled><option>{ml(language, "All streams", "كل التدفقات")}</option></select>
            <select aria-label={ml(language, "Level", "المستوى")} disabled><option>{ml(language, "All levels", "كل المستويات")}</option></select>
            <button aria-label={ml(language, "Advanced filters", "عوامل تصفية متقدمة")} className="developer-tools-icon-button" disabled type="button"><Filter size={18} /></button>
            <label className="developer-tools-search"><Search size={18} /><input aria-label={ml(language, "Search logs", "البحث في السجلات")} disabled placeholder={ml(language, "Search logs", "البحث في السجلات")} /></label>
            <button className="developer-tools-text-button" disabled type="button">{ml(language, "Clear", "مسح")}</button>
            <button className="developer-tools-secondary-button" disabled type="button"><Pause size={16} />{ml(language, "Pause", "إيقاف مؤقت")}</button>
          </div>
          <div className="developer-logs-stage">
            <DeveloperUnavailable
              description={ml(language, "No verified tenant logging endpoint is available. Real-time site log streaming is not connected.", "لا تتوفر نقطة نهاية موثقة لسجلات المستأجر. بث سجلات الموقع في الوقت الفعلي غير متصل.")}
              icon={TerminalSquare}
              title={ml(language, "Site logs are unavailable", "سجلات الموقع غير متاحة")}
            />
            <div className="developer-tools-empty-actions">
              {storefrontUrl ? <a className="developer-tools-primary-button" href={storefrontUrl} rel="noreferrer" target="_blank">{ml(language, "Open Storefront", "فتح المتجر")}</a> : <button className="developer-tools-primary-button" onClick={showUnavailable} type="button">{ml(language, "Open Storefront", "فتح المتجر")}</button>}
              <button className="developer-tools-secondary-button" onClick={showUnavailable} type="button">{ml(language, "Open Preview", "فتح المعاينة")}</button>
            </div>
          </div>
        </section>
      </>}
    </DeveloperToolsPage>
  );
}
