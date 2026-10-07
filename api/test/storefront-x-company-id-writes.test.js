import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-xco-writes-"));
const now = "2026-09-23T12:00:00.000Z";
const password = "XCo-Writes-2026!";
const passwordHash = await hashPassword(password);

fs.writeFileSync(
  path.join(dataStoreDir, "store.json"),
  `${JSON.stringify(
    {
      version: 2,
      companies: [
        { id: "velvet", slug: "velvet", name: "Velvet", status: "active", isDefault: false },
        { id: "other-company", slug: "other-company", name: "Other", status: "active", isDefault: false },
      ],
      domains: [
        {
          id: "velvet-domain",
          company_id: "velvet",
          domain: "velvet.test",
          is_primary: true,
          is_active: true,
          is_verified: true,
          created_at: now,
          updated_at: now,
        },
      ],
      users: [],
      memberships: [],
      products: [
        {
          id: "velvet-product",
          slug: "velvet-product",
          name: { en: "Velvet Product" },
          company_id: "velvet",
          isActive: true,
          visible: true,
          price: 25,
          currency: "ILS",
          variants: [
            {
              id: "velvet-variant-1",
              size: "500ml",
              color_name: "Default",
              price: 25,
              stock: 10,
              isActive: true,
              isVisible: true,
            },
          ],
          createdAt: now,
          updatedAt: now,
        },
      ],
      orders: [],
      deliveryZones: [],
    },
    null,
    2,
  )}\n`,
  "utf8",
);

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "xco-writes-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../src/server.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

async function request(pathname, { body, headers = {}, method = body ? "POST" : "GET" } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { response, body: await response.json().catch(() => null) };
}

const guestCustomer = {
  name: "Guest Buyer",
  phone: "599111000",
  city: "Ramallah",
  address: "Main St 1",
};

const orderItem = {
  productId: "velvet-product",
  variantId: "velvet-variant-1",
  selectedSize: "500ml",
  selectedColor: "Default",
  quantity: 1,
  price: 25,
};

test.after(() => {
  server.close();
  fs.rmSync(dataStoreDir, { recursive: true, force: true });
});

test("storefront x-company-id writes", async (t) => {
  await t.test("guest POST /orders with x-company-id succeeds", async () => {
    const result = await request("/orders", {
      headers: { "x-company-id": "velvet" },
      body: { customer: guestCustomer, items: [orderItem] },
    });
    assert.equal(result.response.status, 201);
    assert.ok(result.body.orderId);
    assert.ok(result.body.orderNumber);
    assert.ok(result.body.status);
    assert.equal(result.body.orderId, result.body.id);
  });

  await t.test("guest POST /orders without company header does not create velvet order", async () => {
    const result = await request("/orders", {
      body: {
        customer: { ...guestCustomer, phone: "599111001" },
        items: [orderItem],
      },
    });
    assert.notEqual(result.response.status, 201);
  });

  await t.test("POST /auth/register with x-company-id succeeds", async () => {
    const email = `guest-${Date.now()}@velvet.test`;
    const result = await request("/auth/register", {
      headers: { "x-company-id": "velvet" },
      body: {
        name: "Velvet Registrant",
        email,
        phone: "599222333",
        password,
      },
    });
    assert.equal(result.response.status, 201);
    assert.ok(result.body.token);
  });

  await t.test("invalid x-company-id on POST orders returns 404", async () => {
    const result = await request("/orders", {
      headers: { "x-company-id": "no-such-co" },
      body: { customer: guestCustomer, items: [orderItem] },
    });
    assert.equal(result.response.status, 404);
  });
});
