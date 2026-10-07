import React from "react";
import {
  Bell,
  Building2,
  ChevronDown,
  CircleDollarSign,
  Code2,
  CreditCard,
  Globe2,
  Mail,
  Percent,
  ReceiptText,
  Search,
  Settings,
  ShoppingCart,
  WalletCards,
} from "lucide-react";
import { formatCompanyCurrency } from "../utils/sales.js";
import {
  companyDisplayName,
  companySetting,
  filterSettingsSections,
  localizedSetting,
} from "../utils/tenantManagement.js";
import {
  EmptyManagementState,
  HonestNotice,
  ManagementHeader,
  ManagementShell,
  SettingRow,
  SettingsTabs,
  UnsupportedDialog,
  ml,
} from "./AdminManagementShared.jsx";
import DeliveryZonesWorkspace from "../components/DeliveryZonesWorkspace.jsx";

const financeTabs = [
  { page: "admin-settings-getting-paid-general", en: "General", ar: "عام" },
  { page: "admin-settings-getting-paid-invoices", en: "Invoices", ar: "الفواتير" },
  { page: "admin-settings-getting-paid-price-quotes", en: "Price Quotes", ar: "عروض الأسعار" },
  { page: "admin-settings-getting-paid-pay-links", en: "Pay Links", ar: "روابط الدفع" },
  { page: "admin-settings-getting-paid-automations", en: "Automations", ar: "الأتمتة" },
];

