import React from "react";
import AdminLayout from "./components/AdminLayout.jsx";
import AdminCompaniesPage from "./pages/AdminCompaniesPage.jsx";
import AdminDomainsPage from "./pages/AdminDomainsPage.jsx";
import AdminPlatformOverview from "./pages/AdminPlatformOverview.jsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import AdminInventoryPage from "./pages/AdminInventoryPage.jsx";
import AdminReviewsPage from "./pages/AdminReviewsPage.jsx";
import AdminProductSettingsPage from "./pages/AdminProductSettingsPage.jsx";
import AdminProductBundlesPage from "./pages/AdminProductBundlesPage.jsx";
import AdminUnitCreatorPage from "./pages/AdminUnitCreatorPage.jsx";
import AdminCustomModulePage from "./pages/AdminCustomModulePage.jsx";
import AdminDeliveryPage from "./pages/AdminDeliveryPage.jsx";
import AdminActivityLogPage from "./pages/AdminActivityLogPage.jsx";
import AdminEmployeesPage from "./pages/AdminEmployeesPage.jsx";
import AdminLoginPage from "./pages/AdminLoginPage.jsx";
import AdminDropshippingPage from "./pages/AdminDropshippingPage.jsx";
import AdminVelvetDropshippingPage from "./pages/VelvetDropshipping/AdminVelvetDropshippingPage.jsx";
import MerchantStorefrontPage from "./pages/VelvetDropshipping/MerchantStorefrontPage.jsx";
import MerchantVelvetDashboardPage from "./pages/VelvetDropshipping/MerchantVelvetDashboardPage.jsx";
import AdminFeaturePage, { featurePageKeys } from "./pages/AdminFeaturePage.jsx";
import AdminPlaceholderPage from "./pages/AdminPlaceholderPage.jsx";
import AdminSalesPage from "./pages/AdminSalesPage.jsx";
import AdminCatalogPage from "./pages/AdminCatalogPage.jsx";
import AdminVideoAppsPage from "./pages/AdminVideoAppsPage.jsx";
import AdminSiteMobilePage from "./pages/AdminSiteMobilePage.jsx";
import AdminMarketingPage from "./pages/AdminMarketingPage.jsx";
import AdminSmsPage from "./pages/AdminSmsPage.jsx";
import AdminAnnouncementsPage from "./pages/AdminAnnouncementsPage.jsx";
import AdminSplashAdsPage from "./pages/AdminSplashAdsPage.jsx";
import AdminPoliciesPage from "./pages/AdminPoliciesPage.jsx";
import AdminSecurityPage from "./pages/AdminSecurityPage.jsx";
import AdminLegalInformationPage from "./pages/AdminLegalInformationPage.jsx";
import AdminBannersPage from "./pages/AdminBannersPage.jsx";
import AdminGettingPaidPage from "./pages/AdminGettingPaidPage.jsx";
import AdminInboxPage from "./pages/AdminInboxPage.jsx";
import AdminContactsPage from "./pages/AdminContactsPage.jsx";
import AdminContactDetailPage from "./pages/AdminContactDetailPage.jsx";
import AdminFormsPage from "./pages/AdminFormsPage.jsx";
import AdminMeetingsPage from "./pages/AdminMeetingsPage.jsx";
import AdminPipelinesPage from "./pages/AdminPipelinesPage.jsx";
import AdminCommunityPage from "./pages/AdminCommunityPage.jsx";
import AdminLoyaltyPage from "./pages/AdminLoyaltyPage.jsx";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage.jsx";
import AdminBookingCalendarPage from "./pages/AdminBookingCalendarPage.jsx";
import AdminBookingListPage from "./pages/AdminBookingListPage.jsx";
import AdminWorkSchedulePage from "./pages/AdminWorkSchedulePage.jsx";
import AdminBookingsAnalyticsPage from "./pages/AdminBookingsAnalyticsPage.jsx";
import AdminAutomationsPage from "./pages/AdminAutomationsPage.jsx";
import AdminSettingsPage from "./pages/AdminSettingsPage.jsx";
import AdminBookingSettingsPage from "./pages/AdminBookingSettingsPage.jsx";
import AdminWebsiteContentPage from "./pages/AdminWebsiteContentPage.jsx";
import AdminSitesPage from "./pages/AdminSitesPage.jsx";
import AdminSiteLogsPage from "./pages/AdminSiteLogsPage.jsx";
import AdminAdvancedLogToolsPage from "./pages/AdminAdvancedLogToolsPage.jsx";
import AdminMonitoringPage from "./pages/AdminMonitoringPage.jsx";
import AdminSecretsManagerPage from "./pages/AdminSecretsManagerPage.jsx";
import AdminTriggeredEmailsPage from "./pages/AdminTriggeredEmailsPage.jsx";
import SiteEditorPage from "./pages/SiteEditorPage.jsx";
import {
  isNavigationPlaceholderPage,
  placeholderPageKeys,
  placeholderPagePaths,
} from "./data/adminNavigation.js";
import { hasPermission } from "./data/permissions.js";
import { createTranslator } from "./data/translations.js";
import {
  fetchCurrentUser,
  getCurrentUser,
  enterCompanyScope,
  exitCompanyScope,
  loginUser,
  logoutUser,
  setCurrentUser as persistCurrentUser,
} from "./utils/auth.js";
import { moduleAllowsPage } from "./utils/moduleRegistry.js";
import { fetchCustomModules } from "./utils/customModulesApi.js";
import {
  customModulePath,
  isCustomModulePage,
  isCustomModulePath,
  isCustomModulesCapabilityEnabled,
  parseCustomModuleKeyFromPage,
} from "./utils/customModulesUi.js";
import { performSecureCompanySwitch } from "./utils/companySwitcher.js";
import { protectedApiErrorEvent } from "./utils/api.js";
import { assignOrderEmployee, createOrder, deleteOrder, getOrders, updateOrderStatus } from "./utils/orders.js";
import { salesPageKeys } from "./utils/sales.js";
import { catalogDiscountPageKeys, catalogPlaceholderPageKeys } from "./utils/catalog.js";
import { videoAppsPageKeys } from "./utils/videoApps.js";
import { siteMobilePageKeys } from "./utils/siteMobile.js";
import { marketingPageKeys } from "./utils/marketing.js";
import { gettingPaidPageKeys } from "./utils/gettingPaid.js";
import { analyticsPageKeys, analyticsRoutes } from "./utils/analytics.js";
import { bookingPageKeys, bookingRoutes } from "./utils/bookings.js";
import {
  bookingSettingsPageKeys,
  financeSettingsPageKeys,
  tenantManagementRoutes,
} from "./utils/tenantManagement.js";
import { websiteContentPageKeys, websiteContentRoutes } from "./utils/websiteContent.js";
import { developerToolsPageKeys, developerToolsRoutes } from "./utils/developerTools.js";
import {
  createEmployee as createEmployeeApi,
  deleteEmployee as deleteEmployeeApi,
  fetchEmployees,
  updateEmployee as updateEmployeeApi,
  updateEmployeeStatus,
} from "./utils/employeesApi.js";
import { fetchEmployeeWorkSessions } from "./utils/workSessionsApi.js";
import {
  createProduct as createProductApi,
  deactivateProduct as deactivateProductApi,
  deleteProduct as deleteProductApi,
  duplicateProduct as duplicateProductApi,
  fetchProducts,
  fetchTrashedProducts,
  permanentlyDeleteProduct as permanentlyDeleteProductApi,
  reorderProducts as reorderProductsApi,
  restoreProduct as restoreProductApi,
  updateProduct as updateProductApi,
} from "./utils/productsApi.js";
import {
  deleteHomepageOffer,
  deleteReview as deleteReviewApi,
  fetchAllHomepageCategoryCards,
  fetchAllHomepageOffers,
  fetchAllReviews,
  saveHomepageCategoryCard,
  saveHomepageOffer,
  updateReviewStatus,
} from "./utils/homeContentApi.js";
import {
  createBrand,
  createCategory,
  deleteBrand,
  deleteCategory,
  fetchBrands,
  fetchCategories,
  updateBrand,
  updateCategory,
} from "./utils/catalogApi.js";
import {
  createVlog,
  deleteVlog,
  fetchVlogs,
  saveVlogHero,
  updateVlog,
} from "./utils/vlogsApi.js";
import {
  applyCompanyDocumentBranding,
  clearTenantCaches,
  getStoredCompanyContext,
} from "./utils/companyContext.js";
import { updateCompanySettings } from "./utils/companyApi.js";
import {
  clearWebsiteMediaCache,
  deleteWebsiteMedia as deleteWebsiteMediaApi,
  fetchAllWebsiteMedia,
  saveWebsiteMedia as saveWebsiteMediaApi,
} from "./utils/websiteMediaApi.js";
import { canonicalAdminPageKey, isValidCpanelUser, landingPage, moduleAllowsPageForUser, resolvePage } from "./utils/cpanelAccess.js";
import { getLandingPlatformFlags } from "./utils/landingPlatform/featureFlags.js";
import { landingPageForUser } from "./utils/landingPlatform/landingPage.js";
import {
  activateSiteContext,
  clearActiveSiteContext,
  clearActiveSiteHint,
  getActiveSiteContext,
  readActiveSiteHint,
  restoreActiveSiteContext,
  syncSiteIdToUrl,
} from "./utils/landingPlatform/activeSiteSession.js";
import { isArchivedSite } from "./utils/landingPlatform/siteContext.js";
import {
  canAccessAdminPage,
  adminDashboardPath,
  isAdminPortalRole,
  isCompanyAdmin,
  isPlatformAdmin,
  landingPageForRole,
  resolveAdminPage,
  canReadCatalogFormOptions,
} from "./utils/roles.js";

