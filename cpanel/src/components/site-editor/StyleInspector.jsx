import React from "react";
import { X } from "lucide-react";
import { editorNodeStyles } from "../../utils/siteEditorDocument.js";

function Field({ children, label }) { return <label className="site-editor-inspector-field"><span>{label}</span>{children}</label>; }
function NumberField({ label, max = 2000, min = 0, onChange, value }) { return <Field label={label}><input max={max} min={min} onChange={(event) => onChange(Number(event.target.value))} type="number" value={value ?? ""} /></Field>; }
function ColorField({ label, onChange, value }) { return <Field label={label}><input onChange={(event) => onChange(event.target.value)} type="color" value={/^#[0-9a-f]{6}$/i.test(value || "") ? value : "#000000"} /></Field>; }

export default function StyleInspector({ isSection, language, node, onClose, onImageSettings, onLink, onStyle, onText, viewportMode }) {
  if (!node) return null;
  const ar = language === "ar";
  const styles = editorNodeStyles(node, viewportMode);
  const textType = ["heading", "text"].includes(node.type);
  const button = node.type === "button";
  const image = node.type === "image";
  const box = isSection || node.type === "container";
  return <aside className="site-editor-inspector" aria-label={ar ? "خصائص العنصر" : "Element inspector"}>
    <header><div><strong>{ar ? "خصائص" : "Inspector"}</strong><small>{node.type} · {viewportMode}</small></div><button aria-label={ar ? "إغلاق" : "Close inspector"} onClick={onClose} type="button"><X size={17} /></button></header>
    <div className="site-editor-inspector-body">
      {(textType || button) && <Field label={ar ? "النص" : button ? "Label" : "Text"}><textarea onBlur={(event) => onText(event.target.value)} defaultValue={button ? node.content?.label : node.content?.text} /></Field>}
      {(textType || button) && <><Field label={ar ? "المحاذاة" : "Alignment"}><select onChange={(event) => onStyle("alignment", event.target.value)} value={styles.alignment || "start"}><option value="start">{ar ? "بداية" : "Start"}</option><option value="center">{ar ? "وسط" : "Center"}</option><option value="end">{ar ? "نهاية" : "End"}</option></select></Field>{textType && <><NumberField label={ar ? "حجم الخط" : "Font size"} max={180} min={10} onChange={(value) => onStyle("fontSize", value)} value={styles.fontSize} /><NumberField label={ar ? "وزن الخط" : "Font weight"} max={900} min={100} onChange={(value) => onStyle("fontWeight", value)} value={styles.fontWeight} /><NumberField label={ar ? "ارتفاع السطر" : "Line height"} max={3} min={0.8} onChange={(value) => onStyle("lineHeight", value)} value={styles.lineHeight} /></>}<ColorField label={ar ? "لون النص" : "Text color"} onChange={(value) => onStyle("color", value)} value={styles.color} /></>}
      {button && <><ColorField label={ar ? "لون الخلفية" : "Background"} onChange={(value) => onStyle("backgroundColor", value)} value={styles.backgroundColor} /><NumberField label={ar ? "استدارة الحواف" : "Corner radius"} max={999} onChange={(value) => onStyle("borderRadius", value)} value={styles.borderRadius} /><Field label={ar ? "الرابط" : "Link"}><input defaultValue={node.content?.link || ""} onBlur={(event) => onLink(event.target.value)} type="text" /></Field></>}
      {image && <><Field label={ar ? "النص البديل" : "Alt text"}><input defaultValue={node.content?.alt || ""} onBlur={(event) => onImageSettings({ alt: event.target.value })} type="text" /></Field><NumberField label={ar ? "العرض %" : "Width %"} max={100} min={5} onChange={(value) => onStyle("width", value)} value={styles.width} /><Field label={ar ? "وضع الارتفاع" : "Height mode"}><select onChange={(event) => onStyle("heightMode", event.target.value)} value={styles.heightMode || "auto"}><option value="auto">Auto</option><option value="fixed">Fixed</option><option value="cover">Cover</option></select></Field><Field label={ar ? "ملاءمة الصورة" : "Object fit"}><select onChange={(event) => onStyle("objectFit", event.target.value)} value={styles.objectFit || "cover"}><option value="cover">Cover</option><option value="contain">Contain</option><option value="fill">Fill</option></select></Field><NumberField label={ar ? "استدارة الحواف" : "Corner radius"} max={999} onChange={(value) => onStyle("borderRadius", value)} value={styles.borderRadius} /><Field label={ar ? "الرابط" : "Link"}><input defaultValue={node.content?.link || ""} onBlur={(event) => onImageSettings({ link: event.target.value })} type="text" /></Field></>}
      {box && <><ColorField label={ar ? "لون الخلفية" : "Background"} onChange={(value) => onStyle("backgroundColor", value)} value={styles.backgroundColor} /><NumberField label={ar ? "المسافة الرأسية" : "Vertical spacing"} max={240} onChange={(value) => onStyle("paddingBlock", value)} value={styles.paddingBlock} /><NumberField label={ar ? "المسافة الأفقية" : "Horizontal spacing"} max={240} onChange={(value) => onStyle("paddingInline", value)} value={styles.paddingInline} /><Field label={ar ? "محاذاة المحتوى" : "Content alignment"}><select onChange={(event) => onStyle("contentAlignment", event.target.value)} value={styles.contentAlignment || "center"}><option value="start">{ar ? "بداية" : "Start"}</option><option value="center">{ar ? "وسط" : "Center"}</option><option value="end">{ar ? "نهاية" : "End"}</option></select></Field></>}
      <p className="site-editor-responsive-note">{viewportMode === "mobile" ? (ar ? "هذه القيم تتجاوز إعدادات الجوال فقط." : "These values override Mobile only.") : (ar ? "هذه هي القيم الأساسية لسطح المكتب." : "These are the base Desktop values.")}</p>
    </div>
  </aside>;
}
