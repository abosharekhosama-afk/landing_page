export const WHATSAPP_NUMBER = "972599130765";

function formatValue(value, fallback = "Not provided") {
  const normalized = value == null ? "" : String(value).trim();
  return normalized || fallback;
}

function formatCustomerAddress(customer = {}) {
  return [customer.address, customer.city].filter(Boolean).join(", ");
}

function formatOrderItem(item, index) {
  const productName = item.productName || item.name || item.label || item.slug || item.productId || "Product";
  const variant = item.selectedSize || item.size || item.variant || "";
  const quantity = Number(item.quantity || 1);
  const price = Number(item.price || 0);
  const title = variant ? `${productName} - ${variant}` : productName;

  return [`${index + 1}. ${title}`, `   Qty: ${quantity}`, `   Price: ${price} ILS`].join("\n");
}

export function buildWhatsAppOrderMessage({ customer = {}, items = [], total = 0 } = {}) {
  const productLines = items.length
    ? items.map((item, index) => formatOrderItem(item, index)).join("\n\n")
    : "No products listed";

  return [
    "New EB Chemical Order",
    "",
    "Customer:",
    `Name: ${formatValue(customer.name)}`,
    `Phone: ${formatValue(customer.phone)}`,
    `Address: ${formatValue(formatCustomerAddress(customer))}`,
    "",
    "Order:",
    "",
    productLines,
    "",
    `Total: ${total} ILS`,
    "",
    `Notes: ${formatValue(customer.notes, "None")}`,
  ].join("\n");
}

export function buildWhatsAppOrderUrl(order) {
  const message = encodeURIComponent(buildWhatsAppOrderMessage(order));
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
}
