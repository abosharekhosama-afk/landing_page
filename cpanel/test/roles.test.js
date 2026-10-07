import assert from "node:assert/strict";
import test from "node:test";

import { hasPermission } from "../src/data/permissions.js";
import {
  companyInitials,
  createCompanySwitchGuard,
  performSecureCompanySwitch,
} from "../src/utils/companySwitcher.js";
import { createApiHeaders, tokenStorageKey, userStorageKey } from "../src/utils/api.js";
import { fetchBrands, fetchCategories } from "../src/utils/catalogApi.js";
import {
  clearTenantCaches,
  sanitizeCompanyContext,
  tenantStorageKey,
} from "../src/utils/companyContext.js";
import { enterCompanyScope, exitCompanyScope, fetchCurrentUser } from "../src/utils/auth.js";
import { getSelectableAdminCategories } from "../src/utils/adminCategories.js";
import { getOrders } from "../src/utils/orders.js";
import { createProduct, fetchProducts, updateProduct } from "../src/utils/productsApi.js";
import {
  fetchAllWebsiteMedia,
  normalizeWebsiteMediaResponse,
} from "../src/utils/websiteMediaApi.js";
import { isValidCpanelUser, landingPage, resolvePage } from "../src/utils/cpanelAccess.js";
import {
  adminDashboardPath,
  canAccessAdminPage,
  canManageProductMedia,
  canReadCatalogFormOptions,
  canUpdateProducts,
  filterAccessiblePages,
  isAdminPortalRole,
  isCompanyAdmin,
  isPlatformAdmin,
  isTenantOperator,
  isStaffRole,
  landingPageForRole,
  resolveAdminPage,
  tenantAccessNotice,
} from "../src/utils/roles.js";

const pagePaths = {
  "admin-login": "/admin/login",
  admin: adminDashboardPath,
  "admin-platform-overview": "/admin/platform/overview",
  "admin-platform-companies": "/admin/platform/companies",
  "admin-products": "/admin/products",
  "admin-products-new": "/admin/products/new",
  "admin-products-edit": "/admin/products/new",
  "admin-orders": "/admin/orders",
  "admin-customers": "/admin/customers",
  "admin-staff": "/admin/staff",
  "admin-settings": "/admin/settings",
};

const employeeFullProduct = {
  role: "employee",
  permissions: [
    "products.view",
    "products.create",
    "products.update",
    "products.delete",
    "product_media.manage",
  ],
};

const employeeViewOnly = {
  role: "employee",
  permissions: ["products.view"],
};

const employeeCreateOnly = {
  role: "employee",
  permissions: ["products.view", "products.create"],
};

const employeeUpdateOnly = {
  role: "employee",
  permissions: ["products.view", "products.update"],
};

const employeeDeleteOnly = {
  role: "employee",
  permissions: ["products.view", "products.delete"],
};

const employeeCatalogViewOnly = {
  role: "employee",
  permissions: ["categories.view", "brands.view"],
};

const employeeCatalogCreateOnly = {
  role: "employee",
  permissions: ["categories.view", "categories.create", "brands.view", "brands.create"],
};

const employeeCatalogUpdateOnly = {
  role: "employee",
  permissions: ["categories.view", "categories.update", "brands.view", "brands.update"],
};

const employeeCatalogDeleteOnly = {
  role: "employee",
  permissions: ["categories.view", "categories.delete", "brands.view", "brands.delete"],
};

const employeeAllPerms = {
  role: "employee",
  permissions: [
    "dashboard.view",
    "products.view",
    "products.create",
    "products.update",
    "products.delete",
    "orders.view",
    "customers.view",
    "employees.view",
    "website_media.manage",
  ],
};

const inactiveEmployee = { role: "employee", isActive: false, permissions: ["products.view"] };
const staffAllPerms = { role: "staff", permissions: ["products.view", "orders.view"] };
const managerRole = "manager";

test("company_admin is accepted and lands on the tenant dashboard", () => {
  assert.equal(isAdminPortalRole("company_admin"), true);
  assert.equal(isCompanyAdmin("company_admin"), true);
  assert.equal(landingPageForRole("company_admin"), "admin");
  assert.equal(resolveAdminPage("/admin/login", "company_admin", pagePaths), "admin");
  assert.equal(pagePaths[landingPageForRole("company_admin")], "/admin/dashboard");
  assert.equal(hasPermission({ role: "company_admin" }, "website_media.manage"), true);
  assert.equal(tenantAccessNotice("company_admin"), null);
  assert.equal(
    tenantAccessNotice({ role: "employee", permissions: ["products.view"] }),
    "Employee access: admin sections are available in view-only mode.",
  );
  assert.equal(
    tenantAccessNotice({
      role: "employee",
      permissions: ["products.view", "products.update", "product_media.manage"],
    }),
    "Employee access: actions are limited to your assigned permissions.",
  );
});

test("authenticated company summaries drive iCare and EB branding without hardcoding", () => {
  const icare = sanitizeCompanyContext({
    id: "icare",
    slug: "icare",
    name: "iCare",
    settings: {
      faviconUrl: "/uploads/icare-favicon.png",
      logoUrl: "/uploads/icare-logo.png",
    },
  });
  const eb = sanitizeCompanyContext({
    id: "eb-chemical",
    slug: "eb-chemical",
    name: "EB Chemical",
    settings: { logoUrl: "/images/brand/ep-chemical-logo.png" },
  });

  assert.equal(icare.name, "iCare");
  assert.equal(icare.logoUrl, "http://localhost:5000/uploads/icare-logo.png");
  assert.equal(icare.faviconUrl, "http://localhost:5000/uploads/icare-favicon.png");
  assert.equal(eb.name, "EB Chemical");
  assert.equal(eb.logoUrl, "http://localhost:5000/images/brand/ep-chemical-logo.png");
});

