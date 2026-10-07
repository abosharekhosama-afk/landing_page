export function slugifyCityKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function defaultZoneCurrency(company) {
  const configured = String(company?.settings?.currency || company?.currency || "ILS").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(configured) ? configured : "ILS";
}

export function emptyZoneDraft(company) {
  return {
    city_name: "",
    city_key: "",
    region: "",
    delivery_price: "0",
    currency: defaultZoneCurrency(company),
    enabled: true,
    display_order: "0",
  };
}

export function zoneDraftFromRecord(zone) {
  return {
    city_name: zone.city_name || zone.cityName || "",
    city_key: zone.city_key || zone.cityKey || "",
    region: zone.region || "",
    delivery_price: String(zone.delivery_price ?? zone.deliveryPrice ?? 0),
    currency: zone.currency || "ILS",
    enabled: zone.enabled !== false,
    display_order: String(zone.display_order ?? zone.displayOrder ?? 0),
  };
}

// Filters public zones to those enabled and orders them by display_order then
// city name (mirrors the server-side ordering of the public delivery-zones route).
export function availableDeliveryZones(zones) {
  return (Array.isArray(zones) ? zones : [])
    .filter((zone) => zone && zone.enabled !== false)
    .sort(
      (a, b) =>
        (Number(a.display_order) || 0) - (Number(b.display_order) || 0) ||
        String(a.city_name || "").localeCompare(String(b.city_name || "")),
    );
}

// Builds the checkout submission payload for a selected delivery zone. Keeps the
// free-text city as a fallback and surfaces the authoritative delivery_zone_id /
// delivery_city_key fields the Orders API expects at the top level of the body.
export function deliveryZoneSelectionPayload(form = {}, zone) {
  return {
    city: String(zone?.city_name || "").trim() || String(form.city || "").trim(),
    delivery_zone_id: String(zone?.id || ""),
    delivery_city_key: String(zone?.city_key || ""),
  };
}

export function zonePayloadFromDraft(draft, { includeKey = true } = {}) {
  const cityName = String(draft.city_name || "").trim();
  const payload = {
    city_name: cityName,
    region: String(draft.region || "").trim(),
    delivery_price: Number(draft.delivery_price || 0),
    currency: String(draft.currency || "ILS").trim().toUpperCase(),
    enabled: draft.enabled !== false,
    display_order: Math.max(0, Number(draft.display_order || 0)),
  };
  if (includeKey) {
    payload.city_key = slugifyCityKey(draft.city_key || cityName);
  }
  return payload;
}
