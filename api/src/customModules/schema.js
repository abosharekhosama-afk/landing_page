export const CUSTOM_FIELD_TYPES = Object.freeze([
  "text",
  "textarea",
  "number",
  "date",
  "datetime",
  "boolean",
  "select",
  "multi_select",
  "url",
  "email",
  "phone",
  "image_url",
  "file_url",
]);

const fieldTypes = new Set(CUSTOM_FIELD_TYPES);
const identifierPattern = /^[a-z][a-z0-9_]{1,49}$/;
const permissionPattern = /^[a-z][a-z0-9_.:-]{1,99}$/;
const forbiddenFieldKeyPattern = /(password|passwd|token|secret|credential|authorization|api_?key|private_?key)/i;
const unsafeTextPattern = /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/;
const MAX_FIELDS = 40;

export function customModuleValidationError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function plainText(value, name, maxLength, { required = false } = {}) {
  const text = String(value ?? "").trim();
  if (required && !text) throw customModuleValidationError(`${name} is required.`);
  if (text.length > maxLength) throw customModuleValidationError(`${name} is too long.`);
  if (unsafeTextPattern.test(text)) throw customModuleValidationError(`${name} contains unsafe characters.`);
  return text;
}

function identifier(value, name) {
  const key = String(value ?? "").trim().toLowerCase();
  if (!identifierPattern.test(key)) {
    throw customModuleValidationError(`${name} must use lowercase letters, numbers, and underscores.`);
  }
  return key;
}

function sanitizeOptions(value, fieldKey) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 100) {
    throw customModuleValidationError(`${fieldKey} options must be an array with at most 100 items.`);
  }
  const seen = new Set();
  return value.map((option, index) => {
    const source = typeof option === "string" ? { value: option, label: option } : option;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      throw customModuleValidationError(`${fieldKey} option ${index + 1} is invalid.`);
    }
    const optionValue = identifier(source.value, `${fieldKey} option value`);
    if (seen.has(optionValue)) throw customModuleValidationError(`${fieldKey} has duplicate options.`);
    seen.add(optionValue);
    return {
      value: optionValue,
      label: plainText(source.label || source.value, `${fieldKey} option label`, 100, { required: true }),
    };
  });
}

export function sanitizeFieldsSchema(value) {
  if (!Array.isArray(value)) throw customModuleValidationError("fieldsSchema must be an array.");
  if (value.length > MAX_FIELDS) {
    throw customModuleValidationError(`A custom module can contain at most ${MAX_FIELDS} fields.`);
  }

  const seen = new Set();
  return value.map((field, index) => {
    if (!field || typeof field !== "object" || Array.isArray(field)) {
      throw customModuleValidationError(`Field ${index + 1} is invalid.`);
    }
    const key = identifier(field.key, `Field ${index + 1} key`);
    if (forbiddenFieldKeyPattern.test(key)) {
      throw customModuleValidationError(`Field key ${key} is reserved for sensitive data.`);
    }
    if (seen.has(key)) throw customModuleValidationError(`Duplicate field key: ${key}.`);
    seen.add(key);

    const type = String(field.type || "text");
    if (!fieldTypes.has(type)) throw customModuleValidationError(`Unknown field type: ${type}.`);
    const label = plainText(field.label, `${key} label`, 120, { required: true });
    if (forbiddenFieldKeyPattern.test(label)) {
      throw customModuleValidationError(`Field label ${label} is reserved for sensitive data.`);
    }
    const options = ["select", "multi_select"].includes(type)
      ? sanitizeOptions(field.options, key)
      : [];
    if (["select", "multi_select"].includes(type) && !options.length) {
      throw customModuleValidationError(`${key} requires at least one option.`);
    }

    return {
      key,
      label,
      type,
      required: field.required === true,
      placeholder: plainText(field.placeholder, `${key} placeholder`, 200),
      options,
      showInList: field.showInList !== false,
      order: Number.isFinite(Number(field.order)) ? Math.max(0, Math.min(999, Number(field.order))) : index,
    };
  }).sort((a, b) => a.order - b.order);
}

function sanitizePermissionList(value, name, fallback) {
  if (value == null) return fallback;
  if (!Array.isArray(value) || value.length > 20) {
    throw customModuleValidationError(`${name} must be an array with at most 20 permissions.`);
  }
  return [...new Set(value.map((permission) => {
    const normalized = String(permission || "").trim().toLowerCase();
    if (!permissionPattern.test(normalized)) {
      throw customModuleValidationError(`${name} contains an invalid permission.`);
    }
    return normalized;
  }))];
}

