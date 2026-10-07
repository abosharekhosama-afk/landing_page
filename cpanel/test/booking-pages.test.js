import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getNavigationItem, navigationContainsPage, tenantNavigation } from "../src/data/adminNavigation.js";
import { canonicalAdminPageKey, resolvePage } from "../src/utils/cpanelAccess.js";
import { moduleAllowsPage, normalizedModulePage } from "../src/utils/moduleRegistry.js";
import { canAccessAdminPage } from "../src/utils/roles.js";
import {
  applyBookingListFilters,
  bookingListColumns,
  bookingPageKeys,
  bookingRoutes,
  buildBookingListChips,
  buildBookingSummary,
  canManageBookings,
  canonicalBookingPageKey,
  countActiveListFilters,
  createDefaultListFilters,
  defaultBookingListColumnVisibility,
  employeeDisplayName,
  filterRealBookings,
  moveWeek,
  weekDays,
} from "../src/utils/bookings.js";

const customersModule = [{ enabled: true, route: "/admin/customers" }];
const companyAdmin = { role: "company_admin", activeCompany: { id: "icare", modules: customersModule } };
const employee = { role: "employee", permissions: ["customers.view"], activeCompany: companyAdmin.activeCompany };

const source = async (path) => readFile(new URL(path, import.meta.url), "utf8");

test("all canonical Booking Calendar routes resolve to their exact page keys", () => {
  for (const [pageKey, route] of Object.entries(bookingRoutes)) {
    assert.equal(resolvePage(route, companyAdmin, customersModule), pageKey);
  }
  assert.deepEqual(bookingPageKeys, Object.keys(bookingRoutes));
});

test("legacy booking paths and page keys canonicalize without Dashboard fallback", () => {
  const aliases = {
    "/admin/coming-soon/booking/calendar": "admin-bookings-calendar",
    "/admin/coming-soon/booking/list": "admin-bookings-list",
    "/admin/coming-soon/booking/work-schedule": "admin-bookings-work-schedule",
    "/admin/coming-soon/booking/analytics": "admin-bookings-analytics",
  };
  for (const [path, pageKey] of Object.entries(aliases)) assert.equal(resolvePage(path, companyAdmin, customersModule), pageKey);
  assert.equal(canonicalAdminPageKey("admin-tenant-placeholder-booking-calendar"), "admin-bookings-calendar");
  assert.equal(canonicalBookingPageKey("admin-tenant-placeholder-booking-list"), "admin-bookings-list");
});

test("Booking Calendar is a separate expanded parent with exactly four real children", () => {
  const parent = tenantNavigation.find((item) => item.id === "tenant-booking");
  assert.ok(parent);
  assert.equal(parent.children.length, 4);
  assert.deepEqual(parent.children.map((item) => item.pageKey), bookingPageKeys);
  for (const child of parent.children) {
    assert.equal(child.existing, true);
    assert.equal(child.placeholder, undefined);
    assert.equal(navigationContainsPage(parent, child.pageKey), true);
    assert.equal(getNavigationItem(child.pageKey)?.id, child.pageKey);
  }
  const customers = tenantNavigation.find((item) => item.id === "tenant-customers-leads");
  assert.equal(navigationContainsPage(customers, "admin-bookings-calendar"), false);
  assert.equal(navigationContainsPage(customers, "admin-bookings-analytics"), false);
});

test("booking pages reuse the established customers module and permission contract", () => {
  for (const pageKey of bookingPageKeys) {
    assert.equal(normalizedModulePage(pageKey), "admin-customers");
    assert.equal(moduleAllowsPage(customersModule, pageKey), true);
    assert.equal(canAccessAdminPage(employee, pageKey), true);
  }
  assert.equal(canManageBookings(employee), false);
  assert.equal(canManageBookings({ ...employee, permissions: ["customers.view", "customers.manage"] }), true);
  assert.equal(canManageBookings({ role: "manager" }), true);
});

test("unauthorized employees receive No Access while scoped tenant operators remain supported", () => {
  const unauthorized = { role: "employee", permissions: ["products.view"], activeCompany: companyAdmin.activeCompany };
  assert.equal(resolvePage("/admin/bookings/calendar", unauthorized, customersModule), "admin-no-access");
  const scoped = { role: "company_admin", globalRole: "super_admin", isCompanyScope: true, activeCompany: companyAdmin.activeCompany };
  assert.equal(resolvePage("/admin/bookings/analytics", scoped, customersModule), "admin-bookings-analytics");
  assert.notEqual(resolvePage("/admin/not-a-real-booking-route", companyAdmin, customersModule), "admin-bookings-calendar");
});

