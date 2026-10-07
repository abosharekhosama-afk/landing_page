import React, { useState } from "react";
import { ArrowLeft, Check, Redo2, RotateCcw, SlidersHorizontal, Type, Undo2, X } from "lucide-react";
import { applyTextThemePreset, createTypographyCssVariables, textThemeIsCustomized } from "../../utils/siteEditorDesign.js";
import TypographyEditorView from "./TypographyEditorView.jsx";

export default function TextThemeLibraryView({ dispatch, language, state }) {
  const ar = language === "ar";
  const design = state.design;
  const presets = Array.isArray(design.definition?.textThemePresets) ? design.definition.textThemePresets : [];
  const currentTextThemeId = design.currentTextThemeId;
  const canUndo = design.textHistory.past.length > 0;
  const canRedo = design.textHistory.future.length > 0;
  const typographyEnabled = design.definition?.capabilities?.typography === true;
  const customized = typographyEnabled && textThemeIsCustomized(design.definition, currentTextThemeId, design.textThemeStyles);
  const canCustomize = typographyEnabled && !!currentTextThemeId && !!design.textThemeStyles;
  const [customizerOpen, setCustomizerOpen] = useState(false);

  if (customizerOpen && canCustomize) {
    return <TypographyEditorView dispatch={dispatch} language={language} onBack={() => setCustomizerOpen(false)} state={state} />;
  }

  return <aside className="site-editor-panel site-editor-text-theme-library" id="site-editor-panel-site-design" aria-label={ar ? "سمة الخطوط" : "Text Theme"}>
    <header>
      <div>
        <button aria-label={ar ? "العودة إلى تصميم الموقع" : "Back to Site Design"} className="site-editor-design-back" onClick={() => dispatch({ type: "design-back" })} type="button"><ArrowLeft size={18} /></button>
        <h2>{ar ? "سمة الخطوط" : "Text Theme"}</h2>
      </div>
      <button aria-label={ar ? "إغلاق اللوحة" : "Close panel"} onClick={() => dispatch({ type: "close-site-design" })} type="button"><X size={18} /></button>
    </header>
    <div className="site-editor-design-body">
      {canCustomize ? <button className={`site-editor-typo-customize ${customized ? "is-customized" : ""}`} onClick={() => setCustomizerOpen(true)} type="button"><SlidersHorizontal size={15} />{ar ? "تخصيص الخطوط" : "Customize Typography"}{customized ? <span className="site-editor-typo-customize-badge">{ar ? "مخصص" : "Customized"}</span> : null}</button> : null}
      <p className="site-editor-design-notice">{ar ? "معاينة فقط. ستتم إضافة حفظ تصميم الموقع في المرحلة القادمة." : "Preview only. Saving Site Design will be added in the next phase."}</p>
      {presets.length === 0 ? <div className="site-editor-panel-empty"><span><Type size={28} /></span><strong>{ar ? "لا تتوفر سمات خطوط لهذا الموقع." : "No text theme presets are available for this website."}</strong></div>
        : <ul className="site-editor-theme-list">
          {presets.map((preset) => {
            const active = preset.textThemeId === currentTextThemeId;
            const name = preset.name?.[language] || preset.name?.en || preset.textThemeId;
            const description = preset.description?.[language] || preset.description?.en || "";
            const applied = applyTextThemePreset(preset);
            const cssVars = applied ? createTypographyCssVariables(applied.textThemeStyles) : {};
            return <li key={preset.textThemeId}>
              <button aria-pressed={active} aria-current={active ? "true" : undefined} className={`site-editor-theme-card site-editor-text-card ${active ? "active" : ""}`} onClick={() => dispatch({ type: "design-apply-text-theme", textThemeId: preset.textThemeId })} type="button">
                <span className="site-editor-theme-copy">
                  <strong>{name}</strong>
                  {description ? <small>{description}</small> : null}
                </span>
                <span className="site-editor-theme-state">{active ? (<span className="site-editor-theme-current"><Check size={14} />{ar ? "الحالية" : "Current"}{customized ? <span className="site-editor-design-customized">{ar ? "مخصص" : "Customized"}</span> : null}</span>) : <span className="site-editor-theme-apply">{ar ? "تطبيق" : "Apply"}</span>}</span>
                <span className="site-editor-text-card-preview" style={cssVars}>
                  <span className="site-editor-text-preview-heading">{ar ? "عناية جميلة بتعبير واضح" : "Beautiful care, clearly expressed"}</span>
                  <span className="site-editor-text-preview-body">{ar ? "خطوط متناسقة لجميع أجزاء موقعك." : "Thoughtful typography for every part of your website."}</span>
                </span>
              </button>
            </li>;
          })}
        </ul>}
      <div className="site-editor-design-actions">
        <div className="site-editor-text-theme-actions">
          <button disabled={!canUndo} onClick={() => dispatch({ type: "design-undo-text-theme" })} type="button"><Undo2 size={15} />{ar ? "التراجع عن تغيير الخط" : "Undo Text Theme"}</button>
          <button disabled={!canRedo} onClick={() => dispatch({ type: "design-redo-text-theme" })} type="button"><Redo2 size={15} />{ar ? "إعادة تغيير الخط" : "Redo Text Theme"}</button>
        </div>
        <button className="site-editor-design-reset" onClick={() => dispatch({ type: "design-reset-text-theme" })} type="button"><RotateCcw size={15} />{ar ? "استعادة الافتراضي" : "Reset to Default"}</button>
      </div>
    </div>
  </aside>;
}