export const settingsHubSections = Object.freeze([
  { title: { en: "Finance & payments", ar: "المالية والمدفوعات" }, icon: WalletCards, rows: [
    { title: { en: "Accept payments", ar: "قبول المدفوعات" }, description: { en: "Review supported payment configuration.", ar: "راجع إعدادات الدفع المدعومة." } },
    { title: { en: "Getting paid", ar: "استلام المدفوعات" }, description: { en: "Company details, invoices, quotes and payment links.", ar: "بيانات الشركة والفواتير وعروض الأسعار وروابط الدفع." }, page: "admin-settings-getting-paid" },
    { title: { en: "Receipts", ar: "الإيصالات" }, description: { en: "Customize receipt previews and automation status.", ar: "تخصيص معاينات الإيصالات وحالة الأتمتة." }, page: "admin-settings-receipts" },
    { title: { en: "Tax", ar: "الضريبة" }, description: { en: "Tax display, locations and exemptions.", ar: "عرض الضريبة والمواقع والإعفاءات." }, page: "admin-settings-tax" },
  ]},
  { title: { en: "Business solutions", ar: "حلول الأعمال" }, icon: ShoppingCart, rows: [
    { title: { en: "Checkout", ar: "الدفع" }, description: { en: "Review checkout fields, policies and notifications.", ar: "راجع حقول الدفع والسياسات والإشعارات." }, page: "admin-settings-checkout" },
    { title: { en: "Shipping, delivery & fulfillment", ar: "الشحن والتوصيل والتنفيذ" }, description: { en: "Manage supported shipping regions.", ar: "إدارة مناطق الشحن المدعومة." }, page: "admin-settings-shipping" },
    { title: { en: "Booking settings", ar: "إعدادات الحجز" }, description: { en: "Availability, staff, resources and booking flow.", ar: "التوفر والموظفون والموارد وتدفق الحجز." }, page: "admin-settings-bookings" },
    { title: { en: "Video settings", ar: "إعدادات الفيديو" }, description: { en: "Video configuration is not available yet.", ar: "إعداد الفيديو غير متاح بعد." } },
    { title: { en: "Subscription settings", ar: "إعدادات الاشتراك" }, description: { en: "Subscription configuration is not available yet.", ar: "إعداد الاشتراك غير متاح بعد." } },
  ]},
  { title: { en: "Website and site management", ar: "إدارة الموقع" }, icon: Globe2, rows: [
    { title: { en: "SEO settings", ar: "إعدادات تحسين محركات البحث" }, description: { en: "Open existing website settings.", ar: "فتح إعدادات الموقع الحالية." }, page: "admin-tenant-placeholder-site-website" },
    { title: { en: "Website settings", ar: "إعدادات الموقع" }, description: { en: "Manage storefront content and configuration.", ar: "إدارة محتوى وإعدادات المتجر." }, page: "admin-tenant-placeholder-site-overview" },
    { title: { en: "Domains", ar: "النطاقات" }, description: { en: "Review the current storefront domain.", ar: "راجع نطاق المتجر الحالي." }, page: "admin-tenant-placeholder-site-website" },
    { title: { en: "Manage plan", ar: "إدارة الخطة" }, description: { en: "Plan management is not available here.", ar: "إدارة الخطة غير متاحة هنا." } },
    { title: { en: "Business email", ar: "البريد التجاري" }, description: { en: "Business email setup is not connected.", ar: "إعداد البريد التجاري غير متصل." } },
    { title: { en: "Website performance settings", ar: "إعدادات أداء الموقع" }, description: { en: "Open the existing site-speed page.", ar: "فتح صفحة سرعة الموقع الحالية." }, page: "admin-tenant-placeholder-site-speed" },
    { title: { en: "Site member settings", ar: "إعدادات أعضاء الموقع" }, description: { en: "Member settings are not available yet.", ar: "إعدادات الأعضاء غير متاحة بعد." } },
    { title: { en: "Compliance, privacy & cookies", ar: "الامتثال والخصوصية وملفات الارتباط" }, description: { en: "Compliance tooling is not connected.", ar: "أدوات الامتثال غير متصلة." } },
  ]},
  { title: { en: "General", ar: "عام" }, icon: Settings, rows: [
    { title: { en: "Roles & permissions", ar: "الأدوار والصلاحيات" }, description: { en: "Manage company staff access.", ar: "إدارة وصول موظفي الشركة." }, page: "admin-staff" },
    { title: { en: "Business info", ar: "معلومات النشاط" }, description: { en: "Open existing company settings.", ar: "فتح إعدادات الشركة الحالية." }, page: "admin-settings" },
    { title: { en: "AI integrations", ar: "تكاملات الذكاء الاصطناعي" }, description: { en: "No verified AI integration is connected.", ar: "لا يوجد تكامل ذكاء اصطناعي موثّق متصل." } },
    { title: { en: "Mobile app", ar: "تطبيق الجوال" }, description: { en: "Open the current mobile-app overview.", ar: "فتح نظرة عامة على تطبيق الجوال." }, page: "admin-tenant-placeholder-site-mobile-app" },
    { title: { en: "Language & region", ar: "اللغة والمنطقة" }, description: { en: "Uses the current company language and currency.", ar: "يستخدم لغة وعملة الشركة الحالية." } },
  ]},
  { title: { en: "Communications & notifications", ar: "الاتصالات والإشعارات" }, icon: Bell, rows: [
    { title: { en: "Inbox settings", ar: "إعدادات البريد الوارد" }, description: { en: "Open the existing company inbox.", ar: "فتح صندوق بريد الشركة الحالي." }, page: "admin-inbox" },
    { title: { en: "Communication channels", ar: "قنوات الاتصال" }, description: { en: "No verified channel configuration is connected.", ar: "لا يوجد إعداد قناة موثّق متصل." } },
    { title: { en: "Notifications you get", ar: "الإشعارات التي تستلمها" }, description: { en: "Open booking notification setup.", ar: "فتح إعداد إشعارات الحجز." }, page: "admin-settings-bookings-notifications-received" },
    { title: { en: "Notifications you send", ar: "الإشعارات التي ترسلها" }, description: { en: "Open booking notification setup.", ar: "فتح إعداد إشعارات الحجز." }, page: "admin-settings-bookings-notifications-sent" },
  ]},
  { title: { en: "Development & integrations", ar: "التطوير والتكاملات" }, icon: Code2, rows: [
    { title: { en: "Custom code", ar: "الكود المخصص" }, description: { en: "Custom code management is not available.", ar: "إدارة الكود المخصص غير متاحة." } },
    { title: { en: "Headless settings", ar: "إعدادات Headless" }, description: { en: "Headless configuration is not available.", ar: "إعداد Headless غير متاح." } },
    { title: { en: "Marketing integrations", ar: "تكاملات التسويق" }, description: { en: "Marketing integration setup is not available.", ar: "إعداد تكاملات التسويق غير متاح." } },
  ]},
]);