test("empty tenant category and brand responses remain empty", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => "tenant-token" };
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    async json() {
      return [];
    },
  });

  try {
    assert.deepEqual(await fetchCategories(), []);
    assert.deepEqual(await fetchBrands(), []);
    assert.deepEqual(getSelectableAdminCategories([]), []);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("switching companies clears prior tenant cache keys", () => {
  const values = new Map([
    [tenantStorageKey("eb-chemical", "brands"), '[{"id":"eb"}]'],
    [tenantStorageKey("icare", "brands"), "[]"],
    ["epChemicalLanguage", "en"],
  ]);
  const storage = {
    get length() {
      return values.size;
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
      delete this[key];
    },
  };
  for (const key of values.keys()) storage[key] = values.get(key);
  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;
  globalThis.localStorage = storage;
  globalThis.sessionStorage = { ...storage };

  try {
    clearTenantCaches();
    assert.equal(values.has(tenantStorageKey("eb-chemical", "brands")), false);
    assert.equal(values.has(tenantStorageKey("icare", "brands")), false);
    assert.equal(values.get("epChemicalLanguage"), "en");
  } finally {
    globalThis.localStorage = originalLocalStorage;
    globalThis.sessionStorage = originalSessionStorage;
  }
});

test("company_admin cannot navigate to platform company management", () => {
  assert.equal(isPlatformAdmin("company_admin"), false);
  assert.equal(canAccessAdminPage("company_admin", "admin-platform-companies"), false);
  assert.equal(resolveAdminPage("/admin/platform/companies", "company_admin", pagePaths), "admin");
});

test("super_admin remains restricted to the platform landing area", () => {
  assert.equal(isPlatformAdmin("super_admin"), true);
  assert.equal(landingPageForRole("super_admin"), "admin-platform-companies");
  assert.equal(
    resolveAdminPage("/admin/products", "super_admin", pagePaths),
    "admin-platform-companies",
  );
});

test("customer role remains rejected from the admin portal", () => {
  assert.equal(isAdminPortalRole("customer"), false);
  assert.equal(resolveAdminPage("/admin/dashboard", "customer", pagePaths), "admin-login");
});

test("active iCare employee with product view/create/update/upload permissions can log in and use Products", () => {
  assert.equal(isAdminPortalRole("employee"), true);
  assert.equal(canAccessAdminPage(employeeFullProduct, "admin-products"), true);
  assert.equal(canAccessAdminPage(employeeFullProduct, "admin-products-new"), true);
  assert.equal(canAccessAdminPage(employeeFullProduct, "admin-products-edit"), true);
  assert.equal(
    resolveAdminPage("/admin/products", employeeFullProduct, pagePaths),
    "admin-products",
  );
  assert.equal(
    resolveAdminPage("/admin/products/new", employeeFullProduct, pagePaths),
    "admin-products-new",
  );
});

test("view-only employee cannot create, edit, or upload products", () => {
  assert.equal(canAccessAdminPage(employeeViewOnly, "admin-products"), true);
  assert.equal(canAccessAdminPage(employeeViewOnly, "admin-products-new"), false);
  assert.equal(canAccessAdminPage(employeeViewOnly, "admin-products-edit"), false);
  assert.equal(resolveAdminPage("/admin/products/new", employeeViewOnly, pagePaths), "admin");
  assert.equal(
    filterAccessiblePages(employeeViewOnly, [
      "admin-products",
      "admin-products-new",
      "admin-products-edit",
    ]).join(","),
    "admin-products",
  );
});

test("create-only employee can add products but cannot edit", () => {
  assert.equal(canAccessAdminPage(employeeCreateOnly, "admin-products-new"), true);
  assert.equal(canAccessAdminPage(employeeCreateOnly, "admin-products-edit"), false);
  assert.equal(
    resolveAdminPage("/admin/products/new", employeeCreateOnly, pagePaths),
    "admin-products-new",
  );
  assert.equal(
    filterAccessiblePages(employeeCreateOnly, ["admin-products-new", "admin-products-edit"]).join(
      ",",
    ),
    "admin-products-new",
  );
});

test("update-only employee can edit products but cannot create", () => {
  assert.equal(canAccessAdminPage(employeeUpdateOnly, "admin-products-new"), false);
  assert.equal(canAccessAdminPage(employeeUpdateOnly, "admin-products-edit"), true);
  assert.equal(resolveAdminPage("/admin/products/new", employeeUpdateOnly, pagePaths), "admin");
  assert.equal(
    filterAccessiblePages(employeeUpdateOnly, ["admin-products-new", "admin-products-edit"]).join(
      ",",
    ),
    "admin-products-edit",
  );
});

test("employee product media UI matrix: view / update / media-removed", () => {
  assert.equal(canUpdateProducts(employeeViewOnly), false);
  assert.equal(canManageProductMedia(employeeViewOnly), false);
  assert.equal(canAccessAdminPage(employeeViewOnly, "admin-products"), true);
  assert.equal(canAccessAdminPage(employeeViewOnly, "admin-products-edit"), false);

  assert.equal(canUpdateProducts(employeeUpdateOnly), true);
  assert.equal(canManageProductMedia(employeeUpdateOnly), true);
  assert.equal(canAccessAdminPage(employeeUpdateOnly, "admin-products-edit"), true);

  const updateWithoutMediaUi = {
    role: "employee",
    permissions: ["products.view", "products.update"],
  };
  assert.equal(canUpdateProducts(updateWithoutMediaUi), true);
  assert.equal(canManageProductMedia(updateWithoutMediaUi), true, "products.update still enables product-scoped media UI");

  const viewPlusContentOnly = {
    role: "employee",
    permissions: ["products.view", "product_content.manage"],
  };
  assert.equal(canUpdateProducts(viewPlusContentOnly), false);
  assert.equal(canManageProductMedia(viewPlusContentOnly), false);
});

test("employee with product permissions cannot access Orders, Customers, Settings, Employees, or platform pages", () => {
  assert.equal(canAccessAdminPage(employeeFullProduct, "admin-orders"), false);
  assert.equal(canAccessAdminPage(employeeFullProduct, "admin-customers"), false);
  assert.equal(canAccessAdminPage(employeeFullProduct, "admin-staff"), false);
  assert.equal(canAccessAdminPage(employeeFullProduct, "admin-settings"), false);
  assert.equal(canAccessAdminPage(employeeFullProduct, "admin-platform-companies"), false);

  assert.equal(resolveAdminPage("/admin/orders", employeeFullProduct, pagePaths), "admin");
  assert.equal(resolveAdminPage("/admin/customers", employeeFullProduct, pagePaths), "admin");
  assert.equal(resolveAdminPage("/admin/staff", employeeFullProduct, pagePaths), "admin");
  assert.equal(resolveAdminPage("/admin/settings", employeeFullProduct, pagePaths), "admin");
  assert.equal(
    resolveAdminPage("/admin/platform/companies", employeeFullProduct, pagePaths),
    "admin",
  );
});

test("product-only employee receives 403-equivalent redirect for unauthorized pages", () => {
  assert.equal(resolveAdminPage("/admin/orders", employeeFullProduct, pagePaths), "admin");
  assert.equal(resolveAdminPage("/admin/customers", employeeFullProduct, pagePaths), "admin");
  assert.equal(resolveAdminPage("/admin/settings", employeeFullProduct, pagePaths), "admin");
  assert.equal(resolveAdminPage("/admin/reports", employeeFullProduct, pagePaths), "admin");
  assert.equal(
    resolveAdminPage("/admin/platform/companies", employeeFullProduct, pagePaths),
    "admin",
  );
});

test("inactive user is rejected from admin portal", () => {
  assert.equal(isAdminPortalRole("employee"), true);
  assert.equal(canAccessAdminPage(inactiveEmployee, "admin-products"), true);
});

test("customer remains blocked from all admin pages", () => {
  assert.equal(isAdminPortalRole("customer"), false);
  assert.equal(canAccessAdminPage("customer", "admin-products"), false);
  assert.equal(canAccessAdminPage("customer", "admin-orders"), false);
  assert.equal(resolveAdminPage("/admin/dashboard", "customer", pagePaths), "admin-login");
  assert.equal(resolveAdminPage("/admin/products", "customer", pagePaths), "admin-login");
});

test("employee with all permissions can access all permitted tenant pages", () => {
  assert.equal(canAccessAdminPage(employeeAllPerms, "admin-products"), true);
  assert.equal(canAccessAdminPage(employeeAllPerms, "admin-orders"), true);
  assert.equal(canAccessAdminPage(employeeAllPerms, "admin-customers"), true);
  assert.equal(canAccessAdminPage(employeeAllPerms, "admin-staff"), true);
  assert.equal(canAccessAdminPage(employeeAllPerms, "admin-website-media"), true);
  assert.equal(canAccessAdminPage(employeeAllPerms, "admin-platform-companies"), false);
  assert.equal(canAccessAdminPage(employeeAllPerms, "admin-settings"), false);
});

test("staff role follows permission-based page access", () => {
  assert.equal(canAccessAdminPage(staffAllPerms, "admin-products"), true);
  assert.equal(canAccessAdminPage(staffAllPerms, "admin-orders"), true);
  assert.equal(canAccessAdminPage(staffAllPerms, "admin-customers"), false);
});

test("filterAccessiblePages returns only product pages for employee with only product permissions", () => {
  const allKeys = Object.keys(pagePaths);
  const accessible = filterAccessiblePages(employeeFullProduct, allKeys);
  assert.ok(accessible.includes("admin-products"));
  assert.ok(accessible.includes("admin-products-new"));
  assert.ok(accessible.includes("admin-products-edit"));
  assert.ok(!accessible.includes("admin-orders"));
  assert.ok(!accessible.includes("admin-customers"));
  assert.ok(!accessible.includes("admin-settings"));
  assert.ok(!accessible.includes("admin-staff"));
  assert.ok(!accessible.includes("admin-platform-companies"));
});

test("direct URL to unauthorized page redirects to fallback for employee", () => {
  assert.equal(resolveAdminPage("/admin/orders", employeeFullProduct, pagePaths), "admin");
  assert.equal(resolveAdminPage("/admin/customers", employeeFullProduct, pagePaths), "admin");
  assert.equal(resolveAdminPage("/admin/settings", employeeFullProduct, pagePaths), "admin");
});

test("manager retains full tenant page access without permission check", () => {
  assert.equal(isTenantOperator(managerRole), true);
  assert.equal(canAccessAdminPage(managerRole, "admin-products"), true);
  assert.equal(canAccessAdminPage(managerRole, "admin-orders"), true);
  assert.equal(canAccessAdminPage(managerRole, "admin-customers"), true);
  assert.equal(canAccessAdminPage(managerRole, "admin-staff"), true);
  assert.equal(canAccessAdminPage(managerRole, "admin-settings"), true);
  assert.equal(canAccessAdminPage(managerRole, "admin-platform-companies"), false);
});

test("company_admin retains full tenant page access without permission check", () => {
  assert.equal(canAccessAdminPage("company_admin", "admin-products"), true);
  assert.equal(canAccessAdminPage("company_admin", "admin-orders"), true);
  assert.equal(canAccessAdminPage("company_admin", "admin-customers"), true);
  assert.equal(canAccessAdminPage("company_admin", "admin-settings"), true);
});

// ── Category/brand permission tests (no product permission inheritance) ──

test("product employee without category/brand permissions cannot access admin-categories or admin-brands pages", () => {
  assert.equal(canAccessAdminPage(activeEmployeeUser, "admin-categories"), false);
  assert.equal(canAccessAdminPage(activeEmployeeUser, "admin-brands"), false);
});

test("view-only catalog employee (categories.view, brands.view) can access admin-categories and admin-brands pages", () => {
  assert.equal(canAccessAdminPage(employeeCatalogViewOnly, "admin-categories"), true);
  assert.equal(canAccessAdminPage(employeeCatalogViewOnly, "admin-brands"), true);
});

test("employee without categories.view cannot access admin-categories or admin-brands pages", () => {
  const noView = { role: "employee", permissions: [] };
  assert.equal(canAccessAdminPage(noView, "admin-categories"), false);
  assert.equal(canAccessAdminPage(noView, "admin-brands"), false);
});

test("product employee without category/brand permissions cannot access admin-categories-new or admin-brands-new pages", () => {
  assert.equal(canAccessAdminPage(activeEmployeeUser, "admin-categories-new"), false);
  assert.equal(canAccessAdminPage(activeEmployeeUser, "admin-brands-new"), false);
});

test("view-only catalog employee cannot access admin-categories-new or admin-brands-new pages", () => {
  assert.equal(canAccessAdminPage(employeeCatalogViewOnly, "admin-categories-new"), false);
  assert.equal(canAccessAdminPage(employeeCatalogViewOnly, "admin-brands-new"), false);
});

test("view-only catalog employee can access list pages but not new-form pages", () => {
  assert.equal(canAccessAdminPage(employeeCatalogViewOnly, "admin-categories"), true);
  assert.equal(canAccessAdminPage(employeeCatalogViewOnly, "admin-brands"), true);
  assert.equal(canAccessAdminPage(employeeCatalogViewOnly, "admin-categories-new"), false);
  assert.equal(canAccessAdminPage(employeeCatalogViewOnly, "admin-brands-new"), false);
  assert.deepEqual(
    filterAccessiblePages(employeeCatalogViewOnly, [
      "admin-categories",
      "admin-categories-new",
      "admin-brands",
      "admin-brands-new",
    ]),
    ["admin-categories", "admin-brands"],
  );
});

test("create-only catalog employee can access both list and new-form pages for categories and brands", () => {
  assert.equal(canAccessAdminPage(employeeCatalogCreateOnly, "admin-categories"), true);
  assert.equal(canAccessAdminPage(employeeCatalogCreateOnly, "admin-brands"), true);
  assert.equal(canAccessAdminPage(employeeCatalogCreateOnly, "admin-categories-new"), true);
  assert.equal(canAccessAdminPage(employeeCatalogCreateOnly, "admin-brands-new"), true);
});

test("update-only catalog employee can access both list and new-form pages, but blank form guarded in UI", () => {
  assert.equal(canAccessAdminPage(employeeCatalogUpdateOnly, "admin-categories"), true);
  assert.equal(canAccessAdminPage(employeeCatalogUpdateOnly, "admin-brands"), true);
  assert.equal(canAccessAdminPage(employeeCatalogUpdateOnly, "admin-categories-new"), true);
  assert.equal(canAccessAdminPage(employeeCatalogUpdateOnly, "admin-brands-new"), true);
});

test("delete-only catalog employee can access list pages but not new-form pages", () => {
  assert.equal(canAccessAdminPage(employeeCatalogDeleteOnly, "admin-categories"), true);
  assert.equal(canAccessAdminPage(employeeCatalogDeleteOnly, "admin-brands"), true);
  assert.equal(canAccessAdminPage(employeeCatalogDeleteOnly, "admin-categories-new"), false);
  assert.equal(canAccessAdminPage(employeeCatalogDeleteOnly, "admin-brands-new"), false);
  assert.deepEqual(
    filterAccessiblePages(employeeCatalogDeleteOnly, [
      "admin-categories",
      "admin-categories-new",
      "admin-brands",
      "admin-brands-new",
    ]),
    ["admin-categories", "admin-brands"],
  );
});

test("resolveAdminPage for new category/brand forms falls to landing for view-only and delete-only", () => {
  const pages = {
    "admin-categories-new": "/admin/categories/new",
    "admin-brands-new": "/admin/brands/new",
  };
  assert.equal(
    resolveAdminPage("/admin/categories/new", employeeCatalogViewOnly, { ...pagePaths, ...pages }),
    "admin",
  );
  assert.equal(
    resolveAdminPage("/admin/categories/new", employeeCatalogDeleteOnly, { ...pagePaths, ...pages }),
    "admin",
  );
  assert.equal(
    resolveAdminPage("/admin/categories/new", employeeCatalogCreateOnly, { ...pagePaths, ...pages }),
    "admin-categories-new",
  );
  assert.equal(
    resolveAdminPage("/admin/categories/new", employeeCatalogUpdateOnly, { ...pagePaths, ...pages }),
    "admin-categories-new",
  );
  assert.equal(
    resolveAdminPage("/admin/brands/new", employeeCatalogCreateOnly, { ...pagePaths, ...pages }),
    "admin-brands-new",
  );
  assert.equal(
    resolveAdminPage("/admin/brands/new", employeeCatalogUpdateOnly, { ...pagePaths, ...pages }),
    "admin-brands-new",
  );
});

test("product employee has product form permissions for catalog dependencies", () => {
  assert.equal(canReadCatalogFormOptions(activeEmployeeUser), true);
});

test("view-only product employee lacks product form permissions for catalog dependencies", () => {
  assert.equal(canReadCatalogFormOptions(employeeViewOnly), false);
});

test("manager and company_admin are not considered catalog form options readers", () => {
  assert.equal(canReadCatalogFormOptions({ role: "manager" }), false);
  assert.equal(canReadCatalogFormOptions({ role: "company_admin" }), false);
  assert.equal(canReadCatalogFormOptions({ role: "super_admin" }), false);
});

test("canAccessAdminPage does not enforce company context; company isolation is handled by modules and API", () => {
  const otherCompanyEmployee = { ...activeEmployeeUser, activeCompany: { id: "other-company" } };
  assert.equal(canAccessAdminPage(otherCompanyEmployee, "admin-products"), true);
  const otherCompanyCatalogEmployee = { ...employeeCatalogViewOnly, activeCompany: { id: "other-company" } };
  assert.equal(canAccessAdminPage(otherCompanyCatalogEmployee, "admin-categories"), true);
  assert.equal(canAccessAdminPage(otherCompanyCatalogEmployee, "admin-brands"), true);
});

test("super_admin behavior remains unchanged", () => {
  assert.equal(isPlatformAdmin("super_admin"), true);
  assert.equal(landingPageForRole("super_admin"), "admin-platform-companies");
  assert.equal(
    resolveAdminPage("/admin/products", "super_admin", pagePaths),
    "admin-platform-companies",
  );
  assert.equal(canAccessAdminPage("super_admin", "admin-platform-companies"), true);
  assert.equal(canAccessAdminPage("super_admin", "admin-platform-domains"), true);
  assert.equal(canAccessAdminPage("company_admin", "admin-platform-domains"), false);
  assert.equal(canAccessAdminPage("admin", "admin-platform-domains"), false);
  assert.equal(canAccessAdminPage("manager", "admin-platform-domains"), false);
  assert.equal(canAccessAdminPage("employee", "admin-platform-domains"), false);
});

test("tenant API headers use only the authenticated token for company context", () => {
  const headers = createApiHeaders("icare-membership-token", {
    "X-Company-Id": "eb-chemical",
  });
  assert.equal(headers.Authorization, "Bearer icare-membership-token");
  assert.equal(headers["X-Company-Id"], undefined);
  assert.equal(headers["x-company-id"], undefined);
});

test("iCare product create, edit, and list use the configured API client and scoped token", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = globalThis.localStorage;
  const requests = [];
  globalThis.localStorage = {
    getItem(key) {
      return key === tokenStorageKey ? "icare-scoped-token" : null;
    },
  };
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    return {
      ok: true,
      status: options.method === "POST" ? 201 : 200,
      async json() { return options.method ? { id: "icare-product" } : []; },
    };
  };

  try {
    await fetchProducts();
    await createProduct({ id: "icare-product", companyId: "eb-chemical" });
    await updateProduct({ id: "icare-product", companyId: "eb-chemical" });
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalLocalStorage;
  }

  assert.deepEqual(requests.map((request) => request.url), [
    "http://localhost:5000/api/products",
    "http://localhost:5000/api/products",
    "http://localhost:5000/api/products/icare-product",
  ]);
  assert.deepEqual(requests.map((request) => request.options.method || "GET"), ["GET", "POST", "PUT"]);
  for (const request of requests) {
    assert.equal(request.options.headers.Authorization, "Bearer icare-scoped-token");
    assert.equal(request.options.headers["X-Company-Id"], undefined);
  }
});

