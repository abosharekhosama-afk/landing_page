// T-003 — Mock automation data for the visual automation builder.
// All automations start "inactive": nothing executes and nothing is connected.

export const automationSuggestions = [
  {
    id: "suggest-order-followup",
    icon: "zap",
    en: "Follow up after a new order",
    ar: "المتابعة بعد طلب جديد",
    textEn: "Template — requires a supported messaging service.",
    textAr: "قالب — يتطلب خدمة مراسلة مدعومة.",
  },
  {
    id: "suggest-welcome",
    icon: "sparkles",
    en: "Welcome a new contact",
    ar: "الترحيب بجهة اتصال جديدة",
    textEn: "Template — no automation is currently active.",
    textAr: "قالب — لا توجد أتمتة نشطة حالياً.",
  },
  {
    id: "suggest-booking",
    icon: "workflow",
    en: "Notify staff about a booking",
    ar: "إشعار الموظفين بالحجز",
    textEn: "Template — booking notifications are not connected.",
    textAr: "قالب — إشعارات الحجز غير متصلة.",
  },
];

export const automationSeeds = [
  {
    id: "auto-welcome",
    nameEn: "Welcome new contacts",
    nameAr: "الترحيب بجهات الاتصال الجديدة",
    triggerEn: "Contact added",
    triggerAr: "إضافة جهة اتصال",
    status: "inactive",
    steps: [
      { kind: "trigger", icon: "zap", titleEn: "Trigger: contact added", titleAr: "المشغّل: إضافة جهة اتصال", descEn: "Starts when a contact joins the audience.", descAr: "يبدأ عند انضمام جهة اتصال إلى الجمهور." },
      { kind: "condition", icon: "branch", titleEn: "Condition: has email address", titleAr: "الشرط: يملك بريدًا إلكترونيًا", descEn: "Continue only for contacts with an email.", descAr: "يكمل فقط لجهات الاتصال التي تملك بريدًا." },
      { kind: "delay", icon: "clock", titleEn: "Delay: 1 day", titleAr: "تأخير: يوم واحد", descEn: "Wait before the next step.", descAr: "انتظار قبل الخطوة التالية." },
      { kind: "action", icon: "send", titleEn: "Action: send welcome email", titleAr: "الإجراء: إرسال بريد ترحيبي", descEn: "Prepared for integration — nothing is sent yet.", descAr: "مُجهّز للربط — لا يتم الإرسال بعد." },
    ],
  },
  {
    id: "auto-order-followup",
    nameEn: "Follow up after an order",
    nameAr: "المتابعة بعد الطلب",
    triggerEn: "Order completed",
    triggerAr: "إتمام الطلب",
    status: "inactive",
    steps: [
      { kind: "trigger", icon: "zap", titleEn: "Trigger: order completed", titleAr: "المشغّل: إتمام الطلب", descEn: "Starts when an order is marked complete.", descAr: "يبدأ عند وسم الطلب كمكتمل." },
      { kind: "delay", icon: "clock", titleEn: "Delay: 3 days", titleAr: "تأخير: 3 أيام", descEn: "Wait before the next step.", descAr: "انتظار قبل الخطوة التالية." },
      { kind: "condition", icon: "branch", titleEn: "Condition: repeat customer?", titleAr: "الشرط: عميل متكرر؟", descEn: "Branch between new and returning buyers.", descAr: "تفرّع بين المشترين الجدد والعائدين." },
      { kind: "action", icon: "send", titleEn: "Action: send review request", titleAr: "الإجراء: إرسال طلب تقييم", descEn: "Prepared for integration — nothing is sent yet.", descAr: "مُجهّز للربط — لا يتم الإرسال بعد." },
    ],
  },
  {
    id: "auto-inactive-recovery",
    nameEn: "Re-engage inactive contacts",
    nameAr: "إعادة تفاعل جهات الاتصال غير النشطة",
    triggerEn: "No activity for 90 days",
    triggerAr: "لا نشاط لمدة 90 يوماً",
    status: "inactive",
    steps: [
      { kind: "trigger", icon: "zap", titleEn: "Trigger: 90 days inactive", titleAr: "المشغّل: 90 يوماً بلا نشاط", descEn: "Starts from the audience schedule.", descAr: "يبدأ من جدول الجمهور." },
      { kind: "condition", icon: "branch", titleEn: "Condition: accepts marketing", titleAr: "الشرط: يقبل التسويق", descEn: "Continue only for subscribed contacts.", descAr: "يكمل فقط لجهات الاتصال المشتركة." },
      { kind: "action", icon: "send", titleEn: "Action: send comeback offer", titleAr: "الإجراء: إرسال عرض العودة", descEn: "Prepared for integration — nothing is sent yet.", descAr: "مُجهّز للربط — لا يتم الإرسال بعد." },
    ],
  },
];