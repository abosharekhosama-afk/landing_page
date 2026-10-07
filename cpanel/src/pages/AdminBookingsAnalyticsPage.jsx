import React from "react";
import {
  BarChart3,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  CircleHelp,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import { buildBookingSummary } from "../utils/bookings.js";
import { formatCompanyCurrency } from "../utils/sales.js";
import {
  bi,
  BookingEmpty,
  BookingPageShell,
  UnsupportedDialog,
} from "./AdminBookingShared.jsx";

function AnalyticsEmptyCard({ description, icon, language, title }) {
  return <article className="booking-analytics-empty-card"><BookingEmpty description={bi(language, description[0], description[1])} icon={icon} title={bi(language, title[0], title[1])} /></article>;
}

function ReportLink({ language, onClick }) {
  return <button className="booking-report-link" onClick={onClick} type="button">{bi(language, "View Report", "عرض التقرير")}</button>;
}

export default function AdminBookingsAnalyticsPage({ activePage = "admin-bookings-analytics", bookings = null, company, language = "en", t, ...layout }) {
  const [kind, setKind] = React.useState("classes");
  const [period, setPeriod] = React.useState("30");
  const [unsupported, setUnsupported] = React.useState(false);
  const summary = buildBookingSummary(bookings);
  const unavailable = !summary.available;
  const report = () => setUnsupported(true);
  return (
    <BookingPageShell activePage={activePage} className="booking-analytics-page" company={company} language={language} {...layout}>
      <div className="booking-page-content">
        <header className="booking-page-header"><div><h1>{bi(language, "Bookings Analytics", "تحليلات الحجوزات")}</h1><p>{bi(language, "Analyze verified booking performance and supported client and staff activity.", "حلّل أداء الحجوزات الموثق ونشاط العملاء والموظفين المدعوم.")} <button onClick={report} type="button">{bi(language, "Learn More", "معرفة المزيد")}</button></p></div></header>
        <section className="booking-analytics-controls"><select aria-label={bi(language, "Date range", "النطاق الزمني")} onChange={(event) => setPeriod(event.target.value)} value={period}><option value="7">{bi(language, "Last 7 days", "آخر 7 أيام")}</option><option value="30">{bi(language, "Last 30 days", "آخر 30 يوماً")}</option><option value="90">{bi(language, "Last 90 days", "آخر 90 يوماً")}</option></select><div className="booking-kind-toggle" role="tablist"><button aria-selected={kind === "classes"} onClick={() => setKind("classes")} role="tab" type="button">{bi(language, "Classes", "الصفوف")}</button><button aria-selected={kind === "appointments"} onClick={() => setKind("appointments")} role="tab" type="button">{bi(language, "Appointments", "المواعيد")}</button></div></section>
        <section className="booking-stats-question"><div><label><input aria-label={bi(language, "Ask a question about your stats", "اطرح سؤالاً عن إحصاءاتك")} disabled placeholder={bi(language, "Ask a question about your stats", "اطرح سؤالاً عن إحصاءاتك")} /><button onClick={report} type="button"><Sparkles size={15} />{bi(language, "Ask AI", "اسأل الذكاء الاصطناعي")}</button></label><button onClick={report} type="button">{bi(language, "Who is the busiest staff member?", "من أكثر الموظفين انشغالاً؟")}</button><button onClick={report} type="button">{bi(language, "Who were my first-time clients?", "من هم عملائي لأول مرة؟")}</button></div><button onClick={report} type="button"><Sparkles size={16} />{bi(language, "Summarize your data", "لخّص بياناتك")}</button><span>{bi(language, "Booking AI is not connected.", "ذكاء الحجوزات الاصطناعي غير متصل.")}</span></section>

        <div className="booking-analytics-two-column">
          <article className="booking-stat-card booking-spots-card"><header><div><span>{bi(language, "Spots filled", "الأماكن المشغولة")}</span><CircleHelp size={15} /><strong>{unavailable ? "—" : summary.bookings}</strong></div><div><button onClick={report} type="button">{bi(language, "All services", "كل الخدمات")}</button><button onClick={report} type="button">{bi(language, "All staff", "كل الموظفين")}</button></div></header><div className="booking-metric-track" /><div className="booking-spot-legend">{[["Checked in", "تم تسجيل الحضور"], ["No-show", "لم يحضر"], ["Not specified", "غير محدد"]].map(([en, ar]) => <span key={en}><i /><b>{bi(language, en, ar)}</b><strong>—</strong></span>)}</div><p>{bi(language, "No verified attendance or cancellation data is available for this period.", "لا تتوفر بيانات حضور أو إلغاء موثقة لهذه الفترة.")}</p><ReportLink language={language} onClick={report} /></article>
          <article className="booking-stat-card booking-occupancy-card"><header><span>{bi(language, "Predicted occupancy", "الإشغال المتوقع")}</span><button onClick={report} type="button">{bi(language, `Next ${period} days`, `الأيام ${period} القادمة`)}</button></header><BookingEmpty description={bi(language, "Predicted occupancy requires verified scheduled sessions.", "يتطلب الإشغال المتوقع جلسات مجدولة موثقة.")} icon={BarChart3} title={bi(language, "No verified occupancy data", "لا توجد بيانات إشغال موثقة")} /></article>
        </div>

        <div className="booking-analytics-feature-row">
          <article className="booking-top-sessions"><header><h2>{kind === "classes" ? bi(language, "Top class sessions", "أفضل جلسات الصفوف") : bi(language, "Top appointments", "أفضل المواعيد")}</h2></header><BookingEmpty description={bi(language, "Supported booking sessions will be ranked here when real data is available.", "سيتم ترتيب جلسات الحجز المدعومة هنا عند توفر بيانات حقيقية.")} icon={CalendarDays} title={bi(language, "No sessions in this period", "لا توجد جلسات في هذه الفترة")} /></article>
          <article className="booking-summary-card"><div className="booking-summary-kpis"><span><small>{bi(language, "Bookings", "الحجوزات")}</small><strong>{unavailable ? "—" : summary.bookings}</strong></span><span><small>{bi(language, "Booking sales", "مبيعات الحجوزات")}</small><strong>{unavailable ? "—" : formatCompanyCurrency(summary.revenue, company, language)}</strong></span></div><div className="booking-summary-tabs"><button className="active" onClick={report} type="button">{bi(language, "Traffic sources", "مصادر الزيارات")}</button><button onClick={report} type="button">{bi(language, "Booking channels", "قنوات الحجز")}</button></div><p>{bi(language, "No verified booking attribution source is connected.", "لا يوجد مصدر إحالة حجوزات موثّق متصل.")}</p><div className="booking-source-empty"><ChartNoAxesCombined size={35} /><span>{bi(language, "Source figures unavailable", "أرقام المصادر غير متاحة")}</span></div><ReportLink language={language} onClick={report} /></article>
        </div>

        <div className="booking-client-grid">
          <AnalyticsEmptyCard description={["Clients with supported bookings will appear here.", "سيظهر هنا العملاء الذين لديهم حجوزات مدعومة."]} icon={UsersRound} language={language} title={["No top clients in this period", "لا يوجد عملاء بارزون في هذه الفترة"]} />
          <AnalyticsEmptyCard description={["Verified first-time booking clients will appear here.", "سيظهر هنا عملاء الحجز لأول مرة بعد التحقق منهم."]} icon={UserRound} language={language} title={["No first-time clients", "لا يوجد عملاء لأول مرة"]} />
          <AnalyticsEmptyCard description={["Verified returning booking clients will appear here.", "سيظهر هنا عملاء الحجز العائدون بعد التحقق منهم."]} icon={UsersRound} language={language} title={["No returning clients", "لا يوجد عملاء عائدون"]} />
        </div>

        <section className="booking-staff-performance"><header><h2>{bi(language, "Staff performance", "أداء الموظفين")}</h2></header><BookingEmpty description={bi(language, "Staff performance appears after supported sessions are completed.", "يظهر أداء الموظفين بعد اكتمال جلسات مدعومة.")} icon={UsersRound} title={bi(language, "No verified staff activity in this period", "لا يوجد نشاط موظفين موثّق في هذه الفترة")} /><ReportLink language={language} onClick={report} /></section>
        <button className="booking-back-top" onClick={() => window.document.querySelector(".admin-workspace")?.scrollTo({ top: 0, behavior: "smooth" })} type="button">{bi(language, "Back to top", "العودة للأعلى")}<ChevronRight size={15} /></button>
      </div>
      {unsupported && <UnsupportedDialog language={language} onClose={() => setUnsupported(false)} t={t} />}
    </BookingPageShell>
  );
}
