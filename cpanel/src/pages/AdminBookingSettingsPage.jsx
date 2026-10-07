import React from "react";
import {
  ChevronDown,
  Clock3,
  DoorOpen,
  FormInput,
  Grid2X2,
  Link2,
  List,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Smartphone,
  Users,
  Video,
} from "lucide-react";
import { employeeDisplayName } from "../utils/bookings.js";
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

const bookingSections = [
  { titleEn: "Bookings Setup", titleAr: "إعداد الحجوزات", rows: [
    ["Default hours", "الساعات الافتراضية", "Set the weekly availability baseline.", "تعيين خط أساس التوفر الأسبوعي.", "admin-settings-bookings-default-hours"],
    ["Add-ons", "الإضافات", "Review service add-on availability.", "راجع توفر إضافات الخدمات.", "admin-settings-bookings-add-ons"],
    ["Staff", "الموظفون", "Review real company employees.", "راجع موظفي الشركة الحقيقيين.", "admin-settings-bookings-staff"],
    ["Resources & rooms", "الموارد والغرف", "Manage supported booking resources.", "إدارة موارد الحجز المدعومة.", "admin-settings-bookings-resources"],
    ["Notifications you send", "الإشعارات التي ترسلها", "Review outgoing notification channels.", "راجع قنوات الإشعارات الصادرة.", "admin-settings-bookings-notifications-sent"],
    ["Notifications you get", "الإشعارات التي تستلمها", "Review internal notification channels.", "راجع قنوات الإشعارات الداخلية.", "admin-settings-bookings-notifications-received"],
    ["Tips", "النصائح", "Booking guidance is not available yet.", "إرشادات الحجز غير متاحة بعد.", null],
  ]},
  { titleEn: "Online Bookings", titleAr: "الحجوزات عبر الإنترنت", rows: [
    ["Client booking flow", "تدفق حجز العميل", "Review the read-only booking journey.", "راجع رحلة الحجز للقراءة فقط.", "admin-settings-bookings-client-flow"],
    ["Booking form", "نموذج الحجز", "Review verified booking forms.", "راجع نماذج الحجز الموثّقة.", "admin-settings-bookings-forms"],
    ["Booking policies", "سياسات الحجز", "Policy persistence is not available.", "حفظ السياسات غير متاح.", null],
    ["Booking widgets", "أدوات الحجز", "Widget setup is not available.", "إعداد أدوات الحجز غير متاح.", null],
  ]},
  { titleEn: "Integrations", titleAr: "التكاملات", rows: [
    ["Video conferencing", "مؤتمرات الفيديو", "Review connection options and status.", "راجع خيارات الاتصال وحالته.", "admin-settings-bookings-video-conferencing"],
    ["Booking integrations", "تكاملات الحجز", "Discover options without claiming connection.", "استكشف الخيارات دون الادعاء بالاتصال.", "admin-settings-bookings-integrations"],
  ]},
];

function BookingSettingsHub({ language, onNavigate, onUnsupported }) {
  return <div className="booking-settings-hub">{bookingSections.map((section) => <section className="tenant-management-card" key={section.titleEn}><header><h2>{ml(language, section.titleEn, section.titleAr)}</h2></header>{section.rows.map(([en, ar, descEn, descAr, page]) => <SettingRow description={ml(language, descEn, descAr)} disabled={!page} key={en} language={language} onClick={() => page ? onNavigate(page) : onUnsupported()} title={ml(language, en, ar)} />)}</section>)}</div>;
}

