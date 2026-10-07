export const MAX_DESIGN_HISTORY = 30;

export const SITE_DESIGN_CSS_VARIABLES = Object.freeze([
  "--site-bg-primary",
  "--site-bg-secondary",
  "--site-divider",
  "--site-accent-primary",
  "--site-accent-secondary",
  "--site-accent-tertiary",
  "--site-accent-quaternary",
  "--site-title-color",
  "--site-subtitle-color",
  "--site-body-color",
  "--site-text-secondary",
  "--site-link-color",
  "--site-button-primary-bg",
  "--site-button-primary-border",
  "--site-button-primary-text",
  "--site-button-secondary-bg",
  "--site-button-secondary-border",
  "--site-button-secondary-text",
]);

export const MAX_TEXT_THEME_HISTORY = 30;

export const SITE_DESIGN_TEXT_STYLE_TOKENS = Object.freeze([
  "display",
  "heading1",
  "heading2",
  "heading3",
  "body",
  "small",
  "button",
]);

export const SITE_DESIGN_FONT_FAMILY_MAP = Object.freeze({
  "system-sans": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  arial: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
  georgia: "Georgia, 'Times New Roman', Times, serif",
  "times-new-roman": "'Times New Roman', Times, serif",
  verdana: "Verdana, Geneva, Tahoma, sans-serif",
  tahoma: "Tahoma, Verdana, Geneva, sans-serif",
  "trebuchet-ms": "'Trebuchet MS', 'Segoe UI', Arial, sans-serif",
  "courier-new": "'Courier New', Courier, monospace",
});

export const SITE_DESIGN_TYPOGRAPHY_CSS_VARIABLES = Object.freeze(
  SITE_DESIGN_TEXT_STYLE_TOKENS.flatMap((token) => [
    `--site-${token}-font-family`,
    `--site-${token}-font-size`,
    `--site-${token}-font-weight`,
    `--site-${token}-line-height`,
    `--site-${token}-letter-spacing`,
  ]),
);

export const SITE_DESIGN_TYPOGRAPHY_FIELDS = Object.freeze([
  {
    id: "fontFamily",
    property: "fontFamily",
    type: "select",
    values: Object.freeze(Object.keys(SITE_DESIGN_FONT_FAMILY_MAP)),
    step: null,
    label: Object.freeze({ en: "Font family", ar: "عائلة الخط" }),
  },
  {
    id: "fontSizePx",
    property: "fontSizePx",
    type: "number",
    min: 10,
    max: 96,
    integer: true,
    step: 1,
    label: Object.freeze({ en: "Font size", ar: "حجم الخط" }),
  },
  {
    id: "fontWeight",
    property: "fontWeight",
    type: "select",
    values: Object.freeze([300, 400, 500, 600, 700, 800]),
    step: null,
    label: Object.freeze({ en: "Font weight", ar: "وزن الخط" }),
  },
  {
    id: "lineHeight",
    property: "lineHeight",
    type: "number",
    min: 1,
    max: 2,
    integer: false,
    step: 0.05,
    label: Object.freeze({ en: "Line height", ar: "ارتفاع السطر" }),
  },
  {
    id: "letterSpacingEm",
    property: "letterSpacingEm",
    type: "number",
    min: -0.1,
    max: 0.3,
    integer: false,
    step: 0.005,
    label: Object.freeze({ en: "Letter spacing", ar: "تباعد الأحرف" }),
  },
]);

export const SITE_DESIGN_COLOR_GROUPS = Object.freeze([
  { id: "base", label: { en: "Base Backgrounds", ar: "الخلفيات الأساسية" } },
  { id: "general", label: { en: "Lines and Dividers", ar: "الخطوط والفواصل" } },
  { id: "accent", label: { en: "Accent Colors", ar: "الألوان المميزة" } },
  { id: "text", label: { en: "Text Colors", ar: "ألوان النصوص" } },
  { id: "buttons.primary", label: { en: "Primary Button", ar: "الزر الأساسي" } },
  { id: "buttons.secondary", label: { en: "Secondary Button", ar: "الزر الثانوي" } },
]);

