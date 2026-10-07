export const homepageCategoryCards = [
  {
    key: "home",
    image: "/homepage-categories/home-care.jpg",
    label: { en: "Home care", ar: "العناية بالمنزل" },
    title: { en: "Daily cleaning made easier", ar: "تنظيف يومي أسهل" },
  },
  {
    key: "car",
    image: "/homepage-categories/car-care.jpg",
    label: { en: "Car care", ar: "العناية بالسيارة" },
    title: { en: "Fresh finish for every ride", ar: "لمسة نظيفة لكل رحلة" },
  },
  {
    key: "kitchen",
    image: "/homepage-categories/kitchen-new.jpg",
    label: { en: "Kitchen", ar: "المطبخ" },
    title: { en: "Cuts grease with less effort", ar: "إزالة الدهون بجهد أقل" },
  },
  {
    key: "bathroom",
    image: "/homepage-categories/kitchen.jpg",
    label: { en: "Bathroom", ar: "الحمام" },
    title: { en: "Shine for sinks and tiles", ar: "لمعان للأحواض والبلاط" },
  },
  {
    key: "laundry",
    image: "/homepage-categories/laundry.jpg",
    label: { en: "Laundry", ar: "الغسيل" },
    title: { en: "Care for fabrics every day", ar: "عناية يومية بالأقمشة" },
  },
];

export const homepageOffers = [
  {
    id: "offer-home-care",
    title: {
      en: "Daily care essentials",
      ar: "أساسيات العناية اليومية",
    },
    description: {
      en: "Selected cleaning products for your home routine.",
      ar: "منتجات تنظيف مختارة لروتينك المنزلي.",
    },
    image: "/images/products/multi-surface-cleaner.svg",
    ctaText: {
      en: "Shop home care",
      ar: "تسوق العناية المنزلية",
    },
    ctaLink: "products",
    displayOrder: 1,
    isActive: true,
  },
  {
    id: "offer-car-care",
    title: {
      en: "Car care favorites",
      ar: "مختارات العناية بالسيارة",
    },
    description: {
      en: "Fresh and practical sizes for daily car care.",
      ar: "انتعاش وأحجام عملية للعناية اليومية بالسيارة.",
    },
    image: "/images/products/car-shampoo-gloss.svg",
    ctaText: {
      en: "Explore car care",
      ar: "استكشف عناية السيارة",
    },
    ctaLink: "car-care",
    displayOrder: 2,
    isActive: true,
  },
];

export const reviews = [
  {
    id: "review-store-1",
    type: "site",
    rating: 5,
    customerName: "Maya A.",
    comment: {
      en: "Great quality products for everyday use.",
      ar: "منتجات بجودة عالية للاستخدام اليومي.",
    },
    relatedProductName: "Multi-surface cleaner",
    employeeId: "",
    employeeName: "",
    createdAt: "2026-05-01",
    isActive: true,
  },
  {
    id: "review-store-2",
    type: "site",
    rating: 5,
    customerName: "Ahmad S.",
    comment: {
      en: "Excellent car care products with great results.",
      ar: "منتجات عناية السيارة ممتازة بنتائج رائعة.",
    },
    relatedProductName: "Car care",
    employeeId: "",
    employeeName: "",
    createdAt: "2026-05-03",
    isActive: true,
  },
  {
    id: "review-employee-demo",
    type: "employee",
    rating: 5,
    customerName: "Lina K.",
    comment: {
      en: "Helpful service and clear product guidance.",
      ar: "خدمة ممتازة وتوضيح واضح للمنتجات.",
    },
    relatedProductName: "Customer service",
    employeeId: "employee-demo",
    employeeName: "EB Chemical Employee",
    createdAt: "2026-05-04",
    isActive: true,
  },
];
