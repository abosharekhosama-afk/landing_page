import React from "react";
import { Award, ExternalLink, Gift, HeartHandshake, Play, Settings2, Sparkles, Star, X } from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import { AdminUnderDevelopmentContent } from "./AdminPlaceholderPage.jsx";

const T = {
  en: {
    action: "Set Up Loyalty",
    benefitOne: "Reward returning customers with points and perks",
    benefitThree: "Offer exclusive discounts to loyalty members",
    benefitTwo: "Create tiered rewards to increase engagement",
    description: "Configure earning and reward rules before presenting a loyalty program to customers.",
    earn: "Define earning rules",
    learn: "Learn How It Works",
    reward: "Configure real rewards",
    setupBanner: "No loyalty plan is currently active. Set up your program to start rewarding customers.",
    start: "Start Now",
    subtitle: "Prepare a customer loyalty experience",
    title: "Loyalty Program",
  },
  ar: {
    action: "إعداد الولاء",
    benefitOne: "كافئ العملاء العائدين بالنقاط والمزايا",
    benefitThree: "تقديم خصومات حصرية لأعضاء الولاء",
    benefitTwo: "إنشاء مكافآت متدرجة لزيادة التفاعل",
    description: "قم بإعداد قواعد الكسب والمكافآت قبل عرض برنامج ولاء للعملاء.",
    earn: "تحديد قواعد الكسب",
    learn: "اعرف كيف يعمل",
    reward: "إعداد المكافآت الحقيقية",
    setupBanner: "لا توجد خطة ولاء نشطة حالياً. قم بإعداد برنامجك لبدء مكافأة العملاء.",
    start: "ابدأ الآن",
    subtitle: "جهّز تجربة ولاء للعملاء",
    title: "برنامج الولاء",
  },
};

export default function AdminLoyaltyPage({ language = "en", t: translate, ...layout }) {
  const [open, setOpen] = React.useState(false);
  const labels = T[language] || T.en;
  const ar = language === "ar";

  return (
    <AdminLayout activePage="admin-loyalty" hideHeader language={language} t={translate} {...layout}>
      <div className="customer-leads-page customer-loyalty-page" dir={ar ? "rtl" : "ltr"}>
        <header>
          <div><h1>{labels.title}</h1><p>{labels.subtitle}</p></div>
        </header>

        <section className="loyalty-setup-banner"><Sparkles size={16}/><span>{labels.setupBanner}</span><button onClick={() => setOpen(true)} type="button">{labels.action}</button></section>

        <section className="loyalty-setup-panel">
          <div className="loyalty-setup-copy">
            <span className="customer-leads-eyebrow"><Award size={15}/>{labels.title}</span>
            <h2>{labels.action}</h2>
            <p>{labels.description}</p>
            <ul className="loyalty-benefits">
              <li><Star size={18}/>{labels.benefitOne}</li>
              <li><Gift size={18}/>{labels.benefitTwo}</li>
              <li><Settings2 size={18}/>{labels.benefitThree}</li>
            </ul>
            <div className="loyalty-actions">
              <button className="customers-primary-button" onClick={() => setOpen(true)} type="button"><Play size={16}/>{labels.start}</button>
              <button className="customers-secondary-button" onClick={() => setOpen(true)} type="button"><ExternalLink size={16}/>{labels.learn}</button>
            </div>
          </div>
          <div className="customer-leads-illustration loyalty-illustration"><span/><span/><HeartHandshake size={62}/></div>
        </section>
      </div>
      {open && <div className="customers-modal-backdrop" onMouseDown={() => setOpen(false)} role="presentation"><div aria-modal="true" className="customers-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog"><button aria-label="Close" onClick={() => setOpen(false)} type="button"><X size={18}/></button><AdminUnderDevelopmentContent t={translate}/></div></div>}
    </AdminLayout>
  );
}
