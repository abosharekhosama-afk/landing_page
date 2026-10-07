import React from "react";
import { Building2, Construction } from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import { getNavigationItem } from "../data/adminNavigation.js";

export function AdminUnderDevelopmentContent({ t }) {
  return (
    <section className="admin-under-development" role="status">
      <span className="admin-under-development-icon"><Construction size={30} /></span>
      <div>
        <h2>{t("adminShell.underDevelopment")}</h2>
        <p>{t("adminShell.futureUpdate")}</p>
      </div>
    </section>
  );
}

export function PlatformSitesHonestyContent({ language, onNavigate }) {
  const ar = language === "ar";
  return (
    <section className="admin-under-development platform-sites-honesty" role="status">
      <span className="admin-under-development-icon"><Construction size={30} /></span>
      <div>
        <h2>{ar ? "مواقع الشركات" : "Company Sites"}</h2>
        <p>
          {ar
            ? "تُدار مواقع الشركات من داخل الشركة نفسها بعد فتحها من صفحة الشركات. عنصر التنقل هذا غير متاح بعد."
            : "Sites for a company are managed after opening that company from the Companies page. This platform navigation item is not available yet."}
        </p>
        {onNavigate && (
          <button
            className="admin-primary-button platform-sites-honesty-cta"
            onClick={() => onNavigate("admin-platform-companies")}
            type="button"
          >
            <Building2 size={16} /> {ar ? "الانتقال إلى الشركات" : "Go to Companies"}
          </button>
        )}
      </div>
    </section>
  );
}

export default function AdminPlaceholderPage({ activePage, language = "en", t, ...layout }) {
  const item = getNavigationItem(activePage);
  const ar = language === "ar";
  const title = item?.label?.[language] || item?.label?.en || (ar ? "قريباً" : "Coming soon");

  const isPlatformSites = activePage === "admin-platform-placeholder-sites";

  return <AdminLayout
    activePage={activePage}
    language={language}
    title={title}
    subtitle={isPlatformSites
      ? (ar ? "إدارة مواقع الشركات" : "Company Sites management")
      : t("adminShell.preparingFeature")}
    t={t}
    {...layout}
  >
    {isPlatformSites ? (
      <PlatformSitesHonestyContent language={language} onNavigate={layout.onNavigate} />
    ) : (
      <AdminUnderDevelopmentContent t={t} />
    )}
  </AdminLayout>;
}