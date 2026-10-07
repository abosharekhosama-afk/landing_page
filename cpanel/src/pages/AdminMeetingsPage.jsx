import React from "react";
import { CalendarClock, Clock3, ExternalLink, Play, Video, X } from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import { AdminUnderDevelopmentContent } from "./AdminPlaceholderPage.jsx";

const T = {
  en: {
    action: "Set Up Meetings",
    benefits: ["Share your availability with customers", "Let clients book directly from your site", "Sync with your calendar automatically"],
    description: "Configure scheduling before accepting customer meetings. No appointment status is assumed.",
    getStarted: "Get Started",
    learnMore: "Learn More",
    setupBanner: "No scheduling service is currently connected. Set up meetings to accept customer bookings.",
    subtitle: "Schedule and manage customer meetings",
    title: "Meetings",
  },
  ar: {
    action: "إعداد الاجتماعات",
    benefits: ["شارك أوقات التوفر مع العملاء", "دع العملاء يحجزون مباشرة من موقعك", "تزامن مع تقويمك تلقائياً"],
    description: "قم بإعداد الجدولة قبل قبول اجتماعات العملاء. لا يتم افتراض وجود مواعيد.",
    getStarted: "ابدأ الآن",
    learnMore: "اعرف المزيد",
    setupBanner: "لا توجد خدمة جدولة متصلة حالياً. قم بإعداد الاجتماعات لاستقبال حجوزات العملاء.",
    subtitle: "جدولة وإدارة اجتماعات العملاء",
    title: "الاجتماعات",
  },
};

export default function AdminMeetingsPage({ language = "en", t: translate, ...layout }) {
  const [open, setOpen] = React.useState(false);
  const labels = T[language] || T.en;
  const ar = language === "ar";

  return (
    <AdminLayout activePage="admin-meetings" hideHeader language={language} t={translate} {...layout}>
      <div className="customer-leads-page customer-meetings-page" dir={ar ? "rtl" : "ltr"}>
        <header>
          <div><h1>{labels.title}</h1><p>{labels.subtitle}</p></div>
        </header>

        <section className="meetings-setup-banner"><CalendarClock size={16}/><span>{labels.setupBanner}</span><button onClick={() => setOpen(true)} type="button">{labels.action}</button></section>

        <section className="meetings-setup-panel">
          <div className="meetings-copy">
            <span className="customer-leads-eyebrow"><Video size={15}/>{labels.title}</span>
            <h2>{labels.action}</h2>
            <p>{labels.description}</p>
            <ul>{labels.benefits.map((benefit) => <li key={benefit}><Clock3 size={18}/>{benefit}</li>)}</ul>
            <div className="meetings-actions">
              <button className="customers-primary-button" onClick={() => setOpen(true)} type="button"><Play size={16}/>{labels.getStarted}</button>
              <button className="customers-secondary-button" onClick={() => setOpen(true)} type="button"><ExternalLink size={16}/>{labels.learnMore}</button>
            </div>
          </div>
          <div className="customer-leads-illustration meetings-illustration"><span/><span/><CalendarClock size={61}/></div>
        </section>
      </div>
      {open && <div className="customers-modal-backdrop" onMouseDown={() => setOpen(false)} role="presentation"><div aria-modal="true" className="customers-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog"><button aria-label="Close" onClick={() => setOpen(false)} type="button"><X size={18}/></button><AdminUnderDevelopmentContent t={translate}/></div></div>}
    </AdminLayout>
  );
}
