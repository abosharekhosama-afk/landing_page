const placeholderImage = "/images/products/product-placeholder.svg";

// Storefront catalog for EB Chemical products.
const cleaningSizes = [
  { size: "500ml", price: 18 },
  { size: "5L", price: 55 },
  { size: "18L", price: 145 },
];

const bulkCleaningSizes = [
  { size: "5L", price: 55 },
  { size: "18L", price: 145 },
];

const fragranceSizes = [{ size: "500ml", price: 22 }];

const radiatorSizes = [
  { size: "1L", price: 15 },
  { size: "4L", price: 40 },
];

function localized(en, ar) {
  return { en, ar };
}

function createProduct({
  id,
  slug,
  name,
  categoryId,
  shortDescription,
  longDescription,
  sizes,
  badge = localized("Featured", "منتج مميز"),
  image,
  hoverImage,
  features,
  servings,
  usageNotes,
  ...detailFields
}) {
  return {
    id,
    slug,
    name,
    categoryId,
    shortDescription,
    longDescription,
    image: image || `/images/products/${slug}.svg`,
    hoverImage,
    fallbackImage: placeholderImage,
    sizes,
    badge,
    features,
    servings,
    usageNotes,
    ...detailFields,
  };
}

export const products = [
  createProduct({
    id: "hc-fabric-cleaner",
    slug: "fabric-cleaner",
    name: localized("Fabric Cleaner", "منظف الأقمشة"),
    categoryId: "home-cleaning",
    shortDescription: localized(
      "A practical cleaner for sofas, chairs, and daily fabric care.",
      "منظف عملي للكنب والكراسي والعناية اليومية بالأقمشة."
    ),
    longDescription: localized(
      "A fabric cleaner designed to refresh upholstered furniture and textile surfaces with a simple, easy-to-use routine.",
      "منظف أقمشة مصمم لإنعاش الأثاث المنجد والأسطح النسيجية بطريقة سهلة الاستخدام."
    ),
    sizes: cleaningSizes,
    badge: localized("Best Seller", "الأكثر طلباً"),
    usageNotes: localized(
      "Test on a hidden area first. Apply lightly and wipe with a clean cloth.",
      "جرّبه أولاً على منطقة مخفية. استخدم كمية خفيفة وامسح بقطعة قماش نظيفة."
    ),
  }),
  createProduct({
    id: "hc-carpet-rug-cleaner",
    slug: "carpet-rug-cleaner",
    name: localized("Carpet & Rug Cleaner", "منظف السجاد والموكيت"),
    categoryId: "home-cleaning",
    shortDescription: localized(
      "Freshens carpets and rugs while helping lift everyday dirt.",
      "ينعش السجاد والموكيت ويساعد على إزالة الأوساخ اليومية."
    ),
    longDescription: localized(
      "A carpet and rug cleaner for regular home maintenance, spot cleaning, and keeping high-traffic areas feeling refreshed.",
      "منظف سجاد وموكيت للعناية المنزلية الدورية والتنظيف الموضعي وإنعاش المناطق كثيرة الاستخدام."
    ),
    sizes: cleaningSizes,
    usageNotes: localized(
      "Vacuum before use. Avoid over-wetting delicate rugs.",
      "نظف بالمكنسة قبل الاستخدام وتجنب تبليل السجاد الحساس بكثرة."
    ),
  }),
  createProduct({
    id: "hc-leather-plastic-cleaner",
    slug: "leather-plastic-cleaner",
    name: localized("Leather & Plastic Cleaner", "منظف الجلد والبلاستيك"),
    categoryId: "home-cleaning",
    shortDescription: localized(
      "A gentle cleaner for leather-look and plastic surfaces.",
      "منظف لطيف للأسطح الجلدية والبلاستيكية."
    ),
    longDescription: localized(
      "A versatile cleaner for furniture, dashboards, handles, and washable plastic surfaces where a neat finish matters.",
      "منظف متعدد الاستخدام للأثاث ولوحات السيارة والمقابض والأسطح البلاستيكية القابلة للغسل."
    ),
    sizes: cleaningSizes,
    badge: localized("Multi-use", "متعدد الاستخدام"),
    usageNotes: localized(
      "Apply with a soft cloth and avoid unfinished leather.",
      "استخدمه بقطعة قماش ناعمة وتجنب الجلد غير المعالج."
    ),
  }),
  createProduct({
    id: "hc-vacuum-cleaner-solution",
    slug: "vacuum-cleaner-solution",
    name: localized("Vacuum Cleaner Solution", "منظف خاص للمكانس"),
    categoryId: "home-cleaning",
    shortDescription: localized(
      "A practical solution for compatible wet vacuum cleaning routines.",
      "محلول عملي مناسب لروتين التنظيف بالمكانس المائية المتوافقة."
    ),
    longDescription: localized(
      "Made for wet-cleaning workflows, this product supports practical cleaning for floors, rugs, and upholstery when used with compatible machines.",
      "منتج عملي لعمليات التنظيف الرطب، يساعد في تنظيف الأرضيات والسجاد والمفروشات عند استخدامه مع الأجهزة المتوافقة."
    ),
    sizes: cleaningSizes,
    usageNotes: localized(
      "Use only with compatible machines and follow equipment instructions.",
      "استخدمه فقط مع الأجهزة المتوافقة واتبع تعليمات الجهاز."
    ),
  }),
  createProduct({
    id: "hc-stone-marble-floor-cleaner",
    slug: "stone-marble-floor-cleaner",
    name: localized(
      "Stone & Marble Floor Cleaner",
      "منظف الأرضيات الحجر والرخام"
    ),
    categoryId: "home-cleaning",
    shortDescription: localized(
      "A clean-care formula for stone and marble flooring.",
      "تركيبة عملية للعناية بأرضيات الحجر والرخام."
    ),
    longDescription: localized(
      "A floor cleaner intended for polished stone and marble-style surfaces that need a clean, practical finish.",
      "منظف أرضيات للأسطح الحجرية والرخامية المصقولة التي تحتاج إلى لمسة نظيفة وعملية."
    ),
    sizes: cleaningSizes,
    badge: localized("Floor Care", "عناية بالأرضيات"),
    usageNotes: localized(
      "Dilute as needed and avoid acidic cleaners on marble.",
      "خففه حسب الحاجة وتجنب استخدام المنظفات الحمضية على الرخام."
    ),
  }),
  createProduct({
    id: "hc-porcelain-ceramic-floor-cleaner",
    slug: "porcelain-ceramic-floor-cleaner",
    name: localized(
      "Porcelain & Ceramic Floor Cleaner",
      "منظف البورسلان والكراميكا"
    ),
    categoryId: "home-cleaning",
    shortDescription: localized(
      "Everyday floor cleaner for porcelain and ceramic tiles.",
      "منظف يومي لأرضيات البورسلان والكراميكا."
    ),
    longDescription: localized(
      "A tile-floor cleaner for homes, offices, and busy spaces where reliable daily cleaning is needed.",
      "منظف للبلاط في المنازل والمكاتب والأماكن كثيرة الحركة التي تحتاج تنظيفاً يومياً موثوقاً."
    ),
    sizes: cleaningSizes,
    usageNotes: localized(
      "Sweep first, then mop with a diluted solution for best results.",
      "اكنس الأرضية أولاً ثم امسح بمحلول مخفف لأفضل نتيجة."
    ),
  }),
  createProduct({
    id: "hc-limescale-remover",
    slug: "limescale-remover",
    name: localized("Limescale Remover", "مزيل التكلسات"),
    categoryId: "bathroom-cleaning",
    shortDescription: localized(
      "Fast-acting limescale remover designed to remove buildup from taps, sinks, showers, and bathroom surfaces while leaving a shiny, clean finish with no residue.",
      "مزيل تكلسات سريع المفعول يساعد على إزالة الترسبات من الحنفيات والمغاسل والدش وأسطح الحمام، ويترك لمعانًا ونظافة بدون بقايا."
    ),
    longDescription: localized(
      "A bathroom cleaning formula for taps, sinks, showers, tiles, and washable surfaces that need fast limescale removal and a clean shine.",
      "تركيبة تنظيف للحمام مناسبة للحنفيات والمغاسل والدش والبلاط والأسطح القابلة للغسل التي تحتاج إلى إزالة سريعة للتكلسات ولمعان نظيف."
    ),
    sizes: [{ size: "1 Liter", price: 25 }],
    image: "/products/limescale-remover-main.jpg",
    hoverImage: "/products/limescale-remover-hover.jpg",
    badge: localized("Bathroom Cleaning", "منظفات الحمام"),
    servings: localized("20 Servings", "20 استخدام"),
    features: localized(
      [
        "Removes Limescale",
        "Shiny & Clean",
        "Fast Acting",
        "Safe on Surfaces",
        "No Residue",
      ],
      [
        "يزيل التكلسات",
        "لمعان ونظافة",
        "سريع المفعول",
        "آمن على الأسطح",
        "بدون بقايا",
      ]
    ),
    usageNotes: localized(
      "Apply to the affected surface, let it work briefly, then wipe and rinse well. Avoid marble and acid-sensitive surfaces.",
      "ضعه على السطح المتأثر، اتركه قليلًا ليعمل، ثم امسح واشطف جيدًا. تجنب استخدامه على الرخام والأسطح الحساسة للأحماض."
    ),
    galleryImages: [
      "/products/limescale-remover-hover.jpg",
      "/products/limescale-remover-main.jpg",
      "/images/products/limescale-remover.svg",
    ],
    detailOptions: {
      productTypes: [
        {
          id: "starter",
          label: localized("Starter Kit", "العبوة الأساسية"),
          image: "/products/limescale-remover-main.jpg",
        },
        {
          id: "refill",
          label: localized("Refill only", "إعادة التعبئة فقط"),
          image: "/products/limescale-remover-hover.jpg",
        },
      ],
      uses: [
        { id: "bathroom", label: localized("Bathroom", "الحمام") },
        { id: "kitchen", label: localized("Kitchen", "المطبخ") },
        { id: "multi-use", label: localized("Multi-use", "متعدد الاستخدام") },
      ],
    },
    reviews: [
      {
        rating: 5,
        title: localized("Excellent result", "نتيجة ممتازة"),
        text: localized(
          "It removed limescale quickly and left the sink shiny with no strong residue.",
          "أزال التكلسات بسرعة وترك المغسلة لامعة بدون بقايا مزعجة."
        ),
        customerName: localized("Maha A.", "مها أ."),
      },
      {
        rating: 5,
        title: localized("Very effective", "فعال جدًا"),
        text: localized(
          "Worked well on taps and shower glass. The surface looked cleaner after one use.",
          "عمل بشكل ممتاز على الحنفيات وزجاج الدش، وظهرت النتيجة من أول استخدام."
        ),
        customerName: localized("Khaled S.", "خالد س."),
      },
      {
        rating: 5,
        title: localized("Easy to use", "سهل الاستخدام"),
        text: localized(
          "Simple application and fast results. Good for bathroom cleaning.",
          "طريقة استخدامه بسيطة ونتيجته سريعة، مناسب لتنظيف الحمام."
        ),
        customerName: localized("Rana M.", "رنا م."),
      },
    ],
    usageSteps: [
      {
        title: localized("Apply to the affected area", "ضع المنتج على المنطقة المتكلسة"),
        image: "/products/limescale-remover-hover.jpg",
      },
      {
        title: localized("Leave for a short time, then scrub", "اتركه قليلًا ثم افرك السطح"),
        image: "/products/limescale-remover-main.jpg",
      },
      {
        title: localized("Rinse well and enjoy a clean shine", "اشطف جيدًا واستمتع بلمعان نظيف"),
        image: "/images/products/limescale-remover.svg",
      },
    ],
    safeSurfaces: [
      {
        id: "glass",
        label: localized("Glass", "الزجاج"),
        tags: localized(
          ["Shower Glass", "Mirrors", "Glass Doors", "Bathroom Panels", "Windows"],
          ["زجاج الدش", "المرايا", "الأبواب الزجاجية", "ألواح الحمام", "النوافذ"]
        ),
      },
      {
        id: "metal",
        label: localized("Metal", "المعادن"),
        tags: localized(
          ["Chrome", "Stainless Steel", "Aluminium", "Brass", "Nickel", "Taps", "Shower Heads"],
          ["الكروم", "الستانلس ستيل", "الألمنيوم", "النحاس", "النيكل", "الحنفيات", "رؤوس الدش"]
        ),
      },
      {
        id: "tiles",
        label: localized("Tiles", "البلاط"),
        tags: localized(
          ["Ceramic Tiles", "Porcelain Tiles", "Bathroom Tiles", "Kitchen Tiles", "Wall Tiles", "Floor Tiles"],
          ["بلاط السيراميك", "بلاط البورسلان", "بلاط الحمام", "بلاط المطبخ", "بلاط الجدران", "بلاط الأرضيات"]
        ),
      },
      {
        id: "stone",
        label: localized("Stone", "الحجر"),
        note: localized(
          "Always test on a small hidden area first and follow the product instructions.",
          "جرّبه دائمًا على منطقة صغيرة غير ظاهرة أولًا واتبع تعليمات المنتج."
        ),
        tags: localized(
          ["Marble", "Granite", "Natural Stone", "Countertops"],
          ["الرخام", "الجرانيت", "الحجر الطبيعي", "أسطح العمل"]
        ),
      },
      {
        id: "bathroom",
        label: localized("Bathroom surfaces", "أسطح الحمام"),
        tags: localized(
          ["Sinks", "Showers", "Taps", "Bathroom Panels", "Washable Surfaces"],
          ["المغاسل", "الدش", "الحنفيات", "ألواح الحمام", "الأسطح القابلة للغسل"]
        ),
      },
    ],
    statements: localized(
      [
        "Fast-acting cleaning power that removes buildup and leaves surfaces shining clean.",
        "Purposeful formula designed for effective cleaning and everyday ease of use.",
        "A practical cleaning solution for fresh bathrooms, clear glass, and polished taps.",
      ],
      [
        "قوة تنظيف سريعة تساعد على إزالة التراكمات وتترك الأسطح نظيفة ولامعة.",
        "تركيبة عملية مصممة لتنظيف فعّال وسهولة استخدام يومية.",
        "حل تنظيف مناسب للحمامات النظيفة والزجاج الواضح والحنفيات اللامعة.",
      ]
    ),
    faq: [
      {
        question: localized(
          "Can I use Limescale Remover on taps and sinks?",
          "هل يمكن استخدام مزيل التكلسات على الحنفيات والمغاسل؟"
        ),
        answer: localized(
          "Yes, it is designed to remove limescale buildup from taps, sinks, showers, and similar bathroom surfaces. Always test on a small hidden area first.",
          "نعم، تم تصميمه لإزالة التكلسات من الحنفيات والمغاسل والدش والأسطح المشابهة في الحمام. يفضل دائمًا تجربته أولًا على منطقة صغيرة غير ظاهرة."
        ),
      },
      {
        question: localized("Is it safe on all surfaces?", "هل هو آمن على جميع الأسطح؟"),
        answer: localized(
          "It is suitable for many bathroom surfaces, but avoid using it on sensitive natural stone or delicate surfaces unless confirmed safe by the manufacturer.",
          "يناسب العديد من أسطح الحمام، لكن يُفضل تجنب استخدامه على الحجر الطبيعي الحساس أو الأسطح الدقيقة إلا إذا كان الاستخدام آمنًا حسب تعليمات الشركة."
        ),
      },
      {
        question: localized("How do I use it?", "ما طريقة الاستخدام؟"),
        answer: localized(
          "Apply the product to the affected area, leave it for a short time, scrub or wipe, then rinse well with water.",
          "ضع المنتج على المنطقة المتكلسة، اتركه لفترة قصيرة، ثم افرك أو امسح واشطف جيدًا بالماء."
        ),
      },
    ],
    productInfo: [
      {
        title: localized("Product performance", "أداء المنتج"),
        text: localized(
          "Helps remove limescale buildup and water stains from suitable bathroom surfaces.",
          "يساعد على إزالة التكلسات وبقع الماء من أسطح الحمام المناسبة."
        ),
      },
      {
        title: localized("Usage instructions", "طريقة الاستخدام"),
        text: localized(
          "Apply to the affected area, wait briefly, scrub or wipe, then rinse thoroughly with water.",
          "ضع المنتج على المنطقة المتكلسة، انتظر قليلًا، ثم افرك أو امسح واشطف جيدًا بالماء."
        ),
      },
      {
        title: localized("Safety notes", "ملاحظات السلامة"),
        text: localized(
          "Avoid contact with eyes. Keep out of reach of children. Do not mix with other cleaning products. Test on a small hidden area first.",
          "تجنب ملامسة العينين. يُحفظ بعيدًا عن متناول الأطفال. لا تخلطه مع منظفات أخرى. جرّبه أولًا على منطقة صغيرة غير ظاهرة."
        ),
      },
      {
        title: localized("Packaging", "العبوة"),
        text: localized("1 Liter bottle. 20 servings.", "عبوة 1 لتر. 20 استخدام."),
      },
      {
        title: localized("Storage", "طريقة التخزين"),
        text: localized(
          "Store in a cool, dry place away from direct sunlight.",
          "يُحفظ في مكان بارد وجاف بعيدًا عن أشعة الشمس المباشرة."
        ),
      },
    ],
  }),
  createProduct({
    id: "hc-grease-oil-remover",
    slug: "grease-oil-remover",
    name: localized("Grease & Oil Remover", "مزيل الدهون والشحوم"),
    categoryId: "home-cleaning",
    shortDescription: localized(
      "Bulk-size cleaner for greasy kitchen and workshop areas.",
      "منظف بأحجام كبيرة للمطابخ والورش والمناطق الدهنية."
    ),
    longDescription: localized(
      "A heavy-duty cleaner for areas where oil, grease, and stubborn residue need a more focused cleaning routine.",
      "منظف قوي للمناطق التي تحتاج إزالة الزيوت والدهون والبقايا الصعبة."
    ),
    sizes: bulkCleaningSizes,
    badge: localized("Heavy Duty", "استخدام قوي"),
    usageNotes: localized(
      "Wear gloves and rinse food-contact surfaces after cleaning.",
      "ارتدِ القفازات واشطف الأسطح الملامسة للطعام بعد التنظيف."
    ),
  }),
  createProduct({
    id: "cc-car-wheel-cleaner",
    slug: "car-wheel-cleaner",
    name: localized("Car Wheel Cleaner", "منظف جنطات السيارات"),
    categoryId: "car-care",
    shortDescription: localized(
      "Targets daily road dust and wheel grime.",
      "يستهدف غبار الطريق والأوساخ اليومية على الجنطات."
    ),
    longDescription: localized(
      "A wheel cleaner for refreshing rims and helping remove road film before a full car wash.",
      "منظف جنطات لإنعاش مظهر الجنطات والمساعدة في إزالة غبار الطريق قبل غسل السيارة."
    ),
    sizes: cleaningSizes,
    badge: localized("Best Seller", "الأكثر طلباً"),
    usageNotes: localized(
      "Use on cool wheels and rinse well.",
      "استخدمه على جنطات باردة واشطف جيداً."
    ),
  }),
  createProduct({
    id: "cc-concentrated-wax-car-shampoo",
    slug: "concentrated-wax-car-shampoo",
    name: localized(
      "Concentrated Wax Car Shampoo",
      "شامبو واكس مركز للسيارات"
    ),
    categoryId: "car-care",
    shortDescription: localized(
      "Concentrated car shampoo with a glossy finish.",
      "شامبو سيارات مركز بلمسة لمعان واضحة."
    ),
    longDescription: localized(
      "A wax shampoo for routine car washing, designed to leave a clean look and smooth surface feel.",
      "شامبو واكس لغسل السيارات الدوري، مصمم لترك مظهر نظيف وإحساس ناعم على السطح."
    ),
    sizes: cleaningSizes,
    badge: localized("Gloss Finish", "لمعة نهائية"),
    usageNotes: localized(
      "Dilute before use and wash from top to bottom.",
      "خففه قبل الاستخدام واغسل السيارة من الأعلى إلى الأسفل."
    ),
  }),
  createProduct({
    id: "cc-dream-no-scrub-car-shampoo",
    slug: "dream-no-scrub-car-shampoo",
    name: localized("Dream No-Scrub Car Shampoo", "شامبو دريم بدون فرك"),
    categoryId: "car-care",
    shortDescription: localized(
      "A modern shampoo for fast exterior washing.",
      "شامبو حديث لغسيل خارجي سريع."
    ),
    longDescription: localized(
      "A no-scrub style shampoo for quick washing routines where convenience and clean shine matter.",
      "شامبو بفكرة بدون فرك لروتين غسل سريع يجمع بين السهولة والمظهر اللامع."
    ),
    sizes: cleaningSizes,
    badge: localized("New", "جديد"),
    usageNotes: localized(
      "Rinse loose dirt first before applying shampoo.",
      "اشطف الأوساخ العالقة أولاً قبل وضع الشامبو."
    ),
  }),
  createProduct({
    id: "cc-tire-plastic-polish",
    slug: "tire-plastic-polish",
    name: localized("Tire & Plastic Polish", "ملمع الإطارات والبلاستيك"),
    categoryId: "car-care",
    shortDescription: localized(
      "Adds a refreshed look to tires and exterior plastics.",
      "يمنح الإطارات والبلاستيك الخارجي مظهراً متجدداً."
    ),
    longDescription: localized(
      "A polish for tires, trims, and plastic details that need a darker, cleaner appearance.",
      "ملمع للإطارات والحواف والتفاصيل البلاستيكية التي تحتاج مظهراً أنظف وأغمق."
    ),
    sizes: cleaningSizes,
    usageNotes: localized(
      "Apply evenly and avoid tire tread, pedals, and steering surfaces.",
      "ضعه بالتساوي وتجنب سطح الإطار الملامس للطريق والدواسات والمقود."
    ),
  }),
  createProduct({
    id: "cc-car-interior-cleaner",
    slug: "car-interior-cleaner",
    name: localized("Car Interior Cleaner", "منظف داخلي للسيارات"),
    categoryId: "car-care",
    shortDescription: localized(
      "Cleans dashboards, panels, and washable interior surfaces.",
      "ينظف التابلوه والألواح والأسطح الداخلية القابلة للغسل."
    ),
    longDescription: localized(
      "A practical interior cleaner for regular car-care routines across plastic, vinyl, and compatible surfaces.",
      "منظف داخلي عملي لروتين العناية بالسيارة على البلاستيك والفينيل والأسطح المتوافقة."
    ),
    sizes: cleaningSizes,
    badge: localized("Interior Care", "عناية داخلية"),
    usageNotes: localized(
      "Spray onto cloth first near screens and electronics.",
      "رش على قطعة قماش أولاً عند التنظيف قرب الشاشات والإلكترونيات."
    ),
  }),
  createProduct({
    id: "cc-engine-degreaser",
    slug: "engine-degreaser",
    name: localized("Engine Degreaser", "مزيل دهون المحركات"),
    categoryId: "car-care",
    shortDescription: localized(
      "Bulk degreaser for engine bay cleaning support.",
      "مزيل دهون بأحجام كبيرة لتنظيف منطقة المحرك."
    ),
    longDescription: localized(
      "A stronger car-care product for greasy engine areas, tools, and workshop cleaning routines.",
      "منتج قوي للعناية بالسيارات ومناسب للمناطق الدهنية في المحرك والأدوات وروتين تنظيف الورش."
    ),
    sizes: bulkCleaningSizes,
    badge: localized("Heavy Duty", "استخدام قوي"),
    usageNotes: localized(
      "Use carefully around electrical parts and rinse as directed.",
      "استخدمه بحذر قرب الأجزاء الكهربائية واشطف حسب التعليمات."
    ),
  }),
  createProduct({
    id: "fr-ocean-breeze",
    slug: "ocean-breeze-home-car-fragrance",
    name: localized(
      "Ocean Breeze Home & Car Fragrance",
      "عطر نسيم البحر للمنزل والسيارة"
    ),
    categoryId: "fragrances",
    shortDescription: localized(
      "A clean aquatic scent for rooms and cars.",
      "رائحة بحرية نظيفة للغرف والسيارات."
    ),
    longDescription: localized(
      "A fresh fragrance with a light ocean-inspired profile for everyday spaces.",
      "عطر منعش بطابع بحري خفيف للمساحات اليومية."
    ),
    sizes: fragranceSizes,
    badge: localized("Fresh", "منعش"),
    usageNotes: localized(
      "Spray lightly into open air, away from eyes and polished surfaces.",
      "رش بخفة في الهواء بعيداً عن العينين والأسطح المصقولة."
    ),
  }),
  createProduct({
    id: "fr-lavender",
    slug: "lavender-home-car-fragrance",
    name: localized(
      "Lavender Home & Car Fragrance",
      "عطر اللافندر للمنزل والسيارة"
    ),
    categoryId: "fragrances",
    shortDescription: localized(
      "A soft lavender scent for calm everyday freshness.",
      "رائحة لافندر ناعمة لانتعاش يومي هادئ."
    ),
    longDescription: localized(
      "A fragrance option for bedrooms, cars, and living areas that need a softer feel.",
      "خيار عطر لغرف النوم والسيارات وغرف المعيشة التي تحتاج إحساساً ناعماً."
    ),
    sizes: fragranceSizes,
    usageNotes: localized(
      "Use a few sprays at a time and let the scent settle.",
      "استخدم بضع رشات في كل مرة واترك الرائحة تنتشر."
    ),
  }),
  createProduct({
    id: "fr-vanilla",
    slug: "vanilla-home-car-fragrance",
    name: localized(
      "Vanilla Home & Car Fragrance",
      "عطر الفانيلا للمنزل والسيارة"
    ),
    categoryId: "fragrances",
    shortDescription: localized(
      "A warm vanilla scent for cozy interiors.",
      "رائحة فانيلا دافئة للمساحات المريحة."
    ),
    longDescription: localized(
      "A fragrance with a comforting vanilla profile for home and car use.",
      "عطر بطابع فانيلا مريح للاستخدام في المنزل والسيارة."
    ),
    sizes: fragranceSizes,
    badge: localized("Warm", "دافئ"),
    usageNotes: localized(
      "Avoid spraying directly on fabric from close distance.",
      "تجنب الرش المباشر على الأقمشة من مسافة قريبة."
    ),
  }),
  createProduct({
    id: "fr-musk",
    slug: "musk-home-car-fragrance",
    name: localized("Musk Home & Car Fragrance", "عطر المسك للمنزل والسيارة"),
    categoryId: "fragrances",
    shortDescription: localized(
      "A clean musk scent with a polished everyday feel.",
      "رائحة مسك نظيفة بلمسة يومية أنيقة."
    ),
    longDescription: localized(
      "A musk fragrance made for a simple, long-lasting clean impression.",
      "عطر مسك يمنح انطباعاً نظيفاً وبسيطاً وطويل الأثر."
    ),
    sizes: fragranceSizes,
    usageNotes: localized(
      "Use in ventilated areas and keep away from heat.",
      "استخدمه في أماكن جيدة التهوية واحفظه بعيداً عن الحرارة."
    ),
  }),
  createProduct({
    id: "rw-pink-radiator-water",
    slug: "pink-radiator-water",
    name: localized("Pink Radiator Water", "ماء روديتر زهري"),
    categoryId: "radiator-water",
    shortDescription: localized(
      "Pink radiator water product for daily vehicle care.",
      "ماء روديتر زهري للعناية اليومية بالسيارة."
    ),
    longDescription: localized(
      "A radiator water product in convenient sizes for the EB Chemical catalog.",
      "منتج ماء روديتر بأحجام مناسبة ضمن كتالوج EB Chemical."
    ),
    sizes: radiatorSizes,
    badge: localized("Featured", "منتج مميز"),
    usageNotes: localized(
      "Follow vehicle manufacturer instructions before use.",
      "اتبع تعليمات الشركة المصنعة للسيارة قبل الاستخدام."
    ),
  }),
  createProduct({
    id: "rw-green-radiator-water",
    slug: "green-radiator-water",
    name: localized("Green Radiator Water", "ماء روديتر أخضر"),
    categoryId: "radiator-water",
    shortDescription: localized(
      "Green radiator water product for daily vehicle care.",
      "ماء روديتر أخضر للعناية اليومية بالسيارة."
    ),
    longDescription: localized(
      "Another radiator water option for product browsing, cart, and checkout flows.",
      "خيار آخر من ماء الرديتر لتصفح المنتجات وإتمام الطلب بسهولة."
    ),
    sizes: radiatorSizes,
    badge: localized("Featured", "منتج مميز"),
    usageNotes: localized(
      "Do not mix products unless recommended for the vehicle.",
      "لا تخلط المنتجات إلا إذا كان ذلك موصى به للسيارة."
    ),
  }),
];

// Assign a hoverImage to each product: prefer another product in the same
// category, falling back to the next product overall, so cards can swap images
// on hover without requiring a second asset per product.
products.forEach((product, index) => {
  const sibling =
    products.find(
      (other) => other.categoryId === product.categoryId && other.id !== product.id,
    ) || products[(index + 1) % products.length];
  product.hoverImage = product.hoverImage || sibling?.image || product.image;
});

export { placeholderImage };

