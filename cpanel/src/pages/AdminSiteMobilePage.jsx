import React from "react";
import {
  Accessibility,
  Activity,
  ArrowUpRight,
  BadgeCheck,
  Brush,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  CircleHelp,
  Cloud,
  Database,
  Eye,
  ExternalLink,
  Gauge,
  Globe2,
  Image,
  Laptop,
  Link2,
  LockKeyhole,
  MapPinned,
  MonitorSmartphone,
  Palette,
  RefreshCw,
  SearchCheck,
  Server,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import { AdminUnderDevelopmentContent } from "./AdminPlaceholderPage.jsx";
import {
  canViewSiteMobile,
  confirmedSiteFacts,
  resolveSiteMobileDestination,
  siteMobileDirection,
  suggestedLinkSlug,
} from "../utils/siteMobile.js";

const copy = {
  en: {
    accessDenied: "You do not have access to this company section.",
    brandDescription: "Keep the company identity consistent across customer-facing experiences.",
    brandTitle: "Logo & Brand",
    close: "Close",
    connectDomain: "Connect domain",
    content: "Website content",
    direction: "Text direction",
    domain: "Domain",
    editSite: "Edit Site",
    language: "Language",
    linkDescription: "Create a focused page for the links your audience needs most.",
    linkTitle: "Hopp – Link in Bio",
    manageBrand: "Manage brand settings",
    manageContent: "Manage website content",
    mobileDescription: "Prepare a mobile experience connected to this company.",
    mobileTitle: "Mobile App",
    noConfirmedData: "No confirmed data is available yet.",
    notAssigned: "Not assigned",
    notAvailable: "Unavailable",
    openStorefront: "View website",
    overviewDescription: "Manage the company website, performance tools, security, and mobile presence.",
    overviewTitle: "Website Overview",
    securityDescription: "Review confirmed availability and security information when monitoring is connected.",
    securityTitle: "Uptime & Security",
    settings: "Settings",
    setup: "Set up",
    setupMobile: "Set up mobile experience",
    siteSpeedDescription: "Check verified performance information when a site-speed source is connected.",
    siteSpeedTitle: "Site Speed",
    suggestedOnly: "Suggested from your company slug. This address is not reserved or active.",
    unavailableDescription: "This workspace does not currently receive verified results for this feature.",
    websiteDescription: "Manage the public website address, editing tools, and customer-facing content.",
    websiteTitle: "Website",
  },
  ar: {
    accessDenied: "ليس لديك صلاحية للوصول إلى هذا القسم الخاص بالشركة.",
    brandDescription: "حافظ على اتساق هوية الشركة في جميع تجارب العملاء.",
    brandTitle: "الشعار والهوية",
    close: "إغلاق",
    connectDomain: "ربط النطاق",
    content: "محتوى الموقع",
    direction: "اتجاه النص",
    domain: "النطاق",
    editSite: "تحرير الموقع",
    language: "اللغة",
    linkDescription: "أنشئ صفحة مركزة للروابط الأكثر أهمية لجمهورك.",
    linkTitle: "Hopp – رابط السيرة",
    manageBrand: "إدارة إعدادات الهوية",
    manageContent: "إدارة محتوى الموقع",
    mobileDescription: "جهّز تجربة جوال مرتبطة بهذه الشركة.",
    mobileTitle: "تطبيق الجوال",
    noConfirmedData: "لا تتوفر بيانات مؤكدة حتى الآن.",
    notAssigned: "غير معيّن",
    notAvailable: "غير متاح",
    openStorefront: "عرض الموقع",
    overviewDescription: "أدر موقع الشركة وأدوات الأداء والأمان وحضور الجوال.",
    overviewTitle: "نظرة عامة على الموقع",
    securityDescription: "راجع معلومات التوفر والأمان المؤكدة عند ربط خدمة المراقبة.",
    securityTitle: "التوفر والأمان",
    settings: "الإعدادات",
    setup: "إعداد",
    setupMobile: "إعداد تجربة الجوال",
    siteSpeedDescription: "راجع معلومات الأداء الموثقة عند ربط مصدر لسرعة الموقع.",
    siteSpeedTitle: "سرعة الموقع",
    suggestedOnly: "اقتراح مستند إلى معرّف الشركة فقط. هذا العنوان غير محجوز أو مفعّل.",
    unavailableDescription: "لا تستقبل مساحة العمل حالياً نتائج موثقة لهذه الميزة.",
    websiteDescription: "أدر عنوان الموقع العام وأدوات التحرير والمحتوى الموجّه للعملاء.",
    websiteTitle: "الموقع",
  },
};

const pageMeta = {
  "admin-tenant-placeholder-site-overview": ["overviewTitle", "overviewDescription"],
  "admin-tenant-placeholder-site-website": ["websiteTitle", "websiteDescription"],
  "admin-tenant-placeholder-site-speed": ["siteSpeedTitle", "siteSpeedDescription"],
  "admin-tenant-placeholder-site-security": ["securityTitle", "securityDescription"],
  "admin-tenant-placeholder-site-mobile-app": ["mobileTitle", "mobileDescription"],
  "admin-tenant-placeholder-site-logo-brand": ["brandTitle", "brandDescription"],
  "admin-tenant-placeholder-site-link-in-bio": ["linkTitle", "linkDescription"],
};

function PageHeader({ description, title, children }) {
  return (
    <header className="site-mobile-page-header" data-site-mobile-page-header>
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children && <div className="site-mobile-header-actions">{children}</div>}
    </header>
  );
}

