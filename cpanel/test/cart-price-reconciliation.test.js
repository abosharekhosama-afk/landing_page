import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { cartSubtotal, currentUnitPrice, reconcileCartPrices } from "../src/utils/cartPricing.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const variantId = "8df1e315-cbee-45ef-bc96-4df584200024";

const catalog = [
  {
    id: "velvet-src-104",
    slug: "velvet-104",
    price: 15,
    variants: [{ id: variantId, price: 15 }],
  },
];

const staleCart = [
  {
    cartId: `velvet-src-104-${variantId}`,
    productId: "velvet-src-104",
    slug: "velvet-104",
    variantId,
    size: "",
    selectedSize: "",
    colorName: "",
    price: 18,
    quantity: 5,
  },
];

test("a stale cart price of 18 refreshes to the fresh catalog price of 15", () => {
  const reconciled = reconcileCartPrices(staleCart, catalog);
  assert.equal(reconciled[0].price, 15);
  assert.notEqual(reconciled, staleCart);
  assert.equal(staleCart[0].price, 18, "the input cart is not mutated");
});

test("reconciliation preserves quantity, variantId and selections", () => {
  const [item] = reconcileCartPrices(staleCart, catalog);
  assert.equal(item.quantity, 5);
  assert.equal(item.variantId, variantId);
  assert.equal(item.productId, "velvet-src-104");
  assert.equal(item.slug, "velvet-104");
  assert.equal(item.size, "");
  assert.equal(item.colorName, "");
  assert.equal(item.cartId, staleCart[0].cartId);
});

test("the cart subtotal recalculates from the refreshed prices (5 x 15 = 75)", () => {
  assert.equal(cartSubtotal(reconcileCartPrices(staleCart, catalog)), 75);
});

test("checkout shows the reconciled subtotal 75 plus server delivery 20 = 95", () => {
  const subtotal = cartSubtotal(reconcileCartPrices(staleCart, catalog));
  assert.equal(subtotal, 75);

  const serverOrder = { subtotal, delivery_price: 20, total: subtotal + 20 };
  assert.equal(serverOrder.total, 95);

  const checkout = read("src/pages/CheckoutPage.jsx");
  assert.match(checkout, /const displayTotal = orderPlaced && lastOrder\s+\? lastOrder\.total/);
  assert.match(checkout, /Number\(lastOrder\.delivery_price \|\| 0\)/);
});

test("a zero variant price resolves the positive product price", () => {
  const products = [
    {
      id: "p1",
      slug: "p1",
      price: 60,
      variants: [{ id: "v1", price: 0 }],
    },
  ];

  assert.equal(currentUnitPrice(products[0], "v1"), 60);
  assert.equal(currentUnitPrice(products[0], "missing-variant"), 60);
  assert.equal(currentUnitPrice(products[0], ""), 60);
  assert.equal(
    currentUnitPrice({ id: "p2", price: 0, variants: [{ id: "v2", price: 0 }] }, "v2"),
    null,
  );

  const reconciled = reconcileCartPrices(
    [{ productId: "p1", slug: "p1", variantId: "v1", price: 0, quantity: 2 }],
    products,
  );
  assert.equal(reconciled[0].price, 60);
  assert.equal(cartSubtotal(reconciled), 120);
});

test("a positive variant price wins over the product price", () => {
  const product = { id: "p1", price: 15, variants: [{ id: "v1", price: 18 }] };
  assert.equal(currentUnitPrice(product, "v1"), 18);
});

test("reconciliation is a no-op when the cart already matches the catalog", () => {
  const fresh = [{ ...staleCart[0], price: 15 }];
  assert.equal(reconcileCartPrices(fresh, catalog), fresh);
  assert.equal(reconcileCartPrices(fresh, []), fresh);
  assert.equal(reconcileCartPrices([], catalog).length, 0);
  assert.equal(
    reconcileCartPrices(
      [{ productId: "unknown", slug: "unknown", price: 18, quantity: 1 }],
      catalog,
    )[0].price,
    18,
  );
});

test("the storefront reconciles the persisted cart on the cart and checkout pages", () => {
  const app = read("src/App.jsx");
  assert.match(app, /const isCartView = activePage === "cart" \|\| activePage === "checkout";/);
  assert.match(app, /reconcileCartPrices\(cartItems, demoProducts\)/);
  assert.match(app, /setCartItems\(nextCartItems\)/);
  assert.match(app, /const cartTotal = cartSubtotal\(cartItems\);/);
  assert.match(app, /localStorage\.setItem\(cartStorageKey, JSON\.stringify\(cartItems\)\)/);
});
