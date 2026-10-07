import React from "react";
import { KeyRound, Plus, Search, ShieldCheck } from "lucide-react";
import { DeveloperPageHeader, DeveloperToolsPage, DeveloperUnavailable, ml } from "./AdminDeveloperToolsShared.jsx";

export default function AdminSecretsManagerPage({ activePage, company, language = "en", onNavigate, ...layout }) {
  return <DeveloperToolsPage activePage={activePage} company={company} language={language} onNavigate={onNavigate} {...layout}>{(showUnavailable) => <>
    <DeveloperPageHeader actions={<button className="developer-tools-primary-button" onClick={showUnavailable} type="button"><Plus size={17} />{ml(language, "Add Secret", "إضافة سر")}</button>} description={ml(language, "Manage secure third-party configuration through verified server-side storage.", "أدر إعدادات الجهات الخارجية الآمنة عبر تخزين موثق من جهة الخادم.")} language={language} onNavigate={onNavigate} title={ml(language, "Secrets Manager", "مدير الأسرار")} />
    <section className="developer-secrets-card">
      <div className="developer-secrets-toolbar"><div><h2>{ml(language, "Secrets", "الأسرار")}</h2><span>{ml(language, "Count unavailable", "العدد غير متاح")}</span></div><label className="developer-tools-search"><Search size={18} /><input disabled placeholder={ml(language, "Search secrets", "البحث في الأسرار")} /></label></div>
      <div className="developer-secrets-stage"><DeveloperUnavailable icon={KeyRound} title={ml(language, "Secure secret storage is not connected", "تخزين الأسرار الآمن غير متصل")} description={ml(language, "Secret names and values are not requested or stored in this frontend. Add a verified server-side secrets service to manage configuration safely.", "لا يتم طلب أسماء الأسرار أو قيمها أو تخزينها في هذه الواجهة. أضف خدمة أسرار موثقة من جهة الخادم لإدارة الإعدادات بأمان.")} /><div className="developer-tools-note"><ShieldCheck size={18} /><span>{ml(language, "Secret values never belong in browser state or local storage.", "قيم الأسرار لا مكان لها في حالة المتصفح أو التخزين المحلي.")}</span></div></div>
    </section>
  </>}</DeveloperToolsPage>;
}
