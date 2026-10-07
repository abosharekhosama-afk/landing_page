import React from "react";
import { Building2, Globe, Plus, ShieldAlert, Users } from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import { fetchPlatformCompanies } from "../utils/platformCompaniesApi.js";
import { companyInitials } from "../utils/companySwitcher.js";

function AdminPlatformOverview({
  currentUser,
  isDarkMode,
  language,
  onLanguageChange,
  onLogout,
  onNavigate,
  onSwitchCompany,
  onToggleDarkMode,
}) {
  const [companies, setCompanies] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [accessDenied, setAccessDenied] = React.useState(false);
  const onLogoutRef = React.useRef(onLogout);

  React.useEffect(() => {
    onLogoutRef.current = onLogout;
  }, [onLogout]);

  React.useEffect(() => {
    const platformRole = currentUser?.globalRole || currentUser?.role;
    if (platformRole !== "super_admin" && platformRole !== "platform_admin") {
      setAccessDenied(true);
      setIsLoading(false);
      return;
    }
    let active = true;
    async function load() {
      try {
        const result = await fetchPlatformCompanies();
        if (active) setCompanies(result);
      } catch (requestError) {
        if (!active) return;
        if (requestError.status === 401) void onLogoutRef.current();
        else if (requestError.status === 403) setAccessDenied(true);
        else setError(requestError.message || "Failed to load data.");
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [currentUser]);

  const totalCompanies = companies.length;
  const activeCompanies = companies.filter((c) => c.status === "active").length;
  const totalMembers = 0;

  const recentCompanies = React.useMemo(() => {
    return companies.filter((c) => c.status === "active").slice(0, 5);
  }, [companies]);

  const labels = {
    overview: language === "ar" ? "نظرة عامة" : "Overview",
    subtitle: language === "ar" ? "منصة إدارة الشركات" : "Platform administration dashboard",
    totalCompanies: language === "ar" ? "إجمالي الشركات" : "Total companies",
    activeCompanies: language === "ar" ? "الشركات النشطة" : "Active companies",
    totalMembers: language === "ar" ? "إجمالي المسؤولين" : "Total administrators",
    recentlyManaged: language === "ar" ? "الشركات التي تمت إدارتها مؤخرًا" : "Recently managed companies",
    quickActions: language === "ar" ? "إجراءات سريعة" : "Quick actions",
    manageCompany: language === "ar" ? "إدارة شركة" : "Manage a company",
    addCompany: language === "ar" ? "إضافة شركة" : "Add a company",
    manageDomains: language === "ar" ? "إدارة النطاقات" : "Manage domains",
    noCompanies: language === "ar" ? "لم يتم العثور على شركات" : "No companies found",
    clickToManage: language === "ar" ? "انقر للدخول" : "Click to manage",
    loading: language === "ar" ? "جارٍ تحميل النظرة العامة..." : "Loading overview...",
    accessDeniedTitle: language === "ar" ? "تم رفض الوصول" : "Access denied",
    accessDeniedBody:
      language === "ar"
        ? "يمكن لمدير المنصة فقط عرض هذه الصفحة."
        : "Only a Super Admin can view this page.",
  };

  if (accessDenied) {
    return (
      <AdminLayout
        activePage="admin-platform-overview"
        company={null}
        currentUser={currentUser}
        isDarkMode={isDarkMode}
        language={language}
        modules={[]}
        onLanguageChange={onLanguageChange}
        onLogout={onLogout}
        onNavigate={onNavigate}
        onToggleDarkMode={onToggleDarkMode}
        title={labels.accessDeniedTitle}
      >
        <section className="admin-panel-card company-access-denied" role="alert">
          <ShieldAlert size={28} />
          <div>
            <h2>{labels.accessDeniedTitle}</h2>
            <p>{labels.accessDeniedBody}</p>
          </div>
        </section>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      activePage="admin-platform-overview"
      currentUser={currentUser}
      isDarkMode={isDarkMode}
      language={language}
      onLanguageChange={onLanguageChange}
      onLogout={onLogout}
      onNavigate={onNavigate}
      onToggleDarkMode={onToggleDarkMode}
      subtitle={labels.subtitle}
      title={labels.overview}
    >
      {error && (
        <div className="message-panel error" role="alert">
          {error}
        </div>
      )}

      {isLoading ? (
        <section className="admin-panel-card platform-overview-loading" aria-busy="true">
          {labels.loading}
        </section>
      ) : (
        <div className="platform-overview">
          <div className="platform-metrics">
            <div className="platform-metric-card">
              <div className="platform-metric-icon"><Building2 size={20} /></div>
              <div className="platform-metric-value">{totalCompanies}</div>
              <div className="platform-metric-label">{labels.totalCompanies}</div>
            </div>
            <div className="platform-metric-card">
              <div className="platform-metric-icon"><Building2 size={20} /></div>
              <div className="platform-metric-value">{activeCompanies}</div>
              <div className="platform-metric-label">{labels.activeCompanies}</div>
            </div>
            <div className="platform-metric-card">
              <div className="platform-metric-icon"><Users size={20} /></div>
              <div className="platform-metric-value">-</div>
              <div className="platform-metric-label">{labels.totalMembers}</div>
            </div>
          </div>

          <div>
            <h2 className="platform-section-title">{labels.recentlyManaged}</h2>
            {recentCompanies.length > 0 ? (
              <div className="platform-recent-list">
                {recentCompanies.map((company) => (
                  <div
                    key={company.id}
                    className="platform-recent-item"
                    onClick={() => onSwitchCompany(company.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSwitchCompany(company.id);
                      }
                    }}
                  >
                    {company.logoUrl ? (
                      <img className="platform-recent-logo" src={company.logoUrl} alt="" />
                    ) : (
                      <span className="platform-recent-initials">
                        {companyInitials(company.name)}
                      </span>
                    )}
                    <div className="platform-recent-info">
                      <div className="platform-recent-name">{company.name}</div>
                      <div className="platform-recent-slug">{company.id}</div>
                    </div>
                    <span
                      className={`admin-status-pill ${company.status === "active" ? "active" : company.status === "draft" ? "warning" : "neutral"}`}
                    >
                      {company.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="platform-recent-empty">{labels.noCompanies}</p>
            )}
          </div>

          <div>
            <h2 className="platform-section-title">{labels.quickActions}</h2>
            <div className="platform-quick-actions">
              <button
                className="platform-quick-action"
                onClick={() => onNavigate("admin-platform-companies")}
                type="button"
              >
                <Building2 size={16} /> {labels.manageCompany}
              </button>
              <button
                className="platform-quick-action"
                onClick={() => onNavigate("admin-platform-companies")}
                type="button"
              >
                <Plus size={16} /> {labels.addCompany}
              </button>
              <button
                className="platform-quick-action"
                onClick={() => onNavigate("admin-platform-domains")}
                type="button"
              >
                <Globe size={16} /> {labels.manageDomains}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminPlatformOverview;
