import React from "react";
import { Upload } from "lucide-react";
import { uploadImage } from "../utils/api.js";
import ProductPicker from "./ProductPicker.jsx";

const emptyOffer = {
  id: "",
  titleEn: "",
  titleAr: "",
  descriptionEn: "",
  descriptionAr: "",
  image: "/images/products/product-placeholder.svg",
  ctaTextEn: "Shop now",
  ctaTextAr: "تسوق الآن",
  ctaLink: "products",
  displayOrder: 1,
  isActive: true,
  productIds: [],
};

function offerToForm(offer) {
  if (!offer) return emptyOffer;
  return {
    id: offer.id || "",
    titleEn: offer.title?.en || "",
    titleAr: offer.title?.ar || "",
    descriptionEn: offer.description?.en || "",
    descriptionAr: offer.description?.ar || "",
    image: offer.image || "/images/products/product-placeholder.svg",
    ctaTextEn: offer.ctaText?.en || "Shop now",
    ctaTextAr: offer.ctaText?.ar || "تسوق الآن",
    ctaLink: offer.ctaLink || "products",
    displayOrder: offer.displayOrder || 1,
    isActive: offer.isActive !== false,
    productIds: Array.isArray(offer.productIds) ? offer.productIds.map(String) : [],
  };
}

function formToOffer(form) {
  return {
    id: form.id || "",
    title: {
      en: form.titleEn,
      ar: form.titleAr,
    },
    description: {
      en: form.descriptionEn,
      ar: form.descriptionAr,
    },
    image: form.image,
    ctaText: {
      en: form.ctaTextEn,
      ar: form.ctaTextAr,
    },
    ctaLink: form.ctaLink,
    displayOrder: Number(form.displayOrder || 0),
    isActive: Boolean(form.isActive),
    productIds: Array.isArray(form.productIds) ? form.productIds.map(String) : [],
  };
}

function getCardTitle(card, language) {
  return card?.title?.[language] || card?.title?.en || card?.label?.[language] || card?.label?.en || card?.key || "";
}

