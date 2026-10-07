import React from "react";
import {
  CalendarCheck,
  ChevronDown,
  Clock3,
  Download,
  Filter,
  MapPin,
  MoreHorizontal,
  Settings2,
  Sparkles,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  applyBookingListFilters,
  bookingListColumns,
  buildBookingListChips,
  buildBookingSummary,
  countActiveListFilters,
  createDefaultListFilters,
  defaultBookingListColumnVisibility,
  employeeDisplayName,
} from "../utils/bookings.js";
import { formatCompanyCurrency } from "../utils/sales.js";
import {
  bi,
  BookingEmpty,
  BookingFormModal,
  BookingPageShell,
  SelectControl,
  UnsupportedDialog,
} from "./AdminBookingShared.jsx";

const filterSections = [
  ["status", "Booking status", "حالة الحجز", Clock3],
  ["session", "Session date & time", "تاريخ الجلسة والوقت", CalendarCheck],
  ["staff", "Staff name", "اسم الموظف", Users],
  ["service", "Service", "الخدمة", Sparkles],
  ["location", "Location", "الموقع", MapPin],
  ["payment", "Payment status", "حالة الدفع", Wallet],
];

const manageViewItems = [
  ["save", "Save view", "حفظ العرض"],
  ["save-new", "Save as new view", "حفظ كعرض جديد"],
  ["rename", "Rename", "إعادة تسمية"],
  ["default", "Set as default view", "تعيين كعرض افتراضي"],
  ["delete", "Delete", "حذف"],
];

const exportScopes = [
  ["all", "All", "الكل"],
  ["filtered", "Filtered", "المصفّى"],
  ["selected", "Selected", "المحدد"],
];

function PromotionCard({ language, onDismiss, onUnsupported, secondary = false }) {
  return (
    <article className="booking-promo-card">
      <span className="booking-new-badge">{bi(language, "NEW", "جديد")}</span>
      {onDismiss && <button aria-label={bi(language, "Dismiss", "إخفاء")} onClick={onDismiss} type="button"><X size={18} /></button>}
      <div>
        <h2>{secondary ? bi(language, "Organize services from one booking view", "نظّم الخدمات من عرض حجوزات واحد") : bi(language, "Keep booking work clear and connected", "حافظ على وضوح وترابط عمل الحجوزات")}</h2>
        <p>{secondary ? bi(language, "Use supported service tools as they become available for this company.", "استخدم أدوات الخدمات المدعومة عند توفرها لهذه الشركة.") : bi(language, "Review real appointments, payment states, and staff assignments from one place.", "راجع المواعيد الحقيقية وحالات الدفع وتعيينات الموظفين من مكان واحد.")}</p>
        <button onClick={onUnsupported} type="button">{bi(language, "Learn More", "معرفة المزيد")}</button>
      </div>
      <span className="booking-promo-visual"><CalendarCheck size={42} /><i /><i /></span>
    </article>
  );
}

function ListPill({ children, tone = "neutral" }) {
  return <span className={`booking-list-pill ${tone}`}>{children}</span>;
}