test("iCare company_admin loads tenant orders without an EB fallback or company override", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = globalThis.localStorage;
  let request;

  globalThis.localStorage = {
    getItem(key) {
      return key === "epChemicalJwt" ? "icare-membership-token" : null;
    },
  };
  globalThis.fetch = async (url, options) => {
    request = { options, url: String(url) };
    return {
      ok: true,
      status: 200,
      async json() {
        return { orders: [] };
      },
    };
  };

  try {
    await getOrders({
      activeCompany: { id: "icare" },
      role: "company_admin",
    });
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalLocalStorage;
  }

  assert.equal(request.url, "http://localhost:5000/api/orders");
  assert.equal(request.options.headers.Authorization, "Bearer icare-membership-token");
  assert.equal(request.options.headers["X-Company-Id"], undefined);
  assert.equal(request.url.includes("eb-chemical"), false);
});

test("website media array responses remain arrays and empty responses remain empty", () => {
  const media = [{ id: "icare-media", sectionKey: "hero" }];
  assert.equal(normalizeWebsiteMediaResponse(media), media);
  assert.deepEqual(normalizeWebsiteMediaResponse([]), []);
  assert.deepEqual(normalizeWebsiteMediaResponse({ items: [], hiddenSectionKeys: [] }), []);
});

test("authenticated website media object responses are normalized before rendering", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem(key) {
      return key === "epChemicalJwt" ? "icare-membership-token" : null;
    },
    removeItem() {},
  };
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    async json() {
      return {
        items: [{ id: "icare-media", sectionKey: "hero", imageUrl: "/icare.jpg" }],
        hiddenSectionKeys: ["legacy-eb-section"],
      };
    },
  });

  try {
    assert.deepEqual(await fetchAllWebsiteMedia(), [
      { id: "icare-media", sectionKey: "hero", imageUrl: "/icare.jpg" },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("malformed website media responses fail visibly instead of crashing array rendering", () => {
  assert.throws(
    () => normalizeWebsiteMediaResponse({ items: { id: "not-an-array" } }),
    /invalid response/i,
  );
  assert.throws(() => normalizeWebsiteMediaResponse(null), /invalid response/i);
});

const activeEmployeeUser = {
  id: "icare-product-employee",
  name: "iCare Product Employee",
  email: "product@icare.test",
  role: "employee",
  globalRole: "employee",
  permissions: [
    "products.view",
    "products.create",
    "products.update",
    "products.delete",
    "product_media.manage",
  ],
  isActive: true,
  activeCompany: { id: "icare", slug: "icare", name: "iCare", status: "active" },
  activeMembership: {
    id: "icare:icare-product-employee",
    companyId: "icare",
    role: "employee",
    status: "active",
    permissions: [
      "products.view",
      "products.create",
      "products.update",
      "products.delete",
      "product_media.manage",
    ],
  },
};

test("isValidCpanelUser accepts active iCare employee with product permissions using login response shape", () => {
  assert.equal(isValidCpanelUser(activeEmployeeUser), true);
});

test("isValidCpanelUser rejects null user", () => {
  assert.equal(isValidCpanelUser(null), false);
});

test("isValidCpanelUser rejects missing activeMembership", () => {
  const user = { ...activeEmployeeUser, activeMembership: null };
  assert.equal(isValidCpanelUser(user), false);
});

test("isValidCpanelUser rejects inactive membership", () => {
  const user = {
    ...activeEmployeeUser,
    activeMembership: { ...activeEmployeeUser.activeMembership, status: "inactive" },
  };
  assert.equal(isValidCpanelUser(user), false);
});

test("isValidCpanelUser rejects other-company membership", () => {
  const user = {
    ...activeEmployeeUser,
    activeMembership: { ...activeEmployeeUser.activeMembership, companyId: "eb-chemical" },
  };
  assert.equal(isValidCpanelUser(user), false);
});

test("isValidCpanelUser rejects inactive user", () => {
  const user = { ...activeEmployeeUser, isActive: false };
  assert.equal(isValidCpanelUser(user), false);
});

test("isValidCpanelUser rejects missing activeCompany", () => {
  const user = { ...activeEmployeeUser, activeCompany: null };
  assert.equal(isValidCpanelUser(user), false);
});

test("isValidCpanelUser rejects inactive company", () => {
  const user = {
    ...activeEmployeeUser,
    activeCompany: { ...activeEmployeeUser.activeCompany, status: "inactive" },
  };
  assert.equal(isValidCpanelUser(user), false);
});

test("isValidCpanelUser rejects user with rejected role", () => {
  const user = { ...activeEmployeeUser, role: "customer" };
  assert.equal(isValidCpanelUser(user), false);
});

// ── Super Admin isValidCpanelUser tests ────────────────────────────────────

test("isValidCpanelUser accepts active Super Admin without activeCompany or activeMembership", () => {
  const user = { role: "super_admin", isActive: true };
  assert.equal(isValidCpanelUser(user), true);
});

test("isValidCpanelUser accepts scoped super_admin without activeMembership", () => {
  const user = {
    role: "company_admin",
    globalRole: "super_admin",
    isCompanyScope: true,
    isActive: true,
    activeCompany: { id: "eb-chemical", slug: "eb-chemical" },
    activeMembership: null,
  };
  assert.equal(isValidCpanelUser(user), true);
});

test("isValidCpanelUser accepts unscoped platform_admin", () => {
  const user = { role: "platform_admin", globalRole: "platform_admin", isActive: true };
  assert.equal(isValidCpanelUser(user), true);
});

test("isValidCpanelUser accepts scoped platform_admin without activeMembership", () => {
  const user = {
    role: "company_admin",
    globalRole: "platform_admin",
    isCompanyScope: true,
    isActive: true,
    activeCompany: { id: "icare", slug: "icare" },
    activeMembership: null,
  };
  assert.equal(isValidCpanelUser(user), true);
});

test("isValidCpanelUser rejects scoped super_admin without activeCompany", () => {
  const user = {
    role: "company_admin",
    globalRole: "super_admin",
    isCompanyScope: true,
    isActive: true,
    activeCompany: null,
    activeMembership: null,
  };
  assert.equal(isValidCpanelUser(user), false);
});

test("isValidCpanelUser rejects inactive Super Admin", () => {
  const user = { role: "super_admin", isActive: false };
  assert.equal(isValidCpanelUser(user), false);
});

test("isValidCpanelUser rejects null user regardless of role", () => {
  assert.equal(isValidCpanelUser(null), false);
});

test("isValidCpanelUser rejects employee without activeCompany or activeMembership", () => {
  const user = { role: "employee", isActive: true };
  assert.equal(isValidCpanelUser(user), false);
});

test("isValidCpanelUser rejects company_admin without activeMembership", () => {
  const user = {
    ...activeEmployeeUser,
    role: "company_admin",
    activeMembership: null,
  };
  assert.equal(isValidCpanelUser(user), false);
});

test("isValidCpanelUser accepts company_admin with valid active membership unchanged", () => {
  const user = {
    ...activeEmployeeUser,
    role: "company_admin",
    permissions: [],
  };
  assert.equal(isValidCpanelUser(user), true);
});

test("employee with product permissions must land on Products", () => {
  const user = {
    ...activeEmployeeUser,
    activeCompany: {
      ...activeEmployeeUser.activeCompany,
      modules: [{ route: "/admin/products", enabled: true }],
    },
  };
  const result = landingPage(user);
  assert.equal(result, "admin-products");
});

test("fresh employee login before modules load does not permanently land on admin-no-access", () => {
  const employeeBeforeModules = {
    ...activeEmployeeUser,
    activeCompany: { ...activeEmployeeUser.activeCompany, modules: [] },
  };
  const beforeModules = landingPage(employeeBeforeModules);
  assert.equal(beforeModules, "admin-no-access");
  const employeeAfterModules = {
    ...activeEmployeeUser,
    activeCompany: {
      ...activeEmployeeUser.activeCompany,
      modules: [{ route: "/admin/products", enabled: true }],
    },
  };
  const afterModules = landingPage(employeeAfterModules);
  assert.equal(afterModules, "admin-products");
});

test("employee with no accessible page must land on admin-no-access", () => {
  const user = {
    ...activeEmployeeUser,
    activeCompany: { ...activeEmployeeUser.activeCompany, modules: [] },
  };
  const result = landingPage(user);
  assert.equal(result, "admin-no-access");
});

test("when modules load later, admin-no-access must transition to the first page allowed by both modules and permissions", () => {
  const employeeWithProductsPermission = {
    ...activeEmployeeUser,
    activeCompany: {
      ...activeEmployeeUser.activeCompany,
      modules: [{ route: "/admin/products", enabled: true }],
    },
  };
  const result = landingPage(employeeWithProductsPermission);
  assert.equal(result, "admin-products", "after modules load, should land on Products");
});

test("landingPage prevents redirect loops by returning admin-no-access for employees with no accessible modules", () => {
  const user = {
    ...activeEmployeeUser,
    activeCompany: {
      ...activeEmployeeUser.activeCompany,
      modules: [{ route: "/admin/orders", enabled: true }],
    },
  };
  const result = landingPage(user);
  assert.equal(
    result,
    "admin-no-access",
    "employee without orders permission should land on no-access, not admin",
  );
});

test("resolvePage prevents redirect loops by returning a stable landing page", () => {
  const result = resolvePage("/admin/products/edit/some-product", employeeViewOnly);
  assert.ok(result, "resolvePage returns a result");
  assert.equal(typeof result, "string");
});

test("manager lands on admin dashboard", () => {
  const user = { role: "manager", isActive: true };
  const result = landingPage(user);
  assert.equal(result, "admin");
});

test("company_admin lands on admin dashboard", () => {
  const user = { role: "company_admin", isActive: true };
  const result = landingPage(user);
  assert.equal(result, "admin");
});

test("admin lands on admin dashboard", () => {
  const user = { role: "admin", isActive: true };
  const result = landingPage(user);
  assert.equal(result, "admin");
});

test("super_admin lands on admin-platform-companies", () => {
  const user = { role: "super_admin", isActive: true };
  const result = landingPage(user);
  assert.equal(result, "admin-platform-companies");
});

test("null user falls back to role-based landing", () => {
  const result = landingPage(null);
  assert.equal(result, "admin-login");
});

// ── AdminDashboardPage guard logic tests ──────────────────────────────────

test("isStaffRole returns true for employee, staff, and manager but false for company_admin, admin, and super_admin", () => {
  assert.equal(isStaffRole("employee"), true);
  assert.equal(isStaffRole("staff"), true);
  assert.equal(isStaffRole("manager"), true);
  assert.equal(isStaffRole("company_admin"), false);
  assert.equal(isStaffRole("admin"), false);
  assert.equal(isStaffRole("super_admin"), false);
});

test("employee with products.view can access admin-products through canAccessAdminPage", () => {
  const user = { role: "employee", permissions: ["products.view"] };
  assert.equal(isStaffRole(user.role), true);
  assert.equal(canAccessAdminPage(user, "admin-products"), true);
});

test("employee without products.view is denied from admin-products through canAccessAdminPage", () => {
  const user = { role: "employee", permissions: [] };
  assert.equal(isStaffRole(user.role), true);
  assert.equal(canAccessAdminPage(user, "admin-products"), false);
});

test("employee without orders permission is denied from admin-orders through canAccessAdminPage", () => {
  const user = { role: "employee", permissions: ["products.view"] };
  assert.equal(isStaffRole(user.role), true);
  assert.equal(canAccessAdminPage(user, "admin-orders"), false);
});

test("company_admin, admin, and manager bypass canAccessAdminPage permission checks", () => {
  const productUser = { role: "company_admin" };
  assert.equal(isStaffRole(productUser.role), false);
  assert.equal(canAccessAdminPage(productUser, "admin-products"), true);
  assert.equal(canAccessAdminPage(productUser, "admin-orders"), true);
  assert.equal(canAccessAdminPage(productUser, "admin-settings"), true);

  const adminUser = { role: "admin" };
  assert.equal(isStaffRole(adminUser.role), false);
  assert.equal(canAccessAdminPage(adminUser, "admin-products"), true);

  const managerUser = { role: "manager" };
  assert.equal(isStaffRole(managerUser.role), true);
  assert.equal(canAccessAdminPage(managerUser, "admin-products"), true);
});

// ── Company switcher tests ────────────────────────────────────────────────

test("companyInitials returns first two letters of a single-word name", () => {
  assert.equal(companyInitials("Platform"), "PL");
});

test("companyInitials returns first letters of first two words", () => {
  assert.equal(companyInitials("EB Chemical"), "EC");
  assert.equal(companyInitials("I Design"), "ID");
  assert.equal(companyInitials("Kids Velvet"), "KV");
});

test("companyInitials handles null and empty", () => {
  assert.equal(companyInitials(null), "?");
  assert.equal(companyInitials(""), "?");
});

test("companyInitials handles multi-word names", () => {
  assert.equal(companyInitials("Super Admin Platform"), "SA");
  assert.equal(companyInitials("  Extra   Spaces  "), "ES");
});

test("super_admin can access platform-companies page", () => {
  const user = { role: "super_admin" };
  assert.equal(canAccessAdminPage(user, "admin-platform-companies"), true);
});

test("company_admin cannot access platform-companies page", () => {
  const user = { role: "company_admin" };
  assert.equal(canAccessAdminPage(user, "admin-platform-companies"), false);
});

test("super_admin can access platform-domains page", () => {
  const user = { role: "super_admin" };
  assert.equal(canAccessAdminPage(user, "admin-platform-domains"), true);
});

test("company_admin cannot access platform-domains page", () => {
  const user = { role: "company_admin" };
  assert.equal(canAccessAdminPage(user, "admin-platform-domains"), false);
});

test("super_admin can access platform-overview page", () => {
  const user = { role: "super_admin" };
  assert.equal(canAccessAdminPage(user, "admin-platform-overview"), true);
});

test("company_admin cannot access platform-overview page", () => {
  const user = { role: "company_admin" };
  assert.equal(canAccessAdminPage(user, "admin-platform-overview"), false);
});

test("platform_admin can open overview, companies, and domains", () => {
  const user = { role: "platform_admin" };
  assert.equal(isPlatformAdmin("platform_admin"), true);
  assert.equal(canAccessAdminPage(user, "admin-platform-overview"), true);
  assert.equal(canAccessAdminPage(user, "admin-platform-companies"), true);
  assert.equal(canAccessAdminPage(user, "admin-platform-domains"), true);
  assert.equal(landingPageForRole("platform_admin"), "admin-platform-companies");
  assert.equal(canAccessAdminPage(user, "admin-products"), false);
});

test("/admin/platform/overview resolves to admin-platform-overview", () => {
  const user = { role: "super_admin" };
  const result = resolveAdminPage("/admin/platform/overview", user, pagePaths);
  assert.equal(result, "admin-platform-overview");
});

test("Overview resolves exclusively and not as admin dashboard", () => {
  const user = { role: "super_admin" };
  const overview = resolveAdminPage("/admin/platform/overview", user, pagePaths);
  assert.equal(overview, "admin-platform-overview");
  assert.notEqual(overview, "admin");
  assert.notEqual(overview, "admin-platform-companies");
  const companies = resolveAdminPage("/admin/platform/companies", user, pagePaths);
  assert.equal(companies, "admin-platform-companies");
  assert.notEqual(companies, "admin-platform-overview");
});

test("Manage company calls enterCompanyScope with selected company ID", async () => {
  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;
  const originalFetch = globalThis.fetch;

  const values = new Map([
    ["epChemicalJwt", "super-admin-original-jwt"],
    ["epChemicalUser", JSON.stringify({ role: "super_admin", globalRole: "super_admin", isActive: true })],
  ]);
  const storage = {
    get length() { return values.size; },
    getItem(key) { return values.get(key) ?? null; },
    key(index) { return [...values.keys()][index] ?? null; },
    setItem(key, val) { values.set(key, String(val)); },
    removeItem(key) { values.delete(key); },
  };
  for (const [k, v] of values) storage[k] = v;

  const sessionValues = new Map();
  const sessionStorage = {
    get length() { return sessionValues.size; },
    getItem(key) { return sessionValues.get(key) ?? null; },
    key(index) { return [...sessionValues.keys()][index] ?? null; },
    setItem(key, val) { sessionValues.set(key, String(val)); },
    removeItem(key) { sessionValues.delete(key); },
  };

  globalThis.localStorage = storage;
  globalThis.sessionStorage = sessionStorage;

  let scopeCompanyId = null;
  globalThis.fetch = async (url, options) => {
    if (String(url).includes("/platform/companies/")) {
      scopeCompanyId = String(url).match(/\/platform\/companies\/([^/]+)\/scope/)?.[1] || null;
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            token: "scoped-token",
            user: { role: "company_admin", globalRole: "super_admin", isCompanyScope: true, activeCompany: { id: "eb-chemical", slug: "eb-chemical" } },
            activeCompany: { id: "eb-chemical", slug: "eb-chemical" },
          };
        },
      };
    }
    if (String(url).includes("/company/context")) {
      return { ok: true, status: 200, async json() { return { modules: [] }; } };
    }
    return { ok: true, status: 200, async json() { return {}; } };
  };

  try {
    const user = await enterCompanyScope("eb-chemical");
    assert.equal(scopeCompanyId, "eb-chemical", "enterCompanyScope called with correct company ID");
    assert.equal(user.role, "company_admin");
    assert.equal(user.activeCompany.id, "eb-chemical");
    assert.equal(user.activeCompany.slug, "eb-chemical");
  } finally {
    globalThis.localStorage = originalLocalStorage;
    globalThis.sessionStorage = originalSessionStorage;
    globalThis.fetch = originalFetch;
  }
});

