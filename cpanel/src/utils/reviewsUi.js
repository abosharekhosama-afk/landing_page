export function reviewComment(review, language = "en") {
  const comment = review?.comment;
  if (!comment) return "";
  if (typeof comment === "string") return comment;
  return String(comment[language] || comment.en || comment.ar || "").trim();
}

export function reviewProductLabel(review, products = [], language = "en") {
  const named = String(review?.productName || review?.relatedProductName || "").trim();
  if (named) return named;
  const productId = String(review?.productId || "").trim();
  if (!productId) return "";
  const product = products.find((item) => String(item.id) === productId);
  if (!product) return productId;
  const name = product.name;
  if (name && typeof name === "object") return name[language] || name.en || name.ar || productId;
  return String(name || productId);
}

// Option label for the review product picker: localized product name with the
// id as a stable suffix so admins can tell same-named products apart.
export function productOptionLabel(product, language = "en") {
  const name = product?.name;
  const label =
    name && typeof name === "object"
      ? String(name[language] || name.en || name.ar || "")
      : String(name || "");
  const trimmed = label.trim();
  return trimmed ? `${trimmed} (${product.id})` : String(product?.id || "");
}

// Option label for the review employee picker: employee name with the id as
// a stable suffix so admins can tell same-named employees apart.
export function employeeOptionLabel(employee) {
  const name = String(employee?.name || "").trim();
  return name ? `${name} (${employee.id})` : String(employee?.id || "");
}

// Default state for the review create/edit form: a product review requires a
// productId and an employee review requires an employeeId, both picked from
// this company; other types start without any association.
export function emptyReviewForm() {
  return {
    customerName: "",
    rating: "5",
    type: "website",
    productId: "",
    employeeId: "",
    employeeName: "",
    commentEn: "",
    commentAr: "",
  };
}

// Map a stored review onto the edit form. Stored types are preserved as-is
// (including "order" reviews, which are created from completed orders, and
// "employee" reviews with their linked employee) so editing never silently
// remaps them to another type.
export function reviewFormFromReview(review, language) {
  const comment = review?.comment;
  const en = typeof comment === "object" ? comment?.en || "" : language === "en" ? String(comment || "") : "";
  const ar = typeof comment === "object" ? comment?.ar || "" : language === "ar" ? String(comment || "") : "";
  const rawType = String(review?.type || "website").toLowerCase();
  const type = ["product", "order", "employee", "store", "site", "website"].includes(rawType)
    ? rawType
    : "website";
  return {
    customerName: review?.customerName || "",
    rating: String(review?.rating || 5),
    type,
    productId: type === "product" ? String(review?.productId || "") : "",
    employeeId: type === "employee" ? String(review?.employeeId || "") : "",
    employeeName: type === "employee" ? String(review?.employeeName || "") : "",
    commentEn: en,
    commentAr: ar,
  };
}

// Build the create/edit payload from form state. productId is sent only for
// product reviews and employeeId/employeeName only for employee reviews;
// every other type sends explicit empty values so a stale association never
// survives a type switch (the edit endpoint merges the submitted body).
export function reviewSavePayload(form, reviewId = "") {
  const rawType = String(form.type || "website").toLowerCase();
  const type = ["product", "order", "employee", "store", "site", "website"].includes(rawType)
    ? rawType
    : "website";
  const isProductType = type === "product";
  const isEmployeeType = type === "employee";
  return {
    ...(reviewId ? { id: reviewId } : {}),
    customerName: String(form.customerName || "").trim(),
    rating: Number(form.rating || 5),
    type,
    productId: isProductType ? String(form.productId || "").trim() : "",
    employeeId: isEmployeeType ? String(form.employeeId || "").trim() : "",
    employeeName: isEmployeeType ? String(form.employeeName || "").trim() : "",
    comment: { en: String(form.commentEn || "").trim(), ar: String(form.commentAr || "").trim() },
    status: "approved",
  };
}

export function reviewStatusOf(review) {
  if (review?.status) return String(review.status).toLowerCase();
  if (review?.isApproved === false) return "rejected";
  if (review?.isActive === false) return "hidden";
  return "approved";
}

// True when the review is currently featured on the storefront homepage.
export function reviewFeaturedOf(review) {
  return review?.featured === true;
}

// Only approved reviews can be featured (the backend enforces this too).
export function canFeatureReview(review) {
  return reviewStatusOf(review) === "approved";
}