function SiteIllustration({ type }) {
  return (
    <div aria-hidden="true" className={`site-mobile-illustration site-mobile-illustration-${type}`}>
      <span className="site-mobile-illustration-orbit" />
      <span className="site-mobile-illustration-window">
        <i />
        <b />
        <em />
      </span>
      <span className="site-mobile-illustration-accent" />
    </div>
  );
}

function UnsupportedDialog({ onClose, t, text }) {
  React.useEffect(() => {
    const close = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose]);

  return (
    <div className="site-mobile-modal-backdrop" onMouseDown={onClose} role="presentation">
      <div
        aria-modal="true"
        className="site-mobile-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button aria-label={text.close} className="site-mobile-modal-close" onClick={onClose} type="button">
          <X size={18} />
        </button>
        <AdminUnderDevelopmentContent t={t} />
      </div>
    </div>
  );
}

function BrowserPreview({ facts, text }) {
  return (
    <div className="site-mobile-browser-preview">
      <div className="site-mobile-browser-bar"><i /><i /><i /><span>{facts.storefrontUrl || text.notAssigned}</span></div>
      <div className="site-mobile-browser-body">
        {facts.logoUrl ? <img alt="" src={facts.logoUrl} /> : <span>{(facts.companyName || "?").slice(0, 2).toUpperCase()}</span>}
        <strong>{facts.companyName || text.notAssigned}</strong>
        <small>{facts.storefrontUrl || text.noConfirmedData}</small>
      </div>
    </div>
  );
}

function bi(language, en, ar) {
  return language === "ar" ? ar : en;
}

function UnavailableValue({ text }) {
  return <span className="site-mobile-unavailable-value">{text.notAvailable}</span>;
}

function OverviewSection({ action, children, description, go, icon: Icon, text, title, unsupported }) {
  return (
    <section className="site-overview-section-card">
      <header>
        <span><Icon size={20} /></span>
        <div><h2>{title}</h2><p>{description}</p></div>
        <button aria-label={title} onClick={() => go(action, unsupported)} type="button"><ChevronRight size={18} /></button>
      </header>
      {children}
      <footer><button onClick={() => go(action, unsupported)} type="button">{text.setup}<ArrowUpRight size={14} /></button></footer>
    </section>
  );
}

