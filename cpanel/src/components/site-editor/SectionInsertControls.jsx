import React from "react";
import { siteEditorText } from "../../utils/siteEditor.js";

export default function SectionInsertControls({ disabled, language, onInsert, onPositionChange, position }) {
  const positionOptions = ["after", "before", "end"];
  return <div className="site-editor-section-insert-controls">
    <label className="site-editor-insert-label" htmlFor="site-editor-section-insert-position">
      {siteEditorText("addSection.insertPosition", language)}
    </label>
    <select
      className="site-editor-insert-position"
      disabled={disabled}
      id="site-editor-section-insert-position"
      onChange={(event) => onPositionChange(event.target.value)}
      value={position}
    >
      {positionOptions.map((option) => <option key={option} value={option}>
        {siteEditorText(`addSection.insert${option[0].toUpperCase()}${option.slice(1)}`, language)}
      </option>)}
    </select>
    <button
      className="site-editor-primary-button"
      disabled={disabled}
      onClick={onInsert}
      type="button"
    >{siteEditorText("addSection.insert", language)}</button>
  </div>;
}
