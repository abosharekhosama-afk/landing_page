import React from "react";
import { ShoppingBag } from "lucide-react";
import { placeholderImage } from "../data/products.js";
import { fetchPublicBundle } from "../utils/bundlesApi.js";

function bundleName(bundle, language) {
  if (!bundle) return "";
  if (language === "ar") return bundle.nameAr || bundle.name || bundle.slug || "";
  return bundle.name || bundle.slug || "";
}

function componentName(item, language) {
  if (!item) return "";
  if (language === "ar") return item.productNameAr || item.productName || item.slug || "";
  return item.productName || item.slug || "";
}

function BundleDetailsPage({ bundleSlug, language, onAddBundle, onNavigate, t }) {
  const isArabic = language === "ar";
  const [bundle, setBundle] = React.useState(null);
  const [status, setStatus] = React.useState("loading");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!bundleSlug) {
      setBundle(null);
      setStatus("error");
      setError(isArabic ? "الحزمة غير موجودة." : "Bundle not found.");
      return undefined;
    }
    let cancelled = false;
    setStatus("loading");
    setError("");
    fetchPublicBundle(bundleSlug)
      .then((data) => {
        if (cancelled) return;
        setBundle(data);
        setStatus("ready");
      })
      .catch((requestError) => {
        if (cancelled) return;
        setBundle(null);
        setError(
          requestError?.message ||
            (isArabic ? "تعذر تحميل الحزمة." : "Unable to load bundle.")
        );
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [bundleSlug, isArabic]);

  if (status === "loading") {
    return (
      <section className="page-shell">
        <p className="bundle-page-state">
          {isArabic ? "جارٍ التحميل…" : "Loading…"}
        </p>
      </section>
    );
  }

  if (status === "error" || !bundle) {
    return (
      <section className="page-shell">
        <div className="empty-panel">
          <h1>{isArabic ? "الحزمة غير متوفرة" : "Bundle unavailable"}</h1>
          <p>{error}</p>
          <button className="primary-action" onClick={() => onNavigate("bundles")} type="button">
            {isArabic ? "العودة إلى الحزم" : "Back to bundles"}
          </button>
        </div>
      </section>
    );
  }

  const name = bundleName(bundle, language);
  const image = bundle.imageUrl || placeholderImage;
  const savings = Number(bundle.savings || 0);
  const available = bundle.available !== false;
  const components = Array.isArray(bundle.items) ? bundle.items : [];

  function handleAdd() {
    onAddBundle(bundle);
  }

  return (
    <section className="page-shell products-page shop-page">
      <div
        className="bundle-detail-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: "clamp(24px, 4vw, 56px)",
          alignItems: "start",
          padding: "clamp(24px, 4vw, 56px) 0",
        }}
      >
        <div className="bundle-detail-media">
          <img
            alt={name}
            className="bundle-detail-image"
            loading="eager"
            onError={(event) => {
              event.currentTarget.src = placeholderImage;
            }}
            src={image}
            style={{
              display: "block",
              width: "100%",
              aspectRatio: "1 / 1",
              objectFit: "cover",
              borderRadius: "clamp(16px, 2vw, 28px)",
              background: "#f4f7ef",
            }}
          />
        </div>

        <div className="bundle-detail-info">
          <button className="pi-back" onClick={() => onNavigate("bundles")} type="button">
            {isArabic ? "العودة إلى الحزم" : "Back to bundles"}
          </button>
          <p className="pi-eyebrow">{isArabic ? "حزمة منتجات" : "Product bundle"}</p>
          <h1 style={{ margin: "0 0 12px", fontSize: "clamp(1.6rem, 3vw, 2.4rem)", lineHeight: 1.1, fontWeight: 500, color: "#061f33" }}>
            {name}
          </h1>
          {bundle.description && <p className="pi-desc">{bundle.description}</p>}

          <div className="bundle-detail-pricing" style={{ marginTop: "clamp(20px, 3vw, 32px)" }}>
            <div className="shop-product-price-row">
              <strong>
                {bundle.finalPrice} {t("common.ils")}
              </strong>
              {savings > 0 && (
                <del>
                  {bundle.subtotal} {t("common.ils")}
                </del>
              )}
            </div>
            {savings > 0 && (
              <p className="bundle-savings">
                {isArabic
                  ? `وفّر ${savings} ${t("common.ils")}`
                  : `Save ${savings} ${t("common.ils")}`}
              </p>
            )}
            <p className="bundle-detail-subtotal">
              {isArabic ? "المجموع الفرعي" : "Subtotal"}: {bundle.subtotal} {t("common.ils")}
            </p>
            <p className="bundle-availability">
              {available
                ? isArabic
                  ? "متاح"
                  : "Available"
                : isArabic
                  ? "غير متاح حاليًا"
                  : "Currently unavailable"}
            </p>
          </div>

          <button
            className="pi-add-btn"
            disabled={!available}
            onClick={handleAdd}
            style={{ marginTop: "clamp(20px, 3vw, 32px)" }}
            type="button"
          >
            <ShoppingBag size={18} />
            {isArabic ? "أضف إلى السلة" : "Add to cart"}
          </button>
        </div>
      </div>

      {components.length > 0 && (
        <section className="bundle-components-section" style={{ paddingBottom: "clamp(32px, 5vw, 64px)" }}>
          <h2 style={{ margin: "0 0 clamp(16px, 2vw, 24px)", fontSize: "clamp(1.2rem, 2vw, 1.6rem)", fontWeight: 500, color: "#061f33" }}>
            {isArabic ? "مكونات الحزمة" : "Bundle components"}
          </h2>
          <div className="detail-included-card">
            <ul>
              {components.map((item) => (
                <li key={item.id || `${item.productId}-${item.variantId}`}>
                  <span style={{ flex: 1 }}>
                    <strong>{componentName(item, language)}</strong>
                    {item.size ? ` · ${item.size}` : ""}
                    {item.colorName ? ` · ${item.colorName}` : ""}
                  </span>
                  <span>
                    {isArabic ? "الكمية" : "Qty"}: {item.quantity}
                  </span>
                  <span style={{ minWidth: "7ch", textAlign: "end" }}>
                    {item.lineTotal} {t("common.ils")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </section>
  );
}

export default BundleDetailsPage;