function SettingsHub({ language, onNavigate, onUnsupported }) {
  const [query, setQuery] = React.useState("");
  const sections = filterSettingsSections(settingsHubSections, query, language);
  return <><label className="settings-hub-search"><Search size={20} /><input aria-label={ml(language, "Search settings", "البحث في الإعدادات")} onChange={(event) => setQuery(event.target.value)} placeholder={ml(language, "Search settings", "البحث في الإعدادات")} value={query} /></label><div className="settings-hub-list">{sections.map((section) => <section className="tenant-management-card settings-hub-section" key={localizedSetting(section.title, "en")}><header><section.icon size={21} /><h2>{localizedSetting(section.title, language)}</h2></header>{section.rows.map((row) => <SettingRow description={row.page === "admin-settings" ? ml(language, "Company information editing is unavailable from this hub.", "تحرير معلومات الشركة غير متاح من هذه الصفحة.") : localizedSetting(row.description, language)} disabled={!row.page || row.page === "admin-settings"} key={localizedSetting(row.title, "en")} language={language} onClick={() => row.page && row.page !== "admin-settings" ? onNavigate(row.page) : onUnsupported()} title={localizedSetting(row.title, language)} />)}</section>)}</div>{sections.length === 0 && <EmptyManagementState description={ml(language, "Try a different word or phrase.", "جرّب كلمة أو عبارة مختلفة.")} icon={Search} title={ml(language, "No settings found", "لم يتم العثور على إعدادات")} />}</>;
}

function FinanceShell({ activePage, children, language, onNavigate }) {
  return <><SettingsTabs active={activePage === "admin-settings-getting-paid" ? "admin-settings-getting-paid-general" : activePage} language={language} onNavigate={onNavigate} tabs={financeTabs} />{children}</>;
}

function GeneralGettingPaid({ company, language }) {
  const currency = companySetting(company, "currency") || companySetting(company, "currencyCode");
  return <div className="settings-two-column"><section className="tenant-management-card settings-detail-card"><h2>{ml(language, "General details", "التفاصيل العامة")}</h2><dl><div><dt>{ml(language, "Company", "الشركة")}</dt><dd>{companyDisplayName(company, language)}</dd></div><div><dt>{ml(language, "Company identifier", "معرّف الشركة")}</dt><dd>{company?.id || company?.slug || "—"}</dd></div><div><dt>{ml(language, "Currency", "العملة")}</dt><dd>{currency || ml(language, "Not configured", "غير مهيأة")}</dd></div><div><dt>{ml(language, "Default payment terms", "شروط الدفع الافتراضية")}</dt><dd>{ml(language, "Not configured", "غير مهيأة")}</dd></div></dl></section><section className="tenant-management-card settings-detail-card"><h2>{ml(language, "Tax", "الضريبة")}</h2><p>{ml(language, "No verified automated tax service is connected.", "لا توجد خدمة ضريبية آلية موثّقة متصلة.")}</p><span className="tenant-status-pill">{ml(language, "Not connected", "غير متصل")}</span></section></div>;
}

