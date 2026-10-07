import { isCompanyAdmin } from "./roles.js";
import { moduleAllowsPage } from "./moduleRegistry.js";

export const CUSTOM_FIELD_TYPES = [
  "text", "textarea", "number", "date", "datetime", "boolean", "select", "multi_select",
  "url", "email", "phone", "image_url", "file_url",
];

const KEY_PATTERN = /^[a-z][a-z0-9_]{1,49}$/;
export const CUSTOM_MODULE_PAGE_PREFIX = "admin-custom-module:";
export const CUSTOM_MODULE_PAGE = "admin-custom-module";
export const CUSTOM_MODULE_PATH_PREFIX = "/admin/custom-modules/";

/** API /admin/custom-modules is gated by settings.unit_creator (admin-unit-creator). */
export function isCustomModulesCapabilityEnabled(modules = []) {
  return moduleAllowsPage(modules, "admin-unit-creator");
}

export function isCustomModulePage(page) {
  return page === CUSTOM_MODULE_PAGE || String(page || "").startsWith(CUSTOM_MODULE_PAGE_PREFIX);
}

export function customModulePageKey(moduleKey) {
  return `${CUSTOM_MODULE_PAGE_PREFIX}${String(moduleKey || "").trim()}`;
}

export function customModulePath(moduleKey) {
  return `${CUSTOM_MODULE_PATH_PREFIX}${encodeURIComponent(String(moduleKey || "").trim())}`;
}

export function parseCustomModuleKeyFromPage(page) {
  if (!String(page || "").startsWith(CUSTOM_MODULE_PAGE_PREFIX)) return "";
  return String(page).slice(CUSTOM_MODULE_PAGE_PREFIX.length);
}

