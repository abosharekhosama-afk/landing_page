export function formatInventoryDate(value, language = "en") {
  if (value === null || value === undefined || value === "") return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(language === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
