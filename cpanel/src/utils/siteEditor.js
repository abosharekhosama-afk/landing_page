import { documentFingerprint } from "./siteEditorDocument.js";
import {
  applyTextThemePreset, buildTextThemeState, cloneColorTheme, cloneTextThemeStyles,
  colorThemesEqual, createInitialDesignState, findColorField, findCurrentThemePreset,
  findDefaultTheme, findDefaultTextTheme, findTextThemePreset, getColorThemeValue, getPresetColorValue,
  MAX_DESIGN_HISTORY, MAX_TEXT_THEME_HISTORY, normalizeHexColor,
  resetColorThemeToPreset, resetColorThemeValue, resetTypographyStylesToPreset,
  resetTypographyTokenToPreset, resetTypographyValueToPreset, textThemePresetsAvailable,
  textThemeStylesEqual, updateColorThemeValue, updateTypographyValue,
} from "./siteEditorDesign.js";
import {
  blankSectionTemplate,
  insertSectionAtTarget,
  sectionLibraryCategories,
  validSectionInsertPosition,
} from "./siteEditorSectionLibrary.js";

export const siteEditorPath = "/admin/site-editor";

const copy = Object.freeze({
  "tool.add-elements": { en: "Add Elements", ar: "إضافة عناصر" },
  "tool.add-section": { en: "Add Section", ar: "إضافة قسم" },
  "tool.pages-menu": { en: "Pages & Menu", ar: "الصفحات والقائمة" },
  "tool.site-design": { en: "Site Design", ar: "تصميم الموقع" },
  "tool.add-apps": { en: "Add Apps", ar: "إضافة تطبيقات" },
  "tool.my-business": { en: "My Business", ar: "نشاطي التجاري" },
  "tool.media": { en: "Media", ar: "الوسائط" },
  "tool.cms": { en: "CMS", ar: "إدارة المحتوى" },
  "tool.marketing-seo": { en: "Marketing & SEO", ar: "التسويق وتحسين البحث" },
  "tool.ai-tools": { en: "AI Tools", ar: "أدوات الذكاء الاصطناعي" },
  "tool.layers": { en: "Layers", ar: "الطبقات" },
  "pages.title": { en: "Pages & Menu", ar: "الصفحات والقائمة" },
  "pages.description": { en: "Choose a page to edit in the canvas.", ar: "اختر صفحة لتحريرها في اللوحة." },
  "pages.sitePages": { en: "Site pages", ar: "صفحات الموقع" },
  "pages.search": { en: "Search pages", ar: "البحث في الصفحات" },
  "pages.empty": { en: "No editable pages are available for this tenant.", ar: "لا توجد صفحات قابلة للتحرير لهذا المستأجر." },
  "pages.loadError": { en: "Pages could not be loaded from the local editor API.", ar: "تعذر تحميل الصفحات من واجهة المحرر المحلية." },
  "pages.actions": { en: "Page actions", ar: "إجراءات الصفحة" },
  "pages.open": { en: "Open trusted preview", ar: "فتح المعاينة الموثوقة" },
  "pages.closeActions": { en: "Close actions", ar: "إغلاق الإجراءات" },
  "pages.current": { en: "Current page", ar: "الصفحة الحالية" },
  "pages.draft": { en: "Draft", ar: "مسودة" },
  "pages.publishedSource": { en: "Published source", ar: "المصدر المنشور" },
  "connection.title": { en: "Connect your website", ar: "اربط موقعك" },
  "connection.description": { en: "Connect a storefront to start editing its pages. The editor reads pages and sections directly from the site manifest, so anything the storefront publishes appears here automatically.", ar: "اربط متجرًا لبدء تحرير صفحاته. يقرأ المحرر الصفحات والأقسام مباشرة من بيان الموقع، لذا يظهر كل ما ينشره المتجر هنا تلقائيًا." },
  "connection.storefrontBaseUrl": { en: "Storefront URL", ar: "رابط المتجر" },
  "connection.storefrontBaseUrlHint": { en: "The public HTTPS origin of the storefront.", ar: "الأصل العام الآمن HTTPS للمتجر." },
  "connection.siteManifestUrl": { en: "Site manifest URL (optional)", ar: "رابط بيان الموقع (اختياري)" },
  "connection.siteManifestUrlHint": { en: "Defaults to {url}", ar: "الافتراضي هو {url}" },
  "connection.siteId": { en: "Site ID", ar: "معرّف الموقع" },
  "connection.defaultLocale": { en: "Default locale", ar: "اللغة الافتراضية" },
  "connection.supportedLocales": { en: "Supported locales", ar: "اللغات المدعومة" },
  "connection.status": { en: "Connection status", ar: "حالة الاتصال" },
  "connection.lastSync": { en: "Last sync", ar: "آخر مزامنة" },
  "connection.never": { en: "Never", ar: "أبدًا" },
  "connection.connected": { en: "Connected", ar: "متصل" },
  "connection.notConnected": { en: "Not connected", ar: "غير متصل" },
  "connection.error": { en: "Connection error", ar: "خطأ في الاتصال" },
  "connection.validate": { en: "Validate Connection", ar: "تحقق من الاتصال" },
  "connection.connectSync": { en: "Connect and Sync", ar: "اتصل وامسح ضوئيًا" },
  "connection.resync": { en: "Resync Manifest", ar: "أعد مزامنة البيان" },
  "connection.valid": { en: "Connection is valid", ar: "الاتصال سليم" },
  "connection.invalid": { en: "Connection is invalid", ar: "الاتصال غير سليم" },
  "connection.pageCount": { en: "{count} pages", ar: "{count} صفحة" },
  "connection.pending": { en: "Working…", ar: "جارٍ المعالجة…" },
  "editor.loading": { en: "Loading site editor…", ar: "جارٍ تحميل محرر الموقع…" },
  "editor.loadingDetail": { en: "Loading pages and the editable Home document…", ar: "جارٍ تحميل الصفحات ومستند الصفحة الرئيسية…" },
  "editor.unsaved": { en: "Unsaved changes", ar: "تغييرات غير محفوظة" },
  "editor.saving": { en: "Saving…", ar: "جارٍ الحفظ…" },
  "editor.saved": { en: "Saved", ar: "تم الحفظ" },
  "editor.loaded": { en: "Draft loaded", ar: "تم تحميل المسودة" },
  "editor.saveFailed": { en: "Save failed", ar: "فشل الحفظ" },
  "editor.conflict": { en: "Conflict detected", ar: "تم اكتشاف تعارض" },
  "quickEdit.panelTitle": { en: "Quick Edit", ar: "تعديل سريع" },
  "quickEdit.change": { en: "Change", ar: "تغيير" },
  "quickEdit.sectionBackground": { en: "Section background", ar: "خلفية القسم" },
  "quickEdit.backgroundImage": { en: "Background image", ar: "صورة الخلفية" },
  "quickEdit.spacingVertical": { en: "Vertical spacing", ar: "المسافة الرأسية" },
  "quickEdit.spacingHorizontal": { en: "Horizontal spacing", ar: "المسافة الأفقية" },
  "quickEdit.contentAlignment": { en: "Content alignment", ar: "محاذاة المحتوى" },
  "quickEdit.title": { en: "Title", ar: "العنوان" },
  "quickEdit.text": { en: "Text", ar: "النص" },
  "quickEdit.alignment": { en: "Alignment", ar: "المحاذاة" },
  "quickEdit.button": { en: "Button", ar: "الزر" },
  "quickEdit.linkLabel": { en: "Link label", ar: "نص الرابط" },
  "quickEdit.link": { en: "Link", ar: "الرابط" },
  "quickEdit.image": { en: "Image", ar: "الصورة" },
  "quickEdit.alt": { en: "Alt text", ar: "النص البديل" },
  "quickEdit.background": { en: "Background", ar: "الخلفية" },
  "quickEdit.width": { en: "Width", ar: "العرض" },
  "quickEdit.products": { en: "Products", ar: "المنتجات" },
  "quickEdit.categories": { en: "Categories", ar: "الفئات" },
  "quickEdit.list": { en: "List", ar: "القائمة" },
  "quickEdit.element": { en: "Element", ar: "العنصر" },
  "quickEdit.limit": { en: "Limit", ar: "الحد" },
  "quickEdit.order": { en: "Order", ar: "الترتيب" },
  "quickEdit.readOnly": { en: "Read only", ar: "للعرض فقط" },
  "addSection.panelTitle": { en: "Add Section", ar: "إضافة قسم" },
  "addSection.templatesTab": { en: "Templates", ar: "التنسيقات" },
  "addSection.savedSections": { en: "Saved Sections", ar: "الأقسام المحفوظة" },
  "addSection.savedSectionsComingSoon": { en: "Saved sections are coming soon.", ar: "الأقسام المحفوظة ستتوفر قريبًا." },
  "addSection.blankSection": { en: "Blank Section", ar: "قسم فارغ" },
  "addSection.blankSectionHint": { en: "Add an empty editable section.", ar: "أضف قسمًا فارغًا قابلاً للتحرير." },
  "addSection.blankSectionUnavailable": { en: "This website does not provide a blank section layout.", ar: "لا يوفر هذا الموقع تنسيق قسم فارغ." },
  "addSection.noTemplates": { en: "This website does not provide reusable section layouts yet.", ar: "لا يوفر هذا الموقع تنسيقات أقسام قابلة لإعادة الاستخدام بعد." },
  "addSection.requiresConnection": { en: "Reusable section layouts require connecting this storefront's site manifest.", ar: "تتطلب تنسيقات الأقسام القابلة لإعادة الاستخدام ربط بيان موقع هذا المتجر." },
  "addSection.connectWebsite": { en: "Open website connection", ar: "فتح إعداد اتصال الموقع" },
  "addSection.noTemplatesForPage": { en: "No templates are available for this page type.", ar: "لا توجد تنسيقات متاحة لنوع الصفحة هذا." },
  "addSection.loading": { en: "Loading section library…", ar: "جارٍ تحميل مكتبة الأقسام…" },
  "addSection.loadError": { en: "The section library could not be loaded.", ar: "تعذر تحميل مكتبة الأقسام." },
  "addSection.retry": { en: "Retry", ar: "إعادة المحاولة" },
  "addSection.selectTemplate": { en: "Select a template to add it to the page.", ar: "اختر تنسيقًا لإضافته إلى الصفحة." },
  "addSection.insertPosition": { en: "Insert position", ar: "موضع الإدراج" },
  "addSection.insertAfter": { en: "Add after selected section", ar: "إضافة بعد القسم المحدد" },
  "addSection.insertBefore": { en: "Add before selected section", ar: "إضافة قبل القسم المحدد" },
  "addSection.insertEnd": { en: "Add to end of page", ar: "إضافة إلى نهاية الصفحة" },
  "addSection.insert": { en: "Add to page", ar: "إضافة إلى الصفحة" },
  "addSection.insertReadOnly": { en: "You have read-only editor access.", ar: "لديك صلاحية عرض فقط." },
  "addSection.requiresProducts": { en: "Uses products", ar: "يستخدم المنتجات" },
  "addSection.requiresMedia": { en: "Uses media", ar: "يستخدم الوسائط" },
  "addSection.category.welcome": { en: "Welcome", ar: "ترحيب" },
  "addSection.category.about": { en: "About", ar: "من نحن" },
  "addSection.category.team": { en: "Team", ar: "الفريق" },
  "addSection.category.contact": { en: "Contact", ar: "تواصل" },
  "addSection.category.promotion": { en: "Promotion", ar: "عروض" },
  "addSection.category.services": { en: "Services", ar: "الخدمات" },
  "addSection.category.subscribe": { en: "Subscribe", ar: "اشتراك" },
  "addSection.category.testimonials": { en: "Testimonials", ar: "آراء العملاء" },
  "addSection.category.clients": { en: "Clients", ar: "العملاء" },
  "addSection.category.store": { en: "Store", ar: "المتجر" },
  "addSection.category.basic": { en: "Basic", ar: "أساسي" },
  "addSection.category.text": { en: "Text", ar: "نص" },
  "addSection.category.list": { en: "List", ar: "قائمة" },
  "addSection.category.form": { en: "Form", ar: "نموذج" },
});

