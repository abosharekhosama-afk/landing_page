import React, { useState } from "react";
import { AlertCircle, ChevronRight } from "lucide-react";
import { ManagementShell, UnsupportedDialog, ml } from "./AdminManagementShared.jsx";
import { developerToolsDirection } from "../utils/developerTools.js";

export { ml };

export function DeveloperToolsShell({ activePage, children, company, language = "en", ...layout }) {
  return (
    <ManagementShell activePage={activePage} className="developer-tools-page" company={company} language={language} {...layout}>
      <div data-developer-direction={developerToolsDirection(language)}>{children}</div>
    </ManagementShell>
  );
}

export function DeveloperPageHeader({ actions, breadcrumbs = [], description, language, onNavigate, title }) {
  return (
    <header className="developer-tools-header">
      {breadcrumbs.length > 0 && (
        <nav aria-label={ml(language, "Breadcrumb", "مسار التنقل")} className="developer-tools-breadcrumbs">
          {breadcrumbs.map((item, index) => (
            <React.Fragment key={`${item.label}-${index}`}>
              {index > 0 && <ChevronRight aria-hidden="true" size={15} />}
              <button disabled={!item.page} onClick={() => item.page && onNavigate(item.page)} type="button">{item.label}</button>
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="developer-tools-heading-row">
        <div><h1>{title}</h1><p>{description}</p></div>
        {actions && <div className="developer-tools-header-actions">{actions}</div>}
      </div>
    </header>
  );
}

export function DeveloperUnavailable({ description, icon: Icon = AlertCircle, title }) {
  return (
    <div className="developer-tools-unavailable">
      <span className="developer-tools-unavailable-icon"><Icon aria-hidden="true" size={46} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export function DeveloperToolsPage({ activePage, children, company, language, t, ...layout }) {
  const [unavailableOpen, setUnavailableOpen] = useState(false);
  return (
    <DeveloperToolsShell activePage={activePage} company={company} language={language} {...layout}>
      {typeof children === "function" ? children(() => setUnavailableOpen(true)) : children}
      {unavailableOpen && <UnsupportedDialog language={language} onClose={() => setUnavailableOpen(false)} t={t} />}
    </DeveloperToolsShell>
  );
}
