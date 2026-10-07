import { SiteEditorValidationError } from "./schema.js";

/**
 * siteDesignManifest.js — manifest validation for the generic multi-tenant
 * Site Design feature.
 *
 * Phase 1 covers themes and colors. Phase 2A adds safe text theme presets:
 * each preset carries exactly seven style tokens (display, heading1, heading2,
 * heading3, body, small, button), each token is limited to fontFamily,
 * fontSizePx, fontWeight, lineHeight, and letterSpacingEm, and font families
 * are restricted to a fixed allowlist of well-known system fonts. Typography
 * never accepts raw CSS font strings, font uploads, or external font URLs.
 * Phase 3A adds generic page background presets: each preset carries exactly
 * pageColor, contentColor, pattern, patternColor, and patternOpacity. Colors
 * are strict six-digit hex values, patterns are limited to a fixed allowlist,
 * and opacity is a finite number between 0 and 0.25. Page backgrounds never
 * accept images, image URLs, file uploads, external URLs, gradients, custom
 * CSS, or arbitrary CSS functions. Page transitions, font upload, and
 * arbitrary CSS remain unsupported.
 *
 * The schema mirrors the CPanel's allowlist of design tokens so the validated
 * payload maps 1:1 to the editor preview variables.
 *
 * The function is fully backward compatible: when `siteDesign` is absent from
 * the storefront manifest, `normalizeSiteDesign` returns null, and when the
 * typography section is absent, `defaultTextThemeId` normalizes to "" with an
 * empty `textThemePresets` array.
 */

export const SITE_DESIGN_VERSION = "1";
export const MAX_THEMES = 20;
export const MAX_PREVIEW_SWATCHES = 8;
export const MAX_TEXT_THEMES = 12;
export const MAX_PAGE_BACKGROUNDS = 12;
export const SITE_DESIGN_FONT_FAMILY_ALLOWLIST = Object.freeze([
  "system-sans",
  "arial",
  "georgia",
  "times-new-roman",
  "verdana",
  "tahoma",
  "trebuchet-ms",
  "courier-new",
]);
export const SITE_DESIGN_TEXT_STYLE_TOKENS = Object.freeze([
  "display",
  "heading1",
  "heading2",
  "heading3",
  "body",
  "small",
  "button",
]);
export const SITE_DESIGN_TEXT_STYLE_KEYS = Object.freeze([
  "fontFamily",
  "fontSizePx",
  "fontWeight",
  "lineHeight",
  "letterSpacingEm",
]);
export const SITE_DESIGN_TEXT_THEME_PRESET_KEYS = Object.freeze([
  "textThemeId",
  "name",
  "description",
  "styles",
]);
export const SITE_DESIGN_FONT_WEIGHTS = Object.freeze([300, 400, 500, 600, 700, 800]);
export const SITE_DESIGN_FONT_SIZE_PX_RANGE = Object.freeze({ min: 10, max: 96 });
export const SITE_DESIGN_LINE_HEIGHT_RANGE = Object.freeze({ min: 1, max: 2 });
export const SITE_DESIGN_LETTER_SPACING_EM_RANGE = Object.freeze({ min: -0.1, max: 0.3 });
export const SITE_DESIGN_COLOR_GROUPS = Object.freeze({
  base: Object.freeze(["primaryBackground", "secondaryBackground"]),
  general: Object.freeze(["linesAndDividers"]),
  accent: Object.freeze(["primary", "secondary", "tertiary", "quaternary"]),
  text: Object.freeze(["titles", "subtitles", "body", "secondary", "linksAndActions"]),
});
export const SITE_DESIGN_BUTTON_KEYS = Object.freeze(["background", "border", "text"]);
export const SITE_DESIGN_CAPABILITIES = Object.freeze([
  "themes",
  "colors",
  "typography",
  "pageBackgrounds",
  "pageTransitions",
]);
export const SITE_DESIGN_TOP_LEVEL_KEYS = Object.freeze([
  "version",
  "capabilities",
  "defaultThemeId",
  "themePresets",
  "defaultTextThemeId",
  "textThemePresets",
  "defaultPageBackgroundId",
  "pageBackgroundPresets",
]);
export const SITE_DESIGN_PRESET_KEYS = Object.freeze([
  "themeId",
  "name",
  "description",
  "previewSwatches",
  "colorTheme",
]);
export const SITE_DESIGN_BUTTON_GROUPS = Object.freeze(["primary", "secondary"]);
export const SITE_DESIGN_PAGE_BACKGROUND_PATTERNS = Object.freeze([
  "none",
  "soft-grain",
  "subtle-dots",
  "soft-grid",
]);
export const SITE_DESIGN_PAGE_BACKGROUND_PRESET_KEYS = Object.freeze([
  "pageBackgroundId",
  "name",
  "description",
  "background",
]);
export const SITE_DESIGN_PAGE_BACKGROUND_KEYS = Object.freeze([
  "pageColor",
  "contentColor",
  "pattern",
  "patternColor",
  "patternOpacity",
]);
export const SITE_DESIGN_PAGE_BACKGROUND_OPACITY_RANGE = Object.freeze({ min: 0, max: 0.25 });

