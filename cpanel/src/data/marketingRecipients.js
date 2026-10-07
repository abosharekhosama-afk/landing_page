// T-003 — Mock recipient options for the campaign recipients step.
// Counts below are demo placeholders only; no real contact source is connected.

export const recipientSources = [
  {
    id: "all-contacts",
    icon: "users",
    en: "All Contacts",
    ar: "كل جهات الاتصال",
    descEn: "Send to every contact stored for this company.",
    descAr: "الإرسال إلى كل جهات الاتصال المحفوظة لهذه الشركة.",
  },
  {
    id: "contacts",
    icon: "user-check",
    en: "Contacts",
    ar: "جهات الاتصال",
    descEn: "Pick specific contacts manually.",
    descAr: "اختر جهات اتصال محددة يدويًا.",
  },
  {
    id: "segments",
    icon: "wand",
    en: "Segments",
    ar: "المجموعات",
    descEn: "Target a saved customer segment.",
    descAr: "استهدف مجموعة عملاء محفوظة.",
  },
  {
    id: "labels",
    icon: "tag",
    en: "Labels",
    ar: "التصنيفات",
    descEn: "Target contacts by a shared label.",
    descAr: "استهدف جهات الاتصال حسب تصنيف مشترك.",
  },
];

export const recipientSegments = [
  { id: "segment-new", en: "New customers", ar: "عملاء جدد", count: 0, color: "#2169ca" },
  { id: "segment-repeat", en: "Repeat buyers", ar: "مشترون متكررون", count: 0, color: "#2f6d3a" },
  { id: "segment-inactive", en: "Inactive 90 days", ar: "غير نشطين 90 يوماً", count: 0, color: "#b97a12" },
  { id: "segment-vip", en: "VIP list", ar: "قائمة VIP", count: 0, color: "#6455c8" },
];

export const recipientLabels = [
  { id: "label-newsletter", en: "Newsletter", ar: "النشرة البريدية", color: "#2169ca" },
  { id: "label-offers", en: "Offers", ar: "العروض", color: "#c33b3b" },
  { id: "label-events", en: "Events", ar: "الفعاليات", color: "#2f6d3a" },
  { id: "label-wholesale", en: "Wholesale", ar: "الجملة", color: "#6455c8" },
];

export const csvImportLabel = { en: "Import CSV", ar: "استيراد CSV" };
export const gmailImportLabel = { en: "Import from Gmail", ar: "استيراد من Gmail" };