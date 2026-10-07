import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("storefront product details load real product reviews from the existing API", () => {
  const details = read("src/pages/ProductDetailsPage.jsx");
  const api = read("src/utils/homeContentApi.js");
  // The page calls the real per-product reviews endpoint — no fake content.
  assert.match(api, /fetchProductReviews/);
  assert.match(api, /\/reviews\/product\//);
  assert.match(details, /fetchProductReviews\(productId\)/);
  assert.match(details, /import \{ fetchProductReviews \}/);
  // The hardcoded rating line and the fallback fake review are gone.
  assert.doesNotMatch(details, /4\.94/);
  assert.doesNotMatch(details, /ratingLine/);
  assert.doesNotMatch(details, /getFallbackReviews/);
  assert.doesNotMatch(details, /EB Customer/);
  assert.doesNotMatch(details, /Verified EB Chemical review/);
});

test("review count and average rating are derived from real data", () => {
  const details = read("src/pages/ProductDetailsPage.jsx");
  // Count comes from the fetched reviews array.
  assert.match(details, /const reviewCount = reviews\.length;/);
  // Average is computed from the same real array.
  assert.match(details, /reviews\.reduce\(\(sum, review\) => sum \+ Number\(review\?\.rating \|\| 0\), 0\) \/ reviewCount/);
  // The summary line is built from the derived values, never a constant.
  assert.match(details, /formatRatingSummary\(reviewCount, averageRating, language\)/);
  assert.doesNotMatch(details, /66 reviews/);
  assert.doesNotMatch(details, /66 تقييم/);
});

test("zero-review state is honest: no fake customers and a safe error state", () => {
  const details = read("src/pages/ProductDetailsPage.jsx");
  // Loading / error / empty states exist and render text, not fake reviews.
  assert.match(details, /reviewsStatus === "loading"/);
  assert.match(details, /reviewsStatus === "error"/);
  assert.match(details, /txt\.noReviewsText/);
  assert.match(details, /txt\.reviewsError/);
  assert.match(details, /txt\.reviewsLoading/);
  // The review track only renders from the fetched list — no seeded names.
  assert.match(details, /reviews\.map\(\(review, index\)/);
  assert.doesNotMatch(details, /Maya A\.|Ahmad S\.|Lina K\./);
  // An API failure renders the error state, never fabricated reviews.
  assert.match(details, /setReviewsStatus\("error"\)/);
});

test("review cards render only real API fields: name, rating, comment", () => {
  const details = read("src/pages/ProductDetailsPage.jsx");
  assert.match(details, /review\?\.customerName/);
  assert.match(details, /review\?\.rating/);
  assert.match(details, /localized\(review\?\.comment, language\)/);
  // Verified-purchase copy and fabricated titles are gone.
  assert.doesNotMatch(details, /txt\.reviewed/);
});

test("storefront rating line reacts to language with correct pluralization", () => {
  const details = read("src/pages/ProductDetailsPage.jsx");
  assert.match(details, /No reviews yet/);
  assert.match(details, /لا توجد تقييمات بعد/);
  assert.match(details, /\$\{count === 1 \? "review" : "reviews"\}/);
  assert.match(details, /تقييم واحد/);
  assert.match(details, /تقييمان/);
});
