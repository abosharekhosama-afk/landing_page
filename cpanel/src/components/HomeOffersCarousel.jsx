import React from "react";
import {
  filterVisibleHomeOffers,
  homeOfferAutoplayDelay,
  homeOfferCtaLink,
  homeOfferCtaText,
  homeOfferDescription,
  homeOfferTitle,
  homeOffersCopy,
  resolveHomeOfferCtaTarget,
  resolveHomeOfferImage,
  resolveHomeOfferMediaUrl,
} from "../utils/homeOffersUi.js";

function HomeOffersCarousel({
  language = "en",
  offers = [],
  onCategorySelect,
  onNavigate,
  onRetry,
  status = "ready",
}) {
  const copy = homeOffersCopy(language);
  const visibleOffers = React.useMemo(() => filterVisibleHomeOffers(offers), [offers]);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);

  const total = visibleOffers.length;
  const safeIndex = total ? Math.min(Math.max(activeIndex, 0), total - 1) : 0;

  React.useEffect(() => {
    setActiveIndex((current) => (total ? Math.min(current, total - 1) : 0));
  }, [total]);

  function goTo(index) {
    if (!total) return;
    setActiveIndex(((index % total) + total) % total);
  }

  function goNext() {
    goTo(safeIndex + 1);
  }

  function goPrevious() {
    goTo(safeIndex - 1);
  }

  const current = total ? visibleOffers[safeIndex] : null;
  const autoplayEnabled = Boolean(total) && current?.autoplay !== false;

  React.useEffect(() => {
    if (status !== "ready" || !total || total < 2 || isPaused || !autoplayEnabled) return undefined;
    const delay = homeOfferAutoplayDelay(current);
    const timerId = window.setTimeout(() => {
      setActiveIndex((index) => (index + 1) % total);
    }, delay);
    return () => window.clearTimeout(timerId);
  }, [status, total, safeIndex, isPaused, autoplayEnabled, current]);

  function handleCtaClick(link) {
    const action = resolveHomeOfferCtaTarget(link);
    if (action.kind === "external") {
      window.open(action.target, "_blank", "noopener,noreferrer");
      return;
    }
    if (action.kind === "path") {
      window.location.href = action.target;
      return;
    }
    if (action.kind === "category") {
      if (onCategorySelect) {
        onCategorySelect(action.target);
        return;
      }
      onNavigate?.("products");
      return;
    }
    onNavigate?.(action.target);
  }

  if (status === "loading") {
    return (
      <section className="home-offers-carousel home-offers-state" aria-busy="true" aria-label={copy.sectionLabel}>
        <div className="home-offers-skeleton" />
        <p>{copy.loading}</p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="home-offers-carousel home-offers-state" aria-label={copy.sectionLabel}>
        <p>{copy.loadFailed}</p>
        {onRetry && (
          <button className="secondary-action" onClick={onRetry} type="button">
            {copy.retry}
          </button>
        )}
      </section>
    );
  }

  // Honest empty: no stored offers means no carousel at all — never fake slides.
  if (!total || !current) return null;

  const desktopImage = resolveHomeOfferMediaUrl(resolveHomeOfferImage(current));
  const mobileImage = resolveHomeOfferMediaUrl(resolveHomeOfferImage(current, { mobile: true }));
  const title = homeOfferTitle(current, language);
  const description = homeOfferDescription(current, language);
  const ctaText = homeOfferCtaText(current, language);
  const ctaLink = homeOfferCtaLink(current);

  return (
    <section
      aria-label={copy.sectionLabel}
      aria-roledescription="carousel"
      className="home-offers-carousel storefront-wide-section"
      tabIndex={0}
      onBlur={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        const isRtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
        const forward = event.key === "ArrowRight" ? !isRtl : isRtl;
        event.preventDefault();
        if (forward) goNext();
        else goPrevious();
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="home-offers-slide" aria-roledescription="slide" aria-label={copy.slideOf(safeIndex + 1, total)}>
        {desktopImage || mobileImage ? (
          <picture>
            {mobileImage && mobileImage !== desktopImage && (
              <source media="(max-width: 640px)" srcSet={mobileImage} />
            )}
            <img
              alt={title}
              loading="eager"
              onError={(event) => {
                event.currentTarget.src = "/images/products/product-placeholder.svg";
              }}
              src={desktopImage || mobileImage}
            />
          </picture>
        ) : null}
        <div className="home-offers-copy">
          {title && <h2>{title}</h2>}
          {description && <p>{description}</p>}
          {ctaText && (
            <button className="primary-action large" onClick={() => handleCtaClick(ctaLink)} type="button">
              {ctaText}
            </button>
          )}
        </div>
      </div>

      {total > 1 && (
        <div className="home-offers-controls">
          <button aria-label={copy.previous} onClick={goPrevious} type="button">
            <span aria-hidden="true">‹</span>
          </button>
          <div className="home-offers-dots" role="tablist" aria-label={copy.sectionLabel}>
            {visibleOffers.map((offer, index) => (
              <button
                aria-current={index === safeIndex}
                aria-label={typeof copy.goToSlide === "function" ? copy.goToSlide(index + 1, total) : `Slide ${index + 1}`}
                className={index === safeIndex ? "home-offers-dot active" : "home-offers-dot"}
                key={offer.id || index}
                onClick={() => goTo(index)}
                role="tab"
                type="button"
              />
            ))}
          </div>
          <button aria-label={copy.next} onClick={goNext} type="button">
            <span aria-hidden="true">›</span>
          </button>
        </div>
      )}
    </section>
  );
}

export default HomeOffersCarousel;
