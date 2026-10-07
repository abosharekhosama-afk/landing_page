import { products as seedProducts } from "./seeds/products.js";

export const products = seedProducts.map((product) => ({
  ...product,
  sizes: product.sizes.map((size) => ({ ...size })),
  badge: { ...product.badge },
  name: { ...product.name },
  shortDescription: { ...product.shortDescription },
  longDescription: { ...product.longDescription },
  usageNotes: { ...product.usageNotes },
}));