export function parseCustomModuleKeyFromPath(pathname) {
  const match = String(pathname || "").match(/^\/admin\/custom-modules\/([^/]+)$/);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function isCustomModulePath(pathname) {
  return Boolean(parseCustomModuleKeyFromPath(pathname));
}

export function moduleDisplayLabel(module) {
  return String(module?.label || module?.key || "").trim();
}

export function isEnabledCustomModule(module) {
  return Boolean(module) && module.enabled !== false;
}

export function navVisibleCustomModules(modules, user) {
  return (Array.isArray(modules) ? modules : [])
    .filter((module) => isEnabledCustomModule(module) && canViewCustomModule(user, module))
    .sort((a, b) => Number(a.sidebarOrder || 0) - Number(b.sidebarOrder || 0)
      || moduleDisplayLabel(a).localeCompare(moduleDisplayLabel(b)));
}

export function customModuleNavItems(modules, user) {
  return navVisibleCustomModules(modules, user).map((module) => {
    const title = moduleDisplayLabel(module);
    return {
      id: `custom-module-${module.key}`,
      pageKey: customModulePageKey(module.key),
      path: customModulePath(module.key),
      label: { en: title, ar: title },
      icon: module.icon || "folder",
      existing: true,
    };
  });
}

export function isSupportedCustomFieldType(type) {
  return CUSTOM_FIELD_TYPES.includes(type);
}

export function customModuleWorkspaceCopy(language = "en") {
  const ar = language === "ar";
  return ar ? {
    loading: "جاري تحميل الوحدة…",
    loadFailed: "تعذر تحميل الوحدة.",
    notFound: "هذه الوحدة غير موجودة.",
    unavailable: "هذه الوحدة غير متاحة.",
    forbidden: "ليست لديك صلاحية عرض هذه الوحدة.",
    retry: "إعادة المحاولة",
    openWorkspace: "فتح مساحة العمل",
  } : {
    loading: "Loading module…",
    loadFailed: "Unable to load this module.",
    notFound: "This module was not found.",
    unavailable: "This module is not available.",
    forbidden: "You do not have permission to view this module.",
    retry: "Retry",
    openWorkspace: "Open workspace",
  };
}

export function unitCreatorCopy(language = "en") {
  const ar = language === "ar";
  return ar ? {
    title: "منشئ الوحدات",
    subtitle: "أنشئ وحدات إدارية مخصصة وسجّل بياناتها لهذا الموقع.",
    loading: "جاري تحميل الوحدات…",
    forbidden: "ليست لديك صلاحية عرض منشئ الوحدات.",
    loadFailed: "تعذر تحميل الوحدات المخصصة.",
    saveFailed: "تعذر حفظ الوحدة.",
    entrySaveFailed: "تعذر حفظ السجل.",
    saved: "تم حفظ الوحدة.",
    entrySaved: "تم حفظ السجل.",
    entryDeleted: "تم حذف السجل.",
    moduleDisabled: "تم تعطيل الوحدة.",
    retry: "إعادة المحاولة",
    readOnly: "وضع العرض فقط — ليست لديك صلاحية إدارة هذه الوحدة.",
    builderReadOnly: "فقط مسؤول الشركة يمكنه إنشاء أو تعديل تعريفات الوحدات.",
    modules: "الوحدات",
    entries: "السجلات",
    addModule: "وحدة جديدة",
    editModule: "تعديل الوحدة",
    disableModule: "تعطيل",
    addEntry: "سجل جديد",
    editEntry: "تعديل السجل",
    deleteEntry: "حذف",
    save: "حفظ",
    cancel: "إلغاء",
    emptyModules: "لا توجد وحدات مخصصة بعد.",
    emptyModulesHint: "أنشئ وحدة لتعريف حقول وسجلات مخصصة.",
    emptyEntries: "لا توجد سجلات في هذه الوحدة.",
    emptyEntriesHint: "أضف أول سجل باستخدام الحقول المعرفة.",
    noModuleSelected: "اختر وحدة لعرض سجلاتها.",
    searchEntries: "ابحث في السجلات",
    key: "المفتاح",
    label: "التسمية",
    description: "الوصف",
    icon: "الأيقونة",
    enabled: "مفعّلة",
    disabled: "معطّلة",
    sidebarOrder: "ترتيب الشريط",
    fields: "الحقول",
    addField: "إضافة حقل",
    editField: "تعديل الحقل",
    removeField: "إزالة",
    fieldKey: "مفتاح الحقل",
    fieldLabel: "تسمية الحقل",
    fieldType: "النوع",
    required: "إلزامي",
    placeholder: "نص توضيحي",
    showInList: "يظهر في القائمة",
    options: "الخيارات",
    optionsHint: "سطر لكل خيار: value|Label",
    confirmDisable: "تعطيل هذه الوحدة؟ لن تظهر للمستخدمين.",
    confirmDeleteEntry: "حذف هذا السجل؟",
    validationTitle: "تحقق قبل الحفظ:",
    updated: "آخر تحديث",
    actions: "الإجراءات",
    all: "الكل",
  } : {
    title: "Unit creator",
    subtitle: "Build tenant custom admin modules and manage their records.",
    loading: "Loading custom modules…",
    forbidden: "You do not have permission to view the unit creator.",
    loadFailed: "Unable to load custom modules.",
    saveFailed: "Unable to save module.",
    entrySaveFailed: "Unable to save entry.",
    saved: "Module saved.",
    entrySaved: "Entry saved.",
    entryDeleted: "Entry deleted.",
    moduleDisabled: "Module disabled.",
    retry: "Retry",
    readOnly: "View only — you do not have permission to manage this module.",
    builderReadOnly: "Only company admins can create or edit module definitions.",
    modules: "Modules",
    entries: "Entries",
    addModule: "New module",
    editModule: "Edit module",
    disableModule: "Disable",
    addEntry: "New entry",
    editEntry: "Edit entry",
    deleteEntry: "Delete",
    save: "Save",
    cancel: "Cancel",
    emptyModules: "No custom modules yet.",
    emptyModulesHint: "Create a module to define custom fields and records.",
    emptyEntries: "No entries in this module yet.",
    emptyEntriesHint: "Add the first entry using the defined fields.",
    noModuleSelected: "Select a module to view its entries.",
    searchEntries: "Search entries",
    key: "Key",
    label: "Label",
    description: "Description",
    icon: "Icon",
    enabled: "Enabled",
    disabled: "Disabled",
    sidebarOrder: "Sidebar order",
    fields: "Fields",
    addField: "Add field",
    editField: "Edit field",
    removeField: "Remove",
    fieldKey: "Field key",
    fieldLabel: "Field label",
    fieldType: "Type",
    required: "Required",
    placeholder: "Placeholder",
    showInList: "Show in list",
    options: "Options",
    optionsHint: "One option per line: value|Label",
    confirmDisable: "Disable this module? It will be hidden from users.",
    confirmDeleteEntry: "Delete this entry?",
    validationTitle: "Fix these issues before saving:",
    updated: "Updated",
    actions: "Actions",
    all: "All",
  };
}

export function canBuildCustomModules(user) {
  const role = user?.role;
  if (isCompanyAdmin(role)) return true;
  if (role === "super_admin") return user?.isCompanyScope === true && Boolean(user?.activeCompany);
  return false;
}

export function canViewCustomModule(user, module) {
  if (!module) return false;
  if (canBuildCustomModules(user)) return true;
  const permissions = new Set(user?.permissions || []);
  return module.permissions?.view?.some((item) => permissions.has(item))
    || module.permissions?.manage?.some((item) => permissions.has(item));
}

export function canManageCustomModuleEntries(user, module) {
  if (!module) return false;
  if (canBuildCustomModules(user)) return true;
  const permissions = new Set(user?.permissions || []);
  return module.permissions?.manage?.some((item) => permissions.has(item));
}

export function emptyModuleDraft() {
  return {
    key: "",
    label: "",
    description: "",
    icon: "folder",
    sidebarOrder: 100,
    enabled: true,
    fieldsSchema: [],
    listConfig: { pageSize: 25 },
    formConfig: { submitLabel: "Save" },
  };
}

export function emptyFieldDraft() {
  return {
    key: "",
    label: "",
    type: "text",
    required: false,
    placeholder: "",
    options: [],
    showInList: true,
    order: 0,
  };
}

export function optionsToText(options = []) {
  return (Array.isArray(options) ? options : []).map((option) => {
    const value = option?.value ?? "";
    const label = option?.label ?? value;
    return `${value}|${label}`;
  }).join("\n");
}

export function textToOptions(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [value = "", label = ""] = line.split("|").map((part) => part.trim());
      if (!value) throw new Error(`Option ${index + 1} is missing a value.`);
      return { value, label: label || value };
    });
}

