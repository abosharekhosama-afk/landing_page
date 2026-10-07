import React from "react";
import { ArrowLeft, RotateCcw, X } from "lucide-react";
import { getColorThemeValue, getPresetColorValue, SITE_DESIGN_COLOR_FIELDS, SITE_DESIGN_COLOR_GROUPS } from "../../utils/siteEditorDesign.js";
import DesignColorInput from "./DesignColorInput.jsx";

export default function ColorThemeView({ dispatch, language, state }) {
  const ar = language === "ar";
  const design = state.design;

  return <aside className="site-editor-panel site-editor-color-theme" id="site-editor-panel-site-design" aria-label={ar ? "ألوان الموقع" : "Color Theme"}>
    <header>
      <div>
        <button aria-label={ar ? "العودة إلى تصميم الموقع" : "Back to Site Design"} className="site-editor-design-back" onClick={() => dispatch({ type: "design-back" })} type="button"><ArrowLeft size={18} /></button>
        <h2>{ar ? "ألوان الموقع" : "Color Theme"}</h2>
      </div>
      <button aria-label={ar ? "إغلاق اللوحة" : "Close panel"} onClick={() => dispatch({ type: "close-site-design" })} type="button"><X size={18} /></button>
    </header>
    <div className="site-editor-design-body">
      <p className="site-editor-design-notice">{ar ? "معاينة فقط. ستتم إضافة حفظ تصميم الموقع في المرحلة القادمة." : "Preview only. Saving Site Design will be added in the next phase."}</p>
      <div className="site-editor-color-groups">
        {SITE_DESIGN_COLOR_GROUPS.map((group) => {
          const fields = SITE_DESIGN_COLOR_FIELDS.filter((field) => field.group === group.id);
          return <section className="site-editor-color-group" key={group.id}>
            <h3>{language === "ar" ? group.label.ar : group.label.en}</h3>
            <div className="site-editor-color-group-fields">
              {fields.map((field) => <DesignColorInput dispatch={dispatch} field={field} key={field.id} language={language} presetValue={getPresetColorValue(design.definition, design.currentThemeId, field.id)} value={getColorThemeValue(design.colorTheme, field.id) || "#000000"} />)}
            </div>
          </section>;
        })}
      </div>
      <div className="site-editor-design-actions">
        <button className="site-editor-design-reset" onClick={() => dispatch({ type: "design-reset-color-theme" })} type="button"><RotateCcw size={15} />{ar ? "استعادة ألوان السمة الحالية" : "Reset Color Theme"}</button>
      </div>
    </div>
  </aside>;
}
