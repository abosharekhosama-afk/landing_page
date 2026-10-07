import React from "react";
import { BookOpen, Globe, MessageCircle, ShieldCheck, Users, Zap, X } from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import { AdminUnderDevelopmentContent } from "./AdminPlaceholderPage.jsx";

const RECOMMENDED = [
  { icon: MessageCircle, en: "Discussion Boards", ar: "لوحات النقاش", descEn: "Let customers start conversations in dedicated topic areas", descAr: "اسمح للعملاء ببدء محادثات في مجالات مواضيع مخصصة" },
  { icon: ShieldCheck, en: "Member Moderation", ar: "إدارة الأعضاء", descEn: "Auto-moderation and manual review to keep discussions healthy", descAr: "إدارة تلقائية ومراجعة يدوية للحفاظ على صحة النقاشات" },
];

const APPS = [
  { icon: BookOpen, en: "Knowledge Base", ar: "قاعدة المعرفة", descEn: "Create help articles and FAQs for your community", descAr: "أنشئ مقالات مساعدة وأسئلة شائعة لمجتمعك" },
  { icon: Zap, en: "Automation Rules", ar: "قواعد الأتمتة", descEn: "Auto-assign badges, send welcome messages, and more", descAr: "تعيين الشارات تلقائياً، إرسال رسائل ترحيبية، والمزيد" },
];

const T = {
  en: {
    action: "Set Up Community",
    description: "Create a branded space for customer discussions when community services become available.",
    invite: "Invite Members",
    learning: "Learning & Resources",
    recommended: "Recommended capabilities",
    resources: "Setup guides, best practices, and API documentation will be available here.",
    setupCards: "Choose a setup path for your community",
    statistics: "Community status",
    statisticsDesc: "Community statistics will appear here after setup.",
    subtitle: "Bring customers together around your business",
    title: "Community",
  },
  ar: {
    action: "إعداد المجتمع",
    description: "أنشئ مساحة تحمل هوية شركتك لنقاشات العملاء عند توفر خدمات المجتمع.",
    invite: "دعوة الأعضاء",
    learning: "التعلم والموارد",
    recommended: "الإمكانيات الموصى بها",
    resources: "ستتوفر أدلة الإعداد وأفضل الممارسات ووثائق API هنا.",
    setupCards: "اختر مسار إعداد لمجتمعك",
    statistics: "حالة المجتمع",
    statisticsDesc: "ستظهر إحصائيات المجتمع هنا بعد الإعداد.",
    subtitle: "اجمع العملاء حول نشاطك التجاري",
    title: "المجتمع",
  },
};

export default function AdminCommunityPage({ language = "en", t: translate, ...layout }) {
  const [open, setOpen] = React.useState(false);
  const labels = T[language] || T.en;
  const ar = language === "ar";

  return (
    <AdminLayout activePage="admin-community" hideHeader language={language} t={translate} {...layout}>
      <div className="customer-leads-page customer-community-page" dir={ar ? "rtl" : "ltr"}>
        <header>
          <div><h1>{labels.title}</h1><p>{labels.subtitle}</p></div>
          <button className="customers-primary-button" onClick={() => setOpen(true)} type="button"><Users size={16}/>{labels.invite}</button>
        </header>

        <section className="community-hero-panel">
          <section className="community-setup-cards">
            <h2>{labels.setupCards}</h2>
            <div className="community-setup-grid">
              {RECOMMENDED.map((item) => {
                const Icon = item.icon;
                return <article className="community-setup-card" key={item.en}><Icon size={24}/><strong>{ar ? item.ar : item.en}</strong><p>{ar ? item.descAr : item.descEn}</p><button className="customers-secondary-button" onClick={() => setOpen(true)} type="button">{labels.action}</button></article>;
              })}
            </div>
          </section>

          <section className="community-stats-panel"><Users size={20}/><div><strong>{labels.statistics}</strong><p>{labels.statisticsDesc}</p></div></section>

          <section className="community-apps-section"><h2>{labels.recommended}</h2><div className="community-apps-grid">{APPS.map((app) => { const Icon = app.icon; return <article key={app.en}><Icon size={20}/><strong>{ar ? app.ar : app.en}</strong><p>{ar ? app.descAr : app.descEn}</p><button className="customers-icon-button" onClick={() => setOpen(true)} type="button"><Zap size={16}/></button></article>; })}</div></section>

          <section className="community-learning-section"><h2>{labels.learning}</h2><p>{labels.resources}</p></section>
        </section>
      </div>
      {open && <div className="customers-modal-backdrop" onMouseDown={() => setOpen(false)} role="presentation"><div aria-modal="true" className="customers-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog"><button aria-label="Close" onClick={() => setOpen(false)} type="button"><X size={18}/></button><AdminUnderDevelopmentContent t={translate}/></div></div>}
    </AdminLayout>
  );
}