export function sanitizeModuleConfig(input, current = null) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw customModuleValidationError("Custom module configuration must be an object.");
  }
  const key = current?.key || identifier(input.key, "Module key");
  const defaultView = [`custom_modules.${key}.view`];
  const defaultManage = [`custom_modules.${key}.manage`];
  const permissions = input.permissions && typeof input.permissions === "object"
    ? input.permissions
    : current?.permissions || {};
  const enabled = input.enabled ?? current?.enabled ?? true;
  if (typeof enabled !== "boolean") {
    throw customModuleValidationError("enabled must be a boolean.");
  }

  return {
    key,
    label: plainText(input.label ?? current?.label, "Module label", 120, { required: true }),
    description: plainText(input.description ?? current?.description, "Module description", 500),
    icon: identifier(input.icon ?? current?.icon ?? "folder", "Module icon"),
    sidebarOrder: Number.isFinite(Number(input.sidebarOrder ?? current?.sidebarOrder))
      ? Math.max(0, Math.min(999, Number(input.sidebarOrder ?? current?.sidebarOrder)))
      : 100,
    enabled,
    fieldsSchema: sanitizeFieldsSchema(input.fieldsSchema ?? current?.fieldsSchema ?? []),
    listConfig: { pageSize: Math.max(5, Math.min(100, Number(input.listConfig?.pageSize || current?.listConfig?.pageSize || 25))) },
    formConfig: { submitLabel: plainText(input.formConfig?.submitLabel || current?.formConfig?.submitLabel || "Save", "Submit label", 60) },
    permissions: {
      view: sanitizePermissionList(permissions.view, "View permissions", defaultView),
      manage: sanitizePermissionList(permissions.manage, "Manage permissions", defaultManage),
    },
  };
}

function validateUrl(value, key) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("unsafe protocol");
    return url.toString();
  } catch {
    throw customModuleValidationError(`${key} must be a valid HTTP(S) URL.`);
  }
}

function sanitizeFieldValue(field, value) {
  if (value == null || value === "") {
    if (field.required) throw customModuleValidationError(`${field.label} is required.`);
    return field.type === "boolean" ? false : field.type === "multi_select" ? [] : null;
  }
  if (field.type === "boolean") return value === true || value === "true";
  if (field.type === "number") {
    const number = Number(value);
    if (!Number.isFinite(number)) throw customModuleValidationError(`${field.label} must be a number.`);
    return number;
  }
  if (field.type === "multi_select") {
    if (!Array.isArray(value)) throw customModuleValidationError(`${field.label} must be an array.`);
    const allowed = new Set(field.options.map((option) => option.value));
    const selected = [...new Set(value.map(String))];
    if (selected.some((item) => !allowed.has(item))) throw customModuleValidationError(`${field.label} contains an invalid option.`);
    return selected;
  }
  const text = plainText(value, field.label, field.type === "textarea" ? 10000 : 2048, { required: field.required });
  if (field.type === "select" && !field.options.some((option) => option.value === text)) {
    throw customModuleValidationError(`${field.label} contains an invalid option.`);
  }
  if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
    throw customModuleValidationError(`${field.label} must be a valid email.`);
  }
  if (field.type === "phone" && !/^[+()0-9 .-]{3,40}$/.test(text)) {
    throw customModuleValidationError(`${field.label} must be a valid phone number.`);
  }
  if (["url", "image_url", "file_url"].includes(field.type)) return validateUrl(text, field.label);
  if (field.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw customModuleValidationError(`${field.label} must be a valid date.`);
  }
  if (field.type === "datetime" && !Number.isFinite(Date.parse(text))) {
    throw customModuleValidationError(`${field.label} must be a valid date and time.`);
  }
  return text;
}

export function sanitizeEntryData(input, fieldsSchema) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw customModuleValidationError("Entry data must be an object.");
  }
  const knownKeys = new Set(fieldsSchema.map((field) => field.key));
  const unknown = Object.keys(input).find((key) => !knownKeys.has(key));
  if (unknown) throw customModuleValidationError(`Unknown entry field: ${unknown}.`);
  return Object.fromEntries(fieldsSchema.map((field) => [field.key, sanitizeFieldValue(field, input[field.key])]));
}

export function userCanViewCustomModule(user, module) {
  if (["admin", "company_admin", "super_admin"].includes(user?.role)) return true;
  const permissions = new Set(user?.permissions || []);
  return module.permissions?.view?.some((permission) => permissions.has(permission))
    || module.permissions?.manage?.some((permission) => permissions.has(permission));
}

export function userCanManageCustomModule(user, module) {
  if (["admin", "company_admin", "super_admin"].includes(user?.role)) return true;
  const permissions = new Set(user?.permissions || []);
  return module.permissions?.manage?.some((permission) => permissions.has(permission));
}
