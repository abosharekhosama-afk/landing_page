import assert from "node:assert/strict";
import test from "node:test";
import {
  authenticateBeforeMutation,
  clearLegacyImages,
  cleanupTestRecords,
  interruptRun,
  processUniqueImageJobs,
  requireLoginPassword,
  runStatusMode,
  summarizeStatus,
} from "../scripts/finalize-icare-staging.js";

test("finalizer login accepts any non-empty existing password", async () => {
  let receivedPassword = null;
  let mutationToken = null;

  await authenticateBeforeMutation({
    passwordValue: "x",
    authenticate: async (password) => {
      receivedPassword = password;
      return "process-only-token";
    },
    mutate: async (token) => {
      mutationToken = token;
    },
  });

  assert.equal(receivedPassword, "x");
  assert.equal(mutationToken, "process-only-token");
});

test("finalizer login rejects an empty password before authentication", async () => {
  let authenticationAttempted = false;

  assert.throws(
    () => requireLoginPassword(""),
    /ICARE_STAGING_PASSWORD is required/,
  );

  await assert.rejects(
    authenticateBeforeMutation({
      passwordValue: "",
      authenticate: async () => {
        authenticationAttempted = true;
        return "unused-token";
      },
      mutate: async () => {},
    }),
    /ICARE_STAGING_PASSWORD is required/,
  );

  assert.equal(authenticationAttempted, false);
});

test("invalid credentials stop before any finalization mutation", async () => {
  let mutationAttempted = false;

  await assert.rejects(
    authenticateBeforeMutation({
      passwordValue: "existing-password",
      authenticate: async () => {
        throw new Error("Staging iCare login failed (HTTP 401).");
      },
      mutate: async () => {
        mutationAttempted = true;
      },
    }),
    /HTTP 401/,
  );

  assert.equal(mutationAttempted, false);
});

test("status mode performs read-only API requests and summarizes current state", async () => {
  const calls = [];
  const responses = new Map([
    ["/api/products", [{
      id: "product-1",
      image: "https://backend.igroup.website/uploads/legacy.jpg",
      hoverImage: "",
      variants: [],
      gallery_images: [],
    }]],
    ["/api/categories", []],
    ["/api/brands", []],
    ["/api/website-texts", [{ id: "text-1" }]],
    ["/api/website-media", [{
      id: "media-1",
      imageUrl: "/uploads/icare/migrated.jpg",
      fallbackImageUrl: "",
    }]],
  ]);

  const status = await runStatusMode({
    apiCall: async (token, pathname, init = {}) => {
      calls.push({ token, pathname, method: init.method || "GET" });
      return responses.get(pathname);
    },
  });

  assert.ok(calls.every((call) => call.token === null && call.method === "GET"));
  assert.deepEqual(status.counts, {
    categories: 0,
    brands: 0,
    products: 1,
    websiteTexts: 1,
    websiteMedia: 1,
  });
  assert.equal(status.images.legacy, 1);
  assert.equal(status.images.migrated, 1);
  assert.equal(status.images.emptyOrCleared, 1);
});

test("cleanup rerun continues after a partially completed prior cleanup", async () => {
  const deleted = [];
  const category = {
    id: "fe2a6b82-9a30-4a90-8d81-af806f273405",
    slug: "product-test-category-1783965814764",
    name: { en: "Product Test Category" },
  };
  const brand = {
    id: "02c7e456-3c3e-46d1-895a-7053b4e2140c",
    slug: "product-test-brand-1783965814764",
    name: "iCare Product Test Brand",
  };

  await cleanupTestRecords("token", async (_token, pathname, init = {}) => {
    if (pathname === "/api/products") return [];
    if (pathname === "/api/categories") return [category];
    if (pathname === "/api/brands") return [brand];
    if (init.method === "DELETE") {
      deleted.push(pathname);
      return null;
    }
    throw new Error(`Unexpected request: ${pathname}`);
  });

  assert.deepEqual(deleted, [
    `/api/categories/${category.id}`,
    `/api/brands/${brand.id}`,
  ]);
});

test("cleanup rerun accepts all three staging records already deleted", async () => {
  let mutations = 0;
  await cleanupTestRecords("token", async (_token, pathname, init = {}) => {
    if (init.method === "DELETE") mutations += 1;
    if (["/api/products", "/api/categories", "/api/brands"].includes(pathname)) return [];
    throw new Error(`Unexpected request: ${pathname}`);
  });
  assert.equal(mutations, 0);
});

