import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "eb-auth-membership-"));
const now = "2026-07-13T00:00:00.000Z";
const password = "Test-password-123!";
const passwordHash = await hashPassword(password);
const companies = [
  { id: "eb-chemical", slug: "eb-chemical", name: "EB Chemical", status: "active", isDefault: true },
  {
    id: "icare", slug: "icare", name: "iCare", status: "active", isDefault: false,
    storefrontUrl: "https://igroup.website/icare", storefrontPath: "/icare",
  },
  { id: "other-company", slug: "other-company", name: "Other Company", status: "active", isDefault: false },
];
const users = [
  ["icare-user", "admin@icare.com", "company_admin", "icare"],
  ["eb-user", "admin@eb.test", "admin", "eb-chemical"],
  ["no-membership-user", "none@test.local", "company_admin", "no-company"],
  ["inactive-user", "inactive@test.local", "company_admin", "icare"],
  ["multi-user", "multi@test.local", "company_admin", "icare"],
  ["revoked-user", "revoked@test.local", "company_admin", "icare"],
  ["version-user", "version@test.local", "company_admin", "icare"],
  ["icare-customer", "customer@icare.test", "customer", "icare"],
  ["icare-employee", "employee@icare.test", "employee", "icare"],
  ["eb-employee", "employee@eb.test", "employee", "eb-chemical"],
  ["super-user", "super@test.local", "super_admin", "eb-chemical"],
  ["icare-product-employee", "product@icare.test", "employee", "icare"],
  ["icare-view-employee", "view@icare.test", "employee", "icare"],
  ["icare-create-employee", "create@icare.test", "employee", "icare"],
  ["icare-update-employee", "update@icare.test", "employee", "icare"],
  ["icare-catalog-employee", "catalog@icare.test", "employee", "icare"],
  ["icare-category-create-employee", "category-create@icare.test", "employee", "icare"],
  ["icare-category-update-employee", "category-update@icare.test", "employee", "icare"],
  ["icare-media-employee", "media@icare.test", "employee", "icare"],
  ["icare-website-media-employee", "website-media@icare.test", "employee", "icare"],
  ["icare-manager-user", "manager@icare.test", "manager", "icare"],
].map(([id, email, role, companyId]) => ({
  id,
  name: id,
  email,
  password: passwordHash,
  role,
  permissions: [],
  isActive: true,
  company_id: companyId,
  createdAt: now,
  updatedAt: now,
}));
const memberships = [
  ["icare:icare-user", "icare", "icare-user", "company_admin", "active"],
  ["eb-chemical:eb-user", "eb-chemical", "eb-user", "company_admin", "active"],
  ["icare:inactive-user", "icare", "inactive-user", "company_admin", "inactive"],
  ["icare:multi-user", "icare", "multi-user", "company_admin", "active"],
  ["eb-chemical:multi-user", "eb-chemical", "multi-user", "company_admin", "active"],
  ["icare:revoked-user", "icare", "revoked-user", "company_admin", "active"],
  ["icare:version-user", "icare", "version-user", "company_admin", "active"],
  ["icare:icare-customer", "icare", "icare-customer", "customer", "active"],
  ["icare:icare-employee", "icare", "icare-employee", "employee", "active"],
  ["eb-chemical:eb-employee", "eb-chemical", "eb-employee", "employee", "active"],
  ["icare:icare-product-employee", "icare", "icare-product-employee", "employee", "active"],
  ["icare:icare-view-employee", "icare", "icare-view-employee", "employee", "active"],
  ["icare:icare-create-employee", "icare", "icare-create-employee", "employee", "active"],
  ["icare:icare-update-employee", "icare", "icare-update-employee", "employee", "active"],
  ["icare:icare-catalog-employee", "icare", "icare-catalog-employee", "employee", "active"],
  ["icare:icare-category-create-employee", "icare", "icare-category-create-employee", "employee", "active"],
  ["icare:icare-category-update-employee", "icare", "icare-category-update-employee", "employee", "active"],
  ["icare:icare-media-employee", "icare", "icare-media-employee", "employee", "active"],
  ["icare:icare-website-media-employee", "icare", "icare-website-media-employee", "employee", "active"],
  ["icare:icare-manager-user", "icare", "icare-manager-user", "manager", "active"],
].map(([id, companyId, userId, role, status]) => ({
  id,
  companyId,
  userId,
  role,
  status,
  permissions: ({
    "icare-product-employee": ["products.view", "products.create", "products.update", "products.delete", "product_media.manage"],
    "icare-view-employee": ["products.view"],
    "icare-create-employee": ["products.create"],
    "icare-update-employee": ["products.update"],
    "icare-catalog-employee": ["categories.view", "categories.create", "categories.update", "categories.delete", "brands.view", "brands.create", "brands.update", "brands.delete"],
    "icare-category-create-employee": ["categories.create"],
    "icare-category-update-employee": ["categories.update"],
    "icare-media-employee": ["products.view", "product_media.manage"],
    "icare-website-media-employee": ["website_media.manage"],
  })[userId] || [],
  createdAt: now,
  updatedAt: now,
}));

fs.writeFileSync(path.join(dataStoreDir, "store.json"), JSON.stringify({
  version: 2,
  companies,
  users,
  memberships,
  products: [
    { id: "eb-product", slug: "eb-product", name: "EB Product", company_id: "eb-chemical" },
    { id: "icare-product-1", slug: "icare-product-1", name: "iCare Product 1", company_id: "icare" },
    { id: "icare-product-2", slug: "icare-product-2", name: "iCare Product 2", company_id: "icare" },
  ],
  websiteMedia: [
    { id: "eb-media", sectionKey: "tenant-proof", imageUrl: "/eb.jpg", isActive: true, company_id: "eb-chemical" },
    { id: "icare-media", sectionKey: "tenant-proof", imageUrl: "/icare.jpg", isActive: true, company_id: "icare" },
  ],
  websiteTexts: [
    { id: "eb-text", key: "tenant.proof", valueEn: "EB", isActive: true, company_id: "eb-chemical" },
    { id: "icare-text", key: "tenant.proof", valueEn: "iCare", isActive: true, company_id: "icare" },
  ],
  orders: [
    { id: "icare-order-assign", company_id: "icare", status: "Pending", customer: {} },
    { id: "icare-order-delete", company_id: "icare", status: "Pending", customer: {} },
    { id: "icare-order-customer-guard", company_id: "icare", status: "Pending", customer: {} },
    { id: "eb-order-assign", company_id: "eb-chemical", status: "Pending", customer: {} },
    { id: "eb-order-delete", company_id: "eb-chemical", status: "Pending", customer: {} },
  ],
  workSessions: [
    {
      id: "icare-session",
      company_id: "icare",
      employeeId: "icare-employee",
      date: "2026-07-13",
      loginTime: now,
    },
    {
      id: "eb-session",
      company_id: "eb-chemical",
      employeeId: "eb-employee",
      date: "2026-07-13",
      loginTime: now,
    },
  ],
}, null, 2));

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "focused-auth-test-secret";
process.env.NODE_ENV = "test";
const uploadTestDir = path.join(dataStoreDir, "uploads");
fs.mkdirSync(uploadTestDir, { recursive: true });
process.env.UPLOADS_DIR = uploadTestDir;

