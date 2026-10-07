const ALLOWED_FIELDS = [
  "city_key", "cityKey",
  "city_name", "cityName",
  "region",
  "delivery_price", "deliveryPrice",
  "currency",
  "enabled",
  "display_order", "displayOrder",
];

const ALLOWED_UPDATE_FIELDS = ALLOWED_FIELDS;

function deliveryError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function rejectUnknownFields(body, allowed) {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(body)) {
    if (!allowedSet.has(key)) {
      throw deliveryError(`Unknown field: ${key}`);
    }
  }
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function sanitizeCreateZone(body) {
  rejectUnknownFields(body, ALLOWED_FIELDS);

  const cityKey = slugify(body.city_key || body.cityKey);
  if (!cityKey) {
    throw deliveryError("city_key is required.");
  }

  const cityName = String(body.city_name || body.cityName || "").trim();
  if (!cityName) {
    throw deliveryError("city_name is required.");
  }

  const deliveryPrice = Number(body.delivery_price ?? body.deliveryPrice ?? 0);
  if (!Number.isFinite(deliveryPrice) || deliveryPrice < 0) {
    throw deliveryError("delivery_price must be 0 or greater.");
  }

  return {
    city_key: cityKey,
    city_name: cityName,
    region: String(body.region || "").trim(),
    delivery_price: Math.round(deliveryPrice * 100) / 100,
    currency: String(body.currency || "ILS").trim().toUpperCase(),
    enabled: body.enabled !== false,
    display_order: Math.max(0, Number(body.display_order ?? body.displayOrder ?? 0)),
  };
}

export function sanitizeUpdateZone(body) {
  rejectUnknownFields(body, ALLOWED_UPDATE_FIELDS);

  const update = {};

  if (body.city_key || body.cityKey) {
    const cityKey = slugify(body.city_key || body.cityKey);
    if (!cityKey) throw deliveryError("city_key cannot be empty.");
    update.city_key = cityKey;
  }

  if (body.city_name || body.cityName) {
    const cityName = String(body.city_name || body.cityName).trim();
    if (!cityName) throw deliveryError("city_name cannot be empty.");
    update.city_name = cityName;
  }

  if ("region" in body) {
    update.region = String(body.region || "").trim();
  }

  if ("delivery_price" in body || "deliveryPrice" in body) {
    const dp = Number(body.delivery_price ?? body.deliveryPrice ?? 0);
    if (!Number.isFinite(dp) || dp < 0) {
      throw deliveryError("delivery_price must be 0 or greater.");
    }
    update.delivery_price = Math.round(dp * 100) / 100;
  }

  if ("currency" in body) {
    update.currency = String(body.currency).trim().toUpperCase();
  }

  if ("enabled" in body) {
    update.enabled = body.enabled === true;
  }

  if ("display_order" in body || "displayOrder" in body) {
    update.display_order = Math.max(0, Number(body.display_order ?? body.displayOrder ?? 0));
  }

  return update;
}

export function findEnabledZone(zones, deliveryZoneId, cityKey) {
  const zone = zones.find(
    (z) => z.enabled !== false && !z.deleted_at && (z.id === deliveryZoneId || z.city_key === cityKey),
  );
  if (!zone) return null;
  return zone;
}