test("already-uploaded image content is reused without another upload", async () => {
  let uploads = 0;
  const state = {
    interrupted: false,
    completed: 0,
    failed: 0,
    total: 0,
    activeToken: "",
    abortController: new AbortController(),
  };
  const result = await processUniqueImageJobs({
    jobs: [{ source: "legacy-a", entity: "product:1" }],
    recover: async () => ({ data: Buffer.from("same-image") }),
    findExisting: async () => "/uploads/icare/existing.jpg",
    upload: async () => {
      uploads += 1;
      return "/uploads/icare/new.jpg";
    },
    state,
  });
  assert.equal(uploads, 0);
  assert.equal(result.results.get("legacy-a"), "/uploads/icare/existing.jpg");
});

test("concurrent references with identical content produce only one upload", async () => {
  let uploads = 0;
  const state = {
    interrupted: false,
    completed: 0,
    failed: 0,
    total: 0,
    activeToken: "",
    abortController: new AbortController(),
  };
  const result = await processUniqueImageJobs({
    jobs: [
      { source: "legacy-a", entity: "product:1" },
      { source: "legacy-b", entity: "product:2" },
    ],
    recover: async () => ({ data: Buffer.from("same-image") }),
    upload: async () => {
      uploads += 1;
      return "/uploads/icare/once.jpg";
    },
    state,
    concurrency: 4,
  });
  assert.equal(uploads, 1);
  assert.equal(result.results.get("legacy-a"), "/uploads/icare/once.jpg");
  assert.equal(result.results.get("legacy-b"), "/uploads/icare/once.jpg");
});

test("SIGINT state cleanup clears the JWT, aborts work, and reports remaining jobs", () => {
  const state = {
    interrupted: false,
    completed: 2,
    failed: 1,
    total: 8,
    activeToken: "process-only-token",
    abortController: new AbortController(),
  };
  const partial = interruptRun(state);
  assert.equal(state.interrupted, true);
  assert.equal(state.activeToken, "");
  assert.equal(state.abortController.signal.aborted, true);
  assert.deepEqual(partial, { completed: 2, failed: 1, remaining: 5 });
});

test("SIGINT stops the worker pool from scheduling remaining image work", async () => {
  let started = 0;
  let releaseFirst;
  const firstStarted = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  const state = {
    interrupted: false,
    completed: 0,
    failed: 0,
    total: 0,
    activeToken: "process-only-token",
    abortController: new AbortController(),
  };
  let continueFirst;
  const firstCanFinish = new Promise((resolve) => {
    continueFirst = resolve;
  });

  const processing = processUniqueImageJobs({
    jobs: [
      { source: "legacy-a", entity: "product:1" },
      { source: "legacy-b", entity: "product:2" },
      { source: "legacy-c", entity: "product:3" },
    ],
    recover: async () => {
      started += 1;
      releaseFirst();
      await firstCanFinish;
      return { data: Buffer.from("image") };
    },
    upload: async () => "/uploads/icare/image.jpg",
    state,
    concurrency: 1,
  });

  await firstStarted;
  interruptRun(state);
  continueFirst();
  await processing;

  assert.equal(started, 1);
  assert.equal(state.activeToken, "");
  assert.equal(state.completed, 0);
});