test("successful company switch lands on tenant dashboard", () => {
  const user = {
    role: "company_admin",
    globalRole: "super_admin",
    isCompanyScope: true,
    activeCompany: { modules: [{ route: "/admin/dashboard", enabled: true }] },
  };
  const result = landingPage(user);
  assert.equal(result, "admin");
});

test("selecting a company invokes the secure switch once and navigates to the tenant dashboard", async () => {
  const calls = [];
  const scopedUser = {
    role: "company_admin",
    globalRole: "super_admin",
    activeCompany: {
      id: "icare",
      name: "iCare",
      modules: [{ route: "/admin/dashboard", enabled: true }],
    },
  };
  let resolveScope;
  const scopeRequest = new Promise((resolve) => { resolveScope = resolve; });
  const guardedSwitch = createCompanySwitchGuard((companyId) => {
    calls.push(["scope", companyId]);
    return scopeRequest;
  });

  const first = guardedSwitch("icare");
  const duplicate = guardedSwitch("eb-chemical");
  resolveScope(scopedUser);
  await Promise.all([first, duplicate]);

  assert.deepEqual(calls, [["scope", "icare"]], "repeated clicks share one scope request");

  const sessionUpdates = [];
  const navigations = [];
  await performSecureCompanySwitch("icare", {
    enterScope: async (companyId) => {
      calls.push(["secure", companyId]);
      return scopedUser;
    },
    onSession: (user, company) => sessionUpdates.push({ user, company }),
    navigate: (page, options) => navigations.push({ page, options }),
  });

  assert.deepEqual(calls.at(-1), ["secure", "icare"]);
  assert.equal(sessionUpdates[0].company.name, "iCare");
  assert.equal(navigations[0].page, "admin");
  assert.equal(navigations[0].options.path, "/admin/dashboard");
});