function DefaultHours({ language }) {
  const days = [["Sunday", "الأحد"], ["Monday", "الاثنين"], ["Tuesday", "الثلاثاء"], ["Wednesday", "الأربعاء"], ["Thursday", "الخميس"], ["Friday", "الجمعة"], ["Saturday", "السبت"]];
  return <><HonestNotice language={language} title={ml(language, "Availability is not configured", "التوفر غير مهيأ")}>{ml(language, "No hours are prefilled and Save remains disabled until an availability API exists.", "لم تتم تعبئة ساعات مسبقاً وسيبقى الحفظ معطلاً حتى تتوفر واجهة للتوفر.")}</HonestNotice><div className="booking-hours-layout"><section className="tenant-management-card"><div className="tenant-section-heading"><div><h2>{ml(language, "Set default hours", "تعيين الساعات الافتراضية")}</h2><p>{ml(language, "Choose intervals after scheduling support is connected.", "اختر الفترات بعد ربط دعم الجدولة.")}</p></div></div>{days.map(([en, ar]) => <div className="booking-day-row" key={en}><input aria-label={ml(language, en, ar)} disabled type="checkbox" /><strong>{ml(language, en, ar)}</strong><span>{ml(language, "Unavailable", "غير متاح")}</span><button disabled type="button"><Plus size={16} />{ml(language, "Add interval", "إضافة فترة")}</button></div>)}</section><aside className="tenant-management-card booking-tools-card"><Clock3 size={28} /><h3>{ml(language, "More scheduling tools", "المزيد من أدوات الجدولة")}</h3><p>{ml(language, "Use Work Schedule to review employees. Availability editing is not configured.", "استخدم جدول العمل لمراجعة الموظفين. تعديل التوفر غير مهيأ.")}</p></aside></div></>;
}

