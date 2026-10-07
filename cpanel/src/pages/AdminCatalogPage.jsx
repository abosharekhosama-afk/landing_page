import React from "react";
import {
  ArrowUpRight,
  BadgePercent,
  CalendarDays,
  Check,
  ChevronDown,
  ExternalLink,
  Filter,
  Gift,
  Grid2X2,
  Link2,
  ListFilter,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Share2,
  Store,
  Tag,
  X,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import { AdminUnderDevelopmentContent } from "./AdminPlaceholderPage.jsx";
import { AutomaticDiscountsManager, CouponsManager } from "../components/DiscountCouponManagers.jsx";
import { moduleAllowsPage } from "../utils/moduleRegistry.js";
import {
  canUseCatalogAction,
  catalogDirection,
  hasShareLinkConfiguration,
} from "../utils/catalog.js";
import { formatCompanyCurrency } from "../utils/sales.js";

const pageCopy = {
  "admin-tenant-placeholder-catalog-booking-services": ["Booking Services", "Create and organize the services customers can book.", "خدمات الحجز", "أنشئ ونظّم الخدمات التي يمكن للعملاء حجزها."],
  "admin-tenant-placeholder-catalog-gift-cards": ["Gift Cards", "Bring flexible gifting to your company storefront.", "بطاقات الهدايا", "أضف تجربة إهداء مرنة إلى واجهة متجر شركتك."],
  "admin-coupons": ["Coupons", "Create and manage coupon codes for eligible purchases.", "القسائم", "أنشئ رموز القسائم وأدرها للمشتريات المؤهلة."],
  "admin-automatic-discounts": ["Automatic Discounts", "Manage discounts that apply automatically when supported.", "الخصومات التلقائية", "أدر الخصومات التي تُطبّق تلقائياً عند توفرها."],
  "admin-tenant-placeholder-catalog-discounts-coupons": ["Coupons", "Create and manage coupon codes for eligible purchases.", "القسائم", "أنشئ رموز القسائم وأدرها للمشتريات المؤهلة."],
  "admin-tenant-placeholder-catalog-discounts-automatic": ["Automatic Discounts", "Manage discounts that apply automatically when supported.", "الخصومات التلقائية", "أدر الخصومات التي تُطبّق تلقائياً عند توفرها."],
  "admin-tenant-placeholder-catalog-booking-channels-integrations": ["Booking Integrations", "Explore tools that can complement your booking workflow.", "تكاملات الحجز", "استكشف الأدوات التي يمكنها دعم سير عمل الحجوزات."],
  "admin-tenant-placeholder-catalog-booking-channels-links": ["Shareable Links", "Share booking destinations after your storefront is configured.", "روابط قابلة للمشاركة", "شارك وجهات الحجز بعد إعداد واجهة متجرك."],
};

const CatalogUnsupportedContext = React.createContext(() => {});

function labelsFor(language) {
  return language === "ar" ? {
    actions: "الإجراءات", addGift: "إضافة بطاقة هدية إلى الموقع", addService: "إضافة خدمة جديدة", availability: "الجدول / التوفر", code: "الرمز", connect: "ربط", createDiscount: "إنشاء خصم", discount: "الخصم", filter: "تصفية", image: "الصورة", learnMore: "معرفة المزيد", manageCategories: "إدارة التصنيفات", manageView: "إعدادات العرض", name: "الاسم", newCoupon: "قسيمة جديدة", notConfigured: "غير مهيأ", price: "السعر", search: "بحث", selection: "تحديد", serviceName: "اسم الخدمة", shareServices: "مشاركة الخدمات", status: "الحالة", tags: "الوسوم", type: "النوع", underDevelopment: "هذه الميزة قيد التطوير", uses: "مرات الاستخدام",
  } : {
    actions: "Actions", addGift: "Add Gift Card to Site", addService: "Add New Service", availability: "Schedule / availability", code: "Code", connect: "Connect", createDiscount: "Create Discount", discount: "Discount", filter: "Filter", image: "Image", learnMore: "Learn More", manageCategories: "Manage Categories", manageView: "View settings", name: "Name", newCoupon: "New Coupon", notConfigured: "Not configured", price: "Price", search: "Search", selection: "Select", serviceName: "Service name", shareServices: "Share Services", status: "Status", tags: "Tags", type: "Type", underDevelopment: "This feature is under development", uses: "Uses",
  };
}

function CatalogIllustration({ type = "empty" }) {
  return <svg aria-hidden="true" className={`catalog-illustration catalog-illustration-${type}`} viewBox="0 0 320 210">
    <rect className="catalog-illustration-bg" height="168" rx="20" width="270" x="25" y="20" />
    <rect className="catalog-illustration-window" height="122" rx="10" width="214" x="54" y="44" />
    <path className="catalog-illustration-top" d="M54 58a14 14 0 0 1 14-14h186a14 14 0 0 1 14 14v13H54z" />
    <circle className="catalog-illustration-dot" cx="70" cy="57" r="3" /><circle className="catalog-illustration-dot" cx="80" cy="57" r="3" />
    {type === "gift" ? <><rect className="catalog-illustration-accent" height="54" rx="8" width="92" x="111" y="87" /><path className="catalog-illustration-line" d="M111 104h92M157 87v54M138 87c-14-12-27 2-14 12 9 7 22 2 33-4M176 87c14-12 27 2 14 12-9 7-22 2-33-4" /></> : null}
    {type === "coupon" ? <><path className="catalog-illustration-accent" d="M102 88h116v52H102a12 12 0 0 0 0-24 12 12 0 0 0 0-24z" /><path className="catalog-illustration-line" d="M159 92v43M180 103l-18 20M166 103h.1M180 123h.1" /></> : null}
    {type === "service" ? <><rect className="catalog-illustration-soft" height="24" rx="5" width="174" x="74" y="86" /><rect className="catalog-illustration-soft" height="24" rx="5" width="174" x="74" y="120" /><circle className="catalog-illustration-accent" cx="89" cy="98" r="8" /><circle className="catalog-illustration-accent" cx="89" cy="132" r="8" /></> : null}
    {type === "discount" ? <><circle className="catalog-illustration-accent" cx="161" cy="113" r="37" /><path className="catalog-illustration-line" d="M145 130l32-34M145 99h.1M177 127h.1" /></> : null}
    {type === "links" ? <><rect className="catalog-illustration-soft" height="27" rx="13" width="150" x="85" y="100" /><path className="catalog-illustration-line" d="M128 113h66M120 102l-10 11 10 11M202 102l10 11-10 11" /></> : null}
    {type === "integration" ? <><rect className="catalog-illustration-soft" height="42" rx="10" width="42" x="106" y="92" /><rect className="catalog-illustration-soft" height="42" rx="10" width="42" x="174" y="92" /><path className="catalog-illustration-line" d="M148 113h26M127 92V80h68v12" /></> : null}
  </svg>;
}

function CatalogHeader({ actions, count, subtitle, title }) {
  return <header className="catalog-page-header" data-catalog-page-header><div><div className="catalog-title-line"><h1>{title}</h1>{Number.isFinite(count) && <span>{count}</span>}</div><p>{subtitle}</p></div>{actions && <div className="catalog-header-actions">{actions}</div>}</header>;
}

function CatalogToolbar({ children, labels, onUnsupported, query, setQuery }) {
  const routeUnsupported = React.useContext(CatalogUnsupportedContext);
  const openUnsupported = onUnsupported || routeUnsupported;
  return <div className="catalog-toolbar">{children}<button className="catalog-tool-button" onClick={openUnsupported} type="button"><Filter size={16} />{labels.filter}</button><button className="catalog-tool-button" onClick={openUnsupported} type="button"><Settings2 size={16} />{labels.manageView}</button><label className="catalog-search"><Search size={17} /><input aria-label={labels.search} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} value={query} /></label></div>;
}

