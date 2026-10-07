import { apiRequest } from "./api.js";

export const productFieldApi = {
  definitions: () => apiRequest("/admin/product-field-definitions"),
  values: (productId) => apiRequest(`/admin/products/${encodeURIComponent(productId)}/field-values`),
  saveValues: (productId, values) => apiRequest(`/admin/products/${encodeURIComponent(productId)}/field-values`, {
    method: "PUT",
    body: JSON.stringify({ values }),
  }),
};

const listTypes = new Set(["repeatable_list", "multi_select"]);

export function normalizeLegacyLocalizedList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item ?? ""));
  if (value == null || value === "") return [];
  return [String(value)];
}

export function valuesToFieldState(values = [], definitions = []) {
  const state = {};
  const byKey = new Map(definitions.map((definition) => [definition.field_key, definition]));
  for (const entry of values) {
    const definition = byKey.get(entry.field_key);
    if (entry.locale === "neutral" && definition?.translatable) {
      state[entry.field_key] = listTypes.has(definition.field_type)
        ? { en: normalizeLegacyLocalizedList(entry.value), ar: [] }
        : { en: entry.value ?? "", ar: "" };
    } else if (entry.locale === "neutral") state[entry.field_key] = entry.value;
    else {
      const localizedValue = definition?.translatable && listTypes.has(definition.field_type)
        ? normalizeLegacyLocalizedList(entry.value)
        : entry.value;
      state[entry.field_key] = { ...(state[entry.field_key] || {}), [entry.locale]: localizedValue };
    }
  }
  return state;
}

export function fieldStateToValues(definitions = [], state = {}) {
  return definitions.flatMap((definition) => {
    const value = state[definition.field_key];
    if (definition.translatable) {
      const localized = value && !Array.isArray(value) && typeof value === "object"
        ? value
        : { en: listTypes.has(definition.field_type) ? normalizeLegacyLocalizedList(value) : value, ar: listTypes.has(definition.field_type) ? [] : null };
      return ["en", "ar"].map((locale) => ({ key: definition.field_key, locale, value: localized?.[locale] ?? null }));
    }
    return [{ key: definition.field_key, locale: "neutral", value: value ?? null }];
  });
}