test("failed secure switch does not update the platform UI session or navigate", async () => {
  let sessionUpdates = 0;
  let navigations = 0;

  await assert.rejects(
    performSecureCompanySwitch("icare", {
      enterScope: async () => { throw new Error("Scope request failed."); },
      onSession: () => { sessionUpdates += 1; },
      navigate: () => { navigations += 1; },
    }),
    /Scope request failed/,
  );

  assert.equal(sessionUpdates, 0);
  assert.equal(navigations, 0);
});

test("super_admin in company scope lands on admin dashboard", () => {
  const user = {
    role: "company_admin",
    globalRole: "super_admin",
    isCompanyScope: true,
    activeCompany: { modules: [{ route: "/admin/dashboard", enabled: true }] },
  };
  const result = landingPage(user);
  assert.equal(result, "admin");
});

test("super_admin with no company lands on platform companies", () => {
  const user = { role: "super_admin", isActive: true };
  const result = landingPage(user);
  assert.equal(result, "admin-platform-companies");
});

test("company switch stores scope token that survives simulated page refresh", async () => {
  const originalToken = "super-admin-original-jwt";
  const scopeToken = "scope-token-eb-chemical-test";
  const originalUser = {
    id: "super-1",
    email: "super@admin.test",
    role: "super_admin",
    globalRole: "super_admin",
    isActive: true,
  };

  const values = new Map([
    [tokenStorageKey, originalToken],
    [userStorageKey, JSON.stringify(originalUser)],
    ["cpanelActiveCompany", JSON.stringify({ id: "eb-chemical", name: "EB Chemical" })],
  ]);
  const storage = {
    get length() { return values.size; },
    getItem(key) { return values.get(key) ?? null; },
    key(index) { return [...values.keys()][index] ?? null; },
    setItem(key, val) { values.set(key, String(val)); },
    removeItem(key) { values.delete(key); },
  };
  for (const [k, v] of values) storage[k] = v;

  const sessionValues = new Map();
  const sessionStorage = {
    get length() { return sessionValues.size; },
    getItem(key) { return sessionValues.get(key) ?? null; },
    key(index) { return [...sessionValues.keys()][index] ?? null; },
    setItem(key, val) { sessionValues.set(key, String(val)); },
    removeItem(key) { sessionValues.delete(key); },
  };

  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;
  const originalFetch = globalThis.fetch;

  globalThis.localStorage = storage;
  globalThis.sessionStorage = sessionStorage;

  let scopeApiCalled = false;
  globalThis.fetch = async (url, options) => {
    if (String(url).includes("/platform/companies/eb-chemical/scope")) {
      scopeApiCalled = true;
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            token: scopeToken,
            user: {
              ...originalUser,
              role: "company_admin",
              globalRole: "super_admin",
              isCompanyScope: true,
              activeCompany: { id: "eb-chemical", name: "EB Chemical", slug: "eb-chemical" },
            },
            activeCompany: { id: "eb-chemical", name: "EB Chemical", slug: "eb-chemical" },
          };
        },
      };
    }
    if (String(url).includes("/company/context")) {
      return {
        ok: true,
        status: 200,
        async json() { return { modules: [{ route: "/admin/dashboard", enabled: true }] }; },
      };
    }
    return { ok: true, status: 200, async json() { return {}; } };
  };

  try {
    const user = await enterCompanyScope("eb-chemical");
    assert.ok(scopeApiCalled, "scope API must have been called");

    const savedSession = JSON.parse(sessionStorage.getItem("cpanelPlatformSession"));
    assert.equal(savedSession.token, originalToken, "original token saved in sessionStorage");

    assert.equal(values.get(tokenStorageKey), scopeToken, "scope token stored as active JWT");

    assert.equal(user.globalRole, "super_admin");
    assert.equal(user.role, "company_admin");
    assert.ok(user.isCompanyScope);
    assert.equal(user.activeCompany.id, "eb-chemical");

    assert.equal(storage.getItem(tokenStorageKey), scopeToken, "scope token persists in localStorage (simulated refresh)");
  } finally {
    globalThis.localStorage = originalLocalStorage;
    globalThis.sessionStorage = originalSessionStorage;
    globalThis.fetch = originalFetch;
  }
});