test("clear-legacy-images is tenant-API scoped, download-free, and idempotent", async () => {
  const state = {
    products: [{
      id: "product-1",
      categoryId: "category-1",
      brandId: "brand-1",
      image: "https://backend.igroup.website/public/uploads/product.jpg",
      variants: [{ id: "variant-1", image_url: "/uploads/icare/keep-variant.jpg" }],
      gallery_images: [
        { id: "gallery-1", image_url: "/uploads/old-gallery.jpg", sort_order: 0 },
        { id: "gallery-2", image_url: "/uploads/icare/keep-gallery.jpg", sort_order: 1 },
      ],
    }],
    categories: [{
      id: "category-1",
      imageUrl: "https://via.placeholder.com/500",
    }],
    brands: [{
      id: "brand-1",
      logoUrl: "/storage/icare/uploads/old-brand.png",
    }],
    media: [{
      id: "media-1",
      imageUrl: "/public/uploads/old-media.jpg",
      fallbackImageUrl: "/uploads/icare/keep-media.jpg",
    }],
  };
  const requests = [];
  const apiCall = async (_token, pathname, init = {}) => {
    requests.push({ pathname, method: init.method || "GET" });
    if (pathname === "/api/products") return structuredClone(state.products);
    if (pathname === "/api/categories") return structuredClone(state.categories);
    if (pathname === "/api/brands") return structuredClone(state.brands);
    if (pathname === "/api/website-media/all") return { items: structuredClone(state.media) };
    const body = init.body ? JSON.parse(init.body) : {};
    if (pathname.startsWith("/api/products/") && init.method === "PUT") {
      state.products[0] = body;
      return body;
    }
    if (pathname.startsWith("/api/categories/") && init.method === "PATCH") {
      Object.assign(state.categories[0], body);
      return state.categories[0];
    }
    if (pathname.startsWith("/api/brands/") && init.method === "PATCH") {
      Object.assign(state.brands[0], body);
      return state.brands[0];
    }
    if (pathname.startsWith("/api/website-media/") && init.method === "PUT") {
      state.media[0] = body;
      return body;
    }
    throw new Error(`Unexpected request: ${init.method || "GET"} ${pathname}`);
  };

  const first = await clearLegacyImages("token", apiCall);
  const second = await clearLegacyImages("token", apiCall);

  assert.deepEqual(first, {
    categories: 1,
    brands: 1,
    products: 1,
    productPrimaryImages: 1,
    galleryImages: 1,
    websiteMedia: 1,
    websiteMediaUrls: 1,
    urlsCleared: 5,
  });
  assert.deepEqual(second, {
    categories: 0,
    brands: 0,
    products: 0,
    productPrimaryImages: 0,
    galleryImages: 0,
    websiteMedia: 0,
    websiteMediaUrls: 0,
    urlsCleared: 0,
  });
  assert.equal(state.categories[0].imageUrl, null);
  assert.equal(state.brands[0].logoUrl, null);
  assert.equal(state.media[0].imageUrl, "");
  assert.equal(state.media[0].fallbackImageUrl, "/uploads/icare/keep-media.jpg");
  assert.equal(state.products[0].image, "/images/products/product-placeholder.svg?legacy-cleared=1");
  assert.equal(state.products[0].categoryId, "category-1");
  assert.equal(state.products[0].brandId, "brand-1");
  assert.deepEqual(state.products[0].variants, [
    { id: "variant-1", image_url: "/uploads/icare/keep-variant.jpg" },
  ]);
  assert.deepEqual(
    state.products[0].gallery_images.map(({ id, image_url }) => ({ id, image_url })),
    [
      { id: "gallery-1", image_url: "/images/products/product-placeholder.svg" },
      { id: "gallery-2", image_url: "/uploads/icare/keep-gallery.jpg" },
    ],
  );
  assert.equal(requests.some(({ pathname }) => pathname === "/api/uploads"), false);
});

test("product primary clearing bypasses legacy-preservation without classifying the placeholder as legacy", () => {
  const status = summarizeStatus({
    products: [{
      id: "product-1",
      image: "/images/products/product-placeholder.svg?legacy-cleared=1",
      variants: [],
      gallery_images: [],
    }],
    categories: [],
    brands: [],
    texts: [],
    media: [],
  });
  assert.equal(status.images.legacy, 0);
  assert.equal(status.images.emptyOrCleared, 1);
  assert.deepEqual(status.details, []);
});

test("detailed status identifies missed product primary and gallery fields exactly", async () => {
  const responses = new Map([
    ["/api/products", [{
      id: "product-6",
      image: "https://backend.igroup.website/uploads/primary.jpg",
      variants: [],
      gallery_images: [{
        id: "gallery-6",
        image_url: "/public/uploads/gallery.jpg",
      }],
    }]],
    ["/api/categories", []],
    ["/api/brands", []],
    ["/api/website-texts", []],
    ["/api/website-media", []],
  ]);
  const status = await runStatusMode({
    details: true,
    apiCall: async (_token, pathname) => responses.get(pathname),
  });
  assert.deepEqual(status.details, [
    {
      entityType: "product",
      entityId: "product-6",
      field: "image",
      url: "https://backend.igroup.website/uploads/primary.jpg",
    },
    {
      entityType: "product-gallery",
      entityId: "gallery-6",
      field: "image_url",
      url: "/public/uploads/gallery.jpg",
    },
  ]);
});
