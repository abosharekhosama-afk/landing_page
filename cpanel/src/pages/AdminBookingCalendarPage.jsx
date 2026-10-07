import React from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  ListChecks,
  MapPin,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import {
  addDays,
  calendarViewDays,
  canManageBookings,
  employeeDisplayName,
  formatCalendarRange,
  formatHour,
  moveWeek,
  startOfMonth,
  startOfWeek,
  weekDays,
  weekStartsOn,
} from "../utils/bookings.js";
import {
  bi,
  BookingEmpty,
  BookingFormModal,
  BookingPageShell,
  SelectControl,
  UnsupportedDialog,
} from "./AdminBookingShared.jsx";

const hours = Array.from({ length: 16 }, (_, index) => index + 5);
const calendarViews = [
  ["weekly", "Weekly", "أسبوعي"],
  ["daily", "Daily", "يومي"],
  ["staff", "Staff", "الموظفون"],
  ["schedule", "Schedule", "الجدول"],
];
const filterSections = [
  ["catalog", "Catalog items", "عناصر الكتالوج", CalendarDays],
  ["staff", "Staff", "الموظفون", Users],
  ["location", "Location", "الموقع", MapPin],
  ["availability", "Session availability", "توفر الجلسات", Clock3],
  ["other", "Other events", "أحداث أخرى", ListChecks],
];
const activitySections = [
  ["upcoming", "Upcoming session", "الجلسة القادمة", "No sessions added", "لم تتم إضافة جلسات", "Once a supported booking is created, it will appear here.", "ستظهر هنا الحجوزات المدعومة بعد إنشائها."],
  ["appointmentWaitlist", "Appointment waitlist", "قائمة انتظار المواعيد", "No one is on the waitlist yet", "لا يوجد أحد في قائمة الانتظار بعد", "Waitlist entries will appear here when a booking API is connected.", "ستظهر عناصر قائمة الانتظار هنا عند توصيل واجهة الحجز."],
  ["bookingRequests", "Booking requests", "طلبات الحجز", "No booking requests", "لا توجد طلبات حجز", "Incoming booking requests will appear here when supported.", "ستظهر طلبات الحجز الواردة هنا عند دعمها."],
  ["classWaitlists", "Class waitlists", "قوائم انتظار الصفوف", "No class waitlists", "لا توجد قوائم انتظار للصفوف", "Class waitlists will appear here when supported.", "ستظهر قوائم انتظار الصفوف هنا عند دعمها."],
  ["recent", "Recent activity", "النشاط الأخير", "No recent activity", "لا يوجد نشاط حديث", "Recent booking activity will appear here when supported.", "سيظهر نشاط الحجز الأخير هنا عند دعمه."],
];
const createKinds = [
  ["quick-sale", "Quick Sale", "بيع سريع"],
  ["appointment", "Appointment", "موعد"],
  ["blocked", "Blocked staff time", "وقت محجوب للموظف"],
  ["class", "Class session", "جلسة صفية"],
];

function DirectionalChevron({ direction, language, size = 17 }) {
  const rtl = language === "ar";
  if (direction === "prev") return rtl ? <ChevronRight size={size} /> : <ChevronLeft size={size} />;
  if (direction === "next") return rtl ? <ChevronLeft size={size} /> : <ChevronRight size={size} />;
  return rtl ? <ChevronLeft size={size} /> : <ChevronRight size={size} />;
}

