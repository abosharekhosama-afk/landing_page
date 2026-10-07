import React from "react";
import { Pencil } from "lucide-react";
import { editorNodeStyles } from "../../utils/siteEditorDocument.js";
import EditableElement from "./EditableElement.jsx";
import ElementContextToolbar from "./ElementContextToolbar.jsx";

export default function EditableSection({ language, onAction, onCommitText, onSelect, section, sectionMoves, state, viewportMode }) {
  const ar = language === "ar";
  const selected = state.selectedNodeId === section.id;
  const quickEditing = state.quickEdit === section.id;
  const quickEditOpen = Boolean(state.quickEdit);
  const styles = editorNodeStyles(section, viewportMode);
  const sectionStyle = {
    backgroundColor: styles.backgroundColor || "var(--site-bg-secondary, #f4f1eb)",
    paddingBlock: `${styles.paddingBlock ?? 48}px`, paddingInline: `${styles.paddingInline ?? 48}px`,
    alignItems: styles.contentAlignment === "start" ? "flex-start" : styles.contentAlignment === "center" ? "center" : "flex-end",
  };
  return <section className={`site-editor-editable-section type-${section.type} ${selected ? "selected" : ""} ${quickEditing ? "quick-editing" : ""}`} data-section-id={section.id} onClick={(event) => { event.stopPropagation(); onSelect(section.id, section.id, quickEditOpen ? null : "section"); }} style={sectionStyle}>
    <span className="site-editor-section-label">{section.type}</span>
    {selected && <ElementContextToolbar disabledAll={state.readOnly} language={language} node={{ ...section, type: "section" }} onAction={(action) => onAction(action, section)} sectionMoves={sectionMoves} />}
    {(section.elements || []).map((element) => <EditableElement key={element.id} language={language} node={element} onAction={onAction} onCommitText={onCommitText} onSelect={(nodeId) => onSelect(nodeId, section.id, quickEditOpen ? null : element.type)} selected={state.selectedNodeId === element.id} state={state} viewportMode={viewportMode} />)}
    <button aria-label={ar ? "تعديل سريع" : "Quick Edit"} className="site-editor-quick-edit-trigger" onClick={(event) => { event.stopPropagation(); onAction("quick-edit", section); }} type="button"><Pencil size={12} /><span>{ar ? "تعديل سريع" : "Quick Edit"}</span></button>
  </section>;
}
