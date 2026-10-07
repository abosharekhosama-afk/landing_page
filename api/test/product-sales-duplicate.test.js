import assert from "node:assert/strict";
import test from "node:test";
import {
  attachSalesCounts,
  buildSalesCountByProductId,
  salesCountForProduct,
} from "../src/products/salesCount.js";
import { buildDuplicatedProduct } from "../src/products/duplicateProduct.js";
import { collectProductMediaUrls, mediaUrlStillReferenced } from "../src/products/mediaReferences.js";

test("salesCount aggregates quantities by productId within provided orders only", () => {
  const orders = [
    {
      id: "o1",
      items: [
        { productId: "p1", quantity: 2 },
        { productId: "p2", quantity: 1 },
      ],
    },
    {
      id: "o2",
      items: [{ productId: "p1", qty: 3 }],
    },
  ];
  const counts = buildSalesCountByProductId(orders);
  assert.equal(salesCountForProduct(counts, "p1"), 5);
  assert.equal(salesCountForProduct(counts, "p2"), 1);
  assert.equal(salesCountForProduct(counts, "missing"), 0);
});

test("salesCount is zero when product has no order items", () => {
  const products = attachSalesCounts([{ id: "lonely" }], [{ id: "o1", items: [{ productId: "other", quantity: 4 }] }]);
  assert.equal(products[0].salesCount, 0);
});

test("salesCount does not mix cross-tenant order data when callers pass tenant-scoped orders", () => {
  const tenantAOrders = [{ items: [{ productId: "shared-looking-id", quantity: 9 }] }];
  const tenantBOrders = [{ items: [{ productId: "shared-looking-id", quantity: 1 }] }];
  assert.equal(attachSalesCounts([{ id: "shared-looking-id" }], tenantAOrders)[0].salesCount, 9);
  assert.equal(attachSalesCounts([{ id: "shared-looking-id" }], tenantBOrders)[0].salesCount, 1);
});

test("duplicate builds unique slug/sku, copies variants, and references media URLs", () => {
  const source = {
    id: "source-1",
    slug: "blue-dress",
    sku: "SKU-100",
    name: { en: "Blue Dress", ar: "فستان أزرق" },
    image: "/uploads/icare/products/source-1/main.webp",
    hoverImage: "/uploads/icare/products/source-1/hover.webp",
    gallery_images: [{ id: "g1", image_url: "/uploads/icare/products/source-1/g1.webp", sort_order: 0 }],
    variants: [
      { id: "v1", size: "S", price: 20, stock: 4, image_url: "/uploads/icare/products/source-1/v1.webp", sku: "SKU-100-S" },
      { id: "v2", size: "M", price: 22, stock: 2, image_url: "/uploads/icare/products/source-1/v2.webp" },
    ],
    brandId: "brand-1",
    categoryId: "cat-1",
  };
  const existing = [source, { id: "other", slug: "blue-dress-copy", sku: "SKU-100-copy" }];
  const duplicated = buildDuplicatedProduct(source, { existingProducts: existing, now: new Date("2026-09-06T12:00:00.000Z") });

  assert.notEqual(duplicated.id, source.id);
  assert.equal(duplicated.slug, "blue-dress-copy-2");
  assert.equal(duplicated.sku, "SKU-100-copy-2");
  assert.match(duplicated.name.en, /Copy/);
  assert.equal(duplicated.image, source.image);
  assert.equal(duplicated.hoverImage, source.hoverImage);
  assert.equal(duplicated.gallery_images[0].image_url, source.gallery_images[0].image_url);
  assert.equal(duplicated.variants.length, 2);
  assert.notEqual(duplicated.variants[0].id, "v1");
  assert.equal(duplicated.variants[0].image_url, source.variants[0].image_url);
  assert.equal(duplicated.variants[1].image_url, source.variants[1].image_url);
});

test("media reference helper detects shared URLs across products", () => {
  const url = "/uploads/icare/products/source-1/main.webp";
  const products = [
    { id: "a", image: url },
    { id: "b", image: url, variants: [{ image_url: "/other.webp" }] },
  ];
  assert.equal(collectProductMediaUrls(products[0]).has(url), true);
  assert.equal(mediaUrlStillReferenced(products, url, { excludeProductId: "a" }), true);
  assert.equal(mediaUrlStillReferenced([{ id: "a", image: url }], url, { excludeProductId: "a" }), false);
});
