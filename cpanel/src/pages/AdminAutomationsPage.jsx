import React from "react";
import { Filter, MoreHorizontal, Plus, Search, Sparkles, Workflow, Zap } from "lucide-react";
import { canManageTenantSettings } from "../utils/tenantManagement.js";
import {
  EmptyManagementState,
  ManagementHeader,
  ManagementShell,
  UnsupportedDialog,
  ml,
} from "./AdminManagementShared.jsx";

const templates = [
  { icon: Zap, en: "Follow up after a new order", ar: "المتابعة بعد طلب جديد", textEn: "Template — requires a supported messaging service.", textAr: "قالب — يتطلب خدمة مراسلة مدعومة." },
  { icon: Sparkles, en: "Welcome a new contact", ar: "الترحيب بجهة اتصال جديدة", textEn: "Template — no automation is currently active.", textAr: "قالب — لا توجد أتمتة نشطة حالياً." },
  { icon: Workflow, en: "Notify staff about a booking", ar: "إشعار الموظفين بالحجز", textEn: "Template — booking notifications are not connected.", textAr: "قالب — إشعارات الحجز غير متصلة." },
];

export default function AdminAutomationsPage({ activePage = "admin-automations", company, currentUser, language = "en", t, ...layout }) {
  const [tab, setTab] = React.useState("custom");
  const [query, setQuery] = React.useState("");
  const [unsupported, setUnsupported] = React.useState(false);
  const canManage = canManageTenantSettings(currentUser);
  const openUnavailable = () => setUnsupported(true);

  return (
    <ManagementShell activePage={activePage} company={company} currentUser={currentUser} language={language} {...layout}>
      <ManagementHeader
        actions={<><button aria-label={ml(language, "More actions", "المزيد من الإجراءات")} className="tenant-icon-button" onClick={openUnavailable} type="button"><MoreHorizontal size={19} /></button><button className="tenant-secondary-button" disabled={!canManage} onClick={openUnavailable} type="button">{ml(language, "Manage Quotas", "إدارة الحصص")}</button><button className="tenant-primary-button" disabled={!canManage} onClick={openUnavailable} type="button"><Plus size={17} />{ml(language, "Create Automation", "إنشاء أتمتة")}</button></>}
        description={ml(language, "Build repeatable workflows when supported services are available for this company.", "أنشئ تدفقات عمل قابلة للتكرار عند توفر الخدمات المدعومة لهذه الشركة.")}
        language={language}
        title={ml(language, "Automations", "الأتمتة")}
      />

      <section className="automation-suggestions">
        <div className="tenant-section-heading"><div><h2>{ml(language, "Suggested for you", "مقترح لك")}</h2><p>{ml(language, "Setup templates only — none are installed or connected.", "قوالب إعداد فقط — لا يوجد أي منها مثبت أو متصل.")}</p></div></div>
        <div className="automation-template-grid">{templates.map((item) => <article key={item.en}><span><item.icon size={22} /></span><div><small>{ml(language, "TEMPLATE · UNAVAILABLE", "قالب · غير متاح")}</small><h3>{ml(language, item.en, item.ar)}</h3><p>{ml(language, item.textEn, item.textAr)}</p></div><button onClick={openUnavailable} type="button">{ml(language, "View setup", "عرض الإعداد")}</button></article>)}</div>
      </section>

      <section className="tenant-management-card automation-table-card">
        <div className="tenant-section-heading"><div><h2>{ml(language, "Your automations", "عمليات الأتمتة الخاصة بك")}</h2><p>{ml(language, "No verified automation data source is connected.", "لا يوجد مصدر بيانات أتمتة موثّق متصل.")}</p></div></div>
        <div className="automation-toolbar">
          <div className="tenant-settings-tabs" role="tablist"><button aria-selected={tab === "custom"} className={tab === "custom" ? "active" : ""} onClick={() => setTab("custom")} role="tab" type="button">{ml(language, "Custom automations", "الأتمتة المخصصة")}</button><button aria-selected={tab === "app"} className={tab === "app" ? "active" : ""} onClick={() => setTab("app")} role="tab" type="button">{ml(language, "App automations", "أتمتة التطبيقات")}</button></div>
          <div><button className="tenant-secondary-button" onClick={openUnavailable} type="button"><Filter size={16} />{ml(language, "Filter", "تصفية")}</button><label className="tenant-management-search"><Search size={17} /><input onChange={(event) => setQuery(event.target.value)} placeholder={ml(language, "Search automations", "البحث في الأتمتة")} value={query} /></label></div>
        </div>
        <div className="automation-table-head" aria-hidden="true"><span>{ml(language, "Automation name", "اسم الأتمتة")}</span><span>{ml(language, "Status", "الحالة")}</span><span>{ml(language, "Trigger", "المشغّل")}</span><span>{ml(language, "Created by", "أنشأها")}</span><span>{ml(language, "Last edited by", "آخر تعديل بواسطة")}</span><span /></div>
        <EmptyManagementState
          description={tab === "custom" ? ml(language, "Create controls are unavailable until a tenant-scoped automation service is connected.", "عناصر الإنشاء غير متاحة حتى يتم ربط خدمة أتمتة ضمن نطاق الشركة.") : ml(language, "Recommended templates appear above, but no app automation is installed.", "تظهر القوالب المقترحة أعلاه، لكن لا توجد أتمتة تطبيق مثبتة.")}
          icon={Workflow}
          title={ml(language, query ? "No matching automations" : "No automations yet", query ? "لا توجد أتمتة مطابقة" : "لا توجد أتمتة بعد")}
        />
      </section>
      {unsupported && <UnsupportedDialog language={language} onClose={() => setUnsupported(false)} t={t} />}
    </ManagementShell>
  );
}