function CatalogEmpty({ action, actionLabel, description, labels, onAction, title, type }) {
  return <div className="catalog-empty-state" data-catalog-empty={type}><CatalogIllustration type={type} /><h2>{title}</h2><p>{description}</p>{action && <button className="admin-primary-button" onClick={onAction} type="button"><Plus size={16} />{actionLabel}</button>}</div>;
}

function UnsupportedDialog({ labels, onClose, t }) {
  React.useEffect(() => {
    const close = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose]);
  return <div className="catalog-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()} role="presentation"><div aria-label={labels.underDevelopment} aria-modal="true" className="catalog-placeholder-modal" role="dialog"><button aria-label="Close" className="catalog-modal-close" onClick={onClose} type="button"><X size={18} /></button><AdminUnderDevelopmentContent t={t} /></div></div>;
}

function ServicesPage({ company, language, labels, onUnsupported, services = [] }) {
  const [query, setQuery] = React.useState("");
  const rows = services.filter((service) => [service.name?.[language], service.name?.en, service.name, service.schedule, service.availability].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase()));
  return <section className="catalog-data-card catalog-services-card"><CatalogToolbar labels={labels} query={query} setQuery={setQuery}><button className="catalog-tool-button" onClick={onUnsupported} type="button"><ListFilter size={16} />{labels.manageCategories}</button></CatalogToolbar>{rows.length ? <div className="catalog-table-wrap"><table className="catalog-table"><thead><tr><th><input aria-label={labels.selection} type="checkbox" /></th><th>{labels.image}</th><th>{labels.serviceName}</th><th>{labels.price}</th><th>{labels.availability}</th><th>{labels.actions}</th></tr></thead><tbody>{rows.map((service) => <tr key={service.id}><td><input aria-label={service.name?.[language] || service.name || service.id} type="checkbox" /></td><td>{service.imageUrl ? <img alt="" className="catalog-thumb" src={service.imageUrl} /> : <span className="catalog-thumb-placeholder"><CalendarDays size={17} /></span>}</td><td>{service.name?.[language] || service.name?.en || service.name || service.id}</td><td><bdi dir="ltr">{formatCompanyCurrency(service.price, company, language)}</bdi></td><td>{service.schedule || service.availability || "—"}</td><td><button className="catalog-icon-button" onClick={onUnsupported} type="button"><MoreHorizontal size={18} /></button></td></tr>)}</tbody></table></div> : <CatalogEmpty description={language === "ar" ? "ستظهر خدمات الحجز الحقيقية هنا بعد توفرها لهذه الشركة." : "Real booking services will appear here when they are available for this company."} labels={labels} title={language === "ar" ? "لا توجد خدمات حجز" : "No booking services yet"} type="service" />}<button className="catalog-add-row" onClick={onUnsupported} type="button"><Plus size={19} />{labels.addService}</button></section>;
}

