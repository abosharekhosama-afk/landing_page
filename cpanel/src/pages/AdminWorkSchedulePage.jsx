import React from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  MoreHorizontal,
  Plus,
  UserRound,
} from "lucide-react";
import {
  addDays,
  addMonths,
  buildMiniMonth,
  canManageBookings,
  employeeAvatarTone,
  employeeDisplayName,
  employeeInitials,
  formatScheduleBlockLabel,
  isDateInWeek,
  matchAvailabilityEntry,
  moveWeek,
  startOfWeek,
  toDateKey,
  weekDays,
  weekStartsOn,
} from "../utils/bookings.js";
import {
  bi,
  BookingEmpty,
  BookingFormModal,
  BookingPageShell,
  formatDateRange,
  SelectControl,
  UnsupportedDialog,
} from "./AdminBookingShared.jsx";

const repeatOptions = [
  ["none", "Does not repeat", "لا يتكرر"],
  ["weekly", "Weekly", "أسبوعي"],
];

const weekdayMeta = [
  [0, "Su", "أح"],
  [1, "Mo", "إث"],
  [2, "Tu", "ثل"],
  [3, "We", "أر"],
  [4, "Th", "خم"],
  [5, "Fr", "جم"],
  [6, "Sa", "سب"],
];

function DirectionalChevron({ direction, language, size = 17 }) {
  const rtl = language === "ar";
  if (direction === "prev") return rtl ? <ChevronRight size={size} /> : <ChevronLeft size={size} />;
  if (direction === "next") return rtl ? <ChevronLeft size={size} /> : <ChevronRight size={size} />;
  return rtl ? <ChevronLeft size={size} /> : <ChevronRight size={size} />;
}