export const SITE_DESIGN_COLOR_FIELDS = Object.freeze([
  { id: "base.primaryBackground", group: "base", path: ["base", "primaryBackground"], label: { en: "Primary background", ar: "الخلفية الأساسية" } },
  { id: "base.secondaryBackground", group: "base", path: ["base", "secondaryBackground"], label: { en: "Secondary background", ar: "الخلفية الثانوية" } },
  { id: "general.linesAndDividers", group: "general", path: ["general", "linesAndDividers"], label: { en: "Lines and dividers", ar: "الخطوط والفواصل" } },
  { id: "accent.primary", group: "accent", path: ["accent", "primary"], label: { en: "Primary accent", ar: "اللون المميز الأساسي" } },
  { id: "accent.secondary", group: "accent", path: ["accent", "secondary"], label: { en: "Secondary accent", ar: "اللون المميز الثانوي" } },
  { id: "accent.tertiary", group: "accent", path: ["accent", "tertiary"], label: { en: "Tertiary accent", ar: "اللون المميز الثالث" } },
  { id: "accent.quaternary", group: "accent", path: ["accent", "quaternary"], label: { en: "Quaternary accent", ar: "اللون المميز الرابع" } },
  { id: "text.titles", group: "text", path: ["text", "titles"], label: { en: "Titles", ar: "العناوين" } },
  { id: "text.subtitles", group: "text", path: ["text", "subtitles"], label: { en: "Subtitles", ar: "العناوين الفرعية" } },
  { id: "text.body", group: "text", path: ["text", "body"], label: { en: "Body text", ar: "نص المحتوى" } },
  { id: "text.secondary", group: "text", path: ["text", "secondary"], label: { en: "Secondary text", ar: "النص الثانوي" } },
  { id: "text.linksAndActions", group: "text", path: ["text", "linksAndActions"], label: { en: "Links and actions", ar: "الروابط والإجراءات" } },
  { id: "buttons.primary.background", group: "buttons.primary", path: ["buttons", "primary", "background"], label: { en: "Button background", ar: "خلفية الزر" } },
  { id: "buttons.primary.border", group: "buttons.primary", path: ["buttons", "primary", "border"], label: { en: "Button border", ar: "حدود الزر" } },
  { id: "buttons.primary.text", group: "buttons.primary", path: ["buttons", "primary", "text"], label: { en: "Button text", ar: "نص الزر" } },
  { id: "buttons.secondary.background", group: "buttons.secondary", path: ["buttons", "secondary", "background"], label: { en: "Button background", ar: "خلفية الزر" } },
  { id: "buttons.secondary.border", group: "buttons.secondary", path: ["buttons", "secondary", "border"], label: { en: "Button border", ar: "حدود الزر" } },
  { id: "buttons.secondary.text", group: "buttons.secondary", path: ["buttons", "secondary", "text"], label: { en: "Button text", ar: "نص الزر" } },
]);

const DESIGN_COLOR_PATHS = Object.freeze({
  "--site-bg-primary": ["base", "primaryBackground"],
  "--site-bg-secondary": ["base", "secondaryBackground"],
  "--site-divider": ["general", "linesAndDividers"],
  "--site-accent-primary": ["accent", "primary"],
  "--site-accent-secondary": ["accent", "secondary"],
  "--site-accent-tertiary": ["accent", "tertiary"],
  "--site-accent-quaternary": ["accent", "quaternary"],
  "--site-title-color": ["text", "titles"],
  "--site-subtitle-color": ["text", "subtitles"],
  "--site-body-color": ["text", "body"],
  "--site-text-secondary": ["text", "secondary"],
  "--site-link-color": ["text", "linksAndActions"],
  "--site-button-primary-bg": ["buttons", "primary", "background"],
  "--site-button-primary-border": ["buttons", "primary", "border"],
  "--site-button-primary-text": ["buttons", "primary", "text"],
  "--site-button-secondary-bg": ["buttons", "secondary", "background"],
  "--site-button-secondary-border": ["buttons", "secondary", "border"],
  "--site-button-secondary-text": ["buttons", "secondary", "text"],
});

const HEX6_PATTERN = /^#[0-9a-f]{6}$/i;

export function normalizeHexColor(value) {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!HEX6_PATTERN.test(candidate)) return null;
  return candidate.toLowerCase();
}

export function cloneColorTheme(theme) {
  if (theme == null || typeof theme !== "object") return null;
  return JSON.parse(JSON.stringify(theme));
}

