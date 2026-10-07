import React from "react";

export default function TextEditor({ language, node, onCancel, onCommit }) {
  const source = node.type === "button" ? node.content?.label : node.content?.text;
  const [value, setValue] = React.useState(source || "");
  const ar = language === "ar";
  return <div className="site-editor-text-edit" onClick={(event) => event.stopPropagation()}>
    <textarea autoFocus aria-label={ar ? "تحرير النص" : "Edit text"} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); onCancel(); }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); onCommit(value); }
    }} value={value} />
    <div><button onClick={onCancel} type="button">{ar ? "إلغاء" : "Cancel"}</button><button className="primary" onClick={() => onCommit(value)} type="button">{ar ? "تم" : "Done"}</button></div>
  </div>;
}
