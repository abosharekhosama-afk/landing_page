// T-003 — Mock campaign data for the Email Marketing workspace.
// UI-only layer: nothing here is persisted to a backend, sent, or connected to a provider.

export const campaignTemplates = [
  {
    id: "announcement",
    icon: "megaphone",
    en: "Launch announcement",
    ar: "إعلان إطلاق",
    descEn: "Announce a launch with a bold banner and CTA.",
    descAr: "أعلن عن إطلاق جديد ببنر جريء وزر إجراء.",
    accent: "#5b2d90",
    bodyEn: "Hi there,\n\nWe have some news to share with you.\n\n— The team",
    bodyAr: "مرحباً،\n\nلدينا بعض الأخبار التي نود مشاركتها معك.\n\n— الفريق",
  },
  {
    id: "promotion",
    icon: "gift",
    en: "Promotion",
    ar: "عرض ترويجي",
    descEn: "Drive sales with offers, codes and product cards.",
    descAr: "عزز المبيعات بالعروض والأكواد وبطاقات المنتجات.",
    accent: "#b8322f",
    bodyEn: "Hello,\n\nA special offer is prepared for this campaign.\n\n— The team",
    bodyAr: "مرحباً،\n\nعرض خاص مُجهّز لهذه الحملة.\n\n— الفريق",
  },
  {
    id: "newsletter",
    icon: "mail",
    en: "Newsletter",
    ar: "نشرة بريدية",
    descEn: "Share monthly updates, tips and stories.",
    descAr: "شارك التحديثات الشهرية والنصائح والقصص.",
    accent: "#1c5fae",
    bodyEn: "Hello,\n\nHere is the latest from our store.\n\n— The team",
    bodyAr: "مرحباً،\n\nإليك آخر أخبار متجرك.\n\n— الفريق",
  },
  {
    id: "product-story",
    icon: "sparkles",
    en: "Product story",
    ar: "قصة منتج",
    descEn: "Tell the story behind a product with visuals.",
    descAr: "احكِ القصة وراء المنتج بلمسة بصرية.",
    accent: "#0b6e4f",
    bodyEn: "Hello,\n\nDiscover the story behind this product.\n\n— The team",
    bodyAr: "مرحباً،\n\nاكتشف القصة وراء هذا المنتج.\n\n— الفريق",
  },
  {
    id: "event-invite",
    icon: "calendar",
    en: "Event invitation",
    ar: "دعوة فعالية",
    descEn: "Invite with a countdown timer, agenda and location.",
    descAr: "ادعُ بعدّ تنازلي وجدول زمني وموقع.",
    accent: "#7c3aed",
    bodyEn: "Hello,\n\nYou are invited to our upcoming event. Seats are limited!\n\n— The team",
    bodyAr: "مرحباً،\n\nأنت مدعو إلى فعاليتنا القادمة. المقاعد محدودة!\n\n— الفريق",
  },
  {
    id: "cart-recovery",
    icon: "cart",
    en: "Cart recovery",
    ar: "استعادة السلة",
    descEn: "Win back shoppers with a reminder and a coupon code.",
    descAr: "استعد المتسوقين بتذكير وكود خصم.",
    accent: "#ea580c",
    bodyEn: "Hello,\n\nYou left something behind — complete your order with a discount.\n\n— The team",
    bodyAr: "مرحباً،\n\nتركتم شيئاً خلفكم — أكملوا طلبكم مع خصم.\n\n— الفريق",
  },
  {
    id: "thank-you",
    icon: "heart",
    en: "Thank you note",
    ar: "رسالة شكر",
    descEn: "Warm thank-you message with a quote and contact details.",
    descAr: "رسالة شكر دافئة مع اقتباس وبيانات التواصل.",
    accent: "#db2777",
    bodyEn: "Hello,\n\nThank you for being with us — your support means everything.\n\n— The team",
    bodyAr: "مرحباً،\n\nشكراً لبقائكم معنا — دعمكم يعني لنا كل شيء.\n\n— الفريق",
  },
  {
    id: "welcome",
    icon: "wand",
    en: "Welcome series",
    ar: "سلسلة الترحيب",
    descEn: "Onboard new subscribers with steps and quick links.",
    descAr: "رحّب بالمشتركين الجدد بخطوات وروابط سريعة.",
    accent: "#0e7490",
    bodyEn: "Hello,\n\nWelcome aboard! Here is how to get started with us.\n\n— The team",
    bodyAr: "مرحباً،\n\nأهلاً بك معنا! إليك كيف تبدأ خطواتك معنا.\n\n— الفريق",
  },
];

export const campaignStatusLabels = {
  draft: ["Draft", "مسودة"],
  scheduled: ["Scheduled", "مجدولة"],
};

export function templateBodyFor(templateId, language = "en") {
  const template = campaignTemplates.find((item) => item.id === templateId);
  if (!template) return "";
  return language === "ar" ? template.bodyAr : template.bodyEn;
}

export function createCampaignDraft(templateId = null) {
  const template = campaignTemplates.find((item) => item.id === templateId) || null;
  return {
    id: null,
    templateId: template ? template.id : null,
    name: "",
    subject: "",
    previewText: "",
    senderName: "",
    senderEmail: "",
    replyTo: "",
    content: template ? template.bodyEn : "",
    contentAr: template ? template.bodyAr : "",
    recipients: { type: "all-contacts", segmentIds: [], labelIds: [] },
    schedule: { mode: "now", date: "", time: "" },
    status: "draft",
  };
}