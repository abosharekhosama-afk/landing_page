import React from "react";
import { Lock, X } from "lucide-react";
import { siteEditorText } from "../../utils/siteEditor.js";
import { quickEditSectionFields } from "../../utils/siteEditorQuickEdit.js";

function useDraftCommit(externalValue, onCommit) {
  const [current, setCurrent] = React.useState(externalValue);
  const syncedRef = React.useRef(externalValue);
  React.useEffect(() => {
    if (externalValue !== syncedRef.current) {
      syncedRef.current = externalValue;
      setCurrent(externalValue);
    }
  }, [externalValue]);
  const commit = () => {
    if (current === syncedRef.current) return;
    onCommit(current);
  };
  return [current, setCurrent, commit];
}

function Label({ children }) { return <span className="site-editor-quick-label">{children}</span>; }

function Field({ children, editable, field, language, selected }) {
  return <div className={`site-editor-quick-field ${editable ? "" : "read-only"} ${selected ? "focused" : ""}`} data-quick-edit-node-id={field.nodeId} data-quick-edit-field={field.styleKey || field.contentKey || field.kind}>
    <div className="site-editor-quick-field-head"><Label>{siteEditorText(field.labelKey, language)}</Label>{!editable && <span className="site-editor-quick-badge"><Lock size={10} /><span>{siteEditorText("quickEdit.readOnly", language)}</span></span>}</div>
    {children}
  </div>;
}

function ImageField({ ar, disabled, field, language, onImage }) {
  return <div className="site-editor-quick-image">
    {field.value ? <img alt="" src={field.value} /> : <span className="site-editor-quick-image-empty" />}
    <button disabled={disabled} onClick={() => onImage(field.nodeId)} type="button">{siteEditorText("quickEdit.change", language)}</button>
  </div>;
}

function DraftText({ disabled, externalValue, onCommit }) {
  const [current, setCurrent, commit] = useDraftCommit(externalValue, onCommit);
  return <input disabled={disabled} onBlur={commit} onChange={(event) => setCurrent(event.target.value)} type="text" value={current} />;
}

function DraftArea({ disabled, externalValue, onCommit }) {
  const [current, setCurrent, commit] = useDraftCommit(externalValue, onCommit);
  return <textarea disabled={disabled} onBlur={commit} onChange={(event) => setCurrent(event.target.value)} value={current} />;
}

function DraftListItem({ disabled, externalValue, onCommit }) {
  const [current, setCurrent, commit] = useDraftCommit(externalValue, onCommit);
  return <input className="site-editor-quick-list-item" disabled={disabled} onBlur={commit} onChange={(event) => setCurrent(event.target.value)} type="text" value={current} />;
}

