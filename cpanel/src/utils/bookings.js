export const bookingRoutes = Object.freeze({
  "admin-bookings-calendar": "/admin/bookings/calendar",
  "admin-bookings-list": "/admin/bookings/list",
  "admin-bookings-work-schedule": "/admin/bookings/work-schedule",
  "admin-bookings-analytics": "/admin/bookings/analytics",
});

export const bookingPageKeys = Object.freeze(Object.keys(bookingRoutes));

const legacyPaths = Object.freeze({
  "/admin/coming-soon/booking/calendar": "admin-bookings-calendar",
  "/admin/coming-soon/booking/list": "admin-bookings-list",
  "/admin/coming-soon/booking/work-schedule": "admin-bookings-work-schedule",
  "/admin/coming-soon/booking/analytics": "admin-bookings-analytics",
  "/admin/booking/calendar": "admin-bookings-calendar",
  "/admin/booking/list": "admin-bookings-list",
  "/admin/booking/work-schedule": "admin-bookings-work-schedule",
  "/admin/booking/analytics": "admin-bookings-analytics",
});

const legacyPageKeys = Object.freeze({
  "admin-tenant-placeholder-booking-calendar": "admin-bookings-calendar",
  "admin-tenant-placeholder-booking-list": "admin-bookings-list",
  "admin-tenant-placeholder-booking-work-schedule": "admin-bookings-work-schedule",
  "admin-tenant-placeholder-booking-analytics": "admin-bookings-analytics",
});

export function canonicalBookingPageKey(pageKey) {
  return legacyPageKeys[pageKey] || pageKey;
}

export function resolveBookingPage(pathname) {
  return legacyPaths[pathname]
    || Object.entries(bookingRoutes).find(([, route]) => route === pathname)?.[0]
    || null;
}

export function bookingDirection(language) {
  return language === "ar" ? "rtl" : "ltr";
}

export function startOfWeek(value = new Date(), weekStartsOn = 0) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const distance = (date.getDay() - weekStartsOn + 7) % 7;
  date.setDate(date.getDate() - distance);
  return date;
}

export function moveWeek(value, amount) {
  const date = new Date(value);
  date.setDate(date.getDate() + (amount * 7));
  return date;
}

export function weekDays(value, language = "en") {
  const first = startOfWeek(value, weekStartsOn(language));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    return date;
  });
}

export function weekStartsOn(language = "en") {
  return language === "ar" ? 6 : 0;
}

export function startOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function startOfMonth(value = new Date()) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

export function addDays(value, amount) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

export function addMonths(value, amount) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

export function formatHour(hour, language = "en") {
  return new Date(2020, 0, 1, hour).toLocaleTimeString(language === "ar" ? "ar" : "en-US", { hour: "numeric" });
}

export function buildMiniMonth(monthStart, language = "en") {
  const first = startOfMonth(monthStart);
  const start = startOfWeek(first, weekStartsOn(language));
  const today = startOfDay(new Date());
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    return {
      key: date.toISOString(),
      date,
      otherMonth: date.getMonth() !== first.getMonth(),
      isToday: date.getTime() === today.getTime(),
    };
  });
}

export function formatCalendarRange(view, cursor, weekStart, language = "en") {
  const locale = language === "ar" ? "ar" : "en-US";
  if (view === "daily") {
    return cursor.toLocaleDateString(locale, { weekday: "short", month: "long", day: "numeric", year: "numeric" });
  }
  const end = addDays(weekStart, 6);
  const options = { month: "short", day: "numeric", year: "numeric" };
  return `${weekStart.toLocaleDateString(locale, options)} – ${end.toLocaleDateString(locale, options)}`;
}

export function calendarViewDays(view, weekStart, selectedDate, language = "en", showWeekends = true) {
  if (view === "daily") return [startOfDay(selectedDate)];
  const days = weekDays(weekStart, language);
  if (showWeekends) return days;
  return days.filter((day) => {
    const weekday = day.getDay();
    return weekday !== 0 && weekday !== 6;
  });
}

export function buildBookingSummary(bookings) {
  if (!Array.isArray(bookings)) {
    return { available: false, bookings: 0, paid: 0, unpaid: 0, revenue: null };
  }
  const paidRows = bookings.filter((booking) => booking?.paymentStatus === "paid");
  const unpaidRows = bookings.filter((booking) => booking?.paymentStatus === "unpaid");
  const revenue = paidRows.reduce((sum, booking) => {
    const total = Number(booking?.total);
    return sum + (Number.isFinite(total) ? total : 0);
  }, 0);
  return {
    available: true,
    bookings: bookings.length,
    paid: paidRows.length,
    unpaid: unpaidRows.length,
    revenue,
  };
}

export function filterRealBookings(bookings, filters = {}) {
  if (!Array.isArray(bookings)) return [];
  return bookings.filter((booking) => {
    if (filters.kind && booking?.kind !== filters.kind) return false;
    if (filters.staffId && String(booking?.staffId) !== String(filters.staffId)) return false;
    if (filters.serviceId && String(booking?.serviceId) !== String(filters.serviceId)) return false;
    return true;
  });
}

export const bookingListColumns = Object.freeze([
  { key: "createdAt", labelEn: "Booking date", labelAr: "تاريخ الحجز" },
  { key: "customer", labelEn: "Customer", labelAr: "العميل" },
  { key: "service", labelEn: "Service", labelAr: "الخدمة" },
  { key: "staff", labelEn: "Staff member", labelAr: "الموظف" },
  { key: "session", labelEn: "Session", labelAr: "الجلسة" },
  { key: "status", labelEn: "Status", labelAr: "الحالة" },
  { key: "payment", labelEn: "Payment", labelAr: "الدفع" },
  { key: "total", labelEn: "Total", labelAr: "الإجمالي" },
]);