const THEME_ID_PATTERN = /^[a-z0-9][a-z0-9:_-]{0,159}$/i;
const VERSION_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,31}$/i;
const HEX_PATTERN = /^#[0-9a-f]{6}$/i;
const UNSAFE_MARKUP = /<\s*\/?\s*(?:script|iframe|object|embed|style|link|meta)|\bon\w+\s*=|javascript\s*:|data\s*:\s*text\/html/i;

function designError(message, code = "SITE_DESIGN_INVALID", statusCode = 400) {
  return new SiteEditorValidationError(message, statusCode, code);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function rejectUnknownKeys(object, allowedKeys, field) {
  for (const key of Object.keys(object)) {
    if (!allowedKeys.includes(key)) throw designError(`Unknown ${field} property: ${key}.`);
  }
}

function safeThemeId(value, field) {
  const result = String(value ?? "").trim();
  if (!THEME_ID_PATTERN.test(result)) throw designError(`${field} is invalid.`);
  return result;
}

function localizedDesignText(value, field) {
  if (!isRecord(value)) throw designError(`${field} must be a localized object.`);
  const en = String(value.en ?? "").replace(/\u0000/g, "").trim().slice(0, 500);
  const ar = String(value.ar ?? "").replace(/\u0000/g, "").trim().slice(0, 500);
  if (!en && !ar) throw designError(`${field} must contain at least one non-empty language value.`);
  if (UNSAFE_MARKUP.test(`${en} ${ar}`) || /<[^>]+>/.test(`${en} ${ar}`)) {
    throw designError(`${field} must contain plain text only.`);
  }
  return { en, ar };
}

function normalizeHexColor(value, field) {
  if (typeof value !== "string") throw designError(`${field} must be a valid six-digit hex color.`);
  const candidate = value.trim().toLowerCase();
  if (!HEX_PATTERN.test(candidate)) throw designError(`${field} must be a valid six-digit hex color.`);
  return candidate;
}

function normalizeColorGroup(group, allowedKeys, field) {
  if (!isRecord(group)) throw designError(`${field} must be a color object.`);
  rejectUnknownKeys(group, allowedKeys, field);
  const normalized = {};
  for (const key of allowedKeys) {
    if (!Object.hasOwn(group, key)) throw designError(`${field}.${key} is required.`);
    normalized[key] = normalizeHexColor(group[key], `${field}.${key}`);
  }
  return normalized;
}

function normalizeButtonColors(button, field) {
  if (!isRecord(button)) throw designError(`${field} must be a button color object.`);
  return normalizeColorGroup(button, SITE_DESIGN_BUTTON_KEYS, field);
}

function normalizeColorTheme(colorTheme) {
  if (!isRecord(colorTheme)) throw designError("colorTheme must be an object.");
  const groups = Object.keys(SITE_DESIGN_COLOR_GROUPS);
  rejectUnknownKeys(colorTheme, [...groups, "buttons"], "colorTheme");
  const normalized = {};
  for (const [group, keys] of Object.entries(SITE_DESIGN_COLOR_GROUPS)) {
    normalized[group] = normalizeColorGroup(colorTheme[group], keys, `colorTheme.${group}`);
  }
  if (!isRecord(colorTheme.buttons)) throw designError("colorTheme.buttons must be an object.");
  rejectUnknownKeys(colorTheme.buttons, SITE_DESIGN_BUTTON_GROUPS, "colorTheme.buttons");
  normalized.buttons = {
    primary: normalizeButtonColors(colorTheme.buttons.primary, "colorTheme.buttons.primary"),
    secondary: normalizeButtonColors(colorTheme.buttons.secondary, "colorTheme.buttons.secondary"),
  };
  return normalized;
}

function normalizeCapabilities(capabilities) {
  const normalized = {
    themes: false,
    colors: false,
    typography: false,
    pageBackgrounds: false,
    pageTransitions: false,
  };
  if (capabilities == null) return normalized;
  if (!isRecord(capabilities)) throw designError("capabilities must be an object.");
  for (const key of Object.keys(capabilities)) {
    if (!SITE_DESIGN_CAPABILITIES.includes(key)) throw designError(`Unknown capability: ${key}.`);
  }
  for (const key of SITE_DESIGN_CAPABILITIES) {
    if (Object.hasOwn(capabilities, key)) {
      if (typeof capabilities[key] !== "boolean") throw designError(`capabilities.${key} must be a boolean.`);
      normalized[key] = capabilities[key];
    }
  }
  return normalized;
}

function normalizeThemePreset(preset, index) {
  if (!isRecord(preset)) throw designError(`themePresets[${index}] must be an object.`);
  rejectUnknownKeys(preset, SITE_DESIGN_PRESET_KEYS, `themePresets[${index}]`);
  const themeId = safeThemeId(preset.themeId, `themePresets[${index}].themeId`);
  const name = localizedDesignText(preset.name, `themePresets[${index}].name`);
  const description = preset.description != null
    ? localizedDesignText(preset.description, `themePresets[${index}].description`)
    : { en: "", ar: "" };
  let previewSwatches = [];
  if (preset.previewSwatches != null) {
    if (!Array.isArray(preset.previewSwatches)) throw designError(`themePresets[${index}].previewSwatches must be an array.`);
    if (preset.previewSwatches.length > MAX_PREVIEW_SWATCHES) {
      throw designError(`themePresets[${index}] declares too many preview swatches.`);
    }
    previewSwatches = preset.previewSwatches.map((swatch, swatchIndex) =>
      normalizeHexColor(swatch, `themePresets[${index}].previewSwatches[${swatchIndex}]`));
  }
  const colorTheme = normalizeColorTheme(preset.colorTheme);
  return { themeId, name, description, previewSwatches, colorTheme };
}

function safeNumberInRange(value, field, range) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw designError(`${field} must be a number.`);
  }
  if (value < range.min || value > range.max) {
    throw designError(`${field} is out of the allowed range (${range.min} to ${range.max}).`);
  }
  return value;
}