function GiftCardsPage({ language, labels, onUnsupported }) {
  const benefits = language === "ar" ? ["وسّع خيارات الشراء لعملائك", "قدّم تجربة إهداء تحمل هوية شركتك", "أدر الإعدادات من لوحة واحدة"] : ["Expand purchasing options for customers", "Offer a gifting experience with your company identity", "Manage setup from one dashboard"];
  return <section className="catalog-gift-hero"><div className="catalog-gift-copy"><span className="catalog-eyebrow">iGroup Gift Cards</span><h2>{language === "ar" ? "أضف بطاقات هدايا مرنة إلى متجرك" : "Add flexible gift cards to your storefront"}</h2><div className="catalog-benefits">{benefits.map((benefit) => <div key={benefit}><span><Check size={15} /></span>{benefit}</div>)}</div><div className="catalog-gift-actions"><button className="admin-primary-button" onClick={onUnsupported} type="button"><Gift size={17} />{labels.addGift}</button><button className="text-action" onClick={onUnsupported} type="button">{labels.learnMore}<ArrowUpRight size={15} /></button></div></div><div className="catalog-gift-visual"><CatalogIllustration type="gift" /><div className="catalog-storefront-card"><Store size={22} /><span>iGroup</span><strong>{language === "ar" ? "بطاقة هدية" : "Gift Card"}</strong></div></div></section>;
}

