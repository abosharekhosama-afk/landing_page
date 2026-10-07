import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { preferWebpUploadUrl } from "../src/uploads/preferWebpUploadUrl.js";

function fixtureUploadsDir() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prefer-webp-"));
  const uploadsDir = path.join(fixtureRoot, "uploads");
  fs.mkdirSync(path.join(uploadsDir, "kids-velvet", "products"), { recursive: true });
  return { fixtureRoot, uploadsDir };
}

test("preferWebpUploadUrl rewrites /uploads/ png/jpg/jpeg to an existing .webp sibling", () => {
  const { fixtureRoot, uploadsDir } = fixtureUploadsDir();
  try {
    fs.writeFileSync(path.join(uploadsDir, "kids-velvet", "products", "toy.webp"), Buffer.from("webp"));

    assert.equal(
      preferWebpUploadUrl("/uploads/kids-velvet/products/toy.jpg", { uploadsDir }),
      "/uploads/kids-velvet/products/toy.webp",
    );
    assert.equal(
      preferWebpUploadUrl("/uploads/kids-velvet/products/toy.jpeg", { uploadsDir }),
      "/uploads/kids-velvet/products/toy.webp",
    );
    assert.equal(
      preferWebpUploadUrl("/uploads/kids-velvet/products/toy.png", { uploadsDir }),
      "/uploads/kids-velvet/products/toy.webp",
    );
    // Absolute origin + query string are preserved.
    assert.equal(
      preferWebpUploadUrl("https://api.example.com/uploads/kids-velvet/products/toy.png?v=2", { uploadsDir }),
      "https://api.example.com/uploads/kids-velvet/products/toy.webp?v=2",
    );
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("preferWebpUploadUrl falls back to .display.webp when full .webp is missing", () => {
  const { fixtureRoot, uploadsDir } = fixtureUploadsDir();
  try {
    fs.writeFileSync(
      path.join(uploadsDir, "kids-velvet", "products", "huge.display.webp"),
      Buffer.from("display"),
    );
    assert.equal(
      preferWebpUploadUrl("/uploads/kids-velvet/products/huge.png", { uploadsDir }),
      "/uploads/kids-velvet/products/huge.display.webp",
    );
    assert.equal(
      preferWebpUploadUrl("https://api.example.com/uploads/kids-velvet/products/huge.png?v=9", { uploadsDir }),
      "https://api.example.com/uploads/kids-velvet/products/huge.display.webp?v=9",
    );
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("preferWebpUploadUrl prefers full .webp over .display.webp when both exist", () => {
  const { fixtureRoot, uploadsDir } = fixtureUploadsDir();
  try {
    fs.writeFileSync(path.join(uploadsDir, "kids-velvet", "products", "toy.webp"), Buffer.from("full"));
    fs.writeFileSync(
      path.join(uploadsDir, "kids-velvet", "products", "toy.display.webp"),
      Buffer.from("display"),
    );
    assert.equal(
      preferWebpUploadUrl("/uploads/kids-velvet/products/toy.png", { uploadsDir }),
      "/uploads/kids-velvet/products/toy.webp",
    );
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("preferWebpUploadUrl leaves URLs unchanged when no webp or display sibling exists", () => {
  const { fixtureRoot, uploadsDir } = fixtureUploadsDir();
  try {
    assert.equal(
      preferWebpUploadUrl("/uploads/kids-velvet/products/toy.jpg", { uploadsDir }),
      "/uploads/kids-velvet/products/toy.jpg",
    );
    assert.equal(
      preferWebpUploadUrl("https://api.example.com/uploads/kids-velvet/products/toy.png?v=2", { uploadsDir }),
      "https://api.example.com/uploads/kids-velvet/products/toy.png?v=2",
    );
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("preferWebpUploadUrl never rewrites non-uploads, already-webp, admin-preview, or non-image URLs", () => {
  const { fixtureRoot, uploadsDir } = fixtureUploadsDir();
  try {
    fs.writeFileSync(path.join(uploadsDir, "kids-velvet", "products", "toy.webp"), Buffer.from("webp"));

    assert.equal(
      preferWebpUploadUrl("https://cdn.example.com/other/toy.jpg", { uploadsDir }),
      "https://cdn.example.com/other/toy.jpg",
      "external CDN URLs are never rewritten",
    );
    assert.equal(
      preferWebpUploadUrl("/images/products/toy.jpg", { uploadsDir }),
      "/images/products/toy.jpg",
      "non-/uploads/ paths are never rewritten",
    );
    assert.equal(
      preferWebpUploadUrl("/uploads/kids-velvet/products/toy.webp", { uploadsDir }),
      "/uploads/kids-velvet/products/toy.webp",
      "already .webp is never rewritten",
    );
    assert.equal(
      preferWebpUploadUrl("/uploads/kids-velvet/products/toy.admin-preview.webp", { uploadsDir }),
      "/uploads/kids-velvet/products/toy.admin-preview.webp",
      ".admin-preview.webp thumbnails are never rewritten",
    );
    assert.equal(
      preferWebpUploadUrl("/uploads/kids-velvet/products/toy.gif", { uploadsDir }),
      "/uploads/kids-velvet/products/toy.gif",
      "non-png/jpg/jpeg extensions are never rewritten",
    );
    assert.equal(
      preferWebpUploadUrl("/uploads/kids-velvet/products/toy.mp4", { uploadsDir }),
      "/uploads/kids-velvet/products/toy.mp4",
      "videos are never rewritten",
    );
    assert.equal(preferWebpUploadUrl("", { uploadsDir }), "");
    assert.equal(preferWebpUploadUrl(null, { uploadsDir }), "");
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("preferWebpUploadUrl returns the original when no uploadsDir is configured", () => {
  const previous = process.env.UPLOADS_DIR;
  delete process.env.UPLOADS_DIR;
  try {
    assert.equal(
      preferWebpUploadUrl("/uploads/kids-velvet/products/toy.jpg"),
      "/uploads/kids-velvet/products/toy.jpg",
    );
  } finally {
    if (previous !== undefined) process.env.UPLOADS_DIR = previous;
  }
});

test("preferWebpUploadUrl defaults to process.env.UPLOADS_DIR", () => {
  const { fixtureRoot, uploadsDir } = fixtureUploadsDir();
  try {
    fs.writeFileSync(path.join(uploadsDir, "kids-velvet", "products", "toy.webp"), Buffer.from("webp"));
    const previous = process.env.UPLOADS_DIR;
    process.env.UPLOADS_DIR = uploadsDir;
    try {
      assert.equal(
        preferWebpUploadUrl("/uploads/kids-velvet/products/toy.jpg"),
        "/uploads/kids-velvet/products/toy.webp",
      );
    } finally {
      if (previous === undefined) delete process.env.UPLOADS_DIR;
      else process.env.UPLOADS_DIR = previous;
    }
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("preferWebpUploadUrl honors an injected existsSync", () => {
  const seen = [];
  const existsSync = (file) => {
    seen.push(file);
    return String(file).endsWith("toy.webp");
  };
  assert.equal(
    preferWebpUploadUrl("/uploads/kids-velvet/products/toy.jpg", { uploadsDir: "C:\\uploads", existsSync }),
    "/uploads/kids-velvet/products/toy.webp",
  );
  assert.equal(
    preferWebpUploadUrl("/uploads/kids-velvet/products/missing.jpg", { uploadsDir: "C:\\uploads", existsSync }),
    "/uploads/kids-velvet/products/missing.jpg",
  );
  assert.ok(seen.some((file) => String(file).endsWith("toy.webp")), "existsSync was consulted");
});