export function colorThemesEqual(a, b) {
  if (a === b) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

export function findDefaultTheme(definition) {
  if (!definition || !Array.isArray(definition.themePresets)) return null;
  const defaultThemeId = definition.defaultThemeId;
  return definition.themePresets.find((preset) => preset?.themeId === defaultThemeId) || null;
}

export function createInitialDesignState() {
  return {
    available: false,
    definition: null,
    currentThemeId: "",
    colorTheme: null,
    initialThemeId: "",
    initialColorTheme: null,
    history: { past: [], future: [] },
    isDirty: false,
    activeView: "main",
    ...createInitialTextThemeState(),
  };
}

export function applyThemePreset(preset) {
  if (!preset || !preset.colorTheme) return null;
  return { themeId: preset.themeId, colorTheme: cloneColorTheme(preset.colorTheme) };
}

export function pushDesignHistory(history, entry) {
  const past = [...(history?.past || []), entry].slice(-MAX_DESIGN_HISTORY);
  return { past, future: [] };
}

export function createDesignCssVariables(colorTheme) {
  const variables = {};
  if (!colorTheme || typeof colorTheme !== "object") return variables;
  for (const [name, path] of Object.entries(DESIGN_COLOR_PATHS)) {
    const value = path.reduce((acc, key) => (acc && typeof acc === "object" ? acc[key] : undefined), colorTheme);
    const hex = normalizeHexColor(value);
    if (hex) variables[name] = hex;
  }
  return variables;
}

export function findColorField(fieldId) {
  if (typeof fieldId !== "string") return null;
  return SITE_DESIGN_COLOR_FIELDS.find((field) => field.id === fieldId) || null;
}

export function getColorThemeValue(colorTheme, fieldId) {
  const field = findColorField(fieldId);
  if (!field || !colorTheme || typeof colorTheme !== "object") return null;
  const value = field.path.reduce((acc, key) => (acc && typeof acc === "object" ? acc[key] : undefined), colorTheme);
  return normalizeHexColor(value);
}

export function updateColorThemeValue(colorTheme, fieldId, value) {
  const field = findColorField(fieldId);
  const hex = normalizeHexColor(value);
  if (!field || !hex || !colorTheme || typeof colorTheme !== "object") return null;
  const next = cloneColorTheme(colorTheme);
  let target = next;
  for (const key of field.path.slice(0, -1)) {
    if (!target[key] || typeof target[key] !== "object") return null;
    target = target[key];
  }
  target[field.path.at(-1)] = hex;
  return next;
}

export function findCurrentThemePreset(definition, currentThemeId) {
  if (!definition || !Array.isArray(definition.themePresets)) return null;
  return definition.themePresets.find((preset) => preset?.themeId === currentThemeId) || null;
}

export function getPresetColorValue(definition, currentThemeId, fieldId) {
  const preset = findCurrentThemePreset(definition, currentThemeId);
  if (!preset?.colorTheme) return null;
  return getColorThemeValue(preset.colorTheme, fieldId);
}

export function resetColorThemeValue(colorTheme, definition, currentThemeId, fieldId) {
  const presetValue = getPresetColorValue(definition, currentThemeId, fieldId);
  if (presetValue == null) return null;
  return updateColorThemeValue(colorTheme, fieldId, presetValue);
}

export function resetColorThemeToPreset(definition, currentThemeId) {
  const preset = findCurrentThemePreset(definition, currentThemeId);
  if (!preset?.colorTheme) return null;
  return cloneColorTheme(preset.colorTheme);
}

export function colorThemeIsCustomized(definition, currentThemeId, colorTheme) {
  const preset = findCurrentThemePreset(definition, currentThemeId);
  if (!preset?.colorTheme) return false;
  return !colorThemesEqual(colorTheme, preset.colorTheme);
}

const TEXT_WEIGHTS = new Set([300, 400, 500, 600, 700, 800]);
const TEXT_FONT_SIZE_MIN = 10;
const TEXT_FONT_SIZE_MAX = 96;
const TEXT_LINE_HEIGHT_MIN = 1;
const TEXT_LINE_HEIGHT_MAX = 2;
const TEXT_LETTER_SPACING_MIN = -0.1;
const TEXT_LETTER_SPACING_MAX = 0.3;

function sanitizeTextStyle(tokenStyle) {
  if (!tokenStyle || typeof tokenStyle !== "object") return null;
  const out = {};
  if (typeof tokenStyle.fontFamily === "string" && Object.prototype.hasOwnProperty.call(SITE_DESIGN_FONT_FAMILY_MAP, tokenStyle.fontFamily)) {
    out.fontFamily = tokenStyle.fontFamily;
  }
  if (Number.isInteger(tokenStyle.fontSizePx) && tokenStyle.fontSizePx >= TEXT_FONT_SIZE_MIN && tokenStyle.fontSizePx <= TEXT_FONT_SIZE_MAX) {
    out.fontSizePx = tokenStyle.fontSizePx;
  }
  if (TEXT_WEIGHTS.has(tokenStyle.fontWeight)) out.fontWeight = tokenStyle.fontWeight;
  if (typeof tokenStyle.lineHeight === "number" && tokenStyle.lineHeight >= TEXT_LINE_HEIGHT_MIN && tokenStyle.lineHeight <= TEXT_LINE_HEIGHT_MAX) {
    out.lineHeight = tokenStyle.lineHeight;
  }
  if (typeof tokenStyle.letterSpacingEm === "number" && tokenStyle.letterSpacingEm >= TEXT_LETTER_SPACING_MIN && tokenStyle.letterSpacingEm <= TEXT_LETTER_SPACING_MAX) {
    out.letterSpacingEm = tokenStyle.letterSpacingEm;
  }
  if (Object.keys(out).length === 0) return null;
  return out;
}

export function cloneTextThemeStyles(styles) {
  if (styles == null) return null;
  return JSON.parse(JSON.stringify(styles));
}

export function textThemeStylesEqual(a, b) {
  if (a === b) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

export function findDefaultTextTheme(definition) {
  if (!definition || !Array.isArray(definition.textThemePresets)) return null;
  const defaultTextThemeId = definition.defaultTextThemeId;
  return definition.textThemePresets.find((preset) => preset?.textThemeId === defaultTextThemeId) || null;
}

export function findTextThemePreset(definition, textThemeId) {
  if (!definition || !Array.isArray(definition.textThemePresets)) return null;
  return definition.textThemePresets.find((preset) => preset?.textThemeId === textThemeId) || null;
}

export function applyTextThemePreset(preset) {
  if (!preset || typeof preset.textThemeId !== "string" || !preset.styles || typeof preset.styles !== "object") return null;
  const textThemeStyles = {};
  for (const token of SITE_DESIGN_TEXT_STYLE_TOKENS) {
    const clean = sanitizeTextStyle(preset.styles[token]);
    if (clean) textThemeStyles[token] = clean;
  }
  if (Object.keys(textThemeStyles).length === 0) return null;
  return { textThemeId: preset.textThemeId, textThemeStyles };
}

export function textThemePresetsAvailable(definition) {
  if (!definition || definition.capabilities?.typography !== true) return false;
  if (!Array.isArray(definition.textThemePresets) || definition.textThemePresets.length === 0) return false;
  return definition.textThemePresets.some((preset) => applyTextThemePreset(preset));
}

export function createInitialTextThemeState() {
  return {
    currentTextThemeId: "",
    textThemeStyles: null,
    initialTextThemeId: "",
    initialTextThemeStyles: null,
    textHistory: { past: [], future: [] },
  };
}

export function buildTextThemeState(definition) {
  const empty = createInitialTextThemeState();
  if (!definition || definition.capabilities?.typography !== true) return empty;
  if (!Array.isArray(definition.textThemePresets) || definition.textThemePresets.length === 0) return empty;
  const defaultPreset = findDefaultTextTheme(definition);
  const applied = applyTextThemePreset(defaultPreset);
  if (!applied) return empty;
  return {
    currentTextThemeId: applied.textThemeId,
    textThemeStyles: applied.textThemeStyles,
    initialTextThemeId: applied.textThemeId,
    initialTextThemeStyles: cloneTextThemeStyles(applied.textThemeStyles),
    textHistory: { past: [], future: [] },
  };
}

export function createTypographyCssVariables(textThemeStyles) {
  const variables = {};
  if (!textThemeStyles || typeof textThemeStyles !== "object") return variables;
  for (const token of SITE_DESIGN_TEXT_STYLE_TOKENS) {
    const style = sanitizeTextStyle(textThemeStyles[token]);
    if (!style) continue;
    if (style.fontFamily && Object.prototype.hasOwnProperty.call(SITE_DESIGN_FONT_FAMILY_MAP, style.fontFamily)) {
      variables[`--site-${token}-font-family`] = SITE_DESIGN_FONT_FAMILY_MAP[style.fontFamily];
    }
    if (style.fontSizePx != null) variables[`--site-${token}-font-size`] = `${style.fontSizePx}px`;
    if (style.fontWeight != null) variables[`--site-${token}-font-weight`] = style.fontWeight;
    if (style.lineHeight != null) variables[`--site-${token}-line-height`] = style.lineHeight;
    if (style.letterSpacingEm != null) variables[`--site-${token}-letter-spacing`] = `${style.letterSpacingEm}em`;
  }
  return variables;
}

export function findTypographyField(property) {
  if (typeof property !== "string") return null;
  return SITE_DESIGN_TYPOGRAPHY_FIELDS.find((field) => field.property === property) || null;
}

function isValidToken(token) {
  return typeof token === "string" && SITE_DESIGN_TEXT_STYLE_TOKENS.includes(token);
}

function finiteNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value === "string") {
    const candidate = value.trim();
    if (candidate === "") return NaN;
    const parsed = Number(candidate);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

export function normalizeTypographyValue(property, value) {
  const field = findTypographyField(property);
  if (!field) return null;
  if (field.property === "fontFamily") {
    if (typeof value !== "string") return null;
    const key = value.trim();
    return Object.prototype.hasOwnProperty.call(SITE_DESIGN_FONT_FAMILY_MAP, key) ? key : null;
  }
  if (field.property === "fontWeight") {
    const num = finiteNumber(value);
    if (!Number.isFinite(num) || !TEXT_WEIGHTS.has(num)) return null;
    return num;
  }
  const num = finiteNumber(value);
  if (!Number.isFinite(num)) return null;
  if (num < field.min || num > field.max) return null;
  if (field.integer === true && !Number.isInteger(num)) return null;
  return num;
}

export function getTypographyValue(styles, token, property) {
  if (!isValidToken(token) || !findTypographyField(property)) return null;
  if (!styles || typeof styles !== "object" || !styles[token] || typeof styles[token] !== "object") return null;
  return normalizeTypographyValue(property, styles[token][property]);
}

export function getCurrentTextThemePreset(definition, currentTextThemeId) {
  return findTextThemePreset(definition, currentTextThemeId);
}

export function getPresetTypographyValue(definition, currentTextThemeId, token, property) {
  if (!isValidToken(token) || !findTypographyField(property)) return null;
  const preset = getCurrentTextThemePreset(definition, currentTextThemeId);
  const applied = applyTextThemePreset(preset);
  if (!applied) return null;
  return getTypographyValue(applied.textThemeStyles, token, property);
}

export function updateTypographyValue(styles, token, property, value) {
  if (!isValidToken(token) || !findTypographyField(property)) return null;
  if (!styles || typeof styles !== "object") return null;
  const normalized = normalizeTypographyValue(property, value);
  if (normalized == null) return null;
  const tokenStyle = styles[token];
  if (!tokenStyle || typeof tokenStyle !== "object") return null;
  if (tokenStyle[property] === normalized) return cloneTextThemeStyles(styles);
  const next = cloneTextThemeStyles(styles);
  next[token] = { ...next[token] };
  next[token][property] = normalized;
  return next;
}

export function resetTypographyValueToPreset(definition, currentTextThemeId, styles, token, property) {
  if (!isValidToken(token) || !findTypographyField(property)) return null;
  const presetValue = getPresetTypographyValue(definition, currentTextThemeId, token, property);
  if (presetValue == null) return null;
  return updateTypographyValue(styles, token, property, presetValue);
}

export function resetTypographyTokenToPreset(definition, currentTextThemeId, styles, token) {
  if (!isValidToken(token)) return null;
  const preset = getCurrentTextThemePreset(definition, currentTextThemeId);
  const applied = applyTextThemePreset(preset);
  if (!applied || !applied.textThemeStyles[token]) return null;
  if (!styles || typeof styles !== "object" || !styles[token] || typeof styles[token] !== "object") return null;
  const presetTokenStyle = applied.textThemeStyles[token];
  if (textThemeStylesEqual(styles[token], presetTokenStyle)) return cloneTextThemeStyles(styles);
  const next = cloneTextThemeStyles(styles);
  next[token] = cloneTextThemeStyles(presetTokenStyle);
  return next;
}

export function resetTypographyStylesToPreset(definition, currentTextThemeId) {
  const preset = getCurrentTextThemePreset(definition, currentTextThemeId);
  const applied = applyTextThemePreset(preset);
  if (!applied) return null;
  return applied.textThemeStyles;
}

export function textThemeIsCustomized(definition, currentTextThemeId, styles) {
  const presetStyles = resetTypographyStylesToPreset(definition, currentTextThemeId);
  if (!presetStyles) return false;
  return !textThemeStylesEqual(styles, presetStyles);
}
