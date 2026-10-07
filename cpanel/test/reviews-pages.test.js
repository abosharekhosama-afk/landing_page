import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { canUseReviewAction } from "../src/utils/roles.js";
import {
  canFeatureReview,
  emptyReviewForm,
  filterReviews,
  isHomepageStoreReview,
  productOptionLabel,
  reviewComment,
  reviewFeaturedOf,
  reviewFormFromReview,
  reviewSavePayload,
  reviewStatusOf,
} from "../src/utils/reviewsUi.js";
import { customerReviewCount } from "../src/utils/customersApi.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("reviews workspace replaces the legacy dashboard table route", () => {
  const page = read("src/pages/AdminReviewsPage.jsx");
  const app = read("src/CPanelApp.jsx");
  assert.match(page, /fetchAllReviews\(/);
  assert.match(page, /updateReviewStatus\(/);
  assert.match(page, /deleteReview\(/);
  assert.match(page, /saveReview\(/);
  assert.match(app, /activePage === "admin-reviews"/);
  assert.match(app, /AdminReviewsPage/);
  assert.match(app, /activePage !== "admin-reviews"/);
  assert.doesNotMatch(page, /localStorage/);
});

test("reviews filters, moderation actions, and unsupported reply are wired", () => {
  const page = read("src/pages/AdminReviewsPage.jsx");
  assert.match(page, /filterReviews/);
  assert.match(page, /filters\.status/);
  assert.match(page, /filters\.type/);
  assert.match(page, /filters\.rating/);
  assert.match(page, /copy\.approve/);
  assert.match(page, /copy\.reject/);
  assert.match(page, /copy\.hide/);
  assert.match(page, /copy\.replyUnsupported/);
  assert.match(page, /copy\.forbidden/);
  assert.match(page, /copy\.readOnly/);
  assert.match(page, /copy\.retry/);
  assert.match(page, /copy\.noMatches/);
});

test("reviews permissions use reviews.view and reviews.manage", () => {
  const roles = read("src/utils/roles.js");
  const permissions = read("src/data/permissions.js");
  const page = read("src/pages/AdminReviewsPage.jsx");
  assert.match(roles, /"admin-reviews": \["reviews\.view"\]/);
  assert.match(roles, /canUseReviewAction/);
  assert.match(permissions, /reviews\.view/);
  assert.match(permissions, /reviews\.manage/);
  assert.match(page, /canUseReviewAction\(currentUser, "reviews\.manage"\)/);
  assert.equal(canUseReviewAction({ role: "company_admin" }, "reviews.manage"), true);
  assert.equal(canUseReviewAction({ role: "employee", permissions: ["reviews.view"] }, "reviews.manage"), false);
  assert.equal(canUseReviewAction({ role: "employee", permissions: ["reviews.manage"] }, "reviews.manage"), true);
});

test("review helpers map comments and filters without inventing data", () => {
  const rows = [
    { id: "1", customerName: "Jane", status: "pending", type: "website", rating: 5, comment: { en: "Great", ar: "رائع" } },
    { id: "2", customerName: "Omar", status: "approved", type: "employee", rating: 3, comment: "Okay" },
  ];
  assert.equal(reviewComment(rows[0], "ar"), "رائع");
  assert.equal(reviewStatusOf(rows[0]), "pending");
  assert.equal(filterReviews(rows, { query: "jane" }).length, 1);
  assert.equal(filterReviews(rows, { status: "approved" }).length, 1);
  assert.equal(filterReviews(rows, { rating: "3" }).length, 1);
  assert.equal(filterReviews(rows, { type: "employee" }).length, 1);
});

test("reviews form offers the product type with a tenant product picker", () => {
  const page = read("src/pages/AdminReviewsPage.jsx");
  // The type select includes a real "product" option using existing copy.
  assert.match(page, /<option value="product">\{copy\.productType\}<\/option>/);
  // A product picker rendered only for the product type, fed by the products
  // prop that CPanelApp hydrates from the existing tenant-scoped Product API.
  assert.match(page, /form\.type === "product" &&/);
  assert.match(page, /products\.map\(\(product\) =>/);
  assert.match(page, /productOptionLabel\(product, language\)/);
  // The picker is required: a product review cannot be saved without a product.
  assert.match(page, /copy\.productRequired/);
});

test("editing a product review re-selects the current product", () => {
  // formFromReview keeps the stored type and productId for product reviews.
  const form = reviewFormFromReview(
    { customerName: "Nour", rating: 4, type: "product", productId: "prod-7", comment: { en: "Solid", ar: "ممتاز" } },
    "en",
  );
  assert.equal(form.type, "product");
  assert.equal(form.productId, "prod-7");
  // Non-product stored reviews never carry a productId into the form.
  const websiteForm = reviewFormFromReview({ customerName: "Ali", type: "website", productId: "prod-7", comment: "Hi" }, "en");
  assert.equal(websiteForm.type, "website");
  assert.equal(websiteForm.productId, "");
});

test("create and edit payloads carry the correct productId", () => {
  // Create with a product type sends the picked productId.
  const created = reviewSavePayload({ ...emptyReviewForm(), type: "product", productId: "prod-1", customerName: "Sara" });
  assert.equal(created.type, "product");
  assert.equal(created.productId, "prod-1");
  assert.equal("id" in created, false);
  // Edit sends the review id and keeps the (possibly changed) product.
  const edited = reviewSavePayload({ ...emptyReviewForm(), type: "product", productId: "prod-2", customerName: "Sara" }, "review-9");
  assert.equal(edited.id, "review-9");
  assert.equal(edited.productId, "prod-2");
  // Non-product types always submit an explicit empty productId so a stale
  // association never rides along on the merge-based edit endpoint.
  const switched = reviewSavePayload({ ...emptyReviewForm(), type: "website", productId: "prod-1", customerName: "Sara" }, "review-9");
  assert.equal(switched.type, "website");
  assert.equal(switched.productId, "");
  const employee = reviewSavePayload({ ...emptyReviewForm(), type: "employee", productId: "prod-1", customerName: "Sara" });
  assert.equal(employee.type, "employee");
  assert.equal(employee.productId, "");
});

test("reviews form offers the employee type with a real employee picker", () => {
  const page = read("src/pages/AdminReviewsPage.jsx");
  const app = read("src/CPanelApp.jsx");
  const ui = read("src/utils/reviewsUi.js");
  // The type select includes a real "employee" option using existing copy.
  assert.match(page, /<option value="employee">\{copy\.employee\}<\/option>/);
  // An employee picker rendered only for the employee type, fed by the
  // employees prop that CPanelApp loads from the existing tenant-scoped API.
  assert.match(page, /form\.type === "employee" &&/);
  assert.match(page, /employees\.map\(\(employee\) =>/);
  assert.match(page, /employeeOptionLabel\(employee\)/);
  assert.match(page, /employees\.length \? copy\.selectEmployee : copy\.noEmployees/);
  // Selecting an employee stores employeeId + employeeName in form state.
  assert.match(page, /employeeId: event\.target\.value,/);
  assert.match(page, /employeeName: selected\?\.name \|\| "",/);
  // Employee review cannot be saved without an employee.
  assert.match(page, /copy\.employeeRequired/);
  // CPanelApp passes employees and loads them for the reviews page.
  assert.match(app, /<AdminReviewsPage employees=\{employees\} products=\{products\}/);
  assert.match(ui, /employeePicker/);
});

test("editing an employee review re-selects the current employee", () => {
  // formFromReview keeps type "employee" with its employee link, and the
  // save payload sends both employeeId and employeeName back to the API.
  const form = reviewFormFromReview(
    { customerName: "Nada", rating: 5, type: "employee", employeeId: "emp-7", employeeName: "Hana Mostafa", comment: { en: "Kind", ar: "لطيفة" } },
    "en",
  );
  assert.equal(form.type, "employee");
  assert.equal(form.employeeId, "emp-7");
  assert.equal(form.employeeName, "Hana Mostafa");
  const payload = reviewSavePayload(form, "review-emp");
  assert.equal(payload.type, "employee");
  assert.equal(payload.employeeId, "emp-7");
  assert.equal(payload.employeeName, "Hana Mostafa");
});

test("switching the review type away from product clears productId in form state", () => {
  const page = read("src/pages/AdminReviewsPage.jsx");
  // The type select onChange clears productId unless the new type is product.
  assert.match(page, /productId: event\.target\.value === "product" \? current\.productId : "",/);
  assert.match(page, /type: event\.target\.value,/);
});

test("switching away from employee clears stale employee fields in the payload", () => {
  // A review that stops being an employee review must send explicit empty
  // employeeId/employeeName so the merge-based edit endpoint drops the stale
  // association instead of keeping the previous employee.
  const switched = reviewSavePayload({ ...emptyReviewForm(), type: "website", customerName: "Sara" }, "review-4");
  assert.equal(switched.type, "website");
  assert.equal(switched.employeeId, "");
  assert.equal(switched.employeeName, "");
  // Product reviews also have their employee fields cleared.
  const product = reviewSavePayload({ ...emptyReviewForm(), type: "product", productId: "prod-1", customerName: "Sara" });
  assert.equal(product.employeeId, "");
  assert.equal(product.employeeName, "");
  // An employee review sends its employeeId/employeeName explicitly (the
  // AdminReviewsPage now has a real Employee Picker that populates these).
  const kept = reviewSavePayload({ ...emptyReviewForm(), type: "employee", employeeId: "emp-1", employeeName: "Sara S.", customerName: "Sara" }, "review-4");
  assert.equal(kept.type, "employee");
  assert.equal(kept.employeeId, "emp-1");
  assert.equal(kept.employeeName, "Sara S.");
});

test("editing an existing order review preserves its type", () => {
  // formFromReview keeps "order" instead of silently remapping it to website.
  const form = reviewFormFromReview(
    { customerName: "Dina", rating: 5, type: "order", orderId: "order-3", comment: { en: "Fast", ar: "سريع" } },
    "en",
  );
  assert.equal(form.type, "order");
  // The save payload sends the same type back to the API.
  const payload = reviewSavePayload(form, "review-5");
  assert.equal(payload.type, "order");
  // The type select keeps the order option available while an order review is
  // being edited, so the stored type stays selectable.
  const page = read("src/pages/AdminReviewsPage.jsx");
  assert.match(page, /form\.type === "order" && <option value="order">/);
});

test("product picker labels are localized with a stable id suffix", () => {
  const product = { id: "prod-1", name: { en: "Glass Cleaner", ar: "منظف زجاج" } };
  assert.equal(productOptionLabel(product, "en"), "Glass Cleaner (prod-1)");
  assert.equal(productOptionLabel(product, "ar"), "منظف زجاج (prod-1)");
  // Legacy string names still render; unknown products fall back to the id.
  assert.equal(productOptionLabel({ id: "prod-2", name: "Radiator Flush" }, "en"), "Radiator Flush (prod-2)");
  assert.equal(productOptionLabel({ id: "prod-3" }, "en"), "prod-3");
});

test("featured helpers only allow approved reviews to be featured", () => {
  assert.equal(reviewFeaturedOf({ featured: true }), true);
  assert.equal(reviewFeaturedOf({ featured: false }), false);
  assert.equal(reviewFeaturedOf({}), false);
  assert.equal(canFeatureReview({ status: "approved" }), true);
  assert.equal(canFeatureReview({ status: "pending" }), false);
  assert.equal(canFeatureReview({ status: "rejected" }), false);
  assert.equal(canFeatureReview({ status: "hidden" }), false);
  // Homepage store types are the only featureable review types.
  assert.equal(isHomepageStoreReview({ type: "website" }), true);
  assert.equal(isHomepageStoreReview({ type: "store" }), true);
  assert.equal(isHomepageStoreReview({ type: "site" }), true);
  assert.equal(isHomepageStoreReview({ type: "product" }), false);
  assert.equal(isHomepageStoreReview({ type: "order" }), false);
  assert.equal(isHomepageStoreReview({ type: "employee" }), false);
});

test("reviews page wires the feature/unfeature toggle for store reviews", () => {
  const page = read("src/pages/AdminReviewsPage.jsx");
  const api = read("src/utils/homeContentApi.js");
  const ui = read("src/utils/reviewsUi.js");
  // The page calls the featured status endpoint and renders Feature/Unfeature.
  assert.match(page, /updateReviewFeatured\(/);
  assert.match(page, /copy\.feature/);
  assert.match(page, /copy\.unfeature/);
  assert.match(page, /isHomepageStoreReview\(/);
  assert.match(page, /canFeatureReview\(/);
  assert.match(page, /reviewFeaturedOf\(/);
  // The API helper sends status approved + featured through the status route.
  assert.match(api, /updateReviewFeatured/);
  assert.match(api, /featured: Boolean\(featured\)/);
  assert.match(api, /status: "approved"/);
  // Copy keys exist in both languages.
  assert.match(ui, /feature: "Feature"/);
  assert.match(ui, /unfeature: "Unfeature"/);
  assert.match(ui, /feature: "تمييز"/);
  assert.match(ui, /unfeature: "إلغاء التمييز"/);
});

test("orders table labels customers vs guests from customerUserId", () => {
  const table = read("src/components/AdminOrdersTable.jsx");
  assert.match(table, /order\.customerUserId/);
  assert.match(table, /"Customer"/);
  assert.match(table, /"Guest"/);
  assert.match(table, /"عميل"/);
  assert.match(table, /"زائر"/);
});

test("customer reviewCount helper and CRM display are wired", () => {
  const api = read("src/utils/customersApi.js");
  const list = read("src/pages/AdminContactsPage.jsx");
  const detail = read("src/pages/AdminContactDetailPage.jsx");
  assert.equal(customerReviewCount({ reviewCount: 7 }), 7);
  assert.equal(customerReviewCount({ reviewCount: 0 }), 0);
  assert.equal(customerReviewCount({}), 0);
  assert.equal(customerReviewCount({ reviewCount: "3" }), 3);
  assert.equal(customerReviewCount({ reviewCount: -2 }), 0);
  assert.match(api, /customerReviewCount/);
  assert.match(list, /customerReviewCount\(contact\)/);
  assert.match(list, /labels\.reviews/);
  assert.match(detail, /customerReviewCount\(contact\)/);
  assert.match(detail, /labels\.reviews/);
});