import "./styles/global.css";
import "./styles/dashboard-shell.css";

const EMPTY_MODULES = Object.freeze([]);

/**
 * Best-effort preservation of `?siteId=` across dashboard navigations when a
 * site context is active. Never overrides an explicit siteId already present
 * in the destination path (e.g. the Site Editor deep link).
 */
function preserveSiteIdInPath(path, siteId) {
  if (!path || !siteId) return path;
  try {
    const url = new URL(path, window.location.origin);
    if (!url.searchParams.get("siteId")) url.searchParams.set("siteId", siteId);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return path;
  }
}

const pagePaths = {
  "admin-login": "/admin/login",
  admin: adminDashboardPath,
  "admin-platform-overview": "/admin/platform/overview",
  "admin-platform-companies": "/admin/platform/companies",
  "admin-platform-domains": "/admin/platform/domains",
  "admin-sms": "/admin/sms",
  "admin-announcements": "/admin/announcements",
  "admin-policies": "/admin/policies",
  "admin-legal-information": "/admin/legal-information",
  "admin-banners": "/admin/banners",
  "admin-splash-ads": "/admin/splash-ads",
  "admin-security": "/admin/security",
  "admin-products": "/admin/products",
  "admin-product-bundles": "/admin/product-bundles",
  "admin-products-trash": "/admin/products/trash",
  "admin-products-new": "/admin/products/new",
  "admin-products-edit": "/admin/products/new",
  "admin-coupons": "/admin/coupons",
  "admin-automatic-discounts": "/admin/automatic-discounts",
  "admin-categories": "/admin/categories",
  "admin-categories-new": "/admin/categories/new",
  "admin-brands": "/admin/brands",
  "admin-brands-new": "/admin/brands/new",
  "admin-vlogs": "/admin/vlogs",
  "admin-vlogs-new": "/admin/vlogs/new",
  "admin-store-locator": "/admin/store-locator",
  "admin-store-locator-new": "/admin/store-locator/new",
  "admin-website-media": "/admin/website-media",
  "admin-homepage-offers": "/admin/homepage-offers",
  "admin-website-texts": "/admin/website-texts",
  "admin-sites": "/admin/sites",
  "admin-seo": "/admin/marketing/seo",
  "admin-site-editor": "/admin/site-editor",
  "admin-orders": "/admin/orders",
  "admin-reviews": "/admin/reviews",
  "admin-inventory": "/admin/inventory",
  "admin-customers": "/admin/customers",
  "admin-customers-detail": "/admin/customers/contact",
  "admin-inbox": "/admin/inbox",
  "admin-forms": "/admin/forms",
  "admin-meetings": "/admin/meetings",
  "admin-pipelines": "/admin/pipelines",
  "admin-community": "/admin/community",
  "admin-loyalty": "/admin/loyalty",
  ...analyticsRoutes,
  ...bookingRoutes,
  ...tenantManagementRoutes,
  ...websiteContentRoutes,
  ...developerToolsRoutes,
  "admin-staff": "/admin/staff",
  "admin-staff-new": "/admin/staff/new",
  "admin-employees": "/admin/staff",
  "admin-product-settings": "/admin/product-settings",
  "admin-invoices": "/admin/invoices",
  "admin-delivery": "/admin/delivery",
  "admin-reports": "/admin/reports",
  "admin-activity-log": "/admin/activity-log",
  "admin-unit-creator": "/admin/unit-creator",
  "admin-dropshipping": "/admin/dropshipping",
  "admin-dropshipping-marketers": "/admin/dropshipping/marketers",
  "admin-dropshipping-products": "/admin/dropshipping/products",
  "admin-dropshipping-orders": "/admin/dropshipping/orders",
  "admin-dropshipping-earnings": "/admin/dropshipping/earnings",
  "admin-dropshipping-withdrawals": "/admin/dropshipping/withdrawals",
  "admin-dropshipping-reports": "/admin/dropshipping/reports",
  "admin-dropshipping-settings": "/admin/dropshipping/settings",
  "admin-velvet-dropshipping": "/admin/velvet-dropshipping",
  "admin-velvet-dropshipping-merchants": "/admin/velvet-dropshipping/merchants",
  "admin-velvet-dropshipping-catalog": "/admin/velvet-dropshipping/catalog",
  "admin-velvet-dropshipping-orders": "/admin/velvet-dropshipping/orders",
  "admin-velvet-dropshipping-fulfillment": "/admin/velvet-dropshipping/fulfillment",
  "admin-velvet-dropshipping-settlements": "/admin/velvet-dropshipping/settlements",
  "admin-no-access": "/admin/no-access",
  ...placeholderPagePaths,
};

const adminPageKeys = Object.keys(pagePaths).filter((page) => page !== "admin-login");
const staffPageKeys = ["admin-staff", "admin-staff-new", "admin-employees"];
const dropshippingPageKeys = Object.keys(pagePaths).filter((key) =>
  key.startsWith("admin-dropshipping"),
);
const velvetDropshipPageKeys = [
  "admin-velvet-dropshipping",
  "admin-velvet-dropshipping-merchants",
  "admin-velvet-dropshipping-catalog",
  "admin-velvet-dropshipping-orders",
  "admin-velvet-dropshipping-fulfillment",
  "admin-velvet-dropshipping-settlements",
];
const customerPageKeys = ["admin-customers", "admin-customers-detail", "admin-inbox", "admin-forms", "admin-meetings", "admin-pipelines", "admin-community", "admin-loyalty"];

