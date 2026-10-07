import React from "react";
import { AlertTriangle, FileWarning, LoaderCircle } from "lucide-react";
import { siteEditorZoomScale } from "../../utils/siteEditor.js";
import { sectionMoveAvailability } from "../../utils/siteEditorDocument.js";
import EditableSection from "./EditableSection.jsx";

export default function EditablePageCanvas({ document, language, onAction, onCommitText, onSelect, state }) {
  const ar = language === "ar";
  if (state.documentStatus === "loading") return <div className="site-editor-document-state" role="status"><LoaderCircle className="spin" /><strong>{ar ? "جارٍ تحميل الصفحة…" : "Loading page document…"}</strong></div>;
  if (state.documentStatus === "error") return <div className="site-editor-document-state error" role="alert"><AlertTriangle /><strong>{ar ? "تعذر تحميل مستند الصفحة" : "Page document could not be loaded"}</strong><p>{state.documentError}</p></div>;
  if (!document) return <div className="site-editor-document-state"><FileWarning /><strong>{ar ? "لا يوجد مستند قابل للتحرير" : "No editable document"}</strong></div>;
  const scale = siteEditorZoomScale(state.zoom);
  return <div className={`site-editor-editable-stage viewport-${state.viewportMode}`} onClick={() => onSelect(null)}>
    <div className="site-editor-editable-page" style={{ "--site-editor-document-scale": scale }}>
      {document.sections.map((section) => <EditableSection key={section.id} language={language} onAction={onAction} onCommitText={onCommitText} onSelect={onSelect} section={section} sectionMoves={sectionMoveAvailability(document, section.id)} state={state} viewportMode={state.viewportMode} />)}
    </div>
  </div>;
}