export function filterReviews(rows, { query = "", status = "all", type = "all", rating = "all" } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const needle = String(query || "").trim().toLowerCase();
  const statusFilter = String(status || "all").toLowerCase();
  const typeFilter = String(type || "all").toLowerCase();
  const ratingFilter = String(rating || "all");
  return list.filter((review) => {
    if (statusFilter !== "all" && reviewStatusOf(review) !== statusFilter) return false;
    if (typeFilter !== "all" && String(review?.type || "").toLowerCase() !== typeFilter) return false;
    if (ratingFilter !== "all" && String(review?.rating || "") !== ratingFilter) return false;
    if (!needle) return true;
    const haystack = [
      review?.customerName,
      reviewComment(review, "en"),
      reviewComment(review, "ar"),
      review?.productName,
      review?.relatedProductName,
      review?.employeeName,
      review?.id,
    ].join(" ").toLowerCase();
    return haystack.includes(needle);
  });
}

// Review types shown on the public storefront homepage. Product, employee,
// and order reviews must never appear there.
export const HOMEPAGE_REVIEW_TYPES = ["website", "store", "site"];

// True only for real homepage review types. The check is explicit on
// `type` — a missing `employeeId` never implies a store review (product
// reviews carry an empty employeeId and must stay excluded).
export function isHomepageStoreReview(review) {
  return HOMEPAGE_REVIEW_TYPES.includes(String(review?.type || "").toLowerCase());
}

// Keep only homepage-eligible reviews from a loaded list. Array-safe:
// non-arrays yield [] (honest empty, never fakes).
export function filterHomepageStoreReviews(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.filter((review) => isHomepageStoreReview(review));
}

// Summary derived only from the real filtered list: { count, average }.
// Average is a number rounded to 2 decimals; 0 when empty (the caller
// hides the section on empty instead of printing a fake rating).
export function homepageReviewsSummary(rows) {
  const list = filterHomepageStoreReviews(rows);
  const count = list.length;
  if (!count) return { count: 0, average: 0 };
  const total = list.reduce((sum, review) => sum + Number(review?.rating || 0), 0);
  return { count, average: Math.round((total / count) * 100) / 100 };
}

// Rating summary for one storefront product-listing card, derived ONLY from
// that product's real approved reviews (GET /reviews/product/:productId).
// Array-safe: non-arrays yield { count: 0, average: 0 } (honest empty).
// Average is a number rounded to 2 decimals; 0 when empty (the caller
// renders the honest "no reviews" state instead of a fake rating).
export function productListingReviewsSummary(reviews) {
  const list = Array.isArray(reviews) ? reviews : [];
  const count = list.length;
  if (!count) return { count: 0, average: 0 };
  const total = list.reduce((sum, review) => sum + Number(review?.rating || 0), 0);
  return { count, average: Math.round((total / count) * 100) / 100 };
}

// Filled-star count for a product-listing card. Zero reviews yields 0 so the
// card never renders stars that imply a rating it does not have.
export function productListingStarsFilled(average, count) {
  if (!Number(count)) return 0;
  return Math.max(0, Math.min(5, Math.round(Number(average || 0))));
}

// Honest rating line for a product-listing card in both storefront languages.
// Zero reviews yields an explicit empty-state string — never a fake "5".
export function formatProductListingRating(count, average, language) {
  if (!Number(count)) return language === "ar" ? "لا توجد تقييمات بعد" : "No reviews yet";
  const avg = (Math.round(Number(average || 0) * 10) / 10).toFixed(1);
  if (language === "ar") {
    if (Number(count) === 1) return `${avg} ★ | تقييم واحد`;
    if (Number(count) === 2) return `${avg} ★ | تقييمان`;
    return `${avg} ★ | ${count} تقييم`;
  }
  return `${avg} ★ | ${count} ${Number(count) === 1 ? "review" : "reviews"}`;
}

