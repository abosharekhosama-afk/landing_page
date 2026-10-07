import React from "react";
import QuantityControl from "../components/QuantityControl.jsx";
import { placeholderImage } from "../data/products.js";
import { getWebsiteMediaImage } from "../data/websiteMedia.js";

const cartEmptyFallbackImage = "/images/products/concentrated-wax-car-shampoo.svg";

const cartCopy = {
  en: {
    addToCart: "Add to cart",
    cartTitle: "Your Cart",
    checkout: "Proceed to Checkout",
    continueShopping: "Continue Shopping",
    emptyCart: "Empty cart",
    emptyTitle: "There is nothing in your cart",
    featured: "Featured",
    freeShipping: "Congratulations! You've unlocked free shipping!",
    loginToAccount: "Login to your account",
    needAnythingElse: "Need anything else?",
    quickIntro: "Selected products that pair well with your order.",
    quickTitle: "Grab it before it's gone",
    remove: "Remove",
    shippingInfo: "Shipping information",
    size: "Size",
    color: "Color",
    totalDue: "Total (due today)",
    unlockShipping: (amount, currency) => `Add ${amount} ${currency} to unlock free shipping`,
    youMightAlsoLike: "You might also like",
  },
  ar: {
    addToCart: "أضف إلى السلة",
    cartTitle: "سلتك",
    checkout: "المتابعة إلى الدفع",
    continueShopping: "متابعة التسوق",
    emptyCart: "إفراغ السلة",
    emptyTitle: "سلتك فارغة حاليًا",
    featured: "منتج مميز",
    freeShipping: "تهانينا! حصلت على شحن مجاني!",
    loginToAccount: "تسجيل الدخول إلى حسابك",
    needAnythingElse: "هل تحتاج شيئًا آخر؟",
    quickIntro: "منتجات مختارة تناسب طلبك الحالي.",
    quickTitle: "لا تفوّت هذه المنتجات",
    remove: "إزالة",
    shippingInfo: "معلومات الشحن",
    size: "الحجم",
    totalDue: "الإجمالي المستحق اليوم",
    unlockShipping: (amount, currency) => `أضف ${amount} ${currency} للحصول على شحن مجاني`,
    youMightAlsoLike: "قد يعجبك أيضًا",
  },
};

function RecommendedProductCard({
  compact = false,
  currency,
  getLocalized,
  language,
  onAdd,
  onViewProduct,
  product,
}) {
  const text = cartCopy[language] || cartCopy.en;
  const mainImage = product.image || placeholderImage;
  const hoverImage =
    product.hoverImage ||
    product.secondaryImage ||
    product.secondImage ||
    product.galleryImages?.[1] ||
    product.images?.[1] ||
    mainImage;
  const name = getLocalized(product.name, product.slug);
  const badge = getLocalized(product.badge, text.featured);
  const detail = getLocalized(product.shortDescription, "");
  const price = product.sizes?.[0]?.price || 0;

  function handleAdd(event) {
    event.preventDefault();
    event.stopPropagation();
    onAdd(product);
  }

  return (
    <article className={compact ? "cart-reco-card compact" : "cart-reco-card"}>
      <div className="cart-reco-image">
        <button className="cart-reco-media-button" onClick={() => onViewProduct?.(product.slug)} type="button">
          <span className="cart-reco-badge">{badge}</span>
          <img
            alt={name}
            className="cart-reco-img-main"
            onError={(event) => {
              event.currentTarget.src = product.fallbackImage || placeholderImage;
            }}
            src={mainImage}
          />
          <img
            alt=""
            aria-hidden="true"
            className="cart-reco-img-hover"
            onError={(event) => {
              event.currentTarget.src = mainImage;
            }}
            src={hoverImage}
          />
        </button>
        <button className="cart-reco-overlay" onClick={handleAdd} type="button">
          {text.addToCart}
        </button>
      </div>
      <button className="cart-reco-copy" onClick={() => onViewProduct?.(product.slug)} type="button">
        <strong>{name}</strong>
        {!compact && detail && <span>{detail}</span>}
        <small>
          {price} {currency}
        </small>
      </button>
    </article>
  );
}