function HomeContentManager({
  canDelete = false,
  categoryCards = [],
  language,
  offers = [],
  onDeleteOffer,
  onDeleteReview,
  onModerateReview,
  onSaveCategoryCard,
  onSaveOffer,
  products = [],
  reviews = [],
  t,
}) {
  const [editingOffer, setEditingOffer] = React.useState(null);
  const [form, setForm] = React.useState(emptyOffer);
  const [cards, setCards] = React.useState(categoryCards);
  const [isSaving, setIsSaving] = React.useState(false);
  const [uploadingOffer, setUploadingOffer] = React.useState(false);
  const [uploadingCardKey, setUploadingCardKey] = React.useState("");
  const [savingCardKey, setSavingCardKey] = React.useState("");

  React.useEffect(() => {
    setForm(offerToForm(editingOffer));
  }, [editingOffer]);

  React.useEffect(() => {
    setCards(categoryCards);
  }, [categoryCards]);

  function updateField(event) {
    const { checked, name, type, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function updateCardField(key, field, value) {
    setCards((currentCards) =>
      currentCards.map((card) => (card.key === key ? { ...card, [field]: value } : card))
    );
  }

  function updateCardText(key, group, lang, value) {
    setCards((currentCards) =>
      currentCards.map((card) =>
        card.key === key
          ? {
              ...card,
              [group]: {
                ...(card[group] || {}),
                [lang]: value,
              },
            }
          : card
      )
    );
  }

  async function submitOffer(event) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await onSaveOffer?.(formToOffer(form));
      setEditingOffer(null);
      setForm(emptyOffer);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleOfferUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingOffer(true);
    try {
      const uploaded = await uploadImage(file);
      setForm((currentForm) => ({ ...currentForm, image: uploaded.path || uploaded.url }));
    } finally {
      setUploadingOffer(false);
      event.target.value = "";
    }
  }

  async function handleCardUpload(key, event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingCardKey(key);
    try {
      const uploaded = await uploadImage(file);
      updateCardField(key, "image", uploaded.path || uploaded.url);
    } finally {
      setUploadingCardKey("");
      event.target.value = "";
    }
  }

  async function saveCard(card) {
    setSavingCardKey(card.key);
    try {
      await onSaveCategoryCard?.(card);
    } finally {
      setSavingCardKey("");
    }
  }

  return (
    <section className="admin-section home-content-manager">
      <div className="section-heading split-heading">
        <div>
          <p className="eyebrow">{t("homeContent.eyebrow")}</p>
          <h2>{t("homeContent.title")}</h2>
        </div>
      </div>

      <section className="homepage-card-editor">
        <div className="admin-section-head">
          <div>
            <h3>{t("homeContent.cardImagesTitle")}</h3>
            <p>{t("homeContent.cardImagesText")}</p>
          </div>
        </div>
        <div className="homepage-card-grid">
          {cards.map((card) => (
            <article className="homepage-card-admin" key={card.key}>
              <div className="homepage-card-preview">
                <img alt={getCardTitle(card, language)} src={card.image} />
              </div>
              <div className="homepage-card-fields">
                <strong>{getCardTitle(card, language)}</strong>
                <label>
                  {t("homeContent.cardImagePath")}
                  <input value={card.image || ""} onChange={(event) => updateCardField(card.key, "image", event.target.value)} />
                </label>
                <label>
                  {t("homeContent.titleEn")}
                  <input value={card.title?.en || ""} onChange={(event) => updateCardText(card.key, "title", "en", event.target.value)} />
                </label>
                <label>
                  {t("homeContent.titleAr")}
                  <input value={card.title?.ar || ""} onChange={(event) => updateCardText(card.key, "title", "ar", event.target.value)} />
                </label>
                <div className="home-content-upload-line">
                  <label className="secondary-action compact-action">
                    <Upload size={14} />
                    {uploadingCardKey === card.key ? t("common.temporaryContent") : t("homeContent.cardUpload")}
                    <input accept="image/*" hidden type="file" onChange={(event) => handleCardUpload(card.key, event)} />
                  </label>
                  <button className="primary-action compact-action" onClick={() => saveCard(card)} type="button">
                    {savingCardKey === card.key ? t("common.temporaryContent") : t("homeContent.saveCard")}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <form className="admin-form-grid home-offers-form" onSubmit={submitOffer}>
        <h3>{editingOffer ? t("homeContent.editOffer") : t("homeContent.addOffer")}</h3>
        <fieldset className="home-offers-lang-group">
          <legend>{language === "ar" ? "الإنجليزية" : "English"}</legend>
          <label>
            {t("homeContent.titleEn")}
            <input name="titleEn" onChange={updateField} required value={form.titleEn} />
          </label>
          <label>
            {t("homeContent.descriptionEn")}
            <textarea name="descriptionEn" onChange={updateField} rows={3} value={form.descriptionEn} />
          </label>
          <label>
            {t("homeContent.ctaTextEn")}
            <input name="ctaTextEn" onChange={updateField} value={form.ctaTextEn} />
          </label>
        </fieldset>
        <fieldset className="home-offers-lang-group">
          <legend>{language === "ar" ? "العربية" : "Arabic"}</legend>
          <label>
            {t("homeContent.titleAr")}
            <input name="titleAr" onChange={updateField} required value={form.titleAr} />
          </label>
          <label>
            {t("homeContent.descriptionAr")}
            <textarea name="descriptionAr" onChange={updateField} rows={3} value={form.descriptionAr} />
          </label>
          <label>
            {t("homeContent.ctaTextAr")}
            <input name="ctaTextAr" onChange={updateField} value={form.ctaTextAr} />
          </label>
        </fieldset>
        <label className="full-field">
          {t("homeContent.image")}
          <input name="image" onChange={updateField} value={form.image} />
        </label>
        <div className="full-field home-content-upload-line">
          <label className="secondary-action compact-action">
            <Upload size={14} />
            {uploadingOffer ? t("common.temporaryContent") : t("homeContent.uploadOfferImage")}
            <input accept="image/*" hidden type="file" onChange={handleOfferUpload} />
          </label>
          {form.image ? (
            <div className="homepage-offer-preview">
              <img alt={t("homeContent.offerImagePreview")} src={form.image} />
            </div>
          ) : null}
        </div>
        <label>
          {t("homeContent.ctaLink")}
          <input name="ctaLink" onChange={updateField} value={form.ctaLink} />
        </label>
        <label>
          {t("homeContent.displayOrder")}
          <input name="displayOrder" onChange={updateField} type="number" value={form.displayOrder} />
        </label>
        <label className="checkbox-field">
          <input checked={form.isActive} name="isActive" onChange={updateField} type="checkbox" />
          {t("homeContent.isActive")}
        </label>
        <div className="full-field">
          <strong>{language === "ar" ? "منتجات العرض المحدود" : "Limited offer products"}</strong>
          <p className="admin-note">
            {language === "ar"
              ? "اربط منتجات من كتالوج شركتك بهذا العرض. لا تستخدم حقل limitedOffer على المنتج."
              : "Attach tenant products to this homepage offer. Product discounts stay in promotions-discounts; no limitedOffer product field."}
          </p>
          <ProductPicker
            language={language}
            onChange={(ids) => setForm((current) => ({ ...current, productIds: ids }))}
            products={products}
            selectedIds={form.productIds || []}
          />
        </div>
        <div className="form-actions full-field">
          <button className="primary-action" disabled={isSaving} type="submit">
            {isSaving ? t("common.temporaryContent") : t("admin.save")}
          </button>
          <button className="secondary-action" onClick={() => setEditingOffer(null)} type="button">
            {t("admin.cancel")}
          </button>
        </div>
      </form>

      <section className="home-offers-list">
        <div className="admin-section-head">
          <div>
            <h3>{t("homeContent.offersListTitle")}</h3>
          </div>
        </div>
        <div className="content-admin-list">
          {offers.map((offer) => (
            <article className="content-admin-card" key={offer.id}>
              <img alt={offer.title?.[language] || offer.title?.en} src={offer.image} />
              <div>
                <strong>{offer.title?.[language] || offer.title?.en}</strong>
                <span>{offer.isActive ? t("homeContent.active") : t("homeContent.hidden")}</span>
                {Array.isArray(offer.productIds) && offer.productIds.length > 0 ? (
                  <small>{language === "ar" ? `${offer.productIds.length} منتجات` : `${offer.productIds.length} products`}</small>
                ) : null}
              </div>
              <button className="text-action" onClick={() => setEditingOffer(offer)} type="button">
                {t("admin.editProduct")}
              </button>
              {canDelete && (
                <button className="text-action danger" onClick={() => onDeleteOffer?.(offer.id)} type="button">
                  {t("admin.delete")}
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      <div className="reviews-admin-panel">
        <h3>{t("reviews.manageTitle")}</h3>
        {reviews.length === 0 ? (
          <p>{t("reviews.noReviews")}</p>
        ) : (
          reviews.map((review) => (
            <article className="review-mini-row" key={review.id}>
              <div className="review-moderation-head">
                <strong>{review.customerName}</strong>
                <span>{review.type === "employee" ? t("reviews.employeeReview") : t("reviews.storeReview")}</span>
              </div>
              <span className="review-stars-inline">{"★".repeat(Number(review.rating || 0))}</span>
              <p>{review.comment?.[language] || review.comment?.en || review.comment}</p>
              {review.employeeName && <small>{review.employeeName}</small>}
              {review.orderId && <small>{review.orderId}</small>}
              <small>
                {review.status === "rejected"
                  ? t("reviews.rejected")
                  : review.status === "approved"
                    ? t("reviews.approved")
                    : t("reviews.pending")}
                {" / "}
                {review.isActive ? t("homeContent.active") : t("homeContent.hidden")}
              </small>
              {onModerateReview && (
                <div className="review-moderation-actions">
                  <button className="secondary-action" onClick={() => onModerateReview(review.id, "approved", true)} type="button">
                    {t("reviews.approve")}
                  </button>
                  <button className="secondary-action" onClick={() => onModerateReview(review.id, "approved", false)} type="button">
                    {t("reviews.hide")}
                  </button>
                  <button className="secondary-action" onClick={() => onModerateReview(review.id, "approved", true)} type="button">
                    {t("reviews.show")}
                  </button>
                  <button className="secondary-action" onClick={() => onModerateReview(review.id, "rejected", false)} type="button">
                    {t("reviews.reject")}
                  </button>
                  {canDelete && (
                    <button className="text-action danger" onClick={() => onDeleteReview?.(review.id)} type="button">
                      {t("admin.delete")}
                    </button>
                  )}
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export default HomeContentManager;
