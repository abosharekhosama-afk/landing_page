import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "checkout-delivery-order-"),
);

const now = "2026-09-13T00:00:00.000Z";
const password = "CheckoutDelivery-2026!";
const passwordHash = await hashPassword(password);

fs.writeFileSync(
  path.join(dataDir, "store.json"),
  JSON.stringify({
    version: 2,

    companies: [
      {
        id: "checkout-co",
        slug: "checkout-co",
        name: "Checkout Co",
        status: "active",
        domain: "checkout.test",
        _domainId: "checkout-domain",
      },
      {
        id: "other-co",
        slug: "other-co",
        name: "Other Co",
        status: "active",
        domain: "other.test",
        _domainId: "other-domain",
      },
    ],

    domains: [
      {
        id: "checkout-domain",
        company_id: "checkout-co",
        domain: "checkout.test",
        is_primary: true,
        is_active: true,
        is_verified: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: "other-domain",
        company_id: "other-co",
        domain: "other.test",
        is_primary: true,
        is_active: true,
        is_verified: true,
        created_at: now,
        updated_at: now,
      },
    ],

    users: [
      {
        id: "checkout-admin",
        name: "Checkout Admin",
        email: "admin@checkout.test",
        password: passwordHash,
        role: "company_admin",
        permissions: [],
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ],

    memberships: [
      {
        id: "checkout-membership",
        companyId: "checkout-co",
        userId: "checkout-admin",
        role: "company_admin",
        status: "active",
        permissions: [],
        createdAt: now,
        updatedAt: now,
      },
    ],

    brands: [],
    categories: [],

    products: [
      {
        id: "checkout-product",
        slug: "checkout-product",
        sku: "CHECKOUT-1",

        name: {
          en: "Checkout Product",
        },

        company_id: "checkout-co",

        isActive: true,
        visible: true,

        price: 100,
        stockQty: 100,

        /*
         * Do not provide product.variants here.
         *
         * The production product normalizer converts sizes into
         * normalized variants.
         */
        sizes: [
          {
            size: "Standard",
            price: 100,
          },
        ],

        createdAt: now,
        updatedAt: now,
      },
    ],

    deliveryZones: [],
    orders: [],
    automaticDiscounts: [],
  }),
  "utf8",
);

process.env.DATA_STORE_DIR = dataDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "checkout-delivery-order-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";

const { app } = await import("../src/server.js");

const { deliveryZoneRepository, productRepository } = await import(
  "../src/data/store.js"
);

const server = app.listen(0, "127.0.0.1");

await new Promise((resolve) => {
  server.once("listening", resolve);
});

const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

async function request(
  pathname,
  {
    method = "GET",
    token,
    body,
    companyId,
    host = "checkout.test",
  } = {},
) {
  const headers = {
    "Content-Type": "application/json",
    Host: host,
    Origin: `https://${host}`,
  };

  if (companyId) {
    headers["X-Company-Id"] = companyId;
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });

  return {
    status: response.status,
    body: await response.json().catch(() => null),
  };
}

async function login() {
  const result = await request("/auth/login", {
    method: "POST",

    /*
     * Login is an admin operation, so it is explicitly scoped to
     * checkout-co.
     */
    companyId: "checkout-co",

    body: {
      email: "admin@checkout.test",
      password,
    },
  });

  assert.equal(
    result.status,
    200,
    `Login failed: ${JSON.stringify(result.body)}`,
  );

  assert.ok(
    result.body?.token,
    "Login response did not contain a token.",
  );

  return result.body.token;
}

/*
 * The product must exist in the checkout tenant.
 */
const checkoutProduct = productRepository.findByCompany(
  "checkout-co",
  "checkout-product",
);

assert.ok(
  checkoutProduct,
  "Checkout product fixture was not loaded.",
);

assert.ok(
  Array.isArray(checkoutProduct.variants),
  "Checkout product variants were not normalized.",
);

assert.equal(
  checkoutProduct.variants.length,
  1,
  "Expected exactly one normalized checkout variant.",
);

assert.equal(
  checkoutProduct.variants[0].size,
  "Standard",
  "Normalized checkout variant has an unexpected size.",
);

assert.equal(
  checkoutProduct.variants[0].price,
  100,
  "Normalized checkout variant has an unexpected price.",
);

assert.ok(
  checkoutProduct.variants[0].visible !== false,
  "Normalized checkout variant must be visible.",
);

const orderBody = (overrides = {}) => ({
  customer: {
    name: "Test Customer",
    phone: "0599111222",
    city: "Ramallah",
    address: "Main Street",
    notes: "",
  },

  items: [
    {
      productId: "checkout-product",
      productName: "Checkout Product",

      selectedSize: "Standard",
      size: "Standard",

      quantity: 1,
      price: 100,
      lineTotal: 100,
    },
  ],

  paymentMethod: "Cash on delivery",

  ...overrides,
});

test.after(() => {
  server.close();

  fs.rmSync(dataDir, {
    recursive: true,
    force: true,
  });
});