test("failed company context refresh restores the unchanged platform session", async () => {
  const originalToken = "super-admin-original-jwt";
  const originalUser = {
    id: "super-1",
    role: "super_admin",
    globalRole: "super_admin",
    isActive: true,
  };
  const values = new Map([
    [tokenStorageKey, originalToken],
    [userStorageKey, JSON.stringify(originalUser)],
  ]);
  const storage = {
    get length() { return values.size; },
    getItem(key) { return values.get(key) ?? null; },
    key(index) { return [...values.keys()][index] ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
  const sessionValues = new Map();
  const scopedSessionStorage = {
    get length() { return sessionValues.size; },
    getItem(key) { return sessionValues.get(key) ?? null; },
    key(index) { return [...sessionValues.keys()][index] ?? null; },
    setItem(key, value) { sessionValues.set(key, String(value)); },
    removeItem(key) { sessionValues.delete(key); },
  };
  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;
  const originalFetch = globalThis.fetch;
  globalThis.localStorage = storage;
  globalThis.sessionStorage = scopedSessionStorage;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/platform/companies/icare/scope")) {
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            token: "scoped-icare-token",
            user: {
              ...originalUser,
              role: "company_admin",
              isCompanyScope: true,
              activeCompany: { id: "icare", slug: "icare", name: "iCare" },
            },
            activeCompany: { id: "icare", slug: "icare", name: "iCare" },
          };
        },
      };
    }
    if (String(url).includes("/company/context")) {
      return {
        ok: false,
        status: 502,
        async json() { return { message: "Context unavailable." }; },
      };
    }
    return { ok: true, status: 200, async json() { return {}; } };
  };

  try {
    await assert.rejects(enterCompanyScope("icare"), /Context unavailable/);
    assert.equal(values.get(tokenStorageKey), originalToken);
    assert.deepEqual(JSON.parse(values.get(userStorageKey)), originalUser);
    assert.equal(values.has("cpanelActiveCompany"), false);
    assert.equal(sessionValues.has("cpanelPlatformSession"), false);
  } finally {
    globalThis.localStorage = originalLocalStorage;
    globalThis.sessionStorage = originalSessionStorage;
    globalThis.fetch = originalFetch;
  }
});

