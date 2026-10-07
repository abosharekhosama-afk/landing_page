import { canAccessAdminPage } from "./roles.js";
import { moduleAllowsPage } from "./moduleRegistry.js";
import { isDashboardActionAuthorized, resolveDashboardDestination } from "./dashboardHome.js";

export function dashboardInsightsCopy(language = "en") {
  const ar = language === "ar";
  return ar
    ? {
        title: "رؤى التشغيل",
        loading: "جاري تحميل الرؤى…",
        error: "تعذّر تحميل الرؤى.",
        retry: "إعادة المحاولة",
        forbidden: "لا تملك صلاحية عرض هذه الرؤى.",
        products: "المنتجات",
        orders: "الطلبات",
        alerts: "تنبيهات التشغيل",
        salesReport: "ملخص المبيعات المباشرة",
        latestSales: "أحدث المبيعات",
        inventory: "مراقبة المخزون",
        quickActions: "إجراءات سريعة",
        liveVisitors: "زوار متصلون الآن",
        noAlerts: "لا توجد تنبيهات تشغيلية حالياً.",
        noSales: "لا توجد مبيعات بعد.",
        historicalInventoryNote: "لا تتوفر لقطات مخزون تاريخية؛ الأرقام تعكس الحالة الحالية فقط.",
        totalProducts: "إجمالي المنتجات",
        inStock: "متوفر",
        outOfStock: "غير متوفر",
        lowStock: "مخزون منخفض",
        inactive: "غير نشط",
        partiallyUnavailable: "متاح جزئياً",
        period: "الفترة",
        ordersCount: "الطلبات",
        itemsQty: "الكمية",
        subtotal: "المبيعات",
        deliveryFees: "رسوم التوصيل",
        finalTotal: "الإجمالي",
        customer: "العميل",
        city: "المدينة",
        quantity: "الكمية",
        date: "التاريخ",
        open: "فتح",
        viewAllOrders: "كل الطلبات",
        viewInventory: "المخزون",
        viewReports: "التقارير",
        viewAnalytics: "التحليلات",
        unsupportedProfit: "الربح غير متاح — لا توجد بيانات تكلفة موثوقة.",
      }
    : {
        title: "Operational insights",
        loading: "Loading insights…",
        error: "Unable to load insights.",
        retry: "Retry",
        forbidden: "You do not have permission to view these insights.",
        products: "Products",
        orders: "Orders",
        alerts: "Operational alerts",
        salesReport: "Direct sales summary",
        latestSales: "Latest sales",
        inventory: "Inventory monitor",
        quickActions: "Quick actions",
        liveVisitors: "Visitors online now",
        noAlerts: "No operational alerts right now.",
        noSales: "No sales yet.",
        historicalInventoryNote:
          "Historical inventory snapshots are not stored; counts reflect current state only.",
        totalProducts: "Total products",
        inStock: "In stock",
        outOfStock: "Out of stock",
        lowStock: "Low stock",
        inactive: "Inactive",
        partiallyUnavailable: "Partially unavailable",
        period: "Period",
        ordersCount: "Orders",
        itemsQty: "Items qty",
        subtotal: "Sales",
        deliveryFees: "Delivery fees",
        finalTotal: "Final total",
        customer: "Customer",
        city: "City / area",
        quantity: "Qty",
        date: "Date",
        open: "Open",
        viewAllOrders: "All orders",
        viewInventory: "Inventory",
        viewReports: "Reports",
        viewAnalytics: "Analytics",
        unsupportedProfit: "Profit is unavailable — no reliable cost data.",
      };
}

export function buildDashboardQuickActions({ company, currentUser, modules = [] } = {}) {
  const context = { company, currentUser, modules };
  const candidates = [
    {
      action: "addProduct",
      pageKey: "admin-products-new",
      labelEn: "Add product",
      labelAr: "إضافة منتج",
    },
    {
      action: "categories",
      pageKey: "admin-categories",
      labelEn: "Add category",
      labelAr: "إضافة تصنيف",
    },
    { action: "orders", pageKey: "admin-orders", labelEn: "View orders", labelAr: "عرض الطلبات" },
    {
      pageKey: "admin-inventory",
      labelEn: "Inventory",
      labelAr: "المخزون",
      check: (user, mods) =>
        canAccessAdminPage(user, "admin-inventory") && moduleAllowsPage(mods, "admin-inventory"),
    },
    {
      pageKey: "admin-website-media",
      labelEn: "Website media",
      labelAr: "وسائط الموقع",
      check: (user, mods) =>
        canAccessAdminPage(user, "admin-website-media") &&
        moduleAllowsPage(mods, "admin-website-media"),
    },
    {
      pageKey: "admin-website-texts",
      labelEn: "Website texts",
      labelAr: "نصوص الموقع",
      check: (user, mods) =>
        canAccessAdminPage(user, "admin-website-texts") &&
        moduleAllowsPage(mods, "admin-website-texts"),
    },
    {
      pageKey: "admin-analytics-reports",
      labelEn: "Reports",
      labelAr: "التقارير",
      check: (user, mods) =>
        canAccessAdminPage(user, "admin-analytics-reports") &&
        moduleAllowsPage(mods, "admin-analytics-reports"),
    },
  ];

  return candidates
    .filter((item) => {
      if (item.action) return isDashboardActionAuthorized(item.action, context);
      if (item.check) return item.check(currentUser, modules);
      return (
        canAccessAdminPage(currentUser, item.pageKey) && moduleAllowsPage(modules, item.pageKey)
      );
    })
    .map((item) => ({
      pageKey: item.pageKey || resolveDashboardDestination(item.action),
      labelEn: item.labelEn,
      labelAr: item.labelAr,
    }))
    .filter((item) => item.pageKey);
}

export function formatInsightsMoney(value, currency, language = "en") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  if (!currency) return String(amount);
  try {
    return new Intl.NumberFormat(language === "ar" ? "ar" : "en", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function orderBucketLabel(key, language = "en") {
  const ar = language === "ar";
  const map = ar
    ? {
        new: "طلبات جديدة",
        confirmed: "مؤكدة",
        out_for_delivery: "قيد التوصيل",
        delivered: "تم التسليم",
        returned: "مرتجعة",
        cancelled: "ملغاة",
        other: "أخرى",
        unknown: "غير معروف",
      }
    : {
        new: "New",
        confirmed: "Confirmed",
        out_for_delivery: "Out for delivery",
        delivered: "Delivered",
        returned: "Returned",
        cancelled: "Cancelled",
        other: "Other",
        unknown: "Unknown",
      };
  return map[key] || key;
}

export function salesPeriodLabel(key, language = "en") {
  const ar = language === "ar";
  const map = ar
    ? {
        today: "اليوم",
        yesterday: "أمس",
        last_7_days: "آخر 7 أيام",
        last_30_days: "آخر 30 يوماً",
        current_month: "الشهر الحالي",
        previous_month: "الشهر السابق",
      }
    : {
        today: "Today",
        yesterday: "Yesterday",
        last_7_days: "Last 7 days",
        last_30_days: "Last 30 days",
        current_month: "Current month",
        previous_month: "Previous month",
      };
  return map[key] || key;
}