test("booking date helpers support week navigation and locale day order", () => {
  const date = new Date(2026, 6, 29);
  assert.equal(moveWeek(date, 1).getDate(), 5);
  assert.equal(weekDays(date, "en")[0].getDay(), 0);
  assert.equal(weekDays(date, "ar")[0].getDay(), 6);
});

test("booking summaries and filters use only supplied real booking records", () => {
  assert.deepEqual(buildBookingSummary(null), { available: false, bookings: 0, paid: 0, unpaid: 0, revenue: null });
  const rows = [
    { id: "b1", kind: "course", paymentStatus: "paid", staffId: "e1", total: 20 },
    { id: "b2", kind: "appointment", paymentStatus: "unpaid", staffId: "e2", total: 80 },
  ];
  assert.deepEqual(buildBookingSummary(rows), { available: true, bookings: 2, paid: 1, unpaid: 1, revenue: 20 });
  assert.deepEqual(filterRealBookings(rows, { kind: "course" }).map((row) => row.id), ["b1"]);
  assert.equal(employeeDisplayName({ firstName: "Ruba", lastName: "A" }), "Ruba A");
});

test("Calendar implements controls, drawer, Add menu, and slot context menu", async () => {
  const page = await source("../src/pages/AdminBookingCalendarPage.jsx");
  for (const marker of [
    "booking-mini-calendar",
    "booking-filter-drawer",
    "booking-display-drawer",
    "booking-calendar-rail-drawer",
    "booking-rail-trigger",
    "booking-calendar-body",
    "booking-week-grid-body",
    "booking-slot-menu-anchor",
    "SlotMenuAnchor",
    "closeToolbarMenus",
    "toggleAddMenu",
    "toggleManageMenu",
    "booking-add-button",
    "selectedSlot",
    "ActionMenu",
    "Appointment waitlist",
    "Sync your personal calendar",
    "Display settings",
    "booking-cal-search",
    "booking-cal-footer",
    "Daily",
    "Staff",
    "Schedule",
    "Quick Sale",
    "Export booking data",
    "BookingFormModal",
  ]) assert.match(page, new RegExp(marker));
  assert.match(page, /onNavigate\?\.\("admin-tenant-placeholder-catalog-booking-services"\)/);
  assert.doesNotMatch(page, /window\.location|history\.pushState|admin-dashboard/);
  assert.doesNotMatch(page, /localStorage|bookingsApi|localBookingsRepository/);
});

test("Booking List implements tabs, filter chips, table fields, and an honest empty state", async () => {
  const page = await source("../src/pages/AdminBookingListPage.jsx");
  for (const marker of [
    "booking-list-tabs",
    "booking-filter-chips",
    "booking-list-filter-drawer",
    "booking-list-columns-panel",
    "booking-list-manage-menu",
    "booking-list-export-options",
    "BookingTable",
    "ListFilterDrawer",
    "buildBookingListChips",
    "removeChip",
    "clearFilters",
    "closeTransientUi",
    "Manage View",
    "Save view",
    "Export booking data",
    "BookingFormModal",
    "Appointments & Classes",
    "Courses",
    "No verified booking data source is connected",
    "No bookings yet",
    "No results found",
  ]) assert.match(page, new RegExp(marker));
  assert.match(page, /bookingListColumns/);
  assert.deepEqual(bookingListColumns.map((column) => column.labelEn), ["Booking date", "Customer", "Service", "Staff member", "Session", "Status", "Payment", "Total"]);
  assert.match(page, /setUnsupported\(true\)|openUnsupported/);
  assert.match(page, /employees\.map/);
  assert.match(page, /No verified booking services are connected/);
  assert.match(page, /No verified booking locations are connected/);
  assert.match(page, /Filters apply locally to connected booking rows only/);
  assert.doesNotMatch(page, /window\.location|history\.pushState|admin-dashboard/);
  assert.doesNotMatch(page, /localStorage|bookingsApi|localBookingsRepository|seedSnapshot/i);
  assert.doesNotMatch(page, /Casey Morgan|Alex Rivera/i);
  assert.doesNotMatch(page, /\$1,|\$2,|USD 1,|EUR 1,/);
  assert.doesNotMatch(page, /window\.prompt/);
});