export function validateModuleDraft(module) {
  const errors = [];
  if (!module?.key || !KEY_PATTERN.test(module.key)) errors.push("Module key is invalid.");
  if (!String(module?.label || "").trim()) errors.push("Module label is required.");
  const fields = Array.isArray(module?.fieldsSchema) ? module.fieldsSchema : [];
  if (!fields.length) errors.push("At least one field is required.");
  const seen = new Set();
  fields.forEach((field, index) => {
    if (!field?.key || !KEY_PATTERN.test(field.key)) errors.push(`Field ${index + 1}: invalid key.`);
    if (!String(field?.label || "").trim()) errors.push(`Field ${index + 1}: label is required.`);
    if (["select", "multi_select"].includes(field?.type) && !(Array.isArray(field.options) && field.options.length)) {
      errors.push(`Field ${field.key || index + 1}: select fields need options.`);
    }
    if (field?.key) {
      if (seen.has(field.key)) errors.push(`Duplicate field key: ${field.key}.`);
      seen.add(field.key);
    }
  });
  return { valid: errors.length === 0, errors };
}

export function validateEntryDraft(data, fieldsSchema = []) {
  const errors = [];
  fieldsSchema.forEach((field) => {
    const value = data?.[field.key];
    if (field.required && (value == null || value === "" || (Array.isArray(value) && !value.length))) {
      errors.push(`${field.label} is required.`);
    }
  });
  return { valid: errors.length === 0, errors };
}

export function listColumnsForModule(module) {
  return (module?.fieldsSchema || [])
    .filter((field) => field.showInList !== false)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

export function displayEntryValue(field, value) {
  if (value == null || value === "") return "—";
  if (field.type === "boolean") return value ? "Yes" : "No";
  if (field.type === "multi_select") return Array.isArray(value) ? value.join(", ") : String(value);
  return String(value);
}

export function filterEntries(entries, query, module) {
  const hay = query.trim().toLowerCase();
  const columns = listColumnsForModule(module);
  return (Array.isArray(entries) ? entries : []).filter((entry) => {
    if (!hay) return true;
    const text = columns.map((field) => displayEntryValue(field, entry.data?.[field.key])).join(" ").toLowerCase();
    return text.includes(hay) || String(entry.id || "").toLowerCase().includes(hay);
  });
}

export function entryDraftFromEntry(entry, fieldsSchema = []) {
  const draft = {};
  fieldsSchema.forEach((field) => {
    const value = entry?.data?.[field.key];
    if (field.type === "boolean") draft[field.key] = value === true;
    else if (field.type === "multi_select") draft[field.key] = Array.isArray(value) ? value : [];
    else draft[field.key] = value ?? (field.type === "number" ? "" : "");
  });
  return draft;
}

export function emptyEntryDraft(fieldsSchema = []) {
  return entryDraftFromEntry({ data: {} }, fieldsSchema);
}