export default function QuickEditPanel({ language, onClose, onImage, onImageSettings, onLink, onList, onStyle, onText, readOnly, section, state, viewportMode }) {
  const ar = language === "ar";
  const bodyRef = React.useRef(null);
  const fields = quickEditSectionFields(section, { readOnly, viewportMode });

  React.useEffect(() => {
    if (!state.selectedNodeId || !bodyRef.current) return;
    const nodeId = CSS.escape(String(state.selectedNodeId).replace(/^"(.*)"$/, "$1"));
    const target = bodyRef.current.querySelector(`[data-quick-edit-node-id="${nodeId}"]`);
    target?.scrollIntoView({ block: "nearest" });
  }, [state.selectedNodeId]);

  const renderField = (field) => {
    const disabled = readOnly || !field.editable;
    const selected = state.selectedNodeId === field.nodeId;
    if (field.kind === "color") {
      const value = /^#[0-9a-f]{6}$/i.test(field.value || "") ? field.value : "#000000";
      return <Field editable={field.editable} field={field} language={language} selected={selected}><input disabled={disabled} onChange={(event) => /^#[0-9a-f]{6}$/i.test(event.target.value) && onStyle(field.nodeId, field.styleKey, event.target.value)} type="color" value={value} /></Field>;
    }
    if (field.kind === "number") {
      return <Field editable={field.editable} field={field} language={language} selected={selected}><input disabled={disabled} max={field.max} min={field.min} onChange={(event) => { if (event.target.value === "") return; const number = Number(event.target.value); if (Number.isFinite(number)) onStyle(field.nodeId, field.styleKey, number); }} type="number" value={field.value ?? ""} /></Field>;
    }
    if (field.kind === "alignment") {
      return <Field editable={field.editable} field={field} language={language} selected={selected}><select disabled={disabled} onChange={(event) => onStyle(field.nodeId, field.styleKey, event.target.value)} value={field.value || "start"}><option value="start">{ar ? "بداية" : "Start"}</option><option value="center">{ar ? "وسط" : "Center"}</option><option value="end">{ar ? "نهاية" : "End"}</option></select></Field>;
    }
    if (field.kind === "textarea") {
      return <Field editable={field.editable} field={field} language={language} selected={selected}><DraftArea disabled={disabled} externalValue={field.value ?? ""} onCommit={(value) => onText(field.nodeId, value)} /></Field>;
    }
    if (field.kind === "text") {
      const commit = field.contentKey === "alt"
        ? (value) => onImageSettings(field.nodeId, { alt: value })
        : field.nodeType === "image"
          ? (value) => onImageSettings(field.nodeId, { link: value })
          : (value) => onText(field.nodeId, value);
      return <Field editable={field.editable} field={field} language={language} selected={selected}><DraftText disabled={disabled} externalValue={field.value ?? ""} onCommit={commit} /></Field>;
    }
    if (field.kind === "link") {
      return <Field editable={field.editable} field={field} language={language} selected={selected}><DraftText disabled={disabled} externalValue={field.value ?? ""} onCommit={(value) => onLink(field.nodeId, value)} /></Field>;
    }
    if (field.kind === "image") {
      return <Field editable={field.editable} field={field} language={language} selected={selected}><ImageField ar={ar} disabled={disabled} field={field} language={language} onImage={onImage} /></Field>;
    }
    if (field.kind === "collection") {
      const detail = [
        field.source,
        field.limit != null ? `${siteEditorText("quickEdit.limit", language)} ${field.limit}` : "",
        field.order != null ? `${siteEditorText("quickEdit.order", language)} ${field.order}` : "",
      ].filter(Boolean).join(" · ");
      return <Field editable={false} field={field} language={language} selected={selected}><div className="site-editor-quick-summary">{detail || field.nodeType}</div></Field>;
    }
    if (field.kind === "list") {
      const items = Array.isArray(field.items) ? field.items : [];
      if (field.editable) {
        return <Field editable={field.editable} field={field} language={language} selected={selected}>
          <div className="site-editor-quick-list editable">{items.length ? items.map((item, index) => <DraftListItem key={`${field.nodeId}-${index}`} disabled={disabled} externalValue={item} onCommit={(value) => onList(field.nodeId, items.map((existing, itemIndex) => (itemIndex === index ? value : existing)))} />) : <div className="site-editor-quick-summary">—</div>}</div>
        </Field>;
      }
      return <Field editable={field.editable} field={field} language={language} selected={selected}><div className="site-editor-quick-list">{items.length ? items.map((row, index) => <span key={`${field.nodeId}-${index}`}>{row}</span>) : <div className="site-editor-quick-summary">—</div>}</div></Field>;
    }
    return <Field editable={false} field={field} language={language} selected={selected}><div className="site-editor-quick-summary">{field.summary || field.nodeType}</div></Field>;
  };

  return <aside className="site-editor-quick-edit-panel" aria-label={siteEditorText("quickEdit.panelTitle", language)}>
    <header><div><strong>{siteEditorText("quickEdit.panelTitle", language)}</strong><small>{section.type}</small></div><button aria-label={ar ? "إغلاق التحرير السريع" : "Close quick edit"} onClick={onClose} type="button"><X size={17} /></button></header>
    <div className="site-editor-quick-edit-body" ref={bodyRef}>
      {readOnly && <p className="site-editor-quick-note">{ar ? "لديك صلاحية عرض فقط — الحقول معطّلة." : "You have read-only access — fields are disabled."}</p>}
      {fields.map((field) => <div className="site-editor-quick-field-wrap" key={`${field.nodeId}-${field.kind}-${field.styleKey || field.contentKey || ""}`}>{renderField(field)}</div>)}
    </div>
  </aside>;
}