export function defaultBookingListColumnVisibility() {
  return Object.fromEntries(bookingListColumns.map((column) => [column.key, true]));
}

export function formatBookingSessionRangeLabel(language = "en") {
  const locale = language === "ar" ? "ar" : "en-US";
  const end = new Date();
  const start = addDays(end, -31);
  const options = { month: "short", day: "numeric", year: "numeric" };
  return `${start.toLocaleDateString(locale, options)} – ${end.toLocaleDateString(locale, options)}`;
}

export function createDefaultListFilters() {
  return {
    status: false,
    statusValue: "confirmed",
    session: false,
    staff: false,
    staffIds: [],
    service: false,
    location: false,
    payment: false,
    paymentValue: "paid",
  };
}

export function countActiveListFilters(applied = {}) {
  return ["status", "session", "staff", "service", "location", "payment"].reduce((count, key) => (
    applied[key] ? count + 1 : count
  ), 0);
}

export function applyBookingListFilters(bookings, { applied = {}, tab = "appointments" } = {}) {
  if (!Array.isArray(bookings)) return [];
  let list = filterRealBookings(bookings, tab === "courses" ? { kind: "course" } : {});

  if (applied.status) {
    list = list.filter((booking) => String(booking?.status || "").toLowerCase() === String(applied.statusValue || "").toLowerCase());
  }

  if (applied.payment) {
    list = list.filter((booking) => String(booking?.paymentStatus || "").toLowerCase() === String(applied.paymentValue || "").toLowerCase());
  }

  if (applied.staff && applied.staffIds?.length) {
    const ids = new Set(applied.staffIds.map(String));
    list = list.filter((booking) => ids.has(String(booking?.staffId)));
  }

  if (applied.session) {
    const end = new Date();
    const start = addDays(end, -31);
    list = list.filter((booking) => {
      if (!booking?.sessionAt) return false;
      const date = new Date(booking.sessionAt);
      return date >= start && date <= end;
    });
  }

  return list;
}

export function buildBookingListChips(applied = {}, language = "en") {
  const chips = [];
  if (applied.status) {
    chips.push({
      id: "status",
      prefixEn: "Booking status:",
      prefixAr: "حالة الحجز:",
      valueEn: applied.statusValue || "Confirmed",
      valueAr: applied.statusValue === "pending" ? "قيد الانتظار" : applied.statusValue === "canceled" ? "ملغى" : "مؤكد",
    });
  }
  if (applied.session) {
    chips.push({
      id: "session",
      prefixEn: "Session date:",
      prefixAr: "تاريخ الجلسة:",
      valueEn: formatBookingSessionRangeLabel(language),
      valueAr: formatBookingSessionRangeLabel(language),
    });
  }
  if (applied.staff) {
    chips.push({
      id: "staff",
      prefixEn: "Staff:",
      prefixAr: "الموظف:",
      valueEn: applied.staffIds?.length ? `${applied.staffIds.length} selected` : "Selected staff",
      valueAr: applied.staffIds?.length ? `${applied.staffIds.length} محدد` : "موظفون محددون",
    });
  }
  if (applied.service) {
    chips.push({
      id: "service",
      prefixEn: "Service:",
      prefixAr: "الخدمة:",
      valueEn: "Selected service",
      valueAr: "خدمة محددة",
    });
  }
  if (applied.location) {
    chips.push({
      id: "location",
      prefixEn: "Location:",
      prefixAr: "الموقع:",
      valueEn: "Selected location",
      valueAr: "موقع محدد",
    });
  }
  if (applied.payment) {
    chips.push({
      id: "payment",
      prefixEn: "Payment:",
      prefixAr: "الدفع:",
      valueEn: applied.paymentValue === "unpaid" ? "Unpaid" : "Paid",
      valueAr: applied.paymentValue === "unpaid" ? "غير مدفوع" : "مدفوع",
    });
  }
  return chips;
}

export function employeeDisplayName(employee, language = "en") {
  return employee?.name?.[language]
    || employee?.name?.en
    || employee?.name
    || [employee?.firstName, employee?.lastName].filter(Boolean).join(" ")
    || employee?.email
    || "—";
}

export function canManageBookings(user) {
  if (["company_admin", "admin", "manager"].includes(user?.role)) return true;
  return ["employee", "staff"].includes(user?.role) && user?.permissions?.includes("customers.manage");
}

export function toDateKey(value = new Date()) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function sameCalendarDay(a, b) {
  if (!a || !b) return false;
  return toDateKey(a) === toDateKey(b);
}

export function isDateInWeek(day, weekStart) {
  const start = toDateKey(weekStart);
  const end = toDateKey(addDays(weekStart, 6));
  const key = toDateKey(day);
  return key >= start && key <= end;
}

export function employeeInitials(employee, language = "en") {
  const name = employeeDisplayName(employee, language);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  return (parts[0]?.[0] || "—").toUpperCase();
}

export function employeeAvatarTone(employeeId) {
  const palette = ["#1769ff", "#7147ee", "#27c4a5", "#ff8f1f", "#e04672"];
  const id = String(employeeId ?? "");
  let index = 0;
  for (let step = 0; step < id.length; step += 1) {
    index = (index + id.charCodeAt(step) * (step + 3)) % palette.length;
  }
  return palette[index];
}

export function formatScheduleBlockLabel(block) {
  if (block?.start && block?.end) return `${block.start} – ${block.end}`;
  if (block?.start) return String(block.start);
  return "—";
}

export function matchAvailabilityEntry(entry, employeeId, day) {
  if (String(entry?.employeeId) !== String(employeeId)) return false;
  if (!entry?.date) return false;
  return sameCalendarDay(entry.date, day);
}
