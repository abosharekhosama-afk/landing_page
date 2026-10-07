import React from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Store } from "lucide-react";
import { isArchivedSite } from "../utils/landingPlatform/siteContext.js";

/**
 * Landing Page Platform — Site Dashboard context strip (Phase 2).
 *
 * Additive Wix-like chrome shown inside the AdminLayout shell when a
 * landing-platform site context is active (and/or the landing-platform flags
 * are on). Never redesigns the shell — this is a single header strip.
 *
 * Behavior (LOCKED):
 * - Site identity: current site name + status badge, real data only (the
 *   SiteContext comes from `resolveSiteContext` — never invented).
 * - "Back to My Sites" → `onBackToMySites()` (navigates to admin-sites).
 * - Site switcher: lists ONLY the current company's non-archived sites;
 *   selecting one calls `onSwitchSite(siteId)` (activateSiteContext + URL
 *   sync). Multi-site companies are never auto-picked.
 * - No active context + flags on + user on the Dashboard → soft prompt to pick
 *   a site via My Sites (never auto-picks). Super Admin is never prompted.
 * - No active context + flags off → renders nothing (backward compatible).
 */

const statusLabels = {
  en: { active: "Active", draft: "Draft", archived: "Archived" },
  ar: { active: "نشط", draft: "مسودة", archived: "مؤرشف" },
};

function isSuperAdmin(user) {
  return (user?.globalRole || user?.role) === "super_admin";
}

export default function SiteContextBar({
  activePage,
  ar = false,
  companySites = [],
  currentUser = null,
  language = "en",
  onBackToMySites,
  onSwitchSite,
  siteContext = null,
}) {
  const [open, setOpen] = React.useState(false);
  const labels = statusLabels[language] || statusLabels.en;
  const activeSiteId = siteContext?.siteId || null;
  const activeSite = companySites.find((site) => site.id === activeSiteId) || null;
  const siteName = siteContext?.name || activeSite?.name || null;
  const siteStatus = siteContext?.status || activeSite?.status || null;
  const switchableSites = companySites.filter((site) => !isArchivedSite(site));

  // No active context: soft prompt only on the Dashboard when flags are on.
  // Super Admin is never forced into site context (no prompt).
  if (!activeSiteId) {
    if (activePage !== "admin" || isSuperAdmin(currentUser)) return null;
    return (
      <div className="site-context-bar site-context-prompt" role="note">
        <Store size={16} />
        <span>{ar ? "اختر موقعًا لإدارته" : "Pick a site to manage"}</span>
        {onBackToMySites && (
          <button className="site-context-prompt-action" onClick={onBackToMySites} type="button">
            {ar ? "الانتقال إلى مواقعي" : "Go to My Sites"}
          </button>
        )}
      </div>
    );
  }

  const backLabel = ar ? "العودة إلى مواقعي" : "Back to My Sites";
  const switchLabel = ar ? "تبديل الموقع" : "Switch site";

  return (
    <div className="site-context-bar" data-admin-popover-root>
      {onBackToMySites && (
        <button className="site-context-back" onClick={onBackToMySites} type="button">
          {ar ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          <span>{backLabel}</span>
        </button>
      )}
      <div className="site-context-switcher">
        <button
          aria-expanded={open}
          aria-haspopup="menu"
          className="site-context-trigger"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <span className="site-context-name" title={siteName || ""}>
            {siteName || (ar ? "الموقع" : "Site")}
          </span>
          {siteStatus && (
            <span className={`site-context-status site-context-status-${siteStatus}`}>
              {labels[siteStatus] || siteStatus}
            </span>
          )}
          <ChevronDown size={14} />
        </button>
        {open && (
          <div className="site-context-menu" role="menu" aria-label={switchLabel}>
            {switchableSites.length ? (
              switchableSites.map((site) => (
                <button
                  className={site.id === activeSiteId ? "active" : ""}
                  key={site.id}
                  onClick={() => {
                    setOpen(false);
                    if (onSwitchSite) onSwitchSite(site.id);
                  }}
                  role="menuitem"
                  type="button"
                >
                  <span className="site-context-menu-name" title={site.name}>
                    {site.name}
                  </span>
                  <span className={`site-context-status site-context-status-${site.status}`}>
                    {labels[site.status] || site.status}
                  </span>
                </button>
              ))
            ) : (
              <span className="site-context-menu-empty">{ar ? "لا توجد مواقع" : "No sites"}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}