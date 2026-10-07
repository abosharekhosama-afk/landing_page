export function formatInboxWhen(value, language) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(language === "ar" ? "ar" : "en", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function inboxContactLabel(conversation) {
  const contact = conversation?.contact;
  return contact?.name || contact?.email || contact?.phone || conversation?.contactId || "—";
}

export function inboxAssigneeLabel(conversation) {
  const employee = conversation?.assignedEmployee;
  return employee?.name || employee?.email || null;
}

export function inboxInitials(value) {
  return String(value || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function inboxReplyBlocked(conversation) {
  if (!conversation) return null;
  if (conversation.archivedAt) return "archived";
  if (conversation.status === "closed") return "closed";
  if (conversation.contact?.isArchived) return "contactArchived";
  return null;
}