const previewSections = ["Header details", "Business info", "Tax display", "Payments received", "Footer notes"];
function DocumentCustomization({ company, language, receipt = false }) {
  const sections = receipt ? ["Design", "Numbering", "Header", "Business info", "Customer details", "Item and tax display", "Footer notes"] : previewSections;
  const title = receipt ? ml(language, "Receipt preview", "معاينة الإيصال") : ml(language, "Invoice preview", "معاينة الفاتورة");
  return <><HonestNotice language={language} title={ml(language, "Preview only", "معاينة فقط")}>{ml(language, "This layout is not a real billing record and saving is unavailable without a supported settings API.", "هذا التخطيط ليس سجلاً مالياً حقيقياً والحفظ غير متاح دون واجهة إعدادات مدعومة.")}</HonestNotice><div className="document-settings-layout"><div className="settings-accordion-list">{sections.map((section) => <button key={section} type="button"><span>{ml(language, section, section)}</span><ChevronDown size={17} /></button>)}</div><article className="document-preview"><small>{ml(language, "EXAMPLE PREVIEW", "معاينة مثال")}</small><div className="document-preview-brand"><span>{company?.logoUrl ? <img alt="" src={company.logoUrl} /> : <Building2 size={28} />}</span><div><strong>{companyDisplayName(company, language)}</strong><p>{companySetting(company, "email") || company?.email || ml(language, "Business email not configured", "البريد التجاري غير مهيأ")}</p></div></div><h2>{title}</h2><div className="document-preview-lines"><i /><i /><i /><i /></div><div className="document-preview-total"><span>{ml(language, "Preview total", "إجمالي المعاينة")}</span><strong>{formatCompanyCurrency(0, company, language)}</strong></div></article></div></>;
}

function SimpleSettingsForm({ language, type }) {
  const configs = {
    quotes: ["Business details", "Quote numbering", "Accepted quote conversion", "Default notes", "Terms"],
    checkout: ["Checkout form", "Subscription opt-in", "Checkout header", "Billing address fields", "Policies", "Policy agreement checkbox", "Contact us", "Cart and checkout validations", "Additional fees", "Payments", "Gift cards", "Billing documents", "Invoices", "Receipt automation"],
  };
  return <div className="settings-accordion-list wide">{configs[type].map((item) => <button key={item} type="button"><span>{ml(language, item, item)}</span><ChevronDown size={17} /></button>)}</div>;
}

function TaxSettings({ language, onUnsupported }) {
  return <><HonestNotice language={language} title={ml(language, "Automated tax is not connected", "الضريبة الآلية غير متصلة")}>{ml(language, "Tax values are not calculated or saved by this page.", "لا يتم حساب أو حفظ قيم الضريبة من هذه الصفحة.")}</HonestNotice><section className="tenant-management-card settings-detail-card"><div className="tenant-section-heading"><div><h2>{ml(language, "Tax locations", "مواقع الضريبة")}</h2><p>{ml(language, "No verified tax locations exist.", "لا توجد مواقع ضريبية موثّقة.")}</p></div><button className="tenant-primary-button" onClick={onUnsupported} type="button">{ml(language, "Add Location", "إضافة موقع")}</button></div><EmptyManagementState description={ml(language, "Locations will appear here when a supported tax service is configured.", "ستظهر المواقع هنا عند إعداد خدمة ضريبية مدعومة.")} icon={Percent} title={ml(language, "No tax locations", "لا توجد مواقع ضريبية")} /></section><div className="settings-two-column"><section className="tenant-management-card settings-detail-card"><h2>{ml(language, "Tax settings", "إعدادات الضريبة")}</h2><label className="read-only-option"><input disabled type="radio" />{ml(language, "Tax added at checkout", "تضاف الضريبة عند الدفع")}</label><label className="read-only-option"><input disabled type="radio" />{ml(language, "Tax included in prices", "الضريبة مشمولة في الأسعار")}</label></section><section className="tenant-management-card settings-detail-card"><h2>{ml(language, "Tax groups & exemptions", "المجموعات والإعفاءات الضريبية")}</h2><p>{ml(language, "No verified groups or customer exemptions.", "لا توجد مجموعات أو إعفاءات عملاء موثّقة.")}</p></section></div></>;
}

