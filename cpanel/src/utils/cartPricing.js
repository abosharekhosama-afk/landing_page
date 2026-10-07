const positivePrice = (value) => {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : null;
};

export function currentUnitPrice(product, variantId) {
  if (!product) return null;
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const variant = variantId
    ? variants.find((entry) => String(entry?.id || "") === String(variantId))
    : null;
  return positivePrice(variant?.price) ?? positivePrice(product.price);
}

export function findCartProduct(products, item) {
  if (!Array.isArray(products) || !item) return null;
  return (
    products.find((product) => product?.id === item.productId || product?.slug === item.slug) ||
    null
  );
}

export function reconcileCartPrices(cartItems = [], products = []) {
  if (!Array.isArray(cartItems) || !cartItems.length) return cartItems;
  if (!Array.isArray(products) || !products.length) return cartItems;

  let changed = false;
  const nextItems = cartItems.map((item) => {
    const price = currentUnitPrice(findCartProduct(products, item), item?.variantId);
    if (price === null || price === item?.price) return item;
    changed = true;
    return { ...item, price };
  });

  return changed ? nextItems : cartItems;
}

export function cartSubtotal(cartItems = []) {
  const total = (Array.isArray(cartItems) ? cartItems : []).reduce(
    (sum, item) => sum + positivePrice(item?.price) * Math.max(0, Number(item?.quantity) || 0),
    0,
  );
  return Math.round(total * 100) / 100;
}
