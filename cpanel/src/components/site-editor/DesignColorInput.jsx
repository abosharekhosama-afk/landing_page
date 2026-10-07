import React, { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { normalizeHexColor } from "../../utils/siteEditorDesign.js";

export default function DesignColorInput({ dispatch, field, language, presetValue, value }) {
  const ar = language === "ar";
  const label = field.label[language] || field.label.en;
  const [draft, setDraft] = useState(value || "");
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(value || "");
    setError("");
  }, [value]);

  const commit = (candidate) => {
    const normalized = normalizeHexColor(candidate);
    if (!normalized) {
      setError(ar ? "أدخل لونًا سداسيًا صالحًا مثل #2156a8" : "Enter a valid hex color like #2156a8");
      return;
    }
    setError("");
    setDraft(normalized);
    dispatch({ type: "design-update-color", fieldId: field.id, value: normalized });
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
      setDraft(value || "");
      setError("");
    }
  };

  const handleBlur = () => {
    commit(draft);
  };

  const handlePickerChange = (event) => {
    const normalized = normalizeHexColor(event.target.value);
    if (!normalized) return;
    setDraft(normalized);
    setError("");
    dispatch({ type: "design-update-color", fieldId: field.id, value: normalized });
  };

  const reset = () => {
    setDraft(presetValue || value || "");
    setError("");
    dispatch({ type: "design-reset-color", fieldId: field.id });
  };

  const resetDisabled = presetValue != null && value === presetValue;

  return <div className={`site-editor-color-field ${error ? "has-error" : ""}`}>
    <label className="site-editor-color-label" htmlFor={`site-color-${field.id}`}>{label}</label>
    <div className="site-editor-color-controls">
      <input aria-label={`${label} ${ar ? "منتقي اللون" : "color picker"}`} className="site-editor-color-picker" id={`site-color-${field.id}`} onChange={handlePickerChange} type="color" value={value || "#000000"} />
      <span aria-hidden="true" className="site-editor-color-swatch" style={{ backgroundColor: value || "#000000" }} />
      <input aria-label={`${label} ${ar ? "قيمة سداسية" : "hex value"}`} className="site-editor-color-text" onBlur={handleBlur} onChange={handleChange} onKeyDown={handleKeyDown} spellCheck="false" type="text" value={draft} />
      <button aria-label={ar ? `إعادة تعيين ${label}` : `Reset ${label}`} className="site-editor-color-reset" disabled={resetDisabled} onClick={reset} type="button"><RotateCcw size={14} /></button>
    </div>
    {error ? <p className="site-editor-color-error" role="alert">{error}</p> : null}
  </div>;
}