function CartPage({
  cartItems,
  currentUser,
  language,
  onAddToCart,
  onNavigate,
  onRemoveItem,
  onUpdateQuantity,
  onViewProduct,
  products,
  t,
  total,
  websiteMedia = [],
}) {
  const isArabic = language === "ar";
  const text = cartCopy[language] || cartCopy.en;
  const currency = t("common.ils");
  const cartTotal =
    typeof total === "number"
      ? total
      : cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingGoal = 120;
  const shippingProgress = Math.min(100, Math.round((cartTotal / shippingGoal) * 100));
  const remainingForShipping = Math.max(0, shippingGoal - cartTotal);

  function getProduct(item) {
    return products.find((product) => product.id === item.productId || product.slug === item.slug);
  }

  function getLocalized(value, fallback = "") {
    if (!value) return fallback;
    if (typeof value === "string") return value;
    return value[language] || value.en || value.ar || fallback;
  }

  function addRecommended(product) {
    const firstVariant = product?.variants?.find((variant) => Number(variant.stock ?? 1) > 0);
    const firstSize = firstVariant?.size || product?.sizes?.[0]?.size;
    if (!firstSize) return;
    onAddToCart?.(product, firstSize, firstVariant);
  }

  function handleCheckout() {
    if (!currentUser) {
      onNavigate("login");
      return;
    }

    onNavigate("checkout");
  }

  const cartProductIds = new Set(cartItems.map((item) => item.productId));
  const productPool = products.filter((product) => !cartProductIds.has(product.id));
  const compactRecommendations = productPool.slice(0, 3);
  const largeRecommendations = productPool.slice(0, 6);
  const emptyCartBackgroundImage =
    getWebsiteMediaImage(websiteMedia, "cart_empty_background_image", cartEmptyFallbackImage) ||
    cartEmptyFallbackImage;

  if (cartItems.length === 0) {
    return (
      <section
        className="cart-empty-hero"
        style={{
          "--cart-empty-background-image": `url("${emptyCartBackgroundImage.replace(/"/g, '\\"')}")`,
        }}
      >
        <div className="cart-empty-overlay">
          <h1>{text.emptyTitle}</h1>
          <div className="cart-empty-actions">
            <button className="light-action" onClick={() => onNavigate("products")} type="button">
              {text.continueShopping}
            </button>
            {!currentUser && (
              <button className="outline-light-action" onClick={() => onNavigate("login")} type="button">
                {text.loginToAccount}
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="cart-kinfill-page">
      <div className="cart-kinfill-grid">
        <div className="cart-main-column">
          <div className="cart-main-sticky">
            <header className="cart-title-row">
              <h1>{text.cartTitle}</h1>
              <button
                className="cart-empty-button"
                onClick={() => cartItems.forEach((item) => onRemoveItem(item.cartId))}
                type="button"
              >
                {text.emptyCart}
              </button>
            </header>

            {compactRecommendations.length > 0 && (
              <section className="cart-upsell-strip" aria-label={isArabic ? "اقتراحات سريعة" : "Quick suggestions"}>
                <div className="cart-upsell-heading">
                  <strong>{text.quickTitle}</strong>
                  <span>{text.quickIntro}</span>
                </div>
                <div className="cart-upsell-inline">
                  {compactRecommendations.slice(0, 2).map((product) => (
                    <RecommendedProductCard
                      compact
                      currency={currency}
                      getLocalized={getLocalized}
                      key={product.id}
                      language={language}
                      onAdd={addRecommended}
                      onViewProduct={onViewProduct}
                      product={product}
                    />
                  ))}
                </div>
              </section>
            )}

            <div className="cart-items-panel">
              {cartItems.map((item) => {
                const product = getProduct(item);
                const productName = getLocalized(product?.name, item.productName || item.slug);
                const productBadge = getLocalized(product?.badge, text.featured);
                const lineTotal = item.price * item.quantity;

                return (
                  <article className="cart-line-item" key={item.cartId}>
                    <button className="cart-line-image" onClick={() => onViewProduct?.(item.slug)} type="button">
                      <img
                        alt={productName}
                        onError={(event) => {
                          event.currentTarget.src = item.fallbackImage || placeholderImage;
                        }}
                        src={item.image || placeholderImage}
                      />
                    </button>

                    <div className="cart-line-info">
                      <span className="cart-line-badge">{productBadge}</span>
                      <h2>{productName}</h2>
                      <p>
                        {text.size}: {item.size}
                        {item.colorName ? ` · ${(text.color || "Color")}: ${item.colorName}` : ""}
                      </p>
                      <div className="cart-line-actions">
                        <QuantityControl
                          onDecrease={() => onUpdateQuantity(item.cartId, item.quantity - 1)}
                          onIncrease={() => onUpdateQuantity(item.cartId, item.quantity + 1)}
                          quantity={item.quantity}
                        />
                        <button
                          className="cart-remove-button"
                          onClick={() => onRemoveItem(item.cartId)}
                          type="button"
                        >
                          {text.remove}
                        </button>
                      </div>
                    </div>

                    <strong className="cart-line-price">
                      {lineTotal} {currency}
                    </strong>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="cart-side-column">
          <section className="cart-summary-panel">
            <div className="shipping-progress-card">
              <div className="shipping-progress-copy">
                <strong>
                  {remainingForShipping === 0
                    ? text.freeShipping
                    : text.unlockShipping(remainingForShipping, currency)}
                </strong>
                <button type="button">{text.shippingInfo}</button>
              </div>
              <div className="shipping-progress-track">
                <span style={{ width: `${shippingProgress}%` }} />
              </div>
            </div>

            {!currentUser && <div className="message-panel soft">{t("auth.loginRequiredToBuy")}</div>}

            <div className="cart-summary-total">
              <span>{text.totalDue}</span>
              <strong>
                {cartTotal} {currency}
              </strong>
            </div>
            <button className="checkout-wide-button" onClick={handleCheckout} type="button">
              {currentUser ? text.checkout : t("auth.login")}
            </button>
          </section>

          {compactRecommendations.length > 0 && (
            <section className="cart-recommendations compact-list">
              <h2>{text.youMightAlsoLike}</h2>
              <div className="cart-recommendation-grid">
                {compactRecommendations.map((product) => (
                  <RecommendedProductCard
                    compact
                    currency={currency}
                    getLocalized={getLocalized}
                    key={product.id}
                    language={language}
                    onAdd={addRecommended}
                    onViewProduct={onViewProduct}
                    product={product}
                  />
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      {largeRecommendations.length > 0 && (
        <section className="cart-more-products">
          <header>
            <h2>{text.needAnythingElse}</h2>
          </header>
          <div className="cart-more-grid">
            {largeRecommendations.map((product) => (
              <RecommendedProductCard
                currency={currency}
                getLocalized={getLocalized}
                key={product.id}
                language={language}
                onAdd={addRecommended}
                onViewProduct={onViewProduct}
                product={product}
              />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

export default CartPage;