function ListFilterDrawer({ draft, employees, language, onApply, onChange, onClear, onClose }) {
  const [openSections, setOpenSections] = React.useState({
    status: true,
    session: true,
    staff: true,
    service: false,
    location: false,
    payment: false,
  });

  const toggleStaff = (id) => {
    const key = String(id);
    onChange({
      staffIds: draft.staffIds.includes(key)
        ? draft.staffIds.filter((value) => value !== key)
        : [...draft.staffIds, key],
      staff: true,
    });
  };

  return (
    <aside aria-label={bi(language, "Filter bookings", "تصفية الحجوزات")} className="booking-filter-drawer booking-list-filter-drawer">
      <header>
        <h2>{bi(language, "Filter", "تصفية")}</h2>
        <button aria-label={bi(language, "Close filters", "إغلاق عوامل التصفية")} onClick={onClose} type="button"><X size={22} /></button>
      </header>
      {filterSections.map(([key, en, ar, Icon]) => (
        <section className={openSections[key] ? "open" : ""} key={key}>
          <button onClick={() => setOpenSections((current) => ({ ...current, [key]: !current[key] }))} type="button">
            <span><Icon size={17} />{bi(language, en, ar)}</span>
            <ChevronDown size={16} />
          </button>
          {openSections[key] && (
            <div className="booking-filter-options">
              <label>
                <input
                  checked={draft[key]}
                  onChange={(event) => onChange({ [key]: event.target.checked, ...(key === "staff" && event.target.checked && !draft.staffIds.length ? { staffIds: employees.map((employee) => String(employee.id)) } : {}) })}
                  type="checkbox"
                />
                {bi(language, "Enable filter", "تفعيل عامل التصفية")}
              </label>
              {key === "status" && draft.status && (
                <label className="booking-form-field">
                  <span className="booking-form-label">{bi(language, "Status value", "قيمة الحالة")}</span>
                  <select className="booking-form-select" onChange={(event) => onChange({ statusValue: event.target.value })} value={draft.statusValue}>
                    <option value="confirmed">{bi(language, "Confirmed", "مؤكد")}</option>
                    <option value="pending">{bi(language, "Pending", "قيد الانتظار")}</option>
                    <option value="canceled">{bi(language, "Canceled", "ملغى")}</option>
                  </select>
                </label>
              )}
              {key === "payment" && draft.payment && (
                <label className="booking-form-field">
                  <span className="booking-form-label">{bi(language, "Payment value", "قيمة الدفع")}</span>
                  <select className="booking-form-select" onChange={(event) => onChange({ paymentValue: event.target.value })} value={draft.paymentValue}>
                    <option value="paid">{bi(language, "Paid", "مدفوع")}</option>
                    <option value="unpaid">{bi(language, "Unpaid", "غير مدفوع")}</option>
                  </select>
                </label>
              )}
              {key === "staff" && draft.staff && (
                employees.length ? employees.map((employee) => (
                  <label key={employee.id}>
                    <input checked={draft.staffIds.includes(String(employee.id))} onChange={() => toggleStaff(employee.id)} type="checkbox" />
                    {employeeDisplayName(employee, language)}
                  </label>
                )) : <p>{bi(language, "No staff records available.", "لا توجد سجلات موظفين متاحة.")}</p>
              )}
              {key === "service" && draft.service && (
                <p>{bi(language, "No verified booking services are connected.", "لا توجد خدمات حجز موثّقة متصلة.")}</p>
              )}
              {key === "location" && draft.location && (
                <p>{bi(language, "No verified booking locations are connected.", "لا توجد مواقع حجز موثّقة متصلة.")}</p>
              )}
              {key === "session" && draft.session && (
                <p>{bi(language, "Session filtering applies only to connected booking rows with session dates.", "تصفية الجلسة تنطبق فقط على صفوف الحجز المتصلة التي تحتوي على تواريخ جلسات.")}</p>
              )}
            </div>
          )}
        </section>
      ))}
      <footer>
        <div className="booking-list-filter-footer">
          <button className="booking-secondary-button" onClick={onClear} type="button">{bi(language, "Clear all", "مسح الكل")}</button>
          <button className="booking-primary-button" onClick={onApply} type="button">{bi(language, "Apply", "تطبيق")}</button>
        </div>
        <p>{bi(language, "Filters apply locally to connected booking rows only.", "تُطبَّق عوامل التصفية محليًا على صفوف الحجز المتصلة فقط.")}</p>
      </footer>
    </aside>
  );
}