function OverviewPage({ facts, go, language, text, unsupported }) {
  return (
    <div className="site-overview-dashboard">
      <section className="site-overview-summary-card">
        <div className="site-overview-summary-copy">
          <span className="site-mobile-eyebrow"><MonitorSmartphone size={15} />{facts.companyName || text.websiteTitle}</span>
          <div className="site-overview-company-identity">
            <span>{facts.logoUrl ? <img alt="" src={facts.logoUrl} /> : (facts.companyName || "?").slice(0, 2).toUpperCase()}</span>
            <div><strong>{facts.companyName || text.notAssigned}</strong><small>{facts.domain || facts.storefrontUrl || text.notAssigned}</small></div>
          </div>
          <h2>{bi(language, "Your website", "موقعك الإلكتروني")}</h2>
          <p>{facts.storefrontUrl || bi(language, "Connect a storefront or domain to complete this website overview.", "اربط واجهة متجر أو نطاقاً لإكمال نظرة الموقع.")}</p>
          <div className="site-mobile-action-row">
            <button className="admin-primary-button" onClick={() => go("editSite", unsupported)} type="button"><Brush size={16} />{text.editSite}</button>
            <button className="secondary-action" onClick={() => go("website", unsupported)} type="button"><Globe2 size={16} />{bi(language, "Manage Website", "إدارة الموقع")}</button>
            <button className="secondary-action" onClick={() => go("settings", unsupported)} type="button"><Settings size={16} />{text.settings}</button>
            {facts.storefrontUrl && <a className="secondary-action" href={facts.storefrontUrl} rel="noreferrer" target="_blank"><ExternalLink size={16} />{text.openStorefront}</a>}
          </div>
        </div>
        <BrowserPreview facts={facts} text={text} />
      </section>

      <div className="site-overview-sections-grid">
        <OverviewSection action="website" description={bi(language, "Search visibility and website metadata", "ظهور البحث وبيانات الموقع الوصفية")} go={go} icon={SearchCheck} text={text} title="SEO" unsupported={unsupported}>
          <div className="site-overview-seo-body">
            <div className="site-overview-score-ring"><span>—</span><small>{text.notAvailable}</small></div>
            <div className="site-overview-checks"><span><i />{bi(language, "Homepage SEO", "تهيئة الصفحة الرئيسية")}<UnavailableValue text={text} /></span><span><i />{bi(language, "Search indexing", "فهرسة البحث")}<UnavailableValue text={text} /></span><span><i />{bi(language, "Social sharing", "المشاركة الاجتماعية")}<UnavailableValue text={text} /></span></div>
          </div>
        </OverviewSection>

        <OverviewSection action="siteSpeed" description={bi(language, "Mobile and desktop loading experience", "تجربة التحميل على الجوال وسطح المكتب")} go={go} icon={Gauge} text={text} title={text.siteSpeedTitle} unsupported={unsupported}>
          <div className="site-overview-performance-body"><div className="site-overview-performance-gauge"><Gauge size={42} /><strong>—</strong></div><div><UnavailableValue text={text} /><p>{text.unavailableDescription}</p></div></div>
        </OverviewSection>

        <OverviewSection action="security" description={bi(language, "Availability monitoring and protection", "مراقبة التوفر والحماية")} go={go} icon={ShieldCheck} text={text} title={text.securityTitle} unsupported={unsupported}>
          <div className="site-overview-mini-chart"><span>{text.notAvailable}</span><svg aria-hidden="true" viewBox="0 0 420 90"><line x1="0" x2="420" y1="18" y2="18"/><line x1="0" x2="420" y1="45" y2="45"/><line x1="0" x2="420" y1="72" y2="72"/></svg><small>{text.noConfirmedData}</small></div>
        </OverviewSection>

        <OverviewSection action="editSite" description={bi(language, "Review customer-facing accessibility guidance", "راجع إرشادات إمكانية الوصول للعملاء")} go={go} icon={Accessibility} text={text} title={bi(language, "Accessibility", "إمكانية الوصول")} unsupported={unsupported}>
          <div className="site-overview-accessibility-body"><Accessibility size={42} /><div><strong>{text.noConfirmedData}</strong><p>{text.unavailableDescription}</p></div></div>
        </OverviewSection>
      </div>

      <section className="site-overview-tools-row">
        {[
          ["mobileApp", Smartphone, text.mobileTitle],
          ["logoBrand", Palette, text.brandTitle],
          ["linkBio", Link2, text.linkTitle],
        ].map(([action, Icon, title]) => <button key={action} onClick={() => action === "linkBio" ? go("linkBio", unsupported) : go(action, unsupported)} type="button"><Icon size={19} /><span>{title}</span><ChevronRight size={17} /></button>)}
      </section>
    </div>
  );
}

