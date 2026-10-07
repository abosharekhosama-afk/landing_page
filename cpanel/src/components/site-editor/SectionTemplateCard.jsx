import React from "react";
import { siteEditorText } from "../../utils/siteEditor.js";
import { templateDescription, templateLabel } from "../../utils/siteEditorSectionLibrary.js";

export default function SectionTemplateCard({ language, onSelect, selected, template }) {
  const title = templateLabel(template, language);
  const description = templateDescription(template, language);
  const thumb = template.thumbnail || "";
  const badges = [];
  if (template.capabilities?.requiresProducts) badges.push(siteEditorText("addSection.requiresProducts", language));
  if (template.capabilities?.requiresMedia) badges.push(siteEditorText("addSection.requiresMedia", language));
  return <button
    aria-pressed={selected}
    className={selected ? "site-editor-template-card selected" : "site-editor-template-card"}
    onClick={() => onSelect(template.templateId)}
    type="button"
  >
    {thumb
      ? <img alt="" className="site-editor-template-thumb" loading="lazy" src={thumb} />
      : <span aria-hidden="true" className="site-editor-template-thumb site-editor-template-thumb-fallback">{template.sectionType}</span>}
    <span className="site-editor-template-copy">
      <strong>{title}</strong>
      {description ? <small>{description}</small> : null}
      {badges.length ? <span className="site-editor-template-badges">{badges.map((badge) => <span className="site-editor-template-badge" key={badge}>{badge}</span>)}</span> : null}
    </span>
  </button>;
}