export const REVIEW_COPY = {
  en: {
    title: "Reviews",
    subtitle: "Moderate real tenant reviews from the existing reviews API.",
    search: "Search reviewer, comment, or product",
    status: "Status",
    type: "Type",
    rating: "Rating",
    reviewer: "Reviewer",
    review: "Review",
    product: "Product",
    created: "Created",
    actions: "Actions",
    all: "All",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    hidden: "Hidden",
    website: "Website",
    store: "Store",
    site: "Site",
    productType: "Product",
    order: "Order",
    employee: "Employee",
    loading: "Loading reviews…",
    loadFailed: "Reviews could not be loaded",
    retry: "Retry",
    empty: "No reviews yet",
    emptyText: "Customer and staff reviews will appear here when they exist for this company.",
    noMatches: "No reviews match these filters.",
    clear: "Clear filters",
    forbidden: "You do not have permission to view reviews.",
    readOnly: "View only — you do not have permission to moderate reviews.",
    notFound: "Review not found.",
    detail: "Review details",
    close: "Close",
    approve: "Approve",
    reject: "Reject",
    hide: "Hide",
    pendingAction: "Mark pending",
    feature: "Feature",
    unfeature: "Unfeature",
    featured: "Featured",
    featuredNotice: "Review featured status updated.",
    delete: "Delete",
    edit: "Edit",
    save: "Save",
    create: "Add review",
    reply: "Reply",
    createTitle: "Add review",
    customerName: "Reviewer name",
    productPicker: "Product",
    selectProduct: "Select a product…",
    noProducts: "No products available for this company",
    productRequired: "Select a product for this product review.",
    employeePicker: "Employee",
    selectEmployee: "Select an employee…",
    noEmployees: "No employees available for this company",
    employeeRequired: "Select an employee for this employee review.",
    commentEn: "Comment (English)",
    commentAr: "Comment (Arabic)",
    cancel: "Cancel",
    confirmDelete: "Delete this review? This cannot be undone.",
    confirmDeleteAction: "Delete review",
    replyUnsupported: "Replying to reviewers is not connected. No review-reply API exists.",
    stars: (value) => `${value} stars`,
    createdNotice: "Review saved.",
    moderatedNotice: "Review status updated.",
    deletedNotice: "Review deleted.",
    requestFailed: "Request failed.",
  },
  ar: {
    title: "المراجعات",
    subtitle: "راجع تقييمات المستأجر الحقيقية من واجهة المراجعات الحالية.",
    search: "ابحث بالمراجع أو التعليق أو المنتج",
    status: "الحالة",
    type: "النوع",
    rating: "التقييم",
    reviewer: "المراجع",
    review: "المراجعة",
    product: "المنتج",
    created: "تاريخ الإنشاء",
    actions: "الإجراءات",
    all: "الكل",
    pending: "قيد المراجعة",
    approved: "مقبولة",
    rejected: "مرفوضة",
    hidden: "مخفية",
    website: "الموقع",
    store: "المتجر",
    site: "الموقع",
    productType: "منتج",
    order: "طلب",
    employee: "موظف",
    loading: "جارٍ تحميل المراجعات…",
    loadFailed: "تعذر تحميل المراجعات",
    retry: "إعادة المحاولة",
    empty: "لا توجد مراجعات بعد",
    emptyText: "ستظهر هنا مراجعات العملاء والموظفين عند توفرها لهذه الشركة.",
    noMatches: "لا توجد مراجعات مطابقة لعوامل التصفية.",
    clear: "مسح عوامل التصفية",
    forbidden: "ليست لديك صلاحية عرض المراجعات.",
    readOnly: "وضع العرض فقط — ليست لديك صلاحية إدارة المراجعات.",
    notFound: "المراجعة غير موجودة.",
    detail: "تفاصيل المراجعة",
    close: "إغلاق",
    approve: "قبول",
    reject: "رفض",
    hide: "إخفاء",
    pendingAction: "تعيين كقيد المراجعة",
    feature: "تمييز",
    unfeature: "إلغاء التمييز",
    featured: "مميزة",
    featuredNotice: "تم تحديث حالة تمييز المراجعة.",
    delete: "حذف",
    edit: "تعديل",
    save: "حفظ",
    create: "إضافة مراجعة",
    reply: "رد",
    createTitle: "إضافة مراجعة",
    customerName: "اسم المراجع",
    productPicker: "المنتج",
    selectProduct: "اختر منتجًا…",
    noProducts: "لا توجد منتجات متاحة لهذه الشركة",
    productRequired: "اختر منتجًا لهذه المراجعة.",
    employeePicker: "الموظف",
    selectEmployee: "اختر موظفًا…",
    noEmployees: "لا يوجد موظفون متاحون لهذه الشركة",
    employeeRequired: "اختر موظفًا لهذه المراجعة.",
    commentEn: "التعليق (الإنجليزية)",
    commentAr: "التعليق (العربية)",
    cancel: "إلغاء",
    confirmDelete: "حذف هذه المراجعة؟ لا يمكن التراجع عن هذا الإجراء.",
    confirmDeleteAction: "حذف المراجعة",
    replyUnsupported: "الرد على المراجعين غير متصل. لا توجد واجهة رد.",
    stars: (value) => `${value} نجوم`,
    createdNotice: "تم حفظ المراجعة.",
    moderatedNotice: "تم تحديث حالة المراجعة.",
    deletedNotice: "تم حذف المراجعة.",
    requestFailed: "تعذر إكمال الطلب.",
  },
};

export function reviewCopy(language) {
  return REVIEW_COPY[language] || REVIEW_COPY.en;
}

export function reviewStatusLabel(language, status) {
  const copy = reviewCopy(language);
  return copy[reviewStatusOf({ status })] || status || copy.pending;
}

export function reviewTypeLabel(language, type) {
  const copy = reviewCopy(language);
  const key = String(type || "website").toLowerCase();
  if (key === "product") return copy.productType;
  return copy[key] || type || copy.website;
}

export function formatReviewDate(value, language) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString(language === "ar" ? "ar" : "en");
}
