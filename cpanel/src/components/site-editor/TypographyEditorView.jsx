import React, { useState } from "react";
import { ArrowLeft, Check, Redo2, RotateCcw, SlidersHorizontal, Undo2, X } from "lucide-react";
import TypographyFieldControl from "./TypographyFieldControl.jsx";
import {
  getCurrentTextThemePreset, getPresetTypographyValue, getTypographyValue,
  SITE_DESIGN_TEXT_STYLE_TOKENS, SITE_DESIGN_TYPOGRAPHY_FIELDS, textThemeIsCustomized,
} from "../../utils/siteEditorDesign.js";

const TOKEN_LABELS = Object.freeze({
  display: { en: "Display", ar: "العنوان البارز" },
  heading1: { en: "Heading 1", ar: "العنوان الأول" },
  heading2: { en: "Heading 2", ar: "العنوان الثاني" },
  heading3: { en: "Heading 3", ar: "العنوان الثالث" },
  body: { en: "Body Text", ar: "النص الأساسي" },
  small: { en: "Small Text", ar: "النص الصغير" },
  button: { en: "Button Text", ar: "نص الزر" },
});

export default function TypographyEditorView({ dispatch, language, onBack, state }) {
  const ar = language === "ar";
  const design = state.design;
  const definition = design.definition;
  const currentTextThemeId = design.currentTextThemeId;
  const styles = design.textThemeStyles;
  const [selectedToken, setSelectedToken] = useState("body");

  const preset = getCurrentTextThemePreset(definition, currentTextThemeId);
  const themeName = preset?.name?.[language] || preset?.name?.en || currentTextThemeId;
  const customized = textThemeIsCustomized(definition, currentTextThemeId, styles);
  const canUndo = design.textHistory.past.length > 0;
  const canRedo = design.textHistory.future.length > 0;

  const tokenModified = (token) => SITE_DESIGN_TYPOGRAPHY_FIELDS.some((field) => {
    const value = getTypographyValue(styles, token, field.property);
    const presetValue = getPresetTypographyValue(definition, currentTextThemeId, token, field.property);
    return value != null && presetValue != null && value !== presetValue;
  });

  const selectedTokenModified = tokenModified(selectedToken);

  return <aside className="site-editor-panel site-editor-typo-editor" id="site-editor-panel-site-design" aria-label={ar ? "تخصيص الخطوط" : "Customize Typography"}>
    <header>
      <div>
        <button aria-label={ar ? "العودة إلى سمات الخطوط" : "Back to text themes"} className="site-editor-design-back" onClick={onBack} type="button"><ArrowLeft size={18} /></button>
        <h2><SlidersHorizontal size={15} />{ar ? "تخصيص الخطوط" : "Customize Typography"}</h2>
      </div>
      <button aria-label={ar ? "إغلاق اللوحة" : "Close panel"} onClick={() => dispatch({ type: "close-site-design" })} type="button"><X size={18} /></button>
    </header>
    <div className="site-editor-design-body">
      <p className="site-editor-design-notice">{ar ? "معاينة فقط. ستتم إضافة حفظ تصميم الموقع في المرحلة القادمة." : "Preview only. Saving Site Design will be added in the next phase."}</p>
      <div className="site-editor-typo-theme">
        <span className="site-editor-typo-theme-name">{ar ? "السمة الحالية" : "Current theme"}: <strong>{themeName}</strong></span>
        {customized ? <span className="site-editor-design-customized">{ar ? "مخصص" : "Customized"}</span> : null}
      </div>
      <div className="site-editor-typo-tokens" role="tablist" aria-label={ar ? "أنماط النص" : "Text styles"}>
        {SITE_DESIGN_TEXT_STYLE_TOKENS.map((token) => {
          const labels = TOKEN_LABELS[token];
          const active = selectedToken === token;
          return <button aria-current={active ? "true" : undefined} aria-pressed={active} className={`site-editor-typo-token ${active ? "active" : ""}`} key={token} onClick={() => setSelectedToken(token)} role="tab" type="button">
            <span>{ar ? labels.ar : labels.en}</span>
            {tokenModified(token) ? <span className="site-editor-typo-dot" aria-label={ar ? "معدل" : "Modified"} /> : null}
          </button>;
        })}
      </div>
      <section className="site-editor-typo-section" aria-label={ar ? TOKEN_LABELS[selectedToken].ar : TOKEN_LABELS[selectedToken].en}>
        <div className="site-editor-typo-section-head">
          <strong>{ar ? TOKEN_LABELS[selectedToken].ar : TOKEN_LABELS[selectedToken].en}</strong>
          <button className="site-editor-typo-token-reset" disabled={!selectedTokenModified} onClick={() => dispatch({ type: "design-reset-typography-token", token: selectedToken })} type="button"><RotateCcw size={13} />{ar ? "استعادة إعدادات هذا النص" : "Reset This Text Style"}</button>
        </div>
        <div className="site-editor-typo-fields">
          {SITE_DESIGN_TYPOGRAPHY_FIELDS.map((field) => (
            <TypographyFieldControl
              dispatch={dispatch}
              field={field}
              key={field.property}
              language={language}
              presetValue={getPresetTypographyValue(definition, currentTextThemeId, selectedToken, field.property)}
              token={selectedToken}
              value={getTypographyValue(styles, selectedToken, field.property)}
            />
          ))}
        </div>
      </section>
      <div className="site-editor-design-actions">
        <div className="site-editor-typo-history">
          <button disabled={!canUndo} onClick={() => dispatch({ type: "design-undo-text-theme" })} type="button"><Undo2 size={15} />{ar ? "التراجع عن تعديل الخط" : "Undo Typography Change"}</button>
          <button disabled={!canRedo} onClick={() => dispatch({ type: "design-redo-text-theme" })} type="button"><Redo2 size={15} />{ar ? "إعادة تعديل الخط" : "Redo Typography Change"}</button>
        </div>
        <button className="site-editor-design-reset" disabled={!customized} onClick={() => dispatch({ type: "design-reset-typography-customization" })} type="button"><Check size={15} />{ar ? "استعادة جميع التخصيصات" : "Reset All Customization"}</button>
      </div>
    </div>
  </aside>;
}