import React from "react";
import MediaPickerDialog from "../components/site-editor/MediaPickerDialog.jsx";
import SectionLibraryPanel from "../components/site-editor/SectionLibraryPanel.jsx";
import SiteEditorCanvas from "../components/site-editor/SiteEditorCanvas.jsx";
import SiteEditorRail from "../components/site-editor/SiteEditorRail.jsx";
import SiteEditorToolbar from "../components/site-editor/SiteEditorToolbar.jsx";
import SiteEditorTopBar from "../components/site-editor/SiteEditorTopBar.jsx";
import StyleInspector from "../components/site-editor/StyleInspector.jsx";
import QuickEditPanel from "../components/site-editor/QuickEditPanel.jsx";
import WebsiteConnectionScreen from "../components/site-editor/WebsiteConnectionScreen.jsx";
import { fetchSiteEditorConnection, fetchSiteEditorDocument, fetchSiteEditorPages, fetchSiteEditorSectionLibrary, saveSiteEditorDraft } from "../utils/siteEditorApi.js";
import { sectionTemplatesForCategory } from "../utils/siteEditorSectionLibrary.js";
import {
  currentSiteEditorDocument, createSiteEditorState, normalizeSiteEditorPage, siteEditorCapabilities,
  resolveSiteEditorLocale, siteEditorDirection, siteEditorReducer, siteEditorText, trustedPagePreview, trustedSiteLabel,
} from "../utils/siteEditor.js";
import {
  findEditorNode, moveEditorSection, replaceEditorImage, updateEditorContentList,
  updateEditorImageSettings, updateEditorLink, updateEditorStyle, updateEditorText,
} from "../utils/siteEditorDocument.js";
import "../styles/site-editor.css";

const minimumLoaderTime = 800;

function EditorLoading({ language }) {
  return <section className="site-editor-loading" aria-busy="true" aria-live="polite" dir={language === "ar" ? "rtl" : "ltr"}><div className="site-editor-loader-mark" aria-hidden="true"><i className="site-editor-loader-primary" /><i className="site-editor-loader-secondary" /><i className="site-editor-loader-orbit" /><i className="site-editor-loader-line" /></div><strong>{siteEditorText("editor.loading", language)}</strong><p>{siteEditorText("editor.loadingDetail", language)}</p></section>;
}

function EditorAccessState({ language, missingCompany = false }) {
  const ar = language === "ar";
  return <section className="site-editor-access-state" role="alert">
    <strong>{missingCompany ? (ar ? "يلزم تحديد شركة موثوقة" : "Trusted company scope required") : (ar ? "ليس لديك صلاحية الوصول إلى المحرر" : "Site editor access required")}</strong>
    <p>{missingCompany ? (ar ? "ارجع إلى المنصة وادخل من خلال تبديل الشركة الآمن." : "Return to the platform and enter through the secure company switcher.") : (ar ? "اطلب صلاحية محرر الموقع من مسؤول الشركة." : "Ask a company administrator for site editor access.")}</p>
    <a href="/admin/dashboard">{ar ? "العودة إلى لوحة التحكم" : "Back to CPanel"}</a>
  </section>;
}