test("booking list helpers filter only supplied real booking rows", () => {
  const defaults = createDefaultListFilters();
  assert.equal(countActiveListFilters(defaults), 0);
  assert.deepEqual(defaultBookingListColumnVisibility(), Object.fromEntries(bookingListColumns.map((column) => [column.key, true])));
  const rows = [
    { id: "b1", kind: "course", status: "confirmed", paymentStatus: "paid", staffId: "e1", sessionAt: "2026-08-20T10:00:00.000Z", total: 20 },
    { id: "b2", kind: "appointment", status: "pending", paymentStatus: "unpaid", staffId: "e2", sessionAt: "2026-07-01T10:00:00.000Z", total: 80 },
  ];
  assert.deepEqual(applyBookingListFilters(null, { applied: defaults, tab: "appointments" }), []);
  assert.deepEqual(applyBookingListFilters(rows, { applied: defaults, tab: "courses" }).map((row) => row.id), ["b1"]);
  assert.deepEqual(applyBookingListFilters(rows, { applied: { ...defaults, payment: true, paymentValue: "paid" }, tab: "appointments" }).map((row) => row.id), ["b1"]);
  assert.deepEqual(applyBookingListFilters(rows, { applied: { ...defaults, status: true, statusValue: "pending" }, tab: "appointments" }).map((row) => row.id), ["b2"]);
  assert.equal(buildBookingListChips({ ...defaults, status: true, statusValue: "pending" }).length, 1);
});

test("Work Schedule renders only supplied employees and never invents working hours", async () => {
  const page = await source("../src/pages/AdminWorkSchedulePage.jsx");
  assert.match(page, /employees\.map/);
  assert.match(page, /employeeDisplayName/);
  assert.match(page, /Availability not configured/);
  assert.match(page, /Array\.isArray\(availability\)/);
  assert.match(page, /booking-week-range-picker/);
  assert.match(page, /WorkingHoursModal/);
  assert.match(page, /booking-schedule-block/);
  assert.match(page, /booking-schedule-cell-add/);
  assert.match(page, /DirectionalChevron/);
  assert.match(page, /admin-settings-bookings-staff/);
  assert.match(page, /admin-settings-bookings-default-hours/);
  assert.match(page, /ScheduleBlockMenuAnchor/);
  assert.match(page, /setUnsupported\(true\)|openUnsupported/);
  assert.doesNotMatch(page, /9:00 AM|10:00 AM|12:00 AM|burhan|ruba|shren/i);
  assert.doesNotMatch(page, /localStorage|scheduleApi|localScheduleRepository|seedSnapshot/i);
});

test("Bookings Analytics provides the requested composition with no fabricated attribution", async () => {
  const page = await source("../src/pages/AdminBookingsAnalyticsPage.jsx");
  for (const marker of ["Spots filled", "Predicted occupancy", "Top class sessions", "Booking sales", "Top clients", "first-time clients", "returning clients", "Staff performance", "Booking AI is not connected", "No verified booking attribution source"]) assert.match(page, new RegExp(marker, "i"));
  assert.match(page, /setKind\("classes"\)/);
  assert.match(page, /setKind\("appointments"\)/);
  assert.doesNotMatch(page, /Google \(organic\)|Facebook \(paid\)|Wix email|Direct.*\b0\b/);
});

test("all unsupported booking mutations reuse the shared bilingual flow", async () => {
  const files = ["AdminBookingCalendarPage.jsx", "AdminBookingListPage.jsx", "AdminWorkSchedulePage.jsx", "AdminBookingsAnalyticsPage.jsx"];
  for (const file of files) {
    const page = await source(`../src/pages/${file}`);
    assert.match(page, /UnsupportedDialog/);
    assert.doesNotMatch(page, /history\.pushState|history\.replaceState/);
  }
  const shared = await source("../src/pages/AdminBookingShared.jsx");
  assert.match(shared, /AdminUnderDevelopmentContent/);
});

test("CPanelApp owns booking routing and pages do not introduce a second router", async () => {
  const app = await source("../src/CPanelApp.jsx");
  assert.match(app, /\.\.\.bookingRoutes/);
  for (const pageKey of bookingPageKeys) assert.match(app, new RegExp(`activePage === "${pageKey}"`));
  assert.match(app, /onPopState/);
  assert.match(app, /canonicalAdminPageKey\(page\)/);
});

test("booking CSS is narrowly scoped and responsive", async () => {
  const css = await source("../src/styles/global.css");
  assert.match(css, /\/\* Tenant Booking Calendar module \*\//);
  assert.match(css, /\.booking-calendar-layout/);
  assert.match(css, /\.booking-filter-drawer/);
  assert.match(css, /\.booking-display-drawer/);
  assert.match(css, /\.booking-calendar-rail-drawer/);
  assert.match(css, /\.booking-calendar-body/);
  assert.match(css, /\.booking-slot-menu-anchor\.is-flip-up/);
  assert.match(css, /\.booking-schedule-grid/);
  assert.match(css, /\.booking-week-range-picker/);
  assert.match(css, /\.booking-schedule-block/);
  assert.match(css, /\.booking-schedule-cell-add/);
  assert.match(css, /\.booking-analytics-feature-row/);
  assert.match(css, /\.booking-list-filter-drawer/);
  assert.match(css, /\.booking-list-columns-panel/);
  assert.match(css, /\[dir="rtl"\] \.booking-filter-drawer/);
  assert.match(css, /@media \(max-width: 980px\)/);
});