export function siteEditorText(key, language = "en") {
  const value = copy[key];
  if (!value) return key;
  return language === "ar" ? value.ar : value.en;
}

export const siteEditorTools = Object.freeze([
  { id: "add-elements", icon: "plus", labelKey: "tool.add-elements", accent: "blue" },
  { id: "add-section", icon: "sections", labelKey: "tool.add-section", accent: "violet" },
  { id: "pages-menu", icon: "pages", labelKey: "tool.pages-menu", accent: "green" },
  { id: "site-design", icon: "design", labelKey: "tool.site-design", accent: "amber" },
  { id: "add-apps", icon: "apps", labelKey: "tool.add-apps", accent: "pink" },
  { id: "my-business", icon: "business", labelKey: "tool.my-business", accent: "indigo" },
  { id: "media", icon: "media", labelKey: "tool.media", accent: "orange" },
  { id: "cms", icon: "cms", labelKey: "tool.cms", accent: "teal" },
  { id: "marketing-seo", icon: "marketing", labelKey: "tool.marketing-seo", accent: "slate" },
  { id: "ai-tools", icon: "ai", labelKey: "tool.ai-tools", accent: "aqua" },
  { id: "layers", icon: "layers", labelKey: "tool.layers", accent: "blue" },
]);

export function normalizeSiteEditorPage(page, companyId) {
  if (!page || page.tenantId !== companyId) return null;
  return { ...page, tenantId: companyId, isEditable: page.isEditable === true };
}