function ActivityEmpty({ description, title }) {
  return (
    <div className="booking-activity-empty">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function MiniCalendar({ language, onSelect, selectedDate, visibleDate }) {
  const first = new Date(visibleDate.getFullYear(), visibleDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() - weekStartsOn(language) + 7) % 7));
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
  const dayNames = weekDays(start, language).map((date) => date.toLocaleDateString(language === "ar" ? "ar" : "en-US", { weekday: "narrow" }));
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  return (
    <div className="booking-mini-calendar">
      <div className="booking-mini-weekdays">{dayNames.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      <div className="booking-mini-days">
        {cells.map((date) => <button className={`${date.getMonth() !== visibleDate.getMonth() ? "muted" : ""} ${sameDay(date, selectedDate) ? "selected" : ""}`} key={date.toISOString()} onClick={() => onSelect(date)} type="button">{date.getDate()}</button>)}
      </div>
    </div>
  );
}

function CalendarRailContent({ language, onOpenSync, openAccordions, selectedDate, setSelectedDate, showTitle = true, toggleAccordion, visibleDate, setVisibleDate }) {
  const monthName = visibleDate.toLocaleDateString(language === "ar" ? "ar" : "en-US", { month: "long", year: "numeric" });
  const moveMonth = (amount) => setVisibleDate(new Date(visibleDate.getFullYear(), visibleDate.getMonth() + amount, 1));
  return (
    <>
      {showTitle && <header><h1>{bi(language, "Calendar", "التقويم")}</h1></header>}
      <div className="booking-mini-header">
        <button aria-label={bi(language, "Previous month", "الشهر السابق")} onClick={() => moveMonth(-1)} type="button"><DirectionalChevron direction="prev" language={language} size={17} /></button>
        <strong>{monthName}</strong>
        <button aria-label={bi(language, "Next month", "الشهر التالي")} onClick={() => moveMonth(1)} type="button"><DirectionalChevron direction="next" language={language} size={17} /></button>
      </div>
      <MiniCalendar language={language} onSelect={setSelectedDate} selectedDate={selectedDate} visibleDate={visibleDate} />
      <button className="booking-sync-card" onClick={onOpenSync} type="button">
        <span><CalendarDays size={23} /></span>
        <div><strong>{bi(language, "Sync your personal calendar", "مزامنة تقويمك الشخصي")}</strong><small>{bi(language, "Not connected", "غير متصل")}</small></div>
        <DirectionalChevron direction="forward" language={language} size={17} />
      </button>
      <section className="booking-activity-panel">
        <h2>{bi(language, "Activity", "النشاط")}</h2>
        {activitySections.map(([key, en, ar, emptyEn, emptyAr, descEn, descAr]) => (
          <div className="booking-activity-accordion" key={key}>
            <button onClick={() => toggleAccordion(key)} type="button">
              <span>{bi(language, en, ar)}</span>
              <ChevronDown size={15} style={{ transform: openAccordions[key] ? "rotate(180deg)" : undefined }} />
            </button>
            {openAccordions[key] && (
              <div className="booking-activity-accordion-body">
                <ActivityEmpty description={bi(language, descEn, descAr)} title={bi(language, emptyEn, emptyAr)} />
              </div>
            )}
          </div>
        ))}
      </section>
    </>
  );
}

function FilterDrawer({ employees, filterOtherEvents, language, onClose, setFilterOtherEvents }) {
  const [open, setOpen] = React.useState({ catalog: true, staff: true, location: false, availability: false, other: false });
  const [selectedStaff, setSelectedStaff] = React.useState(() => new Set(employees.map((employee) => String(employee.id))));
  const toggleStaff = (id) => setSelectedStaff((current) => {
    const next = new Set(current);
    if (next.has(String(id))) next.delete(String(id)); else next.add(String(id));
    return next;
  });
  return (
    <aside className="booking-filter-drawer" aria-label={bi(language, "Filter calendar", "تصفية التقويم")}>
      <header><h2>{bi(language, "Filter by", "تصفية حسب")}</h2><button aria-label={bi(language, "Close filters", "إغلاق عوامل التصفية")} onClick={onClose} type="button"><X size={22} /></button></header>
      {filterSections.map(([key, en, ar, Icon]) => (
        <section className={open[key] ? "open" : ""} key={key}>
          <button onClick={() => setOpen((value) => ({ ...value, [key]: !value[key] }))} type="button"><span><Icon size={17} />{bi(language, en, ar)}</span><ChevronDown size={16} /></button>
          {open[key] && (
            <div className="booking-filter-options">
              {key === "catalog" && <p>{bi(language, "No booking services configured.", "لم يتم إعداد خدمات حجز.")}</p>}
              {key === "staff" && (employees.length ? (
                <>
                  <label><input checked={selectedStaff.size === employees.length} onChange={() => setSelectedStaff(selectedStaff.size === employees.length ? new Set() : new Set(employees.map((employee) => String(employee.id))))} type="checkbox" />{bi(language, "Select all", "تحديد الكل")}</label>
                  {employees.map((employee) => <label key={employee.id}><input checked={selectedStaff.has(String(employee.id))} onChange={() => toggleStaff(employee.id)} type="checkbox" />{employeeDisplayName(employee, language)}</label>)}
                </>
              ) : <p>{bi(language, "No staff records available.", "لا توجد سجلات موظفين متاحة.")}</p>)}
              {["location", "availability"].includes(key) && <p>{bi(language, "No verified options available.", "لا توجد خيارات موثقة متاحة.")}</p>}
              {key === "other" && (
                <label><input checked={filterOtherEvents} onChange={(event) => setFilterOtherEvents(event.target.checked)} type="checkbox" />{bi(language, "Blocked time included", "يشمل الوقت المحجوب")}</label>
              )}
            </div>
          )}
        </section>
      ))}
      <footer>{bi(language, "No booking events are currently available to filter.", "لا توجد أحداث حجز متاحة للتصفية حالياً.")}</footer>
    </aside>
  );
}

function DisplayDrawer({ display, language, onClose, setDisplay }) {
  const setField = (key, value) => setDisplay((current) => ({ ...current, [key]: value }));
  return (
    <aside aria-label={bi(language, "Display settings", "إعدادات العرض")} className="booking-display-drawer">
      <header><h2>{bi(language, "Display settings", "إعدادات العرض")}</h2><button aria-label={bi(language, "Close display settings", "إغلاق إعدادات العرض")} onClick={onClose} type="button"><X size={22} /></button></header>
      <section>
        <h3>{bi(language, "Calendar spacing", "تباعد التقويم")}</h3>
        <div className="booking-display-radio-row">
          {[["compact", "Compact", "مضغوط"], ["wide", "Wide", "واسع"]].map(([value, en, ar]) => (
            <label key={value}><input checked={display.spacing === value} name="spacing" onChange={() => setField("spacing", value)} type="radio" />{bi(language, en, ar)}</label>
          ))}
        </div>
      </section>
      <section>
        <h3>{bi(language, "Event title", "عنوان الحدث")}</h3>
        <div className="booking-display-radio-row">
          {[["client", "Client name", "اسم العميل"], ["service", "Service name", "اسم الخدمة"]].map(([value, en, ar]) => (
            <label key={value}><input checked={display.eventTitleMode === value} name="eventTitle" onChange={() => setField("eventTitleMode", value)} type="radio" />{bi(language, en, ar)}</label>
          ))}
        </div>
      </section>
      <section>
        <h3>{bi(language, "Color code by", "ترميز اللون حسب")}</h3>
        <div className="booking-display-radio-row">
          {[["staff", "Staff", "الموظف"], ["catalog", "Catalog", "الكتالوج"]].map(([value, en, ar]) => (
            <label key={value}><input checked={display.colorBy === value} name="colorBy" onChange={() => setField("colorBy", value)} type="radio" />{bi(language, en, ar)}</label>
          ))}
        </div>
      </section>
      <section>
        <h3>{bi(language, "Color palette", "لوحة الألوان")}</h3>
        <div className="booking-display-radio-row">
          {[["modern", "Modern", "حديث"], ["classic", "Classic", "كلاسيكي"]].map(([value, en, ar]) => (
            <label key={value}><input checked={display.palette === value} name="palette" onChange={() => setField("palette", value)} type="radio" />{bi(language, en, ar)}</label>
          ))}
        </div>
      </section>
      <section>
        <h3>{bi(language, "Grid time slot gap", "فجوة خانات الوقت")}</h3>
        <div className="booking-display-radio-row">
          {["30", "15", "10", "5"].map((value) => (
            <label key={value}><input checked={display.slotGap === value} name="slotGap" onChange={() => setField("slotGap", value)} type="radio" />{value} {bi(language, "min", "د")}</label>
          ))}
        </div>
      </section>
      <section>
        <h3>{bi(language, "View options", "خيارات العرض")}</h3>
        <label className="booking-display-check"><input checked={display.showWeekends} onChange={(event) => setField("showWeekends", event.target.checked)} type="checkbox" />{bi(language, "Show weekends", "إظهار عطلة نهاية الأسبوع")}</label>
        <label className="booking-display-check"><input checked={display.dontSendReminders} onChange={(event) => setField("dontSendReminders", event.target.checked)} type="checkbox" />{bi(language, "Don't send reminders", "عدم إرسال التذكيرات")}</label>
      </section>
      <section>
        <h3>{bi(language, "Site calendar time zone", "المنطقة الزمنية")}</h3>
        <label className="booking-form-field"><span className="booking-form-label">{bi(language, "Time zone", "المنطقة الزمنية")}</span><select className="booking-form-select" onChange={(event) => setField("timeZone", event.target.value)} value={display.timeZone}><option value="GMT+03:00">{bi(language, "GMT+03:00 Istanbul", "GMT+03:00 إسطنبول")}</option><option value="GMT+00:00">{bi(language, "GMT+00:00 London", "GMT+00:00 لندن")}</option><option value="GMT-05:00">{bi(language, "GMT-05:00 New York", "GMT-05:00 نيويورك")}</option></select></label>
      </section>
      <footer><button className="booking-secondary-button" onClick={onClose} type="button">{bi(language, "Close", "إغلاق")}</button></footer>
    </aside>
  );
}

function ActionMenu({ language, onCreate, onCreateService, onUnsupported, slot = false }) {
  return (
    <div className={`booking-action-menu ${slot ? "slot" : ""}`} role="menu">
      {createKinds.map(([kind, en, ar]) => <button key={kind} onClick={() => onCreate(kind)} role="menuitem" type="button">{bi(language, en, ar)}</button>)}
      <hr />
      <button onClick={onCreateService} role="menuitem" type="button"><Plus size={16} />{bi(language, "Create New Service", "إنشاء خدمة جديدة")}</button>
      {slot && <button onClick={onUnsupported} role="menuitem" type="button">{bi(language, "Share services", "مشاركة الخدمات")}</button>}
    </div>
  );
}

function SlotMenuAnchor({ children, language }) {
  const anchorRef = React.useRef(null);
  const [placement, setPlacement] = React.useState({ flipUp: false, flipInline: false });

  React.useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return undefined;

    const scrollRoot = anchor.closest(".booking-week-grid-wrap");
    const cell = anchor.closest(".booking-time-cell");
    if (!scrollRoot || !cell) return undefined;

    const measure = () => {
      const scrollRect = scrollRoot.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      const menuWidth = Math.min(260, scrollRect.width * 0.42);
      const menuHeight = anchor.offsetHeight || 280;
      const rtl = language === "ar";
      const spaceBelow = scrollRect.bottom - anchorRect.bottom;
      const spaceAbove = anchorRect.top - scrollRect.top;
      const spaceAfter = rtl ? anchorRect.right - scrollRect.left : scrollRect.right - anchorRect.left;
      const spaceBefore = rtl ? scrollRect.right - anchorRect.left : anchorRect.right - scrollRect.left;

      setPlacement({
        flipUp: spaceBelow < menuHeight && spaceAbove > spaceBelow,
        flipInline: spaceAfter < menuWidth && spaceBefore > spaceAfter,
      });
      cell.scrollIntoView({ block: "nearest", inline: "nearest" });
    };

    measure();
    scrollRoot.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      scrollRoot.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [language]);

  const className = [
    "booking-slot-menu-anchor",
    placement.flipUp ? "is-flip-up" : "",
    placement.flipInline ? "is-flip-inline" : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={className}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      ref={anchorRef}
    >
      {children}
    </div>
  );
}

