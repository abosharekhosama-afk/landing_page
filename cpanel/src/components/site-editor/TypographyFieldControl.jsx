import React, { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { normalizeTypographyValue, SITE_DESIGN_FONT_FAMILY_MAP } from "../../utils/siteEditorDesign.js";

const FONT_FAMILY_LABELS = Object.freeze({
  "system-sans": { en: "System Sans", ar: "خط النظام" },
  arial: { en: "Arial", ar: "Arial" },
  georgia: { en: "Georgia", ar: "Georgia" },
  "times-new-roman": { en: "Times New Roman", ar: "Times New Roman" },
  verdana: { en: "Verdana", ar: "Verdana" },
  tahoma: { en: "Tahoma", ar: "Tahoma" },
  "trebuchet-ms": { en: "Trebuchet MS", ar: "Trebuchet MS" },
  "courier-new": { en: "Courier New", ar: "Courier New" },
});

const FONT_WEIGHT_LABELS = Object.freeze({
  300: { en: "300 Light", ar: "300 فاتح" },
  400: { en: "400 Regular", ar: "400 عادي" },
  500: { en: "500 Medium", ar: "500 متوسط" },
  600: { en: "600 Semi Bold", ar: "600 شبه عريض" },
  700: { en: "700 Bold", ar: "700 عريض" },
  800: { en: "800 Extra Bold", ar: "800 عريض جدًا" },
});

function selectLabel(field, optionValue, language) {
  if (field.property === "fontFamily") {
    const entry = FONT_FAMILY_LABELS[optionValue];
    if (entry) return entry[language] || entry.en;
    return optionValue;
  }
  const entry = FONT_WEIGHT_LABELS[optionValue];
  if (entry) return entry[language] || entry.en;
  return String(optionValue);
}

export default function TypographyFieldControl({ dispatch, field, language, presetValue, token, value }) {
  const ar = language === "ar";
  const label = field.label[language] || field.label.en;
  const id = `site-typo-${token}-${field.property}`;
  const modified = value != null && presetValue != null && value !== presetValue;
  const isSelect = field.type === "select";

  const selectValues = field.property === "fontFamily" ? Object.keys(SITE_DESIGN_FONT_FAMILY_MAP) : field.values || [];

  const [draft, setDraft] = useState(value == null ? "" : String(value));
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(value == null ? "" : String(value));
    setError("");
  }, [value]);

  const commit = (candidate) => {
    const normalized = normalizeTypographyValue(field.property, candidate);
    if (normalized == null) {
      setError(ar ? `أدخل قيمة بين ${field.min} و ${field.max}` : `Enter a value between ${field.min} and ${field.max}`);
      return;
    }
    setError("");
    setDraft(String(normalized));
    dispatch({ type: "design-update-typography-value", token, property: field.property, value: normalized });
  };

  const handleChange = (event) => {
    setDraft(event.target.value);
    setError("");
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit(draft);
    } else if (event.key === "Escape") {
      setDraft(value == null ? "" : String(value));
      setError("");
    }
  };

  const handleBlur = () => commit(draft);

  const handleSelectChange = (event) => {
    dispatch({ type: "design-update-typography-value", token, property: field.property, value: event.target.value });
  };

  const reset = () => {
    setDraft(presetValue == null ? "" : String(presetValue));
    setError("");
    dispatch({ type: "design-reset-typography-value", token, property: field.property });
  };

  const resetDisabled = value != null && presetValue != null && value === presetValue;

  return <div className={`site-editor-typo-field ${error ? "has-error" : ""} ${modified ? "is-modified" : ""}`}>
    <label className="site-editor-typo-label" htmlFor={id}>
      <span>{label}</span>
      {modified ? <span className="site-editor-typo-dot" aria-label={ar ? "معدل" : "Modified"} /> : null}
    </label>
    <div className="site-editor-typo-controls">
      {isSelect ? (
        <select aria-label={`${label} ${ar ? "قيمة" : "value"}`} className="site-editor-typo-select" id={id} onChange={handleSelectChange} value={value == null ? "" : String(value)}>
          {selectValues.map((option) => <option key={String(option)} value={String(option)}>{selectLabel(field, option, language)}</option>)}
        </select>
      ) : (
        <input aria-label={`${label} ${ar ? "قيمة" : "value"}`} className="site-editor-typo-input" id={id} max={field.max} min={field.min} onBlur={handleBlur} onChange={handleChange} onKeyDown={handleKeyDown} step={field.step} type="number" value={draft} />
      )}
      <button aria-label={ar ? `إعادة تعيين ${label}` : `Reset ${label}`} className="site-editor-typo-reset" disabled={resetDisabled} onClick={reset} type="button"><RotateCcw size={14} /></button>
    </div>
    {error ? <p className="site-editor-typo-error" role="alert">{error}</p> : null}
  </div>;
}