function CouponsPage({ currentUser, language, labels }) {
  return <CouponsManager currentUser={currentUser} language={language} labels={labels} />;
}

function AutomaticDiscountsPage({ currentUser, company, language, labels }) {
  return <AutomaticDiscountsManager currentUser={currentUser} company={company} language={language} labels={labels} />;
}

const integrationTabs = [
  ["channels", "Booking channels", "قنوات الحجز", CalendarDays], ["communications", "Communications", "الاتصالات", MessageSquare], ["business", "Business management", "إدارة الأعمال", Grid2X2], ["payroll", "Payroll & invoice", "الرواتب والفواتير", BadgePercent], ["marketing", "Marketing", "التسويق", Tag], ["widgets", "Website widgets", "أدوات الموقع", Store], ["mobile", "Mobile apps", "تطبيقات الجوال", Link2],
];

function IntegrationsPage({ language, labels, onUnsupported }) {
  const [activeTab, setActiveTab] = React.useState("channels");
  const cards = integrationTabs.filter(([key]) => key === activeTab);
  return <section className="catalog-integrations"><div className="catalog-integration-tabs" role="tablist">{integrationTabs.map(([key, en, ar]) => <button aria-selected={activeTab === key} key={key} onClick={() => setActiveTab(key)} role="tab" type="button">{language === "ar" ? ar : en}</button>)}</div><div className="catalog-integration-grid">{cards.map(([key, en, ar, Icon]) => <article className="catalog-integration-card" key={key}><span className="catalog-integration-icon"><Icon size={25} /></span><div><h2>{language === "ar" ? ar : en}</h2><p>{language === "ar" ? "استكشف خيارات التكامل المتاحة لهذه الفئة عند دعمها." : "Explore supported integration options for this category when available."}</p><span className="catalog-availability">{labels.notConfigured}</span></div><button className="secondary-action" onClick={onUnsupported} type="button">{labels.connect}</button></article>)}</div></section>;
}

function ShareableLinksPage({ company, language, labels, onUnsupported }) {
  const configured = hasShareLinkConfiguration(company);
  const cards = language === "ar" ? [["قائمة الخدمات", "شارك صفحة تحتوي على خدمات الحجز المتاحة."], ["تقويم الخدمات", "وجّه العملاء إلى عرض تقويم الخدمات."], ["صفحة الخدمة", "شارك وجهة لخدمة محددة عند توفرها."], ["العضويات والباقات", "شارك خيارات العضوية والباقات عند دعمها."]] : [["Service list", "Share a destination containing available booking services."], ["Service calendar", "Direct customers to the service calendar view."], ["Service page", "Share a destination for a specific service when available."], ["Memberships and packages", "Share membership and package options when supported."]];
  return <>{!configured && <section className="catalog-warning"><Settings2 size={20} /><div><strong>{language === "ar" ? "أكمل إعداد واجهة المتجر" : "Complete storefront setup"}</strong><p>{language === "ar" ? "لا يمكن إنشاء روابط عامة قبل توفر نطاق أو رابط متجر حقيقي للشركة." : "Public links cannot be created until the company has a real storefront URL or domain."}</p></div></section>}<div className="catalog-links-grid">{cards.map(([title, description], index) => <article className="catalog-link-card" key={title}><CatalogIllustration type="links" /><h2>{title}</h2><p>{description}</p><button className="secondary-action" onClick={onUnsupported} type="button"><Share2 size={16} />{language === "ar" ? "إعداد الرابط" : "Set up link"}</button>{configured && <span className="catalog-configured-note">{language === "ar" ? "واجهة المتجر مهيأة" : "Storefront configured"}</span>}</article>)}</div></>;
}

