import React from "react";
import { ArrowDown, ArrowUp, CircleHelp, ImagePlus, Link2, Palette, Settings2, Type } from "lucide-react";

function Action({ disabled = false, icon: Icon, label, onClick }) {
  return <button aria-label={label} disabled={disabled} onClick={(event) => { event.stopPropagation(); onClick?.(); }} title={label} type="button"><Icon size={16} /><span>{label}</span></button>;
}

export default function ElementContextToolbar({ disabledAll = false, language, node, onAction, sectionMoves }) {
  const ar = language === "ar";
  const help = ar ? "مساعدة (قريباً)" : "Help (coming later)";
  if (node.type === "section" || ["hero", "content"].includes(node.type)) return <div className="site-editor-context-toolbar" role="toolbar" aria-label={ar ? "أدوات القسم" : "Section tools"}>
    <Action disabled={disabledAll || !sectionMoves.canMoveUp} icon={ArrowUp} label={ar ? "تحريك لأعلى" : "Move Up"} onClick={() => onAction("move-up")} />
    <Action disabled={disabledAll || !sectionMoves.canMoveDown} icon={ArrowDown} label={ar ? "تحريك لأسفل" : "Move Down"} onClick={() => onAction("move-down")} />
    <Action disabled={disabledAll} icon={Settings2} label={ar ? "إعدادات القسم" : "Section Settings"} onClick={() => onAction("settings")} />
    <Action disabled icon={Palette} label={ar ? "تصميم القسم (قريباً)" : "Section Design (coming later)"} />
  </div>;
  if (node.type === "image") return <div className="site-editor-context-toolbar" role="toolbar" aria-label={ar ? "أدوات الصورة" : "Image tools"}>
    <Action disabled={disabledAll} icon={ImagePlus} label={ar ? "تغيير الصورة" : "Change Image"} onClick={() => onAction("change-image")} />
    <Action disabled={disabledAll} icon={Settings2} label={ar ? "إعدادات الصورة" : "Image Settings"} onClick={() => onAction("settings")} />
    <Action disabled={disabledAll} icon={Link2} label={ar ? "رابط" : "Link"} onClick={() => onAction("settings")} />
    <Action disabled icon={Palette} label={ar ? "تحرير الصورة (قريباً)" : "Edit Image (coming later)"} />
    <Action disabled icon={CircleHelp} label={help} />
  </div>;
  return <div className="site-editor-context-toolbar" role="toolbar" aria-label={ar ? "أدوات النص" : "Text tools"}>
    {["heading", "text", "button"].includes(node.type) && <Action disabled={disabledAll} icon={Type} label={ar ? "تحرير النص" : "Edit Text"} onClick={() => onAction("edit-text")} />}
    <Action disabled={disabledAll} icon={Settings2} label={ar ? "إعدادات" : "Settings"} onClick={() => onAction("settings")} />
    <Action disabled={disabledAll} icon={Palette} label={ar ? "تصميم" : "Design"} onClick={() => onAction("design")} />
    {node.type === "button" && <Action disabled={disabledAll} icon={Link2} label={ar ? "رابط" : "Link"} onClick={() => onAction("settings")} />}
    <Action disabled icon={CircleHelp} label={help} />
  </div>;
}