function WebsitePage({ facts, go, language, text, unsupported }) {
  return (
    <div className="site-website-dashboard">
      <section className="site-website-main-card">
        <div className="site-website-card-top">
          <div><span className="site-mobile-eyebrow"><Globe2 size={15} />{bi(language, "Website", "الموقع")}</span><h2>{facts.companyName || text.notAssigned}</h2><p>{facts.storefrontUrl || text.unavailableDescription}</p></div>
          <div className="site-mobile-action-row"><button className="admin-primary-button" onClick={() => go("editSite", unsupported)} type="button"><Brush size={15} />{text.editSite}</button>{facts.storefrontUrl && <a className="secondary-action" href={facts.storefrontUrl} rel="noreferrer" target="_blank">{text.openStorefront}<ExternalLink size={15} /></a>}</div>
        </div>
        <BrowserPreview facts={facts} text={text} />
      </section>

      <section className="site-website-domain-card">
        <header><div><h2>{bi(language, "Website address", "عنوان الموقع")}</h2><p>{bi(language, "Manage the public destination connected to this company.", "أدر الوجهة العامة المرتبطة بهذه الشركة.")}</p></div><button className="secondary-action" onClick={() => go("connectDomain", unsupported)} type="button">{text.connectDomain}</button></header>
        <div className="site-website-domain-row"><span><Globe2 size={20} /></span><div><strong>{facts.domain || facts.storefrontUrl || text.notAssigned}</strong><small>{facts.storefrontUrl ? bi(language, "Confirmed company storefront", "واجهة متجر الشركة المؤكدة") : text.noConfirmedData}</small></div><UnavailableValue text={text} /></div>
      </section>

      <div className="site-website-tools-grid">
        <section><span><Image size={20} /></span><h3>{text.content}</h3><p>{bi(language, "Update the media and content already available to your storefront.", "حدّث الوسائط والمحتوى المتاح حالياً لواجهة متجرك.")}</p><button onClick={() => go("websiteContent", unsupported)} type="button">{text.manageContent}</button></section>
        <section><span><SearchCheck size={20} /></span><h3>SEO</h3><p>{text.unavailableDescription}</p><button onClick={unsupported} type="button">{text.setup}</button></section>
        <section><span><Palette size={20} /></span><h3>{text.brandTitle}</h3><p>{text.brandDescription}</p><button onClick={() => go("logoBrand", unsupported)} type="button">{text.manageBrand}</button></section>
      </div>
    </div>
  );
}

function SpeedMetric({ description, label, text }) {
  return <article className="site-speed-metric"><div><strong>—</strong><UnavailableValue text={text} /></div><h3>{label}</h3><p>{description}</p></article>;
}

function SpeedPage({ facts, language, text, unsupported }) {
  const [device, setDevice] = React.useState("mobile");
  const metrics = [
    ["LCP", bi(language, "Largest Contentful Paint", "أكبر رسم محتوى")],
    ["INP", bi(language, "Interaction to Next Paint", "التفاعل حتى الرسم التالي")],
    ["CLS", bi(language, "Cumulative Layout Shift", "تغير التخطيط التراكمي")],
    ["FCP", bi(language, "First Contentful Paint", "أول رسم محتوى")],
    ["TTFB", bi(language, "Time to First Byte", "ط§ظ„ظˆظ‚طھ ط­طھظ‰ ط£ظˆظ„ ط¨ط§ظٹطھ")],
  ];
  const faqs = [
    bi(language, "How is site speed measured?", "كيف يتم قياس سرعة الموقع؟"),
    bi(language, "Why are results unavailable?", "لماذا النتائج غير متاحة؟"),
    bi(language, "How can I improve performance?", "كيف يمكنني تحسين الأداء؟"),
  ];
  return (
    <div className="site-speed-page-layout">
      <section className="site-speed-result-card">
        <header><div><span className="site-mobile-eyebrow"><Gauge size={15} />PageSpeed</span><h2>{facts.storefrontUrl || text.notAssigned}</h2><p>{text.siteSpeedDescription}</p></div><button className="admin-primary-button" onClick={unsupported} type="button"><RefreshCw size={15} />{bi(language, "Run test", "تشغيل الاختبار")}</button></header>
        <div className="site-speed-device-tabs" role="tablist"><button aria-selected={device === "mobile"} onClick={() => setDevice("mobile")} role="tab" type="button"><Smartphone size={17} />{bi(language, "Mobile", "الجوال")}</button><button aria-selected={device === "desktop"} onClick={() => setDevice("desktop")} role="tab" type="button"><Laptop size={17} />{bi(language, "Desktop", "سطح المكتب")}</button></div>
        <div className="site-speed-score-area"><div className="site-speed-score-dial"><Gauge size={55} /><strong>—</strong><span>{text.notAvailable}</span></div><div><h3>{text.noConfirmedData}</h3><p>{text.unavailableDescription}</p><small>{device === "mobile" ? bi(language, "Mobile result", "نتيجة الجوال") : bi(language, "Desktop result", "نتيجة سطح المكتب")}</small></div></div>
      </section>

      <section className="site-speed-metrics-section"><header><div><h2>{bi(language, "PageSpeed metrics", "مقاييس سرعة الصفحة")}</h2><p>{bi(language, "Verified field or lab data will appear here after a supported test.", "ستظهر بيانات موثقة هنا بعد توفر اختبار مدعوم.")}</p></div><UnavailableValue text={text} /></header><div className="site-speed-metrics-grid">{metrics.map(([label, description]) => <SpeedMetric description={description} key={label} label={label} text={text} />)}</div></section>

      <section className="site-speed-faq"><h2>{bi(language, "Site speed FAQ", "الأسئلة الشائعة عن سرعة الموقع")}</h2>{faqs.map((question) => <button key={question} onClick={unsupported} type="button"><CircleHelp size={18} /><span>{question}</span><ChevronRight size={17} /></button>)}</section>
    </div>
  );
}