function WeekRangePicker({ language, onOpenChange, onWeekChange, weekStart }) {
  const rootRef = React.useRef(null);
  const [open, setOpen] = React.useState(false);
  const [visibleMonth, setVisibleMonth] = React.useState(() => new Date(weekStart.getFullYear(), weekStart.getMonth(), 1));
  const locale = language === "ar" ? "ar" : "en-US";
  const monthLabel = visibleMonth.toLocaleDateString(locale, { month: "long", year: "numeric" });
  const cells = buildMiniMonth(visibleMonth, language);
  const todayKey = toDateKey(new Date());

  const setPickerOpen = (value) => {
    setOpen(value);
    onOpenChange?.(value);
  };

  React.useEffect(() => {
    if (!open) return undefined;
    setVisibleMonth(new Date(weekStart.getFullYear(), weekStart.getMonth(), 1));
  }, [open, weekStart]);

  React.useEffect(() => {
    if (!open) return undefined;
    const onDocumentMouseDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setPickerOpen(false);
    };
    const onEscape = (event) => {
      if (event.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("mousedown", onDocumentMouseDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const chooseDay = (date) => {
    onWeekChange(startOfWeek(date, weekStartsOn(language)));
    setPickerOpen(false);
  };

  return (
    <div className="booking-week-range-picker" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={formatDateRange(weekStart, language, true)}
        className="booking-week-range-field"
        onClick={() => setPickerOpen((value) => !value)}
        type="button"
      >
        <CalendarDays size={17} />
        <span>{formatDateRange(weekStart, language, true)}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div aria-label={bi(language, "Choose week", "اختر الأسبوع")} className="booking-week-range-panel" role="dialog">
          <div className="booking-week-range-head">
            <button aria-label={bi(language, "Previous month", "الشهر السابق")} onClick={() => setVisibleMonth((current) => addMonths(current, -1))} type="button"><DirectionalChevron direction="prev" language={language} size={16} /></button>
            <strong>{monthLabel}</strong>
            <button aria-label={bi(language, "Next month", "الشهر التالي")} onClick={() => setVisibleMonth((current) => addMonths(current, 1))} type="button"><DirectionalChevron direction="next" language={language} size={16} /></button>
          </div>
          <div className="booking-week-range-weekdays">
            {weekdayMeta.map(([dayIndex, en, ar]) => <span key={dayIndex}>{bi(language, en, ar)}</span>)}
          </div>
          <div className="booking-week-range-days">
            {cells.map(({ date, isToday, key, otherMonth }) => (
              <button
                className={[
                  otherMonth ? "muted" : "",
                  isDateInWeek(date, weekStart) ? "in-week" : "",
                  toDateKey(date) === todayKey ? "today" : "",
                ].filter(Boolean).join(" ")}
                key={key}
                onClick={() => chooseDay(date)}
                type="button"
              >
                {date.getDate()}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleBlockMenuAnchor({ children, language }) {
  const anchorRef = React.useRef(null);
  const [placement, setPlacement] = React.useState({ flipUp: false, flipInline: false });

  React.useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return undefined;

    const scrollRoot = anchor.closest(".booking-schedule-grid-wrap");
    const cell = anchor.closest(".booking-availability-cell");
    if (!scrollRoot || !cell) return undefined;

    const measure = () => {
      const scrollRect = scrollRoot.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      const menuWidth = Math.min(220, scrollRect.width * 0.42);
      const menuHeight = anchor.offsetHeight || 96;
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
    "booking-slot-menu-anchor booking-schedule-block-menu",
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

function WorkingHoursModal({ employees, form, language, mode, onChange, onClose, onSave }) {
  const visibleEmployees = employees.filter((employee) => {
    const query = form.staffQuery.trim().toLowerCase();
    if (!query) return true;
    return employeeDisplayName(employee, language).toLowerCase().includes(query);
  });

  return (
    <BookingFormModal
      footer={(
        <>
          <button className="booking-secondary-button" onClick={onClose} type="button">{bi(language, "Cancel", "إلغاء")}</button>
          <button className="booking-primary-button" onClick={onSave} type="button">{bi(language, "Save", "حفظ")}</button>
        </>
      )}
      language={language}
      onClose={onClose}
      subtitle={bi(language, "Set when staff members are available to take bookings. Saving requires a supported availability API.", "حدد أوقات توفر الموظفين لاستقبال الحجوزات. الحفظ يتطلب واجهة توفر مدعومة.")}
      title={mode === "edit" ? bi(language, "Edit working hours", "تعديل ساعات العمل") : bi(language, "Add working hours", "إضافة ساعات عمل")}
    >
      <label className="booking-form-field">
        <span className="booking-form-label">{bi(language, "Staff members", "الموظفون")}</span>
        <input
          className="booking-form-input"
          onChange={(event) => onChange({ staffQuery: event.target.value })}
          placeholder={bi(language, "Search staff members", "ابحث عن الموظفين")}
          type="search"
          value={form.staffQuery}
        />
        <div className="booking-schedule-staff-pick">
          {visibleEmployees.map((employee) => {
            const checked = form.staffIds.includes(String(employee.id));
            return (
              <label className="booking-schedule-staff-chip" key={employee.id}>
                <input
                  checked={checked}
                  disabled={mode === "edit"}
                  onChange={() => {
                    const id = String(employee.id);
                    onChange({
                      staffIds: mode === "edit"
                        ? [id]
                        : checked
                          ? form.staffIds.filter((value) => value !== id)
                          : [...form.staffIds, id],
                    });
                  }}
                  type="checkbox"
                />
                <span className="booking-schedule-avatar sm" style={{ background: employeeAvatarTone(employee.id) }}>
                  {employeeInitials(employee, language)}
                </span>
                {employeeDisplayName(employee, language)}
              </label>
            );
          })}
          {!visibleEmployees.length && <p className="booking-schedule-staff-empty">{bi(language, "No matching employees.", "لا يوجد موظفون مطابقون.")}</p>}
        </div>
      </label>
      <label className="booking-form-field">
        <span className="booking-form-label">{bi(language, "Start date", "تاريخ البداية")}</span>
        <input className="booking-form-input" onChange={(event) => onChange({ startDate: event.target.value })} type="date" value={form.startDate} />
      </label>
      <label className="booking-form-field booking-form-inline">
        <input checked={form.endDateEnabled} onChange={(event) => onChange({ endDateEnabled: event.target.checked })} type="checkbox" />
        <span>{bi(language, "Set end date", "تعيين تاريخ الانتهاء")}</span>
      </label>
      {form.endDateEnabled && (
        <label className="booking-form-field">
          <span className="booking-form-label">{bi(language, "End date", "تاريخ الانتهاء")}</span>
          <input className="booking-form-input" onChange={(event) => onChange({ endDate: event.target.value })} type="date" value={form.endDate} />
        </label>
      )}
      <label className="booking-form-field">
        <span className="booking-form-label">{bi(language, "Repeat", "التكرار")}</span>
        <select className="booking-form-select" onChange={(event) => onChange({ repeat: event.target.value })} value={form.repeat}>
          {repeatOptions.map(([value, en, ar]) => <option key={value} value={value}>{bi(language, en, ar)}</option>)}
        </select>
      </label>
      {form.repeat === "weekly" && (
        <div className="booking-form-field">
          <span className="booking-form-label">{bi(language, "On these days", "في هذه الأيام")}</span>
          <div className="booking-schedule-weekday-toggle">
            {weekdayMeta.map(([dayIndex, en, ar]) => {
              const active = form.days.includes(dayIndex);
              return (
                <button
                  aria-pressed={active}
                  className={active ? "active" : ""}
                  key={dayIndex}
                  onClick={() => onChange({
                    days: active
                      ? form.days.filter((value) => value !== dayIndex)
                      : [...form.days, dayIndex],
                  })}
                  type="button"
                >
                  {bi(language, en, ar)}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="booking-form-row">
        <label className="booking-form-field">
          <span className="booking-form-label">{bi(language, "Start time", "وقت البداية")}</span>
          <input className="booking-form-input" onChange={(event) => onChange({ startTime: event.target.value })} type="time" value={form.startTime} />
        </label>
        <label className="booking-form-field">
          <span className="booking-form-label">{bi(language, "End time", "وقت النهاية")}</span>
          <input className="booking-form-input" onChange={(event) => onChange({ endTime: event.target.value })} type="time" value={form.endTime} />
        </label>
      </div>
    </BookingFormModal>
  );
}

export default function AdminWorkSchedulePage({
  activePage = "admin-bookings-work-schedule",
  availability = null,
  currentUser,
  employees = [],
  language = "en",
  onNavigate,
  t,
  ...layout
}) {
  const today = React.useMemo(() => new Date(), []);
  const [week, setWeek] = React.useState(() => startOfWeek(today, weekStartsOn(language)));
  const [staffFilter, setStaffFilter] = React.useState("all");
  const [unsupported, setUnsupported] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [selectedBlockKey, setSelectedBlockKey] = React.useState(null);
  const [hoursOpen, setHoursOpen] = React.useState(false);
  const [hoursMode, setHoursMode] = React.useState("add");
  const [hoursForm, setHoursForm] = React.useState({
    staffQuery: "",
    staffIds: [],
    startDate: toDateKey(today),
    endDateEnabled: false,
    endDate: "",
    repeat: "weekly",
    days: [today.getDay()],
    startTime: "",
    endTime: "",
    editingBlock: null,
  });

  const days = weekDays(week, language);
  const visibleEmployees = staffFilter === "all" ? employees : employees.filter((employee) => String(employee.id) === staffFilter);
  const canManage = canManageBookings(currentUser);
  const dateLocale = language === "ar" ? "ar" : "en-US";
  const availabilityReady = Array.isArray(availability);

  const getAvailability = (employeeId, day) => (
    availabilityReady
      ? availability.filter((entry) => matchAvailabilityEntry(entry, employeeId, day))
      : []
  );

  const closeTransientUi = () => {
    setMoreOpen(false);
    setSelectedBlockKey(null);
  };

  const openUnsupported = () => {
    closeTransientUi();
    setUnsupported(true);
  };

  const openHoursModal = ({ block = null, day = today, employee = employees[0] || null, mode = "add" } = {}) => {
    closeTransientUi();
    const startDate = toDateKey(day);
    setHoursMode(mode);
    setHoursForm({
      staffQuery: "",
      staffIds: employee ? [String(employee.id)] : [],
      startDate: block?.date ? toDateKey(block.date) : startDate,
      endDateEnabled: Boolean(block?.endDate),
      endDate: block?.endDate ? toDateKey(block.endDate) : "",
      repeat: block?.repeat || "weekly",
      days: block?.date ? [new Date(block.date).getDay()] : [day.getDay()],
      startTime: block?.start || "",
      endTime: block?.end || "",
      editingBlock: block,
    });
    setHoursOpen(true);
  };

  const patchHoursForm = (patch) => setHoursForm((current) => ({ ...current, ...patch }));

  const saveHours = () => {
    setHoursOpen(false);
    setUnsupported(true);
  };

  const goToday = () => {
    closeTransientUi();
    setWeek(startOfWeek(today, weekStartsOn(language)));
  };

  const shiftWeek = (amount) => {
    closeTransientUi();
    setWeek((current) => moveWeek(current, amount));
  };

  const moreItems = [
    ["staff", "Manage staff", "إدارة الموظفين", () => onNavigate?.("admin-settings-bookings-staff")],
    ["hours", "Default business hours", "ساعات العمل الافتراضية", () => onNavigate?.("admin-settings-bookings-default-hours")],
    ["invite", "Invite collaborators", "دعوة المتعاونين", openUnsupported],
    ["import", "Import schedule", "استيراد الجدول", openUnsupported],
    ["help", "Availability settings", "إعدادات التوفر", openUnsupported],
  ];

  return (
    <BookingPageShell activePage={activePage} className="booking-schedule-page" currentUser={currentUser} language={language} onNavigate={onNavigate} {...layout}>
      <div className="booking-page-content">
        <header className="booking-page-header booking-schedule-header">
          <div>
            <h1>{bi(language, "Work Schedule", "جدول العمل")}</h1>
            <p>{bi(language, "Manage when and where staff members are available for the week.", "أدر أوقات وأماكن توفر الموظفين خلال الأسبوع.")}</p>
          </div>
          {canManage && (
            <div className="booking-header-actions">
              <div className="booking-menu-root">
                <SelectControl aria-expanded={moreOpen} onClick={() => { setSelectedBlockKey(null); setMoreOpen((value) => !value); }}>{bi(language, "More Actions", "إجراءات أخرى")}</SelectControl>
                {moreOpen && (
                  <div className="booking-action-menu manage booking-action-menu manage-wide" role="menu">
                    {moreItems.map(([key, en, ar, action]) => (
                      <button key={key} onClick={() => { closeTransientUi(); action(); }} role="menuitem" type="button">{bi(language, en, ar)}</button>
                    ))}
                  </div>
                )}
              </div>
              <button className="booking-primary-button" onClick={() => openHoursModal()} type="button"><Plus size={17} />{bi(language, "Add Staff Hours", "إضافة ساعات الموظف")}</button>
            </div>
          )}
        </header>

        <button className="booking-help-link" onClick={openUnsupported} type="button"><CircleHelp size={16} />{bi(language, "Get help with availability", "الحصول على مساعدة بشأن التوفر")}</button>

        <section className="booking-schedule-card">
          <header className="booking-schedule-controls">
            <div className="booking-schedule-nav">
              <button className="booking-today-button" onClick={goToday} type="button">{bi(language, "Today", "اليوم")}</button>
              <button aria-label={bi(language, "Previous week", "الأسبوع السابق")} onClick={() => shiftWeek(-1)} type="button"><DirectionalChevron direction="prev" language={language} size={18} /></button>
              <button aria-label={bi(language, "Next week", "الأسبوع التالي")} onClick={() => shiftWeek(1)} type="button"><DirectionalChevron direction="next" language={language} size={18} /></button>
              <WeekRangePicker
                language={language}
                onOpenChange={(value) => {
                  if (value) closeTransientUi();
                }}
                onWeekChange={(nextWeek) => {
                  closeTransientUi();
                  setWeek(nextWeek);
                }}
                weekStart={week}
              />
            </div>
            <div className="booking-schedule-filters">
              <SelectControl aria-disabled="true" className="is-disabled" onClick={openUnsupported}>{bi(language, "All locations", "كل المواقع")}</SelectControl>
              <select aria-label={bi(language, "Staff member", "الموظف")} onChange={(event) => setStaffFilter(event.target.value)} value={staffFilter}>
                <option value="all">{bi(language, "All staff members", "كل الموظفين")}</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employeeDisplayName(employee, language)}</option>)}
              </select>
            </div>
          </header>

          {!availabilityReady && (
            <div className="booking-availability-notice">
              <Clock3 size={18} />
              <div>
                <strong>{bi(language, "Availability not configured", "لم يتم إعداد التوفر")}</strong>
                <span>{bi(language, "Real employee rows are shown below. Hours remain empty until a supported availability source is connected.", "تظهر صفوف الموظفين الحقيقية أدناه، وتبقى الساعات فارغة حتى ربط مصدر توفر مدعوم.")}</span>
              </div>
            </div>
          )}

          {visibleEmployees.length ? (
            <div className="booking-schedule-grid-wrap">
              <div className="booking-schedule-grid booking-schedule-grid-head">
                <span />
                {days.map((day) => (
                  <span className={day.toDateString() === today.toDateString() ? "today" : ""} key={day.toISOString()}>
                    <b>{day.getDate().toString().padStart(2, "0")}</b>
                    <small>{day.toLocaleDateString(dateLocale, { weekday: "short" })}</small>
                  </span>
                ))}
              </div>
              {visibleEmployees.map((employee) => (
                <div className="booking-schedule-grid booking-schedule-row" key={employee.id}>
                  <div className="booking-staff-cell">
                    <span className="booking-schedule-avatar" style={{ background: employeeAvatarTone(employee.id) }}>
                      {employeeInitials(employee, language)}
                    </span>
                    <div className="booking-staff-meta">
                      <strong>{employeeDisplayName(employee, language)}</strong>
                      {employee?.email ? <small>{employee.email}</small> : null}
                    </div>
                    <button aria-label={bi(language, "Staff actions", "إجراءات الموظف")} onClick={openUnsupported} type="button"><MoreHorizontal size={17} /></button>
                  </div>
                  {days.map((day) => {
                    const blocks = getAvailability(employee.id, day);
                    const cellKey = `${employee.id}-${toDateKey(day)}`;
                    return (
                      <div className={`booking-availability-cell ${blocks.length ? "has-blocks" : ""}`} key={day.toISOString()}>
                        {blocks.map((block) => {
                          const blockKey = `${cellKey}:${block.id || `${block.start}-${block.end}`}`;
                          const isOpen = selectedBlockKey === blockKey;
                          return (
                            <div className="booking-schedule-block-wrap" key={blockKey}>
                              <button
                                className="booking-schedule-block"
                                onClick={() => {
                                  closeTransientUi();
                                  setSelectedBlockKey(isOpen ? null : blockKey);
                                }}
                                type="button"
                              >
                                {formatScheduleBlockLabel(block)}
                              </button>
                              {isOpen && (
                                <ScheduleBlockMenuAnchor language={language}>
                                  <div className="booking-action-menu slot" role="menu">
                                    <button onClick={() => openHoursModal({ block, day, employee, mode: "edit" })} role="menuitem" type="button">{bi(language, "Edit", "تعديل")}</button>
                                    <button className="is-danger" onClick={openUnsupported} role="menuitem" type="button">{bi(language, "Remove", "إزالة")}</button>
                                  </div>
                                </ScheduleBlockMenuAnchor>
                              )}
                            </div>
                          );
                        })}
                        {canManage && (
                          <button
                            aria-label={bi(language, "Add working hours", "إضافة ساعات عمل")}
                            className="booking-schedule-cell-add"
                            onClick={() => openHoursModal({ day, employee, mode: "add" })}
                            type="button"
                          >
                            <Plus size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <BookingEmpty
              description={bi(language, "Add employees through the existing Employees page before configuring availability.", "أضف الموظفين من صفحة الموظفين الحالية قبل إعداد التوفر.")}
              icon={UserRound}
              title={bi(language, "No staff records available", "لا توجد سجلات موظفين")}
            />
          )}
        </section>
      </div>

      {hoursOpen && (
        <WorkingHoursModal
          employees={employees}
          form={hoursForm}
          language={language}
          mode={hoursMode}
          onChange={patchHoursForm}
          onClose={() => setHoursOpen(false)}
          onSave={saveHours}
        />
      )}

      {unsupported && <UnsupportedDialog language={language} onClose={() => setUnsupported(false)} t={t} />}
    </BookingPageShell>
  );
}
