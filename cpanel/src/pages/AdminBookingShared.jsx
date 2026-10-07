import React from "react";
import { CalendarDays, ChevronDown, Construction, X } from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import { AdminUnderDevelopmentContent } from "./AdminPlaceholderPage.jsx";
import { bookingDirection } from "../utils/bookings.js";

export function bi(language, en, ar) {
  return language === "ar" ? ar : en;
}

export function BookingPageShell({ activePage, children, className = "", language = "en", ...layout }) {
  return (
    <AdminLayout activePage={activePage} hideHeader language={language} {...layout}>
      <div className={`tenant-booking-page ${className}`} data-booking-direction={bookingDirection(language)} dir={bookingDirection(language)}>
        {children}
      </div>
    </AdminLayout>
  );
}

export function UnsupportedDialog({ language, onClose, t }) {
  return (
    <div className="booking-modal-backdrop" onMouseDown={onClose} role="presentation">
      <div aria-modal="true" className="booking-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <button aria-label={bi(language, "Close", "إغلاق")} className="booking-modal-close" onClick={onClose} type="button"><X size={18} /></button>
        <AdminUnderDevelopmentContent t={t} />
      </div>
    </div>
  );
}

export function BookingEmpty({ description, icon: Icon = CalendarDays, title }) {
  return (
    <div className="booking-empty-state">
      <span className="booking-empty-visual"><Icon size={42} /><i /><i /></span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export function SelectControl({ children, className = "", onClick, ...props }) {
  return <button className={`booking-select-control ${className}`} onClick={onClick} type="button" {...props}>{children}<ChevronDown size={15} /></button>;
}

export function UnavailablePill({ language }) {
  return <span className="booking-unavailable-pill"><Construction size={13} />{bi(language, "Unavailable", "غير متاح")}</span>;
}

export function formatDateRange(start, language = "en", includeYear = true) {
  const locale = language === "ar" ? "ar" : "en-US";
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const options = { month: "short", day: "numeric", ...(includeYear ? { year: "numeric" } : {}) };
  return `${start.toLocaleDateString(locale, options)} – ${end.toLocaleDateString(locale, options)}`;
}

export function BookingFormModal({ children, footer, language = "en", onClose, subtitle, title }) {
  return (
    <div className="booking-modal-backdrop" onMouseDown={onClose} role="presentation">
      <div aria-modal="true" className="booking-modal booking-form-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <button aria-label={bi(language, "Close", "إغلاق")} className="booking-modal-close" onClick={onClose} type="button"><X size={18} /></button>
        <div className="booking-modal-body">
          <h2>{title}</h2>
          {subtitle ? <p className="booking-modal-sub">{subtitle}</p> : null}
          {children}
        </div>
        {footer ? <div className="booking-modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