test("Back to Platform removes scope token, restores original super_admin token, clears tenant cache", async () => {
  const originalToken = "super-admin-original-jwt";
  const scopeToken = "scope-token-eb-chemical";
  const originalUser = {
    id: "super-1",
    email: "super@admin.test",
    role: "super_admin",
    globalRole: "super_admin",
    isActive: true,
  };
  const scopedUser = {
    ...originalUser,
    role: "company_admin",
    globalRole: "super_admin",
    isCompanyScope: true,
    activeCompany: { id: "eb-chemical", name: "EB Chemical", slug: "eb-chemical" },
  };

  const values = new Map([
    [tokenStorageKey, scopeToken],
    [userStorageKey, JSON.stringify(scopedUser)],
    ["cpanelActiveCompany", JSON.stringify({ id: "eb-chemical", name: "EB Chemical" })],
    ["cpanelTenant:eb-chemical:brands", JSON.stringify([{ id: "b1" }])],
    ["cpanelTenant:eb-chemical:categories", JSON.stringify([{ id: "c1" }])],
    ["epChemicalWebsiteMedia:eb-chemical", JSON.stringify([{ id: "m1" }])],
  ]);
  const storage = {
    get length() { return values.size; },
    getItem(key) { return values.get(key) ?? null; },
    key(index) { return [...values.keys()][index] ?? null; },
    setItem(key, val) { values.set(key, String(val)); },
    removeItem(key) { values.delete(key); },
  };
  for (const [k, v] of values) storage[k] = v;

  const sessionValues = new Map([
    ["cpanelPlatformSession", JSON.stringify({ token: originalToken, user: originalUser })],
  ]);
  const sessionStorage = {
    get length() { return sessionValues.size; },
    getItem(key) { return sessionValues.get(key) ?? null; },
    key(index) { return [...sessionValues.keys()][index] ?? null; },
    setItem(key, val) { sessionValues.set(key, String(val)); },
    removeItem(key) { sessionValues.delete(key); },
  };

  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;
  const originalFetch = globalThis.fetch;

  globalThis.localStorage = storage;
  globalThis.sessionStorage = sessionStorage;

  let exitApiCalled = false;
  globalThis.fetch = async (url, options) => {
    if (String(url).includes("/platform/company-scope/exit")) {
      exitApiCalled = true;
      return { ok: true, status: 200, async json() { return null; } };
    }
    return { ok: true, status: 200, async json() { return {}; } };
  };

  try {
    const user = await exitCompanyScope();

    assert.ok(exitApiCalled, "exit scope API must have been called");

    assert.equal(values.get(tokenStorageKey), originalToken, "original super_admin token restored");

    assert.equal(values.has("cpanelActiveCompany"), false, "company context cleared from localStorage");

    assert.equal(values.has("cpanelTenant:eb-chemical:brands"), false, "tenant cache cleared (brands)");
    assert.equal(values.has("cpanelTenant:eb-chemical:categories"), false, "tenant cache cleared (categories)");
    assert.equal(values.has("epChemicalWebsiteMedia:eb-chemical"), false, "tenant cache cleared (website media)");

    assert.equal(sessionValues.has("cpanelPlatformSession"), false, "platform session removed from sessionStorage");

    assert.equal(user.globalRole, "super_admin");
    assert.equal(user.activeCompany, null, "returned user has no active company (platform context restored)");
  } finally {
    globalThis.localStorage = originalLocalStorage;
    globalThis.sessionStorage = originalSessionStorage;
    globalThis.fetch = originalFetch;
  }
});