function SecurityPage({ facts, language, text, unsupported }) {
  const securityRows = [
    [LockKeyhole, "SSL", text.notAvailable],
    [LockKeyhole, bi(language, "Encryption", "التشفير"), text.notAvailable],
    [ShieldCheck, bi(language, "Threat protection", "الحماية من التهديدات"), text.notAvailable],
    [BadgeCheck, bi(language, "Compliance", "الامتثال"), text.notAvailable],
    [ShieldCheck, bi(language, "Security monitoring", "مراقبة الأمان"), text.notAvailable],
    [Database, bi(language, "Data protection", "حماية البيانات"), text.notAvailable],
  ];
  return (
    <div className="site-security-page-layout">
      <section className="site-security-map-card"><header><div><h2>{bi(language, "Global availability", "التوفر العالمي")}</h2><p>{bi(language, "Monitoring locations will appear after a supported uptime service is connected.", "ستظهر مواقع المراقبة بعد ربط خدمة توفر مدعومة.")}</p></div><UnavailableValue text={text} /></header><div className="site-security-map-visual"><MapPinned size={48}/><span>{text.noConfirmedData}</span><i/><i/><i/></div></section>
      <section className="site-security-status-card">
        <header><div><span className="site-mobile-eyebrow"><Activity size={15} />{bi(language, "Status history", "سجل الحالة")}</span><h2>{facts.domain || facts.storefrontUrl || text.notAssigned}</h2></div><UnavailableValue text={text} /></header>
        <div className="site-security-chart"><div className="site-security-chart-axis"><span>—</span><span>—</span><span>—</span></div><svg aria-hidden="true" viewBox="0 0 900 210"><line x1="0" x2="900" y1="42" y2="42"/><line x1="0" x2="900" y1="105" y2="105"/><line x1="0" x2="900" y1="168" y2="168"/><path d="M0 150 C130 108 210 168 322 118 S510 72 630 124 S770 152 900 88"/></svg><span>{text.noConfirmedData}</span></div>
      </section>

      <section className="site-security-availability-card"><div><span><Wifi size={22} /></span><h2>{bi(language, "Website availability", "توفر الموقع")}</h2><p>{text.securityDescription}</p></div><div className="site-security-availability-value"><strong>—</strong><UnavailableValue text={text} /></div></section>

      <section className="site-security-infrastructure-card"><header><div><h2>{bi(language, "Infrastructure", "البنية التحتية")}</h2><p>{bi(language, "Connection details appear only when monitoring is configured.", "تظهر تفاصيل الاتصال فقط عند إعداد المراقبة.")}</p></div><UnavailableValue text={text} /></header><div className="site-security-network"><span><Globe2 size={25} /><small>{bi(language, "Visitor", "الزائر")}</small></span><i /><span><Cloud size={25} /><small>{bi(language, "Network", "الشبكة")}</small></span><i /><span><Server size={25} /><small>{bi(language, "Site", "الموقع")}</small></span></div></section>

      <section className="site-security-simulator-card"><div><span><Zap size={23} /></span><h2>{bi(language, "Traffic load simulator", "محاكي حمل الزيارات")}</h2><p>{bi(language, "A supported load-testing connection is required before a simulation can run.", "يلزم ربط اختبار حمل مدعوم قبل تشغيل المحاكاة.")}</p></div><button className="admin-primary-button" onClick={unsupported} type="button">{bi(language, "Set up simulation", "إعداد المحاكاة")}</button></section>

      <section className="site-security-details-card"><header><h2>{bi(language, "Security details", "تفاصيل الأمان")}</h2><button onClick={unsupported} type="button">{text.setup}</button></header>{securityRows.map(([Icon, label, value]) => <div className="site-security-detail-row" key={label}><span><Icon size={18} /></span><strong>{label}</strong><small>{value}</small><ChevronRight size={17} /></div>)}</section>
    </div>
  );
}

