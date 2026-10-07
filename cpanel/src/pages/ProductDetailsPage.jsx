import React from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ShoppingBag,
  Star,
} from "lucide-react";
import { categories } from "../data/categories.js";
import { placeholderImage } from "../data/products.js";
import { fetchProductReviews } from "../utils/homeContentApi.js";

const productText = {
  en: {
    back: "Back to products",
    type: "Product type",
    size: "Size",
    use: "Choose use",
    purchase: "Purchase",
    oneTime: "One-time purchase",
    refillPlan: "Save with refill plan",
    visualOnly: "Visual option only. Checkout remains standard.",
    addToCart: "Add to cart",
    whatYouGet: "What you get",
    usageNote: "Usage note",
    reviews: "Reviews",
    reviewsLoading: "Loading reviews…",
    reviewsError: "Reviews could not be loaded.",
    noReviewsText: "No approved reviews for this product yet.",
    how: "How it works",
    impact: "Helps reduce single-use packaging with every refill",
    safe: "Safe to use on",
    surfaceNote: "Always test on a small hidden area first and follow the product instructions.",
    formulaTitle: "Purposeful ingredients",
    formulaText:
      "Every ingredient is chosen with care. Our formula is designed to remove limescale effectively while keeping the cleaning experience simple, practical, and surface-conscious.",
    ingredients: "All ingredients",
    related: "You may also like",
    fbt: "Frequently bought together",
    faqTitle: "Frequently Asked Questions",
    faqText: "Do you have questions about this product? Here you’ll find the most frequently asked questions.",
    productInfo: "Product information",
    from: "From",
    condition: "Condition",
    conditionNew: "New",
    conditionRefurbished: "Refurbished",
    conditionUsed: "Used",
  },
  ar: {
    back: "العودة للمنتجات",
    type: "نوع المنتج",
    size: "الحجم",
    use: "اختر الاستخدام",
    purchase: "طريقة الشراء",
    oneTime: "شراء مرة واحدة",
    refillPlan: "وفّر مع خطة إعادة التعبئة",
    visualOnly: "خيار عرض فقط. الدفع يبقى بالنظام الحالي.",
    addToCart: "أضف إلى السلة",
    whatYouGet: "ماذا تحصل",
    usageNote: "ملاحظة الاستخدام",
    reviews: "التقييمات",
    reviewsLoading: "جارٍ تحميل التقييمات…",
    reviewsError: "تعذر تحميل التقييمات.",
    noReviewsText: "لا توجد تقييمات معتمدة لهذا المنتج بعد.",
    how: "طريقة الاستخدام",
    impact: "يساعد على تقليل استخدام العبوات أحادية الاستخدام مع كل إعادة تعبئة",
    safe: "آمن للاستخدام على",
    surfaceNote: "جرّبه دائمًا على منطقة صغيرة غير ظاهرة أولًا واتبع تعليمات المنتج.",
    formulaTitle: "مكونات فعّالة",
    formulaText:
      "كل مكوّن مختار بعناية. صُممت تركيبتنا لإزالة التكلسات بفعالية مع الحفاظ على تجربة تنظيف سهلة وعملية ومناسبة للأسطح.",
    ingredients: "كل المكونات",
    related: "قد يعجبك أيضًا",
    fbt: "يُشترى معًا غالبًا",
    faqTitle: "الأسئلة الشائعة",
    faqText: "هل لديك أسئلة حول هذا المنتج؟ هنا ستجد أكثر الأسئلة الشائعة.",
    productInfo: "معلومات المنتج",
    from: "ابتداءً من",
    condition: "الحالة",
    conditionNew: "جديد",
    conditionRefurbished: "مجدد",
    conditionUsed: "مستعمل",
  },
};

function localized(value, language, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value;
  return value[language] || value.en || value.ar || fallback;
}

function safeImage(image, fallback = placeholderImage) {
  return image || fallback;
}

// Rating summary derived from real reviews only — never hardcoded.
function formatRatingSummary(count, average, language) {
  if (!count) return language === "ar" ? "لا توجد تقييمات بعد" : "No reviews yet";
  const avg = (Math.round(Number(average || 0) * 10) / 10).toFixed(1);
  if (language === "ar") {
    if (count === 1) return `${avg} ★ | تقييم واحد`;
    if (count === 2) return `${avg} ★ | تقييمان`;
    return `${avg} ★ | ${count} تقييم`;
  }
  return `${avg} ★ | ${count} ${count === 1 ? "review" : "reviews"}`;
}

