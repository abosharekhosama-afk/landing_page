import React from "react";
import { ArrowLeft, ChevronRight, Construction, Info, X } from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import { AdminUnderDevelopmentContent } from "./AdminPlaceholderPage.jsx";
import { tenantManagementDirection } from "../utils/tenantManagement.js";

export const ml = (language, en, ar) => (language === "ar" ? ar : en);

export function ManagementShell({ activePage, children, className = "", company, language = "en", ...layout }) {
  return (
    <AdminLayout activePage={activePage} company={company} hideHeader language={language} {...layout}>
      <div className={`tenant-management-page${className ? ` ${className}` : ""}`} data-management-direction={tenantManagementDirection(language)} dir={tenantManagementDirection(language)}>
        {children}
      </div>
    </AdminLayout>
  );
}

export function ManagementHeader({ actions, breadcrumbs = [], description, language, onNavigate, title }) {
  return (
    <header className="tenant-management-header">
      {breadcrumbs.length > 0 && (
        <nav aria-label={ml(language, "Breadcrumb", "مسار التنقل")} className="tenant-management-breadcrumbs">
          {breadcrumbs.map((item, index) => (
            <React.Fragment key={`${item.label}-${index}`}>
              {index > 0 && <ChevronRight aria-hidden="true" size={15} />}
              <button disabled={!item.page} onClick={() => item.page && onNavigate(item.page)} type="button">{item.label}</button>
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="tenant-management-heading-row">
        <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
        {actions && <div className="tenant-management-actions">{actions}</div>}
      </div>
    </header>
  );
}

export function UnsupportedDialog({ language, onClose, t }) {
  return (
    <div className="tenant-management-modal-backdrop" onMouseDown={onClose} role="presentation">
      <div aria-modal="true" className="tenant-management-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <button aria-label={ml(language, "Close", "إغلاق")} className="tenant-management-modal-close" onClick={onClose} type="button"><X size={18} /></button>
        <AdminUnderDevelopmentContent t={t} />
      </div>
    </div>
  );
}

export function HonestNotice({ children, language, title }) {
  return <div className="tenant-management-notice" role="status"><Info size={20} /><div><strong>{title || ml(language, "Not configured", "غير مهيأ")}</strong><span>{children}</span></div></div>;
}

export function EmptyManagementState({ action, description, icon: Icon = Construction, title }) {
  return <div className="tenant-management-empty"><span><Icon size={44} /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function SettingsTabs({ active, language, onNavigate, tabs }) {
  return <div className="tenant-settings-tabs" role="tablist">{tabs.map((tab) => <button aria-selected={active === tab.page} className={active === tab.page ? "active" : ""} key={tab.page} onClick={() => onNavigate(tab.page)} role="tab" type="button">{ml(language, tab.en, tab.ar)}</button>)}</div>;
}

export function SettingRow({ description, disabled = false, language, onClick, title, trailing }) {
  return <button aria-disabled={disabled} className={`tenant-setting-row${disabled ? " disabled" : ""}`} disabled={disabled} onClick={disabled ? undefined : onClick} type="button"><div><strong>{title}</strong><span>{description}</span></div>{trailing || <ChevronRight size={18} />}</button>;
}

export function BackButton({ language, onClick }) {
  return <button className="tenant-management-link" onClick={onClick} type="button"><ArrowLeft size={16} />{ml(language, "Back", "رجوع")}</button>;
}