function BookingTable({ bookings, company, hasActiveFilters, language, onClearFilters, onUnsupported, visibleColumns }) {
  const locale = language === "ar" ? "ar" : "en-US";
  const visible = bookingListColumns.filter((column) => visibleColumns[column.key]);

  if (!bookings.length) {
    if (hasActiveFilters) {
      return (
        <div className="booking-list-empty-wrap">
          <BookingEmpty
            description={bi(language, "Try changing your filters or clear them to see all connected bookings.", "جرّب تغيير عوامل التصفية أو مسحها لعرض كل الحجوزات المتصلة.")}
            title={bi(language, "No results found", "لا توجد نتائج")}
          />
          <button className="booking-primary-button booking-list-clear-button" onClick={onClearFilters} type="button">{bi(language, "Clear filters", "مسح عوامل التصفية")}</button>
        </div>
      );
    }
    return (
      <BookingEmpty
        description={bi(language, "Bookings will appear after a supported tenant booking source is connected.", "ستظهر الحجوزات بعد ربط مصدر حجوزات مدعوم للمستأجر.")}
        icon={UserRound}
        title={bi(language, "No bookings yet", "لا توجد حجوزات بعد")}
      />
    );
  }

  const renderCell = (booking, key) => {
    if (key === "createdAt") return booking.createdAt ? new Date(booking.createdAt).toLocaleDateString(locale) : "—";
    if (key === "customer") return booking.customerName || booking.customer?.name || "—";
    if (key === "service") return booking.serviceName || "—";
    if (key === "staff") return booking.staffName || "—";
    if (key === "session") return booking.sessionAt ? new Date(booking.sessionAt).toLocaleString(locale) : "—";
    if (key === "status") return booking.status ? <ListPill tone="status">{booking.status}</ListPill> : "—";
    if (key === "payment") return booking.paymentStatus ? <ListPill tone={booking.paymentStatus === "paid" ? "paid" : "unpaid"}>{booking.paymentStatus}</ListPill> : "—";
    if (key === "total") return Number.isFinite(Number(booking.total)) ? formatCompanyCurrency(Number(booking.total), company, language) : "—";
    return "—";
  };

  return (
    <div className="booking-list-table-wrap">
      <table className="booking-list-table">
        <thead>
          <tr>
            {visible.map((column) => <th key={column.key}>{bi(language, column.labelEn, column.labelAr)}</th>)}
            <th aria-label={bi(language, "Actions", "الإجراءات")} />
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id}>
              {visible.map((column) => <td key={column.key}>{renderCell(booking, column.key)}</td>)}
              <td>
                <button aria-label={bi(language, "Actions", "الإجراءات")} onClick={onUnsupported} type="button"><MoreHorizontal size={17} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminBookingListPage({
  activePage = "admin-bookings-list",
  bookings = null,
  company,
  employees = [],
  language = "en",
  t,
  ...layout
}) {
  const [tab, setTab] = React.useState("appointments");
  const [viewName] = React.useState("Default view");
  const [appliedFilters, setAppliedFilters] = React.useState(createDefaultListFilters);
  const [draftFilters, setDraftFilters] = React.useState(createDefaultListFilters);
  const [visibleColumns, setVisibleColumns] = React.useState(defaultBookingListColumnVisibility);
  const [exportScope, setExportScope] = React.useState("all");
  const [unsupported, setUnsupported] = React.useState(false);
  const [showFirstPromo, setShowFirstPromo] = React.useState(true);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [manageOpen, setManageOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [columnsOpen, setColumnsOpen] = React.useState(false);

  const summary = buildBookingSummary(bookings);
  const filteredBookings = applyBookingListFilters(bookings, { applied: appliedFilters, tab });
  const chips = buildBookingListChips(appliedFilters, language);
  const hasActiveFilters = countActiveListFilters(appliedFilters) > 0;
  const money = (value) => formatCompanyCurrency(value, company, language);

  const closeTransientUi = () => {
    setFilterOpen(false);
    setManageOpen(false);
    setExportOpen(false);
    setColumnsOpen(false);
  };

  const openUnsupported = () => {
    closeTransientUi();
    setUnsupported(true);
  };

  const openFilterDrawer = () => {
    closeTransientUi();
    setDraftFilters({ ...appliedFilters, staffIds: [...appliedFilters.staffIds] });
    setFilterOpen(true);
  };

  const openManageMenu = () => {
    closeTransientUi();
    setManageOpen((value) => !value);
  };

  const openExportModal = () => {
    closeTransientUi();
    setExportOpen(true);
  };

  const openColumnsPanel = () => {
    closeTransientUi();
    setColumnsOpen((value) => !value);
  };

  const applyFilters = () => {
    setAppliedFilters({ ...draftFilters, staffIds: [...draftFilters.staffIds] });
    setFilterOpen(false);
  };

  const clearFilters = () => {
    const reset = createDefaultListFilters();
    setDraftFilters(reset);
    setAppliedFilters(reset);
  };

  const removeChip = (id) => {
    setAppliedFilters((current) => ({ ...current, [id]: false, ...(id === "staff" ? { staffIds: [] } : {}) }));
  };

  return (
    <BookingPageShell activePage={activePage} className="booking-list-page" company={company} language={language} {...layout}>
      <div className="booking-page-content">
        <div className="booking-breadcrumb">
          <button onClick={() => layout.onNavigate?.("admin-bookings-calendar")} type="button">{bi(language, "Calendar", "التقويم")}</button>
          <span>/</span>
          <span>{bi(language, "Booking List", "قائمة الحجوزات")}</span>
        </div>

        <header className="booking-page-header">
          <div>
            <h1>{bi(language, "Booking List", "قائمة الحجوزات")}</h1>
            <p>{bi(language, "Review real tenant bookings and supported payment information.", "راجع حجوزات المستأجر الحقيقية ومعلومات الدفع المدعومة.")}</p>
          </div>
        </header>

        <div className="booking-promo-grid">
          {showFirstPromo && <PromotionCard language={language} onDismiss={() => setShowFirstPromo(false)} onUnsupported={openUnsupported} />}
          <PromotionCard language={language} onUnsupported={openUnsupported} secondary />
        </div>

        <section className="booking-financial-strip">
          <div><span>{bi(language, "Total bookings", "إجمالي الحجوزات")}</span><strong>{summary.available ? summary.bookings : 0}</strong></div>
          <div><span>{bi(language, "Unpaid bookings", "الحجوزات غير المدفوعة")}</span><strong>{summary.available ? summary.unpaid : 0}</strong></div>
          <div><span>{bi(language, "Paid bookings", "الحجوزات المدفوعة")}</span><strong>{summary.available ? summary.paid : 0}</strong></div>
          <div><span>{bi(language, "Booking sales", "مبيعات الحجوزات")}</span><strong>{summary.available ? money(summary.revenue) : money(0)}</strong></div>
          <SelectControl onClick={openUnsupported}>{bi(language, "Last 7 days", "آخر 7 أيام")}</SelectControl>
        </section>

        <section className="booking-list-card">
          <header className="booking-list-toolbar">
            <div className="booking-list-tabs" role="tablist">
              <button aria-selected={tab === "appointments"} onClick={() => { closeTransientUi(); setTab("appointments"); }} role="tab" type="button">{bi(language, "Appointments & Classes", "المواعيد والصفوف")}</button>
              <button aria-selected={tab === "courses"} onClick={() => { closeTransientUi(); setTab("courses"); }} role="tab" type="button">{bi(language, "Courses", "الدورات")}</button>
            </div>
            <div className="booking-list-toolbar-actions">
              <span className="booking-list-view-label">{viewName} ({filteredBookings.length})</span>
              <div className="booking-menu-root">
                <button aria-expanded={manageOpen} className={manageOpen ? "active" : ""} onClick={openManageMenu} type="button">
                  {bi(language, "Manage View", "إدارة العرض")}
                  <ChevronDown size={14} />
                </button>
                {manageOpen && (
                  <div className="booking-action-menu manage booking-list-manage-menu" role="menu">
                    {manageViewItems.map(([key, en, ar]) => (
                      <button className={key === "delete" ? "is-danger" : ""} key={key} onClick={openUnsupported} role="menuitem" type="button">{bi(language, en, ar)}</button>
                    ))}
                  </div>
                )}
              </div>
              <button aria-expanded={filterOpen} className={filterOpen ? "active" : ""} onClick={openFilterDrawer} type="button"><Filter size={16} />{bi(language, "Filter", "تصفية")}</button>
              <button aria-label={bi(language, "Export", "تصدير")} onClick={openExportModal} type="button"><Download size={16} /></button>
              <button aria-expanded={columnsOpen} aria-label={bi(language, "Table settings", "إعدادات الجدول")} className={columnsOpen ? "active" : ""} onClick={openColumnsPanel} type="button"><Settings2 size={16} /></button>
            </div>
          </header>

          {chips.length > 0 && (
            <div className="booking-filter-chips">
              {chips.map((chip) => (
                <button key={chip.id} onClick={() => removeChip(chip.id)} type="button">
                  <b>{bi(language, chip.prefixEn, chip.prefixAr)}</b>
                  {bi(language, chip.valueEn, chip.valueAr)}
                  <X size={13} />
                </button>
              ))}
              <button className="clear" onClick={clearFilters} type="button">{bi(language, "Clear all", "مسح الكل")}</button>
            </div>
          )}

          {columnsOpen && (
            <div aria-label={bi(language, "Manage columns", "إدارة الأعمدة")} className="booking-list-columns-panel">
              {bookingListColumns.map((column) => (
                <label key={column.key}>
                  <input
                    checked={visibleColumns[column.key]}
                    onChange={(event) => setVisibleColumns((current) => ({ ...current, [column.key]: event.target.checked }))}
                    type="checkbox"
                  />
                  {bi(language, column.labelEn, column.labelAr)}
                </label>
              ))}
            </div>
          )}

          {!summary.available && (
            <div className="booking-source-notice">
              <Sparkles size={16} />
              {bi(language, "No verified booking data source is connected.", "لا يوجد مصدر بيانات حجوزات موثّق متصل.")}
            </div>
          )}

          <BookingTable
            bookings={filteredBookings}
            company={company}
            hasActiveFilters={hasActiveFilters && summary.available}
            language={language}
            onClearFilters={clearFilters}
            onUnsupported={openUnsupported}
            visibleColumns={visibleColumns}
          />

          {filterOpen && (
            <ListFilterDrawer
              draft={draftFilters}
              employees={employees}
              language={language}
              onApply={applyFilters}
              onChange={(patch) => setDraftFilters((current) => ({ ...current, ...patch }))}
              onClear={() => setDraftFilters(createDefaultListFilters())}
              onClose={() => setFilterOpen(false)}
            />
          )}
        </section>
      </div>

      {exportOpen && (
        <BookingFormModal
          footer={(
            <>
              <button className="booking-secondary-button" onClick={() => setExportOpen(false)} type="button">{bi(language, "Cancel", "إلغاء")}</button>
              <button className="booking-primary-button" onClick={openUnsupported} type="button">{bi(language, "Export", "تصدير")}</button>
            </>
          )}
          language={language}
          onClose={() => setExportOpen(false)}
          subtitle={bi(language, "Choose which bookings to export. Export requires a supported booking API.", "اختر الحجوزات المراد تصديرها. يتطلب التصدير واجهة حجز مدعومة.")}
          title={bi(language, "Export booking data", "تصدير بيانات الحجز")}
        >
          <div className="booking-list-export-options">
            {exportScopes.map(([value, en, ar]) => (
              <label key={value}>
                <input checked={exportScope === value} name="booking-export-scope" onChange={() => setExportScope(value)} type="radio" />
                {bi(language, en, ar)}
              </label>
            ))}
          </div>
        </BookingFormModal>
      )}

      {unsupported && <UnsupportedDialog language={language} onClose={() => setUnsupported(false)} t={t} />}
    </BookingPageShell>
  );
}
