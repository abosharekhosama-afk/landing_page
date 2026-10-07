import React from "react";
import { placeholderImage } from "../data/products.js";
import { fetchPublicBundles } from "../utils/bundlesApi.js";

function bundleName(bundle, language) {
  if (!bundle) return "";
  if (language === "ar") return bundle.nameAr || bundle.name || bundle.slug || "";
  return bundle.name || bundle.slug || "";
}

function BundleCard({ bundle, language, onViewBundle, t }) {
  const isArabic = language === "ar";
  const name = bundleName(bundle, language);
  const image = bundle.imageUrl || placeholderImage;
  const savings = Number(bundle.savings || 0);
  const available = bundle.available !== false;

  return (
    <article className="shop-product-card">
      <button
        className="shop-product-image-wrap"
        onClick={() => onViewBundle(bundle.slug)}
        type="button"
      >
        <img
          alt={name}
          className="shop-product-image-main"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = placeholderImage;
          }}
          src={image}
        />
      </button>

      <div className="shop-product-info">
        <small>{isArabic ? "حزمة منتجات" : "Product bundle"}</small>
        <h2>{name}</h2>
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
        <p className="bundle-availability">
          {available
            ? isArabic
              ? "متاح"
              : "Available"
            : isArabic
              ? "غير متاح حاليًا"
              : "Currently unavailable"}
        </p>
        <div className="shop-product-actions">
          <button className="secondary-action" onClick={() => onViewBundle(bundle.slug)} type="button">
            {isArabic ? "تفاصيل الحزمة" : "View bundle"}
          </button>
        </div>
      </div>
    </article>
  );
}

function BundlesPage({ language, onViewBundle, t }) {
  const isArabic = language === "ar";
  const [bundles, setBundles] = React.useState([]);
  const [status, setStatus] = React.useState("loading");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError("");
    fetchPublicBundles()
      .then((data) => {
        if (cancelled) return;
        setBundles(Array.isArray(data) ? data : []);
        setStatus("ready");
      })
      .catch((requestError) => {
        if (cancelled) return;
        setBundles([]);
        setError(
          requestError?.message ||
            (isArabic ? "تعذر تحميل الحزم." : "Unable to load bundles.")
        );
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [isArabic]);

  return (
    <section className="page-shell products-page shop-page">
      <div className="shop-hero-banner shop-hero-banner--shop-all shop-hero-banner--shop-all-fix">
        <img
          alt=""
          aria-hidden="true"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = "/homepage-categories/home-care.jpg";
          }}
          src="/homepage-categories/home-care.jpg"
        />
        <div className="shop-hero-banner-content">
          <h1>{isArabic ? "الحزم" : "Bundles"}</h1>
          <p>
            {isArabic
              ? "مجموعات منتجات مختارة بسعر أفضل."
              : "Curated product bundles at a better price."}
          </p>
        </div>
      </div>

      {status === "loading" && (
        <p className="bundle-page-state">
          {isArabic ? "جارٍ التحميل…" : "Loading…"}
        </p>
      )}

      {status === "error" && (
        <div className="bundle-page-state is-error" role="alert">
          {error}
        </div>
      )}

      {status === "ready" && bundles.length === 0 && (
        <div className="bundle-page-state">
          {isArabic ? "لا توجد حزم متاحة حاليًا." : "No bundles available right now."}
        </div>
      )}

      {status === "ready" && bundles.length > 0 && (
        <div className="shop-product-grid">
          {bundles.map((bundle) => (
            <BundleCard
              bundle={bundle}
              key={bundle.id}
              language={language}
              onViewBundle={onViewBundle}
              t={t}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default BundlesPage;