function CPanelApp() {
  const storedUser = React.useMemo(() => getCurrentUser(), []);
  const [company, setCompany] = React.useState(
    () => storedUser?.activeCompany || getStoredCompanyContext(),
  );
  const [activePage, setActivePage] = React.useState(() =>
    resolvePage(window.location.pathname, storedUser),
  );
  const [currentUser, setUser] = React.useState(storedUser);
  const [isAuthResolving, setIsAuthResolving] = React.useState(true);
  const modules = company?.modules ?? EMPTY_MODULES;
  const [customModules, setCustomModules] = React.useState([]);
  const [products, setProducts] = React.useState([]);
  const [trashedProducts, setTrashedProducts] = React.useState([]);
  const [categories, setCategories] = React.useState([]);
  const [brands, setBrands] = React.useState([]);
  const [orders, setOrders] = React.useState([]);
  const [employees, setEmployees] = React.useState([]);
  const [employeeSessions, setEmployeeSessions] = React.useState([]);
  const [homepageOffers, setHomepageOffers] = React.useState([]);
  const [homepageCategoryCards, setHomepageCategoryCards] = React.useState([]);
  const [reviews, setReviews] = React.useState([]);
  const [websiteMedia, setWebsiteMedia] = React.useState([]);
  const [websiteMediaError, setWebsiteMediaError] = React.useState("");
  const [vlogs, setVlogs] = React.useState([]);
  const [vlogHero, setVlogHero] = React.useState({ title: { en: "", ar: "" }, imageUrl: "", videoUrl: "", posterUrl: "" });
  const [adminLoginMessage, setAdminLoginMessage] = React.useState("");
  const [adminMessage, setAdminMessage] = React.useState("");
  const [adminMessageType, setAdminMessageType] = React.useState("success");
  const [productReorderSaving, setProductReorderSaving] = React.useState(false);
  const [language, setLanguage] = React.useState(
    () => localStorage.getItem("epChemicalLanguage") || "en",
  );
  const [isDarkMode, setIsDarkMode] = React.useState(
    () => localStorage.getItem("epChemicalAdminDarkMode") === "true",
  );
  const [siteContext, setSiteContext] = React.useState(null);
  const [companySites, setCompanySites] = React.useState([]);
  const previousCompanyId = React.useRef(company?.id || null);
  const sessionInvalidatingRef = React.useRef(false);
  const catalogHydratedRef = React.useRef({
    companyId: company?.id || null,
    products: false,
    trash: false,
    categories: false,
    brands: false,
  });
  const contentHydratedRef = React.useRef({
    companyId: company?.id || null,
    websiteMedia: false,
    adminContent: false,
  });
  const t = React.useMemo(() => createTranslator(language), [language]);

  function navigate(page, options = {}) {
    const requestedPage = canonicalAdminPageKey(page);
    const authorizationUser =
      options.user ||
      (Object.prototype.hasOwnProperty.call(options, "role")
        ? options.role
          ? { role: options.role }
          : null
        : currentUser);
    const navigationCompany = Object.prototype.hasOwnProperty.call(options, "company")
      ? options.company
      : company;
    const navigationModules = options.modules || modules;
    const isCustom = isCustomModulePage(requestedPage);
    const routeRecognized = Boolean(pagePaths[requestedPage]) || isCustom;
    const roleAllowed = routeRecognized && canAccessAdminPage(authorizationUser, requestedPage);
    const moduleAllowed =
      isCustom ||
      !navigationModules.length ||
      !navigationCompany ||
      requestedPage === "admin-platform-companies" ||
      requestedPage === "admin-platform-domains" ||
      requestedPage === "admin-login" ||
      requestedPage === "admin-site-editor" ||
      isNavigationPlaceholderPage(requestedPage) ||
      moduleAllowsPageForUser(authorizationUser, navigationModules, requestedPage);
    const safePage =
      roleAllowed && moduleAllowed
        ? requestedPage
        : routeRecognized && isAdminPortalRole(authorizationUser?.role)
          ? "admin-no-access"
          : landingPage(authorizationUser || {}, navigationModules);
    if (!options.preserveStatusMessage) setAdminMessage("");
    if (!options.preserveLoginMessage) setAdminLoginMessage("");
    setActivePage(safePage);
    const customKey = parseCustomModuleKeyFromPage(safePage);
    const destinationPath = safePage === requestedPage && options.path
      ? options.path
      : customKey
        ? customModulePath(customKey)
        : pagePaths[safePage];
    const targetPath = preserveSiteIdInPath(destinationPath, siteContext?.siteId);
    if (targetPath && `${window.location.pathname}${window.location.search}` !== targetPath) {
      window.history[options.replace ? "replaceState" : "pushState"]({}, "", targetPath);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleApiError(error) {
    if (error?.status === 401) {
      // Single-flight: parallel protected refreshes must not clear session / redirect repeatedly.
      if (sessionInvalidatingRef.current) return;
      sessionInvalidatingRef.current = true;
      persistCurrentUser(null);
      setUser(null);
      setCompany(null);
      clearActiveSiteContext();
      clearActiveSiteHint();
      setSiteContext(null);
      setCompanySites([]);
      setProducts([]);
      setTrashedProducts([]);
      setCategories([]);
      setBrands([]);
      setOrders([]);
      setEmployees([]);
      setReviews([]);
      setHomepageOffers([]);
      setHomepageCategoryCards([]);
      setWebsiteMedia([]);
      setWebsiteMediaError("");
      setVlogs([]);
      setVlogHero({ title: { en: "", ar: "" }, imageUrl: "", videoUrl: "", posterUrl: "" });
      setAdminLoginMessage("Your session expired. Please sign in again.");
      navigate("admin-login", { preserveLoginMessage: true, replace: true, role: null });
      return;
    }
    // 403 is permission denial — keep the session; never treat as logout.
    setAdminMessageType("error");
    setAdminMessage(error?.status === 403 ? "Access denied." : error?.message || "Request failed.");
  }

  React.useEffect(() => {
    const canonicalPath = pagePaths[activePage];
    const isProductEditPath =
      ["admin-products-new", "admin-products-edit"].includes(activePage) &&
      /^\/admin\/products\/[^/]+\/edit$/.test(window.location.pathname);
    const isCustomerDetailPath =
      activePage === "admin-customers-detail" &&
      /^\/admin\/customers\/[^/]+$/.test(window.location.pathname);
    if (
      canonicalPath
      && canonicalPath !== window.location.pathname
      && !isProductEditPath
      && !isCustomerDetailPath
      && !isCustomModulePath(window.location.pathname)
    ) {
      window.history.replaceState({}, "", canonicalPath);
    }
  }, []);

  const refreshCustomModules = React.useCallback(() => {
    if (isAuthResolving || sessionInvalidatingRef.current) return Promise.resolve([]);
    if (!isAdminPortalRole(currentUser?.role) || isPlatformAdmin(currentUser.role) || !company) {
      setCustomModules([]);
      return Promise.resolve([]);
    }
    if (!isCustomModulesCapabilityEnabled(modules)) {
      setCustomModules([]);
      return Promise.resolve([]);
    }
    return fetchCustomModules()
      .then((data) => {
        const rows = Array.isArray(data) ? data : [];
        setCustomModules(rows);
        return rows;
      })
      .catch(() => {
        setCustomModules([]);
        return [];
      });
  }, [company, currentUser, isAuthResolving, modules]);

  React.useEffect(() => {
    void refreshCustomModules();
  }, [refreshCustomModules]);

  React.useEffect(() => {
    function onPopState() {
      setActivePage(resolvePage(window.location.pathname, getCurrentUser()));
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  React.useEffect(() => {
    function onProtectedApiError(event) {
      const status = event.detail?.status;
      if (status !== 401 && status !== 403) return;

      const error = new Error(status === 401 ? "Authentication required." : "Access denied.");
      error.status = status;
      handleApiError(error);
    }

    window.addEventListener(protectedApiErrorEvent, onProtectedApiError);
    return () => window.removeEventListener(protectedApiErrorEvent, onProtectedApiError);
  }, []);

  React.useEffect(() => {
    const nextCompanyId = company?.id || null;
    if (previousCompanyId.current !== nextCompanyId) {
      clearTenantCaches();
      // Phase 2: company switch clears the active site session + that company's hint.
      clearActiveSiteContext();
      clearActiveSiteHint(previousCompanyId.current);
      setSiteContext(null);
      setCompanySites([]);
      setProducts([]);
      setTrashedProducts([]);
      setCategories([]);
      setBrands([]);
      setOrders([]);
      setEmployees([]);
      setEmployeeSessions([]);
      setReviews([]);
      setHomepageOffers([]);
      setHomepageCategoryCards([]);
      setWebsiteMedia([]);
      setWebsiteMediaError("");
      catalogHydratedRef.current = {
        companyId: nextCompanyId,
        products: false,
        trash: false,
        categories: false,
        brands: false,
      };
      contentHydratedRef.current = {
        companyId: nextCompanyId,
        websiteMedia: false,
        adminContent: false,
      };
      previousCompanyId.current = nextCompanyId;
    }
    applyCompanyDocumentBranding(company);
  }, [company]);

  // Phase 2: restore the active site context on tenant session load / company
  // change (after the company's sites are available). Flag-gated; Super Admin
  // is never forced into site context. Never auto-picks a site.
  React.useEffect(() => {
    if (isAuthResolving || sessionInvalidatingRef.current) return;
    if (!company || !currentUser || activePage === "admin-login") return;
    if (isPlatformAdmin(currentUser.role)) return;
    const flags = getLandingPlatformFlags(company);
    if (!(flags.siteContextEnabled || flags.mySitesEnabled || flags.landingPlatformEnabled)) return;

    let cancelled = false;
    fetchSites()
      .then((sites) => {
        if (cancelled) return;
        const safeSites = Array.isArray(sites) ? sites : [];
        setCompanySites(safeSites);
        let siteArchived = false;
        const context = restoreActiveSiteContext({
          companyId: company.id,
          sites: safeSites,
          membership: currentUser?.activeMembership || null,
          modules: Array.isArray(company?.modules)
            ? company.modules.map((module) => module.module_key).filter(Boolean)
            : null,
          domains: Array.isArray(company?.domains) ? company.domains : null,
          onRejected: (error) => {
            siteArchived = error?.code === "SITE_ARCHIVED";
          },
        });
        if (context) {
          setSiteContext(context);
        } else if (siteArchived) {
          // The current site was archived: drop its context and return to My Sites.
          setSiteContext(null);
          navigate("admin-sites", { replace: true });
          syncSiteIdToUrl(null);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setCompanySites([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activePage, company, currentUser, isAuthResolving]);

  // Phase 2: mirror the in-memory session into state so external activations
  // (e.g. Manage Site on My Sites) surface the shell chrome immediately.
  React.useEffect(() => {
    setSiteContext(getActiveSiteContext());
  }, [activePage, company?.id]);

  React.useEffect(() => {
    fetchCurrentUser()
      .then((user) => {
        if (user && !isValidCpanelUser(user)) {
          persistCurrentUser(null);
          setUser(null);
          setCompany(null);
          setAdminLoginMessage("Access denied. An administrator account is required.");
        } else {
          sessionInvalidatingRef.current = false;
          setUser(user);
          setCompany(user?.activeCompany || null);
        }
      })
      .catch((error) => {
        if (sessionInvalidatingRef.current) return;
        sessionInvalidatingRef.current = true;
        persistCurrentUser(null);
        setUser(null);
        setCompany(null);
        if (error?.status === 401) {
          setAdminLoginMessage("Your session expired. Please sign in again.");
        }
      })
      .finally(() => setIsAuthResolving(false));
  }, []);

  React.useEffect(() => {
    if (isAuthResolving || activePage !== "admin-site-editor") return;
    if (!company || !canAccessAdminPage(currentUser, "admin-site-editor")) {
      navigate("admin-no-access", { replace: true });
    }
  }, [activePage, company, currentUser, isAuthResolving]);

  React.useEffect(() => {
    if (currentUser && !isValidCpanelUser(currentUser)) {
      persistCurrentUser(null);
      setUser(null);
      navigate("admin-login", { preserveLoginMessage: true, replace: true });
      return;
    }
    if (!currentUser && activePage !== "admin-login" && activePage !== "velvet-public") {
      setAdminLoginMessage(t("adminLogin.loginRequired"));
      navigate("admin-login", { preserveLoginMessage: true, replace: true });
    } else if (currentUser && activePage === "admin-login") {
      navigate(landingPageForUser(currentUser, modules, company), { replace: true });
    }
  }, [activePage, currentUser, modules, t]);

  React.useEffect(() => {
    if (!company || !currentUser || activePage === "admin-login") return;
    if (currentUser.role === "manager") return;
    if (["company_admin", "admin"].includes(currentUser.role)) return;
    if (isCustomModulePage(activePage)) return;
    if (activePage === "admin-no-access") {
      const recoveryPage = landingPage(currentUser, modules);
      const recoveryAllowedByModule =
        !modules.length ||
        isNavigationPlaceholderPage(recoveryPage) ||
        moduleAllowsPage(modules, recoveryPage);
      const recoveryAllowedByPermission = canAccessAdminPage(currentUser, recoveryPage);
      if (
        recoveryPage !== "admin-no-access" &&
        recoveryAllowedByModule &&
        recoveryAllowedByPermission
      ) {
        navigate(recoveryPage, { replace: true });
        return;
      }
    }
    const allowedByModule =
      !modules.length ||
      isNavigationPlaceholderPage(activePage) ||
      moduleAllowsPage(modules, activePage);
    const allowedByPermission = canAccessAdminPage(currentUser, activePage);
    if (!allowedByModule || !allowedByPermission) {
      const target = "admin-no-access";
      if (target !== activePage) navigate(target, { replace: true });
    }
  }, [activePage, company?.id, currentUser, modules, modules.length]);

  React.useEffect(() => {
    localStorage.setItem("epChemicalLanguage", language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  React.useEffect(() => {
    localStorage.setItem("epChemicalAdminDarkMode", String(isDarkMode));
  }, [isDarkMode]);

  React.useEffect(() => {
      // Wait for /auth/me bootstrap so expired localStorage tokens do not storm protected APIs.
      // Catalog (products/categories/brands) is page-scoped below — do not eager-load on login.
      // Website media + homepage content (reviews/offers/cards) + vlogs are also
      // page-scoped below — do not eager-load on login.
      if (isAuthResolving || sessionInvalidatingRef.current) return;
      if (!isAdminPortalRole(currentUser?.role) || isPlatformAdmin(currentUser.role) || !company)
        return;
      if (
        moduleAllowsPage(modules, "admin-orders") &&
        canAccessAdminPage(currentUser, "admin-orders")
      )
        void refreshOrders(currentUser);
      if (moduleAllowsPage(modules, "admin-staff") && canAccessAdminPage(currentUser, "admin-staff"))
        void refreshEmployees(currentUser);
      // The reviews form has an employee picker for employee reviews, so the
      // same-company employee list must be available on the reviews page too.
      else if (
        moduleAllowsPage(modules, "admin-reviews") &&
        canAccessAdminPage(currentUser, "admin-reviews")
      )
        void refreshEmployees(currentUser);
      if (
        moduleAllowsPage(modules, "admin-reviews") &&
        canAccessAdminPage(currentUser, "admin-reviews")
      )
        void refreshAdminContent(currentUser);
      if (
        moduleAllowsPage(modules, "admin-website-media") &&
        canAccessAdminPage(currentUser, "admin-website-media")
      )
        void refreshWebsiteMedia(currentUser);
      if (
        moduleAllowsPageForUser(currentUser, modules, "admin-vlogs") &&
        canAccessAdminPage(currentUser, "admin-vlogs")
      )
        void refreshVlogs();
    }, [currentUser, company?.id, isAuthResolving, modules]);

  React.useEffect(() => {
    if (isAuthResolving || sessionInvalidatingRef.current) return;
    if (!isAdminPortalRole(currentUser?.role) || isPlatformAdmin(currentUser.role) || !company) return;

    const companyId = company.id;
    if (catalogHydratedRef.current.companyId !== companyId) {
      catalogHydratedRef.current = {
        companyId,
        products: false,
        trash: false,
        categories: false,
        brands: false,
      };
    }

    const needsProducts =
      activePage === "admin" ||
      [
        "admin-product-bundles",
        "admin-products-trash",
        "admin-products-new",
        "admin-products-edit",
        "admin-reviews",
      ].includes(activePage) ||
      salesPageKeys.includes(activePage) ||
      gettingPaidPageKeys.includes(activePage);
    const needsTrash = activePage === "admin-products-trash";
    const needsCategories = [
      "admin-categories",
      "admin-categories-new",
      "admin-products",
      "admin-products-trash",
      "admin-products-new",
      "admin-products-edit",
      "admin-inventory",
    ].includes(activePage);
    const needsBrands = [
      "admin-brands",
      "admin-brands-new",
      "admin-categories",
      "admin-categories-new",
      "admin-products",
      "admin-products-trash",
      "admin-products-new",
      "admin-products-edit",
      "admin-inventory",
    ].includes(activePage);

    if (
      needsProducts &&
      moduleAllowsPage(modules, "admin-products") &&
      canAccessAdminPage(currentUser, "admin-products") &&
      !catalogHydratedRef.current.products
    ) {
      catalogHydratedRef.current.products = true;
      void refreshProducts();
    }
    if (
      needsTrash &&
      moduleAllowsPage(modules, "admin-products") &&
      canAccessAdminPage(currentUser, "admin-products-trash") &&
      !catalogHydratedRef.current.trash
    ) {
      catalogHydratedRef.current.trash = true;
      void refreshTrashedProducts();
    }
    if (
      needsCategories &&
      ((moduleAllowsPage(modules, "admin-categories") &&
        canAccessAdminPage(currentUser, "admin-categories")) ||
        (canReadCatalogFormOptions(currentUser) && moduleAllowsPage(modules, "admin-products"))) &&
      !catalogHydratedRef.current.categories
    ) {
      catalogHydratedRef.current.categories = true;
      void refreshCategories();
    }
    if (
      needsBrands &&
      ((moduleAllowsPage(modules, "admin-brands") &&
        canAccessAdminPage(currentUser, "admin-brands")) ||
        (canReadCatalogFormOptions(currentUser) && moduleAllowsPage(modules, "admin-products"))) &&
      !catalogHydratedRef.current.brands
    ) {
      catalogHydratedRef.current.brands = true;
      void refreshBrands();
    }
  }, [activePage, company?.id, currentUser, isAuthResolving, modules]);

  React.useEffect(() => {
    if (isAuthResolving || sessionInvalidatingRef.current) return;
    if (!isAdminPortalRole(currentUser?.role) || isPlatformAdmin(currentUser.role) || !company) return;
    if (!["admin-vlogs", "admin-vlogs-new"].includes(activePage)) return;
    if (!moduleAllowsPageForUser(currentUser, modules, "admin-vlogs")) return;
    if (!canAccessAdminPage(currentUser, "admin-vlogs")) return;
    void refreshVlogs();
  }, [activePage, company?.id, currentUser, isAuthResolving, modules]);

  React.useEffect(() => {
    // Website media + homepage content (reviews/offers/category cards) are
    // page-scoped — do not eager-load on login. Loaded only when the manager
    // pages that render them are active.
    if (isAuthResolving || sessionInvalidatingRef.current) return;
    if (!isAdminPortalRole(currentUser?.role) || isPlatformAdmin(currentUser.role) || !company) return;

    const companyId = company.id;
    if (contentHydratedRef.current.companyId !== companyId) {
      contentHydratedRef.current = {
        companyId,
        websiteMedia: false,
        adminContent: false,
      };
    }

    const needsWebsiteMedia = ["admin-website-media", "admin-homepage-offers"].includes(activePage);
    const needsAdminContent = ["admin-homepage-offers", "admin-reviews"].includes(activePage);

    if (
      needsWebsiteMedia &&
      moduleAllowsPage(modules, "admin-website-media") &&
      canAccessAdminPage(currentUser, "admin-website-media") &&
      !contentHydratedRef.current.websiteMedia
    ) {
      contentHydratedRef.current.websiteMedia = true;
      void refreshWebsiteMedia();
    }
    if (
      needsAdminContent &&
      ((moduleAllowsPage(modules, "admin-homepage-offers") &&
        canAccessAdminPage(currentUser, "admin-homepage-offers")) ||
        (moduleAllowsPage(modules, "admin-reviews") &&
          canAccessAdminPage(currentUser, "admin-reviews"))) &&
      !contentHydratedRef.current.adminContent
    ) {
      contentHydratedRef.current.adminContent = true;
      void refreshAdminContent();
    }
  }, [activePage, company?.id, currentUser, isAuthResolving, modules]);

  async function refreshProducts() {
    try {
      const next = await fetchProducts();
      setProducts(next);
      return next;
    } catch (error) {
      setProducts([]);
      handleApiError(error);
      return [];
    }
  }

  async function refreshTrashedProducts() {
    try {
      const next = await fetchTrashedProducts();
      setTrashedProducts(Array.isArray(next) ? next : []);
      return next;
    } catch (error) {
      setTrashedProducts([]);
      handleApiError(error);
      return [];
    }
  }

  async function refreshCategories() {
    try {
      const next = await fetchCategories();
      setCategories(next);
      return next;
    } catch (error) {
      setCategories([]);
      handleApiError(error);
      return [];
    }
  }

  async function refreshBrands() {
    try {
      const next = await fetchBrands({ view: "list" });
      setBrands(next);
      return next;
    } catch (error) {
      setBrands([]);
      handleApiError(error);
      return [];
    }
  }

  async function refreshOrders(user = currentUser) {
    if (!user) return [];
    try {
      const next = await getOrders(user);
      setOrders(next);
      return next;
    } catch (error) {
      setOrders([]);
      handleApiError(error);
      return [];
    }
  }

  async function refreshEmployees(user = currentUser) {
    if (!isCompanyAdmin(user?.role)) {
      setEmployees([]);
      setEmployeeSessions([]);
      return [];
    }
    try {
      const [nextEmployees, sessions] = await Promise.all([
        fetchEmployees(),
        fetchEmployeeWorkSessions(),
      ]);
      setEmployees(nextEmployees);
      setEmployeeSessions(sessions);
      return nextEmployees;
    } catch (error) {
      setEmployees([]);
      setEmployeeSessions([]);
      handleApiError(error);
      return [];
    }
  }

  async function refreshAdminContent(user = currentUser) {
    if (!isCompanyAdmin(user?.role)) return;
    try {
      const [nextReviews, offers, cards] = await Promise.all([
        fetchAllReviews(),
        fetchAllHomepageOffers(),
        fetchAllHomepageCategoryCards(),
      ]);
      setReviews(nextReviews);
      setHomepageOffers(offers);
      setHomepageCategoryCards(cards);
    } catch (error) {
      setReviews([]);
      setHomepageOffers([]);
      setHomepageCategoryCards([]);
      handleApiError(error);
    }
  }

  async function refreshWebsiteMedia(user = currentUser) {
    if (!hasPermission(user, "website_media.manage")) return;
    try {
      clearWebsiteMediaCache();
      const nextMedia = await fetchAllWebsiteMedia();
      setWebsiteMedia(nextMedia);
      setWebsiteMediaError("");
    } catch (error) {
      setWebsiteMedia([]);
      setWebsiteMediaError(error?.message || "Unable to load website media.");
      handleApiError(error);
    }
  }

  async function refreshVlogs() {
    try {
      const payload = await fetchVlogs();
      setVlogs(Array.isArray(payload?.items) ? payload.items : []);
      setVlogHero(payload?.hero || { title: { en: "", ar: "" }, imageUrl: "", videoUrl: "", posterUrl: "" });
      return payload;
    } catch (error) {
      setVlogs([]);
      setVlogHero({ title: { en: "", ar: "" }, imageUrl: "", videoUrl: "", posterUrl: "" });
      handleApiError(error);
      return { items: [], hero: null };
    }
  }

  async function handleSaveVlog(vlog) {
    const isUpdate = Boolean(vlog.id);
    try {
      const saved = isUpdate ? await updateVlog(vlog) : await createVlog(vlog);
      await refreshVlogs();
      setAdminMessageType("success");
      setAdminMessage(isUpdate ? "Vlog updated." : "Vlog created.");
      return saved;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }

  async function handleDeleteVlog(vlogId) {
    if (!window.confirm(t("admin.deleteConfirm"))) return;
    try {
      await deleteVlog(vlogId);
      await refreshVlogs();
      setAdminMessageType("success");
      setAdminMessage("Vlog deleted.");
    } catch (error) {
      handleApiError(error);
    }
  }

  async function handleSaveVlogHero(hero) {
    try {
      const saved = await saveVlogHero(hero);
      setVlogHero(saved);
      setAdminMessageType("success");
      setAdminMessage("Vlog hero saved.");
      return saved;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }

  async function handleAdminLogin(credentials) {
    try {
      const session = await loginUser(credentials.email, credentials.password);
      if (!isValidCpanelUser(session.user)) {
        await logoutUser().catch(() => null);
        persistCurrentUser(null);
        setUser(null);
        setAdminLoginMessage("Access denied. An administrator account is required.");
        return;
      }
      sessionInvalidatingRef.current = false;
      setUser(session.user);
      setCompany(session.activeCompany || null);
      navigate(landingPageForUser(session.user, session.activeCompany?.modules, session.activeCompany), {
        user: session.user,
        modules: session.activeCompany?.modules || [],
      });
    } catch (error) {
      setAdminLoginMessage(error.message || t("auth.loginFailed"));
    }
  }

  async function handleLogout() {
    await logoutUser().catch(() => persistCurrentUser(null));
    sessionInvalidatingRef.current = false;
    setUser(null);
    setCompany(null);
    clearTenantCaches();
    clearActiveSiteContext();
    clearActiveSiteHint();
    setSiteContext(null);
    setCompanySites([]);
    setProducts([]);
    setTrashedProducts([]);
    setCategories([]);
    setBrands([]);
    setOrders([]);
    setEmployees([]);
    setEmployeeSessions([]);
    setReviews([]);
    setHomepageOffers([]);
    setHomepageCategoryCards([]);
    setWebsiteMedia([]);
    setWebsiteMediaError("");
    navigate("admin-login", { role: null });
  }

  async function handleSwitchCompany(companyId) {
    try {
      return await performSecureCompanySwitch(companyId, {
        enterScope: enterCompanyScope,
        onSession: (user, activeCompany) => {
          setUser(user);
          setCompany(activeCompany);
        },
        navigate,
      });
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }

  async function handleReturnToPlatform() {
    try {
      const user = await exitCompanyScope();
      setUser(user);
      setCompany(null);
      clearActiveSiteContext();
      clearActiveSiteHint();
      setSiteContext(null);
      setCompanySites([]);
      navigate("admin-platform-companies", { role: user.globalRole || user.role, replace: true });
    } catch (error) {
      setAdminMessage(error.message || "Unable to return to the platform.");
    }
  }

  /**
   * Phase 2: switch the active site from the shell switcher. Explicit siteId
   * only — never auto-picks. Syncs the URL and keeps the current page.
   */
  function handleSwitchSite(siteId) {
    if (!company?.id || !siteId) return;
    try {
      const context = activateSiteContext({
        companyId: company.id,
        siteId,
        sites: companySites,
        membership: currentUser?.activeMembership || null,
        modules: Array.isArray(company?.modules)
          ? company.modules.map((module) => module.module_key).filter(Boolean)
          : null,
        domains: Array.isArray(company?.domains) ? company.domains : null,
      });
      syncSiteIdToUrl(context.siteId);
      setSiteContext(context);
    } catch (error) {
      // Fail safe — never invent a site.
      clearActiveSiteContext();
      clearActiveSiteHint(company.id);
      setSiteContext(null);
    }
  }

  function handleBackToMySites() {
    navigate("admin-sites");
  }

  /**
   * Archive / Restore from My Sites: keep the shell site list in sync and drop
   * the current site context when that site was archived.
   */
  function handleSiteStatusChanged(updatedSite) {
    if (!updatedSite?.id) return;
    setCompanySites((current) =>
      current.map((site) => (site.id === updatedSite.id ? { ...site, ...updatedSite } : site)),
    );
    if (!isArchivedSite(updatedSite)) return;
    const currentSiteId = getActiveSiteContext()?.siteId || siteContext?.siteId || null;
    if (currentSiteId !== updatedSite.id && readActiveSiteHint()?.siteId !== updatedSite.id) return;
    clearActiveSiteContext();
    clearActiveSiteHint(company?.id);
    syncSiteIdToUrl(null);
    setSiteContext(null);
  }

  async function handleSaveCategory(category) {
    const isCatUpdate = Boolean(category.id);
    if (
      isCatUpdate &&
      !isCompanyAdmin(currentUser?.role) &&
      !hasPermission(currentUser, "categories.update") &&
      !hasPermission(currentUser, "categories.manage")
    ) {
      setAdminMessageType("error");
      setAdminMessage("You do not have permission to update categories.");
      return;
    }
    if (
      !isCatUpdate &&
      !isCompanyAdmin(currentUser?.role) &&
      !hasPermission(currentUser, "categories.create") &&
      !hasPermission(currentUser, "categories.manage")
    ) {
      setAdminMessageType("error");
      setAdminMessage("You do not have permission to create categories.");
      return;
    }
    try {
      const saved = isCatUpdate ? await updateCategory(category) : await createCategory(category);
      await refreshCategories();
      setAdminMessageType("success");
      setAdminMessage(isCatUpdate ? "Category changes saved." : "Category created.");
      return saved;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }

  async function handleDeleteCategory(id) {
    if (
      !isCompanyAdmin(currentUser?.role) &&
      !hasPermission(currentUser, "categories.delete") &&
      !hasPermission(currentUser, "categories.manage")
    ) {
      setAdminMessageType("error");
      setAdminMessage("You do not have permission to delete categories.");
      return;
    }
    if (!window.confirm(t("admin.deleteConfirm"))) return;
    try {
      await deleteCategory(id);
      await refreshCategories();
      setAdminMessageType("success");
      setAdminMessage("Category deleted.");
    } catch (error) {
      handleApiError(error);
    }
  }

  async function handleSaveBrand(brand) {
    const isBrandUpdate = Boolean(brand.id);
    if (
      isBrandUpdate &&
      !isCompanyAdmin(currentUser?.role) &&
      !hasPermission(currentUser, "brands.update") &&
      !hasPermission(currentUser, "brands.manage")
    ) {
      setAdminMessageType("error");
      setAdminMessage("You do not have permission to update brands.");
      return;
    }
    if (
      !isBrandUpdate &&
      !isCompanyAdmin(currentUser?.role) &&
      !hasPermission(currentUser, "brands.create") &&
      !hasPermission(currentUser, "brands.manage")
    ) {
      setAdminMessageType("error");
      setAdminMessage("You do not have permission to create brands.");
      return;
    }
    try {
      const saved = isBrandUpdate ? await updateBrand(brand) : await createBrand(brand);
      await refreshBrands();
      setAdminMessageType("success");
      setAdminMessage(isBrandUpdate ? "Brand changes saved." : "Brand created.");
      return saved;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }

  async function handleDeleteBrand(id) {
    if (
      !isCompanyAdmin(currentUser?.role) &&
      !hasPermission(currentUser, "brands.delete") &&
      !hasPermission(currentUser, "brands.manage")
    ) {
      setAdminMessageType("error");
      setAdminMessage("You do not have permission to delete brands.");
      return;
    }
    if (!window.confirm(t("admin.deleteConfirm"))) return;
    try {
      await deleteBrand(id);
      await refreshBrands();
      setAdminMessageType("success");
      setAdminMessage("Brand deleted.");
    } catch (error) {
      handleApiError(error);
    }
  }

  async function handleSaveCompanySettings(settings) {
    try {
      const updated = await updateCompanySettings(settings);
      setCompany(updated);
      setUser((current) => (current ? { ...current, activeCompany: updated } : current));
      return updated;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }

  async function handleSaveProduct(product) {
    try {
      const saved = products.some((item) => item.id === product.id)
        ? await updateProductApi(product)
        : await createProductApi(product);
      await refreshProducts();
      setAdminMessageType("success");
      setAdminMessage(t("admin.productSaved"));
      return { ok: true, message: t("admin.productSaved"), product: saved };
    } catch (error) {
      handleApiError(error);
      return { ok: false, message: error.message };
    }
  }

  async function handleDeleteProduct(id) {
    if (!window.confirm(t("admin.deleteConfirm"))) return undefined;
    try {
      await deleteProductApi(id);
      await refreshProducts();
      await refreshTrashedProducts();
      setAdminMessageType("success");
      setAdminMessage(t("admin.productDeleted"));
      return { ok: true, message: t("admin.productDeleted") };
    } catch (error) {
      handleApiError(error);
      return { ok: false, message: error.message };
    }
  }

  async function handleRestoreProduct(id) {
    if (!window.confirm(t("admin.restoreConfirm"))) return undefined;
    try {
      await restoreProductApi(id);
      await refreshProducts();
      await refreshTrashedProducts();
      setAdminMessageType("success");
      setAdminMessage(t("admin.productRestored"));
      return { ok: true, message: t("admin.productRestored") };
    } catch (error) {
      handleApiError(error);
      return { ok: false, message: error.message };
    }
  }

  async function handlePermanentlyDeleteProduct(id) {
    if (!window.confirm(t("admin.permanentDeleteConfirm"))) return undefined;
    try {
      await permanentlyDeleteProductApi(id);
      await refreshProducts();
      await refreshTrashedProducts();
      setAdminMessageType("success");
      setAdminMessage(t("admin.productPermanentlyDeleted"));
      return { ok: true, message: t("admin.productPermanentlyDeleted") };
    } catch (error) {
      handleApiError(error);
      return { ok: false, message: error.message };
    }
  }

  async function handleDeactivateProduct(product) {
    if (!product?.id) return undefined;
    if (!window.confirm(t("admin.deactivateConfirm"))) return undefined;
    try {
      await deactivateProductApi(product.id);
      await refreshProducts();
      setAdminMessageType("success");
      setAdminMessage(t("admin.productDeactivated"));
      return { ok: true, message: t("admin.productDeactivated") };
    } catch (error) {
      handleApiError(error);
      return { ok: false, message: error.message };
    }
  }

  async function handleDuplicateProduct(product) {
    if (!product?.id) return undefined;
    if (!window.confirm(t("admin.duplicateConfirm"))) return undefined;
    try {
      await duplicateProductApi(product.id);
      await refreshProducts();
      setAdminMessageType("success");
      setAdminMessage(t("admin.productDuplicated"));
      return { ok: true, message: t("admin.productDuplicated") };
    } catch (error) {
      handleApiError(error);
      return { ok: false, message: error.message };
    }
  }

  async function handleReorderProducts(productIds) {
    if (!Array.isArray(productIds) || !productIds.length || productReorderSaving) return undefined;
    setProductReorderSaving(true);
    const previousProducts = products;
    setProducts((current) => {
      const byId = new Map(current.map((product) => [product.id, product]));
      const reordered = productIds
        .map((id, index) => {
          const product = byId.get(id);
          return product ? { ...product, sortOrder: index } : null;
        })
        .filter(Boolean);
      const reorderedIds = new Set(productIds);
      return [...reordered, ...current.filter((product) => !reorderedIds.has(product.id))];
    });
    try {
      await reorderProductsApi(productIds);
      await refreshProducts();
      setAdminMessageType("success");
      setAdminMessage(t("admin.productReordered"));
      return { ok: true, message: t("admin.productReordered") };
    } catch (error) {
      setProducts(previousProducts);
      await refreshProducts();
      handleApiError(error);
      return { ok: false, message: error.message };
    } finally {
      setProductReorderSaving(false);
    }
  }

  async function handleSaveEmployee(employee) {
    try {
      const exists = employees.some((item) => item.id === employee.id);
      const saved = exists ? await updateEmployeeApi(employee) : await createEmployeeApi(employee);
      await refreshEmployees();
      const message = exists ? t("admin.employeeSaved") : t("employee.employeeCreatedSuccessfully");
      return { ok: true, message, employee: saved };
    } catch (error) {
      handleApiError(error);
      return { ok: false, message: error.message };
    }
  }

  async function handleDeleteEmployee(id) {
    if (!window.confirm(t("admin.deleteEmployeeConfirm"))) return undefined;
    try {
      await deleteEmployeeApi(id);
      await refreshEmployees();
      return { ok: true, message: t("admin.employeeDeleted") };
    } catch (error) {
      handleApiError(error);
      return { ok: false, message: error.message };
    }
  }

  async function handleToggleEmployeeStatus(employee) {
    try {
      await updateEmployeeStatus(employee.id, !employee.isActive);
      await refreshEmployees();
      return { ok: true, message: t("admin.employeeUpdated") };
    } catch (error) {
      handleApiError(error);
      return { ok: false, message: error.message };
    }
  }

  async function handleOrderStatusChange(id, status) {
    try {
      const order = await updateOrderStatus(id, status);
      await refreshOrders();
      return { ok: true, message: t("employee.statusUpdatedSuccessfully"), order };
    } catch (error) {
      handleApiError(error);
      return { ok: false, message: error.message };
    }
  }

  async function handleCreateManualOrder(payload) {
    try {
      const order = await createOrder({
        ...payload,
        createdByEmployeeId: currentUser?.id || "",
        createdByEmployeeName: currentUser?.name || "",
      });
      await refreshOrders();
      setAdminMessageType("success");
      setAdminMessage(language === "ar" ? "تم إنشاء الطلب بنجاح." : "Order created successfully.");
      return { ok: true, order };
    } catch (error) {
      handleApiError(error);
      return { ok: false, message: error.message };
    }
  }

  async function handleAssignEmployee(id, employeeId) {
    if (!employeeId) return undefined;
    try {
      const order = await assignOrderEmployee(id, employeeId);
      await refreshOrders();
      return { ok: true, message: t("admin.orderUpdated"), order };
    } catch (error) {
      handleApiError(error);
      return { ok: false, message: error.message };
    }
  }

  async function handleDeleteOrder(id) {
    if (!window.confirm(t("admin.deleteConfirm"))) return { ok: false, message: "" };
    try {
      await deleteOrder(id);
      await refreshOrders();
      return { ok: true, message: t("employee.orderDeletedSuccessfully") };
    } catch (error) {
      handleApiError(error);
      return { ok: false, message: error.message };
    }
  }

  async function handleSaveOffer(offer) {
    try {
      const saved = await saveHomepageOffer(offer);
      setHomepageOffers(await fetchAllHomepageOffers());
      return saved;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }

  async function handleSaveCategoryCard(card) {
    try {
      const saved = await saveHomepageCategoryCard(card);
      setHomepageCategoryCards(await fetchAllHomepageCategoryCards());
      return saved;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }

  async function handleDeleteOffer(id) {
    try {
      await deleteHomepageOffer(id);
      setHomepageOffers(await fetchAllHomepageOffers());
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }

  async function handleModerateReview(id, status, isActive = true) {
    try {
      const review = await updateReviewStatus(id, status, isActive);
      setReviews(await fetchAllReviews());
      return review;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }

  async function handleDeleteReview(id) {
    try {
      await deleteReviewApi(id);
      setReviews(await fetchAllReviews());
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }

  async function handleSaveWebsiteMedia(item) {
    try {
      const saved = await saveWebsiteMediaApi(item);
      await refreshWebsiteMedia();
      setAdminMessageType("success");
      setAdminMessage(item.id ? "Website media changes saved." : "Website media created.");
      return saved;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }

  async function handleDeleteWebsiteMedia(id) {
    try {
      await deleteWebsiteMediaApi(id);
      await refreshWebsiteMedia();
      setAdminMessageType("success");
      setAdminMessage("Website media deleted.");
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }

  const sharedLayoutProps = {
    company,
    currentUser,
    customModules,
    isDarkMode,
    language,
    modules,
    t,
    navLabelOverrides: (() => {
      const flags = getLandingPlatformFlags(company);
      return flags.mySitesEnabled || flags.landingPlatformEnabled
        ? { "admin-sites": { en: "My Sites", ar: "مواقعي" } }
        : null;
    })(),
    siteContext,
    companySites,
    siteContextEnabled: (() => {
      const flags = getLandingPlatformFlags(company);
      return flags.siteContextEnabled || flags.mySitesEnabled || flags.landingPlatformEnabled;
    })(),
    onBackToMySites: handleBackToMySites,
    onSwitchSite: handleSwitchSite,
    onCompanyUpdated: (updated) => {
      if (!updated) return;
      setCompany(updated);
      setUser((current) => (current ? { ...current, activeCompany: updated } : current));
    },
    onLanguageChange: () => setLanguage((value) => (value === "en" ? "ar" : "en")),
    onLogout: handleLogout,
    onNavigate: navigate,
    onReturnToPlatform: handleReturnToPlatform,
    onSwitchCompany: handleSwitchCompany,
    onToggleDarkMode: () => setIsDarkMode((value) => !value),
  };

  if (activePage === "admin-site-editor") {
    return <SiteEditorPage company={company} currentUser={currentUser} isContextResolving={isAuthResolving} language={language} />;
  }

  const velvetStoreMatch = window.location.pathname.match(/^\/store\/([^/]+)$/);
  if (activePage === "velvet-public" && velvetStoreMatch) {
    return <MerchantStorefrontPage language={language} slug={decodeURIComponent(velvetStoreMatch[1])} />;
  }
  if (activePage === "velvet-public" && window.location.pathname === "/velvet") {
    return <MerchantVelvetDashboardPage language={language} />;
  }

  return (
    <div className={activePage === "admin-login" ? "app-shell admin-login-shell" : "app-shell"}>
      <main className={activePage === "admin-login" ? "admin-login-main" : "admin-panel-main"}>
        {activePage === "admin-login" && (
          <AdminLoginPage
            company={company}
            message={adminLoginMessage}
            onLogin={handleAdminLogin}
            t={t}
          />
        )}

        {activePage === "admin-no-access" && (
          <AdminLayout
            activePage={activePage}
            company={company}
            currentUser={currentUser}
            isDarkMode={isDarkMode}
            language={language}
            modules={modules}
            onLanguageChange={() => setLanguage((value) => (value === "en" ? "ar" : "en"))}
            onLogout={handleLogout}
            onNavigate={navigate}
            onReturnToPlatform={handleReturnToPlatform}
            onSwitchCompany={handleSwitchCompany}
            onToggleDarkMode={() => setIsDarkMode((value) => !value)}
            title="No Access"
            subtitle="You do not have permission to access any admin section."
          >
            <div className="admin-empty-state">
              <strong>No Access</strong>
              <span>
                Your account does not have permission to access any admin section. Contact your
                administrator to request the appropriate permissions.
              </span>
            </div>
          </AdminLayout>
        )}

        {adminPageKeys.includes(activePage) &&
          activePage !== "admin-no-access" &&
          activePage !== "admin-platform-overview" &&
          activePage !== "admin-platform-companies" &&
          activePage !== "admin-platform-domains" &&
          !dropshippingPageKeys.includes(activePage) &&
          !featurePageKeys.includes(activePage) &&
          !salesPageKeys.includes(activePage) &&
          !videoAppsPageKeys.includes(activePage) &&
          !siteMobilePageKeys.includes(activePage) &&
          !marketingPageKeys.includes(activePage) &&
          !gettingPaidPageKeys.includes(activePage) &&
          !analyticsPageKeys.includes(activePage) &&
          activePage !== "admin-reports" &&
          !bookingPageKeys.includes(activePage) &&
          activePage !== "admin-automations" &&
          activePage !== "admin-settings" &&
          !financeSettingsPageKeys.includes(activePage) &&
          !bookingSettingsPageKeys.includes(activePage) &&
          !websiteContentPageKeys.includes(activePage) &&
          !developerToolsPageKeys.includes(activePage) &&
          !placeholderPageKeys.includes(activePage) &&
          !catalogDiscountPageKeys.includes(activePage) &&
          !staffPageKeys.includes(activePage) &&
          activePage !== "admin-inventory" &&
          activePage !== "admin-reviews" &&
          activePage !== "admin-product-settings" &&
          activePage !== "admin-product-bundles" &&
          activePage !== "admin-unit-creator" &&
          !isCustomModulePage(activePage) &&
          activePage !== "admin-delivery" &&
          activePage !== "admin-activity-log" &&
          activePage !== "admin-sites" &&
          !velvetDropshipPageKeys.includes(activePage) &&
          !customerPageKeys.includes(activePage) && (
            <AdminDashboardPage
              activePage={activePage}
              brands={brands}
              categories={categories}
              company={company}
              employees={employees}
              homepageCategoryCards={homepageCategoryCards}
              homepageOffers={homepageOffers}
              onAssignEmployee={handleAssignEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onDeleteBrand={handleDeleteBrand}
              onDeleteCategory={handleDeleteCategory}
              onDeleteOffer={handleDeleteOffer}
              onDeleteOrder={handleDeleteOrder}
              onDeleteProduct={handleDeleteProduct}
              onRestoreProduct={handleRestoreProduct}
              onPermanentlyDeleteProduct={handlePermanentlyDeleteProduct}
              onDeactivateProduct={handleDeactivateProduct}
              onDuplicateProduct={handleDuplicateProduct}
              onReorderProducts={handleReorderProducts}
              onDeleteReview={handleDeleteReview}
              onDeleteWebsiteMedia={handleDeleteWebsiteMedia}
              onModerateReview={handleModerateReview}
              onSaveCategoryCard={handleSaveCategoryCard}
              onSaveBrand={handleSaveBrand}
              onSaveCategory={handleSaveCategory}
              onSaveVlog={handleSaveVlog}
              vlogs={vlogs}
              onSaveCompanySettings={handleSaveCompanySettings}
              onSaveEmployee={handleSaveEmployee}
              onSaveOffer={handleSaveOffer}
              onSaveProduct={handleSaveProduct}
              onSaveWebsiteMedia={handleSaveWebsiteMedia}
              onStatusChange={handleOrderStatusChange}
              orders={orders}
              products={products}
              trashedProducts={trashedProducts}
              reorderSaving={productReorderSaving}
              reviews={reviews}
              statusMessage={adminMessage}
              statusMessageType={adminMessageType}
              t={t}
              websiteMedia={websiteMedia}
              websiteMediaError={websiteMediaError}
              {...sharedLayoutProps}
            />
          )}

        {activePage === "admin-inventory" && (
          <AdminInventoryPage brands={brands} categories={categories} {...sharedLayoutProps} />
        )}

        {activePage === "admin-reviews" && (
          <AdminReviewsPage employees={employees} products={products} {...sharedLayoutProps} />
        )}

        {activePage === "admin-product-settings" && (
          <AdminProductSettingsPage {...sharedLayoutProps} />
        )}

        {activePage === "admin-product-bundles" && (
          <AdminProductBundlesPage products={products} {...sharedLayoutProps} />
        )}

        {activePage === "admin-unit-creator" && (
          <AdminUnitCreatorPage
            onCustomModulesChange={refreshCustomModules}
            {...sharedLayoutProps}
          />
        )}

        {isCustomModulePage(activePage) && (
          <AdminCustomModulePage activePage={activePage} {...sharedLayoutProps} />
        )}

        {activePage === "admin-delivery" && (
          <AdminDeliveryPage {...sharedLayoutProps} />
        )}

        {activePage === "admin-activity-log" && (
          <AdminActivityLogPage {...sharedLayoutProps} />
        )}

        {activePage === "admin-platform-overview" && <AdminPlatformOverview {...sharedLayoutProps} />}
        {activePage === "admin-platform-companies" && <AdminCompaniesPage {...sharedLayoutProps} />}
        {activePage === "admin-platform-domains" && <AdminDomainsPage {...sharedLayoutProps} />}
        {dropshippingPageKeys.includes(activePage) && (
          <AdminDropshippingPage activePage={activePage} {...sharedLayoutProps} />
        )}
        {velvetDropshipPageKeys.includes(activePage) && (
          <AdminVelvetDropshippingPage activePage={activePage} {...sharedLayoutProps} />
        )}
        {featurePageKeys.includes(activePage) && !gettingPaidPageKeys.includes(activePage) && (
          <AdminFeaturePage activePage={activePage} {...sharedLayoutProps} />
        )}
        {salesPageKeys.includes(activePage) && (
          <AdminSalesPage
            activePage={activePage}
            employees={employees}
            onAssignEmployee={handleAssignEmployee}
            onCreateOrder={handleCreateManualOrder}
            onDeleteOrder={handleDeleteOrder}
            onStatusChange={handleOrderStatusChange}
            orders={orders}
            products={products}
            statusMessage={adminMessage}
            statusMessageType={adminMessageType}
            {...sharedLayoutProps}
          />
        )}
        {(catalogPlaceholderPageKeys.includes(activePage) || catalogDiscountPageKeys.includes(activePage)) && (
          <AdminCatalogPage activePage={activePage} {...sharedLayoutProps} />
        )}
        {videoAppsPageKeys.includes(activePage) && (
          <AdminVideoAppsPage
            activePage={activePage}
            onDeleteVlog={handleDeleteVlog}
            onSaveVlogHero={handleSaveVlogHero}
            statusMessage={adminMessage}
            statusMessageType={adminMessageType}
            vlogHero={vlogHero}
            vlogs={vlogs}
            {...sharedLayoutProps}
          />
        )}
        {siteMobilePageKeys.includes(activePage) && (
          <AdminSiteMobilePage activePage={activePage} {...sharedLayoutProps} />
        )}
        {activePage === "admin-sms" && <AdminSmsPage {...sharedLayoutProps} />}
        {activePage === "admin-announcements" && <AdminAnnouncementsPage {...sharedLayoutProps} />}
        {activePage === "admin-splash-ads" && <AdminSplashAdsPage {...sharedLayoutProps} />}
        {activePage === "admin-policies" && <AdminPoliciesPage {...sharedLayoutProps} />}
        {activePage === "admin-legal-information" && <AdminLegalInformationPage {...sharedLayoutProps} />}
        {activePage === "admin-banners" && <AdminBannersPage {...sharedLayoutProps} />}
        {activePage === "admin-security" && <AdminSecurityPage {...sharedLayoutProps} />}
        {marketingPageKeys.includes(activePage) && (
          <AdminMarketingPage activePage={activePage} {...sharedLayoutProps} />
        )}
        {gettingPaidPageKeys.includes(activePage) && (
          <AdminGettingPaidPage activePage={activePage} products={products} {...sharedLayoutProps} />
        )}
        {(analyticsPageKeys.includes(activePage) || activePage === "admin-reports") && (
          <AdminAnalyticsPage
            activePage={activePage}
            {...sharedLayoutProps}
          />
        )}
        {activePage === "admin-bookings-calendar" && (
          <AdminBookingCalendarPage activePage={activePage} employees={employees} {...sharedLayoutProps} />
        )}
        {activePage === "admin-bookings-list" && (
          <AdminBookingListPage activePage={activePage} bookings={null} employees={employees} {...sharedLayoutProps} />
        )}
        {activePage === "admin-bookings-work-schedule" && (
          <AdminWorkSchedulePage activePage={activePage} availability={null} employees={employees} {...sharedLayoutProps} />
        )}
        {activePage === "admin-bookings-analytics" && (
          <AdminBookingsAnalyticsPage activePage={activePage} bookings={null} {...sharedLayoutProps} />
        )}
        {activePage === "admin-automations" && (
          <AdminAutomationsPage activePage={activePage} {...sharedLayoutProps} />
        )}
        {(activePage === "admin-settings" || financeSettingsPageKeys.includes(activePage)) && (
          <AdminSettingsPage activePage={activePage} {...sharedLayoutProps} />
        )}
        {bookingSettingsPageKeys.includes(activePage) && (
          <AdminBookingSettingsPage activePage={activePage} employees={employees} {...sharedLayoutProps} />
        )}
        {websiteContentPageKeys.includes(activePage) && (
          <AdminWebsiteContentPage activePage={activePage} {...sharedLayoutProps} />
        )}
        {activePage === "admin-sites" && (
          <AdminSitesPage {...sharedLayoutProps} onSiteStatusChanged={handleSiteStatusChanged} />
        )}
        {activePage === "admin-developer-site-logs" && (
          <AdminSiteLogsPage activePage={activePage} {...sharedLayoutProps} />
        )}
        {activePage === "admin-developer-advanced-log-tools" && (
          <AdminAdvancedLogToolsPage activePage={activePage} {...sharedLayoutProps} />
        )}
        {activePage === "admin-developer-monitoring" && (
          <AdminMonitoringPage activePage={activePage} {...sharedLayoutProps} />
        )}
        {activePage === "admin-developer-secrets-manager" && (
          <AdminSecretsManagerPage activePage={activePage} {...sharedLayoutProps} />
        )}
        {activePage === "admin-developer-triggered-emails" && (
          <AdminTriggeredEmailsPage activePage={activePage} {...sharedLayoutProps} />
        )}
        {activePage === "admin-customers" && (
          <AdminContactsPage orders={orders} {...sharedLayoutProps} />
        )}
        {activePage === "admin-customers-detail" && (
          <AdminContactDetailPage orders={orders} {...sharedLayoutProps} />
        )}
        {activePage === "admin-inbox" && (
          <AdminInboxPage {...sharedLayoutProps} />
        )}
        {activePage === "admin-forms" && (
          <AdminFormsPage {...sharedLayoutProps} />
        )}
        {activePage === "admin-meetings" && (
          <AdminMeetingsPage {...sharedLayoutProps} />
        )}
        {activePage === "admin-pipelines" && (
          <AdminPipelinesPage {...sharedLayoutProps} />
        )}
        {activePage === "admin-community" && (
          <AdminCommunityPage {...sharedLayoutProps} />
        )}
        {activePage === "admin-loyalty" && (
          <AdminLoyaltyPage {...sharedLayoutProps} />
        )}
        {placeholderPageKeys.includes(activePage) && !["admin-sms", "admin-announcements", "admin-splash-ads", "admin-policies", "admin-legal-information", "admin-banners", "admin-security"].includes(activePage) && !salesPageKeys.includes(activePage) && !catalogPlaceholderPageKeys.includes(activePage) && !catalogDiscountPageKeys.includes(activePage) && !videoAppsPageKeys.includes(activePage) && !siteMobilePageKeys.includes(activePage) && !marketingPageKeys.includes(activePage) && !gettingPaidPageKeys.includes(activePage) && !analyticsPageKeys.includes(activePage) && !bookingPageKeys.includes(activePage) && !customerPageKeys.includes(activePage) && (
          <AdminPlaceholderPage activePage={activePage} {...sharedLayoutProps} />
        )}

        {staffPageKeys.includes(activePage) && (
          <AdminEmployeesPage
            activePage={activePage}
            employees={employees}
            onDeleteEmployee={handleDeleteEmployee}
            onSaveEmployee={handleSaveEmployee}
            onToggleEmployeeStatus={handleToggleEmployeeStatus}
            sessions={employeeSessions}
            statusMessage={adminMessage}
            t={t}
            {...sharedLayoutProps}
          />
        )}
      </main>
    </div>
  );
}

export default CPanelApp;
