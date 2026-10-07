import React from "react";
import { siteEditorText } from "../../utils/siteEditor.js";
import SectionCategoryList from "./SectionCategoryList.jsx";
import SectionInsertControls from "./SectionInsertControls.jsx";
import SectionTemplateCard from "./SectionTemplateCard.jsx";

export default function SectionLibraryPanel({ dispatch, language, onClose, onRequireConnection, onRetry, readOnly, state, templates }) {
  const status = state.sectionLibraryStatus;
  const error = state.sectionLibraryError;
  const activeCategoryId = state.activeSectionCategory;
  const selectedTemplateId = state.selectedSectionTemplate;
  const selectedTemplate = templates.find((template) => template.templateId === selectedTemplateId) || null;
  const insertDisabled = readOnly || (!selectedTemplate && templates.length > 0) || state.sectionBusy;
  const insertLabel = selectedTemplate ? siteEditorText("addSection.insert", language) : siteEditorText("addSection.selectTemplate", language);

  return <aside className="site-editor-panel site-editor-section-library-panel" id="site-editor-panel-add-section" aria-label={siteEditorText("addSection.panelTitle", language)}>
    <header className="site-editor-panel-header">
      <div className="site-editor-panel-title">
        <strong>{siteEditorText("addSection.panelTitle", language)}</strong>
        <span className="site-editor-tabs" role="tablist">
          <button aria-selected="true" className="site-editor-tab active" role="tab" type="button">
            {siteEditorText("addSection.templatesTab", language)}
          </button>
          <button aria-disabled="true" aria-selected="false" className="site-editor-tab disabled" role="tab" title={siteEditorText("addSection.savedSectionsComingSoon", language)} type="button">
            {siteEditorText("addSection.savedSections", language)}
          </button>
        </span>
      </div>
      <button aria-label="Close" className="site-editor-panel-close" onClick={onClose} type="button">×</button>
    </header>
    <div className="site-editor-section-library-body">
    {status === "loading" ? <div className="site-editor-panel-message">{siteEditorText("addSection.loading", language)}</div>
      : status === "error" ? <div className="site-editor-panel-message error">
        <span>{error || siteEditorText("addSection.loadError", language)}</span>
        <button className="site-editor-retry-button" onClick={onRetry} type="button">{siteEditorText("addSection.retry", language)}</button>
      </div>
      : state.sectionLibraryRequiresConnection ? <div className="site-editor-panel-message requires-connection">
        <span>{siteEditorText("addSection.requiresConnection", language)}</span>
        <button className="site-editor-connect-button" onClick={onRequireConnection} type="button">{siteEditorText("addSection.connectWebsite", language)}</button>
      </div>
      : !state.sectionLibrary ? <div className="site-editor-panel-message">{siteEditorText("addSection.noTemplates", language)}</div>
      : <>
        <SectionCategoryList
          activeCategoryId={activeCategoryId}
          language={language}
          onInsertBlank={() => dispatch({ type: "insert-section-template", section: null })}
          onSelectCategory={(categoryId) => dispatch({ type: "select-section-category", categoryId })}
          readOnly={readOnly}
          sectionLibrary={state.sectionLibrary}
        />
        <section className="site-editor-section-templates" aria-label={siteEditorText("addSection.templatesTab", language)}>
          <h3 className="site-editor-section-category-title">{siteEditorText("addSection.selectTemplate", language)}</h3>
          {templates.length ? templates.map((template) => <SectionTemplateCard
            key={template.templateId}
            language={language}
            onSelect={(templateId) => dispatch({ type: "select-section-template", templateId })}
            selected={selectedTemplateId === template.templateId}
            template={template}
          />) : <div className="site-editor-panel-message">{siteEditorText("addSection.noTemplatesForPage", language)}</div>}
        </section>
        <SectionInsertControls
          disabled={insertDisabled}
          language={language}
          onInsert={() => dispatch({ type: "insert-section-template", section: selectedTemplate })}
          onPositionChange={(position) => dispatch({ type: "set-section-insert-position", position })}
          position={state.sectionInsertPosition}
        />
        <div className="site-editor-panel-hint" role="status">
          {readOnly ? siteEditorText("addSection.insertReadOnly", language) : insertLabel}
        </div>
      </>}
    </div>
  </aside>;
}
