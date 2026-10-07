export const deliveryTransitions = Object.freeze({
  new: ["confirmed", "cancelled"], confirmed: ["preparing", "cancelled"], preparing: ["ready_for_delivery", "cancelled"],
  ready_for_delivery: ["out_for_delivery", "cancelled"], out_for_delivery: ["delivered", "returned"], delivered: ["returned"], cancelled: [], returned: [],
});
export function assertTransition(from, to) {
  if (!deliveryTransitions[from]?.includes(to)) throw Object.assign(new Error(`Invalid order transition from ${from} to ${to}.`), { statusCode: 409 });
}
export function money(value, field = "amount") {
  const normalized = String(value ?? "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw Object.assign(new Error(`${field} must be a non-negative monetary value with at most two decimals.`), { statusCode: 400 });
  return normalized;
}
export function calculateLine({ quantity, customerUnitPrice, dropshippingUnitPrice, fixedFee, percentageFee }) {
  const qty = Number(quantity);
  if (!Number.isSafeInteger(qty) || qty < 1) throw Object.assign(new Error("quantity must be a positive integer."), { statusCode: 400 });
  const customer = Number(money(customerUnitPrice, "customerUnitPrice")); const cost = Number(money(dropshippingUnitPrice, "dropshippingUnitPrice"));
  const fixed = Number(money(fixedFee ?? 0, "fixedFee")); const percentage = Number(percentageFee ?? 0);
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) throw Object.assign(new Error("percentageFee must be between 0 and 100."), { statusCode: 400 });
  const sellingTotal = customer * qty; const costTotal = cost * qty; const fees = fixed + (sellingTotal * percentage / 100); const profit = sellingTotal - costTotal - fees;
  if (profit < 0) throw Object.assign(new Error("Selling price does not cover dropshipping cost and fees."), { statusCode: 400 });
  return { sellingTotal: sellingTotal.toFixed(2), costTotal: costTotal.toFixed(2), fees: fees.toFixed(2), profit: profit.toFixed(2) };
}
export function csvCell(value) { const text = String(value ?? ""); const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text; return `"${safe.replace(/"/g, '""')}"`; }