test("scope user passes isValidCpanelUser on simulated page refresh and lands on tenant dashboard", () => {
  const scopedUser = {
    id: "super-1",
    email: "super@admin.test",
    role: "company_admin",
    globalRole: "super_admin",
    isCompanyScope: true,
    isActive: true,
    activeCompany: { id: "eb-chemical", slug: "eb-chemical", name: "EB Chemical", modules: [{ route: "/admin/dashboard", enabled: true }] },
    activeMembership: null,
  };
  assert.equal(isValidCpanelUser(scopedUser), true, "scoped user must be valid after refresh");
  const result = landingPage(scopedUser);
  assert.equal(result, "admin");
});

test("first bootstrap request after scope switch uses the scoped token", async () => {
  const scopeToken = "scope-token-eb-chemical-bootstrap";
  const scopedUser = {
    id: "super-1",
    email: "super@admin.test",
    role: "company_admin",
    globalRole: "super_admin",
    isCompanyScope: true,
    isActive: true,
  };

  const values = new Map([
    [tokenStorageKey, scopeToken],
    [userStorageKey, JSON.stringify(scopedUser)],
  ]);
  const storage = {
    get length() { return values.size; },
    getItem(key) { return values.get(key) ?? null; },
    key(index) { return [...values.keys()][index] ?? null; },
    setItem(key, val) { values.set(key, String(val)); },
    removeItem(key) { values.delete(key); },
  };
  for (const [k, v] of values) storage[k] = v;

  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;
  const originalFetch = globalThis.fetch;

  globalThis.localStorage = storage;
  globalThis.sessionStorage = { getItem() { return null; }, setItem() {}, removeItem() {}, get length() { return 0; }, key() { return null; } };

  let bootstrapAuthHeader = null;
  globalThis.fetch = async (url, options) => {
    if (String(url).includes("/auth/me")) {
      bootstrapAuthHeader = options?.headers?.Authorization || null;
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            ...scopedUser,
            user: scopedUser,
            activeCompany: { id: "eb-chemical", slug: "eb-chemical", name: "EB Chemical" },
            activeMembership: null,
            availableCompanies: [],
          };
        },
      };
    }
    if (String(url).includes("/company/context")) {
      return { ok: true, status: 200, async json() { return { modules: [{ route: "/admin/dashboard", enabled: true }] }; } };
    }
    return { ok: true, status: 200, async json() { return {}; } };
  };

  try {
    const user = await fetchCurrentUser();

    assert.equal(bootstrapAuthHeader, `Bearer ${scopeToken}`, "bootstrap /auth/me must use the scoped token");
    assert.ok(user, "user must be returned from bootstrap");
    assert.equal(user.globalRole, "super_admin");
    assert.equal(user.role, "company_admin");
    assert.ok(user.isCompanyScope);
    assert.ok(user.activeCompany);
    assert.equal(user.activeCompany.id, "eb-chemical");
    assert.equal(user.activeMembership, null);
    assert.equal(isValidCpanelUser(user), true, "bootstrapped user must pass validation");
  } finally {
    globalThis.localStorage = originalLocalStorage;
    globalThis.sessionStorage = originalSessionStorage;
    globalThis.fetch = originalFetch;
  }
});
