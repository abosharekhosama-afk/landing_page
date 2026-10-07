import React from "react";
import StatusBadge from "../components/StatusBadge.jsx";

function formatPrice(value, t) {
  return `${Number(value || 0).toLocaleString()} ${t("common.ils")}`;
}

function getLocalized(value, language, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  return value[language] || value.en || value.ar || fallback;
}

function AccountPage({ currentUser, language, onLogout, onNavigate, onSubmitReview, orders, products, t }) {
  const [activeTab, setActiveTab] = React.useState("orders");
  const [reviewForm, setReviewForm] = React.useState({
    type: "store",
    rating: 5,
    comment: "",
    orderId: "",
  });
  const [reviewMessage, setReviewMessage] = React.useState("");
  const isArabic = language === "ar";

  const copy = {
    orderHistory: isArabic ? "سجل الطلبات" : "Order History",
    personalInfo: isArabic ? "المعلومات الشخصية" : "Personal Information",
    viewedProducts: isArabic ? "المنتجات المعروضة" : "Recently Viewed",
    subscriptions: isArabic ? "الاشتراكات" : "Manage Subscriptions",
    logout: isArabic ? "تسجيل الخروج" : "Logout",
    noOrders: isArabic ? "لم تقم بإنشاء أي طلبات بعد." : "You haven't placed any orders yet.",
    startShopping: isArabic ? "ابدأ التسوق" : "Start shopping",
    accountTitle: isArabic ? "حسابي" : "My Account",
    pointsTitle: isArabic ? "نقاطك" : "Your Points",
    pointsText: isArabic ? "استخدم 100 نقطة للحصول على خصم" : "Spend 100 points for a discount",
    availablePoints: isArabic ? "النقاط المتاحة" : "Available points",
    totalEarned: isArabic ? "إجمالي النقاط المكتسبة" : "Total earned",
    totalRedeemed: isArabic ? "إجمالي النقاط المستخدمة" : "Total redeemed",
    orderPoints: isArabic ? "النقاط المكتسبة من هذا الطلب" : "Points earned from this order",
    redeem: isArabic ? "استبدال النقاط" : "Redeem points",
    howRedeem: isArabic ? "كيف أستخدمها" : "How to redeem",
    addressTitle: isArabic ? "العنوان الافتراضي" : "Default Address",
    addressFallback: isArabic ? "لم يتم إضافة عنوان بعد" : "No address added yet",
    addAddress: isArabic ? "إضافة عنوان جديد" : "Add a new address",
    edit: isArabic ? "تعديل" : "Edit",
    delete: isArabic ? "حذف" : "Delete",
    name: isArabic ? "الاسم" : "Name",
    email: isArabic ? "البريد الإلكتروني" : "Email",
    phone: isArabic ? "رقم الجوال" : "Phone",
    role: isArabic ? "نوع الحساب" : "Account type",
    currentSubscriptions: isArabic ? "الاشتراكات الحالية" : "Current Subscriptions",
    noSubscriptions: isArabic ? "لا توجد اشتراكات نشطة حاليًا." : "No active subscriptions yet.",
    discover: isArabic ? "اكتشف منتجات EB Chemical المختارة لك" : "Discover selected EB Chemical products",
    addToCart: t("common.add"),
    reviews: isArabic ? "التقييمات" : "Reviews",
    writeReview: isArabic ? "اكتب تقييماً" : "Write a review",
    reviewType: isArabic ? "نوع التقييم" : "Review type",
    storeReview: isArabic ? "تقييم عام" : "Store Review",
    employeeReview: isArabic ? "تقييم الموظف" : "Employee Review",
    rating: isArabic ? "التقييم" : "Rating",
    reviewComment: isArabic ? "نص التقييم" : "Review text",
    relatedOrder: isArabic ? "الطلب المرتبط" : "Related order",
    submitReview: isArabic ? "إرسال التقييم" : "Submit review",
    reviewSaved: isArabic ? "تم حفظ التقييم بنجاح" : "Review saved successfully",
  };

  if (!currentUser) {
    return (
      <section className="page-shell">
        <div className="empty-panel">
          <h1>{t("auth.myAccount")}</h1>
          <p>{t("auth.loginRequired")}</p>
          <button className="primary-action" onClick={() => onNavigate("login")}>
            {t("auth.login")}
          </button>
        </div>
      </section>
    );
  }

  const customerOrders = orders.filter(
    (order) => order.customerUserId === currentUser.id || order.customer_user_id === currentUser.id
  );
  const reviewableOrders = customerOrders.filter((order) => order.status === "Completed");
  const availablePoints = Math.max(0, Number(currentUser.ebPoints || 0));
  const totalPointsEarned = Math.max(0, Number(currentUser.totalPointsEarned || 0));
  const totalPointsRedeemed = Math.max(0, Number(currentUser.totalPointsRedeemed || 0));

  const featuredProducts = products.slice(0, 4);
  const promoProduct = products[0];
  const pointsProduct = products[1] || products[0];

  function renderOrderHistory() {
    return (
      <section className="account-main-card account-orders-view">
        {customerOrders.length === 0 ? (
          <div className="account-empty-orders">
            <h2>{copy.noOrders}</h2>
            <button className="primary-action" onClick={() => onNavigate("products")} type="button">
              {copy.startShopping}
            </button>
          </div>
        ) : (
          <div className="customer-order-list account-order-list-modern">
            {customerOrders.map((order) => (
              <article className="customer-order-card" key={order.id}>
                <div>
                  <strong>{order.id}</strong>
                  <span>{new Date(order.createdAt || order.created_at).toLocaleDateString()}</span>
                </div>
                <StatusBadge status={order.status} t={t} />
                <p>
                  {(order.items || [])
                    .map((item) => {
                      const product = products.find((entry) => entry.id === item.productId || entry.id === item.product_id);
                      return `${getLocalized(product?.name, language, item.productName || item.slug)} ${item.size || item.selectedSize || ""} x${item.quantity}`;
                    })
                    .join(", ")}
                </p>
                <strong>{formatPrice(order.total, t)}</strong>
                <small className="account-order-points">
                  {copy.orderPoints}: {Math.max(0, Number(order.pointsEarned || 0))}
                </small>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  function updateReviewField(event) {
    const { name, value } = event.target;
    setReviewForm((currentForm) => ({
      ...currentForm,
      [name]: name === "rating" ? Number(value) : value,
    }));
  }

  async function submitReview(event) {
    event.preventDefault();
    if (!reviewableOrders.length) return;
    const selectedOrder =
      reviewableOrders.find((order) => order.id === reviewForm.orderId) || reviewableOrders[0];
    await onSubmitReview?.({
      type: reviewForm.type,
      rating: reviewForm.rating,
      customerName: currentUser.name,
      comment: {
        en: reviewForm.comment,
        ar: reviewForm.comment,
      },
      orderId: selectedOrder.id,
      employeeId:
        reviewForm.type === "employee"
          ? selectedOrder.handledByEmployeeId || selectedOrder.assignedToEmployeeId || ""
          : "",
      employeeName:
        reviewForm.type === "employee"
          ? selectedOrder.createdByEmployeeName || selectedOrder.createdBy?.name || ""
          : "",
      isActive: true,
    });
    setReviewMessage(copy.reviewSaved);
    setReviewForm({ type: "store", rating: 5, comment: "", orderId: "" });
  }

  function renderReviews() {
    return (
      <section className="account-main-card account-review-panel">
        <h2>{copy.writeReview}</h2>
        {reviewableOrders.length === 0 ? (
          <p>{copy.noOrders}</p>
        ) : (
          <form className="account-review-form" onSubmit={submitReview}>
            {reviewMessage && <div className="message-panel success">{reviewMessage}</div>}
            <label>
              {copy.reviewType}
              <select name="type" onChange={updateReviewField} value={reviewForm.type}>
                <option value="store">{copy.storeReview}</option>
                <option value="employee">{copy.employeeReview}</option>
              </select>
            </label>
            <label>
              {copy.relatedOrder}
              <select name="orderId" onChange={updateReviewField} value={reviewForm.orderId}>
                {reviewableOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {copy.rating}
              <select name="rating" onChange={updateReviewField} value={reviewForm.rating}>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={rating}>
                    {"★".repeat(rating)}
                  </option>
                ))}
              </select>
            </label>
            <label className="full-field">
              {copy.reviewComment}
              <textarea
                name="comment"
                onChange={updateReviewField}
                required
                value={reviewForm.comment}
              />
            </label>
            <button className="primary-action" type="submit">
              {copy.submitReview}
            </button>
          </form>
        )}
      </section>
    );
  }

  function renderProducts() {
    return (
      <section className="account-products-view">
        <div className="account-section-head">
          <h2>{copy.viewedProducts}</h2>
          <p>{copy.discover}</p>
        </div>
        <div className="account-product-row">
          {featuredProducts.map((product) => {
            const firstSize = product.sizes?.[0];
            return (
              <button
                className="account-product-card"
                key={product.id}
                onClick={() => onNavigate("product", { slug: product.slug })}
                type="button"
              >
                <span className="account-product-badge">
                  {isArabic ? "منتج مميز" : "Featured product"}
                </span>
                <span className="account-product-image-wrap">
                  <img
                    alt={getLocalized(product.name, language, product.slug)}
                    src={product.image || product.fallbackImage}
                  />
                </span>
                <strong>{getLocalized(product.name, language, product.slug)}</strong>
                <small>{getLocalized(product.shortDescription, language, "")}</small>
                {firstSize && <span>{t("common.from")} {formatPrice(firstSize.price, t)}</span>}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  function renderPersonalInfo() {
    return (
      <section className="account-personal-view">
        <div className="account-main-card account-info-card">
          <div className="account-info-head">
            <h2>{copy.addressTitle}</h2>
            <div>
              <button type="button">{copy.edit}</button>
              <button type="button">{copy.delete}</button>
            </div>
          </div>
          <p>{currentUser.city || currentUser.address || copy.addressFallback}</p>
          <hr />
          <div className="account-profile-fields">
            <span><strong>{copy.name}</strong>{currentUser.name}</span>
            <span><strong>{copy.email}</strong>{currentUser.email}</span>
            <span><strong>{copy.phone}</strong>{currentUser.phone || "—"}</span>
            <span><strong>{copy.role}</strong>{currentUser.role}</span>
          </div>
          <button className="dark-action" type="button">{copy.addAddress} +</button>
        </div>
      </section>
    );
  }

  return (
    <section className="account-dashboard-page">
      <div className="account-dashboard-grid">
        <aside className="account-side-column">
          <nav className="account-side-menu" aria-label={copy.accountTitle}>
            <button
              className={activeTab === "orders" ? "active" : ""}
              onClick={() => setActiveTab("orders")}
              type="button"
            >
              <span>▱</span>{copy.orderHistory}
            </button>
            <button
              className={activeTab === "info" ? "active" : ""}
              onClick={() => setActiveTab("info")}
              type="button"
            >
              <span>◎</span>{copy.personalInfo}
            </button>
            <button
              className={activeTab === "products" ? "active" : ""}
              onClick={() => setActiveTab("products")}
              type="button"
            >
              <span>↻</span>{copy.viewedProducts}
            </button>
            <button
              className={activeTab === "subscriptions" ? "active" : ""}
              onClick={() => setActiveTab("subscriptions")}
              type="button"
            >
              <span>⟳</span>{copy.subscriptions}
            </button>
            <button
              className={activeTab === "reviews" ? "active" : ""}
              onClick={() => setActiveTab("reviews")}
              type="button"
            >
              <span>★</span>{copy.reviews}
            </button>
            <button onClick={onLogout} type="button">
              <span>↪</span>{copy.logout}
            </button>
          </nav>

          <article className="account-promo-card">
            <span>{isArabic ? "عروض خاصة" : "Subscribe and save"}</span>
            <strong>{isArabic ? "خصومات مستمرة على المنتجات المختارة" : "20% off selected products"}</strong>
            {promoProduct && (
              <img
                alt={getLocalized(promoProduct.name, language, promoProduct.slug)}
                src={promoProduct.image || promoProduct.fallbackImage}
              />
            )}
            <button onClick={() => onNavigate("products")} type="button">
              {isArabic ? "تسوق الآن" : "Shop now"}
            </button>
          </article>
        </aside>

        <main className="account-center-column">
          {activeTab === "orders" && renderOrderHistory()}
          {activeTab === "products" && renderProducts()}
          {activeTab === "info" && renderPersonalInfo()}
          {activeTab === "reviews" && renderReviews()}
          {activeTab === "subscriptions" && (
            <section className="account-main-card account-empty-orders">
              <h2>{copy.currentSubscriptions}</h2>
              <p>{copy.noSubscriptions}</p>
              <button className="primary-action" onClick={() => onNavigate("products")} type="button">
                {copy.startShopping}
              </button>
            </section>
          )}
        </main>

        <aside className="account-right-column">
          <article className="account-points-card">
            <span>{copy.pointsTitle}</span>
            <strong>{availablePoints.toLocaleString()}</strong>
            <small>{copy.availablePoints}</small>
            <div className="account-points-breakdown">
              <span>
                <b>{totalPointsEarned.toLocaleString()}</b>
                {copy.totalEarned}
              </span>
              <span>
                <b>{totalPointsRedeemed.toLocaleString()}</b>
                {copy.totalRedeemed}
              </span>
            </div>
          </article>
          <article className="account-redeem-card">
            {pointsProduct && (
              <img
                alt={getLocalized(pointsProduct.name, language, pointsProduct.slug)}
                src={pointsProduct.image || pointsProduct.fallbackImage}
              />
            )}
            <h3>{copy.pointsText}</h3>
            <div>
              <button type="button">{copy.howRedeem}</button>
              <button type="button">{copy.redeem}</button>
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}

export default AccountPage;