function PhonePreview({ facts, mode, text }) {
  return <div className={`site-mobile-phone-preview site-mobile-phone-${mode}`}><div className="site-mobile-phone-speaker"/><div className="site-mobile-phone-screen"><div className="site-mobile-phone-brand">{facts.logoUrl ? <img alt="" src={facts.logoUrl} /> : <span>{(facts.companyName || "?").slice(0, 2).toUpperCase()}</span>}<strong>{facts.companyName || text.notAssigned}</strong></div><div className="site-mobile-phone-banner"/><div className="site-mobile-phone-cards"><i/><i/><i/></div><div className="site-mobile-phone-nav"><i/><i/><i/></div></div></div>;
}

function MobileAppPage({ facts, language, text, unsupported }) {
  const [tab, setTab] = React.useState("native");
  const tabs = [
    ["native", bi(language, "Your branded app", "تطبيقك بعلامتك")],
    ["members", bi(language, "Member mobile app", "تطبيق الأعضاء")],
  ];
  const native = tab === "native";
  return (
    <section className="site-mobile-app-workspace">
      <section className="site-mobile-app-setup-checklist"><header><div><h2>{bi(language, "Set up your mobile experience", "إعداد تجربة الجوال")}</h2><p>{bi(language, "Complete supported setup steps when mobile tools become available.", "أكمل خطوات الإعداد المدعومة عند توفر أدوات الجوال.")}</p></div><UnavailableValue text={text}/></header>{[bi(language, "Choose an app layout", "اختيار تخطيط التطبيق"), bi(language, "Apply logo and brand", "تطبيق الشعار والهوية"), bi(language, "Configure member access", "إعداد وصول الأعضاء"), bi(language, "Prepare publishing", "التحضير للنشر")].map((item) => <button key={item} onClick={unsupported} type="button"><span/><strong>{item}</strong><small>{text.notAvailable}</small><ChevronRight size={17}/></button>)}</section>
      <div aria-label={text.mobileTitle} className="site-mobile-tabs site-mobile-app-tabs" role="tablist">{tabs.map(([id, label]) => <button aria-selected={tab === id} key={id} onClick={() => setTab(id)} role="tab" type="button">{label}</button>)}</div>
      <div className="site-mobile-app-hero" role="tabpanel">
        <div className="site-mobile-app-copy"><span className="site-mobile-eyebrow"><Smartphone size={15} />{text.notAvailable}</span><h2>{native ? bi(language, "Build a mobile app for your brand", "أنشئ تطبيق جوال لعلامتك") : bi(language, "Give members a mobile home", "امنح الأعضاء تجربة جوال")}</h2><p>{native ? bi(language, "Design and app publishing tools are not connected for this company yet.", "أدوات التصميم ونشر التطبيق غير مرتبطة بهذه الشركة بعد.") : bi(language, "Member activity and app setup will appear only when a supported mobile product is connected.", "سيظهر نشاط الأعضاء وإعداد التطبيق عند ربط منتج جوال مدعوم.")}</p><ul><li><Check size={16}/>{bi(language, "Use your confirmed company identity", "استخدم هوية شركتك المؤكدة")}</li><li><Check size={16}/>{bi(language, "Preview customer-facing navigation", "عاين تنقل العملاء")}</li><li><Check size={16}/>{bi(language, "Continue with supported setup tools", "تابع بأدوات الإعداد المدعومة")}</li></ul><button className="admin-primary-button" onClick={unsupported} type="button">{text.setupMobile}</button></div>
        <div className="site-mobile-app-preview-stage"><PhonePreview facts={facts} mode={native ? "brand" : "members"} text={text}/><div className="site-mobile-app-preview-note"><Eye size={17}/><span>{bi(language, "Preview only", "معاينة فقط")}</span></div></div>
      </div>
      <div className="site-mobile-app-bottom-row"><article><MonitorSmartphone size={21}/><div><strong>{bi(language, "Design and customize", "التصميم والتخصيص")}</strong><p>{text.unavailableDescription}</p></div></article><article><Activity size={21}/><div><strong>{bi(language, "App activity", "نشاط التطبيق")}</strong><p>{text.noConfirmedData}</p></div></article></div>
    </section>
  );
}

