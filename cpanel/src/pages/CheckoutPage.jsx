import React from "react";
import { buildWhatsAppOrderUrl } from "../utils/whatsapp.js";
import { validateCouponCode } from "../utils/couponsApi.js";
import { apiRequest } from "../utils/api.js";
import { fetchPublicDeliveryZones } from "../utils/deliveryZonesApi.js";
import { availableDeliveryZones, deliveryZoneSelectionPayload } from "../utils/deliveryZonesUi.js";

const initialCheckoutForm = {
  name: "",
  phone: "",
  city: "",
  address: "",
  notes: "",
};

function getMessageItems(items, products, language) {
  return items.map((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    const productName = product?.name?.[language] || item.productName || item.slug || item.productId;

    return {
      ...item,
      productName,
      selectedSize: item.selectedSize || item.size,
      lineTotal: item.lineTotal ?? Number(item.price || 0) * Number(item.quantity || 1),
    };
  });
}

function CheckoutPage({
  cartItems,
  checkoutMessage,
  currentUser,
  lastOrder,
  language,
  onCreateOrder,
  onNavigate,
  products,
  showCouponBox = false,
  t,
  total,
}) {
  const [form, setForm] = React.useState(() => ({
    ...initialCheckoutForm,
    name: currentUser?.role === "customer" ? currentUser.name : "",
    phone: currentUser?.role === "customer" ? currentUser.phone : "",
  }));
  const [orderPlaced, setOrderPlaced] = React.useState(false);
  const [orderError, setOrderError] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [couponCode, setCouponCode] = React.useState("");
  const [couponPreview, setCouponPreview] = React.useState(null);
  const [couponError, setCouponError] = React.useState("");
  const [couponBusy, setCouponBusy] = React.useState(false);
  const [couponBoxVisible, setCouponBoxVisible] = React.useState(showCouponBox === true);
  const [deliveryZones, setDeliveryZones] = React.useState([]);
  // "loading" | "ready" | "empty" | "error"
  const [deliveryZonesState, setDeliveryZonesState] = React.useState("loading");
  const [selectedZoneId, setSelectedZoneId] = React.useState("");
  const [deliveryZonesError, setDeliveryZonesError] = React.useState("");
  const [deliveryZonesRetryToken, setDeliveryZonesRetryToken] = React.useState(0);

  React.useEffect(() => {
    setCouponBoxVisible(showCouponBox === true);
  }, [showCouponBox]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadCouponSetting() {
      if (showCouponBox === true) {
        setCouponBoxVisible(true);
        return;
      }
      try {
        const host = typeof window !== "undefined" ? window.location.host : "";
        const result = await apiRequest(
          `/company/resolve-storefront?host=${encodeURIComponent(host)}&path=/`,
        );
        if (!cancelled) {
          setCouponBoxVisible(result?.settings?.showCouponBoxAtCheckout === true);
        }
      } catch {
        if (!cancelled) setCouponBoxVisible(false);
      }
    }
    loadCouponSetting();
    return () => {
      cancelled = true;
    };
  }, [showCouponBox]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadDeliveryZones() {
      try {
        const zones = await fetchPublicDeliveryZones();
        if (cancelled) return;
        const available = availableDeliveryZones(zones);
        setDeliveryZones(available);
        setDeliveryZonesState(available.length ? "ready" : "empty");
        setSelectedZoneId(available.length ? available[0].id : "");
      } catch (error) {
        if (cancelled) return;
        setDeliveryZonesState("error");
        setDeliveryZonesError(error?.message || "");
      }
    }
    loadDeliveryZones();
    return () => {
      cancelled = true;
    };
  }, [deliveryZonesRetryToken]);

  React.useEffect(() => {
    if (currentUser?.role === "customer") {
      setForm((currentForm) => ({
        ...currentForm,
        name: currentForm.name || currentUser.name,
        phone: currentForm.phone || currentUser.phone,
      }));
    }
  }, [currentUser]);

  function handleInputChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function handleApplyCoupon() {
    setCouponError("");
    setCouponBusy(true);
    try {
      const result = await validateCouponCode(couponCode, total);
      setCouponPreview(result);
    } catch (error) {
      setCouponPreview(null);
      setCouponError(error.message || "Invalid coupon.");
    } finally {
      setCouponBusy(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setOrderError("");

    if (deliveryZonesState === "loading") {
      setOrderError(t("checkout.deliveryZonesLoading"));
      return;
    }
    if (deliveryZonesState === "error") {
      setOrderError(t("checkout.deliveryZonesError"));
      return;
    }
    if (useZoneSelect && !selectedZone) {
      setOrderError(t("checkout.deliveryZoneSelectionRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      const submittedForm = { ...form };
      const zonePayload = deliveryZoneSelectionPayload(submittedForm, useZoneSelect ? selectedZone : null);
      if (useZoneSelect) {
        submittedForm.city = zonePayload.city;
      }
      const submittedItems = getMessageItems(cartItems, products, language);
      const submittedTotal = total;
      const order = await onCreateOrder(submittedForm, {
        couponCode: couponPreview?.valid ? couponPreview.code : (couponCode || undefined),
        delivery_zone_id: useZoneSelect ? zonePayload.delivery_zone_id : undefined,
        delivery_city_key: useZoneSelect ? zonePayload.delivery_city_key : undefined,
      });
      const whatsappUrl = buildWhatsAppOrderUrl({
        customer: { ...submittedForm, ...(order?.customer || {}) },
        items: order?.items?.length ? order.items : submittedItems,
        total: order?.total ?? submittedTotal,
      });

      setOrderPlaced(true);
      if (typeof window !== "undefined") {
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      setOrderError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const messageItems = orderPlaced && lastOrder ? lastOrder.items : cartItems;
  const messageTotal = orderPlaced && lastOrder ? lastOrder.total : total;
  const previewDiscount = couponPreview?.valid ? Number(couponPreview.discountAmount || 0) : 0;
  const displayTotal = orderPlaced && lastOrder
    ? lastOrder.total
    : Math.max(0, Number(total || 0) - previewDiscount);
  const useZoneSelect = deliveryZonesState === "ready" && deliveryZones.length > 0;
  const selectedZone = deliveryZones.find((zone) => zone.id === selectedZoneId) || null;
  const whatsappUrl = buildWhatsAppOrderUrl({
    customer: orderPlaced && lastOrder ? lastOrder.customer : form,
    items: getMessageItems(messageItems, products, language),
    total: messageTotal,
  });

  if (cartItems.length === 0 && !orderPlaced) {
    return (
      <section className="page-shell">
        <div className="empty-panel">
          <h1>{t("checkout.noProductsTitle")}</h1>
          <p>{t("checkout.noProductsText")}</p>
          <button className="primary-action" onClick={() => onNavigate("products")}>
            {t("cart.browseProducts")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell checkout-page">
      <div className="page-heading">
        <p className="eyebrow">{t("checkout.eyebrow")}</p>
        <h1>{t("checkout.title")}</h1>
        <p>{t("checkout.subtitle")}</p>
      </div>

      {(orderPlaced || checkoutMessage) && (
        <div className="success-panel">
          {checkoutMessage || t("checkout.success")}
        </div>
      )}
      {orderError && <div className="message-panel error">{orderError}</div>}

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <label>
            {t("checkout.name")}
            <input
              name="name"
              onChange={handleInputChange}
              placeholder={t("checkout.namePlaceholder")}
              required
              type="text"
              value={form.name}
            />
          </label>
          <label>
            {t("checkout.phone")}
            <input
              name="phone"
              onChange={handleInputChange}
              placeholder={t("checkout.phonePlaceholder")}
              required
              type="tel"
              value={form.phone}
            />
          </label>
          {useZoneSelect ? (
            <label>
              {t("checkout.city")}
              <select
                className="checkout-select"
                name="city"
                onChange={(event) => setSelectedZoneId(event.target.value)}
                required
                value={selectedZoneId}
              >
                <option value="" disabled>
                  {t("checkout.citySelectPlaceholder")}
                </option>
                {deliveryZones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.city_name}
                    {zone.region ? ` - ${zone.region}` : ""}
                  </option>
                ))}
              </select>
              <p className="field-hint">{t("checkout.deliveryZoneHint")}</p>
            </label>
          ) : deliveryZonesState === "empty" ? (
            <label>
              {t("checkout.city")}
              <input
                name="city"
                onChange={handleInputChange}
                placeholder={t("checkout.cityPlaceholder")}
                required
                type="text"
                value={form.city}
              />
            </label>
          ) : (
            <div className="full-field" role="status" aria-live="polite">
              <p className={deliveryZonesState === "error" ? "form-error" : "field-hint"}>
                {deliveryZonesState === "loading"
                  ? t("checkout.deliveryZonesLoading")
                  : t("checkout.deliveryZonesError")}
              </p>
              {deliveryZonesState === "error" ? (
                <button
                  className="secondary-action"
                  disabled={isSubmitting}
                  onClick={() => {
                    setDeliveryZonesError("");
                    setDeliveryZonesState("loading");
                    setDeliveryZonesRetryToken((value) => value + 1);
                  }}
                  type="button"
                >
                  {t("checkout.deliveryZonesRetry")}
                </button>
              ) : null}
            </div>
          )}
          <label>
            {t("checkout.address")}
            <input
              name="address"
              onChange={handleInputChange}
              placeholder={t("checkout.addressPlaceholder")}
              required
              type="text"
              value={form.address}
            />
          </label>
          <label className="full-field">
            {t("checkout.notes")}
            <textarea
              name="notes"
              onChange={handleInputChange}
              placeholder={t("checkout.notesPlaceholder")}
              rows="5"
              value={form.notes}
            />
          </label>

          {couponBoxVisible ? (
            <div className="checkout-coupon-box full-field">
              <label>
                {language === "ar" ? "رمز القسيمة" : "Coupon code"}
                <div className="checkout-coupon-row">
                  <input
                    name="couponCode"
                    onChange={(event) => {
                      setCouponCode(event.target.value);
                      setCouponPreview(null);
                      setCouponError("");
                    }}
                    placeholder={language === "ar" ? "أدخل الرمز" : "Enter code"}
                    type="text"
                    value={couponCode}
                  />
                  <button className="secondary-action" disabled={couponBusy || !couponCode.trim()} onClick={handleApplyCoupon} type="button">
                    {couponBusy ? (language === "ar" ? "…" : "…") : (language === "ar" ? "تطبيق" : "Apply")}
                  </button>
                </div>
              </label>
              {couponError ? <p className="form-error">{couponError}</p> : null}
              {couponPreview?.valid ? (
                <p className="success-inline">
                  {language === "ar"
                    ? `تم تطبيق القسيمة — خصم ${couponPreview.discountAmount}`
                    : `Coupon applied — discount ${couponPreview.discountAmount}`}
                </p>
              ) : null}
            </div>
          ) : null}

          <button
            className="primary-action large"
            disabled={isSubmitting || orderPlaced || deliveryZonesState === "loading" || deliveryZonesState === "error"}
            type="submit"
          >
            {isSubmitting ? t("common.temporaryContent") : t("checkout.placeOrder")}
          </button>
        </form>

        <aside className="summary-card">
          <h2>{t("cart.orderSummary")}</h2>
          {messageItems.map((item) => {
            const product = products.find((entry) => entry.id === item.productId);
            const productName = product?.name?.[language] || item.productName || item.slug;

            return (
              <div className="summary-line" key={item.cartId || `${item.productId}-${item.selectedSize || item.size}`}>
                <span>
                  {productName} - {item.selectedSize || item.size} x{item.quantity}
                </span>
                <strong>
                  {(item.lineTotal ?? item.price * item.quantity)} {t("common.ils")}
                </strong>
              </div>
            );
          })}
          {previewDiscount > 0 && !(orderPlaced && lastOrder) ? (
            <div className="summary-row">
              <span>{language === "ar" ? "خصم القسيمة" : "Coupon discount"}</span>
              <strong>-{previewDiscount} {t("common.ils")}</strong>
            </div>
          ) : null}
          {orderPlaced && lastOrder?.couponDiscount > 0 ? (
            <div className="summary-row">
              <span>{language === "ar" ? "خصم القسيمة" : "Coupon discount"}</span>
              <strong>-{lastOrder.couponDiscount} {t("common.ils")}</strong>
            </div>
          ) : null}
          {orderPlaced && lastOrder ? (
            <div className="summary-row">
              <span>{t("checkout.deliveryFee")}</span>
              <strong>{Number(lastOrder.delivery_price || 0)} {lastOrder.delivery_currency || t("common.ils")}</strong>
            </div>
          ) : null}
          <div className="summary-row total-row">
            <span>{t("common.total")}</span>
            <strong>
              {displayTotal} {t("common.ils")}
            </strong>
          </div>
          <a className="whatsapp-action" href={whatsappUrl} rel="noopener noreferrer" target="_blank">
            {t("checkout.sendWhatsApp")}
          </a>
        </aside>
      </div>
    </section>
  );
}

export default CheckoutPage;