function normalizeFontFamilyIdentifier(value, field) {
  if (typeof value !== "string") throw designError(`${field} must be a supported font family identifier.`);
  const candidate = value.trim().toLowerCase();
  if (!SITE_DESIGN_FONT_FAMILY_ALLOWLIST.includes(candidate)) {
    throw designError(`${field} must reference a supported system font family.`);
  }
  return candidate;
}

function normalizeFontSizePx(value, field) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw designError(`${field} must be an integer pixel size.`);
  }
  if (value < SITE_DESIGN_FONT_SIZE_PX_RANGE.min || value > SITE_DESIGN_FONT_SIZE_PX_RANGE.max) {
    throw designError(`${field} is out of the allowed range (10 to 96).`);
  }
  return value;
}

function normalizeFontWeight(value, field) {
  if (!SITE_DESIGN_FONT_WEIGHTS.includes(value)) {
    throw designError(`${field} must be one of ${SITE_DESIGN_FONT_WEIGHTS.join(", ")}.`);
  }
  return value;
}

function normalizeTypographyStyle(style, field) {
  if (!isRecord(style)) throw designError(`${field} must be a style object.`);
  rejectUnknownKeys(style, SITE_DESIGN_TEXT_STYLE_KEYS, field);
  const normalized = {};
  for (const key of SITE_DESIGN_TEXT_STYLE_KEYS) {
    if (!Object.hasOwn(style, key)) throw designError(`${field}.${key} is required.`);
  }
  normalized.fontFamily = normalizeFontFamilyIdentifier(style.fontFamily, `${field}.fontFamily`);
  normalized.fontSizePx = normalizeFontSizePx(style.fontSizePx, `${field}.fontSizePx`);
  normalized.fontWeight = normalizeFontWeight(style.fontWeight, `${field}.fontWeight`);
  normalized.lineHeight = safeNumberInRange(style.lineHeight, `${field}.lineHeight`, SITE_DESIGN_LINE_HEIGHT_RANGE);
  normalized.letterSpacingEm = safeNumberInRange(
    style.letterSpacingEm,
    `${field}.letterSpacingEm`,
    SITE_DESIGN_LETTER_SPACING_EM_RANGE,
  );
  return normalized;
}

