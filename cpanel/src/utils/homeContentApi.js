import {
  homepageCategoryCards as fallbackCategoryCards,
} from "../data/homeContent.js";
import { apiRequest, apiBaseUrl } from "./api.js";
import { storefrontTenantHeaders } from "./storefrontContentApi.js";

// Honest storefront homepage offers: real stored home-offers for the current
// tenant only. Anonymous storefront-scoped call using the shared storefront
// tenant context (VITE_STOREFRONT_COMPANY_ID / VITE_STOREFRONT_SITE_ID):
// never reads CPanel localStorage, never sends an empty x-company-id, and
// NEVER attaches the CPanel Bearer token (the homepage is public). Failures
// throw so the caller renders an honest error state (with retry) — never
// fallback/fake offers. A non-array payload resolves to [] (honest empty).
export async function fetchStorefrontHomepageOffers(options = {}) {
  const headers = storefrontTenantHeaders(options.env);
  const data = await storefrontApiRequest(
    "/home-offers",
    Object.keys(headers).length ? { headers } : {},
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchHomepageOffers(options = {}) {
  return fetchStorefrontHomepageOffers(options);
}

export async function fetchAllHomepageOffers() {
  return apiRequest("/home-offers/all");
}

export async function fetchHomepageCategoryCards() {
  try {
    return await apiRequest("/home-offers/category-cards");
  } catch (error) {
    return fallbackCategoryCards;
  }
}

export async function fetchAllHomepageCategoryCards() {
  return apiRequest("/home-offers/category-cards/all");
}

export async function saveHomepageCategoryCard(card) {
  return apiRequest(`/home-offers/category-cards/${card.key}`, {
    method: "PUT",
    body: JSON.stringify(card),
  });
}

export async function saveHomepageOffer(offer) {
  const exists = Boolean(offer.id);
  return apiRequest(exists ? `/home-offers/${offer.id}` : "/home-offers", {
    method: exists ? "PUT" : "POST",
    body: JSON.stringify(offer),
  });
}

export async function deleteHomepageOffer(offerId) {
  return apiRequest(`/home-offers/${offerId}`, {
    method: "DELETE",
  });
}

export async function fetchReviews() {
  try {
    return await apiRequest("/reviews");
  } catch (error) {
    return [];
  }
}

export async function fetchAllReviews() {
  return apiRequest("/reviews/all");
}

export async function storefrontApiRequest(path, options = {}) {
  const url = `${apiBaseUrl}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.message || "Storefront API request failed.";
    const error = new Error(message);
    error.status = response.status;
    error.code = data.code || "";
    error.errors = data.errors && typeof data.errors === "object" ? data.errors : {};
    error.response = data;
    throw error;
  }
  return data;
}

// Real approved/visible reviews for one storefront product. Makes an anonymous
// storefront-scoped call using the shared storefront tenant context
// (VITE_STOREFRONT_COMPANY_ID / VITE_STOREFRONT_SITE_ID): never reads CPanel
// localStorage, never sends an empty x-company-id, and NEVER attaches the
// CPanel Bearer token (product pages are public/embedded).
export async function fetchProductReviews(productId, options = {}) {
  const headers = storefrontTenantHeaders(options.env);
  const data = await storefrontApiRequest(
    `/reviews/product/${encodeURIComponent(productId)}`,
    Object.keys(headers).length ? { headers } : {},
  );
  return Array.isArray(data) ? data : [];
}

// Honest ratings for the storefront products listing: real approved reviews
// per product via the existing per-product endpoint (same source the product
// details page uses). Anonymous storefront-scoped calls with the shared
// storefront tenant context (inherited from fetchProductReviews): never reads
// CPanel localStorage, never sends an empty x-company-id, NEVER attaches the
// CPanel Bearer token. Each product resolves independently — a failure for one
// product yields no entry for that card (honest empty), never fake ratings,
// and never rejects the whole map.
export async function fetchProductListRatings(productIds, options = {}) {
  const ids = Array.from(
    new Set((Array.isArray(productIds) ? productIds : []).map((id) => String(id || "").trim()).filter(Boolean)),
  );
  const entries = await Promise.all(
    ids.map(async (productId) => {
      try {
        const reviews = await fetchProductReviews(productId, options);
        const list = Array.isArray(reviews) ? reviews : [];
        const count = list.length;
        const total = list.reduce((sum, review) => sum + Number(review?.rating || 0), 0);
        return [productId, { count, average: count ? Math.round((total / count) * 100) / 100 : 0 }];
      } catch (error) {
        return [productId, null];
      }
    }),
  );
  const ratings = {};
  for (const [productId, summary] of entries) {
    if (summary) ratings[productId] = summary;
  }
  return ratings;
}

// Honest storefront homepage reviews: real approved website/store/site
// reviews for the current tenant only. Anonymous storefront-scoped calls
// using the shared storefront tenant context (VITE_STOREFRONT_COMPANY_ID /
// VITE_STOREFRONT_SITE_ID): never reads CPanel localStorage, never sends an
// empty x-company-id, and NEVER attaches the CPanel Bearer token (the
// homepage is public). Any failure resolves to [] so the homepage renders
// an honest empty state — never fallback/fake reviews.
export async function fetchHomepageStoreReviews(options = {}) {
  const headers = storefrontTenantHeaders(options.env);
  const requestOptions = Object.keys(headers).length ? { headers } : {};
  const types = ["website", "store", "site"];
  const results = await Promise.all(
    types.map(async (type) => {
      try {
        const data = await storefrontApiRequest(
          `/reviews?type=${encodeURIComponent(type)}`,
          requestOptions,
        );
        return Array.isArray(data) ? data : [];
      } catch (error) {
        return [];
      }
    }),
  );
  const seen = new Set();
  return results
    .flat()
    .filter((review) => {
      const id = review?.id;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export async function saveReview(review) {
  const exists = Boolean(review.id);
  return apiRequest(exists ? `/reviews/${review.id}` : "/reviews", {
    method: exists ? "PUT" : "POST",
    body: JSON.stringify(review),
  });
}

export async function updateReviewStatus(reviewId, status, isActive = true) {
  return apiRequest(`/reviews/${reviewId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status, isActive }),
  });
}

// Feature/unfeature an approved review via the existing status endpoint. The
// backend only allows featured=true on approved reviews, so the payload always
// carries status "approved" (rejected/hidden reviews can never be featured).
export async function updateReviewFeatured(reviewId, featured) {
  return apiRequest(`/reviews/${reviewId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status: "approved", featured: Boolean(featured) }),
  });
}

export async function submitCustomerReview(review) {
  return apiRequest("/reviews", {
    method: "POST",
    body: JSON.stringify(review),
  });
}

export async function deleteReview(reviewId) {
  return apiRequest(`/reviews/${reviewId}`, {
    method: "DELETE",
  });
}
