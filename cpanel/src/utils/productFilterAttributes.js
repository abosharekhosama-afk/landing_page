import {
  getProductFilterAttributeOptions,
  PRODUCT_FILTER_ATTRIBUTE_GROUPS,
  PRODUCT_FILTER_ATTRIBUTE_OPTIONS,
  getProductFilterAttributeLabel,
  isAmbiguousLegacyAgeValue,
  normalizeProductFilterAttributeValue,
  requiresCanonicalAgeSelection,
  resolveProductFilterAttributeForForm,
} from "../../../shared/catalog/productFilterAttributes.js";

export {
  PRODUCT_FILTER_ATTRIBUTE_GROUPS,
  PRODUCT_FILTER_ATTRIBUTE_OPTIONS,
  getProductFilterAttributeLabel,
  getProductFilterAttributeOptions,
  isAmbiguousLegacyAgeValue,
  normalizeProductFilterAttributeValue,
  requiresCanonicalAgeSelection,
  resolveProductFilterAttributeForForm,
};

export function getLocalizedFilterAttributeOptions(group, locale = "en") {
  return getProductFilterAttributeOptions(group).map((entry) => ({
    id: entry.id,
    label: entry.label[locale] || entry.label.en || entry.id,
  }));
}

export function getLocalizedFilterAttributeOptionsForSelect(group, locale = "en", selectedValue = "") {
  const options = getLocalizedFilterAttributeOptions(group, locale);
  if (!selectedValue || options.some((entry) => entry.id === selectedValue)) {
    return options;
  }

  const legacySuffix = locale === "ar" ? "قيمة قديمة — اختر قيمة معتمدة" : "legacy value — choose a canonical option";
  const label = group === "age" && isAmbiguousLegacyAgeValue(selectedValue)
    ? `${selectedValue} (${legacySuffix})`
    : `${selectedValue} (${locale === "ar" ? "قديم" : "legacy"})`;

  return [...options, { id: selectedValue, label }];
}
