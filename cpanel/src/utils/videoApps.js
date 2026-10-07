import { moduleAllowsPage, pageKeyForModule } from "./moduleRegistry.js";
import {
  canAccessAdminPage,
  effectivePlatformRole,
  isPlatformAdmin,
  isTenantOperator,
} from "./roles.js";

export const videoAppsPageKeys = Object.freeze([
  "admin-vlogs",
  "admin-tenant-placeholder-video-live-stream",
  "admin-tenant-placeholder-video-channels",
  "admin-tenant-placeholder-apps-manage",
  "admin-tenant-placeholder-apps-market",
]);

export function isVideoAppsPage(pageKey) {
  return videoAppsPageKeys.includes(pageKey);
}

export function videoAppsDirection(language) {
  return language === "ar" ? "rtl" : "ltr";
}

export function normalizeVlogMediaType(value) {
  const type = String(value || "video").trim().toLowerCase();
  return type === "image" || type === "post" ? "image" : "video";
}

export function vlogPreviewUrl(vlog, resolveUrl = (value) => value) {
  if (!vlog || typeof vlog !== "object") return "";
  const mediaType = normalizeVlogMediaType(vlog.mediaType || vlog.type);
  if (mediaType === "image") {
    return resolveUrl(vlog.imageUrl || vlog.image || "");
  }
  return resolveUrl(vlog.posterUrl || vlog.thumbnail || vlog.imageUrl || vlog.image || "");
}

function hasScopedTenantAccess(currentUser, company) {
  const companyId =
    company?.id || currentUser?.activeCompany?.id || currentUser?.active_company?.id;
  const platformRole = effectivePlatformRole(currentUser);
  return (
    Boolean(companyId) &&
    (isTenantOperator(currentUser?.role) || isPlatformAdmin(platformRole))
  );
}

export function canViewVideoLibrary(currentUser, modules = [], company) {
  if (isPlatformAdmin(effectivePlatformRole(currentUser))) {
    return hasScopedTenantAccess(currentUser, company);
  }
  return moduleAllowsPage(modules, "admin-vlogs") && canAccessAdminPage(currentUser, "admin-vlogs");
}

export function canManageVideoLibrary(currentUser, company) {
  const platformRole = effectivePlatformRole(currentUser);
  return (
    isTenantOperator(currentUser?.role) ||
    (isPlatformAdmin(platformRole) && hasScopedTenantAccess(currentUser, company))
  );
}

export function canViewTenantApps(currentUser, company) {
  return hasScopedTenantAccess(currentUser, company);
}

const companyFeatureDefinitions = Object.freeze([
  {
    id: "store-catalog",
    match: (route) =>
      ["/admin/products", "/admin/categories", "/admin/brands", "/admin/inventory"].includes(route),
    label: { ar: "المتجر والكتالوج", en: "Store & Catalog" },
    description: {
      ar: "إدارة المنتجات والمخزون وتجربة المتجر.",
      en: "Manage products, inventory, and the storefront experience.",
    },
    icon: "store",
    group: "installed",
  },
  {
    id: "bookings",
    match: (route) => /booking|service|appointment/.test(route),
    label: { ar: "الحجوزات", en: "Bookings" },
    description: {
      ar: "إدارة الخدمات والمواعيد المتاحة للعملاء.",
      en: "Manage customer-facing services and appointments.",
    },
    icon: "calendar",
    group: "installed",
  },
  {
    id: "video-library",
    match: (route) => route === "/admin/vlogs",
    label: { ar: "مكتبة الفيديو", en: "Video Library" },
    description: {
      ar: "تنظيم محتوى الفيديو الخاص بالشركة.",
      en: "Organize the company’s video content.",
    },
    icon: "video",
    group: "installed",
  },
  {
    id: "multilingual",
    match: (route) => route === "/admin/website-texts" || /language|translation/.test(route),
    label: { ar: "متعدد اللغات", en: "Multilingual" },
    description: {
      ar: "إدارة المحتوى واللغات التي يراها العملاء.",
      en: "Manage customer-facing content and languages.",
    },
    icon: "languages",
    group: "business",
  },
  {
    id: "analytics",
    match: (route) => route === "/admin/reports" || /analytics/.test(route),
    label: { ar: "التحليلات", en: "Analytics" },
    description: {
      ar: "عرض تقارير أداء الشركة المتاحة.",
      en: "Review available company performance reporting.",
    },
    icon: "analytics",
    group: "business",
  },
  {
    id: "marketing",
    match: (route) => /marketing|campaign|coupon|discount/.test(route),
    label: { ar: "التسويق", en: "Marketing" },
    description: {
      ar: "إدارة أدوات التسويق المفعّلة للشركة.",
      en: "Manage marketing tools enabled for the company.",
    },
    icon: "marketing",
    group: "business",
  },
  {
    id: "forms",
    match: (route) => /form/.test(route),
    label: { ar: "النماذج", en: "Forms" },
    description: {
      ar: "إدارة نماذج العملاء المفعّلة.",
      en: "Manage enabled customer-facing forms.",
    },
    icon: "forms",
    group: "business",
  },
]);

export function enabledCompanyApps(modules = []) {
  const enabledModules = modules.filter(
    (module) => module && module.enabled !== false && module.route,
  );
  return companyFeatureDefinitions.flatMap((definition) => {
    const module = enabledModules.find((item) =>
      definition.match(String(item.route).toLowerCase()),
    );
    if (!module) return [];
    return [
      {
        ...definition,
        configuration: module.configuration || {},
        pageKey: pageKeyForModule(module),
        route: module.route,
        status: "enabled",
      },
    ];
  });
}