export default function AdminCatalogPage({ activePage, company, currentUser, language = "en", modules = [], onNavigate, t, ...layout }) {
  const [showUnsupported, setShowUnsupported] = React.useState(false);
  const labels = labelsFor(language);
  const ar = language === "ar";
  const copy = pageCopy[activePage] || pageCopy["admin-tenant-placeholder-catalog-booking-services"];
  const title = ar ? copy[2] : copy[0];
  const subtitle = ar ? copy[3] : copy[1];
  const canView = moduleAllowsPage(modules, "admin-products") && canUseCatalogAction(currentUser, "view");
  const canManage = canUseCatalogAction(currentUser, "manage");
  const unsupported = () => setShowUnsupported(true);

  function headerActions() {
    if (!canView || !canManage) return null;
    if (activePage === "admin-tenant-placeholder-catalog-booking-services") return <><button className="secondary-action" onClick={unsupported} type="button"><Share2 size={16} />{labels.shareServices}</button><button className="admin-primary-button" onClick={unsupported} type="button"><Plus size={16} />{labels.addService}</button><button aria-label={labels.actions} className="catalog-icon-button" onClick={unsupported} type="button"><MoreHorizontal size={18} /></button></>;
    return null;
  }

  function pageContent() {
    if (!canView) return <CatalogEmpty description={ar ? "ليست لديك صلاحية لعرض وحدة الكتالوج." : "You do not have access to the Catalog module."} labels={labels} title={ar ? "الوصول مرفوض" : "Access denied"} type="empty" />;
    switch (activePage) {
      case "admin-tenant-placeholder-catalog-booking-services": return <ServicesPage company={company} language={language} labels={labels} onUnsupported={unsupported} />;
      case "admin-tenant-placeholder-catalog-gift-cards": return <GiftCardsPage language={language} labels={labels} onUnsupported={unsupported} />;
      case "admin-coupons": return <CouponsPage currentUser={currentUser} language={language} labels={labels} />;
      case "admin-automatic-discounts": return <AutomaticDiscountsPage currentUser={currentUser} company={company} language={language} labels={labels} />;
      case "admin-tenant-placeholder-catalog-discounts-coupons": return <CouponsPage currentUser={currentUser} language={language} labels={labels} />;
      case "admin-tenant-placeholder-catalog-discounts-automatic": return <AutomaticDiscountsPage currentUser={currentUser} company={company} language={language} labels={labels} />;
      case "admin-tenant-placeholder-catalog-booking-channels-integrations": return <IntegrationsPage language={language} labels={labels} onUnsupported={unsupported} />;
      case "admin-tenant-placeholder-catalog-booking-channels-links": return <ShareableLinksPage company={company} language={language} labels={labels} onUnsupported={unsupported} />;
      default: return null;
    }
  }

  const count = activePage === "admin-tenant-placeholder-catalog-booking-services" ? 0 : undefined;
  return <AdminLayout activePage={activePage} company={company} currentUser={currentUser} hideHeader language={language} modules={modules} onNavigate={onNavigate} subtitle={subtitle} t={t} title={title} {...layout}><CatalogUnsupportedContext.Provider value={unsupported}><div className="tenant-catalog-page" data-catalog-direction={catalogDirection(language)} dir={catalogDirection(language)}><CatalogHeader actions={headerActions()} count={count} subtitle={subtitle} title={title} />{pageContent()}</div>{showUnsupported && <UnsupportedDialog labels={labels} onClose={() => setShowUnsupported(false)} t={t} />}</CatalogUnsupportedContext.Provider></AdminLayout>;
}
