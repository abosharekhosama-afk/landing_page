import React, { useState } from "react";
import { ChevronDown, Cloud, Link2, ShieldCheck } from "lucide-react";
import { DeveloperPageHeader, DeveloperToolsPage, ml } from "./AdminDeveloperToolsShared.jsx";

function IntegrationCard({ children, description, icon: Icon, language, title }) {
  const [expanded, setExpanded] = useState(true);
  return <section className="developer-integration-card">
    <button aria-expanded={expanded} className="developer-integration-summary" onClick={() => setExpanded((value) => !value)} type="button">
      <span className="developer-integration-title"><span><Icon size={22} /></span><span><strong>{title}</strong><small>{description}</small></span></span>
      <span className="developer-integration-status">{ml(language, "Not connected", "غير متصل")}<ChevronDown className={expanded ? "open" : ""} size={18} /></span>
    </button>
    {expanded && <div className="developer-integration-body">{children}</div>}
  </section>;
}

export default function AdminAdvancedLogToolsPage({ activePage, company, language = "en", onNavigate, ...layout }) {
  return <DeveloperToolsPage activePage={activePage} company={company} language={language} onNavigate={onNavigate} {...layout}>
    {(showUnavailable) => <>
      <DeveloperPageHeader
        breadcrumbs={[{ label: ml(language, "Logging Tools", "أدوات التسجيل"), page: "admin-developer-site-logs" }, { label: ml(language, "Advanced Log Tools", "أدوات السجل المتقدمة") }]}
        description={ml(language, "Review optional server-managed destinations for tenant logs.", "راجع الوجهات الاختيارية المُدارة من الخادم لسجلات المستأجر.")}
        language={language}
        onNavigate={onNavigate}
        title={ml(language, "Advanced Log Tools", "أدوات السجل المتقدمة")}
      />
      <div className="developer-integrations-stack">
        <IntegrationCard description={ml(language, "Forward tenant logs to a verified cloud destination.", "إرسال سجلات المستأجر إلى وجهة سحابية موثقة.")} icon={Cloud} language={language} title={ml(language, "Cloud logging integration", "تكامل التسجيل السحابي")}>
          <p>{ml(language, "No server-managed cloud logging connection is configured for this company.", "لا يوجد اتصال تسجيل سحابي مُدار من الخادم ومهيأ لهذه الشركة.")}</p>
          <div className="developer-tools-note"><ShieldCheck size={18} /><span>{ml(language, "Connections require secure server-side configuration. Credentials are never collected here.", "تتطلب الاتصالات إعداداً آمناً من جهة الخادم. لا يتم جمع بيانات الاعتماد هنا.")}</span></div>
          <button className="developer-tools-primary-button" onClick={showUnavailable} type="button">{ml(language, "Connect", "اتصال")}</button>
        </IntegrationCard>
        <IntegrationCard description={ml(language, "Send logs to an approved third-party endpoint.", "إرسال السجلات إلى نقطة نهاية خارجية معتمدة.")} icon={Link2} language={language} title={ml(language, "Third-party logging endpoint", "نقطة نهاية تسجيل خارجية")}>
          <label className="developer-endpoint-field"><span>{ml(language, "Endpoint URL", "عنوان نقطة النهاية")}</span><input disabled placeholder="https://" type="url" /></label>
          <p>{ml(language, "Endpoint saving is unavailable until a verified server-side integration exists.", "حفظ نقطة النهاية غير متاح حتى يتوفر تكامل موثق من جهة الخادم.")}</p>
          <button className="developer-tools-primary-button" onClick={showUnavailable} type="button">{ml(language, "Connect", "اتصال")}</button>
        </IntegrationCard>
      </div>
    </>}
  </DeveloperToolsPage>;
}
