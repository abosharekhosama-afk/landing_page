// Bilingual display labels for technical enum values used by Employee 4 pages.
// IMPORTANT: these labels are display-only. Values sent to the API/database
// always remain the raw uppercase codes (e.g. "ORDER_SHIPPED").

export function makeLabeler(ar) {
  return (map, value, fallback = "—") => {
    if (value == null || value === "") return fallback;
    const entry = map[value];
    if (!entry) return value;
    return ar ? entry.ar : entry.en;
  };
}

export const TRIGGER_LABELS = {
  ORDER_CONFIRMATION: { en: "Order confirmation", ar: "تأكيد الطلب" },
  ORDER_SHIPPED: { en: "Order shipped", ar: "تم شحن الطلب" },
  ORDER_DELIVERED: { en: "Order delivered", ar: "تم تسليم الطلب" },
  OUT_FOR_DELIVERY: { en: "Out for delivery", ar: "قيد التوصيل" },
  NEW_ORDER_TO_MANAGER: { en: "New order (manager)", ar: "طلب جديد للمدير" },
  POS_PURCHASE_CONFIRMATION: { en: "POS purchase confirmation", ar: "تأكيد شراء نقطة البيع" },
  ORDER_CANCELLED: { en: "Order cancelled", ar: "إلغاء الطلب" },
  ABANDONED_CART: { en: "Abandoned cart reminder", ar: "تذكير بسلة مهجورة" },
};

export const SMS_VARIABLE_LABELS = {
  customer_name: { en: "Customer name", ar: "اسم العميل" },
  order_number: { en: "Order number", ar: "رقم الطلب" },
  order_total: { en: "Order total", ar: "إجمالي الطلب" },
  tracking_link: { en: "Tracking link", ar: "رابط التتبع" },
  store_name: { en: "Store name", ar: "اسم المتجر" },
  order_status: { en: "Order status", ar: "حالة الطلب" },
};

export const SMS_STATUS_LABELS = {
  PENDING: { en: "Pending", ar: "قيد الانتظار" },
  SENT: { en: "Sent", ar: "تم الإرسال" },
  FAILED: { en: "Failed", ar: "فشل" },
  DELIVERED: { en: "Delivered", ar: "تم التسليم" },
};

export const ANNOUNCEMENT_ALIGNMENT_LABELS = {
  LEFT: { en: "Left", ar: "يسار" },
  CENTER: { en: "Center", ar: "وسط" },
  RIGHT: { en: "Right", ar: "يمين" },
};

export const ANNOUNCEMENT_PLACEMENT_LABELS = {
  ALL_PAGES: { en: "All pages", ar: "كل الصفحات" },
  HOMEPAGE: { en: "Homepage only", ar: "الصفحة الرئيسية فقط" },
  SELECTED_PAGES: { en: "Selected pages", ar: "صفحات محددة" },
};

export const SPLASH_FREQUENCY_LABELS = {
  EVERY_VISIT: { en: "Every visit", ar: "كل زيارة" },
  ONCE_PER_SESSION: { en: "Once per session", ar: "مرة واحدة لكل جلسة" },
  ONCE_PER_DAY: { en: "Once per day", ar: "مرة واحدة يومياً" },
};

export const POLICY_TYPE_LABELS = {
  SHIPPING: { en: "Shipping policy", ar: "سياسة الشحن" },
  RETURNS: { en: "Returns policy", ar: "سياسة الإرجاع" },
  REFUNDS: { en: "Refunds policy", ar: "سياسة الاسترداد" },
  EXCHANGE: { en: "Exchange policy", ar: "سياسة الاستبدال" },
  CANCELLATION: { en: "Cancellation policy", ar: "سياسة الإلغاء" },
  PRIVACY: { en: "Privacy policy", ar: "سياسة الخصوصية" },
  TERMS: { en: "Terms & conditions", ar: "الشروط والأحكام" },
  WARRANTY: { en: "Warranty policy", ar: "سياسة الضمان" },
  CUSTOM: { en: "Custom policy", ar: "سياسة مخصصة" },
};

export const POLICY_PLACEMENT_LABELS = {
  FOOTER: { en: "Footer", ar: "تذييل الصفحة" },
  CART: { en: "Cart page", ar: "صفحة السلة" },
  CHECKOUT: { en: "Checkout page", ar: "صفحة الدفع" },
  STANDALONE_PAGE: { en: "Standalone page", ar: "صفحة مستقلة" },
};

export const LEGAL_PLACEMENT_LABELS = POLICY_PLACEMENT_LABELS;

export const LOGIN_STATUS_LABELS = {
  SUCCESS: { en: "Successful login", ar: "تسجيل دخول ناجح" },
  FAILURE: { en: "Failed login", ar: "محاولة فاشلة" },
};

export const AUTH_METHOD_LABELS = {
  PASSWORD: { en: "Password", ar: "كلمة المرور" },
  OTP: { en: "One-time code", ar: "رمز لمرة واحدة" },
  SSO: { en: "Single sign-on", ar: "دخول موحد" },
  RECOVERY: { en: "Recovery code", ar: "رمز استرداد" },
};

export const BLOCK_TYPE_LABELS = {
  SINGLE_IP: { en: "Single IP", ar: "عنوان واحد" },
  IP: { en: "Single IP", ar: "عنوان واحد" },
  CIDR: { en: "IP range (CIDR)", ar: "نطاق عناوين (CIDR)" },
  RANGE: { en: "IP range", ar: "نطاق عناوين" },
};

// Joins a list of enum values with friendly labels: "Footer, Checkout"
export function joinLabels(map, values, ar, fallback = "—") {
  if (!Array.isArray(values) || values.length === 0) return fallback;
  const label = makeLabeler(ar);
  return values.map((value) => label(map, value)).join(ar ? "، " : ", ");
}
