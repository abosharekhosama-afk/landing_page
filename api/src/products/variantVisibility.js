export function isVariantVisible(variant = {}) {
  return variant.isActive !== false
    && variant.is_active !== false
    && variant.isVisible !== false
    && variant.is_visible !== false
    && variant.hiddenFromStorefront !== true;
}

export function withVariantVisibility(variant = {}) {
  return {
    ...variant,
    isVisible: isVariantVisible(variant),
  };
}