export function normalizeSiteEditorLocale(locale) {
  const value = String(locale || "").trim().toLowerCase();
  return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(value) ? value : "";
}

export function resolveSiteEditorLocale({ activeLocale, persistedLocale, defaultLocale, supportedLocales = [], activeIsExplicit = false } = {}) {
  const supported = [...new Set(supportedLocales.map(normalizeSiteEditorLocale).filter(Boolean))];
  const valid = (locale) => {
    const normalized = normalizeSiteEditorLocale(locale);
    return normalized && (!supported.length || supported.includes(normalized)) ? normalized : "";
  };
  return (activeIsExplicit && valid(activeLocale))
    || valid(persistedLocale)
    || valid(defaultLocale)
    || valid(activeLocale)
    || supported[0]
    || "en";
}

export function createSiteEditorState(language = "en") {
  return {
    pages: [], pagesStatus: "idle", pagesError: "", currentPageId: null,
    pageDocuments: {}, documentStatus: "idle", documentError: "",
    selectedNodeId: null, selectedSectionId: null, editingNodeId: null,
    viewportMode: "desktop", activeLocale: normalizeSiteEditorLocale(language) || "en", zoom: "fit",
    isDirty: false, saveStatus: "idle", saveError: "", currentRevision: 0,
    history: { past: [], future: [] }, savedFingerprints: {},
    activePanel: null, activeInspector: null,
    quickEdit: null,
    sectionLibrary: null, sectionLibraryStatus: "idle", sectionLibraryError: "",
    sectionLibraryRequiresConnection: false,
    activeSectionCategory: null, selectedSectionTemplate: null,
    sectionInsertPosition: "after", sectionBusy: false,
    design: createInitialDesignState(),
  };
}

