import React from "react";
import { editorNodeStyles } from "../../utils/siteEditorDocument.js";
import ElementContextToolbar from "./ElementContextToolbar.jsx";
import TextEditor from "./TextEditor.jsx";

function cssStyles(styles, type) {
  const result = {};
  if (styles.alignment) result.textAlign = styles.alignment;
  if (styles.backgroundColor) result.backgroundColor = styles.backgroundColor;
  if (styles.color) result.color = styles.color;
  if (styles.fontSize != null) result.fontSize = `${styles.fontSize}px`;
  if (styles.fontWeight != null) result.fontWeight = styles.fontWeight;
  if (styles.lineHeight != null) result.lineHeight = styles.lineHeight;
  if (styles.borderRadius != null) result.borderRadius = `${styles.borderRadius}px`;
  if (styles.width != null) result.width = `${styles.width}%`;
  if (styles.padding != null) result.padding = `${styles.padding}px`;
  if (styles.paddingBlock != null) result.paddingBlock = `${styles.paddingBlock}px`;
  if (styles.paddingInline != null) result.paddingInline = `${styles.paddingInline}px`;
  if (type === "container" && styles.contentAlignment) result.alignItems = styles.contentAlignment === "start" ? "flex-start" : styles.contentAlignment === "end" ? "flex-end" : "center";
  return result;
}

export default function EditableElement({ language, node, onAction, onCommitText, onSelect, selected, state, viewportMode }) {
  const styles = editorNodeStyles(node, viewportMode);
  const common = {
    className: `site-editor-element site-editor-element-${node.type} ${selected ? "selected" : ""}`,
    "data-node-id": node.id,
    onClick: (event) => { event.stopPropagation(); onSelect(node.id); },
    onDoubleClick: (event) => { if (!state.readOnly && ["heading", "text", "button"].includes(node.type)) { event.stopPropagation(); onAction("edit-text", node); } },
    style: cssStyles(styles, node.type),
  };
  const content = node.type === "heading" ? <h1>{node.content?.text}</h1>
    : node.type === "text" ? <p>{node.content?.text}</p>
      : node.type === "button" ? <button onClick={(event) => event.preventDefault()} type="button">{node.content?.label}</button>
        : node.type === "image" ? <img alt={node.content?.alt || ""} src={node.content?.src} style={{ borderRadius: `${styles.borderRadius || 0}px`, objectFit: styles.objectFit || "cover", width: "100%" }} />
          : <div className="site-editor-container-children">{(node.children || []).map((child) => <EditableElement key={child.id} language={language} node={child} onAction={(action, target = child) => onAction(action, target)} onCommitText={onCommitText} onSelect={onSelect} selected={state.selectedNodeId === child.id} state={state} viewportMode={viewportMode} />)}</div>;
  return <div {...common}>
    {selected && <span className="site-editor-element-label">{node.type}</span>}
    {selected && <ElementContextToolbar disabledAll={state.readOnly} language={language} node={node} onAction={(action) => onAction(action, node)} sectionMoves={{ canMoveUp: false, canMoveDown: false }} />}
    {content}
    {selected && node.type === "image" && <span className="site-editor-resize-handles" aria-hidden="true"><i /><i /><i /><i /></span>}
    {state.editingNodeId === node.id && <TextEditor language={language} node={node} onCancel={() => onAction("cancel-edit", node)} onCommit={(value) => onCommitText(node.id, value)} />}
  </div>;
}