function WeeklyGrid({ canManage, cols, dayFormatter, days, language, onCreate, onCreateService, onSelectSlot, onUnsupported, selectedSlot, spacingClass, today }) {
  const gridColumns = `74px repeat(${cols}, minmax(140px, 1fr))`;
  return (
    <div className={`booking-cal-grid-wrap ${spacingClass} booking-week-grid-wrap`}>
      <div className="booking-week-grid-head" style={{ gridTemplateColumns: gridColumns }}><span />{days.map((day) => <div className={day.toDateString() === today.toDateString() ? "today" : ""} key={day.toISOString()}>{dayFormatter.format(day)}</div>)}</div>
      <div className="booking-week-grid-body" style={{ gridTemplateColumns: gridColumns }}>
        {hours.map((hour) => (
          <React.Fragment key={hour}>
            <div className="booking-hour-label">{formatHour(hour, language)}</div>
            {days.map((day) => {
              const key = `${day.toISOString()}-${hour}`;
              const isSelected = selectedSlot === key;
              return (
                <button aria-label={`${dayFormatter.format(day)} ${hour}:00`} className={`booking-time-cell ${isSelected ? "selected" : ""}`} key={key} onClick={() => onSelectSlot(day, key)} type="button">
                  {isSelected && <span>{new Date(2020, 0, 1, hour).toLocaleTimeString(language === "ar" ? "ar" : "en-US", { hour: "numeric", minute: "2-digit" })}</span>}
                  {isSelected && canManage && (
                    <SlotMenuAnchor language={language}>
                      <ActionMenu language={language} onCreate={onCreate} onCreateService={onCreateService} onUnsupported={onUnsupported} slot />
                    </SlotMenuAnchor>
                  )}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function StaffGrid({ cols, dayFormatter, days, employees, language, today }) {
  const gridColumns = `180px repeat(${cols}, minmax(140px, 1fr))`;
  return (
    <div className="booking-cal-grid-wrap booking-week-grid-wrap">
      <div className="booking-cal-staff-grid" style={{ gridTemplateColumns: gridColumns }}>
        <div className="booking-staff-col-head">{bi(language, "Staff", "الموظفون")}</div>
        {days.map((day) => <div className={`booking-staff-col-head ${day.toDateString() === today.toDateString() ? "today" : ""}`} key={day.toISOString()}>{dayFormatter.format(day)}</div>)}
        {employees.length ? employees.map((employee) => (
          <React.Fragment key={employee.id}>
            <div className="booking-staff-col-label">{employeeDisplayName(employee, language)}</div>
            {days.map((day) => <div className="booking-staff-time-cell" key={`${employee.id}-${day.toISOString()}`} />)}
          </React.Fragment>
        )) : (
          <>
            <div className="booking-staff-col-label">{bi(language, "No staff records available.", "لا توجد سجلات موظفين متاحة.")}</div>
            {days.map((day) => <div className="booking-staff-time-cell" key={day.toISOString()} />)}
          </>
        )}
      </div>
    </div>
  );
}

function ScheduleView({ language }) {
  return (
    <div className="booking-cal-schedule-wrap">
      <BookingEmpty description={bi(language, "Events in this range will appear in the schedule list when a booking API is connected.", "ستظهر الأحداث في هذا النطاق في قائمة الجدول عند توصيل واجهة الحجز.")} title={bi(language, "No booking events in this range", "لا توجد أحداث حجز في هذا النطاق")} />
    </div>
  );
}

export default function AdminBookingCalendarPage({ activePage = "admin-bookings-calendar", currentUser, employees = [], language = "en", onNavigate, t, ...layout }) {
  const today = React.useMemo(() => new Date(), []);
  const [view, setView] = React.useState("weekly");
  const [week, setWeek] = React.useState(() => startOfWeek(today, weekStartsOn(language)));
  const [selectedDate, setSelectedDate] = React.useState(today);
  const [visibleDate, setVisibleDate] = React.useState(startOfMonth(today));
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [displayOpen, setDisplayOpen] = React.useState(false);
  const [railOpen, setRailOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [manageOpen, setManageOpen] = React.useState(false);
  const [viewOpen, setViewOpen] = React.useState(false);
  const [unsupported, setUnsupported] = React.useState(false);
  const [selectedSlot, setSelectedSlot] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [filterOtherEvents, setFilterOtherEvents] = React.useState(true);
  const [syncOpen, setSyncOpen] = React.useState(false);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [createKind, setCreateKind] = React.useState(null);
  const [createForm, setCreateForm] = React.useState({ title: "", staffId: "", dayIndex: today.getDay(), hour: 10 });
  const [inviteRole, setInviteRole] = React.useState("manager");
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [exportScope, setExportScope] = React.useState("all");
  const [display, setDisplay] = React.useState({
    spacing: "compact",
    eventTitleMode: "service",
    colorBy: "staff",
    palette: "modern",
    slotGap: "30",
    showWeekends: true,
    dontSendReminders: false,
    timeZone: "GMT+03:00",
  });
  const [openAccordions, setOpenAccordions] = React.useState({
    upcoming: true,
    appointmentWaitlist: false,
    bookingRequests: false,
    classWaitlists: false,
    recent: false,
  });

  const canManage = canManageBookings(currentUser);
  const createService = () => onNavigate?.("admin-tenant-placeholder-catalog-booking-services");
  const chooseDate = (date) => {
    setSelectedDate(date);
    setWeek(startOfWeek(date, weekStartsOn(language)));
  };
  const dayFormatter = new Intl.DateTimeFormat(language === "ar" ? "ar" : "en-US", { weekday: "short", day: "2-digit" });
  const viewDays = calendarViewDays(view === "daily" ? "daily" : "weekly", week, selectedDate, language, display.showWeekends);
  const currentView = calendarViews.find(([value]) => value === view) || calendarViews[0];
  const spacingClass = display.spacing === "wide" ? "is-wide" : "is-compact";
  const eventCount = 0;

  const closeToolbarMenus = () => {
    setAddOpen(false);
    setManageOpen(false);
    setViewOpen(false);
  };

  const closeTransientUi = () => {
    closeToolbarMenus();
    setFilterOpen(false);
    setDisplayOpen(false);
    setRailOpen(false);
  };

  const openDrawer = (kind) => {
    closeToolbarMenus();
    if (kind === "filter") {
      setDisplayOpen(false);
      setRailOpen(false);
      setFilterOpen((value) => !value);
      return;
    }
    if (kind === "display") {
      setFilterOpen(false);
      setRailOpen(false);
      setDisplayOpen((value) => !value);
      return;
    }
    setFilterOpen(false);
    setDisplayOpen(false);
    setRailOpen((value) => !value);
  };

  const toggleViewMenu = () => {
    setAddOpen(false);
    setManageOpen(false);
    setViewOpen((value) => !value);
  };

  const toggleManageMenu = () => {
    setAddOpen(false);
    setViewOpen(false);
    setManageOpen((value) => !value);
  };

  const toggleAddMenu = () => {
    setManageOpen(false);
    setViewOpen(false);
    setAddOpen((value) => !value);
  };

  const openSyncModal = () => {
    closeTransientUi();
    setSyncOpen(true);
  };

  const openInviteModal = () => {
    closeTransientUi();
    setInviteOpen(true);
  };

  const openExportModal = () => {
    closeTransientUi();
    setExportOpen(true);
  };

  const shiftNav = (amount) => {
    if (view === "daily") {
      const next = addDays(selectedDate, amount);
      setSelectedDate(next);
      setWeek(startOfWeek(next, weekStartsOn(language)));
      return;
    }
    const nextWeek = moveWeek(week, amount);
    setWeek(nextWeek);
    setSelectedDate(startOfWeek(nextWeek, weekStartsOn(language)));
  };

  const goToday = () => {
    setWeek(startOfWeek(today, weekStartsOn(language)));
    setSelectedDate(today);
    setVisibleDate(startOfMonth(today));
  };

  const openCreate = (kind) => {
    closeToolbarMenus();
    setCreateKind(kind);
    setCreateForm({
      title: "",
      staffId: employees[0] ? String(employees[0].id) : "",
      dayIndex: selectedDate.getDay(),
      hour: 10,
    });
  };

  const finishUnsupported = () => {
    setUnsupported(true);
    setSyncOpen(false);
    setInviteOpen(false);
    setExportOpen(false);
    setCreateKind(null);
  };

  const selectSlot = (day, key) => {
    if (!canManage) return;
    closeToolbarMenus();
    setSelectedSlot(key);
    setSelectedDate(day);
  };

  const toggleAccordion = (key) => setOpenAccordions((current) => ({ ...current, [key]: !current[key] }));

  const railProps = {
    language,
    onOpenSync: () => { setRailOpen(false); openSyncModal(); },
    openAccordions,
    selectedDate,
    setSelectedDate: chooseDate,
    toggleAccordion,
    visibleDate,
    setVisibleDate,
  };

  const manageItems = [
    ["services", "Edit services", "تعديل الخدمات", () => onNavigate?.("admin-tenant-placeholder-catalog-booking-services")],
    ["staff", "Go to staff members", "الانتقال إلى الموظفين", () => onNavigate?.("admin-settings-bookings-staff")],
    ["resources", "Resources", "الموارد", () => onNavigate?.("admin-settings-bookings-resources")],
    ["hours", "Default business hours", "ساعات العمل الافتراضية", () => onNavigate?.("admin-settings-bookings-default-hours")],
    ["integrations", "Add booking integrations", "إضافة تكاملات الحجز", () => onNavigate?.("admin-settings-bookings-integrations")],
    ["sync", "Sync personal calendar", "مزامنة التقويم الشخصي", openSyncModal],
    ["invite", "Invite booking collaborators", "دعوة متعاوني الحجز", openInviteModal],
    ["export", "Export booking data", "تصدير بيانات الحجز", openExportModal],
    ["mobile", "Manage on the go", "الإدارة أثناء التنقل", () => setUnsupported(true)],
    ["settings", "Update booking settings", "تحديث إعدادات الحجز", () => onNavigate?.("admin-settings-bookings")],
    ["apps", "Calendar apps", "تطبيقات التقويم", () => setUnsupported(true)],
    ["blocker", "Time Blocker", "حاجب الوقت", () => setUnsupported(true)],
  ];

  return (
    <BookingPageShell activePage={activePage} className="booking-calendar-page" currentUser={currentUser} language={language} onNavigate={onNavigate} {...layout}>
      <div className="booking-calendar-layout">
        <aside className="booking-calendar-sidebar"><CalendarRailContent {...railProps} /></aside>
        <main className="booking-calendar-main">
          <header className="booking-calendar-toolbar">
            <div className="booking-toolbar-primary">
              <button aria-label={bi(language, "Calendar panel", "لوحة التقويم")} className="booking-rail-trigger" onClick={() => openDrawer("rail")} type="button"><PanelLeft size={18} /></button>
              <button className="booking-today-button" onClick={goToday} type="button">{bi(language, "Today", "اليوم")}</button>
              <strong>{formatCalendarRange(view, selectedDate, week, language)}</strong>
              <button aria-label={bi(language, view === "daily" ? "Previous day" : "Previous week", view === "daily" ? "اليوم السابق" : "الأسبوع السابق")} onClick={() => shiftNav(-1)} type="button"><DirectionalChevron direction="prev" language={language} size={18} /></button>
              <button aria-label={bi(language, view === "daily" ? "Next day" : "Next week", view === "daily" ? "اليوم التالي" : "الأسبوع التالي")} onClick={() => shiftNav(1)} type="button"><DirectionalChevron direction="next" language={language} size={18} /></button>
            </div>
            <div className="booking-toolbar-actions">
              <label className="booking-cal-search">
                <Search size={16} />
                <input aria-label={bi(language, "Search calendar", "بحث في التقويم")} onChange={(event) => setSearch(event.target.value)} placeholder={bi(language, "Search", "بحث")} type="search" value={search} />
              </label>
              <div className="booking-menu-root">
                <SelectControl aria-expanded={viewOpen} onClick={toggleViewMenu}>{bi(language, currentView[1], currentView[2])}</SelectControl>
                {viewOpen && (
                  <div className="booking-action-menu view">
                    {calendarViews.map(([value, en, ar]) => (
                      <button key={value} onClick={() => { setView(value); setViewOpen(false); setSelectedSlot(null); }} type="button">
                        {view === value ? <Check size={15} /> : <span className="booking-menu-spacer" />}
                        {bi(language, en, ar)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button aria-label={bi(language, "Filter", "تصفية")} className={filterOpen ? "active" : ""} onClick={() => openDrawer("filter")} type="button"><Filter size={18} /></button>
              {canManage && (
                <>
                  <button aria-label={bi(language, "Display settings", "إعدادات العرض")} className={displayOpen ? "active" : ""} onClick={() => openDrawer("display")} type="button"><Settings size={18} /></button>
                  <div className="booking-menu-root">
                    <SelectControl aria-expanded={manageOpen} onClick={toggleManageMenu}>{bi(language, "Manage", "إدارة")}</SelectControl>
                    {manageOpen && (
                      <div className="booking-action-menu manage manage-wide">
                        {manageItems.map(([key, en, ar, action]) => (
                          <button key={key} onClick={() => { setManageOpen(false); action(); }} type="button">{bi(language, en, ar)}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="booking-menu-root booking-toolbar-add">
                    <button aria-expanded={addOpen} className="booking-add-button" onClick={toggleAddMenu} type="button">{bi(language, "Add", "إضافة")}<ChevronDown size={16} /></button>
                    {addOpen && <ActionMenu language={language} onCreate={openCreate} onCreateService={createService} onUnsupported={() => setUnsupported(true)} />}
                  </div>
                </>
              )}
            </div>
          </header>

          <div className="booking-calendar-body">
            {view === "schedule" ? (
              <ScheduleView language={language} />
            ) : view === "staff" ? (
              <StaffGrid cols={viewDays.length} dayFormatter={dayFormatter} days={viewDays} employees={employees} language={language} today={today} />
            ) : (
              <WeeklyGrid
                canManage={canManage}
                cols={viewDays.length}
                dayFormatter={dayFormatter}
                days={viewDays}
                language={language}
                onCreate={openCreate}
                onCreateService={createService}
                onSelectSlot={selectSlot}
                onUnsupported={() => setUnsupported(true)}
                selectedSlot={selectedSlot}
                spacingClass={spacingClass}
                today={today}
              />
            )}
          </div>

          <div className="booking-cal-footer">{bi(language, `${eventCount} events viewed`, `${eventCount} أحداث معروضة`)}</div>
        </main>
        {railOpen && (
          <aside aria-label={bi(language, "Calendar panel", "لوحة التقويم")} className="booking-calendar-rail-drawer">
            <header>
              <h2>{bi(language, "Calendar", "التقويم")}</h2>
              <button aria-label={bi(language, "Close calendar panel", "إغلاق لوحة التقويم")} onClick={() => setRailOpen(false)} type="button"><X size={22} /></button>
            </header>
            <CalendarRailContent {...railProps} showTitle={false} />
          </aside>
        )}
        {filterOpen && <FilterDrawer employees={employees} filterOtherEvents={filterOtherEvents} language={language} onClose={() => setFilterOpen(false)} setFilterOtherEvents={setFilterOtherEvents} />}
        {displayOpen && <DisplayDrawer display={display} language={language} onClose={() => setDisplayOpen(false)} setDisplay={setDisplay} />}
      </div>

      {syncOpen && (
        <BookingFormModal
          footer={<><button className="booking-secondary-button" onClick={() => setSyncOpen(false)} type="button">{bi(language, "Cancel", "إلغاء")}</button><button className="booking-primary-button" onClick={finishUnsupported} type="button">{bi(language, "Connect", "اتصال")}</button></>}
          language={language}
          onClose={() => setSyncOpen(false)}
          subtitle={bi(language, "Connect an external calendar to avoid double bookings.", "اربط تقويماً خارجياً لتجنب الحجز المزدوج.")}
          title={bi(language, "Sync your personal calendar", "مزامنة تقويمك الشخصي")}
        >
          <label className="booking-form-field"><span className="booking-form-label">{bi(language, "Provider", "المزود")}</span><select className="booking-form-select" defaultValue="google"><option value="google">{bi(language, "Google Calendar", "تقويم Google")}</option></select></label>
        </BookingFormModal>
      )}

      {inviteOpen && (
        <BookingFormModal
          footer={<><button className="booking-secondary-button" onClick={() => setInviteOpen(false)} type="button">{bi(language, "Cancel", "إلغاء")}</button><button className="booking-primary-button" onClick={finishUnsupported} type="button">{bi(language, "Send Invite", "إرسال الدعوة")}</button></>}
          language={language}
          onClose={() => setInviteOpen(false)}
          subtitle={bi(language, "Invite teammates to help manage bookings.", "ادعُ زملاءك للمساعدة في إدارة الحجوزات.")}
          title={bi(language, "Invite booking collaborators", "دعوة متعاوني الحجز")}
        >
          <label className="booking-form-field"><span className="booking-form-label">{bi(language, "Role", "الدور")}</span><select className="booking-form-select" onChange={(event) => setInviteRole(event.target.value)} value={inviteRole}><option value="manager">{bi(language, "Booking manager", "مدير الحجز")}</option><option value="staff">{bi(language, "Booking staff", "موظف الحجز")}</option><option value="viewer">{bi(language, "Viewer", "مشاهد")}</option></select></label>
          <label className="booking-form-field"><span className="booking-form-label">{bi(language, "Email", "البريد الإلكتروني")}</span><input className="booking-form-input" onChange={(event) => setInviteEmail(event.target.value)} placeholder="name@example.com" type="email" value={inviteEmail} /></label>
        </BookingFormModal>
      )}

      {exportOpen && (
        <BookingFormModal
          footer={<><button className="booking-secondary-button" onClick={() => setExportOpen(false)} type="button">{bi(language, "Cancel", "إلغاء")}</button><button className="booking-primary-button" onClick={finishUnsupported} type="button">{bi(language, "Export", "تصدير")}</button></>}
          language={language}
          onClose={() => setExportOpen(false)}
          subtitle={bi(language, "Choose which bookings to export as CSV.", "اختر الحجوزات التي تريد تصديرها كملف CSV.")}
          title={bi(language, "Export booking data", "تصدير بيانات الحجز")}
        >
          <div className="booking-display-radio-row">
            {[["all", "All", "الكل"], ["filtered", "Filtered", "المصفّاة"], ["selected", "Selected", "المحددة"]].map(([value, en, ar]) => (
              <label key={value}><input checked={exportScope === value} name="exportScope" onChange={() => setExportScope(value)} type="radio" />{bi(language, en, ar)}</label>
            ))}
          </div>
        </BookingFormModal>
      )}

      {createKind && (
        <BookingFormModal
          footer={<><button className="booking-secondary-button" onClick={() => setCreateKind(null)} type="button">{bi(language, "Cancel", "إلغاء")}</button><button className="booking-primary-button" onClick={finishUnsupported} type="button">{bi(language, "Save", "حفظ")}</button></>}
          language={language}
          onClose={() => setCreateKind(null)}
          subtitle={bi(language, "Add an event to the calendar.", "أضف حدثاً إلى التقويم.")}
          title={bi(language, createKinds.find(([kind]) => kind === createKind)?.[1] || "Create", createKinds.find(([kind]) => kind === createKind)?.[2] || "إنشاء")}
        >
          <label className="booking-form-field"><span className="booking-form-label">{bi(language, "Title", "العنوان")}</span><input className="booking-form-input" onChange={(event) => setCreateForm((current) => ({ ...current, title: event.target.value }))} value={createForm.title} /></label>
          <label className="booking-form-field"><span className="booking-form-label">{bi(language, "Staff", "الموظف")}</span><select className="booking-form-select" onChange={(event) => setCreateForm((current) => ({ ...current, staffId: event.target.value }))} value={createForm.staffId}>{employees.map((employee) => <option key={employee.id} value={String(employee.id)}>{employeeDisplayName(employee, language)}</option>)}{!employees.length && <option value="">{bi(language, "Unassigned", "غير معيّن")}</option>}</select></label>
          <label className="booking-form-field"><span className="booking-form-label">{bi(language, "Day", "اليوم")}</span><select className="booking-form-select" onChange={(event) => setCreateForm((current) => ({ ...current, dayIndex: Number(event.target.value) }))} value={createForm.dayIndex}>{weekDays(week, language).map((day) => <option key={day.toISOString()} value={day.getDay()}>{dayFormatter.format(day)}</option>)}</select></label>
          <label className="booking-form-field"><span className="booking-form-label">{bi(language, "Hour", "الساعة")}</span><select className="booking-form-select" onChange={(event) => setCreateForm((current) => ({ ...current, hour: Number(event.target.value) }))} value={createForm.hour}>{hours.map((hour) => <option key={hour} value={hour}>{formatHour(hour, language)}</option>)}</select></label>
        </BookingFormModal>
      )}

      {unsupported && <UnsupportedDialog language={language} onClose={() => setUnsupported(false)} t={t} />}
    </BookingPageShell>
  );
}
