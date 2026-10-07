import React from "react";
import EditablePageCanvas from "./EditablePageCanvas.jsx";
import { createDesignCssVariables, createTypographyCssVariables } from "../../utils/siteEditorDesign.js";

export default function SiteEditorCanvas({ document, language, onAction, onCommitText, onSelect, state }) {
  const designVariables = { ...createDesignCssVariables(state.design?.colorTheme), ...createTypographyCssVariables(state.design?.textThemeStyles) };
  return <section className={`site-editor-canvas viewport-${state.viewportMode}`} style={designVariables} aria-label={language === "ar" ? "لوحة تحرير الموقع" : "Editable website canvas"}>
    <div className="site-editor-canvas-scroll"><EditablePageCanvas document={document} language={language} onAction={onAction} onCommitText={onCommitText} onSelect={onSelect} state={state} /></div>
  </section>;
}