export default function SiteEditorPage({ company, currentUser, isContextResolving = false, language = "en" }) {
  const [state, dispatch] = React.useReducer(siteEditorReducer, language, createSiteEditorState);
  const [minimumElapsed, setMinimumElapsed] = React.useState(false);
  const [mediaNodeId, setMediaNodeId] = React.useState(null);
  const [notice, setNotice] = React.useState("");
  const [connection, setConnection] = React.useState(null);
  const [connectionStatus, setConnectionStatus] = React.useState("idle");
  const [connectionReload, setConnectionReload] = React.useState(0);
  const [sectionLibraryRetry, setSectionLibraryRetry] = React.useState(0);
  const sectionLibraryRequestRef = React.useRef(null);
  const sectionLibraryKeyRef = React.useRef(null);
  const localeExplicitRef = React.useRef(false);
  const activeLocaleRef = React.useRef(state.activeLocale);
  const siteId = React.useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get("siteId") || "";
    } catch {
      return "";
    }
  }, []);
  const capabilities = siteEditorCapabilities(currentUser, company);
  const activeLanguage = state.activeLocale;
  const direction = siteEditorDirection(activeLanguage);
  const currentPage = state.pages.find((page) => page.id === state.currentPageId) || null;
  const currentDocument = currentSiteEditorDocument(state);
  const selectedRecord = findEditorNode(currentDocument, state.selectedNodeId);
  const quickEditSection = state.quickEdit ? findEditorNode(currentDocument, state.quickEdit) : null;
  const sectionLibraryOpen = state.activePanel === "add-section";
  const sectionTemplates = sectionTemplatesForCategory(state.sectionLibrary, currentPage, state.activeSectionCategory);
  const siteKey = `${company?.id || "none"}:${connection?.siteId || ""}`;
  const previewUrl = trustedPagePreview(company, currentPage);
  const previewLabel = trustedSiteLabel(company);

  React.useEffect(() => { activeLocaleRef.current = state.activeLocale; }, [state.activeLocale]);

  const loadDocument = React.useCallback(async (pageId, locale) => {
    dispatch({ type: "document-loading" });
    try {
      const document = await fetchSiteEditorDocument(pageId, locale, siteId);
      if (document.companyId !== company?.id || document.pageId !== pageId) throw new Error("The editor API returned a cross-tenant or mismatched page document.");
      dispatch({ type: "document-success", document, pageId });
    } catch (error) {
      dispatch({ type: "document-failure", error: error.message });
    }
  }, [company?.id, siteId]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setMinimumElapsed(true), minimumLoaderTime);
    return () => window.clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (isContextResolving || !company || !capabilities.canAccess) return undefined;
    let cancelled = false;
    setConnectionStatus("loading");
    fetchSiteEditorConnection(siteId).then((result) => {
      if (cancelled) return;
      const storageKey = `site-editor:locale:${company.id}:${result.siteId || "default"}`;
      const locale = resolveSiteEditorLocale({
        activeLocale: activeLocaleRef.current,
        persistedLocale: window.localStorage.getItem(storageKey),
        defaultLocale: result.defaultLocale,
        supportedLocales: result.supportedLocales,
        activeIsExplicit: localeExplicitRef.current,
      });
      activeLocaleRef.current = locale;
      dispatch({ type: "set-locale", locale });
      setConnection(result);
      setConnectionStatus("ready");
    }).catch((error) => {
      if (cancelled) return;
      setConnection(null);
      setConnectionStatus("error");
      setNotice(error.message || (activeLanguage === "ar" ? "تعذر تحميل اتصال الموقع." : "The website connection could not be loaded."));
    });
    return () => { cancelled = true; };
  }, [capabilities.canAccess, company, connectionReload, isContextResolving, language]);

  const connected = connection?.hasManifest === true;

  React.useEffect(() => {
    if (isContextResolving || !company || !capabilities.canAccess || connectionStatus !== "ready" || !connected) return undefined;
    let cancelled = false;
    dispatch({ type: "pages-loading" });
    const locale = activeLocaleRef.current;
    fetchSiteEditorPages(locale, siteId).then(async (items) => {
      if (cancelled) return;
      const pages = items.map((page) => normalizeSiteEditorPage(page, company.id)).filter(Boolean);
      if (!pages.length) throw new Error("No trusted editable pages were returned by the local editor API.");
      dispatch({ type: "pages-success", pages, currentPageId: pages[0].id });
      await loadDocument(pages[0].id, locale);
    }).catch((error) => {
      if (!cancelled) dispatch({ type: "pages-failure", error: error.message });
    });
    return () => { cancelled = true; };
  }, [capabilities.canAccess, company, connectionStatus, connected, isContextResolving, loadDocument]);

  React.useEffect(() => {
    dispatch({ type: "section-library-reset" });
  }, [siteKey]);

  React.useEffect(() => {
    dispatch({ type: "design-reset" });
  }, [company?.id, connection?.siteId]);

  React.useEffect(() => {
    dispatch({ type: "design-initialize", siteDesign: connected ? connection?.siteDesign || null : null });
  }, [company?.id, connection?.siteId, connected, connection?.siteDesign]);

  React.useEffect(() => {
    if (isContextResolving || !company || !capabilities.canAccess || connectionStatus !== "ready" || !connected || !sectionLibraryOpen) {
      sectionLibraryRequestRef.current = null;
      return undefined;
    }
    if (sectionLibraryRequestRef.current) return undefined;
    if (sectionLibraryKeyRef.current === siteKey && (state.sectionLibraryStatus === "ready" || state.sectionLibraryStatus === "error")) return undefined;
    if (sectionLibraryKeyRef.current !== siteKey) dispatch({ type: "section-library-reset" });
    let active = true;
    dispatch({ type: "section-library-loading" });
    const request = fetchSiteEditorSectionLibrary(siteId).then((result) => {
      if (!active || sectionLibraryRequestRef.current !== request) return;
      sectionLibraryRequestRef.current = null;
      sectionLibraryKeyRef.current = siteKey;
      dispatch({ type: "section-library-success", sectionLibrary: result.sectionLibrary || null, requiresConnection: result.requiresConnection === true });
    }).catch((error) => {
      if (!active || sectionLibraryRequestRef.current !== request) return;
      sectionLibraryRequestRef.current = null;
      dispatch({ type: "section-library-failure", error: error.message });
    });
    sectionLibraryRequestRef.current = request;
    return () => {
      active = false;
      if (sectionLibraryRequestRef.current === request) sectionLibraryRequestRef.current = null;
    };
  }, [capabilities.canAccess, company, connected, connectionStatus, isContextResolving, sectionLibraryOpen, sectionLibraryRetry, siteKey]);

  React.useEffect(() => {
    const beforeUnload = (event) => {
      if (!state.isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [state.isDirty]);

  React.useEffect(() => {
    const onKeyDown = (event) => {
      const editingInput = event.target instanceof HTMLElement && (event.target.matches("input, textarea, select") || event.target.isContentEditable);
      if (event.key === "Escape") {
        if (state.editingNodeId) dispatch({ type: "set-editing-node", nodeId: null });
        else if (state.quickEdit) dispatch({ type: "close-quick-edit" });
        else dispatch({ type: "clear-selection" });
        return;
      }
      if (editingInput || !(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === "z" && event.shiftKey) { event.preventDefault(); dispatch({ type: "redo" }); }
      else if (event.key.toLowerCase() === "z") { event.preventDefault(); dispatch({ type: "undo" }); }
      else if (event.key.toLowerCase() === "y") { event.preventDefault(); dispatch({ type: "redo" }); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.editingNodeId, state.quickEdit]);

  function commit(document) { if (capabilities.canEdit) dispatch({ type: "mutate-document", document }); }
  function showError(error) { setNotice(error.message || String(error)); }

  function selectNode(nodeId, sectionId = null, inspector = null) {
    if (!nodeId) dispatch({ type: "clear-selection" });
    else dispatch({ type: "select-node", nodeId, sectionId, inspector });
  }

  function handleAction(action, node) {
    if (action === "quick-edit") return dispatch({ type: "open-quick-edit", sectionId: node.id });
    if (action === "cancel-edit") return dispatch({ type: "set-editing-node", nodeId: null });
    if (!capabilities.canEdit) return setNotice(activeLanguage === "ar" ? "لديك صلاحية عرض فقط." : "You have read-only editor access.");
    if (action === "edit-text") return dispatch({ type: "set-editing-node", nodeId: node.id });
    if (["settings", "design"].includes(action)) return dispatch({ type: "set-inspector", inspector: node.id });
    if (action === "change-image") return setMediaNodeId(node.id);
    if (action === "move-up" || action === "move-down") return commit(moveEditorSection(currentDocument, node.id, action === "move-up" ? "up" : "down"));
    return undefined;
  }

  function handleText(nodeId, value) {
    try { commit(updateEditorText(currentDocument, nodeId, value)); dispatch({ type: "set-editing-node", nodeId: null }); }
    catch (error) { showError(error); }
  }

  async function handleSelectPage(pageId) {
    if (!pageId || pageId === state.currentPageId) return;
    if (state.isDirty && !window.confirm(activeLanguage === "ar" ? "توجد تغييرات غير محفوظة. هل تريد تجاهلها؟" : "You have unsaved changes. Discard them and switch pages?")) return;
    dispatch({ type: "select-page", pageId });
    await loadDocument(pageId, activeLanguage);
  }

  async function handleLocaleChange(locale) {
    if (locale === activeLanguage) return;
    if (state.isDirty && !window.confirm(activeLanguage === "ar" ? "توجد تغييرات غير محفوظة. هل تريد تجاهلها وتغيير اللغة؟" : "You have unsaved changes. Discard them and change locale?")) return;
    const resolvedLocale = resolveSiteEditorLocale({ activeLocale: locale, supportedLocales: connection?.supportedLocales, activeIsExplicit: true });
    localeExplicitRef.current = true;
    activeLocaleRef.current = resolvedLocale;
    window.localStorage.setItem(`site-editor:locale:${company.id}:${connection?.siteId || "default"}`, resolvedLocale);
    dispatch({ type: "set-locale", locale: resolvedLocale });
    if (state.currentPageId) await loadDocument(state.currentPageId, resolvedLocale);
  }

  async function handleSave() {
    if (!capabilities.canSave || !currentDocument || !state.isDirty || state.saveStatus === "saving") return;
    dispatch({ type: "save-start" });
    try {
      const result = await saveSiteEditorDraft(state.currentPageId, currentDocument, state.currentRevision, siteId);
      dispatch({ type: "save-success", document: result.document, revision: result.revision });
    } catch (error) {
      dispatch({ type: "save-failure", conflict: error.status === 409, error: error.message });
    }
  }

  function handleBack(event) {
    if (state.isDirty && !window.confirm(activeLanguage === "ar" ? "توجد تغييرات غير محفوظة. هل تريد المغادرة؟" : "You have unsaved changes. Leave the editor?")) event.preventDefault();
  }

  function handleSectionLibraryRetry() {
    dispatch({ type: "section-library-retry" });
    setSectionLibraryRetry((retry) => retry + 1);
  }

  if (!isContextResolving && minimumElapsed && !company) return <EditorAccessState language={language} missingCompany />;
  if (!isContextResolving && minimumElapsed && company && !capabilities.canAccess) return <EditorAccessState language={language} />;

  const booting = isContextResolving || !minimumElapsed || state.pagesStatus === "idle" || state.pagesStatus === "loading" || state.documentStatus === "loading" || state.pagesStatus === "ready" && state.currentPageId && state.documentStatus === "idle";
  if (booting && connectionStatus !== "ready") return <EditorLoading language={language} />;

  if (connectionStatus === "ready" && !connected) return (
    <WebsiteConnectionScreen
      canManageConnection={capabilities.canManageConnection}
      canSyncManifest={capabilities.canSyncManifest}
      company={company}
      connection={connection || undefined}
      language={activeLanguage}
      onBack={handleBack}
      onConnected={() => { setConnectionReload((reload) => reload + 1); }}
    />
  );

  if (booting) return <EditorLoading language={language} />;

  return <div className="site-editor-root site-editor-enter" data-editor-direction={direction} dir={direction}>
    <SiteEditorTopBar canSave={capabilities.canSave && Boolean(currentDocument)} company={company} direction={direction} language={activeLanguage} onBack={handleBack} onSave={handleSave} previewUrl={previewUrl} state={state} />
    <SiteEditorToolbar connection={connection} currentPage={currentPage} dispatch={dispatch} language={activeLanguage} onLocaleChange={handleLocaleChange} previewLabel={previewLabel} state={state} />
    <div className={`site-editor-workspace ${state.activePanel ? "panel-open" : ""} ${quickEditSection ? "quick-edit-open" : ""} ${selectedRecord && state.activeInspector ? "inspector-open" : ""}`}>
      <SiteEditorRail company={company} dispatch={dispatch} language={activeLanguage} onSelectPage={handleSelectPage} pages={state.pages} state={state} />
      {sectionLibraryOpen && <SectionLibraryPanel dispatch={dispatch} language={activeLanguage} onClose={() => dispatch({ type: "close-section-library" })} onRequireConnection={() => { dispatch({ type: "close-section-library" }); setConnectionReload((reload) => reload + 1); }} onRetry={handleSectionLibraryRetry} readOnly={!capabilities.canEdit} state={state} templates={sectionTemplates} />}
      <SiteEditorCanvas document={currentDocument} language={activeLanguage} onAction={handleAction} onCommitText={handleText} onSelect={selectNode} state={{ ...state, readOnly: !capabilities.canEdit }} />
      {quickEditSection && quickEditSection.kind === "section" && <QuickEditPanel language={activeLanguage} onClose={() => dispatch({ type: "close-quick-edit" })} onImage={(nodeId) => setMediaNodeId(nodeId)} onImageSettings={(nodeId, changes) => { try { commit(updateEditorImageSettings(currentDocument, nodeId, changes)); } catch (error) { showError(error); } }} onLink={(nodeId, value) => { try { commit(updateEditorLink(currentDocument, nodeId, value)); } catch (error) { showError(error); } }} onList={(nodeId, items) => { try { commit(updateEditorContentList(currentDocument, nodeId, items)); } catch (error) { showError(error); } }} onStyle={(nodeId, key, value) => commit(updateEditorStyle(currentDocument, nodeId, key, value, state.viewportMode))} onText={(nodeId, value) => { try { commit(updateEditorText(currentDocument, nodeId, value)); } catch (error) { showError(error); } }} readOnly={!capabilities.canEdit} section={quickEditSection.node} state={state} viewportMode={state.viewportMode} />}
      {selectedRecord && state.activeInspector && capabilities.canEdit && <StyleInspector isSection={selectedRecord.kind === "section"} language={activeLanguage} node={selectedRecord.node} onClose={() => dispatch({ type: "set-inspector", inspector: null })} onImageSettings={(changes) => { try { commit(updateEditorImageSettings(currentDocument, selectedRecord.node.id, changes)); } catch (error) { showError(error); } }} onLink={(value) => { try { commit(updateEditorLink(currentDocument, selectedRecord.node.id, value)); } catch (error) { showError(error); } }} onStyle={(key, value) => commit(updateEditorStyle(currentDocument, selectedRecord.node.id, key, value, state.viewportMode))} onText={(value) => handleText(selectedRecord.node.id, value)} viewportMode={state.viewportMode} />}
    </div>
    {mediaNodeId && <MediaPickerDialog company={company} language={activeLanguage} onClose={() => setMediaNodeId(null)} onSelect={(asset) => { try { commit(replaceEditorImage(currentDocument, mediaNodeId, asset, company.id)); setMediaNodeId(null); } catch (error) { showError(error); } }} />}
    {notice && <div className="site-editor-notice" role="alert"><span>{notice}</span><button aria-label={activeLanguage === "ar" ? "إغلاق" : "Dismiss"} onClick={() => setNotice("")} type="button">×</button></div>}
    <div className="site-editor-narrow-notice" role="status"><strong>{activeLanguage === "ar" ? "يفضل استخدام سطح المكتب" : "Desktop editing recommended"}</strong><span>{activeLanguage === "ar" ? "استخدم شاشة أكبر للوصول إلى مساحة المحرر كاملة." : "Use a larger screen for the complete editor workspace."}</span></div>
  </div>;
}