export function currentSiteEditorDocument(state) {
  return state.currentPageId ? state.pageDocuments[state.currentPageId] || null : null;
}

function dirtyFor(state, document) {
  if (!state.currentPageId || !document) return false;
  return documentFingerprint(document) !== state.savedFingerprints[state.currentPageId];
}

function designIsDirty(design, initialThemeId, initialColorTheme) {
  if (!design.available) return false;
  return !(design.currentThemeId === initialThemeId && colorThemesEqual(design.colorTheme, initialColorTheme));
}

export function siteEditorReducer(state, action) {
  switch (action.type) {
    case "toggle-panel": {
      if (state.activePanel === action.panel) {
        return { ...state, activePanel: null };
      }
      if (action.panel === "add-section") {
        return {
          ...state, activePanel: action.panel, activeInspector: null, quickEdit: null,
          editingNodeId: null, design: { ...state.design, activeView: "main" },
        };
      }
      if (action.panel === "pages-menu") {
        return { ...state, activePanel: action.panel, design: { ...state.design, activeView: "main" } };
      }
      if (action.panel === "site-design") {
        return { ...state, activePanel: action.panel, activeInspector: null, quickEdit: null, editingNodeId: null, design: { ...state.design, activeView: "main" } };
      }
      return { ...state, activePanel: action.panel, design: { ...state.design, activeView: "main" } };
    }
    case "close-panel": return { ...state, activePanel: null };
    case "open-site-design": return {
      ...state, activePanel: "site-design", activeInspector: null, quickEdit: null,
      editingNodeId: null, design: { ...state.design, activeView: "main" },
    };
    case "close-site-design": return { ...state, activePanel: state.activePanel === "site-design" ? null : state.activePanel };
    case "design-open-view": return { ...state, design: { ...state.design, activeView: state.design.available && action.view === "themes" ? "themes" : "main" } };
    case "design-open-color-theme": {
      const design = state.design;
      const supportsColors = !!(design.available && design.definition?.capabilities?.colors === true);
      if (!supportsColors) return state;
      return { ...state, design: { ...design, activeView: "colors" } };
    }
    case "design-back": return { ...state, design: { ...state.design, activeView: "main" } };
    case "design-update-color": {
      const design = state.design;
      if (!(design.available && design.definition?.capabilities?.colors === true)) return state;
      const field = findColorField(action.fieldId);
      if (!field) return state;
      const value = normalizeHexColor(action.value);
      if (!value) return state;
      if (getColorThemeValue(design.colorTheme, field.id) === value) return state;
      const nextColorTheme = updateColorThemeValue(design.colorTheme, field.id, value);
      if (!nextColorTheme) return state;
      const currentEntry = { themeId: design.currentThemeId, colorTheme: design.colorTheme ? cloneColorTheme(design.colorTheme) : null };
      const changed = {
        ...design,
        colorTheme: nextColorTheme,
        history: { past: [...design.history.past, currentEntry].slice(-MAX_DESIGN_HISTORY), future: [] },
      };
      return { ...state, design: { ...changed, isDirty: designIsDirty(changed, design.initialThemeId, design.initialColorTheme) } };
    }
    case "design-reset-color": {
      const design = state.design;
      if (!(design.available && design.definition)) return state;
      const field = findColorField(action.fieldId);
      if (!field) return state;
      const presetValue = getPresetColorValue(design.definition, design.currentThemeId, field.id);
      if (presetValue == null) return state;
      if (getColorThemeValue(design.colorTheme, field.id) === presetValue) return state;
      const nextColorTheme = resetColorThemeValue(design.colorTheme, design.definition, design.currentThemeId, field.id);
      if (!nextColorTheme) return state;
      const currentEntry = { themeId: design.currentThemeId, colorTheme: design.colorTheme ? cloneColorTheme(design.colorTheme) : null };
      const changed = {
        ...design,
        colorTheme: nextColorTheme,
        history: { past: [...design.history.past, currentEntry].slice(-MAX_DESIGN_HISTORY), future: [] },
      };
      return { ...state, design: { ...changed, isDirty: designIsDirty(changed, design.initialThemeId, design.initialColorTheme) } };
    }
    case "design-reset-color-theme": {
      const design = state.design;
      if (!(design.available && design.definition)) return state;
      const preset = findCurrentThemePreset(design.definition, design.currentThemeId);
      const presetColorTheme = preset ? resetColorThemeToPreset(design.definition, design.currentThemeId) : null;
      if (!presetColorTheme || colorThemesEqual(design.colorTheme, presetColorTheme)) return state;
      const currentEntry = { themeId: design.currentThemeId, colorTheme: design.colorTheme ? cloneColorTheme(design.colorTheme) : null };
      const changed = {
        ...design,
        colorTheme: presetColorTheme,
        history: { past: [...design.history.past, currentEntry].slice(-MAX_DESIGN_HISTORY), future: [] },
      };
      return { ...state, design: { ...changed, isDirty: designIsDirty(changed, design.initialThemeId, design.initialColorTheme) } };
    }
    case "design-apply-theme": {
      const design = state.design;
      if (!design.available || !design.definition) return state;
      const preset = (design.definition.themePresets || []).find((candidate) => candidate?.themeId === action.themeId);
      if (!preset || preset.themeId === design.currentThemeId) return state;
      const next = cloneColorTheme(preset.colorTheme);
      if (!next) return state;
      const currentEntry = { themeId: design.currentThemeId, colorTheme: design.colorTheme ? cloneColorTheme(design.colorTheme) : null };
      const changed = {
        ...design,
        currentThemeId: preset.themeId,
        colorTheme: next,
        history: { past: [...design.history.past, currentEntry].slice(-30), future: [] },
      };
      return { ...state, design: { ...changed, isDirty: designIsDirty(changed, design.initialThemeId, design.initialColorTheme) } };
    }
    case "design-undo": {
      const design = state.design;
      const previous = design.history.past.at(-1);
      if (!design.available || !previous) return state;
      const currentEntry = { themeId: design.currentThemeId, colorTheme: design.colorTheme ? cloneColorTheme(design.colorTheme) : null };
      const changed = {
        ...design,
        currentThemeId: previous.themeId,
        colorTheme: previous.colorTheme ? cloneColorTheme(previous.colorTheme) : null,
        history: {
          past: design.history.past.slice(0, -1),
          future: [currentEntry, ...design.history.future].slice(-30),
        },
      };
      return { ...state, design: { ...changed, isDirty: designIsDirty(changed, design.initialThemeId, design.initialColorTheme) } };
    }
    case "design-redo": {
      const design = state.design;
      const nextEntry = design.history.future[0];
      if (!design.available || !nextEntry) return state;
      const currentEntry = { themeId: design.currentThemeId, colorTheme: design.colorTheme ? cloneColorTheme(design.colorTheme) : null };
      const changed = {
        ...design,
        currentThemeId: nextEntry.themeId,
        colorTheme: nextEntry.colorTheme ? cloneColorTheme(nextEntry.colorTheme) : null,
        history: {
          past: [...design.history.past, currentEntry].slice(-30),
          future: design.history.future.slice(1),
        },
      };
      return { ...state, design: { ...changed, isDirty: designIsDirty(changed, design.initialThemeId, design.initialColorTheme) } };
    }
    case "design-reset-default": {
      const design = state.design;
      if (!design.available || (design.currentThemeId === design.initialThemeId && colorThemesEqual(design.colorTheme, design.initialColorTheme))) return state;
      const currentEntry = { themeId: design.currentThemeId, colorTheme: design.colorTheme ? cloneColorTheme(design.colorTheme) : null };
      return {
        ...state,
        design: {
          ...design,
          currentThemeId: design.initialThemeId,
          colorTheme: design.initialColorTheme ? cloneColorTheme(design.initialColorTheme) : null,
          history: { past: [...design.history.past, currentEntry].slice(-30), future: [] },
          isDirty: false,
        },
      };
    }
    case "design-reset": return { ...state, design: createInitialDesignState() };
    case "design-initialize": {
      const siteDesign = action.siteDesign && typeof action.siteDesign === "object" ? action.siteDesign : null;
      if (!siteDesign || !Array.isArray(siteDesign.themePresets) || siteDesign.themePresets.length === 0) {
        return { ...state, design: createInitialDesignState() };
      }
      const defaultTheme = findDefaultTheme(siteDesign);
      if (!defaultTheme) return { ...state, design: createInitialDesignState() };
      const colorTheme = cloneColorTheme(defaultTheme.colorTheme);
      const textThemeState = buildTextThemeState(siteDesign);
      return {
        ...state,
        design: {
          available: true,
          definition: siteDesign,
          currentThemeId: defaultTheme.themeId,
          colorTheme,
          initialThemeId: defaultTheme.themeId,
          initialColorTheme: colorTheme ? cloneColorTheme(colorTheme) : null,
          history: { past: [], future: [] },
          isDirty: false,
          activeView: "main",
          currentTextThemeId: textThemeState.currentTextThemeId,
          textThemeStyles: textThemeState.textThemeStyles,
          initialTextThemeId: textThemeState.initialTextThemeId,
          initialTextThemeStyles: textThemeState.initialTextThemeStyles,
          textHistory: textThemeState.textHistory,
        },
      };
    }
    case "design-open-text-theme": {
      const design = state.design;
      if (!design.available || !textThemePresetsAvailable(design.definition)) return state;
      return { ...state, design: { ...design, activeView: "text-themes" } };
    }
    case "design-apply-text-theme": {
      const design = state.design;
      if (!design.available || !design.definition) return state;
      const preset = findTextThemePreset(design.definition, action.textThemeId);
      const applied = applyTextThemePreset(preset);
      if (!applied) return state;
      if (applied.textThemeId === design.currentTextThemeId && textThemeStylesEqual(design.textThemeStyles, applied.textThemeStyles)) return state;
      const currentEntry = { textThemeId: design.currentTextThemeId, textThemeStyles: design.textThemeStyles ? cloneTextThemeStyles(design.textThemeStyles) : null };
      return {
        ...state,
        design: {
          ...design,
          currentTextThemeId: applied.textThemeId,
          textThemeStyles: applied.textThemeStyles,
          textHistory: { past: [...design.textHistory.past, currentEntry].slice(-MAX_TEXT_THEME_HISTORY), future: [] },
        },
      };
    }
    case "design-undo-text-theme": {
      const design = state.design;
      const previous = design.textHistory.past.at(-1);
      if (!design.available || !previous) return state;
      const currentEntry = { textThemeId: design.currentTextThemeId, textThemeStyles: design.textThemeStyles ? cloneTextThemeStyles(design.textThemeStyles) : null };
      return {
        ...state,
        design: {
          ...design,
          currentTextThemeId: previous.textThemeId,
          textThemeStyles: previous.textThemeStyles ? cloneTextThemeStyles(previous.textThemeStyles) : null,
          textHistory: {
            past: design.textHistory.past.slice(0, -1),
            future: [currentEntry, ...design.textHistory.future].slice(-MAX_TEXT_THEME_HISTORY),
          },
        },
      };
    }
    case "design-redo-text-theme": {
      const design = state.design;
      const nextEntry = design.textHistory.future[0];
      if (!design.available || !nextEntry) return state;
      const currentEntry = { textThemeId: design.currentTextThemeId, textThemeStyles: design.textThemeStyles ? cloneTextThemeStyles(design.textThemeStyles) : null };
      return {
        ...state,
        design: {
          ...design,
          currentTextThemeId: nextEntry.textThemeId,
          textThemeStyles: nextEntry.textThemeStyles ? cloneTextThemeStyles(nextEntry.textThemeStyles) : null,
          textHistory: {
            past: [...design.textHistory.past, currentEntry].slice(-MAX_TEXT_THEME_HISTORY),
            future: design.textHistory.future.slice(1),
          },
        },
      };
    }
    case "design-reset-text-theme": {
      const design = state.design;
      if (!design.available || !design.definition || design.definition.capabilities?.typography !== true) return state;
      const defaultPreset = findDefaultTextTheme(design.definition);
      const applied = applyTextThemePreset(defaultPreset);
      if (!applied) return state;
      if (applied.textThemeId === design.currentTextThemeId && textThemeStylesEqual(design.textThemeStyles, applied.textThemeStyles)) return state;
      const currentEntry = { textThemeId: design.currentTextThemeId, textThemeStyles: design.textThemeStyles ? cloneTextThemeStyles(design.textThemeStyles) : null };
      return {
        ...state,
        design: {
          ...design,
          currentTextThemeId: applied.textThemeId,
          textThemeStyles: cloneTextThemeStyles(applied.textThemeStyles),
          textHistory: { past: [...design.textHistory.past, currentEntry].slice(-MAX_TEXT_THEME_HISTORY), future: [] },
        },
      };
    }
    case "design-update-typography-value": {
      const design = state.design;
      if (!design.available || !design.definition) return state;
      const nextStyles = updateTypographyValue(design.textThemeStyles, action.token, action.property, action.value);
      if (!nextStyles || textThemeStylesEqual(nextStyles, design.textThemeStyles)) return state;
      const currentEntry = { textThemeId: design.currentTextThemeId, textThemeStyles: design.textThemeStyles ? cloneTextThemeStyles(design.textThemeStyles) : null };
      return {
        ...state,
        design: {
          ...design,
          textThemeStyles: nextStyles,
          textHistory: { past: [...design.textHistory.past, currentEntry].slice(-MAX_TEXT_THEME_HISTORY), future: [] },
        },
      };
    }
    case "design-reset-typography-value": {
      const design = state.design;
      if (!design.available || !design.definition) return state;
      const nextStyles = resetTypographyValueToPreset(design.definition, design.currentTextThemeId, design.textThemeStyles, action.token, action.property);
      if (!nextStyles || textThemeStylesEqual(nextStyles, design.textThemeStyles)) return state;
      const currentEntry = { textThemeId: design.currentTextThemeId, textThemeStyles: design.textThemeStyles ? cloneTextThemeStyles(design.textThemeStyles) : null };
      return {
        ...state,
        design: {
          ...design,
          textThemeStyles: nextStyles,
          textHistory: { past: [...design.textHistory.past, currentEntry].slice(-MAX_TEXT_THEME_HISTORY), future: [] },
        },
      };
    }
    case "design-reset-typography-token": {
      const design = state.design;
      if (!design.available || !design.definition) return state;
      const nextStyles = resetTypographyTokenToPreset(design.definition, design.currentTextThemeId, design.textThemeStyles, action.token);
      if (!nextStyles || textThemeStylesEqual(nextStyles, design.textThemeStyles)) return state;
      const currentEntry = { textThemeId: design.currentTextThemeId, textThemeStyles: design.textThemeStyles ? cloneTextThemeStyles(design.textThemeStyles) : null };
      return {
        ...state,
        design: {
          ...design,
          textThemeStyles: nextStyles,
          textHistory: { past: [...design.textHistory.past, currentEntry].slice(-MAX_TEXT_THEME_HISTORY), future: [] },
        },
      };
    }
    case "design-reset-typography-customization": {
      const design = state.design;
      if (!design.available || !design.definition) return state;
      const nextStyles = resetTypographyStylesToPreset(design.definition, design.currentTextThemeId);
      if (!nextStyles || textThemeStylesEqual(nextStyles, design.textThemeStyles)) return state;
      const currentEntry = { textThemeId: design.currentTextThemeId, textThemeStyles: design.textThemeStyles ? cloneTextThemeStyles(design.textThemeStyles) : null };
      return {
        ...state,
        design: {
          ...design,
          textThemeStyles: nextStyles,
          textHistory: { past: [...design.textHistory.past, currentEntry].slice(-MAX_TEXT_THEME_HISTORY), future: [] },
        },
      };
    }
    case "pages-loading": return { ...state, pagesStatus: "loading", pagesError: "" };
    case "pages-success": return { ...state, pages: action.pages, pagesStatus: "ready", pagesError: "", currentPageId: action.currentPageId || action.pages[0]?.id || null };
    case "pages-failure": return { ...state, pages: [], pagesStatus: "error", pagesError: action.error || "Unable to load pages." };
    case "select-page": return action.pageId === state.currentPageId ? state : {
      ...state, currentPageId: action.pageId || null, selectedNodeId: null, selectedSectionId: null,
      editingNodeId: null, activeInspector: null, documentStatus: "idle", documentError: "",
      history: { past: [], future: [] }, isDirty: false, saveStatus: "idle", saveError: "",
    };
    case "document-loading": return { ...state, documentStatus: "loading", documentError: "" };
    case "document-success": {
      const document = action.document;
      return {
        ...state, documentStatus: "ready", documentError: "", currentRevision: Number(document.revision || 0),
        pageDocuments: { ...state.pageDocuments, [action.pageId]: document },
        savedFingerprints: { ...state.savedFingerprints, [action.pageId]: documentFingerprint(document) },
        selectedNodeId: null, selectedSectionId: null, editingNodeId: null, activeInspector: null,
        history: { past: [], future: [] }, isDirty: false, saveStatus: "idle", saveError: "",
      };
    }
    case "document-failure": return { ...state, documentStatus: "error", documentError: action.error || "Unable to load page document." };
    case "select-node": {
      const sectionId = action.sectionId || state.selectedSectionId || state.quickEdit;
      const isInspector = action.inspector ? true : false;
      const base = {
        ...state, selectedNodeId: action.nodeId || null, selectedSectionId: sectionId,
        editingNodeId: null, activeInspector: action.inspector || null,
        quickEdit: action.inspector ? null : (state.quickEdit ? sectionId : state.quickEdit),
      };
      return isInspector ? { ...base, activePanel: null, design: { ...state.design, activeView: "main" } } : base;
    }
    case "clear-selection": return { ...state, selectedNodeId: null, selectedSectionId: null, editingNodeId: null, activeInspector: null, quickEdit: null };
    case "set-editing-node": return { ...state, editingNodeId: action.nodeId || null, ...(action.nodeId ? { activePanel: null, design: { ...state.design, activeView: "main" } } : {}) };
    case "open-quick-edit": return { ...state, selectedNodeId: action.sectionId || null, selectedSectionId: action.sectionId || null, editingNodeId: null, activeInspector: null, quickEdit: action.sectionId || null, activePanel: null, design: { ...state.design, activeView: "main" } };
    case "close-quick-edit": return { ...state, quickEdit: null };
    case "set-inspector": return action.inspector ? { ...state, activeInspector: action.inspector, quickEdit: null, activePanel: null, design: { ...state.design, activeView: "main" } } : { ...state, activeInspector: null };
    case "mutate-document": {
      const current = currentSiteEditorDocument(state);
      if (!current || !action.document || documentFingerprint(current) === documentFingerprint(action.document)) return state;
      const past = [...state.history.past, current].slice(-50);
      return {
        ...state, pageDocuments: { ...state.pageDocuments, [state.currentPageId]: action.document },
        history: { past, future: [] }, isDirty: dirtyFor(state, action.document),
        saveStatus: "idle", saveError: "",
      };
    }
    case "undo": {
      const current = currentSiteEditorDocument(state);
      const previous = state.history.past.at(-1);
      if (!current || !previous) return state;
      return {
        ...state, pageDocuments: { ...state.pageDocuments, [state.currentPageId]: previous },
        history: { past: state.history.past.slice(0, -1), future: [current, ...state.history.future].slice(0, 50) },
        isDirty: dirtyFor(state, previous), editingNodeId: null,
      };
    }
    case "redo": {
      const current = currentSiteEditorDocument(state);
      const next = state.history.future[0];
      if (!current || !next) return state;
      return {
        ...state, pageDocuments: { ...state.pageDocuments, [state.currentPageId]: next },
        history: { past: [...state.history.past, current].slice(-50), future: state.history.future.slice(1) },
        isDirty: dirtyFor(state, next), editingNodeId: null,
      };
    }
    case "save-start": return { ...state, saveStatus: "saving", saveError: "" };
    case "save-success": {
      const document = action.document;
      return {
        ...state, pageDocuments: { ...state.pageDocuments, [state.currentPageId]: document },
        savedFingerprints: { ...state.savedFingerprints, [state.currentPageId]: documentFingerprint(document) },
        currentRevision: Number(action.revision ?? document.revision ?? state.currentRevision), isDirty: false,
        saveStatus: "saved", saveError: "", history: { past: [], future: [] },
      };
    }
    case "save-failure": return { ...state, saveStatus: action.conflict ? "conflict" : "error", saveError: action.error || "Save failed.", isDirty: true };
    case "set-locale": {
      const locale = normalizeSiteEditorLocale(action.locale);
      return locale ? { ...state, activeLocale: locale } : state;
    }
    case "set-viewport": return { ...state, viewportMode: action.viewport === "mobile" ? "mobile" : "desktop" };
    case "set-zoom": return { ...state, zoom: ["50", "75", "100", "fit"].includes(action.zoom) ? action.zoom : state.zoom };
    case "open-section-library": return { ...state, activePanel: "add-section", activeInspector: null, quickEdit: null };
    case "close-section-library": return { ...state, activePanel: null };
    case "section-library-loading": return { ...state, sectionLibraryStatus: "loading", sectionLibraryError: "" };
    case "section-library-success": {
      const categories = sectionLibraryCategories(action.sectionLibrary);
      return {
        ...state,
        sectionLibrary: action.sectionLibrary,
        sectionLibraryStatus: "ready",
        sectionLibraryError: "",
        sectionLibraryRequiresConnection: action.requiresConnection === true,
        activeSectionCategory: state.activeSectionCategory || categories[0]?.id || null,
        selectedSectionTemplate: null,
      };
    }
    case "section-library-failure": return { ...state, sectionLibraryStatus: "error", sectionLibraryError: action.error || "Unable to load the section library." };
    case "section-library-retry": return { ...state, sectionLibraryStatus: "idle", sectionLibraryError: "" };
    case "section-library-reset": return { ...state, sectionLibrary: null, sectionLibraryStatus: "idle", sectionLibraryError: "", sectionLibraryRequiresConnection: false, activeSectionCategory: null, selectedSectionTemplate: null };
    case "select-section-category": return { ...state, activeSectionCategory: action.categoryId || null, selectedSectionTemplate: null };
    case "select-section-template": return { ...state, selectedSectionTemplate: action.templateId || null };
    case "set-section-insert-position": return { ...state, sectionInsertPosition: validSectionInsertPosition(action.position) };
    case "insert-section-template": {
      const current = currentSiteEditorDocument(state);
      const section = action.section === null ? blankSectionTemplate(state.sectionLibrary) : action.section;
      if (!current || !section) return state;
      const position = validSectionInsertPosition(state.sectionInsertPosition);
      const targetId = state.selectedSectionId || state.selectedNodeId || null;
      const result = insertSectionAtTarget(current, section, { position, targetSectionId: targetId, locale: state.activeLocale });
      if (!result?.document || !result.sectionId) return state;
      const next = result.document;
      const sectionId = result.sectionId;
      const past = [...state.history.past, current].slice(-50);
      return {
        ...state,
        pageDocuments: { ...state.pageDocuments, [state.currentPageId]: next },
        history: { past, future: [] },
        isDirty: dirtyFor(state, next),
        saveStatus: "idle", saveError: "",
        activePanel: null, activeInspector: null,
        selectedNodeId: sectionId, selectedSectionId: sectionId,
        editingNodeId: null, quickEdit: sectionId,
        selectedSectionTemplate: null,
      };
    }
    case "section-template-success": return { ...state, sectionBusy: false };
    case "section-template-failure": return { ...state, sectionBusy: false, sectionLibraryError: action.error || "Unable to add the section." };
    default: return state;
  }
}

