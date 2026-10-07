import React from "react";
import { ExternalLink, MoreHorizontal, X } from "lucide-react";
import { siteEditorText } from "../../utils/siteEditor.js";

export default function PageActionsMenu({ language, page, previewUrl }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const label = open ? siteEditorText("pages.closeActions", language) : siteEditorText("pages.actions", language);
  return <div className="site-editor-page-actions" ref={rootRef}>
    <button aria-expanded={open} aria-label={label} onClick={(event) => { event.stopPropagation(); setOpen((value) => !value); }} type="button">
      {open ? <X size={15} /> : <MoreHorizontal size={16} />}
    </button>
    {open && <div className="site-editor-page-actions-menu" role="menu">
      {previewUrl ? <a href={previewUrl} onClick={(event) => event.stopPropagation()} rel="noopener noreferrer" role="menuitem" target="_blank"><ExternalLink size={14} />{siteEditorText("pages.open", language)}</a> : <span aria-disabled="true" role="menuitem">{siteEditorText("pages.open", language)}</span>}
    </div>}
  </div>;
}
