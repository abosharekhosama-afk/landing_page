const HEBRON = "Asia/Hebron";

export function httpError(statusCode, message, code) {
  return Object.assign(new Error(message), { statusCode, code });
}

export function money(value, field = "amount") {
  const normalized = String(value ?? "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw httpError(400, `${field} must be a non-negative amount with at most two decimals.`);
  }
  return normalized;
}

export function unitProfit(sellingUnitPrice, merchantUnitPrice) {
  const selling = Number(money(sellingUnitPrice, "sellingUnitPrice"));
  const merchant = Number(money(merchantUnitPrice, "merchantUnitPrice"));
  const profit = Math.round((selling - merchant) * 100) / 100;
  if (profit < 0) throw httpError(400, "Merchant price cannot exceed the selling price.");
  return profit.toFixed(2);
}

export function lineProfit(profitUnitAmount, quantity) {
  const qty = Number(quantity);
  if (!Number.isSafeInteger(qty) || qty < 1) throw httpError(400, "quantity must be a positive integer.");
  return (Number(money(profitUnitAmount, "profitUnitAmount")) * qty).toFixed(2);
}

export function slugify(value) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  if (!slug) throw httpError(400, "Store name must include a letter or number.");
  return slug;
}

export const UNBRANDED_FALLBACK = "/velvet-dropshipping/unbranded-fallback.svg";

export function resolveMerchantImage({ cleanImageUrl, generationSucceeded = false, generatedImageUrl = null } = {}) {
  if (!cleanImageUrl) {
    return { imageStatus: "fallback", generatedImageUrl: null, displayUrl: UNBRANDED_FALLBACK };
  }
  if (!generationSucceeded || !generatedImageUrl) {
    return { imageStatus: "generation_failed", generatedImageUrl: null, displayUrl: UNBRANDED_FALLBACK };
  }
  return { imageStatus: "ready", generatedImageUrl, displayUrl: generatedImageUrl };
}

const fulfillmentOrder = ["CONFIRMED", "PROCESSING", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED_COLLECTED"];

export function assertFulfillmentAdvance(from, to) {
  const current = fulfillmentOrder.indexOf(from);
  const next = fulfillmentOrder.indexOf(to);
  if (current < 0 || next !== current + 1) {
    throw httpError(409, `Cannot move an order from ${from} to ${to}.`);
  }
}

export function canCancelUnconfirmed(attemptCount) {
  return Number(attemptCount) >= 2;
}

export function hebronParts(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: HEBRON,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    weekday: parts.weekday,
    key: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export function isThursdayInHebron(date = new Date()) {
  return hebronParts(date).weekday === "Thu";
}

export function assertThursdayDate(isoDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(isoDate || ""))) {
    throw httpError(400, "thursday must be a YYYY-MM-DD date.");
  }
  const probe = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(probe.getTime()) || !isThursdayInHebron(probe)) {
    throw httpError(400, "Settlement close requires a Thursday in Asia/Hebron.");
  }
  return isoDate;
}

export function sameHebronDay(left, right = new Date()) {
  return hebronParts(left).key === hebronParts(right).key;
}

function midnightInHebron(isoDate) {
  let probe = new Date(`${isoDate}T00:00:00Z`);
  for (let step = 0; step < 36; step += 1) {
    const map = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: HEBRON,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(probe).map((part) => [part.type, part.value]),
    );
    if (`${map.year}-${map.month}-${map.day}` === isoDate && map.hour === "00" && map.minute === "00") {
      return probe;
    }
    probe = new Date(probe.getTime() - 30 * 60 * 1000);
  }
  throw httpError(500, "Could not resolve Thursday midnight in Asia/Hebron.");
}

export function latestThursdayStart(date = new Date()) {
  const parts = hebronParts(date);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daysBack = (weekdays.indexOf(parts.weekday) + 7 - 4) % 7;
  const [year, month, day] = parts.key.split("-").map(Number);
  const thursdayKey = hebronParts(new Date(Date.UTC(year, month - 1, day - daysBack, 12))).key;
  return midnightInHebron(thursdayKey);
}

export function warehouseMissMovements(quantity) {
  const qty = Number(quantity);
  if (!Number.isSafeInteger(qty) || qty < 1) throw httpError(400, "quantity must be a positive integer.");
  return [
    { reason: "warehouse_miss_reversal", qtyDelta: qty },
    { reason: "physical_discrepancy", qtyDelta: -qty },
  ];
}

export function netSellableDelta(movements) {
  return movements.reduce((sum, movement) => sum + Number(movement.qtyDelta), 0);
}

export function settlementProfit(lines) {
  return lines.reduce((sum, line) => {
    if (line.lineStatus && line.lineStatus !== "active") return sum;
    return sum + Number(lineProfit(line.profitUnitAmount, line.quantity));
  }, 0).toFixed(2);
}

export function whatsAppUrl(phone, text) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 7) throw httpError(400, "A customer phone number is required for WhatsApp.");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function confirmationMessage({ items, merchandiseTotal, deliveryAmount }) {
  const lines = items.map((item) => `${item.quantity} x ${item.name}`).join("\n");
  const delivery = deliveryAmount == null
    ? "Delivery: not set"
    : `Delivery: ${deliveryAmount}`;
  return `Order confirmation\n${lines}\nMerchandise: ${merchandiseTotal}\n${delivery}`;
}