export function siteEditorCapabilities(user, company) {
  if (!user || !company) return { canAccess: false, canEdit: false, canSave: false, canManageConnection: false, canSyncManifest: false };
  const role = user?.role;
  const admin = ["admin", "company_admin"].includes(role) || role === "super_admin";
  const permissions = new Set(user?.permissions || []);
  return {
    canAccess: admin || permissions.has("site_editor.access"),
    canEdit: admin || permissions.has("site_editor.edit"),
    canSave: admin || permissions.has("site_editor.save"),
    canManageConnection: admin || permissions.has("site_editor.connection.manage"),
    canSyncManifest: admin || permissions.has("site_editor.manifest.sync"),
  };
}

export function siteEditorDirection(locale) { return locale === "ar" ? "rtl" : "ltr"; }
export function siteEditorZoomScale(zoom) { return zoom === "50" ? 0.5 : zoom === "75" ? 0.75 : zoom === "100" ? 1 : 0.82; }

export function trustedSitePreview(company) {
  if (!company || typeof company !== "object") return null;
  const configured = company.storefrontUrl || company.settings?.storefrontUrl;
  if (!configured || typeof configured !== "string") return null;
  try {
    const url = new URL(configured.trim());
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch { return null; }
}

export function trustedSiteLabel(company) {
  const previewUrl = trustedSitePreview(company);
  if (!previewUrl) return null;
  const url = new URL(previewUrl);
  return `${url.host}${url.pathname.replace(/\/$/, "")}`;
}

export function trustedPagePreview(company, page) {
  const storefront = trustedSitePreview(company);
  if (!storefront || page?.tenantId !== company.id) return null;
  return storefront;
}