function BrandPage({ facts, go, language, text, unsupported }) {
  const details = [[text.language, facts.language], [text.direction, facts.direction], ["Locale", facts.locale]].filter(([, value]) => value);
  return (
    <div className="site-brand-page-layout">
      <section className="site-brand-split-hero">
        <button className="site-brand-secondary-action" onClick={unsupported} type="button"><CirclePlay size={16}/>{bi(language, "See brand guide", "عرض دليل الهوية")}</button>
        <div className="site-brand-hero-copy"><span className="site-mobile-eyebrow"><BadgeCheck size={15}/>{text.brandTitle}</span><h2>{bi(language, "Build a recognizable brand", "ابنِ هوية يسهل تمييزها")}</h2><p>{text.brandDescription}</p><button className="admin-primary-button" onClick={() => go("settings", unsupported)} type="button"><Settings size={16}/>{text.manageBrand}</button></div>
        <div className="site-brand-preview-stage"><div className="site-brand-preview-card"><div className="site-mobile-brand-mark">{facts.logoUrl ? <img alt={`${facts.companyName || "Company"} logo`} src={facts.logoUrl}/> : <span>{(facts.companyName || "?").slice(0, 2).toUpperCase()}</span>}</div><strong>{facts.companyName || text.notAssigned}</strong><small>{facts.storefrontUrl || text.noConfirmedData}</small><div className="site-brand-preview-lines"><i/><i/><i/></div></div></div>
      </section>
      <section className="site-brand-assets-section"><header><div><h2>{bi(language, "Brand assets", "أصول الهوية")}</h2><p>{bi(language, "Assets confirmed in company settings", "الأصول المؤكدة في إعدادات الشركة")}</p></div><button onClick={() => go("settings", unsupported)} type="button">{text.settings}</button></header><div className="site-brand-assets-grid"><article><span>{facts.logoUrl ? <img alt="" src={facts.logoUrl}/> : <Image size={26}/>}</span><div><strong>{bi(language, "Logo", "الشعار")}</strong><small>{facts.logoUrl ? bi(language, "Company logo", "شعار الشركة") : text.notAssigned}</small></div></article><article><span>{facts.faviconUrl ? <img alt="" src={facts.faviconUrl}/> : <Globe2 size={24}/>}</span><div><strong>Favicon</strong><small>{facts.faviconUrl ? bi(language, "Company favicon", "أيقونة الشركة") : text.notAssigned}</small></div></article></div></section>
      <section className="site-brand-language-section"><header><h2>{bi(language, "Brand settings", "إعدادات الهوية")}</h2><UnavailableValue text={text}/></header>{details.length ? details.map(([label, value]) => <div className="site-mobile-brand-row" key={label}><span>{label}</span><strong>{value}</strong><Check size={16}/></div>) : <div className="site-brand-empty-row">{text.noConfirmedData}</div>}</section>
    </div>
  );
}

function LinkInBioPage({ company, facts, language, text, unsupported }) {
  const slug = suggestedLinkSlug(company);
  const benefits = [bi(language, "Share your most important links", "شارك أهم روابطك"), bi(language, "Keep your company identity consistent", "حافظ على اتساق هوية شركتك"), bi(language, "Preview a mobile-first link page", "عاين صفحة روابط مخصصة للجوال")];
  return (
    <section className="site-hopp-split-hero">
      <button className="site-hopp-help-action" onClick={unsupported} type="button"><CircleHelp size={16}/>{bi(language, "Learn more", "معرفة المزيد")}</button>
      <div className="site-hopp-carousel-controls"><button aria-label={bi(language, "Previous preview", "المعاينة السابقة")} onClick={unsupported} type="button"><ChevronLeft size={18}/></button><button aria-label={bi(language, "Next preview", "المعاينة التالية")} onClick={unsupported} type="button"><ChevronRight size={18}/></button></div>
      <div className="site-hopp-copy"><span className="site-mobile-eyebrow"><Sparkles size={15}/>Hopp</span><h2>{bi(language, "One link for everything you share", "رابط واحد لكل ما تشاركه")}</h2><p>{text.linkDescription}</p><ul>{benefits.map((benefit) => <li key={benefit}><span><Check size={15}/></span>{benefit}</li>)}</ul><label><span>{bi(language, "Choose your suggested URL", "اختر عنوان URL مقترحاً")}</span><div className="site-hopp-url-field"><span>hopp.example/</span><input aria-label={text.linkTitle} dir="ltr" readOnly value={slug || ""}/></div><small>{text.suggestedOnly}</small></label><button className="admin-primary-button" onClick={unsupported} type="button">{bi(language, "Create Link in Bio", "إنشاء رابط السيرة")}</button></div>
      <div className="site-hopp-preview-stage"><div className="site-hopp-orbit"/><PhonePreview facts={facts} mode="hopp" text={text}/><span className="site-hopp-preview-badge"><Link2 size={15}/>{bi(language, "Preview only", "معاينة فقط")}</span></div>
    </section>
  );
}