function StaffSettings({ employees, language, onUnsupported }) {
  const [query, setQuery] = React.useState("");
  const realEmployees = Array.isArray(employees) ? employees.filter((employee) => employee && employee.id) : [];
  const filtered = realEmployees.filter((employee) => employeeDisplayName(employee, language).toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <section className="tenant-management-card booking-staff-card"><div className="booking-settings-toolbar"><label className="tenant-management-search"><Search size={17} /><input onChange={(event) => setQuery(event.target.value)} placeholder={ml(language, "Search staff", "البحث عن موظف")} value={query} /></label><button className="tenant-secondary-button" onClick={onUnsupported} type="button">{ml(language, "Manage", "إدارة")}</button></div>{filtered.length ? <div className="booking-settings-table-wrap"><table><thead><tr><th>{ml(language, "Name", "الاسم")}</th><th>{ml(language, "Permission", "الصلاحية")}</th><th>{ml(language, "Email", "البريد")}</th><th>{ml(language, "Phone", "الهاتف")}</th><th>{ml(language, "Actions", "الإجراءات")}</th></tr></thead><tbody>{filtered.map((employee) => <tr key={employee.id}><td>{employeeDisplayName(employee, language)}</td><td>{employee.role || employee.position || "—"}</td><td>{employee.email || "—"}</td><td>{employee.phone || employee.phoneNumber || "—"}</td><td><button aria-label={ml(language, "Actions", "الإجراءات")} onClick={onUnsupported} type="button"><MoreHorizontal size={18} /></button></td></tr>)}</tbody></table></div> : <EmptyManagementState description={query ? ml(language, "No employee matches this search.", "لا يوجد موظف يطابق البحث.") : ml(language, "Real company employees will appear here when available.", "سيظهر موظفو الشركة الحقيقيون هنا عند توفرهم.")} icon={Users} title={ml(language, query ? "No matching staff" : "No staff records", query ? "لا يوجد موظف مطابق" : "لا توجد سجلات موظفين")} />}</section>;
}

function ResourceSettings({ language, onUnsupported }) {
  return <section className="tenant-management-card"><div className="booking-settings-toolbar"><label className="tenant-management-search"><Search size={17} /><input placeholder={ml(language, "Search resources", "البحث في الموارد")} /></label><div><button className="tenant-icon-button" type="button"><List size={17} /></button><button className="tenant-icon-button" type="button"><Grid2X2 size={17} /></button></div></div><EmptyManagementState action={<button className="tenant-primary-button" onClick={onUnsupported} type="button">{ml(language, "Create Resource Category", "إنشاء فئة مورد")}</button>} description={ml(language, "No verified rooms or resources are available for this company.", "لا توجد غرف أو موارد موثّقة لهذه الشركة.")} icon={DoorOpen} title={ml(language, "No resources yet", "لا توجد موارد بعد")} /></section>;
}

function NotificationSettings({ activePage, language, onNavigate, onUnsupported }) {
  const sent = activePage.endsWith("notifications-sent");
  const tabs = sent ? [["whatsapp", "WhatsApp", "واتساب"], ["sms", "SMS", "رسائل نصية"], ["email", "Emails", "البريد الإلكتروني"]] : [["email", "Emails", "البريد الإلكتروني"], ["sms", "SMS", "رسائل نصية"]];
  const [tab, setTab] = React.useState(tabs[0][0]);
  const rows = sent ? ["Booking confirmation", "Booking reminder", "Booking change", "Booking cancellation"] : ["New booking", "Booking change", "Booking cancellation"];
  return <><HonestNotice language={language} title={ml(language, "Communication channel not connected", "قناة الاتصال غير متصلة")}>{ml(language, "Rules are shown for setup reference only. Every switch remains inactive.", "تظهر القواعد كمرجع للإعداد فقط. جميع المفاتيح غير نشطة.")}</HonestNotice><section className="tenant-management-card notification-settings-card"><div className="tenant-settings-tabs" role="tablist">{tabs.map(([id, en, ar]) => <button aria-selected={tab === id} className={tab === id ? "active" : ""} key={id} onClick={() => setTab(id)} role="tab" type="button">{ml(language, en, ar)}</button>)}</div>{rows.map((row) => <div className="notification-rule-row" key={row}><span className="notification-rule-icon">{tab === "email" ? <Mail size={18} /> : tab === "sms" ? <Smartphone size={18} /> : <MessageSquare size={18} />}</span><div><strong>{ml(language, row, row)}</strong><small>{ml(language, "Unavailable until the selected channel is connected.", "غير متاح حتى يتم ربط القناة المحددة.")}</small></div><span className="tenant-status-pill">{ml(language, "Inactive", "غير نشط")}</span><label className="tenant-switch"><input disabled type="checkbox" /><span /></label><button aria-label={ml(language, "More", "المزيد")} onClick={onUnsupported} type="button"><MoreHorizontal size={17} /></button></div>)}</section><button className="tenant-management-link" onClick={() => onNavigate("admin-automations")} type="button">{ml(language, "Go to Automations", "الانتقال إلى الأتمتة")}</button></>;
}

function ClientFlow({ language }) {
  const sections = ["Service selection", "Staff selection", "Location selection", "Available time slots", "Appointment waitlist", "Time zone", "Booking form", "Checkout settings", "Cart", "Tips", "Discounts", "Booking widgets"];
  return <><HonestNotice language={language}>{ml(language, "This is a read-only setup reference. No selections are saved.", "هذا مرجع إعداد للقراءة فقط. لا يتم حفظ أي اختيار.")}</HonestNotice><section className="tenant-management-card client-flow-card">{sections.map((section, index) => <div className="client-flow-row" key={section}><span>{index + 1}</span><div><strong>{ml(language, section, section)}</strong><small>{ml(language, "Not configured", "غير مهيأ")}</small></div><label className="tenant-switch"><input disabled type="checkbox" /><span /></label><ChevronDown size={17} /></div>)}</section></>;
}

function FormsSettings({ language, onUnsupported }) {
  return <section className="tenant-management-card"><div className="booking-settings-toolbar"><label className="tenant-management-search"><Search size={17} /><input placeholder={ml(language, "Search forms", "البحث في النماذج")} /></label><button className="tenant-primary-button" onClick={onUnsupported} type="button"><Plus size={17} />{ml(language, "Create New Form", "إنشاء نموذج جديد")}</button></div><div className="booking-settings-table-head"><span>{ml(language, "Form", "النموذج")}</span><span>{ml(language, "Connected Services", "الخدمات المتصلة")}</span><span /></div><EmptyManagementState description={ml(language, "No tenant-scoped booking form data source is available.", "لا يوجد مصدر بيانات نموذج حجز ضمن نطاق الشركة.")} icon={FormInput} title={ml(language, "No booking forms", "لا توجد نماذج حجز")} /></section>;
}

function VideoSettings({ language, onUnsupported }) {
  const options = [["Google Meet", Video], ["Zoom", Video], ["Custom link", Link2]];
  return <section className="video-connection-card tenant-management-card"><HonestNotice language={language}>{ml(language, "All options are not connected. Continue cannot create a connection.", "جميع الخيارات غير متصلة. المتابعة لا تنشئ اتصالاً.")}</HonestNotice><div className="integration-option-list">{options.map(([name, Icon]) => <button key={name} onClick={onUnsupported} type="button"><span><Icon size={21} /></span><div><strong>{name}</strong><small>{ml(language, "Not connected", "غير متصل")}</small></div><span className="tenant-status-pill">{ml(language, "Unavailable", "غير متاح")}</span></button>)}</div><div className="tenant-management-actions"><button className="tenant-secondary-button" type="button">{ml(language, "Cancel", "إلغاء")}</button><button className="tenant-primary-button" disabled type="button">{ml(language, "Continue", "متابعة")}</button></div></section>;
}

function IntegrationSettings({ language, onUnsupported }) {
  const [tab, setTab] = React.useState("channels");
  const integrations = [["Facebook", "Booking channel"], ["Instagram", "Booking channel"], ["Google", "Discovery option"], ["Video conferencing", "Meeting option"]];
  return <><div className="tenant-settings-tabs" role="tablist"><button aria-selected={tab === "channels"} className={tab === "channels" ? "active" : ""} onClick={() => setTab("channels")} role="tab" type="button">{ml(language, "Booking channels", "قنوات الحجز")}</button><button aria-selected={tab === "tools"} className={tab === "tools" ? "active" : ""} onClick={() => setTab("tools")} role="tab" type="button">{ml(language, "Business tools", "أدوات الأعمال")}</button></div><div className="booking-integration-grid">{integrations.map(([name, category]) => <article className="tenant-management-card" key={name}><span><Link2 size={24} /></span><small>{category}</small><h3>{name}</h3><p>{ml(language, "Connection is not verified for this company.", "الاتصال غير موثّق لهذه الشركة.")}</p><div><span className="tenant-status-pill">{ml(language, "Not connected", "غير متصل")}</span><button className="tenant-secondary-button" onClick={onUnsupported} type="button">{ml(language, "Connect", "اتصال")}</button></div></article>)}</div></>;
}

function PageBody({ activePage, employees, language, onNavigate, onUnsupported }) {
  if (activePage === "admin-settings-bookings") return <BookingSettingsHub language={language} onNavigate={onNavigate} onUnsupported={onUnsupported} />;
  if (activePage === "admin-settings-bookings-default-hours") return <DefaultHours language={language} />;
  if (activePage === "admin-settings-bookings-add-ons") return <EmptyManagementState action={<><button className="tenant-secondary-button" onClick={() => onNavigate("admin-tenant-placeholder-catalog-booking-services")} type="button">{ml(language, "Go to Services", "الانتقال إلى الخدمات")}</button><button className="tenant-primary-button" onClick={onUnsupported} type="button">{ml(language, "Create New Add-On", "إنشاء إضافة جديدة")}</button></>} description={ml(language, "No verified booking add-ons exist.", "لا توجد إضافات حجز موثّقة.")} icon={Plus} title={ml(language, "No add-ons yet", "لا توجد إضافات بعد")} />;
  if (activePage === "admin-settings-bookings-staff") return <StaffSettings employees={employees} language={language} onUnsupported={onUnsupported} />;
  if (activePage === "admin-settings-bookings-resources") return <ResourceSettings language={language} onUnsupported={onUnsupported} />;
  if (activePage.includes("notifications-")) return <NotificationSettings activePage={activePage} language={language} onNavigate={onNavigate} onUnsupported={onUnsupported} />;
  if (activePage === "admin-settings-bookings-client-flow") return <ClientFlow language={language} />;
  if (activePage === "admin-settings-bookings-forms") return <FormsSettings language={language} onUnsupported={onUnsupported} />;
  if (activePage === "admin-settings-bookings-video-conferencing") return <VideoSettings language={language} onUnsupported={onUnsupported} />;
  return <IntegrationSettings language={language} onUnsupported={onUnsupported} />;
}

function pageTitle(activePage, language) {
  const titles = {
    "admin-settings-bookings": ["Booking Settings", "إعدادات الحجز"],
    "admin-settings-bookings-default-hours": ["Default Hours", "الساعات الافتراضية"],
    "admin-settings-bookings-add-ons": ["Add-ons", "الإضافات"],
    "admin-settings-bookings-staff": ["Staff", "الموظفون"],
    "admin-settings-bookings-resources": ["Resources & Rooms", "الموارد والغرف"],
    "admin-settings-bookings-notifications-sent": ["Notifications You Send", "الإشعارات التي ترسلها"],
    "admin-settings-bookings-notifications-received": ["Notifications You Get", "الإشعارات التي تستلمها"],
    "admin-settings-bookings-client-flow": ["Client Booking Flow", "تدفق حجز العميل"],
    "admin-settings-bookings-forms": ["Booking Form", "نموذج الحجز"],
    "admin-settings-bookings-video-conferencing": ["Video Conferencing", "مؤتمرات الفيديو"],
    "admin-settings-bookings-integrations": ["Booking Integrations", "تكاملات الحجز"],
  };
  return ml(language, ...(titles[activePage] || titles["admin-settings-bookings"]));
}

export default function AdminBookingSettingsPage({ activePage = "admin-settings-bookings", company, currentUser, employees = [], language = "en", onNavigate, t, ...layout }) {
  const [unsupported, setUnsupported] = React.useState(false);
  const title = pageTitle(activePage, language);
  const child = activePage !== "admin-settings-bookings";
  const save = ["admin-settings-bookings-default-hours", "admin-settings-bookings-client-flow"].includes(activePage);
  const actions = save ? <><button className="tenant-secondary-button" onClick={() => onNavigate("admin-settings-bookings")} type="button">{ml(language, "Cancel", "إلغاء")}</button><button className="tenant-primary-button" disabled type="button">{ml(language, "Save", "حفظ")}</button></> : activePage === "admin-settings-bookings-staff" ? <button className="tenant-primary-button" onClick={() => setUnsupported(true)} type="button"><Plus size={17} />{ml(language, "Add Staff", "إضافة موظف")}</button> : null;
  return <ManagementShell activePage={activePage} company={company} currentUser={currentUser} language={language} onNavigate={onNavigate} {...layout}><ManagementHeader actions={actions} breadcrumbs={child ? [{ label: ml(language, "Settings", "الإعدادات"), page: "admin-settings" }, { label: ml(language, "Booking Settings", "إعدادات الحجز"), page: "admin-settings-bookings" }, { label: title }] : [{ label: ml(language, "Settings", "الإعدادات"), page: "admin-settings" }, { label: title }]} description={child ? ml(language, "Tenant-scoped booking configuration and verified company data.", "إعداد حجز ضمن نطاق الشركة وبيانات شركة موثّقة.") : ml(language, "Configure supported booking tools and review unavailable services honestly.", "هيئ أدوات الحجز المدعومة وراجع الخدمات غير المتاحة بوضوح.")} language={language} onNavigate={onNavigate} title={title} /><PageBody activePage={activePage} employees={employees} language={language} onNavigate={onNavigate} onUnsupported={() => setUnsupported(true)} />{unsupported && <UnsupportedDialog language={language} onClose={() => setUnsupported(false)} t={t} />}</ManagementShell>;
}
