function normalized(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizedPhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function stableContactIds(record) {
  return [
    record?.customerUserId,
    record?.customerId,
    record?.contactId,
    record?.customer_id,
    record?.contact_id,
    record?.customer?.id,
    record?.customer?.userId,
  ].filter((value) => value !== undefined && value !== null && value !== "").map(String);
}

function matchesContact(record, contact, emailValue, phoneValue) {
  const contactId = String(contact?.id || "");
  const ids = stableContactIds(record);
  if (ids.length) return Boolean(contactId) && ids.includes(contactId);

  const email = normalized(emailValue);
  const phone = normalizedPhone(phoneValue);
  return (email && email === normalized(contact?.email)) || (phone && phone === normalizedPhone(contact?.phone));
}

export function ordersForContact(orders, contact) {
  if (!contact || !orders.length) return [];
  return orders.filter((order) => matchesContact(order, contact, order?.customer?.email, order?.customer?.phone));
}

export function invoicesForContact(invoices, contact) {
  if (!contact || !invoices.length) return [];
  return invoices.filter((invoice) => matchesContact(invoice, contact, invoice?.customer_email, invoice?.customer_phone));
}