export default function AdminSiteMobilePage({
  activePage,
  company,
  currentUser,
  language = "en",
  modules = [],
  onNavigate,
  t,
  ...layout
}) {
  const [showUnsupported, setShowUnsupported] = React.useState(false);
  const text = copy[language === "ar" ? "ar" : "en"];
  const [titleKey, descriptionKey] = pageMeta[activePage] || pageMeta["admin-tenant-placeholder-site-overview"];
  const facts = confirmedSiteFacts(company);
  const canView = canViewSiteMobile(currentUser, company);
  const unsupported = () => setShowUnsupported(true);
  const go = (action, fallback = unsupported) => {
    const page = resolveSiteMobileDestination(action, { currentUser, modules });
    if (page === "admin-site-editor") {
      const editorWindow = window.open("/admin/site-editor", "_blank", "noopener,noreferrer");
      if (editorWindow) editorWindow.opener = null;
    } else if (page) onNavigate(page);
    else fallback();
  };

  function content() {
    if (!canView) return <section className="site-mobile-access-denied"><ShieldCheck size={32} /><h2>{text.accessDenied}</h2></section>;
    switch (activePage) {
      case "admin-tenant-placeholder-site-overview":
        return <OverviewPage facts={facts} go={go} language={language} text={text} unsupported={unsupported} />;
      case "admin-tenant-placeholder-site-website":
        return <WebsitePage facts={facts} go={go} language={language} text={text} unsupported={unsupported} />;
      case "admin-tenant-placeholder-site-speed":
        return <SpeedPage facts={facts} language={language} text={text} unsupported={unsupported} />;
      case "admin-tenant-placeholder-site-security":
        return <SecurityPage facts={facts} language={language} text={text} unsupported={unsupported} />;
      case "admin-tenant-placeholder-site-mobile-app":
        return <MobileAppPage facts={facts} language={language} text={text} unsupported={unsupported} />;
      case "admin-tenant-placeholder-site-logo-brand":
        return <BrandPage facts={facts} go={go} language={language} text={text} unsupported={unsupported} />;
      case "admin-tenant-placeholder-site-link-in-bio":
        return <LinkInBioPage company={company} facts={facts} language={language} text={text} unsupported={unsupported} />;
      default:
        return null;
    }
  }

  return (
    <AdminLayout
      activePage={activePage}
      company={company}
      currentUser={currentUser}
      hideHeader
      language={language}
      modules={modules}
      onNavigate={onNavigate}
      subtitle={text[descriptionKey]}
      t={t}
      title={text[titleKey]}
      {...layout}
    >
      <div className="tenant-site-mobile-page" data-site-mobile-direction={siteMobileDirection(language)} dir={siteMobileDirection(language)}>
        <PageHeader description={text[descriptionKey]} title={text[titleKey]}>
          {activePage === "admin-tenant-placeholder-site-overview" && <><button className="secondary-action" onClick={() => go("settings", unsupported)} type="button"><Settings size={16}/>{text.settings}</button><button className="admin-primary-button" onClick={() => go("editSite", unsupported)} type="button"><Brush size={16}/>{text.editSite}</button></>}
          {activePage === "admin-tenant-placeholder-site-website" && <button className="admin-primary-button" onClick={() => go("editSite", unsupported)} type="button"><Brush size={16}/>{text.editSite}</button>}
          {activePage === "admin-tenant-placeholder-site-mobile-app" && <><button className="secondary-action" onClick={unsupported} type="button"><CirclePlay size={16}/>{bi(language, "Watch Video", "مشاهدة الفيديو")}</button><button className="secondary-action" onClick={unsupported} type="button"><Settings size={16}/>{text.settings}</button></>}
        </PageHeader>
        {content()}
      </div>
      {showUnsupported && <UnsupportedDialog onClose={() => setShowUnsupported(false)} t={t} text={text} />}
    </AdminLayout>
  );
}