function MainContent({ activePage, company, currentUser, language, onNavigate, onUnsupported }) {
  if (activePage === "admin-settings") return <SettingsHub language={language} onNavigate={onNavigate} onUnsupported={onUnsupported} />;
  if (activePage.startsWith("admin-settings-getting-paid")) {
    let content = <GeneralGettingPaid company={company} language={language} />;
    if (activePage === "admin-settings-getting-paid-invoices") content = <DocumentCustomization company={company} language={language} />;
    if (activePage === "admin-settings-getting-paid-price-quotes") content = <><HonestNotice language={language}>{ml(language, "Quote settings are read-only because no persistence API is available.", "إعدادات عروض الأسعار للقراءة فقط لعدم توفر واجهة حفظ.")}</HonestNotice><SimpleSettingsForm language={language} type="quotes" /></>;
    if (activePage === "admin-settings-getting-paid-pay-links") content = <EmptyManagementState action={<button className="tenant-secondary-button" onClick={onUnsupported} type="button">{ml(language, "Go to Pay Links", "الانتقال إلى روابط الدفع")}</button>} description={ml(language, "A payment-link service is not connected for this company.", "خدمة روابط الدفع غير متصلة لهذه الشركة.")} icon={CreditCard} title={ml(language, "Set up payment links", "إعداد روابط الدفع")} />;
    if (activePage === "admin-settings-getting-paid-automations") content = <EmptyManagementState description={ml(language, "No installed billing automations. Recommended workflows are templates only.", "لا توجد أتمتة فوترة مثبتة. التدفقات المقترحة قوالب فقط.")} icon={CircleDollarSign} title={ml(language, "Billing automations unavailable", "أتمتة الفوترة غير متاحة")} />;
    return <FinanceShell activePage={activePage} language={language} onNavigate={onNavigate}>{content}</FinanceShell>;
  }
  if (activePage.startsWith("admin-settings-receipts")) return <><SettingsTabs active={activePage} language={language} onNavigate={onNavigate} tabs={[{ page: "admin-settings-receipts", en: "Customization", ar: "التخصيص" }, { page: "admin-settings-receipts-automations", en: "Automations", ar: "الأتمتة" }]} />{activePage.endsWith("automations") ? <EmptyManagementState description={ml(language, "Receipt switches remain inactive because no receipt automation service is connected.", "تظل مفاتيح الإيصالات غير نشطة لعدم اتصال خدمة أتمتة الإيصالات.")} icon={ReceiptText} title={ml(language, "Automated receipts unavailable", "الإيصالات الآلية غير متاحة")} /> : <DocumentCustomization company={company} language={language} receipt />}</>;
  if (activePage === "admin-settings-tax") return <TaxSettings language={language} onUnsupported={onUnsupported} />;
  if (activePage.startsWith("admin-settings-checkout")) return <><SettingsTabs active={activePage} language={language} onNavigate={onNavigate} tabs={[{ page: "admin-settings-checkout", en: "Customization", ar: "التخصيص" }, { page: "admin-settings-checkout-emails", en: "Emails & Notifications", ar: "البريد والإشعارات" }]} />{activePage.endsWith("emails") ? <><HonestNotice language={language} title={ml(language, "Email automation is not configured", "أتمتة البريد غير مهيأة")}>{ml(language, "No active order-email system is confirmed for this company.", "لم يتم تأكيد نظام بريد طلبات نشط لهذه الشركة.")}</HonestNotice><EmptyManagementState description={ml(language, "Email templates can be edited after a supported service is connected.", "يمكن تعديل قوالب البريد بعد ربط خدمة مدعومة.")} icon={Mail} title={ml(language, "Order emails unavailable", "رسائل الطلبات غير متاحة")} /></> : <><HonestNotice language={language}>{ml(language, "Checkout controls are read-only because a persistence API is unavailable.", "عناصر الدفع للقراءة فقط لعدم توفر واجهة حفظ.")}</HonestNotice><SimpleSettingsForm language={language} type="checkout" /><section className="tenant-management-card settings-detail-card"><h2>{ml(language, "Recommended integrations", "التكاملات المقترحة")}</h2><p>{ml(language, "No verified checkout integrations are available yet.", "لا توجد تكاملات دفع موثّقة متاحة بعد.")}</p></section></>}</>;
  if (activePage === "admin-settings-shipping") {
    return (
      <>
        <HonestNotice language={language} title={ml(language, "Delivery zones", "مناطق التوصيل")}>
          {ml(
            language,
            "Configure city-based delivery prices used at checkout. Changes are saved immediately.",
            "اضبط أسعار التوصيل حسب المدينة المستخدمة عند الدفع. يتم حفظ التغييرات فوراً.",
          )}
        </HonestNotice>
        <DeliveryZonesWorkspace
          compact
          company={company}
          currentUser={currentUser}
          language={language}
          onNavigate={onNavigate}
        />
      </>
    );
  }
  return null;
}