function ratingStarsRow(average) {
  const filled = Math.max(0, Math.min(5, Math.round(Number(average || 0))));
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`;
}

function normalizeProductVariants(product = {}) {
  if (Array.isArray(product.variants) && product.variants.length) {
    return product.variants.map((variant, index) => ({
      id: variant.id || `${product.id || "product"}-variant-${index}`,
      colorName: (variant.color_name || variant.colorName || "Default").trim(),
      colorValue: variant.color_value || variant.colorValue || "",
      size: (variant.size || "").trim(),
      price: Number(variant.price || 0),
      stock: Math.max(0, Number(variant.stock ?? variant.stockQty ?? product.stockQty ?? 24)),
      image: variant.image_url || variant.imageUrl || variant.image || "",
      sortOrder: Number(variant.sort_order ?? variant.sortOrder ?? index),
    }));
  }

  return (product.sizes || []).map((sizeOption, index) => ({
    id: `${product.id || "product"}-variant-${index}`,
    colorName: "Default",
    colorValue: "",
    size: (sizeOption.size || "").trim(),
    price: Number(sizeOption.price || 0),
    stock: Math.max(0, Number(product.stockQty ?? 24)),
    image: product.image || "",
    sortOrder: index,
  }));
}

function normalizeText(str) {
  return (str || "").toString().trim().toLowerCase();
}

function productConditionLabel(condition, txt) {
  const key = String(condition || "").trim().toLowerCase();
  if (key === "new") return txt.conditionNew;
  if (key === "refurbished") return txt.conditionRefurbished;
  if (key === "used") return txt.conditionUsed;
  return "";
}

function normalizeProductGallery(product = {}, selectedImage = "") {
  const source = product.gallery_images || product.galleryImages || [];
  const gallery = source
    .map((entry, index) => ({
      image: typeof entry === "string" ? entry : entry?.image_url || entry?.image || entry?.url || "",
      sortOrder: Number(typeof entry === "object" ? entry?.sort_order ?? entry?.sortOrder ?? index : index),
    }))
    .filter((entry) => entry.image)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((entry) => entry.image);

  return gallery.length ? gallery : [selectedImage || product.image || placeholderImage];
}

function getDetailSectionImage(detailImages = {}, ...keys) {
  for (const key of keys) {
    const value = detailImages?.[key];
    if (value) return value;
  }
  return "";
}

function ProductImage({ alt, className = "", src, ...imageProps }) {
  return (
    <img
      alt={alt}
      className={className}
      loading="lazy"
      onError={(event) => {
        event.currentTarget.src = placeholderImage;
      }}
      src={safeImage(src)}
      {...imageProps}
    />
  );
}

function SliderButton({ direction, onClick }) {
  const Icon = direction === "next" ? ChevronRight : ChevronLeft;
  return (
    <button className="detail-circle-button" onClick={onClick} type="button">
      <Icon size={22} />
    </button>
  );
}

function FloatingAddToCart({ language, onAdd, product, selectedLabel, txt }) {
  const isArabic = language === "ar";
  return (
    <aside className="product-detail-floating-cart" dir={isArabic ? "rtl" : "ltr"} aria-label={txt.addToCart}>
      <ProductImage alt={localized(product.name, language)} src={product.image} />
      <div>
        <strong>{localized(product.name, language)}</strong>
        <span>{selectedLabel}</span>
      </div>
      <button className="detail-accent-button" onClick={onAdd} type="button">
        {txt.addToCart}
      </button>
    </aside>
  );
}

function AccordionList({ items, language }) {
  const [openIndex, setOpenIndex] = React.useState(0);

  return (
    <div className="detail-accordion-list">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <article className={isOpen ? "detail-accordion-item open" : "detail-accordion-item"} key={`${localized(item.title || item.question, language)}-${index}`}>
            <button onClick={() => setOpenIndex(isOpen ? -1 : index)} type="button">
              <span>{localized(item.title || item.question, language)}</span>
              {isOpen ? <Minus size={20} /> : <Plus size={20} />}
            </button>
            <div className="detail-accordion-content">
              <p>{localized(item.text || item.answer, language)}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ProductDetailsPage({
  language,
  onAddToCart,
  onNavigate,
  onViewProduct,
  product,
  products: _catalogProducts = [],
  t,
}) {
  const txt = productText[language] || productText.en;
  const productVariants = React.useMemo(() => normalizeProductVariants(product), [product]);
  const [selectedSize, setSelectedSize] = React.useState(product?.sizes?.[0]?.size || "");
  const [selectedColor, setSelectedColor] = React.useState(productVariants[0]?.colorName || "Default");
  const [quantity, setQuantity] = React.useState(1);
  const [selectedType, setSelectedType] = React.useState(product?.detailOptions?.productTypes?.[0]?.id || "standard");
  const [selectedUse, setSelectedUse] = React.useState(product?.detailOptions?.uses?.[0]?.id || "default");
  const [purchaseType, setPurchaseType] = React.useState("one-time");
  const [activeStep, setActiveStep] = React.useState(0);
  const [activeSurface, setActiveSurface] = React.useState(0);
  const [activeStatement, setActiveStatement] = React.useState(0);
  const [dragStart, setDragStart] = React.useState(null);
  const [parallax, setParallax] = React.useState(0);
  // Real approved/visible reviews for this product, loaded from the existing
  // product reviews API. No fake or fallback review content is ever shown.
  const [productReviews, setProductReviews] = React.useState([]);
  const [reviewsStatus, setReviewsStatus] = React.useState("loading");
  const productId = product?.id || "";
  React.useEffect(() => {
    if (!productId) {
      setProductReviews([]);
      setReviewsStatus("ready");
      return undefined;
    }
    let cancelled = false;
    setReviewsStatus("loading");
    fetchProductReviews(productId)
      .then((data) => {
        if (cancelled) return;
        setProductReviews(Array.isArray(data) ? data : []);
        setReviewsStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setProductReviews([]);
        setReviewsStatus("error");
      });
    return () => { cancelled = true; };
  }, [productId]);
  const [openAccordionIndex, setOpenAccordionIndex] = React.useState(null);
  const reviewsRef = React.useRef(null);
  const relatedRef = React.useRef(null);
  const fbtRef = React.useRef(null);
  const impactRef = React.useRef(null);
  const galleryScrollRef = React.useRef(null);

  React.useEffect(() => {
    const nextVariants = normalizeProductVariants(product);
    setSelectedColor(nextVariants[0]?.colorName || "Default");
    setSelectedSize(nextVariants[0]?.size || product?.sizes?.[0]?.size || "");
    const minQty = Number(product?.minPurchaseQuantity);
    setQuantity(Number.isInteger(minQty) && minQty >= 1 ? minQty : 1);
    setSelectedType(product?.detailOptions?.productTypes?.[0]?.id || "standard");
    setSelectedUse(product?.detailOptions?.uses?.[0]?.id || "default");
    setPurchaseType("one-time");
    setActiveStep(0);
    setActiveSurface(0);
    setActiveStatement(0);
  }, [product]);

  React.useEffect(() => {
    if (getStatements().length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveStatement((index) => (index + 1) % getStatements().length);
    }, 4000);
    return () => window.clearInterval(timer);
  });

  React.useEffect(() => {
    function handleScroll() {
      const section = impactRef.current;
      if (!section) {
        setParallax(0);
        return;
      }
      const rect = section.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const progress = (viewportCenter - rect.top) / Math.max(rect.height, 1);
      setParallax(Math.max(-1, Math.min(1, progress * 2 - 1)));
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  React.useEffect(() => {
    const availableForColor = productVariants.filter((variant) => normalizeText(variant.colorName) === normalizeText(selectedColor));
    if (availableForColor.length && !availableForColor.some((variant) => normalizeText(variant.size) === normalizeText(selectedSize))) {
      setSelectedSize(availableForColor[0].size);
    }
  }, [productVariants, selectedColor, selectedSize]);

  if (!product) {
    return (
      <section className="page-shell">
        <div className="empty-panel">
          <h1>{t("productDetails.notFoundTitle")}</h1>
          <p>{t("productDetails.notFoundText")}</p>
          <button className="primary-action" onClick={() => onNavigate("products")}>
            {t("common.backToProducts")}
          </button>
        </div>
      </section>
    );
  }

  const category = categories.find((item) => item.id === product.categoryId);
  const colorOptions = Array.from(new Map(productVariants.map((variant) => [normalizeText(variant.colorName), variant])).values());
  const sizeOptions = productVariants.filter((variant) => normalizeText(variant.colorName) === normalizeText(selectedColor) && variant.size);
  const selectedVariant =
    sizeOptions.find((variant) => normalizeText(variant.size) === normalizeText(selectedSize)) ||
    sizeOptions[0] ||
    productVariants[0];
  const selectedOption = selectedVariant
    ? { size: selectedVariant.size, price: selectedVariant.price }
    : product.sizes?.find((option) => option.size === selectedSize) || product.sizes?.[0] || { size: "", price: 0 };
  const typeOptions = product.detailOptions?.productTypes || [
    { id: "standard", label: { en: "Standard bottle", ar: "العبوة الأساسية" }, image: product.image },
  ];
  const selectedTypeOption = typeOptions.find((item) => item.id === selectedType) || typeOptions[0];
  const useOptions = product.detailOptions?.uses || [
    { id: "daily", label: { en: "Daily use", ar: "استخدام يومي" } },
  ];
  const selectedUseOption = useOptions.find((item) => item.id === selectedUse) || useOptions[0];
  const selectedColorImage = sizeOptions.find((variant) => variant.image)?.image;
  const detailImages = {
    ...(product?.detail_section_images || {}),
    ...(product?.detailSectionImages || {}),
  };
  const detailMainImage =
    product?.detailMainImage ||
    product?.detail_main_image ||
    getDetailSectionImage(detailImages, "mainImage", "main_image");
  const practicalBannerImage = getDetailSectionImage(
    detailImages,
    "practicalBanner",
    "practical_banner",
    "bannerStatements",
    "banner_statements",
    "statementBanner",
    "statement_banner"
  );
  const ingredientsImage = getDetailSectionImage(
    detailImages,
    "ingredients",
    "ingredientsImage",
    "ingredients_image"
  );
  const faqImage = getDetailSectionImage(detailImages, "faq", "faqImage", "faq_image");
  const getHowItWorksImage = (stepNumber) =>
    getDetailSectionImage(
      detailImages,
      `howItWorks${stepNumber}`,
      `how_it_works_${stepNumber}`,
      `how_it_works${stepNumber}`,
      "howItWorks",
      "how_it_works"
    );
  const selectedImage =
    detailMainImage ||
    selectedVariant?.image ||
    selectedColorImage ||
    selectedTypeOption?.image ||
    product.image ||
    product.hoverImage ||
    placeholderImage;
  const productName = localized(product.name, language, product.slug);
  const description = localized(
    product.longDescription,
    language,
    localized(product.shortDescription, language, "")
  );
  const features = localized(product.features, language, []);
  const uniqueGallery = [...new Set([selectedImage, ...normalizeProductGallery(product, selectedImage)])].filter(Boolean);
  const staticGalleryImage = uniqueGallery[0] || selectedImage || product.image || placeholderImage;
  const reviews = productReviews;
  const reviewCount = reviews.length;
  const averageRating = reviewCount
    ? reviews.reduce((sum, review) => sum + Number(review?.rating || 0), 0) / reviewCount
    : 0;
  const ratingSummary = formatRatingSummary(reviewCount, averageRating, language);
  const steps = product.usageSteps || getFallbackSteps();
  const safeSurfaces = product.safeSurfaces || getFallbackSurfaces();
  const statements = getStatements();
  const faqItems = product.faq || getFallbackFaq();
  const productInfo = product.productInfo || getFallbackInfo();
  const relatedProducts = Array.isArray(product.relatedProducts)
    ? product.relatedProducts.filter((item) => item?.id && item.id !== product.id)
    : [];
  const frequentlyBoughtTogether = Array.isArray(product.frequentlyBoughtTogether)
    ? product.frequentlyBoughtTogether.filter((item) => item?.id && item.id !== product.id)
    : [];
  const floatingLabel = `${selectedColor !== "Default" ? `${selectedColor} / ` : ""}${selectedOption.size}`;

  function getStatements() {
    const customStatements = product.detailStatements || product.detail_statements;
    if (customStatements?.length) {
      return customStatements.map((s) => (typeof s === "string" ? s : localized(s, language)));
    }
    return localized(product?.statements, language, [
      language === "ar"
        ? "منتج عملي مصمم لتنظيف فعّال وسهولة استخدام يومية."
        : "A practical product designed for effective cleaning and everyday ease of use.",
    ]);
  }

  function getFallbackSteps() {
    return [
      { title: { en: "Apply the product", ar: "ضع المنتج" }, image: product.hoverImage || product.image },
      { title: { en: "Wipe the surface", ar: "امسح السطح" }, image: product.image },
      { title: { en: "Enjoy a clean result", ar: "استمتع بنتيجة نظيفة" }, image: product.hoverImage || product.image },
    ];
  }

  function getFallbackSurfaces() {
    return [
      {
        id: "general",
        label: { en: "Suitable surfaces", ar: "الأسطح المناسبة" },
        tags: { en: ["Washable surfaces", "Tiles", "Metal"], ar: ["الأسطح القابلة للغسل", "البلاط", "المعادن"] },
      },
    ];
  }

  function getFallbackFaq() {
    return [
      {
        question: { en: "How do I use this product?", ar: "كيف أستخدم هذا المنتج؟" },
        answer: {
          en: "Follow the product instructions, test on a hidden area first, then rinse or wipe as recommended.",
          ar: "اتبع تعليمات المنتج، جرّبه على منطقة مخفية أولًا، ثم اشطف أو امسح حسب التوصية.",
        },
      },
    ];
  }

  function getFallbackInfo() {
    return [
      {
        title: { en: "Usage instructions", ar: "طريقة الاستخدام" },
        text: {
          en: "Apply as directed and test on a small hidden area first.",
          ar: "استخدمه حسب التعليمات وجرّبه على منطقة صغيرة غير ظاهرة أولًا.",
        },
      },
    ];
  }

  function handleAddSelectedToCart() {
    if (selectedVariant?.stock <= 0) {
      return;
    }

    for (let count = 0; count < quantity; count += 1) {
      onAddToCart(product, selectedOption.size, selectedVariant);
    }
  }

  function scrollTrack(ref, direction) {
    const track = ref.current;
    if (!track) return;
    const amount = track.clientWidth * 0.82;
    track.scrollBy({ left: direction * amount * (language === "ar" ? -1 : 1), behavior: "smooth" });
  }

  function handleStatementDragEnd(clientX) {
    if (dragStart === null) return;
    const delta = clientX - dragStart;
    if (Math.abs(delta) > 48) {
      setActiveStatement((current) =>
        delta > 0
          ? (current - 1 + statements.length) % statements.length
          : (current + 1) % statements.length
      );
    }
    setDragStart(null);
  }

  return (
    <main className="product-detail-redesign">
      <section className="detail-kinfill-hero">
        <div className="detail-kinfill-media">
          {product.badge && <span className="detail-subscribe-badge">{localized(product.badge, language)}</span>}
          <div className="detail-kinfill-main-column">
            <div className="detail-kinfill-main-sticky">
              <img
                className="current-product-image"
                alt={productName}
                src={safeImage(selectedImage)}
                loading="eager"
                decoding="async"
                onError={(e) => { e.currentTarget.src = placeholderImage; }}
              />
            </div>
          </div>

          <div className="detail-kinfill-gallery-column" ref={galleryScrollRef}>
            {uniqueGallery.slice(1).map((image, index) => (
              <picture className="detail-kinfill-gallery-picture" key={image || index}>
                <img
                  className="detail-kinfill-gallery-image"
                  alt={`${productName} ${index + 2}`}
                  src={safeImage(image)}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => { e.currentTarget.src = placeholderImage; }}
                />
              </picture>
            ))}
          </div>
        </div>

        <aside className="detail-purchase-panel product-detail-info-panel">
          <div className="pi-section-header">
            <button className="pi-back" onClick={() => onNavigate("products")} type="button">
              {txt.back}
            </button>
            {product.badge && <span className="pi-badge">{localized(product.badge, language)}</span>}
            <p className="pi-eyebrow">{localized(category?.name, language)}</p>
            <h1>{productName}</h1>
            {productConditionLabel(product.condition, txt) ? (
              <p className="pi-condition">{txt.condition}: {productConditionLabel(product.condition, txt)}</p>
            ) : null}
            <p className="pi-desc">{description}</p>
            <div className="pi-rating">
              {reviewCount > 0 && <span>{ratingStarsRow(averageRating)}</span>}
              <span>{ratingSummary}</span>
            </div>
          </div>

          {typeOptions.length > 0 && (
            <div className="pi-card-field">
              <p className="pi-label">{txt.type}</p>
              <div className="pi-card-grid two-col">
                {typeOptions.map((option) => (
                  <button
                    className={selectedType === option.id ? "pi-card active" : "pi-card"}
                    key={option.id}
                    onClick={() => setSelectedType(option.id)}
                    type="button"
                  >
                    <ProductImage alt={localized(option.label, language)} src={option.image || product.image} />
                    <span>{localized(option.label, language)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pi-segmented">
            <button
              className={purchaseType === "one-time" ? "pi-segment active" : "pi-segment"}
              onClick={() => setPurchaseType("one-time")}
              type="button"
            >
              {txt.oneTime}
            </button>
            <button
              className={purchaseType === "refill" ? "pi-segment active" : "pi-segment"}
              onClick={() => setPurchaseType("refill")}
              type="button"
            >
              {txt.refillPlan}
            </button>
          </div>

          {colorOptions.length > 1 && (
            <div className="pi-color-field">
              <p className="pi-label">{language === "ar" ? "اللون" : "Color"}</p>
              <div className="pi-color-card">
                <ProductImage alt="" src={selectedImage} />
                <div>
                  <p>{language === "ar" ? "اختر اللون" : "Choose your Color"}</p>
                  <div className="pi-color-swatches">
                    {colorOptions.map((option) => (
                      <button
                        className={selectedColor === option.colorName ? "pi-color-swatch active" : "pi-color-swatch"}
                        key={option.colorName}
                        onClick={() => setSelectedColor(option.colorName)}
                        style={{ background: option.colorValue || "#1db7d8" }}
                        title={option.colorName}
                        type="button"
                      />
                    ))}
                  </div>
                  <span className="pi-color-name">{selectedColor}</span>
                </div>
              </div>
            </div>
          )}

          <div className="pi-pill-grid">
            {sizeOptions.length > 0 && (
              <div>
                <p className="pi-label">{txt.size}</p>
                <div className="pi-pill-row">
                  {sizeOptions.map((option) => (
                    <button
                      className={selectedSize === option.size ? "pi-pill active" : "pi-pill"}
                      disabled={option.stock <= 0}
                      key={option.size}
                      onClick={() => setSelectedSize(option.size)}
                      type="button"
                    >
                      {option.size}
                      {option.stock <= 0 ? ` ${language === "ar" ? "(غير متوفر)" : "(Out)"}` : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="pi-label">{txt.use}</p>
              <div className="pi-pill-row">
                {useOptions.map((option) => (
                  <button
                    className={selectedUse === option.id ? "pi-pill active" : "pi-pill"}
                    key={option.id}
                    onClick={() => setSelectedUse(option.id)}
                    type="button"
                  >
                    {localized(option.label, language)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pi-cta-bar">
            <div className="pi-price">{selectedOption.price} {t("common.ils")}</div>
            <div className="pi-qty-row">
              <button
                onClick={() => setQuantity((value) => {
                  const minQty = Number(product?.minPurchaseQuantity);
                  const floor = Number.isInteger(minQty) && minQty >= 1 ? minQty : 1;
                  return Math.max(floor, value - 1);
                })}
                type="button"
              >
                −
              </button>
              <span>{quantity}</span>
              <button
                onClick={() => setQuantity((value) => {
                  const maxQty = Number(product?.maxPurchaseQuantity);
                  const next = value + 1;
                  if (Number.isInteger(maxQty) && maxQty >= 1) return Math.min(maxQty, next);
                  return next;
                })}
                type="button"
              >
                +
              </button>
            </div>
            {(product?.minPurchaseQuantity != null || product?.maxPurchaseQuantity != null) && (
              <p className="pi-qty-limits">
                {product?.minPurchaseQuantity != null ? `Min ${product.minPurchaseQuantity}` : null}
                {product?.minPurchaseQuantity != null && product?.maxPurchaseQuantity != null ? " · " : null}
                {product?.maxPurchaseQuantity != null ? `Max ${product.maxPurchaseQuantity}` : null}
              </p>
            )}
            <button className="pi-add-btn" disabled={selectedVariant?.stock <= 0} onClick={handleAddSelectedToCart} type="button">
              <ShoppingBag size={18} />
              {txt.addToCart}
            </button>
          </div>

          <div className="pi-accordion">
            {features.length > 0 && (
              <div className={openAccordionIndex === 0 ? "pi-accordion-item open" : "pi-accordion-item"}>
                <button className="pi-accordion-trigger" onClick={() => setOpenAccordionIndex(openAccordionIndex === 0 ? null : 0)} type="button">
                  <span>{txt.whatYouGet}</span>
                  <span className="pi-accordion-icon">+</span>
                </button>
                <div className="pi-accordion-body">
                  <div className="pi-accordion-inner">
                    <ul className="pi-feature-list">
                      {features.slice(0, 5).map((feature) => (
                        <li key={feature}><CheckCircle2 size={15} /> {feature}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {product.usageNotes && (
              <div className={openAccordionIndex === 1 ? "pi-accordion-item open" : "pi-accordion-item"}>
                <button className="pi-accordion-trigger" onClick={() => setOpenAccordionIndex(openAccordionIndex === 1 ? null : 1)} type="button">
                  <span>{txt.usageNote}</span>
                  <span className="pi-accordion-icon">+</span>
                </button>
                <div className="pi-accordion-body">
                  <div className="pi-accordion-inner">
                    <p>{localized(product.usageNotes, language)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </section>

      <section className="detail-reviews-section">
        <div className="detail-section-title center">
          <h2>{txt.reviews}</h2>
          <p>{ratingSummary}</p>
        </div>
        {reviewsStatus === "loading" ? (
          <p className="detail-reviews-state">{txt.reviewsLoading}</p>
        ) : reviewsStatus === "error" || reviewCount === 0 ? (
          <p className="detail-reviews-state">
            {reviewsStatus === "error" ? txt.reviewsError : txt.noReviewsText}
          </p>
        ) : (
          <div className="detail-slider-shell">
            <SliderButton direction="prev" onClick={() => scrollTrack(reviewsRef, -1)} />
            <div className="detail-reviews-track" ref={reviewsRef}>
              {reviews.map((review, index) => (
                <article className="detail-review-card" key={`${review?.id || "review"}-${index}`}>
                  <div className="detail-stars">{Array.from({ length: Math.max(1, Math.min(5, Number(review?.rating || 5))) }).map((_, star) => <Star fill="currentColor" key={star} size={18} />)}</div>
                  <p>{localized(review?.comment, language)}</p>
                  <strong>{typeof review?.customerName === "string" ? review.customerName : localized(review?.customerName, language, "Customer")} <CheckCircle2 size={16} /></strong>
                </article>
              ))}
            </div>
            <SliderButton direction="next" onClick={() => scrollTrack(reviewsRef, 1)} />
          </div>
        )}
      </section>

      <section className="detail-how-section">
        <div className="detail-how-copy">
          <h2>{txt.how}</h2>
          <div className="detail-step-line">
            <span>{activeStep + 1}</span>
            <strong>{localized(steps[activeStep]?.title, language)}</strong>
          </div>
          <button className="detail-next-step" onClick={() => setActiveStep((activeStep + 1) % steps.length)} type="button">
            {language === "ar" ? <ChevronLeft size={34} /> : <ChevronRight size={34} />}
          </button>
          <div className="detail-step-thumbs">
            {steps.map((step, index) => (
              <button className={activeStep === index ? "active" : ""} key={`${localized(step.title, language)}-${index}`} onClick={() => setActiveStep(index)} type="button">
                <ProductImage alt={localized(step.title, language)} src={getHowItWorksImage(index + 1) || step.image || product.image || placeholderImage} />
              </button>
            ))}
          </div>
        </div>
        <figure className="detail-how-image">
          <ProductImage alt={localized(steps[activeStep]?.title, language)} src={getHowItWorksImage(activeStep + 1) || steps[activeStep]?.image || product.image || placeholderImage} />
        </figure>
      </section>

      <section className="detail-impact-section" ref={impactRef}>
        <h2>{txt.impact}</h2>
        <div className="detail-impact-images">
          <ProductImage
            alt={productName}
            className="impact-left"
            src={detailImages.impact1 || detailImages.impact || product.image}
            style={{ transform: `translateY(${parallax * 82}px) rotate(${-6 - parallax * 2}deg)` }}
          />
          <ProductImage
            alt={productName}
            className="impact-right"
            src={detailImages.impact2 || detailImages.impact || product.hoverImage || product.image}
            style={{ transform: `translate(${parallax * 74}px, ${parallax * -96}px) rotate(${6 + parallax * 2}deg)` }}
          />
        </div>
      </section>

      <section className="detail-safe-section">
        <figure>
          <ProductImage alt={productName} src={detailImages.safeToUse || product.hoverImage || product.image} />
        </figure>
        <div className="detail-safe-copy">
          <h2>{txt.safe}</h2>
          <div className="detail-surface-tabs">
            {safeSurfaces.map((surface, index) => (
              <button className={activeSurface === index ? "active" : ""} key={surface.id || index} onClick={() => setActiveSurface(index)} type="button">
                {localized(surface.label, language)}
              </button>
            ))}
          </div>
          <div className="detail-surface-tags">
            {localized(safeSurfaces[activeSurface]?.tags, language, []).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <p className="detail-safety-note">
            {localized(safeSurfaces[activeSurface]?.note, language, txt.surfaceNote)}
          </p>
        </div>
      </section>

      <section
        className="detail-statement-carousel"
        onMouseDown={(event) => setDragStart(event.clientX)}
        onMouseUp={(event) => handleStatementDragEnd(event.clientX)}
        onTouchEnd={(event) => handleStatementDragEnd(event.changedTouches[0]?.clientX || 0)}
        onTouchStart={(event) => setDragStart(event.touches[0]?.clientX || 0)}
      >
        <ProductImage alt={productName} src={practicalBannerImage || product.hoverImage || product.image || placeholderImage} />
        <div className="detail-statement-track" style={{ transform: `translateX(${language === "ar" ? activeStatement * 100 : activeStatement * -100}%)` }}>
          {statements.map((statement, index) => (
            <h2 key={`${statement}-${index}`}>{statement}</h2>
          ))}
        </div>
        <div className="detail-statement-dots">
          {statements.map((statement, index) => (
            <button aria-label={statement} className={activeStatement === index ? "active" : ""} key={`${statement}-dot`} onClick={() => setActiveStatement(index)} type="button" />
          ))}
        </div>
      </section>

      <section className="detail-formula-section">
        <div>
          <h2>{txt.formulaTitle}</h2>
          <p>{txt.formulaText}</p>
          <button className="detail-light-button" type="button">{txt.ingredients}</button>
        </div>
        <figure>
          <ProductImage alt={productName} src={ingredientsImage || product.image || placeholderImage} />
        </figure>
      </section>

      {relatedProducts.length > 0 && (
        <section className="detail-related-section">
          <div className="detail-section-title split">
            <h2>{txt.related}</h2>
            <div>
              <SliderButton direction="prev" onClick={() => scrollTrack(relatedRef, -1)} />
              <SliderButton direction="next" onClick={() => scrollTrack(relatedRef, 1)} />
            </div>
          </div>
          <div className="detail-related-track" ref={relatedRef}>
            {relatedProducts.map((item) => {
              const mainImage = item.image || placeholderImage;
              const hoverImage = item.hoverImage || item.secondaryImage || item.galleryImages?.[1] || mainImage;
              const price = item.sizes?.[0]?.price ?? item.price;
              return (
                <article className="detail-related-card" key={item.id}>
                  <button className="detail-related-image" onClick={() => onViewProduct(item.slug)} type="button">
                    {item.badge && <span>{localized(item.badge, language)}</span>}
                    <ProductImage alt={localized(item.name, language)} className="related-main" src={mainImage} />
                    <ProductImage alt="" className="related-hover" src={hoverImage} />
                  </button>
                  <button className="detail-related-name" onClick={() => onViewProduct(item.slug)} type="button">
                    {localized(item.name, language)}
                  </button>
                  <p>{localized(item.shortDescription, language)}</p>
                  <strong>{txt.from} {price} {t("common.ils")}</strong>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {frequentlyBoughtTogether.length > 0 && (
        <section className="detail-related-section detail-fbt-section">
          <div className="detail-section-title split">
            <h2>{txt.fbt}</h2>
            <div>
              <SliderButton direction="prev" onClick={() => scrollTrack(fbtRef, -1)} />
              <SliderButton direction="next" onClick={() => scrollTrack(fbtRef, 1)} />
            </div>
          </div>
          <div className="detail-related-track" ref={fbtRef}>
            {frequentlyBoughtTogether.map((item) => {
              const mainImage = item.image || placeholderImage;
              const hoverImage = item.hoverImage || item.secondaryImage || item.galleryImages?.[1] || mainImage;
              const price = item.sizes?.[0]?.price ?? item.price;
              return (
                <article className="detail-related-card" key={item.id}>
                  <button className="detail-related-image" onClick={() => onViewProduct(item.slug)} type="button">
                    {item.badge && <span>{localized(item.badge, language)}</span>}
                    <ProductImage alt={localized(item.name, language)} className="related-main" src={mainImage} />
                    <ProductImage alt="" className="related-hover" src={hoverImage} />
                  </button>
                  <button className="detail-related-name" onClick={() => onViewProduct(item.slug)} type="button">
                    {localized(item.name, language)}
                  </button>
                  <p>{localized(item.shortDescription, language)}</p>
                  <strong>{txt.from} {price} {t("common.ils")}</strong>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="detail-faq-section">
        <figure>
          <ProductImage alt={productName} src={faqImage || product.hoverImage || product.image || placeholderImage} />
        </figure>
        <div>
          <h2>{txt.faqTitle}</h2>
          <p>{txt.faqText}</p>
          <AccordionList items={faqItems} language={language} />
          <h3>{txt.productInfo}</h3>
          <AccordionList items={productInfo} language={language} />
        </div>
      </section>

      <FloatingAddToCart language={language} onAdd={handleAddSelectedToCart} product={product} selectedLabel={floatingLabel} txt={txt} />
    </main>
  );
}

export default ProductDetailsPage;