function normalizeTextThemePreset(preset, index) {
  if (!isRecord(preset)) throw designError(`textThemePresets[${index}] must be an object.`);
  rejectUnknownKeys(preset, SITE_DESIGN_TEXT_THEME_PRESET_KEYS, `textThemePresets[${index}]`);
  const textThemeId = safeThemeId(preset.textThemeId, `textThemePresets[${index}].textThemeId`);
  const name = localizedDesignText(preset.name, `textThemePresets[${index}].name`);
  const description = preset.description != null
    ? localizedDesignText(preset.description, `textThemePresets[${index}].description`)
    : { en: "", ar: "" };
  if (!isRecord(preset.styles)) throw designError(`textThemePresets[${index}].styles must be an object.`);
  rejectUnknownKeys(preset.styles, SITE_DESIGN_TEXT_STYLE_TOKENS, `textThemePresets[${index}].styles`);
  const styles = {};
  for (const token of SITE_DESIGN_TEXT_STYLE_TOKENS) {
    if (!Object.hasOwn(preset.styles, token)) {
      throw designError(`textThemePresets[${index}].styles.${token} is required.`);
    }
    styles[token] = normalizeTypographyStyle(preset.styles[token], `textThemePresets[${index}].styles.${token}`);
  }
  return { textThemeId, name, description, styles };
}

function normalizePatternIdentifier(value, field) {
  if (typeof value !== "string") throw designError(`${field} must be a supported pattern identifier.`);
  const candidate = value.trim().toLowerCase();
  if (!SITE_DESIGN_PAGE_BACKGROUND_PATTERNS.includes(candidate)) {
    throw designError(`${field} must be one of ${SITE_DESIGN_PAGE_BACKGROUND_PATTERNS.join(", ")}.`);
  }
  return candidate;
}

function normalizePatternOpacity(value, field, pattern) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw designError(`${field} must be a number.`);
  }
  const range = SITE_DESIGN_PAGE_BACKGROUND_OPACITY_RANGE;
  if (value < range.min || value > range.max) {
    throw designError(`${field} is out of the allowed range (${range.min} to ${range.max}).`);
  }
  if (pattern === "none" && value !== 0) {
    throw designError(`${field} must be 0 when the pattern is "none".`);
  }
  return value;
}

function normalizePageBackgroundBackground(background, field) {
  if (!isRecord(background)) throw designError(`${field} must be an object.`);
  rejectUnknownKeys(background, SITE_DESIGN_PAGE_BACKGROUND_KEYS, field);
  for (const key of SITE_DESIGN_PAGE_BACKGROUND_KEYS) {
    if (!Object.hasOwn(background, key)) throw designError(`${field}.${key} is required.`);
  }
  const pattern = normalizePatternIdentifier(background.pattern, `${field}.pattern`);
  return {
    pageColor: normalizeHexColor(background.pageColor, `${field}.pageColor`),
    contentColor: normalizeHexColor(background.contentColor, `${field}.contentColor`),
    pattern,
    patternColor: normalizeHexColor(background.patternColor, `${field}.patternColor`),
    patternOpacity: normalizePatternOpacity(background.patternOpacity, `${field}.patternOpacity`, pattern),
  };
}

function normalizePageBackgroundPreset(preset, index) {
  if (!isRecord(preset)) throw designError(`pageBackgroundPresets[${index}] must be an object.`);
  rejectUnknownKeys(preset, SITE_DESIGN_PAGE_BACKGROUND_PRESET_KEYS, `pageBackgroundPresets[${index}]`);
  for (const key of SITE_DESIGN_PAGE_BACKGROUND_PRESET_KEYS) {
    if (!Object.hasOwn(preset, key)) throw designError(`pageBackgroundPresets[${index}].${key} is required.`);
  }
  const pageBackgroundId = safeThemeId(preset.pageBackgroundId, `pageBackgroundPresets[${index}].pageBackgroundId`);
  const name = localizedDesignText(preset.name, `pageBackgroundPresets[${index}].name`);
  const description = localizedDesignText(preset.description, `pageBackgroundPresets[${index}].description`);
  const background = normalizePageBackgroundBackground(preset.background, `pageBackgroundPresets[${index}].background`);
  return { pageBackgroundId, name, description, background };
}

/**
 * Normalize and validate the `siteDesign` manifest section (themes, colors,
 * safe text theme presets, and page backgrounds). Returns null when the
 * section is absent. Throws SiteEditorValidationError on any unknown, unsafe,
 * or malformed value.
 */
