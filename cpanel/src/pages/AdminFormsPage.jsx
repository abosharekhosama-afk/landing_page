import React from "react";
import { ClipboardList, FilePlus2, Filter, Inbox, Search, X } from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import { AdminUnderDevelopmentContent } from "./AdminPlaceholderPage.jsx";

const T = {
  en: {
    action: "Create Form",
    createStandalone: "Create Standalone Form",
    createWebsite: "Create Website Form",
    description: "Create forms and review real customer submissions when form storage is available.",
    empty: "No forms or submissions yet",
    filter: "Filter",
    forms: "Forms",
    planUnavailable: "Form plan information is unavailable.",
    search: "Search forms",
    submissions: "Submissions",
    subtitle: "Manage forms and customer submissions",
    title: "Forms & Submissions",
  },
  ar: {
    action: "إنشاء نموذج",
    createStandalone: "إنشاء نموذج مستقل",
    createWebsite: "إنشاء نموذج للموقع",
    description: "أنشئ النماذج وراجع طلبات العملاء الحقيقية عند توفر تخزين النماذج.",
    empty: "لا توجد نماذج أو طلبات بعد",
    filter: "تصفية",
    forms: "النماذج",
    planUnavailable: "معلومات خطة النماذج غير متوفرة.",
    search: "البحث في النماذج",
    submissions: "الطلبات",
    subtitle: "إدارة النماذج وطلبات العملاء",
    title: "النماذج والطلبات",
  },
};

export default function AdminFormsPage({ language = "en", t: translate, ...layout }) {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState("forms");
  const labels = T[language] || T.en;
  const ar = language === "ar";

  return (
    <AdminLayout activePage="admin-forms" hideHeader language={language} t={translate} {...layout}>
      <div className="customer-leads-page customer-forms-page" dir={ar ? "rtl" : "ltr"}>
        <header>
          <div><h1>{labels.title}</h1><p>{labels.subtitle}</p></div>
          <button className="customers-primary-button" onClick={() => setOpen(true)} type="button"><FilePlus2 size={16}/>{labels.action}</button>
        </header>

        <section className="forms-plan-strip"><ClipboardList size={16}/><span>{labels.planUnavailable}</span></section>

        <section className="forms-workspace-panel">
          <div className="forms-panel-tabs">
            <button className={tab === "forms" ? "active" : ""} onClick={() => setTab("forms")} type="button"><ClipboardList size={16}/>{labels.forms}<span>0</span></button>
            <button className={tab === "submissions" ? "active" : ""} onClick={() => setTab("submissions")} type="button"><Inbox size={16}/>{labels.submissions}<span>0</span></button>
            <div className="forms-toolbar-actions"><button className="customers-secondary-button" onClick={() => setOpen(true)} type="button"><Filter size={15}/>{labels.filter}</button><label className="forms-search"><Search size={16}/><input aria-label={labels.search} placeholder={labels.search} /></label></div>
          </div>
          <div className="forms-empty-layout">
            <div className="customer-leads-illustration forms-illustration"><span/><span/><ClipboardList size={47}/></div>
            <h2>{labels.empty}</h2>
            <p>{labels.description}</p>
            <div className="forms-empty-actions">
              <button className="customers-primary-button" onClick={() => setOpen(true)} type="button"><FilePlus2 size={16}/>{labels.createWebsite}</button>
              <button className="customers-secondary-button" onClick={() => setOpen(true)} type="button"><FilePlus2 size={16}/>{labels.createStandalone}</button>
            </div>
          </div>
        </section>
      </div>
      {open && <div className="customers-modal-backdrop" onMouseDown={() => setOpen(false)} role="presentation"><div aria-modal="true" className="customers-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog"><button aria-label="Close" onClick={() => setOpen(false)} type="button"><X size={18}/></button><AdminUnderDevelopmentContent t={translate}/></div></div>}
    </AdminLayout>
  );
}