const { app } = await import("../src/server.js");
const {
  companyMembershipRepository,
  platformUserRepository,
} = await import("../src/data/store.js");
const { signToken } = await import("../src/middleware/auth.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

async function request(pathname, { token, body, headers = {}, method = body ? "POST" : "GET" } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { response, body: await response.json().catch(() => null) };
}

async function login(email) {
  return request("/auth/login", {
    body: { email, password },
  });
}

function tokenPayload(token) {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
}

test("membership-aware authentication and authenticated tenant context", async (t) => {
  let icareSession;
  let multiSelection;

  await t.test("iCare user with one active membership is tenant-bound", async () => {
    const result = await login("admin@icare.com");
    assert.equal(result.response.status, 200);
    assert.equal(result.body.activeCompany.id, "icare");
    assert.equal(result.body.activeMembership.companyId, "icare");
    assert.equal(result.body.user.role, "company_admin");
    const payload = tokenPayload(result.body.token);
    assert.equal(payload.tokenType, "access");
    assert.equal(payload.id, "icare-user");
    assert.equal(payload.role, "company_admin");
    assert.equal(payload.companyId, "icare");
    assert.equal(payload.membershipId, "icare:icare-user");
    assert.equal(payload.membershipRole, "company_admin");
    assert.equal(payload.membershipVersion, now);
    icareSession = result.body;
  });

  await t.test("GET /auth/me confirms iCare and returns safe bootstrap data", async () => {
    const result = await request("/auth/me", { token: icareSession.token });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.user.id, "icare-user");
    assert.equal(result.body.activeCompany.id, "icare");
    assert.equal(result.body.activeMembership.companyId, "icare");
    assert.deepEqual(result.body.availableCompanies.map((company) => company.id), ["icare"]);
    assert.equal("password" in result.body.user, false);
  });

  await t.test("successful login token is immediately valid for /auth/me; invalid token is rejected", async () => {
    const session = await login("admin@icare.com");
    assert.equal(session.response.status, 200);
    const me = await request("/auth/me", { token: session.body.token });
    assert.equal(me.response.status, 200);
    assert.equal(me.body.user.id, "icare-user");
    assert.equal(me.body.activeCompany.id, "icare");
    const invalid = await request("/auth/me", { token: "not-a-real-token" });
    assert.equal(invalid.response.status, 401);
  });

  await t.test("authenticated and public product reads use the correct tenant context", async () => {
    const authenticated = await request("/products", { token: icareSession.token });
    assert.equal(authenticated.response.status, 200);
    assert.deepEqual(
      authenticated.body.map((product) => product.id).sort(),
      ["icare-product-1", "icare-product-2"],
    );

    const publicResult = await request("/products");
    assert.equal(publicResult.response.status, 200);
    assert.deepEqual(publicResult.body.map((product) => product.id), []);

    const unresolvedSharedHost = await request("/products", {
      headers: { "X-Forwarded-Host": "igroup.website" },
    });
    assert.equal(unresolvedSharedHost.response.status, 200);
    assert.deepEqual(unresolvedSharedHost.body.map((product) => product.id), []);
  });

  await t.test("X-Company-Id header is not trusted for login storefront context", async () => {
    const result = await request("/auth/login", {
      headers: { "X-Company-Id": "icare" },
      body: { email: "multi@test.local", password },
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.companySelectionRequired, true);
    assert.ok(result.body.selectionChallenge);
    assert.deepEqual(
      result.body.availableCompanies.map((c) => c.id).sort(),
      ["eb-chemical", "icare"],
    );
  });

  await t.test("invalid bearer token on a public read is rejected", async () => {
    const result = await request("/products", { token: "invalid-token" });
    assert.equal(result.response.status, 401);
    assert.equal(result.body.message, "Invalid or expired authentication token.");
  });

  await t.test("X-Company-Id header is not trusted to constrain authenticated context", async () => {
    const productsResult = await request("/products?companyId=eb-chemical", {
      token: icareSession.token,
      headers: { "X-Company-Id": "eb-chemical" },
    });
    assert.equal(productsResult.response.status, 200);
    assert.deepEqual(productsResult.body.map((product) => product.id).sort(), [
      "icare-product-1", "icare-product-2",
    ]);

    const reviewResult = await request("/reviews", {
      token: icareSession.token,
      body: {
        companyId: "eb-chemical",
        type: "website",
        rating: 5,
        comment: "Tenant override regression test",
      },
    });
    assert.equal(reviewResult.response.status, 201);
    assert.equal("companyId" in reviewResult.body, false);
  });

  await t.test("iCare company_admin reads only iCare orders, employees, work sessions, and media", async () => {
    const ordersResult = await request("/orders", { token: icareSession.token });
    assert.equal(ordersResult.response.status, 200);
    assert.equal(ordersResult.body.length, 3);
    assert.equal(ordersResult.body.every((order) => order.id.startsWith("icare-")), true);

    const employeesResult = await request("/employees", { token: icareSession.token });
    assert.equal(employeesResult.response.status, 200);
    assert.deepEqual(
      employeesResult.body.map((employee) => employee.id).sort(),
      ["icare-catalog-employee", "icare-category-create-employee", "icare-category-update-employee", "icare-create-employee", "icare-employee", "icare-media-employee", "icare-product-employee", "icare-update-employee", "icare-view-employee", "icare-website-media-employee"],
    );
    assert.equal(employeesResult.body.some((employee) => employee.id === "eb-employee"), false);

    const sessionsResult = await request("/work-sessions/employees", {
      token: icareSession.token,
    });
    assert.equal(sessionsResult.response.status, 200);
    assert.deepEqual(sessionsResult.body.map((session) => session.id), ["icare-session"]);

    const mediaResult = await request("/website-media/all", { token: icareSession.token });
    assert.equal(mediaResult.response.status, 200);
    assert.deepEqual(mediaResult.body.items.map((item) => item.id), ["icare-media"]);
    assert.equal(mediaResult.body.items.some((item) => item.id === "eb-media"), false);
  });

  await t.test("customers and employees remain restricted from tenant administration reads", async () => {
    const customerSession = await login("customer@icare.test");
    const employeeSession = await login("employee@icare.test");
    assert.equal(customerSession.response.status, 200);
    assert.equal(employeeSession.response.status, 200);

    for (const token of [customerSession.body.token, employeeSession.body.token]) {
      const ordersResult = await request("/orders", { token });
      assert.equal(ordersResult.response.status, 403);

      const employeesResult = await request("/employees", { token });
      assert.equal(employeesResult.response.status, 403);

      const sessionsResult = await request("/work-sessions/employees", { token });
      assert.equal(sessionsResult.response.status, 403);
    }

    const customerOwnSessions = await request("/work-sessions/employees/icare-customer", {
      token: customerSession.body.token,
    });
    assert.equal(customerOwnSessions.response.status, 403);

    const employeeOtherSessions = await request("/work-sessions/employees/eb-employee", {
      token: employeeSession.body.token,
    });
    assert.equal(employeeOtherSessions.response.status, 403);

    const employeeOwnSessions = await request("/work-sessions/employees/icare-employee", {
      token: employeeSession.body.token,
    });
    assert.equal(employeeOwnSessions.response.status, 200);
    assert.equal(employeeOwnSessions.body.length >= 1, true);
    assert.equal(
      employeeOwnSessions.body.every((session) => session.employeeId === "icare-employee"),
      true,
    );
    assert.equal(employeeOwnSessions.body.some((session) => session.id === "eb-session"), false);
  });

  await t.test("iCare company_admin can assign only an iCare employee to an iCare order", async () => {
    const result = await request("/orders/icare-order-assign/assign-employee?companyId=eb-chemical", {
      token: icareSession.token,
      headers: { "X-Company-Id": "icare" },
      body: { employeeId: "icare-employee", companyId: "eb-chemical" },
      method: "PUT",
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.id, "icare-order-assign");
    assert.equal(result.body.assignedToEmployeeId, "icare-employee");
  });

  await t.test("iCare customer cannot assign employees or delete arbitrary orders", async () => {
    const customerSession = await login("customer@icare.test");
    assert.equal(customerSession.response.status, 200);

    const assignResult = await request("/orders/icare-order-assign/assign-employee", {
      token: customerSession.body.token,
      body: { employeeId: "icare-employee" },
      method: "PUT",
    });
    assert.equal(assignResult.response.status, 403);

    const deleteResult = await request("/orders/icare-order-customer-guard", {
      token: customerSession.body.token,
      method: "DELETE",
    });
    assert.equal(deleteResult.response.status, 403);
  });

  await t.test("iCare company_admin cannot assign a cross-company employee or modify an EB order", async () => {
    const employeeResult = await request("/orders/icare-order-assign/assign-employee", {
      token: icareSession.token,
      body: { employeeId: "eb-employee" },
      method: "PUT",
    });
    assert.equal(employeeResult.response.status, 404);

    const orderResult = await request("/orders/eb-order-assign/assign-employee", {
      token: icareSession.token,
      body: { employeeId: "icare-employee" },
      method: "PUT",
    });
    assert.equal(orderResult.response.status, 404);
  });

  await t.test("iCare company_admin can delete an iCare order", async () => {
    const result = await request("/orders/icare-order-delete", {
      token: icareSession.token,
      method: "DELETE",
    });
    assert.equal(result.response.status, 204);
  });

  await t.test("missing token cannot assign employees or delete orders", async () => {
    const assignResult = await request("/orders/icare-order-assign/assign-employee", {
      body: { employeeId: "icare-employee" },
      method: "PUT",
    });
    assert.equal(assignResult.response.status, 401);

    const deleteResult = await request("/orders/icare-order-customer-guard", { method: "DELETE" });
    assert.equal(deleteResult.response.status, 401);
  });

  await t.test("EB Chemical one-membership login remains compatible", async () => {
    const result = await login("admin@eb.test");
    assert.equal(result.response.status, 200);
    assert.equal(result.body.activeCompany.id, "eb-chemical");
    assert.equal(tokenPayload(result.body.token).companyId, "eb-chemical");
    const productsResult = await request("/products", { token: result.body.token });
    assert.equal(productsResult.response.status, 200);
    assert.deepEqual(productsResult.body.map((product) => product.id), ["eb-product"]);

    const assignResult = await request("/orders/eb-order-assign/assign-employee", {
      token: result.body.token,
      body: { employeeId: "eb-employee" },
      method: "PUT",
    });
    assert.equal(assignResult.response.status, 200);
    assert.equal(assignResult.body.assignedToEmployeeId, "eb-employee");

    const deleteResult = await request("/orders/eb-order-delete", {
      token: result.body.token,
      method: "DELETE",
    });
    assert.equal(deleteResult.response.status, 204);
  });

  await t.test("Super Admin platform login does not inherit EB tenant context", async () => {
    const loginResult = await login("super@test.local");
    assert.equal(loginResult.response.status, 200);
    assert.equal(loginResult.body.activeCompany, null);
    assert.equal(tokenPayload(loginResult.body.token).companyId, null);
    const companiesResult = await request("/platform/companies", { token: loginResult.body.token });
    assert.equal(companiesResult.response.status, 200);
    const tenantResult = await request("/home-offers/all", { token: loginResult.body.token });
    assert.equal(tenantResult.response.status, 403);
    const assignResult = await request("/orders/icare-order-assign/assign-employee", {
      token: loginResult.body.token,
      body: { employeeId: "icare-employee" },
      method: "PUT",
    });
    assert.equal(assignResult.response.status, 403);
    const deleteResult = await request("/orders/icare-order-customer-guard", {
      token: loginResult.body.token,
      method: "DELETE",
    });
    assert.equal(deleteResult.response.status, 403);
  });

  await t.test("Super Admin company scope can administer only the selected tenant", async () => {
    const platform = await login("super@test.local");
    const entered = await request("/platform/companies/icare/scope", {
      token: platform.body.token,
      method: "POST",
    });
    assert.equal(entered.response.status, 200);
    assert.equal(entered.body.activeCompany.id, "icare");
    assert.equal(entered.body.user.role, "company_admin");
    assert.equal(entered.body.user.globalRole, "super_admin");
    const payload = tokenPayload(entered.body.token);
    assert.equal(payload.tokenType, "company_scope");
    assert.equal(payload.companyId, "icare");
    assert.equal("membershipId" in payload, false);

    const media = await request("/website-media/all", { token: entered.body.token });
    assert.equal(media.response.status, 200);
    assert.deepEqual(media.body.items.map((item) => item.id), ["icare-media"]);

    const texts = await request("/admin/website-texts", { token: entered.body.token });
    assert.equal(texts.response.status, 200);
    assert.deepEqual(texts.body.map((item) => item.id), ["icare-text"]);

    const products = await request("/products", { token: entered.body.token });
    assert.equal(products.response.status, 200);
    assert.deepEqual(products.body.map((item) => item.id).sort(), ["icare-product-1", "icare-product-2"]);

    const brand = await request("/brands", {
      token: entered.body.token,
      body: { slug: "scoped-qa-brand", name: "Scoped QA Brand", country: "QA", isActive: true },
    });
    assert.equal(brand.response.status, 201);
    const mainCategory = await request("/categories", {
      token: entered.body.token,
      body: {
        slug: "scoped-qa-main",
        name: { en: "Scoped QA Main", ar: "" },
        brandId: brand.body.id,
        parentId: null,
        isActive: true,
      },
    });
    assert.equal(mainCategory.response.status, 201);
    const category = await request("/categories", {
      token: entered.body.token,
      body: {
        slug: "scoped-qa-category",
        name: { en: "Scoped QA Category", ar: "" },
        parentId: mainCategory.body.id,
        isActive: true,
      },
    });
    assert.equal(category.response.status, 201);
    const product = await request("/products", {
      token: entered.body.token,
      body: {
        id: "icare-scoped-qa-product",
        slug: "icare-scoped-qa-product",
        name: { en: "Scoped QA Product", ar: "" },
        brandId: brand.body.id,
        mainCategoryId: mainCategory.body.id,
        subcategoryId: category.body.id,
        categoryId: category.body.id,
      },
    });
    assert.equal(product.response.status, 201);
    assert.equal((await request(`/products/${product.body.id}`, {
      token: entered.body.token,
      method: "PUT",
      body: { name: { en: "Scoped QA Product Updated", ar: "" } },
    })).response.status, 200);
    assert.equal((await request(`/products/${product.body.id}`, {
      token: entered.body.token,
      method: "DELETE",
    })).response.status, 204);
    assert.equal((await request(`/products/${product.body.id}/permanent`, {
      token: entered.body.token,
      method: "DELETE",
    })).response.status, 204);
    assert.equal((await request(`/brands/${brand.body.id}`, {
      token: entered.body.token,
      method: "DELETE",
    })).response.status, 204);
    assert.equal((await request(`/categories/${category.body.id}`, {
      token: entered.body.token,
      method: "DELETE",
    })).response.status, 204);
    assert.equal((await request(`/categories/${mainCategory.body.id}`, {
      token: entered.body.token,
      method: "DELETE",
    })).response.status, 204);

    const changedOrder = await request("/orders/icare-order-assign/status", {
      token: entered.body.token,
      method: "PUT",
      body: { status: "Processing" },
    });
    assert.equal(changedOrder.response.status, 200);
    assert.equal(changedOrder.body.status, "Processing");
    assert.equal((await request("/orders/eb-order-assign/status", {
      token: entered.body.token,
      method: "PUT",
      body: { status: "Processing" },
    })).response.status, 404);

    const ebScope = await request("/platform/companies/eb-chemical/scope", {
      token: platform.body.token,
      method: "POST",
    });
    assert.equal(ebScope.response.status, 200);
    const review = await request("/reviews", {
      token: ebScope.body.token,
      body: { type: "website", customerName: "Scoped QA", status: "pending", isActive: false },
    });
    assert.equal(review.response.status, 201);
    const moderated = await request(`/reviews/${review.body.id}/status`, {
      token: ebScope.body.token,
      method: "PUT",
      body: { status: "approved", isActive: true },
    });
    assert.equal(moderated.response.status, 200);
    assert.equal(moderated.body.status, "approved");
    assert.equal((await request(`/reviews/${review.body.id}`, {
      token: ebScope.body.token,
      method: "DELETE",
    })).response.status, 204);
  });

  await t.test("zero or inactive memberships are rejected", async () => {
    const noMembership = await login("none@test.local");
    assert.equal(noMembership.response.status, 403);
    const inactive = await login("inactive@test.local");
    assert.equal(inactive.response.status, 403);
  });

  await t.test("two memberships require explicit company selection", async () => {
    const result = await login("multi@test.local");
    assert.equal(result.response.status, 200);
    assert.equal(result.body.companySelectionRequired, true);
    assert.equal(typeof result.body.selectionChallenge, "string");
    assert.equal("token" in result.body, false);
    assert.deepEqual(
      result.body.availableCompanies.map((company) => company.id).sort(),
      ["eb-chemical", "icare"],
    );
    multiSelection = result.body;
  });

  await t.test("valid selection issues a tenant token", async () => {
    const result = await request("/auth/select-company", {
      body: { selectionChallenge: multiSelection.selectionChallenge, companyId: "icare" },
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.activeCompany.id, "icare");
    assert.equal(tokenPayload(result.body.token).companyId, "icare");
  });

  await t.test("selection cannot target a company without membership", async () => {
    const result = await request("/auth/select-company", {
      body: {
        selectionChallenge: multiSelection.selectionChallenge,
        companyId: "other-company",
      },
    });
    assert.equal(result.response.status, 403);
  });

  await t.test("token and membership company mismatch is rejected", async () => {
    const user = await platformUserRepository.getUserById("icare-user");
    const membership = await companyMembershipRepository.getMembershipByCompanyAndUser("icare", user.id);
    const mismatched = signToken(user, { ...membership, companyId: "eb-chemical" });
    const result = await request("/auth/me", { token: mismatched });
    assert.equal(result.response.status, 401);
  });

  await t.test("deactivated membership invalidates an issued token", async () => {
    const loginResult = await login("revoked@test.local");
    assert.equal(loginResult.response.status, 200);
    await companyMembershipRepository.disableMembership("icare", "revoked-user");
    const result = await request("/products", { token: loginResult.body.token });
    assert.equal(result.response.status, 401);
  });

  await t.test("membership versions normalize Date and ISO values and detect changes", async () => {
    const user = await platformUserRepository.getUserById("version-user");
    const membership = await companyMembershipRepository.getMembershipByCompanyAndUser("icare", user.id);
    const dateToken = signToken(user, { ...membership, updatedAt: new Date(membership.updatedAt) });
    const stringToken = signToken(user, membership);

    assert.equal(
      tokenPayload(dateToken).membershipVersion,
      tokenPayload(stringToken).membershipVersion,
    );
    assert.equal(tokenPayload(dateToken).membershipVersion, now);

    const equivalentResult = await request("/products", { token: dateToken });
    assert.equal(equivalentResult.response.status, 200);

    await companyMembershipRepository.updateMembership("icare", user.id, {
      role: membership.role,
      status: "active",
    });
    const changedResult = await request("/products", { token: dateToken });
    assert.equal(changedResult.response.status, 401);
  });

  await t.test("company_admin uses iCare context without EB fallback", async () => {
    const result = await request("/admin/summary", { token: icareSession.token });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.products, 2);
  });
});

test("temporary password support for company member creation", async (t) => {
  let superSession;

  await t.test("Super Admin can log in and create a member with temporary password", async () => {
    const loginResult = await request("/auth/login", {
      body: { email: "super@test.local", password },
    });
    assert.equal(loginResult.response.status, 200);
    superSession = loginResult.body;

    const result = await request("/platform/companies/eb-chemical/memberships", {
      token: superSession.token,
      method: "POST",
      body: {
        email: "new-member-with-password@test.local",
        name: "New Member With Password",
        role: "employee",
        status: "active",
        password: "Temp-password-123!",
      },
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.body.email, "new-member-with-password@test.local");
    assert.equal(result.body.role, "employee");
    assert.equal(result.body.status, "active");
  });

  await t.test("the new member can log in with the temporary password", async () => {
    const loginResult = await request("/auth/login", {
      body: { email: "new-member-with-password@test.local", password: "Temp-password-123!" },
    });
    assert.equal(loginResult.response.status, 200);
    assert.equal(loginResult.body.user.email, "new-member-with-password@test.local");
    assert.equal(loginResult.body.activeCompany.id, "eb-chemical");
    assert.equal(loginResult.body.activeMembership.companyId, "eb-chemical");
    assert.equal("password" in loginResult.body.user, false);
  });

  await t.test("adding an existing user ignores the password and does not change it", async () => {
    const result = await request("/platform/companies/icare/memberships", {
      token: superSession.token,
      method: "POST",
      body: {
        email: "new-member-with-password@test.local",
        name: "Renamed Member",
        role: "customer",
        status: "active",
        password: "Different-password-456!",
      },
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.body.email, "new-member-with-password@test.local");
    assert.equal(result.body.role, "customer");

    const loginResult = await request("/auth/login", {
      body: { email: "new-member-with-password@test.local", password: "Temp-password-123!" },
    });
    assert.equal(loginResult.response.status, 200);

    const wrongPassword = await request("/auth/login", {
      body: { email: "new-member-with-password@test.local", password: "Different-password-456!" },
    });
    assert.equal(wrongPassword.response.status, 401);
  });

  await t.test("creating a new member without a password is rejected", async () => {
    const result = await request("/platform/companies/eb-chemical/memberships", {
      token: superSession.token,
      method: "POST",
      body: {
        email: "no-password-member@test.local",
        name: "No Password Member",
        role: "employee",
        status: "active",
      },
    });
    assert.equal(result.response.status, 400);
    assert.match(result.body.message, /password/i);
  });

  await t.test("existing user membership is created without changing password when no password sent", async () => {
    const result = await request("/platform/companies/eb-chemical/memberships", {
      token: superSession.token,
      method: "POST",
      body: {
        email: "admin@eb.test",
        name: "Admin EB",
        role: "employee",
        status: "active",
      },
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.body.email, "admin@eb.test");

    const loginResult = await request("/auth/login", {
      body: { email: "admin@eb.test", password },
    });
    assert.equal(loginResult.response.status, 200);
  });
});

test("employee product permission enforcement", async (t) => {
  const productEmp = await login("product@icare.test");
  const viewEmp = await login("view@icare.test");
  const createEmp = await login("create@icare.test");
  const updateEmp = await login("update@icare.test");
  const catalogEmp = await login("catalog@icare.test");
  const categoryCreateEmp = await login("category-create@icare.test");
  const categoryUpdateEmp = await login("category-update@icare.test");
  const mediaEmp = await login("media@icare.test");
  const managerEmp = await login("manager@icare.test");
  const noPermEmp = await login("employee@icare.test");

  assert.equal(productEmp.response.status, 200, "product employee login ok");
  assert.equal(viewEmp.response.status, 200, "view employee login ok");
  assert.equal(createEmp.response.status, 200, "create employee login ok");
  assert.equal(updateEmp.response.status, 200, "update employee login ok");
  assert.equal(catalogEmp.response.status, 200, "catalog employee login ok");
  assert.equal(categoryCreateEmp.response.status, 200, "category create employee login ok");
  assert.equal(categoryUpdateEmp.response.status, 200, "category update employee login ok");
  assert.equal(mediaEmp.response.status, 200, "media employee login ok");
  assert.equal(managerEmp.response.status, 200, "manager login ok");
  assert.equal(noPermEmp.response.status, 200, "no-permission employee login ok");

  const icareCompanyAdmin = await login("admin@icare.com");

  await t.test("product view permission allows GET products", async () => {
    const result = await request("/products", { token: viewEmp.body.token });
    assert.equal(result.response.status, 200);
  });

  await t.test("missing view permission returns 403 on GET products", async () => {
    const result = await request("/products", { token: noPermEmp.body.token });
    assert.equal(result.response.status, 403);
    assert.equal(result.body.message, "Product view permission required.");
  });

  await t.test("view-only employee cannot create products", async () => {
    const result = await request("/products", {
      token: viewEmp.body.token,
      method: "POST",
      body: { name: { en: "Test" } },
    });
    assert.equal(result.response.status, 403);
    assert.equal(result.body.message, "Access denied.");
  });

  await t.test("view-only employee cannot update products", async () => {
    const result = await request("/products/icare-product-1", {
      token: viewEmp.body.token,
      method: "PUT",
      body: { name: { en: "Updated" } },
    });
    assert.equal(result.response.status, 403);
    assert.equal(result.body.message, "Access denied.");
  });

  await t.test("view-only employee cannot delete products", async () => {
    const result = await request("/products/icare-product-1", {
      token: viewEmp.body.token,
      method: "DELETE",
    });
    assert.equal(result.response.status, 403);
    assert.equal(result.body.message, "Access denied.");
  });

  let uploadedMediaPath = "";

  await t.test("unauthorized employee receives 403 on product media upload", async () => {
    const result = await request("/uploads/products/icare-product-1", {
      token: viewEmp.body.token,
      method: "POST",
    });
    assert.equal(result.response.status, 403, "must be exactly 403, not 400");
  });

  await t.test("authorized employee can upload product media", async () => {
    const boundary = "----TestBoundary" + Date.now();
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;
    const bodyBuffer = Buffer.concat([Buffer.from(header), Buffer.alloc(200, 0x42), Buffer.from(footer)]);
    const result = await fetch(`${baseUrl}/uploads/products/icare-product-1`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mediaEmp.body.token}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyBuffer,
    });
    assert.equal(result.status, 201, "upload succeeds with 201");
    const json = await result.json();
    assert.ok(json.path, "response includes media path");
    assert.ok(json.path.startsWith("/uploads/icare/products/icare-product-1/"), "media path is product-scoped");
    uploadedMediaPath = json.path;
  });

  await t.test("unauthorized employee receives exactly HTTP 403 on product media deletion", async () => {
    assert.ok(uploadedMediaPath, "uploadedMediaPath must be set from the upload test");
    const result = await request("/uploads/products/icare-product-1", {
      token: viewEmp.body.token,
      method: "DELETE",
      body: { path: uploadedMediaPath },
    });
    assert.equal(result.response.status, 403, "must be exactly 403");
  });

  await t.test("authorized employee can delete uploaded product media using the exact returned path", async () => {
    assert.ok(uploadedMediaPath, "uploadedMediaPath must be set from the upload test");
    const result = await request("/uploads/products/icare-product-1", {
      token: mediaEmp.body.token,
      method: "DELETE",
      body: { path: uploadedMediaPath },
    });
    assert.equal(result.response.status, 204, "deletion succeeds with 204");
    const relativePath = uploadedMediaPath.replace("/uploads/", "");
    const resolved = path.resolve(uploadTestDir, ...relativePath.split("/"));
    assert.equal(fs.existsSync(resolved), false, "uploaded file must no longer exist on disk");
  });

  await t.test("create-only employee cannot update", async () => {
    const result = await request("/products/icare-product-1", {
      token: createEmp.body.token,
      method: "PUT",
      body: { name: { en: "Updated" } },
    });
    assert.equal(result.response.status, 403);
    assert.equal(result.body.message, "Access denied.");
  });

  await t.test("create-only employee cannot delete", async () => {
    const result = await request("/products/icare-product-1", {
      token: createEmp.body.token,
      method: "DELETE",
    });
    assert.equal(result.response.status, 403);
    assert.equal(result.body.message, "Access denied.");
  });

  await t.test("update-only employee cannot create", async () => {
    const result = await request("/products", {
      token: updateEmp.body.token,
      method: "POST",
      body: { name: { en: "Test" } },
    });
    assert.equal(result.response.status, 403);
    assert.equal(result.body.message, "Access denied.");
  });

  await t.test("update-only employee cannot delete", async () => {
    const result = await request("/products/icare-product-1", {
      token: updateEmp.body.token,
      method: "DELETE",
    });
    assert.equal(result.response.status, 403);
    assert.equal(result.body.message, "Access denied.");
  });

  await t.test("product media permission is independently enforced", async () => {
    const result = await request("/uploads", {
      token: mediaEmp.body.token,
      method: "POST",
    });
    assert.ok(result.response.status === 403 || result.response.status === 400, "uploads rejects or expects multipart");
  });

  await t.test("update-only employee cannot use legacy POST /uploads (website/company-root isolation)", async () => {
    const result = await request("/uploads", {
      token: updateEmp.body.token,
      method: "POST",
    });
    assert.equal(result.response.status, 403);
    assert.equal(result.body.message, "Product media permission required.");
  });

  await t.test("update-only employee can upload via product-scoped media route", async () => {
    const boundary = "----TestBoundaryUpdate" + Date.now();
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="update-only.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;
    const bodyBuffer = Buffer.concat([Buffer.from(header), Buffer.alloc(120, 0x41), Buffer.from(footer)]);
    const result = await fetch(`${baseUrl}/uploads/products/icare-product-1`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${updateEmp.body.token}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyBuffer,
    });
    assert.equal(result.status, 201, "products.update may upload product-scoped media");
    const json = await result.json();
    assert.ok(json.path?.includes("/products/icare-product-1/"));
    await request("/uploads/products/icare-product-1", {
      token: updateEmp.body.token,
      method: "DELETE",
      body: { path: json.path },
    });
  });

  await t.test("website-media-only employee may call legacy POST /uploads but not product-scoped uploads", async () => {
    const websiteMediaEmp = await login("website-media@icare.test");
    assert.equal(websiteMediaEmp.response.status, 200);
    const legacy = await request("/uploads", {
      token: websiteMediaEmp.body.token,
      method: "POST",
    });
    assert.notEqual(legacy.response.status, 403, "website_media.manage allows company-root image upload endpoint");
    assert.ok(legacy.response.status === 400 || legacy.response.status === 415 || legacy.response.status === 201);
    const scoped = await request("/uploads/products/icare-product-1", {
      token: websiteMediaEmp.body.token,
      method: "POST",
    });
    assert.equal(scoped.response.status, 403);
    assert.equal(scoped.body.message, "Product media permission required.");
  });

  await t.test("view-only employee still receives 403 on legacy POST /uploads", async () => {
    const result = await request("/uploads", {
      token: viewEmp.body.token,
      method: "POST",
    });
    assert.equal(result.response.status, 403);
    assert.equal(result.body.message, "Product media permission required.");
  });

  await t.test("employee without product permissions cannot access orders, customers, employees, settings, reports, memberships, or platform APIs", async () => {
    const token = noPermEmp.body.token;
    const restricted = [
      "/orders",
      "/employees",
      "/admin/customers",
      "/admin/reports",
      "/admin/activity-log",
      "/admin/export-store",
      "/admin/delivery-zones",
      "/admin/invoices",
    ];
    for (const path of restricted) {
      const result = await request(path, { token });
      assert.equal(result.response.status, 403, `${path} should be 403 for no-permission employee`);
    }
  });

  await t.test("product-only employee cannot access non-product admin pages", async () => {
    const token = viewEmp.body.token;
    const restricted = [
      "/orders",
      "/employees",
      "/admin/customers",
      "/admin/reports",
      "/admin/export-store",
      "/admin/delivery-zones",
    ];
    for (const path of restricted) {
      const result = await request(path, { token });
      assert.equal(result.response.status, 403, `${path} should be 403 for product-only employee`);
    }
  });

  await t.test("every product operation remains restricted to the authenticated employee's company", async () => {
    const token = productEmp.body.token;
    const productResult = await request("/products", { token });
    assert.equal(productResult.response.status, 200);
    assert.equal(productResult.body.every((p) => p.id && !p.id.startsWith("eb-")), true, "only iCare products returned");
  });

  await t.test("manager retains full product access without permission check", async () => {
    const token = managerEmp.body.token;
    const getResult = await request("/products", { token });
    assert.equal(getResult.response.status, 200, "manager can list products");

    const brand = await request("/brands", {
      token: icareCompanyAdmin.body.token,
      method: "POST",
      body: { slug: "manager-test-brand", name: "Manager Brand", country: "PS", isActive: true },
    });
    assert.equal(brand.response.status, 201);
    const main = await request("/categories", {
      token: icareCompanyAdmin.body.token,
      method: "POST",
      body: { slug: "manager-test-main", name: { en: "Manager Main" }, brandId: brand.body.id, parentId: null, isActive: true },
    });
    assert.equal(main.response.status, 201);
    const sub = await request("/categories", {
      token: icareCompanyAdmin.body.token,
      method: "POST",
      body: { slug: "manager-test-sub", name: { en: "Manager Sub" }, parentId: main.body.id, isActive: true },
    });
    assert.equal(sub.response.status, 201);

    const postResult = await request("/products", {
      token, method: "POST",
      body: {
        id: "manager-test-product",
        name: { en: "Manager Product" },
        brandId: brand.body.id,
        mainCategoryId: main.body.id,
        subcategoryId: sub.body.id,
        categoryId: sub.body.id,
      },
    });
    assert.equal(postResult.response.status, 201, "manager can create products");

    const putResult = await request("/products/manager-test-product", {
      token, method: "PUT",
      body: {
        name: { en: "Updated By Manager" },
        brandId: brand.body.id,
        mainCategoryId: main.body.id,
        subcategoryId: sub.body.id,
        categoryId: sub.body.id,
      },
    });
    assert.equal(putResult.response.status, 200, "manager can update products");

    const delResult = await request("/products/manager-test-product", {
      token, method: "DELETE",
    });
    assert.equal(delResult.response.status, 204, "manager can move products to trash");
    const permanent = await request("/products/manager-test-product/permanent", {
      token, method: "DELETE",
    });
    assert.equal(permanent.response.status, 204, "manager can permanently delete products");
  });

  await t.test("company_admin retains full product access without permission check", async () => {
    const token = icareCompanyAdmin.body.token;
    const getResult = await request("/products", { token });
    assert.equal(getResult.response.status, 200);
    const brand = await request("/brands", {
      token, method: "POST",
      body: { slug: "admin-test-brand", name: "Admin Brand", country: "PS", isActive: true },
    });
    assert.equal(brand.response.status, 201);
    const main = await request("/categories", {
      token, method: "POST",
      body: { slug: "admin-test-main", name: { en: "Admin Main" }, brandId: brand.body.id, parentId: null, isActive: true },
    });
    assert.equal(main.response.status, 201);
    const sub = await request("/categories", {
      token, method: "POST",
      body: { slug: "admin-test-sub", name: { en: "Admin Sub" }, parentId: main.body.id, isActive: true },
    });
    assert.equal(sub.response.status, 201);
    const postResult = await request("/products", {
      token, method: "POST",
      body: {
        id: "admin-test-product",
        name: { en: "Admin Product" },
        brandId: brand.body.id,
        mainCategoryId: main.body.id,
        subcategoryId: sub.body.id,
        categoryId: sub.body.id,
      },
    });
    assert.equal(postResult.response.status, 201);
    const delResult = await request("/products/admin-test-product", { token, method: "DELETE" });
    assert.equal(delResult.response.status, 204);
    const permanent = await request("/products/admin-test-product/permanent", { token, method: "DELETE" });
    assert.equal(permanent.response.status, 204);
  });

  await t.test("iCare employee cannot update EB Chemical product", async () => {
    const result = await request("/products/eb-product", {
      token: productEmp.body.token,
      method: "PUT",
      body: { name: { en: "Hacked" } },
    });
    assert.ok(result.response.status === 403 || result.response.status === 404, "cross-tenant update blocked");
  });

  await t.test("iCare employee cannot delete EB Chemical product", async () => {
    const result = await request("/products/eb-product", {
      token: productEmp.body.token,
      method: "DELETE",
    });
    assert.ok(result.response.status === 403 || result.response.status === 404, "cross-tenant delete blocked");
  });

  await t.test("companyId in body cannot change tenant context for employee product create", async () => {
    const brand = await request("/brands", {
      token: icareCompanyAdmin.body.token,
      method: "POST",
      body: { slug: "cross-tenant-brand", name: "Cross Brand", country: "PS", isActive: true },
    });
    assert.equal(brand.response.status, 201);
    const main = await request("/categories", {
      token: icareCompanyAdmin.body.token,
      method: "POST",
      body: { slug: "cross-tenant-main", name: { en: "Cross Main" }, brandId: brand.body.id, parentId: null, isActive: true },
    });
    assert.equal(main.response.status, 201);
    const sub = await request("/categories", {
      token: icareCompanyAdmin.body.token,
      method: "POST",
      body: { slug: "cross-tenant-sub", name: { en: "Cross Sub" }, parentId: main.body.id, isActive: true },
    });
    assert.equal(sub.response.status, 201);
    const result = await request("/products", {
      token: createEmp.body.token,
      method: "POST",
      body: {
        id: "cross-tenant-test",
        name: { en: "Cross Tenant" },
        brandId: brand.body.id,
        mainCategoryId: main.body.id,
        subcategoryId: sub.body.id,
        categoryId: sub.body.id,
        companyId: "eb-chemical",
        tenantId: "eb-chemical",
        company_id: "eb-chemical",
        tenant_id: "eb-chemical",
      },
    });
    assert.equal(result.response.status, 201, "body companyId is ignored; product created in employee's company");
    assert.equal(result.body.id, "cross-tenant-test", "product id matches");

    const icareLookup = await request("/products", { token: icareCompanyAdmin.body.token });
    assert.equal(icareLookup.response.status, 200);
    assert.ok(icareLookup.body.some((p) => p.id === "cross-tenant-test"), "product exists in iCare");

    const ebLookup = await request("/products", { headers: { "X-Company-Id": "eb-chemical" } });
    assert.equal(ebLookup.response.status, 200);
    assert.equal(ebLookup.body.some((p) => p.id === "cross-tenant-test"), false, "product is absent from EB Chemical");
  });

  await t.test("login response includes activeMembership with status, companyId, role, and permissions", async () => {
    const emp = productEmp.body;
    assert.ok(emp.activeMembership, "login response has activeMembership");
    assert.equal(emp.activeMembership.status, "active");
    assert.equal(emp.activeMembership.companyId, "icare");
    assert.equal(emp.activeMembership.role, "employee");
    assert.deepEqual(emp.activeMembership.permissions, ["products.view", "products.create", "products.update", "products.delete", "product_media.manage"]);
    assert.ok(emp.activeCompany, "login response has activeCompany");
    assert.equal(emp.activeCompany.id, "icare");
  });

  await t.test("/auth/me returns activeMembership with status, companyId, role, and permissions for employee", async () => {
    const result = await request("/auth/me", { token: productEmp.body.token });
    assert.equal(result.response.status, 200);
    assert.ok(result.body.activeMembership, "/auth/me has activeMembership");
    assert.equal(result.body.activeMembership.status, "active");
    assert.equal(result.body.activeMembership.companyId, "icare");
    assert.equal(result.body.activeMembership.role, "employee");
    assert.ok(Array.isArray(result.body.activeMembership.permissions), "permissions is an array");
    assert.ok(result.body.activeCompany, "/auth/me has activeCompany");
    assert.equal(result.body.activeCompany.id, "icare");
  });

  await t.test("/auth/me returns activeMembership with status, companyId, and role for company_admin", async () => {
    const result = await request("/auth/me", { token: icareCompanyAdmin.body.token });
    assert.equal(result.response.status, 200);
    assert.ok(result.body.activeMembership, "/auth/me has activeMembership");
    assert.equal(result.body.activeMembership.status, "active");
    assert.equal(result.body.activeMembership.companyId, "icare");
    assert.equal(result.body.activeMembership.role, "company_admin");
    assert.equal(result.body.activeCompany.id, "icare");
  });

  await t.test("employee with inactive membership is rejected", async () => {
    const result = await request("/auth/login", {
      body: { email: "inactive@test.local", password },
    });
    assert.equal(result.response.status, 403);
  });

  await t.test("employee work-session self-only: another employee's ID returns 403", async () => {
    const otherEmployeeResult = await request("/work-sessions/employees/eb-employee", {
      token: productEmp.body.token,
    });
    assert.equal(otherEmployeeResult.response.status, 403);
    assert.equal(otherEmployeeResult.body.message, "Work session access denied.");
  });

  // ── Category/brand product-form dependency tests ────────────────────────

  let icareCategoryId;
  let icareBrandId;

  await t.test("setup known iCare categories and brands for product-form tests", async () => {
    const cat = await request("/categories", {
      token: icareCompanyAdmin.body.token,
      method: "POST",
      body: { slug: "product-form-category", name: { en: "Product Form Category" }, isActive: true },
    });
    assert.equal(cat.response.status, 201);
    icareCategoryId = cat.body.id;

    const br = await request("/brands", {
      token: icareCompanyAdmin.body.token,
      method: "POST",
      body: { slug: "product-form-brand", name: "Product Form Brand", country: "PS", isActive: true },
    });
    assert.equal(br.response.status, 201);
    icareBrandId = br.body.id;
  });

  await t.test("iCare product employee GET categories returns iCare categories", async () => {
    const result = await request("/categories", { token: productEmp.body.token });
    assert.equal(result.response.status, 200);
    assert.ok(Array.isArray(result.body), "categories is an array");
    assert.ok(result.body.some((c) => c.id === icareCategoryId), "iCare category is visible to iCare employee");
  });

  await t.test("iCare product employee GET brands returns iCare brands", async () => {
    const result = await request("/brands", { token: productEmp.body.token });
    assert.equal(result.response.status, 200);
    assert.ok(Array.isArray(result.body), "brands is an array");
    assert.ok(result.body.some((b) => b.id === icareBrandId), "iCare brand is visible to iCare employee");
  });

  await t.test("product employee without category permissions cannot POST a category", async () => {
    const result = await request("/categories", {
      token: productEmp.body.token,
      method: "POST",
      body: { slug: "emp-created-category", name: { en: "Employee Created Category" }, isActive: true },
    });
    assert.equal(result.response.status, 403, "products.create does not grant categories.create");
  });

  await t.test("product employee without brand permissions cannot POST a brand", async () => {
    const result = await request("/brands", {
      token: productEmp.body.token,
      method: "POST",
      body: { slug: "emp-created-brand", name: "Employee Created Brand", country: "PS", isActive: true },
    });
    assert.equal(result.response.status, 403, "products.create does not grant brands.create");
  });

  await t.test("product employee without category permissions cannot PATCH a category", async () => {
    const result = await request(`/categories/${icareCategoryId}`, {
      token: productEmp.body.token,
      method: "PATCH",
      body: { name: { en: "Updated By Employee" } },
    });
    assert.equal(result.response.status, 403, "products.update does not grant categories.update");
  });

  await t.test("product employee without brand permissions cannot PATCH a brand", async () => {
    const result = await request(`/brands/${icareBrandId}`, {
      token: productEmp.body.token,
      method: "PATCH",
      body: { name: "Updated By Employee" },
    });
    assert.equal(result.response.status, 403, "products.update does not grant brands.update");
  });

  await t.test("product employee without category permissions cannot DELETE a category", async () => {
    const cat = await request("/categories", {
      token: icareCompanyAdmin.body.token,
      method: "POST",
      body: { slug: "emp-deletable-category", name: { en: "To Be Deleted" }, isActive: true },
    });
    assert.equal(cat.response.status, 201);
    const result = await request(`/categories/${cat.body.id}`, {
      token: productEmp.body.token,
      method: "DELETE",
    });
    assert.equal(result.response.status, 403, "products.delete does not grant categories.delete");
  });

  await t.test("product employee without brand permissions cannot DELETE a brand", async () => {
    const br = await request("/brands", {
      token: icareCompanyAdmin.body.token,
      method: "POST",
      body: { slug: "emp-deletable-brand", name: "To Be Deleted Brand", country: "PS", isActive: true },
    });
    assert.equal(br.response.status, 201);
    const result = await request(`/brands/${br.body.id}`, {
      token: productEmp.body.token,
      method: "DELETE",
    });
    assert.equal(result.response.status, 403, "products.delete does not grant brands.delete");
  });

  await t.test("catalog employee with category permissions can POST, PATCH, and DELETE categories", async () => {
    const cat = await request("/categories", {
      token: catalogEmp.body.token,
      method: "POST",
      body: { slug: "catalog-emp-category", name: { en: "Catalog Employee Category" }, isActive: true },
    });
    assert.equal(cat.response.status, 201, "categories.create allows catalog employee to create a category");
    const patch = await request(`/categories/${cat.body.id}`, {
      token: catalogEmp.body.token,
      method: "PATCH",
      body: { name: { en: "Catalog Employee Updated" } },
    });
    assert.equal(patch.response.status, 200, "categories.update allows catalog employee to update a category");
    const del = await request(`/categories/${cat.body.id}`, {
      token: catalogEmp.body.token,
      method: "DELETE",
    });
    assert.equal(del.response.status, 204, "categories.delete allows catalog employee to delete a category");
  });

  await t.test("catalog employee with brand permissions can POST, PATCH, and DELETE brands", async () => {
    const br = await request("/brands", {
      token: catalogEmp.body.token,
      method: "POST",
      body: { slug: "catalog-emp-brand", name: "Catalog Employee Brand", country: "PS", isActive: true },
    });
    assert.equal(br.response.status, 201, "brands.create allows catalog employee to create a brand");
    const patch = await request(`/brands/${br.body.id}`, {
      token: catalogEmp.body.token,
      method: "PATCH",
      body: { name: "Catalog Employee Updated" },
    });
    assert.equal(patch.response.status, 200, "brands.update allows catalog employee to update a brand");
    const del = await request(`/brands/${br.body.id}`, {
      token: catalogEmp.body.token,
      method: "DELETE",
    });
    assert.equal(del.response.status, 204, "brands.delete allows catalog employee to delete a brand");
  });

  await t.test("view-only employee GET categories returns 200", async () => {
    const result = await request("/categories", { token: viewEmp.body.token });
    assert.equal(result.response.status, 200);
  });

  await t.test("view-only employee cannot POST a category", async () => {
    const result = await request("/categories", {
      token: viewEmp.body.token,
      method: "POST",
      body: { slug: "view-emp-category", name: { en: "View Only Category" } },
    });
    assert.equal(result.response.status, 403);
  });

  await t.test("view-only employee cannot PATCH a category", async () => {
    const result = await request(`/categories/${icareCategoryId}`, {
      token: viewEmp.body.token,
      method: "PATCH",
      body: { name: { en: "Hacked" } },
    });
    assert.equal(result.response.status, 403);
  });

  await t.test("view-only employee cannot DELETE a category", async () => {
    const result = await request(`/categories/${icareCategoryId}`, {
      token: viewEmp.body.token,
      method: "DELETE",
    });
    assert.equal(result.response.status, 403);
  });

  await t.test("view-only employee cannot POST a brand", async () => {
    const result = await request("/brands", {
      token: viewEmp.body.token,
      method: "POST",
      body: { slug: "view-emp-brand", name: "View Only Brand" },
    });
    assert.equal(result.response.status, 403);
  });

  await t.test("view-only employee cannot PATCH a brand", async () => {
    const result = await request(`/brands/${icareBrandId}`, {
      token: viewEmp.body.token,
      method: "PATCH",
      body: { name: "Hacked" },
    });
    assert.equal(result.response.status, 403);
  });

  await t.test("view-only employee cannot DELETE a brand", async () => {
    const result = await request(`/brands/${icareBrandId}`, {
      token: viewEmp.body.token,
      method: "DELETE",
    });
    assert.equal(result.response.status, 403);
  });

  await t.test("category-create-only employee can POST but not update or delete categories", async () => {
    const cat = await request("/categories", {
      token: categoryCreateEmp.body.token,
      method: "POST",
      body: { slug: "create-only-category", name: { en: "Create Only" }, isActive: true },
    });
    assert.equal(cat.response.status, 201, "categories.create employee can create a category");
    const patchResult = await request(`/categories/${cat.body.id}`, {
      token: categoryCreateEmp.body.token,
      method: "PATCH",
      body: { name: { en: "Updated" } },
    });
    assert.equal(patchResult.response.status, 403, "categories.create-only employee cannot update");
    const deleteResult = await request(`/categories/${cat.body.id}`, {
      token: categoryCreateEmp.body.token,
      method: "DELETE",
    });
    assert.equal(deleteResult.response.status, 403, "categories.create-only employee cannot delete");
    await request(`/categories/${cat.body.id}`, { token: icareCompanyAdmin.body.token, method: "DELETE" });
  });

  await t.test("category-update-only employee can PATCH but not create or delete categories", async () => {
    const cat = await request("/categories", {
      token: categoryUpdateEmp.body.token,
      method: "POST",
      body: { slug: "update-only-category", name: { en: "Update Only" }, isActive: true },
    });
    assert.equal(cat.response.status, 403, "categories.update-only employee cannot create a category");
    const patchResult = await request(`/categories/${icareCategoryId}`, {
      token: categoryUpdateEmp.body.token,
      method: "PATCH",
      body: { name: { en: "Updated By Update-Only" } },
    });
    assert.equal(patchResult.response.status, 200, "categories.update-only employee can update a category");
  });

  await t.test("product-only employee cannot create or update categories", async () => {
    const cat = await request("/categories", {
      token: createEmp.body.token,
      method: "POST",
      body: { slug: "product-only-category", name: { en: "Product Only" }, isActive: true },
    });
    assert.equal(cat.response.status, 403, "products.create does not grant categories.create");
    const patchResult = await request(`/categories/${icareCategoryId}`, {
      token: updateEmp.body.token,
      method: "PATCH",
      body: { name: { en: "Hacked" } },
    });
    assert.equal(patchResult.response.status, 403, "products.update does not grant categories.update");
  });

  await t.test("EB Chemical employee cannot retrieve iCare category options", async () => {
    const ebEmp = await login("employee@eb.test");
    assert.equal(ebEmp.response.status, 200, "EB employee login ok");
    const result = await request("/categories", { token: ebEmp.body.token });
    assert.equal(result.response.status, 200);
    assert.ok(Array.isArray(result.body), "categories is an array");
    assert.equal(result.body.some((c) => c.id === icareCategoryId), false, "iCare category is absent from EB response");
  });

  await t.test("EB Chemical employee cannot retrieve iCare brand options", async () => {
    const ebEmp = await login("employee@eb.test");
    assert.equal(ebEmp.response.status, 200, "EB employee login ok");
    const result = await request("/brands", { token: ebEmp.body.token });
    assert.equal(result.response.status, 200);
    assert.ok(Array.isArray(result.body), "brands is an array");
    assert.equal(result.body.some((b) => b.id === icareBrandId), false, "iCare brand is absent from EB response");
  });
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  fs.rmSync(dataStoreDir, { recursive: true, force: true });
});
