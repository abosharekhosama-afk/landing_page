import React from "react";
import { GitBranch, Layout, ListTodo, Target, Workflow, X } from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import { AdminUnderDevelopmentContent } from "./AdminPlaceholderPage.jsx";

const TEMPLATES = [
  { icon: GitBranch, key: "lead", titleEn: "Lead Management", titleAr: "إدارة العملاء المحتملين", descEn: "Track leads from first contact to qualified opportunity", descAr: "تتبع العملاء المحتملين من أول اتصال إلى فرصة مؤهلة" },
  { icon: Workflow, key: "sales", titleEn: "Sales Pipeline", titleAr: "مسار المبيعات", descEn: "Move deals through stages from negotiation to close", descAr: "نقل الصفقات عبر المراحل من التفاوض إلى الإغلاق" },
  { icon: Layout, key: "project", titleEn: "Project Tracker", titleAr: "متعقب المشاريع", descEn: "Organize tasks, milestones, and project deliverables", descAr: "تنظيم المهام والمعالم الرئيسية وتسليمات المشروع" },
  { icon: ListTodo, key: "todo", titleEn: "To-Do Tasks", titleAr: "قائمة المهام", descEn: "Simple checklist to track daily tasks and priorities", descAr: "قائمة مهام بسيطة لتتبع المهام اليومية والأولويات" },
  { icon: Target, key: "scratch", titleEn: "Start from Scratch", titleAr: "ابدأ من الصفر", descEn: "Build a custom pipeline with your own stages", descAr: "إنشاء مسار مخصص بمراحلك الخاصة" },
];

const T = {
  en: {
    action: "Create Pipeline",
    description: "Choose a template to start building your workflow.",
    subtitle: "Organize and track customer progress",
    title: "Pipelines",
    template: "Templates",
    templateSub: "Preview templates — no pipeline is created until you finish setup.",
  },
  ar: {
    action: "إنشاء مسار",
    description: "اختر قالباً لبدء بناء سير العمل الخاص بك.",
    subtitle: "تنظيم وتتبع تقدم العملاء",
    title: "المسارات",
    template: "القوالب",
    templateSub: "معاينة القوالب — لا يتم إنشاء أي مسار حتى تنتهي من الإعداد.",
  },
};

export default function AdminPipelinesPage({ language = "en", t: translate, ...layout }) {
  const [open, setOpen] = React.useState(false);
  const labels = T[language] || T.en;
  const ar = language === "ar";

  return (
    <AdminLayout activePage="admin-pipelines" hideHeader language={language} t={translate} {...layout}>
      <div className="customer-leads-page customer-pipelines-page" dir={ar ? "rtl" : "ltr"}>
        <header>
          <div><h1>{labels.title}</h1><p>{labels.subtitle}</p></div>
        </header>

        <section className="pipelines-board-panel">
          <div className="pipelines-toolbar"><span className="pipelines-toolbar-title"><Workflow size={17}/>{labels.template}</span><span className="pipelines-toolbar-sub">{labels.templateSub}</span></div>
          <div className="pipelines-template-grid">
            {TEMPLATES.map((tmpl) => {
              const Icon = tmpl.icon;
              return <article className="pipelines-template-card" key={tmpl.key}>
                <div className="pipelines-template-preview"><Icon size={28}/></div>
                <h3>{ar ? tmpl.titleAr : tmpl.titleEn}</h3>
                <p>{ar ? tmpl.descAr : tmpl.descEn}</p>
                <button className="customers-secondary-button" onClick={() => setOpen(true)} type="button">{labels.action}</button>
              </article>;
            })}
          </div>
        </section>
      </div>
      {open && <div className="customers-modal-backdrop" onMouseDown={() => setOpen(false)} role="presentation"><div aria-modal="true" className="customers-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog"><button aria-label="Close" onClick={() => setOpen(false)} type="button"><X size={18}/></button><AdminUnderDevelopmentContent t={translate}/></div></div>}
    </AdminLayout>
  );
}
