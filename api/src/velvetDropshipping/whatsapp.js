import { confirmationMessage, hebronParts, whatsAppUrl } from "./domain.js";

export function deliveryQuote(zones, city) {
  const key = String(city || "").trim().toLowerCase();
  const zone = (zones || []).find((entry) => {
    const name = String(entry.city_name || entry.cityName || "").trim().toLowerCase();
    const cityKey = String(entry.city_key || entry.cityKey || "").trim().toLowerCase();
    return entry.enabled !== false && !entry.deleted_at && (name === key || cityKey === key);
  });
  const amount = zone?.delivery_price ?? zone?.deliveryPrice;
  if (amount == null || amount === "") return { deliveryAmount: null, deliveryAmountStatus: "not_set" };
  return { deliveryAmount: Number(amount).toFixed(2), deliveryAmountStatus: "set" };
}

export function nextAttempt(order, now = new Date()) {
  const today = hebronParts(now).key;
  const sameDay = order.whatsapp_attempt_day && String(order.whatsapp_attempt_day).slice(0, 10) === today;
  return {
    whatsappAttemptCount: sameDay ? Number(order.whatsapp_attempt_count || 0) + 1 : 1,
    whatsappAttemptDay: today,
  };
}

export function buyerWhatsAppLink({ phone, items, merchandiseTotal, deliveryAmount }) {
  return whatsAppUrl(phone, confirmationMessage({ items, merchandiseTotal, deliveryAmount }));
}