export function normalizeSiteDesign(input) {
  if (input == null) return null;
  if (!isRecord(input)) throw designError("siteDesign must be a JSON object.");
  rejectUnknownKeys(input, SITE_DESIGN_TOP_LEVEL_KEYS, "siteDesign");

  const version = String(input.version ?? "").trim();
  if (!version) throw designError("siteDesign.version is required.");
  if (!VERSION_PATTERN.test(version)) throw designError("siteDesign.version is invalid.");

  const capabilities = normalizeCapabilities(input.capabilities);

  const rawPresets = Array.isArray(input.themePresets) ? input.themePresets : [];
  if (rawPresets.length > MAX_THEMES) throw designError("siteDesign declares too many theme presets.");
  const themePresets = rawPresets.map((preset, index) => normalizeThemePreset(preset, index));

  const seenIds = new Set();
  for (const preset of themePresets) {
    if (seenIds.has(preset.themeId)) throw designError(`Duplicate theme id: ${preset.themeId}.`);
    seenIds.add(preset.themeId);
  }

  let defaultThemeId = "";
  if (input.defaultThemeId != null) {
    defaultThemeId = safeThemeId(input.defaultThemeId, "defaultThemeId");
    if (!seenIds.has(defaultThemeId)) throw designError(`defaultThemeId references an unknown theme: ${defaultThemeId}.`);
  } else if (themePresets.length > 0) {
    throw designError("defaultThemeId is required when theme presets are declared.");
  }

  if (input.textThemePresets != null && !Array.isArray(input.textThemePresets)) {
    throw designError("siteDesign.textThemePresets must be an array.");
  }
  const rawTextPresets = Array.isArray(input.textThemePresets) ? input.textThemePresets : [];
  if (rawTextPresets.length > MAX_TEXT_THEMES) {
    throw designError("siteDesign declares too many text theme presets.");
  }
  const textThemePresets = rawTextPresets.map((preset, index) => normalizeTextThemePreset(preset, index));

  const seenTextIds = new Set();
  for (const preset of textThemePresets) {
    if (seenTextIds.has(preset.textThemeId)) throw designError(`Duplicate text theme id: ${preset.textThemeId}.`);
    seenTextIds.add(preset.textThemeId);
  }

  let defaultTextThemeId = "";
  if (input.defaultTextThemeId != null) {
    defaultTextThemeId = safeThemeId(input.defaultTextThemeId, "defaultTextThemeId");
    if (!seenTextIds.has(defaultTextThemeId)) {
      throw designError(`defaultTextThemeId references an unknown text theme: ${defaultTextThemeId}.`);
    }
  } else if (textThemePresets.length > 0) {
    throw designError("defaultTextThemeId is required when text theme presets are declared.");
  }

  if (input.pageBackgroundPresets != null && !Array.isArray(input.pageBackgroundPresets)) {
    throw designError("siteDesign.pageBackgroundPresets must be an array.");
  }
  const rawPageBackgroundPresets = Array.isArray(input.pageBackgroundPresets) ? input.pageBackgroundPresets : [];
  if (rawPageBackgroundPresets.length > MAX_PAGE_BACKGROUNDS) {
    throw designError("siteDesign declares too many page background presets.");
  }
  const pageBackgroundPresets = rawPageBackgroundPresets.map((preset, index) => normalizePageBackgroundPreset(preset, index));

  const seenPageBackgroundIds = new Set();
  for (const preset of pageBackgroundPresets) {
    if (seenPageBackgroundIds.has(preset.pageBackgroundId)) {
      throw designError(`Duplicate page background id: ${preset.pageBackgroundId}.`);
    }
    seenPageBackgroundIds.add(preset.pageBackgroundId);
  }

  let defaultPageBackgroundId = "";
  if (input.defaultPageBackgroundId != null) {
    defaultPageBackgroundId = safeThemeId(input.defaultPageBackgroundId, "defaultPageBackgroundId");
    if (!seenPageBackgroundIds.has(defaultPageBackgroundId)) {
      throw designError(`defaultPageBackgroundId references an unknown page background: ${defaultPageBackgroundId}.`);
    }
  } else if (pageBackgroundPresets.length > 0) {
    throw designError("defaultPageBackgroundId is required when page background presets are declared.");
  }

  return {
    version,
    capabilities,
    defaultThemeId,
    themePresets,
    defaultTextThemeId,
    textThemePresets,
    defaultPageBackgroundId,
    pageBackgroundPresets,
  };
}