test("checkout order delivery-zone contract", async (t) => {
  const adminToken = await login();

  /*
   * Create the delivery zone through the same company-scoped
   * administrative repository used by the application.
   */
  const zone = deliveryZoneRepository.createForCompany(
    "checkout-co",
    {
      id: "checkout-zone",
      city_key: "ramallah",
      city_name: "Ramallah",
      region: "West Bank",
      delivery_price: 17,
      currency: "ILS",
      enabled: true,
      display_order: 0,
    },
  );

  assert.ok(zone);
  assert.equal(zone.id, "checkout-zone");

  const zoneId = zone.id;

  await t.test(
    "enabled zone ID is accepted and server determines delivery price",
    async () => {
      const result = await request("/orders", {
        method: "POST",

        /*
         * This is intentionally a storefront request:
         * tenant is resolved from checkout.test rather than
         * trusting X-Company-Id.
         */
        host: "checkout.test",

        body: orderBody({
          delivery_zone_id: zoneId,
          delivery_city_key: "ramallah",
        }),
      });

      assert.equal(
        result.status,
        201,
        JSON.stringify(result.body),
      );

      assert.equal(
        result.body.delivery_city_key,
        "ramallah",
      );

      assert.equal(
        result.body.delivery_city_name,
        "Ramallah",
      );

      /*
       * The delivery price comes from the server-side zone.
       */
      assert.equal(
        result.body.delivery_price,
        17,
      );

      assert.equal(
        result.body.total,
        117,
      );
    },
  );

  await t.test(
    "free-delivery threshold is authoritative on the server",
    async () => {
      const result = await request("/orders", {
        method: "POST",

        host: "checkout.test",

        body: orderBody({
          items: [
            {
              productId: "checkout-product",
              productName: "Checkout Product",
              selectedSize: "Standard",
              size: "Standard",
              quantity: 5,
              price: 100,
              lineTotal: 500,
            },
          ],

          delivery_zone_id: zoneId,
          delivery_city_key: "ramallah",
        }),
      });

      assert.equal(
        result.status,
        201,
        JSON.stringify(result.body),
      );

      /*
       * The server applies the configured free-delivery threshold.
       */
      assert.equal(
        result.body.delivery_price,
        0,
      );

      assert.equal(
        result.body.total,
        500,
      );
    },
  );


await t.test(
  "disabled zones allow the legacy fallback when no active zones remain",
  async () => {
    deliveryZoneRepository.updateForCompany(
      "checkout-co",
      zoneId,
      {
        enabled: false,
      },
    );

    const result = await request("/orders", {
      method: "POST",

      host: "checkout.test",

      /*
       * There are no active delivery zones anymore.
       * The existing checkout fallback must remain available.
       */
      body: orderBody({
        delivery_zone_id: zoneId,
        delivery_city_key: "ramallah",
      }),
    });

    assert.equal(
      result.status,
      201,
      JSON.stringify(result.body),
    );

    assert.equal(
      result.body.delivery_price,
      0,
    );

    assert.equal(
      result.body.delivery_city_key,
      "",
    );
  },
);



  await t.test(
    "all-disabled zones preserve the legacy checkout fallback",
    async () => {
      const result = await request("/orders", {
        method: "POST",

        host: "checkout.test",

        /*
         * No delivery zone is sent.
         *
         * Because all zones are disabled, the old free-text
         * checkout path must remain available.
         */
        body: orderBody(),
      });

      assert.equal(
        result.status,
        201,
        JSON.stringify(result.body),
      );

      assert.equal(
        result.body.delivery_price,
        0,
      );

      assert.equal(
        result.body.delivery_city_key,
        "",
      );
    },
  );


await t.test(
  "active delivery zone can be resolved by its city key",
  async () => {
    /*
     * Restore the zone so the tenant has an active delivery area.
     */
    deliveryZoneRepository.updateForCompany(
      "checkout-co",
      zoneId,
      {
        enabled: true,
      },
    );

    const result = await request("/orders", {
      method: "POST",

      host: "checkout.test",

      /*
       * The current server contract allows resolving the enabled
       * zone by city_key as well as delivery_zone_id.
       */
      body: orderBody({
        delivery_city_key: "ramallah",
      }),
    });

    assert.equal(
      result.status,
      201,
      JSON.stringify(result.body),
    );

    assert.equal(
      result.body.delivery_city_key,
      "ramallah",
    );

    assert.equal(
      result.body.delivery_city_name,
      "Ramallah",
    );

    assert.equal(
      result.body.delivery_price,
      17,
    );

    assert.equal(
      result.body.delivery_currency,
      "ILS",
    );

    assert.equal(
      result.body.total,
      117,
    );
  },
);



  await t.test(
    "zone IDs from another tenant cannot be used",
    async () => {
      deliveryZoneRepository.createForCompany(
        "other-co",
        {
          id: "other-zone",
          city_key: "other-city",
          city_name: "Other City",
          region: "Other",
          delivery_price: 99,
          currency: "ILS",
          enabled: true,
          display_order: 0,
        },
      );

      const result = await request("/orders", {
        method: "POST",

        /*
         * Still using checkout.test.
         *
         * The request belongs to checkout-co, therefore a zone
         * belonging to other-co must never be accepted.
         */
        host: "checkout.test",

        body: orderBody({
          delivery_zone_id: "other-zone",
          delivery_city_key: "other-city",
        }),
      });

      assert.equal(
        result.status,
        400,
        JSON.stringify(result.body),
      );
    },
  );
});