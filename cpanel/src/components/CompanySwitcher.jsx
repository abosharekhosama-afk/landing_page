import React from "react";
import { Building2, Check, ChevronDown, Search, ArrowLeft } from "lucide-react";
import { fetchPlatformCompanies } from "../utils/platformCompaniesApi.js";
import { companyInitials, createCompanySwitchGuard } from "../utils/companySwitcher.js";
import { effectivePlatformRole, isPlatformAdmin } from "../utils/roles.js";

function CompanySwitcher({
  company,
  currentUser,
  language = "en",
  onSwitchCompany,
  onReturnToPlatform,
}) {
  const [open, setOpen] = React.useState(false);
  const [companies, setCompanies] = React.useState([]);
  const [search, setSearch] = React.useState("");
  const [switchError, setSwitchError] = React.useState("");
  const [switchingCompanyId, setSwitchingCompanyId] = React.useState("");
  const buttonRef = React.useRef(null);
  const searchRef = React.useRef(null);
  const onSwitchCompanyRef = React.useRef(onSwitchCompany);
  const guardedSwitchRef = React.useRef(null);
  const isSuperAdmin = isPlatformAdmin(effectivePlatformRole(currentUser));

  onSwitchCompanyRef.current = onSwitchCompany;
  if (!guardedSwitchRef.current) {
    guardedSwitchRef.current = createCompanySwitchGuard((companyId) =>
      onSwitchCompanyRef.current(companyId),
    );
  }

  React.useEffect(() => {
    if (!isSuperAdmin) return;
    fetchPlatformCompanies()
      .then(setCompanies)
      .catch(() => setCompanies([]));
  }, [isSuperAdmin, company?.id]);

  React.useEffect(() => {
    if (!open) {
      setSearch("");
      setSwitchError("");
    } else {
      searchRef.current?.focus();
    }
  }, [open]);

  React.useEffect(() => {
    function handleClickOutside(e) {
      if (buttonRef.current && !buttonRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.querySelector(".company-switcher-toggle")?.focus();
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [open]);

  async function selectCompany(selectedCompany) {
    if (switchingCompanyId || company?.id === selectedCompany.id) return;
    setSwitchError("");
    setSwitchingCompanyId(selectedCompany.id);
    try {
      await guardedSwitchRef.current(selectedCompany.id);
      setOpen(false);
    } catch (error) {
      setSwitchError(error?.message || "Unable to switch company.");
    } finally {
      setSwitchingCompanyId("");
    }
  }

  async function returnToPlatform() {
    if (switchingCompanyId) return;
    setSwitchError("");
    setSwitchingCompanyId("platform");
    try {
      await onReturnToPlatform();
      setOpen(false);
    } catch (error) {
      setSwitchError(error?.message || "Unable to return to the platform.");
    } finally {
      setSwitchingCompanyId("");
    }
  }

  if (!isSuperAdmin) return null;

  const inScope = Boolean(company);
  const activeCompanies = companies.filter((c) => c.status === "active");
  const query = search.trim().toLowerCase();
  const filtered = query
    ? activeCompanies.filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.id?.toLowerCase().includes(query),
      )
    : activeCompanies;

  const labels = {
    platform: language === "ar" ? "المنصة" : "Platform",
    backToPlatform: language === "ar" ? "العودة إلى المنصة" : "Back to Platform",
    search: language === "ar" ? "بحث..." : "Search...",
    manage: language === "ar" ? "إدارة" : "Manage",
  };

  return (
    <div className="company-switcher" ref={buttonRef}>
      <button
        className="company-switcher-toggle"
        onClick={() => setOpen(!open)}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-busy={Boolean(switchingCompanyId)}
      >
        {inScope ? (
          <>
            {company?.logoUrl ? (
              <img
                className="company-switcher-logo"
                src={company.logoUrl}
                alt=""
              />
            ) : (
              <span className="company-switcher-initials">
                {companyInitials(company.name)}
              </span>
            )}
            <span className="company-switcher-name">{company.name}</span>
          </>
        ) : (
          <>
            <span className="company-switcher-initials platform-initials">
              {companyInitials(labels.platform)}
            </span>
            <span className="company-switcher-name">{labels.platform}</span>
          </>
        )}
        <ChevronDown size={14} className={`company-switcher-chevron ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div className="company-switcher-dropdown" role="listbox">
          <div className="company-switcher-search">
            <Search size={14} />
            <input
              ref={searchRef}
              type="text"
              placeholder={labels.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={labels.search}
            />
          </div>
          <div className="company-switcher-list">
            {switchError && <div className="company-switcher-error" role="alert">{switchError}</div>}
            {!inScope && (
              <div className="company-switcher-item current" role="option" aria-selected="true">
                <span className="company-switcher-item-initials platform-initials">
                  {companyInitials(labels.platform)}
                </span>
                <span className="company-switcher-item-name">{labels.platform}</span>
                <Check size={14} className="company-switcher-check" />
              </div>
            )}
            {filtered.length === 0 && (
              <div className="company-switcher-empty">
                {language === "ar" ? "لا توجد نتائج" : "No results"}
              </div>
            )}
            {filtered.map((c) => {
              const isCurrent = inScope && company?.id === c.id;
              return (
                <button
                  key={c.id}
                  className={`company-switcher-item ${isCurrent ? "current" : ""} ${switchingCompanyId === c.id ? "switching" : ""}`}
                  disabled={Boolean(switchingCompanyId)}
                  onClick={() => void selectCompany(c)}
                  type="button"
                  role="option"
                  aria-selected={isCurrent}
                >
                  {c.logoUrl ? (
                    <img className="company-switcher-item-logo" src={c.logoUrl} alt="" />
                  ) : (
                    <span className="company-switcher-item-initials">
                      {companyInitials(c.name)}
                    </span>
                  )}
                  <span className="company-switcher-item-name">{c.name}</span>
                  {switchingCompanyId === c.id && (
                    <span className="company-switcher-switching" role="status">Switching...</span>
                  )}
                  {isCurrent && <Check size={14} className="company-switcher-check" />}
                </button>
              );
            })}
          </div>
          {inScope && (
            <button
              className="company-switcher-back"
              disabled={Boolean(switchingCompanyId)}
              onClick={() => void returnToPlatform()}
              type="button"
            >
              <ArrowLeft size={14} />
              {switchingCompanyId === "platform" ? "Returning..." : labels.backToPlatform}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default CompanySwitcher;