function pageMeta(activePage, language) {
  if (activePage === "admin-settings") return [ml(language, "Settings", "الإعدادات"), ""];
  if (activePage.startsWith("admin-settings-getting-paid")) return [ml(language, "Getting Paid", "استلام المدفوعات"), ml(language, "Review billing presentation and supported payment settings.", "راجع عرض الفوترة وإعدادات الدفع المدعومة.")];
  if (activePage.startsWith("admin-settings-receipts")) return [ml(language, "Receipt Settings", "إعدادات الإيصالات"), ml(language, "Customize the receipt preview and review automation availability.", "خصّص معاينة الإيصال وراجع توفر الأتمتة.")];
  if (activePage === "admin-settings-tax") return [ml(language, "Tax", "الضريبة"), ml(language, "Review tax presentation without implying automated calculation.", "راجع عرض الضريبة دون الإيحاء بالحساب الآلي.")];
  if (activePage.startsWith("admin-settings-checkout")) return [ml(language, "Checkout", "الدفع"), ml(language, "Review checkout presentation and notification setup.", "راجع عرض الدفع وإعداد الإشعارات.")];
  return [ml(language, "Shipping, Delivery & Fulfillment", "الشحن والتوصيل والتنفيذ"), ml(language, "Review verified shipping regions and delivery methods.", "راجع مناطق الشحن وطرق التوصيل الموثّقة.")];
}

export default function AdminSettingsPage({ activePage = "admin-settings", company, currentUser, language = "en", onNavigate, t, ...layout }) {
  const [unsupported, setUnsupported] = React.useState(false);
  const [title, description] = pageMeta(activePage, language);
  const savePage = !["admin-settings", "admin-settings-tax", "admin-settings-shipping"].includes(activePage);
  return <ManagementShell activePage={activePage} className={activePage === "admin-settings" ? "tenant-settings-hub-page" : "tenant-settings-detail-page"} company={company} currentUser={currentUser} language={language} onNavigate={onNavigate} {...layout}><ManagementHeader actions={savePage ? <><button className="tenant-secondary-button" onClick={() => onNavigate("admin-settings")} type="button">{ml(language, "Cancel", "إلغاء")}</button><button className="tenant-primary-button" disabled type="button">{ml(language, "Save", "حفظ")}</button></> : null} breadcrumbs={activePage === "admin-settings" ? [] : [{ label: ml(language, "Settings", "الإعدادات"), page: "admin-settings" }, { label: title }]} description={description} language={language} onNavigate={onNavigate} title={title} /><MainContent activePage={activePage} company={company} currentUser={currentUser} language={language} onNavigate={onNavigate} onUnsupported={() => setUnsupported(true)} />{unsupported && <UnsupportedDialog language={language} onClose={() => setUnsupported(false)} t={t} />}</ManagementShell>;
}
