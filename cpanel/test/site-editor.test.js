import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { getNavigationItem } from "../src/data/adminNavigation.js";
import { hasPermission } from "../src/data/permissions.js";
import { resolvePage } from "../src/utils/cpanelAccess.js";
import { canAccessAdminPage } from "../src/utils/roles.js";
import {
  createSiteEditorState, currentSiteEditorDocument, normalizeSiteEditorPage, resolveSiteEditorLocale,
  siteEditorCapabilities, siteEditorDirection, siteEditorReducer, siteEditorText, siteEditorTools,
  trustedPagePreview, trustedSitePreview,
} from "../src/utils/siteEditor.js";
import {
  applyTextThemePreset, cloneColorTheme, cloneTextThemeStyles, colorThemesEqual,
  createDesignCssVariables, createInitialDesignState, createTypographyCssVariables,
  findColorField, findCurrentThemePreset, findDefaultTheme, findDefaultTextTheme, findTextThemePreset,
  findTypographyField, getCurrentTextThemePreset, getColorThemeValue, getPresetColorValue,
  getPresetTypographyValue, getTypographyValue, MAX_DESIGN_HISTORY, MAX_TEXT_THEME_HISTORY,
  normalizeHexColor, normalizeTypographyValue, resetColorThemeToPreset, resetColorThemeValue,
  resetTypographyStylesToPreset, resetTypographyTokenToPreset, resetTypographyValueToPreset,
  SITE_DESIGN_COLOR_FIELDS, SITE_DESIGN_COLOR_GROUPS, SITE_DESIGN_CSS_VARIABLES,
  SITE_DESIGN_FONT_FAMILY_MAP, SITE_DESIGN_TEXT_STYLE_TOKENS, SITE_DESIGN_TYPOGRAPHY_CSS_VARIABLES,
  SITE_DESIGN_TYPOGRAPHY_FIELDS, textThemeIsCustomized, textThemePresetsAvailable,
  textThemeStylesEqual, updateColorThemeValue, updateTypographyValue, colorThemeIsCustomized,
} from "../src/utils/siteEditorDesign.js";
import {
  editorNodeStyles, findEditorNode, moveEditorSection, plainEditorText, replaceEditorImage,
  safeEditorLink, sectionMoveAvailability, updateEditorContentList, updateEditorImageSettings,
  updateEditorLink, updateEditorStyle, updateEditorText,
} from "../src/utils/siteEditorDocument.js";
import {
  quickEditNodeEditable, quickEditPropertyEditable, quickEditSectionFields,
} from "../src/utils/siteEditorQuickEdit.js";
import {
  blankSectionTemplate, insertSectionAtTarget, sectionLibraryBlank, sectionLibraryCategories,
  sectionLibraryCategoryKey, sectionTemplatesForCategory, templateDescription, templateLabel,
  validSectionInsertPosition,
} from "../src/utils/siteEditorSectionLibrary.js";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const appSource = read("../src/CPanelApp.jsx");
const pageSource = read("../src/pages/SiteEditorPage.jsx");
const topbarSource = read("../src/components/site-editor/SiteEditorTopBar.jsx");
const toolbarSource = read("../src/components/site-editor/SiteEditorToolbar.jsx");
const pagesSource = read("../src/components/site-editor/SiteEditorPagesPanel.jsx");
const treeSource = read("../src/components/site-editor/PageTreeItem.jsx");
const canvasSource = read("../src/components/site-editor/SiteEditorCanvas.jsx");
const editableSource = read("../src/components/site-editor/EditableElement.jsx");
const apiSource = read("../src/utils/siteEditorApi.js");
const cssSource = read("../src/styles/site-editor.css");

const company = { id: "icare", slug: "icare", name: "iCare", storefrontUrl: "https://igroup.website/icare" };
const admin = { id: "u1", role: "company_admin", activeCompany: company };
const page = { id: "icare:home", tenantId: "icare", title: "Home", pageType: "page", previewPath: "/icare", routePattern: "/icare", status: "source", isEditable: true };
const document = {
  id: "doc:home", companyId: "icare", siteId: "icare", pageId: "icare:home", pageType: "page", title: "Home", slug: "home",
  routePattern: "/icare", previewPath: "/icare", locale: "en", status: "draft", revision: 0,
  sections: [
    { id: "hero", type: "hero", order: 0, settings: {}, styles: { backgroundColor: "#fff" }, responsive: {}, elements: [
      { id: "heading", type: "heading", content: { text: "iCare" }, settings: {}, styles: { fontSize: 64 }, responsive: {}, children: [] },
      { id: "copy", type: "text", content: { text: "Care made clear" }, settings: {}, styles: {}, responsive: {}, children: [] },
      { id: "image", type: "image", content: { src: "/uploads/hero.jpg", alt: "iCare products" }, settings: {}, styles: { width: 80 }, responsive: {}, children: [] },
      { id: "button", type: "button", content: { label: "Shop", link: "/icare/shop" }, settings: {}, styles: {}, responsive: {}, children: [] },
    ] },
    { id: "content", type: "content", order: 1, settings: {}, styles: {}, responsive: {}, elements: [
      { id: "list", type: "list", content: { items: ["mission", "philanthropy"] }, settings: {}, styles: {}, responsive: {}, children: [] },
    ] },
  ],
};

function loadedState() {
  let state = createSiteEditorState("en");
  state = siteEditorReducer(state, { type: "pages-success", pages: [page], currentPageId: page.id });
  return siteEditorReducer(state, { type: "document-success", pageId: page.id, document });
}

test("1 Home appears in Pages & Menu", () => {
  assert.equal(normalizeSiteEditorPage(page, "icare")?.title, "Home");
  assert.match(pagesSource, /pages\.map|PageTree/);
});
test("2 dropdown and Pages panel share currentPageId", () => {
  assert.match(pageSource, /currentPage = state\.pages\.find\(\(page\) => page\.id === state\.currentPageId\)/);
  assert.match(pageSource, /<SiteEditorToolbar connection=\{connection\} currentPage=\{currentPage\}/);
  assert.match(treeSource, /onSelectPage\(page\.id\)/);
  assert.match(pagesSource, /currentPageId=\{state\.currentPageId\}/);
});
test("2a editor locale prefers explicit, persisted, then manifest default without hardcoded locale choices", () => {
  assert.equal(resolveSiteEditorLocale({ activeLocale: "ar", persistedLocale: "en", defaultLocale: "en", supportedLocales: ["ar", "en"], activeIsExplicit: true }), "ar");
  assert.equal(resolveSiteEditorLocale({ persistedLocale: "ar", defaultLocale: "en", supportedLocales: ["ar", "en"] }), "ar");
  assert.equal(resolveSiteEditorLocale({ defaultLocale: "fr", supportedLocales: ["fr", "en"] }), "fr");
  assert.match(toolbarSource, /connection\?\.supportedLocales/);
  assert.doesNotMatch(toolbarSource, /<option value="en">/);
});
test("3 selecting Home loads its document without route reload", () => {
  assert.match(pageSource, /loadDocument\(pageId, activeLanguage\)/);
  assert.match(apiSource, /`\/site-editor\/pages\/\$\{encodeURIComponent\(pageId\)\}/);
  assert.doesNotMatch(treeSource, /location\.href|window\.location/);
});
test("4 structured sections render in the internal canvas", () => {
  assert.match(canvasSource, /EditablePageCanvas/);
  assert.doesNotMatch(canvasSource, /iframe/);
  assert.match(cssSource, /site-editor-editable-section/);
});
test("5 heading selection is represented in shared reducer state", () => {
  const state = siteEditorReducer(loadedState(), { type: "select-node", nodeId: "heading", sectionId: "hero", inspector: "style" });
  assert.equal(state.selectedNodeId, "heading");
});
test("6 text selection resolves the real node", () => assert.equal(findEditorNode(document, "copy")?.node.type, "text"));
test("7 image selection resolves the real node", () => assert.equal(findEditorNode(document, "image")?.node.type, "image"));
test("8 button selection resolves the real node", () => assert.equal(findEditorNode(document, "button")?.node.type, "button"));
test("9 empty canvas clears selection", () => assert.match(canvasSource, /onSelect=\{onSelect\}/));
test("10 Escape exits editing or clears selection", () => assert.match(pageSource, /event\.key === "Escape"[\s\S]*?clear-selection/));
test("11 text editing updates only selected node", () => {
  const next = updateEditorText(document, "heading", "New heading");
  assert.equal(findEditorNode(next, "heading").node.content.text, "New heading");
  assert.equal(findEditorNode(next, "copy").node.content.text, "Care made clear");
});
test("12 unsafe HTML and scripts are rejected", () => {
  assert.throws(() => plainEditorText("<script>alert(1)</script>"));
  assert.throws(() => safeEditorLink("javascript:alert(1)"));
});
test("13 active current-tenant media can replace an image", () => {
  const next = replaceEditorImage(document, "image", { id: "m1", company_id: "icare", is_active: true, image_url: "/uploads/new.jpg" }, "icare");
  assert.equal(findEditorNode(next, "image").node.content.src, "/uploads/new.jpg");
});
test("14 cross-tenant or inactive media is rejected", () => {
  assert.throws(() => replaceEditorImage(document, "image", { id: "m1", company_id: "eb-chemical", image_url: "/uploads/x.jpg" }, "icare"));
  assert.throws(() => replaceEditorImage(document, "image", { id: "m2", company_id: "icare", is_active: false, image_url: "/uploads/x.jpg" }, "icare"));
});
test("15 style changes affect only the selected node", () => {
  const next = updateEditorStyle(document, "heading", "fontSize", 72);
  assert.equal(findEditorNode(next, "heading").node.styles.fontSize, 72);
  assert.deepEqual(findEditorNode(next, "copy").node.styles, {});
});
test("16 desktop and mobile styles remain separate", () => {
  const next = updateEditorStyle(document, "heading", "fontSize", 34, "mobile");
  const node = findEditorNode(next, "heading").node;
  assert.equal(node.styles.fontSize, 64);
  assert.equal(node.responsive.mobile.fontSize, 34);
  assert.equal(editorNodeStyles(node, "mobile").fontSize, 34);
});
test("17 Move Down changes section order and preserves IDs", () => {
  const next = moveEditorSection(document, "hero", "down");
  assert.deepEqual(next.sections.map((section) => section.id), ["content", "hero"]);
  assert.deepEqual(next.sections.map((section) => section.order), [0, 1]);
});
test("18 section movement boundaries are disabled", () => {
  assert.deepEqual(sectionMoveAvailability(document, "hero"), { canMoveUp: false, canMoveDown: true });
  assert.deepEqual(sectionMoveAvailability(document, "content"), { canMoveUp: true, canMoveDown: false });
});
test("19 undo restores previous document", () => {
  let state = loadedState();
  state = siteEditorReducer(state, { type: "mutate-document", document: updateEditorText(document, "heading", "Changed") });
  state = siteEditorReducer(state, { type: "undo" });
  assert.equal(findEditorNode(currentSiteEditorDocument(state), "heading").node.content.text, "iCare");
});
test("20 redo restores reverted mutation", () => {
  let state = loadedState();
  state = siteEditorReducer(state, { type: "mutate-document", document: updateEditorText(document, "heading", "Changed") });
  state = siteEditorReducer(siteEditorReducer(state, { type: "undo" }), { type: "redo" });
  assert.equal(findEditorNode(currentSiteEditorDocument(state), "heading").node.content.text, "Changed");
});
test("21 new edits clear redo history", () => {
  let state = loadedState();
  state = siteEditorReducer(state, { type: "mutate-document", document: updateEditorText(document, "heading", "One") });
  state = siteEditorReducer(state, { type: "undo" });
  state = siteEditorReducer(state, { type: "mutate-document", document: updateEditorText(document, "heading", "Two") });
  assert.equal(state.history.future.length, 0);
});
test("22 Save is disabled while clean", () => assert.match(topbarSource, /state\.isDirty[\s\S]*?saveEnabled/));
test("23 a mutation marks the document dirty", () => {
  const state = siteEditorReducer(loadedState(), { type: "mutate-document", document: updateEditorText(document, "heading", "Changed") });
  assert.equal(state.isDirty, true);
});
test("24 successful save updates revision and clears dirty", () => {
  let state = siteEditorReducer(loadedState(), { type: "mutate-document", document: updateEditorText(document, "heading", "Changed") });
  state = siteEditorReducer(state, { type: "save-success", document: { ...currentSiteEditorDocument(state), revision: 1 }, revision: 1 });
  assert.equal(state.isDirty, false); assert.equal(state.currentRevision, 1); assert.equal(state.saveStatus, "saved");
});
test("25 failed save keeps dirty state", () => {
  let state = siteEditorReducer(loadedState(), { type: "mutate-document", document: updateEditorText(document, "heading", "Changed") });
  state = siteEditorReducer(state, { type: "save-failure", error: "offline" });
  assert.equal(state.isDirty, true); assert.equal(state.saveStatus, "error");
});
test("26 revision conflict is explicit", () => {
  const state = siteEditorReducer(loadedState(), { type: "save-failure", conflict: true, error: "conflict" });
  assert.equal(state.saveStatus, "conflict");
});
test("27 dirty page switch requires confirmation", () => assert.match(pageSource, /unsaved changes[\s\S]*?confirm/i));
test("28 beforeunload is attached only while dirty", () => assert.match(pageSource, /if \(!state\.isDirty\) return;[\s\S]*?beforeunload/));
test("29 Publish remains disabled", () => assert.match(topbarSource, /site-editor-publish[\s\S]*?disabled/));
test("30 cross-tenant pages and platform context are rejected", () => {
  assert.equal(normalizeSiteEditorPage({ ...page, tenantId: "eb-chemical" }, "icare"), null);
  assert.equal(siteEditorCapabilities({ role: "super_admin" }, null).canEdit, false);
});
test("31 arbitrary company and domain inputs are not API inputs", () => {
  assert.doesNotMatch(apiSource, /companyId|company_id|X-Company-Id/);
  assert.equal(trustedSitePreview({ ...company, storefrontUrl: "javascript:alert(1)" }), null);
  assert.equal(trustedPagePreview(company, { ...page, tenantId: "eb-chemical" }), null);
});
test("32 existing protected routing and localization remain intact", () => {
  assert.equal(getNavigationItem("admin-site-editor")?.path, "/admin/site-editor");
  assert.equal(canAccessAdminPage(admin, "admin-site-editor"), true);
  assert.equal(hasPermission(admin, "site_editor.access"), true);
  assert.equal(resolvePage("/admin/site-editor", admin), "admin-site-editor");
  assert.equal(siteEditorDirection("ar"), "rtl");
  assert.equal(siteEditorTools.length, 11);
  assert.match(appSource, /activePage === "admin-site-editor"[\s\S]*?<SiteEditorPage/);
  assert.match(editableSource, /ElementContextToolbar/);
});

test("safe image settings and button links update only content", () => {
  const image = updateEditorImageSettings(document, "image", { alt: "Updated alt", link: "https://igroup.website/icare" });
  assert.equal(findEditorNode(image, "image").node.content.alt, "Updated alt");
  const button = updateEditorLink(document, "button", "/icare/shop");
  assert.equal(findEditorNode(button, "button").node.content.link, "/icare/shop");
});

test("33 any connected tenant can edit without iCare hardcoding", () => {
  const brandCompany = { id: "another-brand", slug: "another-brand", name: "Another Brand", storefrontUrl: "https://another-brand.example" };
  const brandPage = { id: "catalog", tenantId: "another-brand", title: "Catalog", pageType: "standard", previewPath: "/catalog", routePattern: "/catalog", status: "source", isEditable: true };
  assert.equal(normalizeSiteEditorPage(brandPage, "another-brand")?.id, "catalog");
  assert.equal(normalizeSiteEditorPage({ ...brandPage, tenantId: "icare" }, "another-brand"), null);
  const brandAdmin = { role: "company_admin", permissions: [] };
  assert.deepEqual(siteEditorCapabilities(brandAdmin, brandCompany), { canAccess: true, canEdit: true, canSave: true, canManageConnection: true, canSyncManifest: true });
  assert.equal(trustedSitePreview(brandCompany), "https://another-brand.example/");
  assert.equal(trustedPagePreview(brandCompany, brandPage), "https://another-brand.example/");
  assert.equal(trustedSitePreview({ ...brandCompany, id: "icare" }), "https://another-brand.example/");
});

test("33b employee site editor capabilities honor granular permissions", () => {
  const employeeEditor = { id: "u2", role: "employee", activeCompany: company, permissions: ["site_editor.access", "site_editor.edit", "site_editor.save"] };
  assert.deepEqual(siteEditorCapabilities(employeeEditor, company), {
    canAccess: true, canEdit: true, canSave: true, canManageConnection: false, canSyncManifest: false,
  });
  assert.equal(canAccessAdminPage(employeeEditor, "admin-site-editor"), true);
  const employeeConnection = { id: "u3", role: "employee", activeCompany: company, permissions: ["site_editor.connection.manage", "site_editor.manifest.sync"] };
  assert.deepEqual(siteEditorCapabilities(employeeConnection, company), {
    canAccess: false, canEdit: false, canSave: false, canManageConnection: true, canSyncManifest: true,
  });
  assert.equal(canAccessAdminPage(employeeConnection, "admin-site-editor"), false);
  const noPerms = { id: "u4", role: "employee", activeCompany: company, permissions: [] };
  assert.deepEqual(siteEditorCapabilities(noPerms, company), {
    canAccess: false, canEdit: false, canSave: false, canManageConnection: false, canSyncManifest: false,
  });
  assert.deepEqual(siteEditorCapabilities(null, company), {
    canAccess: false, canEdit: false, canSave: false, canManageConnection: false, canSyncManifest: false,
  });
});

test("34 editor copy no longer names a specific tenant", () => {
  assert.equal(siteEditorText("pages.description", "en"), "Choose a page to edit in the canvas.");
  assert.doesNotMatch(pageSource, /iCare|icare/);
  assert.doesNotMatch(pagesSource, /iCare|icare/);
});

const connectionSource = read("../src/components/site-editor/WebsiteConnectionScreen.jsx");

test("35 connection screen appears when the company has no connected website", () => {
  assert.match(pageSource, /fetchSiteEditorConnection/);
  assert.match(pageSource, /connectionStatus !== "ready"/);
  assert.match(pageSource, /connectionStatus === "ready" && !connected[\s\S]*?WebsiteConnectionScreen/);
  assert.match(pageSource, /connection\?\.hasManifest === true/);
});

test("36 connection screen uses only the generic connection endpoints", () => {
  assert.match(apiSource, /withSiteQuery\("\/site-editor\/connection", siteId\), \{\s*cache: "no-store" \}/);
  assert.match(apiSource, /withSiteQuery\("\/site-editor\/connection", siteId\), \{\s*method: "PUT"/);
  assert.match(apiSource, /withSiteQuery\("\/site-editor\/connection\/validate", siteId\), \{\s*method: "POST"/);
  assert.match(apiSource, /withSiteQuery\("\/site-editor\/manifest\/sync", siteId\), \{\s*method: "POST"/);
  assert.doesNotMatch(apiSource, /companyId|company_id|X-Company-Id/);
  assert.doesNotMatch(connectionSource, /companyId|company_id/);
});

test("37 connection form exposes the generic website fields", () => {
  for (const marker of ["storefrontBaseUrl", "siteManifestUrl", "siteId", "defaultLocale", "supportedLocales"]) {
    assert.match(connectionSource, new RegExp(marker));
  }
  assert.match(connectionSource, /\/api\/site-manifest/);
  assert.match(connectionSource, /validateSiteEditorConnection\(url\)/);
  assert.match(connectionSource, /syncSiteEditorManifest\(url\)/);
  assert.match(connectionSource, /updateSiteEditorConnection\(/);
});

test("38 connection actions are the generic validate, connect, and resync flow", () => {
  for (const marker of ["connection.validate", "connection.connectSync", "connection.resync"]) {
    assert.match(connectionSource, new RegExp(marker));
  }
  assert.match(connectionSource, /type="submit"/);
  assert.match(connectionSource, /busy === "validate"/);
  assert.match(connectionSource, /busy === "connect"/);
  assert.match(connectionSource, /busy === "resync"/);
});

test("39 connection screen shows status, last sync, and validation outcome", () => {
  for (const marker of ["connection.lastSync", "connection.pending", "site-editor-connection-status", "site-editor-connection-notice"]) {
    assert.match(connectionSource, new RegExp(marker));
  }
  assert.match(connectionSource, /lastManifestSyncAt/);
  assert.match(connectionSource, /connectionError/);
});

test("40 connection CSS is scoped and responsive", () => {
  assert.match(cssSource, /\.site-editor-connection /);
  assert.match(cssSource, /site-editor-connection-card/);
  assert.match(cssSource, /@media \(max-width: 820px\)/);
});

test("41 connection copy is localized for English and Arabic", () => {
  assert.equal(siteEditorText("connection.title", "en"), "Connect your website");
  assert.equal(siteEditorText("connection.title", "ar"), "اربط موقعك");
  assert.equal(siteEditorText("connection.connectSync", "en"), "Connect and Sync");
  assert.equal(siteEditorText("connection.resync", "ar"), "أعد مزامنة البيان");
  assert.equal(siteEditorText("connection.siteManifestUrlHint", "en"), "Defaults to {url}");
});

const quickEditSectionSource = read("../src/components/site-editor/EditableSection.jsx");
const quickEditPanelSource = read("../src/components/site-editor/QuickEditPanel.jsx");
const quickEditSource = read("../src/utils/siteEditorQuickEdit.js");

const quickSection = {
  id: "hero", type: "hero", order: 0,
  settings: { contentAlignment: "end", sourceComponent: "app/icare/components/Hero.tsx" },
  styles: { backgroundColor: "#f4f1eb", paddingBlock: 48, paddingInline: 40, contentAlignment: "start" },
  responsive: {},
  elements: [
    { id: "heading", type: "heading", content: { text: "iCare" }, settings: { editableProperties: ["content", "styles", "responsive"] }, styles: { alignment: "start" }, responsive: {}, children: [] },
    { id: "btn", type: "button", content: { label: "Shop", link: "/icare/shop" }, settings: { editableProperties: ["content"] }, styles: {}, responsive: {}, children: [] },
    { id: "img", type: "image", content: { src: "/uploads/hero.jpg", alt: "hero", link: "" }, settings: { editableProperties: ["content", "styles"] }, styles: {}, responsive: {}, children: [] },
    { id: "collection", type: "productCollection", content: { source: "featured", limit: 10 }, settings: { editableProperties: [] }, styles: {}, responsive: {}, children: [] },
    { id: "list", type: "list", content: { items: ["mission", "philanthropy"] }, settings: { editableProperties: [] }, styles: {}, responsive: {}, children: [] },
    { id: "wrap", type: "container", content: {}, settings: { editableProperties: ["styles"] }, styles: { backgroundColor: "#fff", width: 46 }, responsive: {}, children: [] },
  ],
};

function fieldOf(fields, nodeId, labelKey) {
  return fields.find((field) => field.nodeId === nodeId && field.labelKey === labelKey);
}

test("42 quick edit honors editableProperties and read-only mode", () => {
  assert.equal(quickEditNodeEditable({ settings: { editableProperties: ["content"] } }), true);
  assert.equal(quickEditNodeEditable({ settings: { editableProperties: [] } }), false);
  assert.equal(quickEditNodeEditable({ editable: false, settings: {} }), false);
  assert.equal(quickEditNodeEditable({ settings: {} }), true);
  assert.equal(quickEditPropertyEditable({ settings: { editableProperties: ["content"] } }, "styles"), false);
  assert.equal(quickEditPropertyEditable({ settings: { editableProperties: ["content"] } }, "content", true), false);
});

test("43 quick edit field generation covers section styling", () => {
  const fields = quickEditSectionFields(quickSection);
  const background = fieldOf(fields, "hero", "quickEdit.sectionBackground");
  assert.equal(background.kind, "color");
  assert.equal(background.styleKey, "backgroundColor");
  assert.equal(background.nodeType, "section");
  assert.equal(background.value, "#f4f1eb");
  const spacing = fieldOf(fields, "hero", "quickEdit.spacingVertical");
  assert.equal(spacing.styleKey, "paddingBlock");
  assert.equal(spacing.value, 48);
  const alignment = fieldOf(fields, "hero", "quickEdit.contentAlignment");
  assert.equal(alignment.styleKey, "contentAlignment");
  assert.equal(alignment.value, "start");
});

test("44 quick edit covers heading, button, and image content", () => {
  const fields = quickEditSectionFields(quickSection);
  const heading = fieldOf(fields, "heading", "quickEdit.title");
  assert.equal(heading.kind, "textarea");
  assert.equal(heading.contentKey, "text");
  assert.equal(heading.value, "iCare");
  const label = fieldOf(fields, "btn", "quickEdit.button");
  assert.equal(label.kind, "text");
  assert.equal(label.contentKey, "label");
  const link = fieldOf(fields, "btn", "quickEdit.link");
  assert.equal(link.kind, "link");
  assert.equal(link.contentKey, "link");
  const image = fieldOf(fields, "img", "quickEdit.image");
  assert.equal(image.kind, "image");
  assert.equal(image.value, "/uploads/hero.jpg");
  assert.equal(fieldOf(fields, "img", "quickEdit.alt").contentKey, "alt");
  assert.equal(fieldOf(fields, "img", "quickEdit.link").nodeType, "image");
});

test("45 quick edit never copies collection or list content into the document", () => {
  const fields = quickEditSectionFields(quickSection);
  const collection = fieldOf(fields, "collection", "quickEdit.products");
  assert.equal(collection.kind, "collection");
  assert.equal(collection.editable, false);
  assert.equal(collection.source, "featured");
  assert.equal(collection.limit, 10);
  assert.equal(collection.contentKey, undefined);
  assert.equal(collection.styleKey, undefined);
  const list = fieldOf(fields, "list", "quickEdit.list");
  assert.deepEqual(list.items, ["mission", "philanthropy"]);
  assert.equal(list.contentKey, "items");
  assert.equal(list.editable, false);
});

test("46 read-only mode disables every editable quick field", () => {
  const fields = quickEditSectionFields(quickSection, { readOnly: true });
  assert.equal(fieldOf(fields, "hero", "quickEdit.sectionBackground").editable, false);
  assert.equal(fieldOf(fields, "heading", "quickEdit.title").editable, false);
  assert.equal(fieldOf(fields, "btn", "quickEdit.button").editable, false);
  assert.equal(fieldOf(fields, "img", "quickEdit.alt").editable, false);
});

test("47 restricted properties and container fields are respected", () => {
  const fields = quickEditSectionFields(quickSection);
  assert.equal(fieldOf(fields, "btn", "quickEdit.alignment"), undefined);
  assert.equal(fieldOf(fields, "wrap", "quickEdit.background").styleKey, "backgroundColor");
  assert.equal(fieldOf(fields, "wrap", "quickEdit.width").value, 46);
});

test("48 open quick edit selects the section and clears the inspector", () => {
  let state = loadedState();
  state = siteEditorReducer(state, { type: "open-quick-edit", sectionId: "hero" });
  assert.equal(state.quickEdit, "hero");
  assert.equal(state.selectedSectionId, "hero");
  assert.equal(state.selectedNodeId, "hero");
  assert.equal(state.activeInspector, null);
});

test("49 closing quick edit keeps the section selection", () => {
  let state = siteEditorReducer(loadedState(), { type: "open-quick-edit", sectionId: "hero" });
  state = siteEditorReducer(state, { type: "close-quick-edit" });
  assert.equal(state.quickEdit, null);
  assert.equal(state.selectedSectionId, "hero");
});

test("50 inspector and clear-selection close quick edit (mutex)", () => {
  let state = siteEditorReducer(loadedState(), { type: "open-quick-edit", sectionId: "hero" });
  state = siteEditorReducer(state, { type: "set-inspector", inspector: "heading" });
  assert.equal(state.quickEdit, null);
  assert.equal(state.activeInspector, "heading");
  state = siteEditorReducer(loadedState(), { type: "open-quick-edit", sectionId: "hero" });
  state = siteEditorReducer(state, { type: "clear-selection" });
  assert.equal(state.quickEdit, null);
  assert.equal(state.selectedSectionId, null);
});

test("51 selection while quick edit is open follows the section without reopening the inspector", () => {
  let state = siteEditorReducer(loadedState(), { type: "open-quick-edit", sectionId: "hero" });
  state = siteEditorReducer(state, { type: "select-node", nodeId: "heading", sectionId: "hero", inspector: null });
  assert.equal(state.quickEdit, "hero");
  assert.equal(state.selectedNodeId, "heading");
  assert.equal(state.activeInspector, null);
  state = siteEditorReducer(state, { type: "select-node", nodeId: "heading", sectionId: "hero", inspector: "style" });
  assert.equal(state.quickEdit, null);
  assert.equal(state.activeInspector, "style");
});

test("52 sections render a Quick Edit trigger that opens the panel", () => {
  assert.match(quickEditSectionSource, /site-editor-quick-edit-trigger/);
  assert.match(quickEditSectionSource, /onAction\("quick-edit", section\)/);
  assert.match(quickEditSectionSource, /event\.stopPropagation\(\)[\s\S]*?onAction\("quick-edit", section\)/);
  assert.match(pageSource, /open-quick-edit[\s\S]*?sectionId: node\.id/);
});

test("53 Escape ordering closes quick edit before clearing selection", () => {
  assert.match(pageSource, /if \(state\.editingNodeId\) dispatch\(\{ type: "set-editing-node", nodeId: null \}\)/);
  assert.match(pageSource, /else if \(state\.quickEdit\) dispatch\(\{ type: "close-quick-edit" \}\)/);
  assert.match(pageSource, /else dispatch\(\{ type: "clear-selection" \}\)/);
});

test("54 the quick edit panel renders per-field attributes and read-only badges", () => {
  assert.match(quickEditPanelSource, /data-quick-edit-node-id=\{field\.nodeId\}/);
  assert.match(quickEditPanelSource, /quickEdit\.panelTitle/);
  assert.match(quickEditPanelSource, /quickEdit\.readOnly/);
  assert.match(quickEditPanelSource, /quickEdit\.change/);
  assert.match(quickEditPanelSource, /scrollIntoView/);
  assert.match(quickEditPanelSource, /quickEditSectionFields/);
});

test("55 the page renders the quick edit panel in the resizing workspace column", () => {
  assert.match(pageSource, /<QuickEditPanel/);
  assert.match(pageSource, /quickEditSection && quickEditSection\.kind === "section"/);
  assert.match(pageSource, /quick-edit-open/);
  assert.match(cssSource, /\.site-editor-workspace\.quick-edit-open/);
  assert.match(cssSource, /\.site-editor-quick-edit-panel/);
  assert.match(cssSource, /\.site-editor-editable-section:hover/);
  assert.match(cssSource, /\.site-editor-quick-edit-trigger/);
});

test("56 quick edit copy is bilingual", () => {
  assert.equal(siteEditorText("quickEdit.panelTitle", "en"), "Quick Edit");
  assert.equal(siteEditorText("quickEdit.panelTitle", "ar"), "تعديل سريع");
  assert.equal(siteEditorText("quickEdit.sectionBackground", "ar"), "خلفية القسم");
  assert.equal(siteEditorText("quickEdit.change", "ar"), "تغيير");
  assert.equal(siteEditorText("quickEdit.title", "en"), "Title");
  assert.equal(siteEditorText("quickEdit.readOnly", "ar"), "للعرض فقط");
});

test("57 real section selection follows a new section when switching", () => {
  let state = loadedState();
  state = siteEditorReducer(state, { type: "open-quick-edit", sectionId: "hero" });
  state = siteEditorReducer(state, { type: "select-node", nodeId: "content", sectionId: "content", inspector: null });
  assert.equal(state.quickEdit, "content");
  assert.equal(state.selectedNodeId, "content");
  assert.equal(state.selectedSectionId, "content");
});

test("58 clicking an element keeps the parent quick edit panel open", () => {
  let state = loadedState();
  state = siteEditorReducer(state, { type: "open-quick-edit", sectionId: "hero" });
  state = siteEditorReducer(state, { type: "select-node", nodeId: "heading", sectionId: "hero", inspector: null });
  assert.equal(state.quickEdit, "hero");
  assert.equal(state.selectedNodeId, "heading");
  assert.equal(state.selectedSectionId, "hero");
  assert.equal(state.activeInspector, null);
});

test("59 a non-editable section disables every descendant field", () => {
  const locked = {
    ...quickSection,
    editable: false,
    elements: quickSection.elements.map((element) => ({ ...element, editable: true })),
  };
  const fields = quickEditSectionFields(locked);
  assert.equal(fieldOf(fields, "hero", "quickEdit.sectionBackground").editable, false);
  assert.equal(fieldOf(fields, "heading", "quickEdit.title").editable, false);
  assert.equal(fieldOf(fields, "btn", "quickEdit.button").editable, false);
  assert.equal(fieldOf(fields, "img", "quickEdit.image").editable, false);
});

test("60 quick edit labels and badges are localized before rendering", () => {
  assert.match(quickEditPanelSource, /siteEditorText\(field\.labelKey, language\)/);
  assert.match(quickEditPanelSource, /siteEditorText\("quickEdit\.readOnly", language\)/);
  assert.match(quickEditPanelSource, /siteEditorText\("quickEdit\.change", language\)/);
  assert.equal(siteEditorText("quickEdit.limit", "ar"), "الحد");
  assert.equal(siteEditorText("quickEdit.order", "ar"), "الترتيب");
  assert.equal(siteEditorText("quickEdit.element", "en"), "Element");
});

test("61 draft fields commit on blur and reset on external value changes", () => {
  assert.match(quickEditPanelSource, /useDraftCommit/);
  assert.match(quickEditPanelSource, /externalValue !== syncedRef\.current/);
  assert.match(quickEditPanelSource, /onBlur=\{commit\}/);
  assert.match(quickEditPanelSource, /DraftText|DraftArea|DraftListItem/);
});

test("62 button label and link remain independent", () => {
  const relabeled = updateEditorText(document, "button", "Buy now");
  assert.equal(findEditorNode(relabeled, "button").node.content.label, "Buy now");
  assert.equal(findEditorNode(relabeled, "button").node.content.link, "/icare/shop");
  const relinked = updateEditorLink(document, "button", "/icare/new");
  assert.equal(findEditorNode(relinked, "button").node.content.link, "/icare/new");
  assert.equal(findEditorNode(relinked, "button").node.content.label, "Shop");
});

test("63 structured list edits stay an array of strings", () => {
  const next = updateEditorContentList(document, "list", ["care", "science", "  "]);
  const items = findEditorNode(next, "list")?.node?.content?.items;
  assert.deepEqual(items, ["care", "science"]);
  const cleared = updateEditorContentList(next, "list", []);
  assert.deepEqual(findEditorNode(cleared, "list").node.content.items, []);
});

test("64 collection summaries surface source, limit, and order", () => {
  const fields = quickEditSectionFields(quickSection);
  const collection = fieldOf(fields, "collection", "quickEdit.products");
  assert.equal(collection.source, "featured");
  assert.equal(collection.limit, 10);
  assert.ok("order" in collection);
  assert.match(quickEditPanelSource, /quickEdit\.limit/);
  assert.match(quickEditPanelSource, /quickEdit\.order/);
});

test("65 hovering a section never opens the panel", () => {
  assert.match(quickEditSectionSource, /onAction\("quick-edit", section\)/);
  assert.doesNotMatch(quickEditSectionSource, /onMouseEnter|onMouseOver/);
});

test("66 hover reveals the section label alongside the quick edit trigger", () => {
  assert.match(quickEditSectionSource, /site-editor-section-label/);
  assert.match(cssSource, /\.site-editor-section-label/);
  assert.match(cssSource, /\.site-editor-editable-section:hover > \.site-editor-section-label/);
});

test("67 quick edit positioning uses logical start properties for LTR and RTL", () => {
  assert.match(cssSource, /\.site-editor-quick-edit-trigger \{[\s\S]*?inset-inline-start: 12px/);
  assert.doesNotMatch(cssSource, /\.site-editor-quick-edit-trigger \{[\s\S]*?(?:left|right): 12px/);
});

test("68 quick edit and the style inspector are mutually exclusive in both directions", () => {
  let state = loadedState();
  state = siteEditorReducer(state, { type: "set-inspector", inspector: "heading" });
  state = siteEditorReducer(state, { type: "open-quick-edit", sectionId: "hero" });
  assert.equal(state.activeInspector, null);
  assert.equal(state.quickEdit, "hero");
  state = siteEditorReducer(state, { type: "set-inspector", inspector: "copy" });
  assert.equal(state.quickEdit, null);
  assert.equal(state.activeInspector, "copy");
});

test("69 quick edit leaves the save and revision flow unchanged", () => {
  let state = loadedState();
  state = siteEditorReducer(state, { type: "open-quick-edit", sectionId: "hero" });
  state = siteEditorReducer(state, { type: "mutate-document", document: updateEditorText(document, "heading", "Changed") });
  state = siteEditorReducer(state, { type: "save-success", document: { ...currentSiteEditorDocument(state), revision: 2 }, revision: 2 });
  assert.equal(state.quickEdit, "hero");
  assert.equal(state.isDirty, false);
  assert.equal(state.currentRevision, 2);
  assert.equal(state.history.past.length, 0);
});

test("70 a section background image is presented read-only until an editable binding exists", () => {
  const withBackground = { ...quickSection, settings: { ...quickSection.settings, backgroundImage: "/uploads/hero-bg.jpg" } };
  const fields = quickEditSectionFields(withBackground);
  const background = fieldOf(fields, "hero", "quickEdit.backgroundImage");
  assert.equal(background.kind, "image");
  assert.equal(background.editable, false);
  assert.equal(background.readOnly, true);
  assert.equal(background.value, "/uploads/hero-bg.jpg");
});

test("71 the page wires list commits through the structured content helper", () => {
  assert.match(pageSource, /updateEditorContentList/);
  assert.match(pageSource, /onList=\{\(nodeId, items\)/);
});

const sectionLibrarySource = read("../src/utils/siteEditorSectionLibrary.js");
const railSource = read("../src/components/site-editor/SiteEditorRail.jsx");
const panelSource = read("../src/components/site-editor/SectionLibraryPanel.jsx");
const templateCardSource = read("../src/components/site-editor/SectionTemplateCard.jsx");
const categoryListSource = read("../src/components/site-editor/SectionCategoryList.jsx");
const insertControlsSource = read("../src/components/site-editor/SectionInsertControls.jsx");

const sectionLibrary = {
  version: "1",
  blankSection: { enabled: true, sectionType: "content" },
  categories: [
    { id: "welcome", title: { en: "Welcome", ar: "ترحيب" }, icon: "home", order: 0 },
    { id: "store", title: { en: "Store", ar: "المتجر" }, icon: "shopping-bag", order: 1 },
  ],
  templates: [
    {
      templateId: "hero-overlay",
      categoryId: "welcome",
      sectionType: "hero",
      layoutVariant: "overlay",
      title: { en: "Hero with Image Overlay", ar: "ترحيب بصورة خلفية" },
      description: { en: "Full-bleed image with centered copy", ar: "صورة بعرض كامل مع نص في المنتصف" },
      thumbnail: "https://igroup.website/media/templates/hero-overlay.jpg",
      pageTypes: ["standard", "dynamic"],
      capabilities: { requiresProducts: false, requiresMedia: true },
      defaultSectionDocument: {
        id: "hero-overlay-section",
        sectionType: "hero",
        order: 0,
        editable: true,
        layout: { sourceComponent: "app/icare/components/Hero.tsx", contentAlignment: "center" },
        responsive: {},
        elements: [
          { id: "hero-overlay-image", elementType: "image", order: 0, editable: false, content: { en: { src: "https://igroup.website/media/icare-hero.jpg", alt: "hero" }, ar: { src: "https://igroup.website/media/icare-hero.jpg", alt: "ترحيب" } }, source: { type: "media", key: "hero" }, styles: { width: 100 }, responsive: {}, validation: {}, editableProperties: [], children: [] },
          { id: "hero-overlay-content", elementType: "container", order: 1, editable: true, content: {}, source: null, styles: {}, responsive: {}, validation: {}, editableProperties: ["styles"], children: [
            { id: "hero-overlay-heading", elementType: "heading", order: 0, editable: true, content: { en: { text: "the barrier butter." }, ar: { text: "زبدة الحاجز." } }, source: null, styles: { alignment: "center" }, responsive: {}, validation: {}, editableProperties: ["content"], children: [] },
          ] },
        ],
      },
    },
    {
      templateId: "store-grid",
      categoryId: "store",
      sectionType: "productCollection",
      layoutVariant: "grid",
      title: { en: "Product Grid", ar: "شبكة المنتجات" },
      description: { en: "A responsive grid of products", ar: "شبكة منتجات متجاوبة" },
      thumbnail: "https://igroup.website/media/templates/store-grid.jpg",
      pageTypes: ["standard"],
      capabilities: { requiresProducts: true, requiresMedia: false },
      defaultSectionDocument: {
        id: "store-grid-section",
        sectionType: "productCollection",
        order: 0,
        editable: true,
        layout: { sourceComponent: "app/icare/components/ProductShowcase.tsx" },
        responsive: {},
        elements: [
          { id: "store-grid-collection", elementType: "productCollection", order: 0, editable: false, content: { source: "featured", limit: 8 }, source: { type: "collection", key: "featured" }, styles: {}, responsive: {}, validation: {}, editableProperties: [], children: [] },
        ],
      },
    },
  ],
};

const standardPage = { ...page, pageType: "standard" };

test("72 section library categories normalize in declared order", () => {
  assert.deepEqual(sectionLibraryCategories(sectionLibrary).map((category) => category.id), ["welcome", "store"]);
  assert.deepEqual(sectionLibraryCategories(null), []);
  assert.equal(sectionLibraryCategoryKey("welcome"), "addSection.category.welcome");
  assert.equal(sectionLibraryCategoryKey("unknown"), null);
});

test("73 templates filter by the current page type", () => {
  assert.deepEqual(sectionTemplatesForCategory(sectionLibrary, standardPage, "welcome").map((template) => template.templateId), ["hero-overlay"]);
  assert.deepEqual(sectionTemplatesForCategory(sectionLibrary, standardPage, "store").map((template) => template.templateId), ["store-grid"]);
  assert.equal(sectionTemplatesForCategory(sectionLibrary, { ...standardPage, pageType: "system" }, "store").length, 0);
  assert.equal(sectionTemplatesForCategory(null, standardPage, "welcome").length, 0);
});

test("74 blank section honors the library blankSection flag", () => {
  assert.deepEqual(sectionLibraryBlank(sectionLibrary), { enabled: true, sectionType: "content" });
  assert.equal(blankSectionTemplate(sectionLibrary).templateId, "blank");
  assert.equal(blankSectionTemplate({ ...sectionLibrary, blankSection: { enabled: false } }), null);
});

test("75 template labels and descriptions are localized", () => {
  const template = sectionLibrary.templates[0];
  assert.equal(templateLabel(template, "en"), "Hero with Image Overlay");
  assert.equal(templateLabel(template, "ar"), "ترحيب بصورة خلفية");
  assert.equal(templateLabel({ ...template, title: { ar: "بدون إنجليزية" } }, "en"), "بدون إنجليزية");
  assert.equal(templateLabel({ templateId: "bare" }, "en"), "bare");
  assert.equal(templateDescription(template, "ar"), "صورة بعرض كامل مع نص في المنتصف");
  assert.equal(templateDescription({ title: {} }, "en"), "");
});

test("76 insert positions are validated", () => {
  assert.equal(validSectionInsertPosition("before"), "before");
  assert.equal(validSectionInsertPosition("end"), "end");
  assert.equal(validSectionInsertPosition("sideways"), "after");
});

test("77 inserting a template creates a new section after the target", () => {
  const result = insertSectionAtTarget(document, sectionLibrary.templates[0], { position: "after", targetSectionId: "hero" });
  const next = result.document;
  assert.equal(next.sections.length, 3);
  assert.deepEqual(next.sections.map((section) => section.id), ["hero", result.sectionId, "content"]);
  assert.deepEqual(next.sections.map((section) => section.order), [0, 1, 2]);
  const inserted = next.sections[1];
  assert.equal(result.sectionId, inserted.id);
  assert.equal(inserted.type, "hero");
  assert.match(inserted.id, /^hero-overlay-[a-z0-9]{4,8}$/);
  assert.equal(inserted.editable, true);
  assert.equal(inserted.settings.sourceComponent, "app/icare/components/Hero.tsx");
  assert.equal(inserted.elements.length, 2);
  assert.equal(inserted.elements[0].type, "image");
  assert.equal(inserted.elements[0].editable, false);
  assert.equal(inserted.elements[0].settings.sourceBinding.key, "hero");
  assert.equal(inserted.elements[1].children[0].type, "heading");
  assert.equal(inserted.elements[1].children[0].content.text, "the barrier butter.");
  assert.match(inserted.elements[1].children[0].id, /^hero-overlay-heading-/);
});

test("78 inserting before and at the end positions correctly", () => {
  const before = insertSectionAtTarget(document, sectionLibrary.templates[0], { position: "before", targetSectionId: "content" });
  assert.deepEqual(before.document.sections.map((section) => section.id).slice(0, 3), ["hero", before.sectionId, "content"]);
  const end = insertSectionAtTarget(document, sectionLibrary.templates[0], { position: "end" });
  assert.equal(end.document.sections.at(-1).type, "hero");
  const fallback = insertSectionAtTarget(document, sectionLibrary.templates[0], { position: "after", targetSectionId: "missing" });
  assert.equal(fallback.document.sections.length, 3);
  assert.equal(fallback.document.sections.at(-1).type, "hero");
});

test("79 repeated inserts never reuse template or element ids", () => {
  const once = insertSectionAtTarget(document, sectionLibrary.templates[0], { position: "end" });
  const twice = insertSectionAtTarget(once.document, sectionLibrary.templates[0], { position: "end" });
  assert.equal(twice.document.sections.length, 4);
  const inserted = twice.document.sections.slice(-2);
  assert.notEqual(inserted[0].id, inserted[1].id);
  assert.notEqual(inserted[0].elements[0].id, inserted[1].elements[0].id);
  const ids = new Set();
  for (const section of twice.document.sections) {
    assert.ok(!ids.has(section.id), `duplicate section id ${section.id}`);
    ids.add(section.id);
    const visit = (node) => {
      assert.ok(!ids.has(node.id), `duplicate node id ${node.id}`);
      ids.add(node.id);
      (node.children || []).forEach(visit);
    };
    (section.elements || []).forEach(visit);
  }
});

test("80 blank insert creates an empty section with a fresh id", () => {
  const result = insertSectionAtTarget(document, blankSectionTemplate(sectionLibrary), { position: "end" });
  const next = result.document;
  const inserted = next.sections.at(-1);
  assert.equal(inserted.type, "content");
  assert.match(inserted.id, /^section-[a-z0-9]{4,8}$/);
  assert.equal(result.sectionId, inserted.id);
  assert.deepEqual(inserted.elements, []);
  assert.equal(next.sections.length, 3);
});

test("81 insert ignores missing documents or templates", () => {
  assert.equal(insertSectionAtTarget(null, sectionLibrary.templates[0], {}), null);
  assert.equal(insertSectionAtTarget(document, null, {}).sectionId, null);
  assert.equal(insertSectionAtTarget(document, undefined, {}).document, document);
});

test("82 inserted elements localize content to the active locale", () => {
  const ar = insertSectionAtTarget(document, sectionLibrary.templates[0], { position: "end", locale: "ar" });
  const inserted = ar.document.sections.at(-1);
  assert.equal(inserted.elements[0].content.alt, "ترحيب");
  assert.equal(inserted.elements[1].children[0].content.text, "زبدة الحاجز.");
  const en = insertSectionAtTarget(document, sectionLibrary.templates[0], { position: "end", locale: "en" });
  assert.equal(en.document.sections.at(-1).elements[0].content.alt, "hero");
});

test("83 inserting a template marks dirty, closes the panel, and opens quick edit", () => {
  let state = loadedState();
  state = siteEditorReducer(state, { type: "open-section-library" });
  state = siteEditorReducer(state, { type: "section-library-success", sectionLibrary });
  state = siteEditorReducer(state, { type: "select-section-category", categoryId: "welcome" });
  state = siteEditorReducer(state, { type: "select-section-template", templateId: "hero-overlay" });
  state = siteEditorReducer(state, { type: "insert-section-template", section: sectionLibrary.templates[0] });
  assert.equal(state.isDirty, true);
  assert.equal(state.activePanel, null);
  assert.equal(state.quickEdit, state.selectedNodeId);
  assert.equal(state.selectedSectionId, state.selectedNodeId);
  const inserted = findEditorNode(currentSiteEditorDocument(state), state.selectedNodeId);
  assert.equal(inserted.node.type, "hero");
  assert.equal(state.history.past.length, 1);
});

test("84 a disabled blank section makes the blank insert a no-op", () => {
  let state = loadedState();
  state = siteEditorReducer(state, { type: "section-library-success", sectionLibrary: { ...sectionLibrary, blankSection: { enabled: false } } });
  const before = currentSiteEditorDocument(state);
  const next = siteEditorReducer(state, { type: "insert-section-template", section: null });
  assert.equal(currentSiteEditorDocument(next), before);
  assert.equal(next.isDirty, false);
});

test("85 opening the add-section panel clears quick edit and inspector; toggling closes it", () => {
  let state = siteEditorReducer(loadedState(), { type: "open-quick-edit", sectionId: "hero" });
  state = siteEditorReducer(state, { type: "toggle-panel", panel: "add-section" });
  assert.equal(state.activePanel, "add-section");
  assert.equal(state.quickEdit, null);
  assert.equal(state.activeInspector, null);
  state = siteEditorReducer(state, { type: "toggle-panel", panel: "add-section" });
  assert.equal(state.activePanel, null);
});

test("86 category and template selection state updates", () => {
  let state = siteEditorReducer(loadedState(), { type: "open-section-library" });
  state = siteEditorReducer(state, { type: "section-library-success", sectionLibrary });
  assert.equal(state.activeSectionCategory, "welcome");
  state = siteEditorReducer(state, { type: "select-section-category", categoryId: "store" });
  assert.equal(state.activeSectionCategory, "store");
  assert.equal(state.selectedSectionTemplate, null);
  state = siteEditorReducer(state, { type: "select-section-template", templateId: "store-grid" });
  assert.equal(state.selectedSectionTemplate, "store-grid");
  state = siteEditorReducer(state, { type: "set-section-insert-position", position: "sideways" });
  assert.equal(state.sectionInsertPosition, "after");
  state = siteEditorReducer(state, { type: "set-section-insert-position", position: "before" });
  assert.equal(state.sectionInsertPosition, "before");
});

test("87 undo restores the pre-insert document and redo reapplies it", () => {
  let state = loadedState();
  state = siteEditorReducer(state, { type: "section-library-success", sectionLibrary });
  state = siteEditorReducer(state, { type: "insert-section-template", section: sectionLibrary.templates[0] });
  const insertedId = state.selectedNodeId;
  state = siteEditorReducer(state, { type: "undo" });
  assert.equal(currentSiteEditorDocument(state).sections.length, 2);
  assert.equal(findEditorNode(currentSiteEditorDocument(state), insertedId), null);
  state = siteEditorReducer(state, { type: "redo" });
  assert.equal(currentSiteEditorDocument(state).sections.length, 3);
  assert.equal(findEditorNode(currentSiteEditorDocument(state), insertedId).node.type, "hero");
});

test("88 the section library panel is wired into the page and rail", () => {
  assert.match(pageSource, /<SectionLibraryPanel/);
  assert.match(pageSource, /sectionLibraryOpen && <SectionLibraryPanel/);
  assert.match(pageSource, /sectionTemplatesForCategory\(state\.sectionLibrary/);
  assert.match(pageSource, /fetchSiteEditorSectionLibrary\(/);
  assert.match(pageSource, /section-library-loading/);
  assert.match(railSource, /state\.activePanel === "add-section"\s*\?\s*null/);
  assert.match(panelSource, /id="site-editor-panel-add-section"/);
});

test("89 the panel renders tabs, categories, templates, and insert controls", () => {
  assert.match(panelSource, /addSection\.panelTitle/);
  assert.match(panelSource, /addSection\.templatesTab/);
  assert.match(panelSource, /addSection\.savedSections/);
  assert.match(panelSource, /SectionCategoryList/);
  assert.match(panelSource, /SectionTemplateCard/);
  assert.match(panelSource, /SectionInsertControls/);
  assert.match(panelSource, /insert-section-template/);
  assert.match(panelSource, /selectedSectionTemplate/);
  assert.match(categoryListSource, /blank-section-card/);
  assert.match(categoryListSource, /addSection\.blankSection/);
  assert.match(insertControlsSource, /site-editor-section-insert-position/);
  assert.match(templateCardSource, /template\.templateId/);
  assert.match(templateCardSource, /addSection\.requiresProducts/);
});

test("90 Add Section copy is bilingual and the library is fetched through the generic API", () => {
  assert.equal(siteEditorText("addSection.panelTitle", "en"), "Add Section");
  assert.equal(siteEditorText("addSection.panelTitle", "ar"), "إضافة قسم");
  assert.equal(siteEditorText("addSection.insert", "ar"), "إضافة إلى الصفحة");
  assert.equal(siteEditorText("addSection.category.welcome", "ar"), "ترحيب");
  assert.equal(siteEditorText("addSection.savedSectionsComingSoon", "en"), "Saved sections are coming soon.");
  assert.match(apiSource, /fetchSiteEditorSectionLibrary/);
  assert.match(apiSource, /withSiteQuery\("\/site-editor\/section-library", siteId\), \{\s*cache: "no-store" \}/);
  assert.match(apiSource, /return payload;/);
  assert.doesNotMatch(apiSource, /payload\.sectionLibrary \|\| null/);
});

test("98 a legacy fallback shows a requires-connection message, never a fake connected library", () => {
  assert.equal(siteEditorText("addSection.requiresConnection", "en"), "Reusable section layouts require connecting this storefront's site manifest.");
  assert.equal(siteEditorText("addSection.requiresConnection", "ar"), "تتطلب تنسيقات الأقسام القابلة لإعادة الاستخدام ربط بيان موقع هذا المتجر.");
  let state = siteEditorReducer(loadedState(), {
    type: "section-library-success",
    sectionLibrary: null,
    requiresConnection: true,
  });
  assert.equal(state.sectionLibrary, null);
  assert.equal(state.sectionLibraryRequiresConnection, true);
  assert.equal(state.sectionLibraryStatus, "ready");
  assert.match(panelSource, /addSection\.requiresConnection/);
  assert.match(pageSource, /requiresConnection: result\.requiresConnection === true/);
  state = siteEditorReducer(state, { type: "section-library-reset" });
  assert.equal(state.sectionLibraryRequiresConnection, false);
});

test("98b the requires-connection message closes Add Section and directs the user to the connection flow", () => {
  assert.equal(siteEditorText("addSection.connectWebsite", "en"), "Open website connection");
  assert.equal(siteEditorText("addSection.connectWebsite", "ar"), "فتح إعداد اتصال الموقع");
  assert.match(panelSource, /onRequireConnection/);
  assert.match(panelSource, /addSection\.connectWebsite/);
  assert.match(panelSource, /site-editor-connect-button/);
  assert.match(pageSource, /onRequireConnection=\{\(\) => \{\s*dispatch\(\{ type: "close-section-library" \}\);\s*setConnectionReload/);
});

test("99 a legacy source is never described as a fully connected remote website", () => {
  let state = siteEditorReducer(loadedState(), {
    type: "section-library-success",
    sectionLibrary: { version: "1", categories: [{ id: "welcome", title: { en: "Welcome", ar: "ترحيب" }, order: 0 }], templates: [] },
    requiresConnection: false,
  });
  assert.equal(state.sectionLibraryRequiresConnection, false);
  assert.match(panelSource, /addSection\.noTemplates/);
  assert.match(panelSource, /addSection\.requiresConnection/);
});

test("91 Add Section CSS is scoped and responsive-safe", () => {
  assert.match(cssSource, /\.site-editor-section-library-panel/);
  assert.match(cssSource, /\.site-editor-template-card/);
  assert.match(cssSource, /\.site-editor-category-chip/);
  assert.match(cssSource, /\.site-editor-section-library-body/);
  assert.match(cssSource, /\.site-editor-insert-position/);
});

test("92 the section library effect keeps one active request and never depends on the status it mutates", () => {
  assert.match(pageSource, /\[capabilities\.canAccess, company, connected, connectionStatus, isContextResolving, sectionLibraryOpen, sectionLibraryRetry, siteKey\]/);
  assert.doesNotMatch(pageSource, /sectionLibraryOpen, state\.sectionLibraryStatus\]/);
  assert.match(pageSource, /if \(sectionLibraryRequestRef\.current\) return undefined;/);
  assert.match(pageSource, /sectionLibraryRequestRef\.current = request;/);
});

test("93 idle->loading never cancels the active request; results are only dropped on unmount or a newer request", () => {
  assert.match(pageSource, /let active = true;/);
  assert.match(pageSource, /if \(!active \|\| sectionLibraryRequestRef\.current !== request\) return;/);
  assert.match(pageSource, /active = false;/);
  assert.match(pageSource, /sectionLibraryKeyRef\.current = siteKey;/);
});

test("94 success->ready and failure->error reducer transitions", () => {
  let state = siteEditorReducer(loadedState(), { type: "section-library-loading" });
  assert.equal(state.sectionLibraryStatus, "loading");
  state = siteEditorReducer(state, { type: "section-library-success", sectionLibrary });
  assert.equal(state.sectionLibraryStatus, "ready");
  assert.equal(state.sectionLibrary, sectionLibrary);
  assert.equal(state.sectionLibraryError, "");
  assert.equal(state.activeSectionCategory, "welcome");
  state = siteEditorReducer(state, { type: "section-library-failure", error: "boom" });
  assert.equal(state.sectionLibraryStatus, "error");
  assert.equal(state.sectionLibraryError, "boom");
});

test("95 retry resets the library state to idle, clears the error, and re-triggers a request", () => {
  let state = siteEditorReducer(loadedState(), { type: "section-library-failure", error: "boom" });
  state = siteEditorReducer(state, { type: "section-library-retry" });
  assert.equal(state.sectionLibraryStatus, "idle");
  assert.equal(state.sectionLibraryError, "");
  assert.equal(siteEditorText("addSection.retry", "en"), "Retry");
  assert.equal(siteEditorText("addSection.retry", "ar"), "إعادة المحاولة");
  assert.match(pageSource, /section-library-retry/);
  assert.match(pageSource, /handleSectionLibraryRetry/);
  assert.match(pageSource, /sectionLibraryRetry/);
  assert.match(panelSource, /site-editor-retry-button/);
  assert.match(panelSource, /onRetry/);
});

test("96 a connected company/site change clears the previous tenant's library state", () => {
  let state = siteEditorReducer(loadedState(), { type: "section-library-success", sectionLibrary });
  state = siteEditorReducer(state, { type: "select-section-category", categoryId: "store" });
  state = siteEditorReducer(state, { type: "select-section-template", templateId: "store-grid" });
  state = siteEditorReducer(state, { type: "section-library-reset" });
  assert.equal(state.sectionLibrary, null);
  assert.equal(state.sectionLibraryStatus, "idle");
  assert.equal(state.sectionLibraryError, "");
  assert.equal(state.activeSectionCategory, null);
  assert.equal(state.selectedSectionTemplate, null);
  assert.match(pageSource, /section-library-reset/);
  assert.match(pageSource, /\[siteKey\]/);
});

test("97 another tenant never sees the previous tenant's templates after a site change", () => {
  const standardPage = { ...page, pageType: "standard" };
  let state = siteEditorReducer(loadedState(), { type: "section-library-success", sectionLibrary });
  assert.ok(sectionTemplatesForCategory(state.sectionLibrary, standardPage, "welcome").length > 0);
  state = siteEditorReducer(state, { type: "section-library-reset" });
  assert.deepEqual(sectionTemplatesForCategory(state.sectionLibrary, standardPage, "welcome"), []);
});

const designPanelSource = read("../src/components/site-editor/SiteDesignPanel.jsx");
const themeLibrarySource = read("../src/components/site-editor/ThemeLibraryView.jsx");
const siteEditorDesignSource = read("../src/utils/siteEditorDesign.js");
const railSourceForDesign = read("../src/components/site-editor/SiteEditorRail.jsx");
const canvasSourceForDesign = read("../src/components/site-editor/SiteEditorCanvas.jsx");
const colorThemeViewSource = read("../src/components/site-editor/ColorThemeView.jsx");
const colorInputSource = read("../src/components/site-editor/DesignColorInput.jsx");
const textLibrarySource = read("../src/components/site-editor/TextThemeLibraryView.jsx");
const typographyEditorSource = read("../src/components/site-editor/TypographyEditorView.jsx");
const typographyFieldSource = read("../src/components/site-editor/TypographyFieldControl.jsx");
const siteEditorReducerSource = read("../src/utils/siteEditor.js");

const themeA = {
  themeId: "light", name: { en: "Light", ar: "فاتح" }, description: { en: "Bright theme", ar: "سمة ساطعة" },
  previewSwatches: ["#ffffff", "#2156a8"],
  colorTheme: {
    base: { primaryBackground: "#ffffff", secondaryBackground: "#f5f3ee" },
    general: { linesAndDividers: "#e6e2d9" },
    accent: { primary: "#2156a8", secondary: "#c79a6b", tertiary: "#e8d8c3", quaternary: "#f5f3ee" },
    text: { titles: "#172033", subtitles: "#6b655c", body: "#2a2118", secondary: "#7d7468", linksAndActions: "#2156a8" },
    buttons: { primary: { background: "#2156a8", border: "#2156a8", text: "#ffffff" }, secondary: { background: "#ffffff", border: "#2156a8", text: "#2156a8" } },
  },
};
const themeB = {
  themeId: "dark", name: { en: "Dark", ar: "داكن" }, description: { en: "Dark theme", ar: "سمة داكنة" },
  previewSwatches: ["#151515", "#c79a6b"],
  colorTheme: {
    base: { primaryBackground: "#151515", secondaryBackground: "#2a2118" },
    general: { linesAndDividers: "#3a332b" },
    accent: { primary: "#c79a6b", secondary: "#151515", tertiary: "#6b655c", quaternary: "#2a2118" },
    text: { titles: "#ffffff", subtitles: "#c9c2b8", body: "#f2eeea", secondary: "#a79d8f", linksAndActions: "#e0b58a" },
    buttons: { primary: { background: "#c79a6b", border: "#c79a6b", text: "#151515" }, secondary: { background: "#151515", border: "#c79a6b", text: "#c79a6b" } },
  },
};
const siteDesign = {
  version: "1",
  capabilities: { themes: true, colors: true, typography: false, pageBackgrounds: false, pageTransitions: false },
  defaultThemeId: "light",
  themePresets: [themeA, themeB],
};

const textThemeA = {
  textThemeId: "modern", name: { en: "Modern", ar: "عصري" },
  description: { en: "Clean and airy typography", ar: "خطوط نظيفة وجيدة التهوية" },
  styles: {
    display: { fontFamily: "system-sans", fontSizePx: 56, fontWeight: 700, lineHeight: 1.1, letterSpacingEm: -0.02 },
    heading1: { fontFamily: "system-sans", fontSizePx: 40, fontWeight: 700, lineHeight: 1.2, letterSpacingEm: 0 },
    heading2: { fontFamily: "system-sans", fontSizePx: 30, fontWeight: 600, lineHeight: 1.3, letterSpacingEm: 0 },
    heading3: { fontFamily: "system-sans", fontSizePx: 22, fontWeight: 600, lineHeight: 1.35, letterSpacingEm: 0 },
    body: { fontFamily: "system-sans", fontSizePx: 16, fontWeight: 400, lineHeight: 1.6, letterSpacingEm: 0 },
    small: { fontFamily: "system-sans", fontSizePx: 12, fontWeight: 400, lineHeight: 1.5, letterSpacingEm: 0 },
    button: { fontFamily: "system-sans", fontSizePx: 15, fontWeight: 600, lineHeight: 1.2, letterSpacingEm: 0.01 },
  },
};
const textThemeB = {
  textThemeId: "classic", name: { en: "Classic", ar: "كلاسيكي" },
  description: { en: "Serif elegance", ar: "أناقة سيريف" },
  styles: {
    display: { fontFamily: "georgia", fontSizePx: 52, fontWeight: 700, lineHeight: 1.15, letterSpacingEm: 0 },
    heading1: { fontFamily: "georgia", fontSizePx: 36, fontWeight: 700, lineHeight: 1.2, letterSpacingEm: 0 },
    heading2: { fontFamily: "georgia", fontSizePx: 28, fontWeight: 600, lineHeight: 1.3, letterSpacingEm: 0 },
    heading3: { fontFamily: "georgia", fontSizePx: 21, fontWeight: 600, lineHeight: 1.35, letterSpacingEm: 0 },
    body: { fontFamily: "georgia", fontSizePx: 16, fontWeight: 400, lineHeight: 1.65, letterSpacingEm: 0 },
    small: { fontFamily: "georgia", fontSizePx: 12, fontWeight: 400, lineHeight: 1.5, letterSpacingEm: 0 },
    button: { fontFamily: "georgia", fontSizePx: 14, fontWeight: 600, lineHeight: 1.2, letterSpacingEm: 0.02 },
  },
};
const typographyDesign = {
  ...siteDesign,
  capabilities: { ...siteDesign.capabilities, typography: true },
  defaultTextThemeId: "modern",
  textThemePresets: [textThemeA, textThemeB],
};
const noTypographyDesign = { ...siteDesign, capabilities: { ...siteDesign.capabilities, typography: false } };
const noPresetsTypographyDesign = { ...typographyDesign, textThemePresets: [] };

function typographyState(definition = typographyDesign) {
  let state = loadedState();
  return siteEditorReducer(state, { type: "design-initialize", siteDesign: definition });
}

function designedState(definition = siteDesign) {
  let state = loadedState();
  return siteEditorReducer(state, { type: "design-initialize", siteDesign: definition });
}

test("100 design initializes from connection.siteDesign", () => {
  const state = designedState();
  assert.equal(state.design.available, true);
  assert.equal(state.design.definition, siteDesign);
  assert.equal(state.design.currentThemeId, "light");
  assert.equal(state.design.initialThemeId, "light");
  assert.equal(state.design.colorTheme.base.primaryBackground, "#ffffff");
  assert.equal(state.design.isDirty, false);
  assert.deepEqual(state.design.history, { past: [], future: [] });
  assert.equal(state.design.activeView, "main");
});

test("101 null siteDesign creates an unavailable design state", () => {
  const state = designedState(null);
  assert.equal(state.design.available, false);
  assert.equal(state.design.definition, null);
  assert.equal(state.design.colorTheme, null);
  assert.equal(state.design.currentThemeId, "");
  assert.equal(siteEditorReducer(state, { type: "design-open-view", view: "themes" }).design.activeView, "main");
});

test("102 Site Design opens from the rail", () => {
  assert.match(railSourceForDesign, /SiteDesignPanel/);
  assert.match(railSourceForDesign, /state\.activePanel === "site-design"/);
  const state = siteEditorReducer(loadedState(), { type: "toggle-panel", panel: "site-design" });
  assert.equal(state.activePanel, "site-design");
});

test("103 opening Site Design closes Pages, Add Section, Quick Edit, Inspector, and inline editing", () => {
  let state = siteEditorReducer(loadedState(), { type: "toggle-panel", panel: "pages-menu" });
  state = siteEditorReducer(state, { type: "open-site-design" });
  assert.equal(state.activePanel, "site-design");

  state = siteEditorReducer(state, { type: "toggle-panel", panel: "add-section" });
  state = siteEditorReducer(state, { type: "open-site-design" });
  assert.equal(state.activePanel, "site-design");
  assert.equal(state.activeInspector, null);
  assert.equal(state.quickEdit, null);
  assert.equal(state.editingNodeId, null);
});

test("104 opening Site Design (via rail toggle) closes Quick Edit and Inspector", () => {
  let state = siteEditorReducer(loadedState(), { type: "open-quick-edit", sectionId: "hero" });
  state = siteEditorReducer(state, { type: "toggle-panel", panel: "site-design" });
  assert.equal(state.activePanel, "site-design");
  assert.equal(state.quickEdit, null);
  assert.equal(state.activeInspector, null);

  state = siteEditorReducer(loadedState(), { type: "set-inspector", inspector: "heading" });
  state = siteEditorReducer(state, { type: "toggle-panel", panel: "site-design" });
  assert.equal(state.activePanel, "site-design");
  assert.equal(state.activeInspector, null);
  assert.equal(state.quickEdit, null);
});

test("105 opening Pages closes Site Design", () => {
  let state = siteEditorReducer(loadedState(), { type: "open-site-design" });
  state = siteEditorReducer(state, { type: "toggle-panel", panel: "pages-menu" });
  assert.equal(state.activePanel, "pages-menu");
});

test("106 opening Add Section closes Site Design", () => {
  let state = siteEditorReducer(loadedState(), { type: "open-site-design" });
  state = siteEditorReducer(state, { type: "toggle-panel", panel: "add-section" });
  assert.equal(state.activePanel, "add-section");
  assert.equal(state.design.activeView, "main");
});

test("107 opening Quick Edit closes Site Design", () => {
  let state = siteEditorReducer(loadedState(), { type: "open-site-design" });
  state = siteEditorReducer(state, { type: "open-quick-edit", sectionId: "hero" });
  assert.equal(state.activePanel, null);
  assert.equal(state.quickEdit, "hero");
});

test("108 opening Inspector closes Site Design", () => {
  let state = siteEditorReducer(loadedState(), { type: "open-site-design" });
  state = siteEditorReducer(state, { type: "set-inspector", inspector: "heading" });
  assert.equal(state.activePanel, null);
  assert.equal(state.activeInspector, "heading");
});

test("109 main panel enables Site Theme, Color Theme, and Text Theme; future features are disabled with explanatory copy", () => {
  assert.match(designPanelSource, /site-editor-design-row enabled/);
  assert.match(designPanelSource, /Site Theme/);
  assert.match(designPanelSource, /سمة الموقع/);
  assert.match(designPanelSource, /site-editor-design-row \$\{colorsEnabled \? "enabled" : "disabled"\}/);
  assert.equal((designPanelSource.match(/site-editor-design-row disabled/g) || []).length, 2);
  assert.match(designPanelSource, /Color Theme/);
  assert.match(designPanelSource, /سمة الألوان/);
  assert.match(designPanelSource, /site-editor-design-row \$\{textThemesEnabled \? "enabled" : "disabled"\}/);
  assert.match(designPanelSource, /Text Theme/);
  assert.match(designPanelSource, /سمة الخطوط/);
  assert.match(designPanelSource, /Coming in a later phase/);
  assert.match(designPanelSource, /ستتوفر في مرحلة لاحقة/);
  assert.doesNotMatch(designPanelSource, /design-save|design-publish|onSave|onPublish|localStorage/);
});

test("110 theme cards come from manifest themePresets, not hardcoded ids", () => {
  assert.match(themeLibrarySource, /design\.definition\?\.themePresets/);
  assert.match(themeLibrarySource, /preset\.themeId/);
  assert.match(themeLibrarySource, /preset\.name\?\.\[language\]/);
  assert.match(themeLibrarySource, /preset\.previewSwatches/);
  assert.doesNotMatch(themeLibrarySource, /themeId: "icare|light" \x2d{1}/);
});

test("111 applying a theme updates currentThemeId and colorTheme with one history entry", () => {
  let state = designedState();
  state = siteEditorReducer(state, { type: "design-apply-theme", themeId: "dark" });
  assert.equal(state.design.currentThemeId, "dark");
  assert.equal(state.design.colorTheme.base.primaryBackground, "#151515");
  assert.equal(state.design.history.past.length, 1);
  assert.deepEqual(state.design.history.future, []);
  assert.equal(state.design.isDirty, true);
});

test("112 applying the active theme again is a no-op", () => {
  const state = designedState();
  const result = siteEditorReducer(state, { type: "design-apply-theme", themeId: "light" });
  assert.equal(result, state);
  assert.equal(result.design.history.past.length, 0);
  assert.equal(result.design.colorTheme.base.primaryBackground, "#ffffff");
});

test("113 applying a theme does not modify the page document, page history, revision, fingerprint, or page isDirty", () => {
  let state = designedState();
  const before = currentSiteEditorDocument(state);
  const beforePast = state.history.past.length;
  const beforeRevision = state.currentRevision;
  const beforeFingerprint = state.savedFingerprints[page.id];
  state = siteEditorReducer(state, { type: "design-apply-theme", themeId: "dark" });
  assert.equal(currentSiteEditorDocument(state), before);
  assert.equal(state.history.past.length, beforePast);
  assert.equal(state.currentRevision, beforeRevision);
  assert.equal(state.savedFingerprints[page.id], beforeFingerprint);
  assert.equal(state.isDirty, false);
});

test("114 undo restores previous theme and colors; redo reapplies them", () => {
  let state = designedState();
  state = siteEditorReducer(state, { type: "design-apply-theme", themeId: "dark" });
  state = siteEditorReducer(state, { type: "design-undo" });
  assert.equal(state.design.currentThemeId, "light");
  assert.equal(state.design.colorTheme.base.primaryBackground, "#ffffff");
  assert.equal(state.design.isDirty, false);
  state = siteEditorReducer(state, { type: "design-redo" });
  assert.equal(state.design.currentThemeId, "dark");
  assert.equal(state.design.colorTheme.base.primaryBackground, "#151515");
  assert.equal(state.design.isDirty, true);
});

test("115 applying a theme does not touch page undo/redo stacks", () => {
  let state = designedState();
  state = siteEditorReducer(state, { type: "mutate-document", document: updateEditorText(document, "heading", "Changed") });
  const pagePast = state.history.past.length;
  state = siteEditorReducer(state, { type: "design-apply-theme", themeId: "dark" });
  assert.equal(state.history.past.length, pagePast);
  assert.equal(state.design.history.past.length, 1);
});

test("116 reset restores the manifest default theme; reset at default is a no-op", () => {
  let state = designedState();
  state = siteEditorReducer(state, { type: "design-apply-theme", themeId: "dark" });
  state = siteEditorReducer(state, { type: "design-reset-default" });
  assert.equal(state.design.currentThemeId, "light");
  assert.equal(state.design.colorTheme.base.primaryBackground, "#ffffff");
  assert.equal(state.design.isDirty, false);
  const noop = siteEditorReducer(state, { type: "design-reset-default" });
  assert.equal(noop, state);
});

test("117 tenant/site change resets the design state", () => {
  let state = designedState();
  state = siteEditorReducer(state, { type: "design-apply-theme", themeId: "dark" });
  const reset = siteEditorReducer(state, { type: "design-reset" });
  assert.equal(reset.design.available, false);
  assert.equal(reset.design.definition, null);
  assert.equal(reset.design.currentThemeId, "");
  assert.equal(reset.design.colorTheme, null);
});

test("118 design CSS variables contain only allowlisted properties", () => {
  const variables = createDesignCssVariables(themeA.colorTheme);
  const allowlist = new Set(SITE_DESIGN_CSS_VARIABLES);
  for (const key of Object.keys(variables)) {
    assert.ok(allowlist.has(key), `unexpected variable ${key}`);
  }
  assert.equal(Object.keys(variables).length, SITE_DESIGN_CSS_VARIABLES.length);
  assert.equal(variables["--site-bg-primary"], "#ffffff");
  assert.equal(variables["--site-button-primary-bg"], "#2156a8");
});

test("119 invalid colors are excluded from generated variables", () => {
  const variables = createDesignCssVariables({
    base: { primaryBackground: "not-a-color", secondaryBackground: "#f5f3ee" },
    general: { linesAndDividers: "#e6e2d9" },
    accent: { primary: "#2156a8", secondary: "#c79a6b", tertiary: "#e8d8c3", quaternary: "#f5f3ee" },
    text: { titles: "rgb(0,0,0)", subtitles: "#6b655c", body: "#2a2118", secondary: "#7d7468", linksAndActions: "#2156a8" },
    buttons: { primary: { background: "#2156a8", border: "#2156a8", text: "#ffffff" }, secondary: { background: "#ffffff", border: "#2156a8", text: "#2156a8" } },
  });
  assert.equal(variables["--site-bg-primary"], undefined);
  assert.equal(variables["--site-title-color"], undefined);
  assert.equal(variables["--site-bg-secondary"], "#f5f3ee");
});

test("120 CSS variables apply only to the canvas wrapper", () => {
  assert.match(canvasSourceForDesign, /createDesignCssVariables/);
  assert.match(canvasSourceForDesign, /style=\{designVariables\}/);
  assert.doesNotMatch(railSourceForDesign, /--site-bg-primary/);
  assert.doesNotMatch(designPanelSource, /--site-bg-primary/);
  assert.doesNotMatch(topbarSource, /--site-bg-primary/);
  assert.doesNotMatch(pagesSource, /--site-bg-primary/);
});

test("121 no Site Design save or publish action exists", () => {
  assert.doesNotMatch(designPanelSource, /design-save|design-publish/);
  assert.doesNotMatch(themeLibrarySource, /design-save|design-publish/);
  const saved = siteEditorReducer(designedState(), { type: "design-apply-theme", themeId: "dark" });
  const afterPublish = siteEditorReducer(saved, { type: "design-publish" });
  assert.equal(afterPublish, saved);
  const afterSave = siteEditorReducer(saved, { type: "design-save" });
  assert.equal(afterSave, saved);
});

test("122 Arabic and English copy is present in the design panels", () => {
  assert.match(designPanelSource, /Site Design/);
  assert.match(designPanelSource, /تصميم الموقع/);
  assert.match(designPanelSource, /Preview only\. Saving Site Design will be added in the next phase\./);
  assert.match(designPanelSource, /معاينة فقط\. ستتم إضافة حفظ تصميم الموقع في المرحلة القادمة\./);
  assert.match(designPanelSource, /This website does not support Site Design yet\./);
  assert.match(designPanelSource, /هذا الموقع لا يدعم تصميم الموقع حتى الآن\./);
  assert.match(designPanelSource, /Undo Theme Change/);
  assert.match(designPanelSource, /التراجع عن تغيير السمة/);
  assert.match(designPanelSource, /Redo Theme Change/);
  assert.match(designPanelSource, /إعادة تغيير السمة/);
  assert.match(designPanelSource, /Reset to Default/);
  assert.match(designPanelSource, /استعادة الافتراضي/);
  assert.match(themeLibrarySource, /No theme presets are available for this website\./);
  assert.match(themeLibrarySource, /لا تتوفر تصاميم جاهزة لهذا الموقع\./);
});

test("123 design utility helpers are pure and correct", () => {
  assert.equal(normalizeHexColor("#AbCdEf"), "#abcdef");
  assert.equal(normalizeHexColor("red"), null);
  assert.equal(normalizeHexColor("#fff"), null);
  assert.equal(normalizeHexColor("#gggggg"), null);
  const clone = cloneColorTheme(themeA.colorTheme);
  assert.deepEqual(clone, themeA.colorTheme);
  clone.base.primaryBackground = "#000000";
  assert.equal(themeA.colorTheme.base.primaryBackground, "#ffffff");
  assert.equal(colorThemesEqual(themeA.colorTheme, clone), false);
  assert.equal(colorThemesEqual(themeA.colorTheme, JSON.parse(JSON.stringify(themeA.colorTheme))), true);
  assert.equal(findDefaultTheme(siteDesign).themeId, "light");
  assert.equal(findDefaultTheme({ themePresets: [themeA] }), null);
  assert.equal(findDefaultTheme(null), null);
  assert.equal(createInitialDesignState().available, false);
  assert.equal(createInitialDesignState().activeView, "main");
});

test("124 design is initialized again from the manifest default on reload and site change", () => {
  let state = siteEditorReducer(designedState(), { type: "design-apply-theme", themeId: "dark" });
  state = siteEditorReducer(state, { type: "design-initialize", siteDesign });
  assert.equal(state.design.currentThemeId, "light");
  assert.equal(state.design.colorTheme.base.primaryBackground, "#ffffff");
  assert.equal(state.design.isDirty, false);
  assert.deepEqual(state.design.history, { past: [], future: [] });
  assert.equal(pageSource.includes("design-initialize"), true);
  assert.equal(pageSource.includes("connection?.siteDesign"), true);
});

const noColorsDesign = {
  version: "1",
  capabilities: { themes: true, colors: false, typography: false, pageBackgrounds: false, pageTransitions: false },
  defaultThemeId: "light",
  themePresets: [themeA, themeB],
};

test("125 Color Theme opens only when the colors capability is true", () => {
  const opened = siteEditorReducer(designedState(), { type: "design-open-color-theme" });
  assert.equal(opened.design.activeView, "colors");
  const denied = siteEditorReducer(designedState(noColorsDesign), { type: "design-open-color-theme" });
  assert.equal(denied.design.activeView, "main");
});

test("126 unavailable design cannot open Color Theme", () => {
  const state = designedState(null);
  const result = siteEditorReducer(state, { type: "design-open-color-theme" });
  assert.equal(result, state);
  assert.equal(result.design.activeView, "main");
});

test("127 SITE_DESIGN_COLOR_FIELDS contains exactly 18 allowlisted fields with paths and labels", () => {
  assert.equal(SITE_DESIGN_COLOR_FIELDS.length, 18);
  const ids = SITE_DESIGN_COLOR_FIELDS.map((field) => field.id);
  assert.equal(new Set(ids).size, 18);
  for (const field of SITE_DESIGN_COLOR_FIELDS) {
    assert.ok(Array.isArray(field.path) && field.path.length > 0, field.id);
    assert.ok(field.label && field.label.en && field.label.ar, field.id);
    assert.ok(findColorField(field.id) === field, field.id);
  }
  assert.ok(SITE_DESIGN_COLOR_GROUPS.length >= 6);
  assert.ok(SITE_DESIGN_COLOR_GROUPS.every((group) => group.label.en && group.label.ar));
});

test("128 unknown field IDs are rejected by pure helpers and the reducer", () => {
  assert.equal(findColorField("nope.unknown"), null);
  assert.equal(updateColorThemeValue(themeA.colorTheme, "evil.path", "#000000"), null);
  assert.equal(getColorThemeValue(themeA.colorTheme, "evil.path"), null);
  const state = designedState();
  const before = state.design.history.past.length;
  const result = siteEditorReducer(state, { type: "design-update-color", fieldId: "__proto__.polluted", value: "#000000" });
  assert.equal(result, state);
  assert.equal(result.design.history.past.length, before);
});

test("129 valid uppercase hex normalizes to lowercase; invalid values are rejected", () => {
  assert.equal(normalizeHexColor("#ABCDEF"), "#abcdef");
  assert.equal(normalizeHexColor("  #AbCdEf  "), "#abcdef");
  assert.equal(updateColorThemeValue(themeA.colorTheme, "accent.primary", "#ABCDEF").accent.primary, "#abcdef");
  assert.equal(normalizeHexColor("#fff"), null);
  assert.equal(normalizeHexColor("red"), null);
  assert.equal(normalizeHexColor("rgb(0,0,0)"), null);
  assert.equal(normalizeHexColor("var(--x)"), null);
  assert.equal(normalizeHexColor("url(#x)"), null);
  assert.equal(normalizeHexColor("linear-gradient(#000,#fff)"), null);
  assert.equal(normalizeHexColor("#gggggg"), null);
});

test("130 one committed edit creates one history entry and clears future", () => {
  let state = designedState();
  state = siteEditorReducer(state, { type: "design-update-color", fieldId: "accent.primary", value: "#123456" });
  assert.equal(state.design.history.past.length, 1);
  assert.deepEqual(state.design.history.future, []);
  assert.equal(state.design.colorTheme.accent.primary, "#123456");
  state = siteEditorReducer(state, { type: "design-update-color", fieldId: "text.body", value: "#000000" });
  assert.equal(state.design.history.past.length, 2);
});

test("131 editing to the current value is a no-op", () => {
  const state = designedState();
  const result = siteEditorReducer(state, { type: "design-update-color", fieldId: "accent.primary", value: "#2156A8" });
  assert.equal(result, state);
  assert.equal(result.design.history.past.length, 0);
});

test("132 invalid input does not change design state or preview variables", () => {
  const state = designedState();
  const beforeVars = createDesignCssVariables(state.design.colorTheme);
  const result = siteEditorReducer(state, { type: "design-update-color", fieldId: "accent.primary", value: "red" });
  assert.equal(result, state);
  assert.deepEqual(createDesignCssVariables(result.design.colorTheme), beforeVars);
});

test("133 per-color reset restores the selected preset value", () => {
  let state = designedState();
  state = siteEditorReducer(state, { type: "design-update-color", fieldId: "accent.primary", value: "#123456" });
  assert.equal(state.design.colorTheme.accent.primary, "#123456");
  assert.equal(state.design.history.past.length, 1);
  state = siteEditorReducer(state, { type: "design-reset-color", fieldId: "accent.primary" });
  assert.equal(state.design.colorTheme.accent.primary, "#2156a8");
  assert.equal(state.design.history.past.length, 2);
  assert.equal(state.design.currentThemeId, "light");
});

test("134 per-color reset is a no-op when already at the preset value", () => {
  const state = designedState();
  const result = siteEditorReducer(state, { type: "design-reset-color", fieldId: "accent.primary" });
  assert.equal(result, state);
  assert.equal(result.design.history.past.length, 0);
});

test("135 full color reset restores the selected preset and is a no-op at preset", () => {
  let state = designedState();
  state = siteEditorReducer(state, { type: "design-update-color", fieldId: "accent.primary", value: "#123456" });
  state = siteEditorReducer(state, { type: "design-update-color", fieldId: "text.body", value: "#000000" });
  assert.equal(state.design.isDirty, true);
  state = siteEditorReducer(state, { type: "design-reset-color-theme" });
  assert.deepEqual(state.design.colorTheme, themeA.colorTheme);
  assert.equal(state.design.currentThemeId, "light");
  assert.equal(state.design.isDirty, false);
  const noop = siteEditorReducer(state, { type: "design-reset-color-theme" });
  assert.equal(noop, state);
});

test("136 full color reset does not switch to the manifest default theme", () => {
  let state = designedState();
  state = siteEditorReducer(state, { type: "design-apply-theme", themeId: "dark" });
  state = siteEditorReducer(state, { type: "design-update-color", fieldId: "accent.primary", value: "#123456" });
  state = siteEditorReducer(state, { type: "design-reset-color-theme" });
  assert.equal(state.design.currentThemeId, "dark");
  assert.deepEqual(state.design.colorTheme, themeB.colorTheme);
});

test("137 manual color edits retain currentThemeId and mark the design customized", () => {
  let state = designedState();
  assert.equal(colorThemeIsCustomized(state.design.definition, state.design.currentThemeId, state.design.colorTheme), false);
  state = siteEditorReducer(state, { type: "design-update-color", fieldId: "accent.primary", value: "#123456" });
  assert.equal(state.design.currentThemeId, "light");
  assert.equal(state.design.isDirty, true);
  assert.equal(colorThemeIsCustomized(state.design.definition, state.design.currentThemeId, state.design.colorTheme), true);
});

test("138 applying another theme clears customization and replaces the whole colorTheme", () => {
  let state = designedState();
  state = siteEditorReducer(state, { type: "design-update-color", fieldId: "accent.primary", value: "#123456" });
  assert.equal(colorThemeIsCustomized(state.design.definition, state.design.currentThemeId, state.design.colorTheme), true);
  state = siteEditorReducer(state, { type: "design-apply-theme", themeId: "dark" });
  assert.equal(state.design.currentThemeId, "dark");
  assert.deepEqual(state.design.colorTheme, themeB.colorTheme);
  assert.equal(colorThemeIsCustomized(state.design.definition, state.design.currentThemeId, state.design.colorTheme), false);
  assert.equal(state.design.history.past.length, 2);
});

test("139 undo restores the previous color and redo reapplies the edit", () => {
  let state = designedState();
  state = siteEditorReducer(state, { type: "design-update-color", fieldId: "accent.primary", value: "#123456" });
  state = siteEditorReducer(state, { type: "design-undo" });
  assert.equal(state.design.colorTheme.accent.primary, "#2156a8");
  assert.equal(state.design.currentThemeId, "light");
  assert.equal(state.design.isDirty, false);
  state = siteEditorReducer(state, { type: "design-redo" });
  assert.equal(state.design.colorTheme.accent.primary, "#123456");
  assert.equal(state.design.isDirty, true);
});

test("140 a new edit after undo clears the future history", () => {
  let state = designedState();
  state = siteEditorReducer(state, { type: "design-update-color", fieldId: "accent.primary", value: "#123456" });
  state = siteEditorReducer(state, { type: "design-update-color", fieldId: "text.body", value: "#000000" });
  state = siteEditorReducer(state, { type: "design-undo" });
  state = siteEditorReducer(state, { type: "design-undo" });
  assert.equal(state.design.history.future.length, 2);
  state = siteEditorReducer(state, { type: "design-update-color", fieldId: "text.titles", value: "#111111" });
  assert.deepEqual(state.design.history.future, []);
  assert.equal(state.design.history.past.length, 1);
});

test("141 design color history is capped at MAX_DESIGN_HISTORY", () => {
  let state = designedState();
  for (let i = 0; i < MAX_DESIGN_HISTORY + 10; i += 1) {
    state = siteEditorReducer(state, { type: "design-update-color", fieldId: "accent.primary", value: `#${String(i % 0xffffff).padStart(6, "0")}` });
  }
  assert.ok(state.design.history.past.length <= MAX_DESIGN_HISTORY);
  assert.equal(state.design.history.past.length, MAX_DESIGN_HISTORY);
});

test("142 color edits do not modify page document, page history, revision, fingerprint, or page isDirty", () => {
  let state = designedState();
  const beforeDoc = currentSiteEditorDocument(state);
  const beforePast = state.history.past.length;
  const beforeRevision = state.currentRevision;
  const beforeFp = state.savedFingerprints[page.id];
  state = siteEditorReducer(state, { type: "design-update-color", fieldId: "accent.primary", value: "#123456" });
  assert.equal(currentSiteEditorDocument(state), beforeDoc);
  assert.equal(state.history.past.length, beforePast);
  assert.equal(state.currentRevision, beforeRevision);
  assert.equal(state.savedFingerprints[page.id], beforeFp);
  assert.equal(state.isDirty, false);
});

test("143 canvas variables update from edited colors and remain scoped to the canvas", () => {
  let state = designedState();
  state = siteEditorReducer(state, { type: "design-update-color", fieldId: "accent.primary", value: "#123456" });
  const variables = createDesignCssVariables(state.design.colorTheme);
  assert.equal(variables["--site-accent-primary"], "#123456");
  const allowlist = new Set(SITE_DESIGN_CSS_VARIABLES);
  for (const key of Object.keys(variables)) assert.ok(allowlist.has(key), key);
  assert.match(canvasSourceForDesign, /createDesignCssVariables\(state\.design\?\.colorTheme\)/);
  assert.match(canvasSourceForDesign, /style=\{designVariables\}/);
  assert.doesNotMatch(designPanelSource, /--site-bg-primary/);
  assert.doesNotMatch(colorInputSource, /--site-/);
});

test("144 Arabic and English labels, groups, and validation messages exist", () => {
  assert.match(colorThemeViewSource, /ألوان الموقع/);
  assert.match(colorThemeViewSource, /Color Theme/);
  assert.match(colorThemeViewSource, /Back to Site Design/);
  assert.match(colorThemeViewSource, /العودة إلى تصميم الموقع/);
  assert.match(colorThemeViewSource, /Reset Color Theme/);
  assert.match(colorThemeViewSource, /استعادة ألوان السمة الحالية/);
  assert.match(siteEditorDesignSource, /الخلفيات الأساسية/);
  assert.match(siteEditorDesignSource, /Base Backgrounds/);
  assert.match(siteEditorDesignSource, /الخطوط والفواصل/);
  assert.match(siteEditorDesignSource, /Lines and Dividers/);
  assert.match(siteEditorDesignSource, /الألوان المميزة/);
  assert.match(siteEditorDesignSource, /Accent Colors/);
  assert.match(siteEditorDesignSource, /ألوان النصوص/);
  assert.match(siteEditorDesignSource, /Text Colors/);
  assert.match(siteEditorDesignSource, /الزر الأساسي/);
  assert.match(siteEditorDesignSource, /Primary Button/);
  assert.match(siteEditorDesignSource, /الزر الثانوي/);
  assert.match(siteEditorDesignSource, /Secondary Button/);
  assert.match(colorInputSource, /Enter a valid hex color like #2156a8/);
  assert.match(colorInputSource, /أدخل لونًا سداسيًا صالحًا مثل #2156a8/);
  assert.match(colorInputSource, /إعادة تعيين/);
  assert.match(colorInputSource, /Reset /);
  assert.match(designPanelSource, /مخصص/);
  assert.match(designPanelSource, /Customized/);
  assert.match(themeLibrarySource, /Customized:/);
});

test("145 DesignColorInput uses a local draft, commits on blur/Enter, and rejects invalid input", () => {
  assert.match(colorInputSource, /useState/);
  assert.match(colorInputSource, /draft/);
  assert.match(colorInputSource, /onBlur=\{handleBlur\}/);
  assert.match(colorInputSource, /onKeyDown=\{handleKeyDown\}/);
  assert.match(colorInputSource, /event\.key === "Enter"/);
  assert.match(colorInputSource, /event\.key === "Escape"/);
  assert.match(colorInputSource, /type="color"/);
  assert.match(colorInputSource, /role="alert"/);
  assert.match(colorInputSource, /design-reset-color/);
  assert.match(colorInputSource, /resetDisabled/);
});

test("146 DesignColorInput synchronizes its draft when the value changes externally", () => {
  assert.match(colorInputSource, /useEffect/);
  assert.match(colorInputSource, /setDraft\(value \|\| ""\)/);
});

test("147 Color Theme view reads fields and groups only from the centralized allowlist", () => {
  assert.match(colorThemeViewSource, /SITE_DESIGN_COLOR_FIELDS/);
  assert.match(colorThemeViewSource, /SITE_DESIGN_COLOR_GROUPS/);
  assert.equal(colorThemeViewSource.includes("colorFieldValue"), false);
  assert.doesNotMatch(colorThemeViewSource, /path: \[/);
});

test("148 Color Theme row is conditionally enabled by capability and shows unsupported copy otherwise", () => {
  assert.match(designPanelSource, /design-open-color-theme/);
  assert.match(designPanelSource, /colorsEnabled/);
  assert.match(designPanelSource, /disabled=\{!colorsEnabled\}/);
  assert.match(designPanelSource, /Unsupported for this website/);
  assert.match(designPanelSource, /غير مدعومة لهذا الموقع/);
});

test("149 no persistence, save, publish, API call, or localStorage is introduced for colors", () => {
  assert.doesNotMatch(colorThemeViewSource, /design-save|design-publish|fetch\(|localStorage|onSave|onPublish/);
  assert.doesNotMatch(colorInputSource, /design-save|design-publish|fetch\(|localStorage/);
  const state = siteEditorReducer(designedState(), { type: "design-update-color", fieldId: "accent.primary", value: "#123456" });
  assert.equal(siteEditorReducer(state, { type: "design-publish" }), state);
  assert.equal(siteEditorReducer(state, { type: "design-save" }), state);
});

test("150 typography state initializes from the default text theme", () => {
  const state = typographyState();
  assert.equal(state.design.available, true);
  assert.equal(state.design.currentTextThemeId, "modern");
  assert.equal(state.design.initialTextThemeId, "modern");
  assert.equal(state.design.textThemeStyles.body.fontSizePx, 16);
  assert.equal(state.design.textThemeStyles.body.fontFamily, "system-sans");
  assert.deepEqual(state.design.initialTextThemeStyles, state.design.textThemeStyles);
  assert.deepEqual(state.design.textHistory, { past: [], future: [] });
});

test("151 missing typography creates empty text theme state", () => {
  const state = typographyState(noTypographyDesign);
  assert.equal(state.design.currentTextThemeId, "");
  assert.equal(state.design.textThemeStyles, null);
  assert.equal(state.design.initialTextThemeId, "");
  assert.equal(state.design.initialTextThemeStyles, null);
  assert.deepEqual(state.design.textHistory, { past: [], future: [] });
  const noPresets = typographyState(noPresetsTypographyDesign);
  assert.equal(noPresets.design.currentTextThemeId, "");
  assert.equal(noPresets.design.textThemeStyles, null);
});

test("152 Text Theme opens when the typography capability is true", () => {
  const opened = siteEditorReducer(typographyState(), { type: "design-open-text-theme" });
  assert.equal(opened.design.activeView, "text-themes");
});

test("153 Text Theme cannot open when the typography capability is false", () => {
  const denied = siteEditorReducer(typographyState(noTypographyDesign), { type: "design-open-text-theme" });
  assert.equal(denied.design.activeView, "main");
});

test("154 Text Theme cannot open without valid presets", () => {
  const denied = siteEditorReducer(typographyState(noPresetsTypographyDesign), { type: "design-open-text-theme" });
  assert.equal(denied.design.activeView, "main");
  assert.equal(textThemePresetsAvailable(noPresetsTypographyDesign), false);
  assert.equal(textThemePresetsAvailable(noTypographyDesign), false);
  assert.equal(textThemePresetsAvailable(typographyDesign), true);
});

test("155 text theme cards come from the manifest textThemePresets, not hardcoded ids", () => {
  assert.match(textLibrarySource, /design\.definition\?\.textThemePresets/);
  assert.match(textLibrarySource, /preset\.textThemeId/);
  assert.match(textLibrarySource, /preset\.name\?\.\[language\]/);
  assert.doesNotMatch(textLibrarySource, /textThemeId: "modern|classic"/);
});

test("156 applying a preset updates textThemeId and styles with one text history entry", () => {
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-apply-text-theme", textThemeId: "classic" });
  assert.equal(state.design.currentTextThemeId, "classic");
  assert.equal(state.design.textThemeStyles.body.fontFamily, "georgia");
  assert.equal(state.design.textThemeStyles.display.fontSizePx, 52);
  assert.equal(state.design.textHistory.past.length, 1);
  assert.deepEqual(state.design.textHistory.future, []);
  assert.equal(state.design.history.past.length, 0);
});

test("157 applying the current preset again is a no-op", () => {
  const state = typographyState();
  const result = siteEditorReducer(state, { type: "design-apply-text-theme", textThemeId: "modern" });
  assert.equal(result, state);
  assert.equal(result.design.textHistory.past.length, 0);
  assert.equal(result.design.currentTextThemeId, "modern");
});

test("158 one apply creates exactly one text history entry", () => {
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-apply-text-theme", textThemeId: "classic" });
  assert.equal(state.design.textHistory.past.length, 1);
  assert.deepEqual(state.design.textHistory.future, []);
  assert.equal(state.design.textHistory.past[0].textThemeId, "modern");
});

test("159 applying after undo clears future text history", () => {
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-apply-text-theme", textThemeId: "classic" });
  state = siteEditorReducer(state, { type: "design-undo-text-theme" });
  assert.equal(state.design.textHistory.future.length, 1);
  assert.equal(state.design.currentTextThemeId, "modern");
  state = siteEditorReducer(state, { type: "design-apply-text-theme", textThemeId: "classic" });
  assert.deepEqual(state.design.textHistory.future, []);
  assert.equal(state.design.textHistory.past.length, 1);
});

test("160 text theme history is capped at 30", () => {
  let state = typographyState();
  for (let i = 0; i < MAX_TEXT_THEME_HISTORY + 10; i += 1) {
    state = siteEditorReducer(state, { type: "design-apply-text-theme", textThemeId: i % 2 === 0 ? "classic" : "modern" });
  }
  assert.ok(state.design.textHistory.past.length <= MAX_TEXT_THEME_HISTORY);
  assert.equal(state.design.textHistory.past.length, MAX_TEXT_THEME_HISTORY);
});

test("161 undo restores the previous text preset", () => {
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-apply-text-theme", textThemeId: "classic" });
  state = siteEditorReducer(state, { type: "design-undo-text-theme" });
  assert.equal(state.design.currentTextThemeId, "modern");
  assert.equal(state.design.textThemeStyles.body.fontFamily, "system-sans");
  assert.equal(state.design.textHistory.future.length, 1);
});

test("162 redo reapplies the next text preset", () => {
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-apply-text-theme", textThemeId: "classic" });
  state = siteEditorReducer(state, { type: "design-undo-text-theme" });
  state = siteEditorReducer(state, { type: "design-redo-text-theme" });
  assert.equal(state.design.currentTextThemeId, "classic");
  assert.equal(state.design.textThemeStyles.body.fontFamily, "georgia");
  assert.equal(state.design.textHistory.past.length, 1);
  assert.deepEqual(state.design.textHistory.future, []);
});

test("163 reset restores defaultTextThemeId", () => {
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-apply-text-theme", textThemeId: "classic" });
  state = siteEditorReducer(state, { type: "design-reset-text-theme" });
  assert.equal(state.design.currentTextThemeId, "modern");
  assert.equal(state.design.textThemeStyles.body.fontFamily, "system-sans");
  assert.equal(state.design.textHistory.past.length, 2);
  assert.equal(state.design.textHistory.past[0].textThemeId, "modern");
  assert.equal(state.design.textHistory.past[1].textThemeId, "classic");
});

test("164 reset at default is a no-op", () => {
  const state = typographyState();
  const noop = siteEditorReducer(state, { type: "design-reset-text-theme" });
  assert.equal(noop, state);
  assert.equal(noop.design.textHistory.past.length, 0);
});

test("165 Text Theme changes do not modify colors or color history", () => {
  let state = typographyState();
  const beforeColors = JSON.stringify(state.design.colorTheme);
  const beforeColorHistory = JSON.stringify(state.design.history);
  state = siteEditorReducer(state, { type: "design-apply-text-theme", textThemeId: "classic" });
  state = siteEditorReducer(state, { type: "design-undo-text-theme" });
  assert.equal(JSON.stringify(state.design.colorTheme), beforeColors);
  assert.equal(JSON.stringify(state.design.history), beforeColorHistory);
  assert.equal(state.design.currentThemeId, "light");
});

test("166 Text Theme changes do not modify page document, page history, revision, fingerprint, or page isDirty", () => {
  let state = typographyState();
  const beforeDoc = currentSiteEditorDocument(state);
  const beforePast = state.history.past.length;
  const beforeRevision = state.currentRevision;
  const beforeFp = state.savedFingerprints[page.id];
  state = siteEditorReducer(state, { type: "design-apply-text-theme", textThemeId: "classic" });
  assert.equal(currentSiteEditorDocument(state), beforeDoc);
  assert.equal(state.history.past.length, beforePast);
  assert.equal(state.currentRevision, beforeRevision);
  assert.equal(state.savedFingerprints[page.id], beforeFp);
  assert.equal(state.isDirty, false);
});

test("167 safe font identifiers map to fixed CSS stacks only", () => {
  const variables = createTypographyCssVariables(textThemeA.styles);
  assert.equal(variables["--site-body-font-family"], SITE_DESIGN_FONT_FAMILY_MAP["system-sans"]);
  assert.match(variables["--site-display-font-family"], /sans-serif/);
  assert.equal(variables["--site-button-font-family"], SITE_DESIGN_FONT_FAMILY_MAP["system-sans"]);
  const georgiaVars = createTypographyCssVariables(textThemeB.styles);
  assert.equal(georgiaVars["--site-heading1-font-family"], SITE_DESIGN_FONT_FAMILY_MAP.georgia);
});

test("168 invalid font identifiers generate no CSS variable", () => {
  const applied = applyTextThemePreset({ textThemeId: "bad", styles: { body: { fontFamily: "Comic Sans MS", fontSizePx: 16, fontWeight: 400, lineHeight: 1.5, letterSpacingEm: 0 } } });
  assert.ok(applied);
  assert.equal(applied.textThemeStyles.body.fontFamily, undefined);
  const variables = createTypographyCssVariables(applied.textThemeStyles);
  assert.equal(variables["--site-body-font-family"], undefined);
  assert.equal(variables["--site-body-font-size"], "16px");
});

test("169 invalid sizes, weights, line heights, and spacing are rejected", () => {
  const bad = {
    body: {
      fontFamily: "arial", fontSizePx: 4, fontWeight: 900, lineHeight: 3, letterSpacingEm: 5,
    },
  };
  const styles = { ...textThemeA.styles, body: { ...textThemeA.styles.body, ...bad.body } };
  const variables = createTypographyCssVariables(styles);
  assert.equal(variables["--site-body-font-size"], undefined);
  assert.equal(variables["--site-body-font-weight"], undefined);
  assert.equal(variables["--site-body-line-height"], undefined);
  assert.equal(variables["--site-body-letter-spacing"], undefined);
  assert.equal(variables["--site-body-font-family"], SITE_DESIGN_FONT_FAMILY_MAP.arial);
  const applied = applyTextThemePreset({ textThemeId: "x", styles });
  assert.equal(applied.textThemeStyles.body.fontFamily, "arial");
  assert.equal(applied.textThemeStyles.body.fontSizePx, undefined);
  assert.equal(applied.textThemeStyles.body.fontWeight, undefined);
  assert.equal(applied.textThemeStyles.body.lineHeight, undefined);
  assert.equal(applied.textThemeStyles.body.letterSpacingEm, undefined);
});

test("170 typography CSS variables use only the fixed allowlist", () => {
  const variables = createTypographyCssVariables(textThemeA.styles);
  const allowlist = new Set(SITE_DESIGN_TYPOGRAPHY_CSS_VARIABLES);
  for (const key of Object.keys(variables)) {
    assert.ok(allowlist.has(key), `unexpected variable ${key}`);
  }
  assert.equal(Object.keys(variables).length, SITE_DESIGN_TYPOGRAPHY_CSS_VARIABLES.length);
  assert.equal(SITE_DESIGN_TYPOGRAPHY_CSS_VARIABLES.length, SITE_DESIGN_TEXT_STYLE_TOKENS.length * 5);
  assert.ok(SITE_DESIGN_TYPOGRAPHY_CSS_VARIABLES.includes("--site-display-font-family"));
  assert.ok(SITE_DESIGN_TYPOGRAPHY_CSS_VARIABLES.includes("--site-button-letter-spacing"));
});

test("171 typography variables are applied only to the canvas wrapper", () => {
  assert.match(canvasSourceForDesign, /createTypographyCssVariables\(state\.design\?\.textThemeStyles\)/);
  assert.match(canvasSourceForDesign, /style=\{designVariables\}/);
  assert.doesNotMatch(railSourceForDesign, /--site-body-font-family|--site-display-font-family/);
  assert.doesNotMatch(designPanelSource, /--site-body-font-family|--site-display-font-family/);
  assert.doesNotMatch(topbarSource, /--site-body-font-family|--site-display-font-family/);
  assert.doesNotMatch(pagesSource, /--site-body-font-family|--site-display-font-family/);
});

test("172 Arabic and English Text Theme panel copy exists", () => {
  assert.match(textLibrarySource, /Text Theme/);
  assert.match(textLibrarySource, /سمة الخطوط/);
  assert.match(textLibrarySource, /Back to Site Design/);
  assert.match(textLibrarySource, /العودة إلى تصميم الموقع/);
  assert.match(textLibrarySource, /Undo Text Theme/);
  assert.match(textLibrarySource, /التراجع عن تغيير الخط/);
  assert.match(textLibrarySource, /Redo Text Theme/);
  assert.match(textLibrarySource, /إعادة تغيير الخط/);
  assert.match(textLibrarySource, /Reset to Default/);
  assert.match(textLibrarySource, /استعادة الافتراضي/);
  assert.match(textLibrarySource, /Current/);
  assert.match(textLibrarySource, /الحالية/);
  assert.match(textLibrarySource, /Apply/);
  assert.match(textLibrarySource, /تطبيق/);
  assert.match(textLibrarySource, /Beautiful care, clearly expressed/);
  assert.match(textLibrarySource, /عناية جميلة بتعبير واضح/);
  assert.match(textLibrarySource, /Thoughtful typography for every part of your website\./);
  assert.match(textLibrarySource, /خطوط متناسقة لجميع أجزاء موقعك\./);
  assert.match(designPanelSource, /سمة الخطوط/);
  assert.match(designPanelSource, /Unsupported for this website/);
  assert.match(designPanelSource, /غير مدعومة لهذا الموقع/);
});

test("173 no save, publish, API call, localStorage, font upload, URL, or @font-face is introduced for text themes", () => {
  assert.doesNotMatch(textLibrarySource, /design-save|design-publish|fetch\(|localStorage|onSave|onPublish/);
  assert.doesNotMatch(textLibrarySource, /@font-face|fonts\.googleapis|googleapis|font-upload|upload/);
  assert.doesNotMatch(siteEditorDesignSource, /@font-face|fetch\(|localStorage|googleapis/);
  assert.doesNotMatch(canvasSourceForDesign, /@font-face|googleapis|fetch\(/);
  const state = typographyState();
  assert.equal(siteEditorReducer(state, { type: "design-publish" }), state);
  assert.equal(siteEditorReducer(state, { type: "design-save" }), state);
});

test("174 text theme helpers are pure and correct", () => {
  const clone = cloneTextThemeStyles(textThemeA.styles);
  assert.deepEqual(clone, textThemeA.styles);
  clone.body.fontSizePx = 99;
  assert.equal(textThemeA.styles.body.fontSizePx, 16);
  assert.equal(textThemeStylesEqual(textThemeA.styles, JSON.parse(JSON.stringify(textThemeA.styles))), true);
  assert.equal(textThemeStylesEqual(textThemeA.styles, clone), false);
  assert.equal(findDefaultTextTheme(typographyDesign).textThemeId, "modern");
  assert.equal(findTextThemePreset(typographyDesign, "classic").textThemeId, "classic");
  assert.equal(findTextThemePreset(typographyDesign, "nope"), null);
  assert.equal(findDefaultTextTheme({ textThemePresets: [textThemeA] }), null);
  assert.equal(findDefaultTextTheme(null), null);
  assert.ok(SITE_DESIGN_TEXT_STYLE_TOKENS.includes("display"));
  assert.ok(SITE_DESIGN_TEXT_STYLE_TOKENS.includes("button"));
});

test("175 SITE_DESIGN_TYPOGRAPHY_FIELDS contains exactly five unique properties", () => {
  assert.equal(SITE_DESIGN_TYPOGRAPHY_FIELDS.length, 5);
  const properties = SITE_DESIGN_TYPOGRAPHY_FIELDS.map((field) => field.property);
  assert.equal(new Set(properties).size, 5);
  for (const field of SITE_DESIGN_TYPOGRAPHY_FIELDS) {
    assert.equal(field.id, field.property);
    assert.ok(field.type === "select" || field.type === "number");
    assert.ok(field.label && field.label.en && field.label.ar, field.property);
    assert.equal(findTypographyField(field.property), field);
  }
});

test("176 Font Family exposes only safe mapped identifiers", () => {
  const fontField = findTypographyField("fontFamily");
  assert.equal(fontField.type, "select");
  assert.deepEqual(fontField.values, Object.keys(SITE_DESIGN_FONT_FAMILY_MAP));
  assert.ok(fontField.values.every((value) => Object.prototype.hasOwnProperty.call(SITE_DESIGN_FONT_FAMILY_MAP, value)));
});

test("177 numeric limits and steps match the contract", () => {
  const size = findTypographyField("fontSizePx");
  assert.equal(size.type, "number");
  assert.equal(size.min, 10);
  assert.equal(size.max, 96);
  assert.equal(size.step, 1);
  assert.equal(size.integer, true);
  const weight = findTypographyField("fontWeight");
  assert.equal(weight.type, "select");
  assert.deepEqual(weight.values, [300, 400, 500, 600, 700, 800]);
  const lineHeight = findTypographyField("lineHeight");
  assert.equal(lineHeight.min, 1);
  assert.equal(lineHeight.max, 2);
  assert.equal(lineHeight.step, 0.05);
  const spacing = findTypographyField("letterSpacingEm");
  assert.equal(spacing.min, -0.1);
  assert.equal(spacing.max, 0.3);
  assert.equal(spacing.step, 0.005);
});

test("178 Arabic and English typography field labels exist", () => {
  for (const field of SITE_DESIGN_TYPOGRAPHY_FIELDS) {
    assert.ok(typeof field.label.en === "string" && field.label.en.length > 0, `${field.property}.en`);
    assert.ok(typeof field.label.ar === "string" && field.label.ar.length > 0, `${field.property}.ar`);
  }
  assert.match(siteEditorDesignSource, /عائلة الخط/);
  assert.match(siteEditorDesignSource, /Font family/);
  assert.match(siteEditorDesignSource, /حجم الخط/);
  assert.match(siteEditorDesignSource, /Font size/);
  assert.match(siteEditorDesignSource, /وزن الخط/);
  assert.match(siteEditorDesignSource, /Font weight/);
  assert.match(siteEditorDesignSource, /ارتفاع السطر/);
  assert.match(siteEditorDesignSource, /Line height/);
  assert.match(siteEditorDesignSource, /تباعد الأحرف/);
  assert.match(siteEditorDesignSource, /Letter spacing/);
});

test("179 findTypographyField rejects unknown properties", () => {
  assert.equal(findTypographyField("bogus"), null);
  assert.equal(findTypographyField("font-size"), null);
  assert.equal(findTypographyField(""), null);
  assert.equal(findTypographyField(123), null);
  assert.equal(findTypographyField(null), null);
  assert.equal(findTypographyField("fontFamily").property, "fontFamily");
});

test("180 getTypographyValue reads only valid tokens and properties", () => {
  assert.equal(getTypographyValue(textThemeA.styles, "body", "fontSizePx"), 16);
  assert.equal(getTypographyValue(textThemeA.styles, "body", "fontFamily"), "system-sans");
  assert.equal(getTypographyValue(textThemeA.styles, "nope", "fontSizePx"), null);
  assert.equal(getTypographyValue(textThemeA.styles, "body", "bogus"), null);
  assert.equal(getTypographyValue(null, "body", "fontSizePx"), null);
  assert.equal(getTypographyValue({}, "body", "fontSizePx"), null);
});

test("181 normalizeTypographyValue accepts valid numbers", () => {
  assert.equal(normalizeTypographyValue("fontSizePx", 18), 18);
  assert.equal(normalizeTypographyValue("fontSizePx", 10), 10);
  assert.equal(normalizeTypographyValue("fontSizePx", 96), 96);
  assert.equal(normalizeTypographyValue("lineHeight", 1.5), 1.5);
  assert.equal(normalizeTypographyValue("letterSpacingEm", -0.05), -0.05);
  assert.equal(normalizeTypographyValue("letterSpacingEm", 0.3), 0.3);
  assert.equal(normalizeTypographyValue("fontWeight", 600), 600);
  assert.equal(normalizeTypographyValue("fontWeight", 300), 300);
  assert.equal(normalizeTypographyValue("fontFamily", "georgia"), "georgia");
});

test("182 normalizeTypographyValue accepts trimmed valid numeric strings", () => {
  assert.equal(normalizeTypographyValue("fontSizePx", "18"), 18);
  assert.equal(normalizeTypographyValue("fontSizePx", " 18 "), 18);
  assert.equal(normalizeTypographyValue("lineHeight", "1.5"), 1.5);
  assert.equal(normalizeTypographyValue("letterSpacingEm", "-0.05"), -0.05);
  assert.equal(normalizeTypographyValue("fontWeight", "600"), 600);
});

test("183 normalizeTypographyValue rejects empty strings, NaN, Infinity, units, and mixed text", () => {
  assert.equal(normalizeTypographyValue("fontSizePx", ""), null);
  assert.equal(normalizeTypographyValue("fontSizePx", "   "), null);
  assert.equal(normalizeTypographyValue("fontSizePx", NaN), null);
  assert.equal(normalizeTypographyValue("fontSizePx", Infinity), null);
  assert.equal(normalizeTypographyValue("fontSizePx", -Infinity), null);
  assert.equal(normalizeTypographyValue("fontSizePx", "16px"), null);
  assert.equal(normalizeTypographyValue("fontSizePx", "abc"), null);
  assert.equal(normalizeTypographyValue("fontSizePx", "18abc"), null);
  assert.equal(normalizeTypographyValue("fontSizePx", "1 8"), null);
  assert.equal(normalizeTypographyValue("lineHeight", "1.5rem"), null);
  assert.equal(normalizeTypographyValue("fontSizePx", undefined), null);
  assert.equal(normalizeTypographyValue("fontSizePx", null), null);
});

test("184 fontSizePx rejects decimals and out-of-range integers", () => {
  assert.equal(normalizeTypographyValue("fontSizePx", 16.5), null);
  assert.equal(normalizeTypographyValue("fontSizePx", "16.5"), null);
  assert.equal(normalizeTypographyValue("fontSizePx", 9), null);
  assert.equal(normalizeTypographyValue("fontSizePx", 97), null);
  assert.equal(normalizeTypographyValue("fontSizePx", "9"), null);
  assert.equal(normalizeTypographyValue("fontSizePx", "97"), null);
  assert.equal(normalizeTypographyValue("fontSizePx", 20), 20);
});

test("185 fontFamily rejects unknown identifiers and raw CSS stacks", () => {
  assert.equal(normalizeTypographyValue("fontFamily", "Comic Sans MS"), null);
  assert.equal(normalizeTypographyValue("fontFamily", "Arial, sans-serif"), null);
  assert.equal(normalizeTypographyValue("fontFamily", "'Georgia', serif"), null);
  assert.equal(normalizeTypographyValue("fontFamily", ""), null);
  assert.equal(normalizeTypographyValue("fontFamily", 123), null);
  assert.equal(normalizeTypographyValue("fontFamily", null), null);
  assert.equal(normalizeTypographyValue("fontFamily", "arial"), "arial");
  assert.equal(normalizeTypographyValue("fontFamily", " times-new-roman "), "times-new-roman");
});

test("186 updateTypographyValue does not mutate the original styles", () => {
  const before = JSON.stringify(textThemeA.styles);
  const next = updateTypographyValue(textThemeA.styles, "body", "fontSizePx", 18);
  assert.equal(JSON.stringify(textThemeA.styles), before);
  assert.equal(textThemeA.styles.body.fontSizePx, 16);
  assert.equal(next.body.fontSizePx, 18);
});

test("187 a valid manual update changes one property only", () => {
  const next = updateTypographyValue(textThemeA.styles, "body", "fontSizePx", 18);
  assert.equal(next.body.fontSizePx, 18);
  assert.equal(next.body.fontFamily, "system-sans");
  assert.equal(next.body.fontWeight, 400);
  assert.equal(next.body.lineHeight, 1.6);
  assert.equal(next.body.letterSpacingEm, 0);
  assert.equal(next.display.fontSizePx, 56);
});

test("188 an invalid update returns null", () => {
  assert.equal(updateTypographyValue(textThemeA.styles, "nope", "fontSizePx", 18), null);
  assert.equal(updateTypographyValue(textThemeA.styles, "body", "bogus", 18), null);
  assert.equal(updateTypographyValue(textThemeA.styles, "body", "fontSizePx", 4), null);
  assert.equal(updateTypographyValue(textThemeA.styles, "body", "fontSizePx", "16px"), null);
  assert.equal(updateTypographyValue(null, "body", "fontSizePx", 18), null);
  assert.equal(updateTypographyValue(textThemeA.styles, "body", "fontSizePx", "bogus"), null);
});

test("189 applying a manual update retains currentTextThemeId", () => {
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 18 });
  assert.equal(state.design.currentTextThemeId, "modern");
  assert.equal(state.design.textThemeStyles.body.fontSizePx, 18);
  assert.equal(state.design.currentTextThemeId, "modern");
});

test("190 one manual update creates exactly one text history entry", () => {
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 18 });
  assert.equal(state.design.textHistory.past.length, 1);
  assert.deepEqual(state.design.textHistory.future, []);
  assert.equal(state.design.textHistory.past[0].textThemeId, "modern");
});

test("191 updating to the current value is a reducer no-op", () => {
  const state = typographyState();
  const result = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 16 });
  assert.equal(result, state);
  assert.equal(result.design.textHistory.past.length, 0);
  const sameValue = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontFamily", value: "system-sans" });
  assert.equal(sameValue, state);
});

test("192 manual update after undo clears future history", () => {
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 18 });
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "lineHeight", value: 1.9 });
  state = siteEditorReducer(state, { type: "design-undo-text-theme" });
  state = siteEditorReducer(state, { type: "design-undo-text-theme" });
  assert.equal(state.design.textHistory.future.length, 2);
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "letterSpacingEm", value: 0.1 });
  assert.deepEqual(state.design.textHistory.future, []);
  assert.equal(state.design.textHistory.past.length, 1);
});

test("193 text theme history remains capped at 30 after manual edits", () => {
  let state = typographyState();
  for (let i = 0; i < MAX_TEXT_THEME_HISTORY + 10; i += 1) {
    state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: i % 2 === 0 ? 17 : 18 });
  }
  assert.ok(state.design.textHistory.past.length <= MAX_TEXT_THEME_HISTORY);
  assert.equal(state.design.textHistory.past.length, MAX_TEXT_THEME_HISTORY);
});

test("194 existing text-theme undo restores the manual edit", () => {
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 18 });
  state = siteEditorReducer(state, { type: "design-undo-text-theme" });
  assert.equal(state.design.currentTextThemeId, "modern");
  assert.equal(state.design.textThemeStyles.body.fontSizePx, 16);
  assert.equal(state.design.textHistory.future.length, 1);
});

test("195 existing text-theme redo reapplies the manual edit", () => {
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 18 });
  state = siteEditorReducer(state, { type: "design-undo-text-theme" });
  state = siteEditorReducer(state, { type: "design-redo-text-theme" });
  assert.equal(state.design.currentTextThemeId, "modern");
  assert.equal(state.design.textThemeStyles.body.fontSizePx, 18);
  assert.equal(state.design.textHistory.past.length, 1);
  assert.deepEqual(state.design.textHistory.future, []);
});

test("196 reset one value restores the selected preset value", () => {
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 18 });
  assert.equal(state.design.textThemeStyles.body.fontSizePx, 18);
  state = siteEditorReducer(state, { type: "design-reset-typography-value", token: "body", property: "fontSizePx" });
  assert.equal(state.design.textThemeStyles.body.fontSizePx, 16);
  assert.equal(state.design.textThemeStyles.body.fontFamily, "system-sans");
  assert.equal(state.design.currentTextThemeId, "modern");
  assert.equal(state.design.textHistory.past.length, 2);
});

test("197 reset one token restores exactly its five preset properties", () => {
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 18 });
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "lineHeight", value: 1.9 });
  state = siteEditorReducer(state, { type: "design-reset-typography-token", token: "body" });
  assert.deepEqual(state.design.textThemeStyles.body, textThemeA.styles.body);
  assert.equal(state.design.textThemeStyles.display.fontSizePx, 56);
});

test("198 reset all customization restores the selected preset styles", () => {
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-apply-text-theme", textThemeId: "classic" });
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 22 });
  state = siteEditorReducer(state, { type: "design-reset-typography-customization" });
  assert.equal(state.design.currentTextThemeId, "classic");
  assert.deepEqual(state.design.textThemeStyles, textThemeB.styles);
});

test("199 reset customization does not switch to defaultTextThemeId", () => {
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-apply-text-theme", textThemeId: "classic" });
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 22 });
  state = siteEditorReducer(state, { type: "design-reset-typography-customization" });
  assert.equal(state.design.currentTextThemeId, "classic");
  assert.notEqual(state.design.currentTextThemeId, "modern");
});

test("200 reset actions are no-ops when already matching the selected preset", () => {
  const state = typographyState();
  assert.equal(siteEditorReducer(state, { type: "design-reset-typography-value", token: "body", property: "fontSizePx" }), state);
  assert.equal(siteEditorReducer(state, { type: "design-reset-typography-token", token: "body" }), state);
  assert.equal(siteEditorReducer(state, { type: "design-reset-typography-customization" }), state);
  const noPresetState = typographyState(noTypographyDesign);
  assert.equal(siteEditorReducer(noPresetState, { type: "design-reset-typography-customization" }), noPresetState);
});

test("201 textThemeIsCustomized is false for exact preset styles", () => {
  const state = typographyState();
  assert.equal(textThemeIsCustomized(state.design.definition, state.design.currentTextThemeId, state.design.textThemeStyles), false);
  const preset = getCurrentTextThemePreset(state.design.definition, state.design.currentTextThemeId);
  assert.equal(preset.textThemeId, "modern");
});

test("202 textThemeIsCustomized becomes true after a manual edit", () => {
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 18 });
  assert.equal(textThemeIsCustomized(state.design.definition, state.design.currentTextThemeId, state.design.textThemeStyles), true);
  assert.equal(getPresetTypographyValue(state.design.definition, state.design.currentTextThemeId, "body", "fontSizePx"), 16);
});

test("203 switching to another preset clears the customized status", () => {
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 18 });
  assert.equal(textThemeIsCustomized(state.design.definition, state.design.currentTextThemeId, state.design.textThemeStyles), true);
  state = siteEditorReducer(state, { type: "design-apply-text-theme", textThemeId: "classic" });
  assert.equal(state.design.currentTextThemeId, "classic");
  assert.equal(textThemeIsCustomized(state.design.definition, state.design.currentTextThemeId, state.design.textThemeStyles), false);
  assert.deepEqual(state.design.textThemeStyles, textThemeB.styles);
});

test("204 typography changes do not modify color state or color history", () => {
  let state = typographyState();
  const beforeColors = JSON.stringify(state.design.colorTheme);
  const beforeColorHistory = JSON.stringify(state.design.history);
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 18 });
  assert.equal(JSON.stringify(state.design.colorTheme), beforeColors);
  assert.equal(JSON.stringify(state.design.history), beforeColorHistory);
  assert.equal(state.design.currentThemeId, "light");
  assert.equal(state.design.activeView, "main");
});

test("205 typography changes do not modify page document, page history, revision, fingerprint, or page isDirty", () => {
  let state = typographyState();
  const beforeDoc = currentSiteEditorDocument(state);
  const beforePast = state.history.past.length;
  const beforeRevision = state.currentRevision;
  const beforeFp = state.savedFingerprints[page.id];
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 18 });
  state = siteEditorReducer(state, { type: "design-reset-typography-token", token: "body" });
  assert.equal(currentSiteEditorDocument(state), beforeDoc);
  assert.equal(state.history.past.length, beforePast);
  assert.equal(state.currentRevision, beforeRevision);
  assert.equal(state.savedFingerprints[page.id], beforeFp);
  assert.equal(state.isDirty, false);
});

test("206 unknown typography reducer actions and values remain no-ops", () => {
  const state = typographyState();
  assert.equal(siteEditorReducer(state, { type: "design-update-typography-bogus", token: "body", property: "fontSizePx", value: 18 }), state);
  assert.equal(siteEditorReducer(state, { type: "design-update-typography-value", token: "nope", property: "fontSizePx", value: 18 }), state);
  assert.equal(siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "bogus", value: 18 }), state);
  assert.equal(siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: "16px" }), state);
  assert.equal(siteEditorReducer(state, { type: "design-reset-typography-token", token: "nope" }), state);
  assert.equal(siteEditorReducer(state, { type: "design-reset-typography-value", token: "body", property: "bogus" }), state);
});

test("207 no API, fetch, localStorage, save, publish, upload, URL, or @font-face logic is introduced for typography", () => {
  assert.doesNotMatch(siteEditorDesignSource, /@font-face|fetch\(|localStorage|googleapis|design-save|design-publish|upload/);
  assert.doesNotMatch(siteEditorReducerSource, /@font-face|fetch\(|localStorage|googleapis|design-save|design-publish|upload/);
  const state = typographyState();
  assert.equal(siteEditorReducer(state, { type: "design-publish" }), state);
  assert.equal(siteEditorReducer(state, { type: "design-save" }), state);
});

test("208 Customize Typography button exists in English and Arabic", () => {
  assert.match(textLibrarySource, /Customize Typography/);
  assert.match(textLibrarySource, /تخصيص الخطوط/);
  assert.match(textLibrarySource, /site-editor-typo-customize/);
  assert.match(textLibrarySource, /setCustomizerOpen\(true\)/);
  assert.match(textLibrarySource, /TypographyEditorView/);
});

test("209 the customizer reads current styles from design.textThemeStyles", () => {
  assert.match(typographyEditorSource, /design\.textThemeStyles/);
  assert.match(typographyEditorSource, /getTypographyValue\(styles/);
  const state = typographyState();
  assert.equal(getTypographyValue(state.design.textThemeStyles, "body", "fontSizePx"), 16);
  assert.equal(getTypographyValue(state.design.textThemeStyles, "body", "fontFamily"), "system-sans");
});

test("210 the customizer reads fields from SITE_DESIGN_TYPOGRAPHY_FIELDS", () => {
  assert.match(typographyEditorSource, /SITE_DESIGN_TYPOGRAPHY_FIELDS/);
  assert.match(typographyFieldSource, /field\.property/);
  assert.match(typographyFieldSource, /field\.label/);
  assert.equal(SITE_DESIGN_TYPOGRAPHY_FIELDS.length, 5);
  assert.deepEqual(SITE_DESIGN_TYPOGRAPHY_FIELDS.map((f) => f.property), ["fontFamily", "fontSizePx", "fontWeight", "lineHeight", "letterSpacingEm"]);
});

test("211 exactly seven token options exist", () => {
  assert.equal(SITE_DESIGN_TEXT_STYLE_TOKENS.length, 7);
  assert.deepEqual(SITE_DESIGN_TEXT_STYLE_TOKENS, ["display", "heading1", "heading2", "heading3", "body", "small", "button"]);
  assert.match(typographyEditorSource, /SITE_DESIGN_TEXT_STYLE_TOKENS\.map/);
});

test("212 default selected token is body", () => {
  assert.match(typographyEditorSource, /useState\("body"\)/);
  assert.ok(SITE_DESIGN_TEXT_STYLE_TOKENS.includes("body"));
  const state = typographyState();
  assert.equal(getTypographyValue(state.design.textThemeStyles, "body", "fontSizePx"), 16);
});

test("213 all token labels exist in English and Arabic", () => {
  for (const [token, copy] of [["display", "العنوان البارز"], ["heading1", "العنوان الأول"], ["heading2", "العنوان الثاني"], ["heading3", "العنوان الثالث"], ["body", "النص الأساسي"], ["small", "النص الصغير"], ["button", "نص الزر"]]) {
    assert.match(typographyEditorSource, new RegExp(token));
  }
  for (const copy of ["Display", "Heading 1", "Heading 2", "Heading 3", "Body Text", "Small Text", "Button Text"]) {
    assert.match(typographyEditorSource, new RegExp(copy.replace(/ /g, "\\s")));
  }
  for (const copy of ["العنوان البارز", "العنوان الأول", "العنوان الثاني", "العنوان الثالث", "النص الأساسي", "النص الصغير", "نص الزر"]) {
    assert.match(typographyEditorSource, new RegExp(copy));
  }
});

test("214 Font Family renders only safe mapped identifiers", () => {
  const keys = Object.keys(SITE_DESIGN_FONT_FAMILY_MAP);
  assert.equal(keys.length, 8);
  for (const key of keys) {
    assert.match(key, /^[a-z0-9-]+$/);
    assert.doesNotMatch(key, /,/);
    assert.doesNotMatch(key, /'|"|\s/);
  }
  assert.match(typographyFieldSource, /SITE_DESIGN_FONT_FAMILY_MAP/);
  assert.match(typographyFieldSource, /Object\.keys\(SITE_DESIGN_FONT_FAMILY_MAP\)/);
  assert.doesNotMatch(typographyFieldSource, /-apple-system|BlinkMacSystemFont|sans-serif|serif|monospace/);
});

test("215 Font Weight renders only the six allowed values", () => {
  const weightField = findTypographyField("fontWeight");
  assert.deepEqual(weightField.values, [300, 400, 500, 600, 700, 800]);
  assert.match(typographyFieldSource, /FONT_WEIGHT_LABELS/);
  for (const weight of [300, 400, 500, 600, 700, 800]) {
    assert.match(typographyFieldSource, new RegExp(String(weight)));
  }
});

test("216 numeric controls use contract min/max/step values", () => {
  const size = findTypographyField("fontSizePx");
  assert.deepEqual([size.min, size.max, size.step, size.integer], [10, 96, 1, true]);
  const line = findTypographyField("lineHeight");
  assert.deepEqual([line.min, line.max, line.step], [1, 2, 0.05]);
  const spacing = findTypographyField("letterSpacingEm");
  assert.deepEqual([spacing.min, spacing.max, spacing.step], [-0.1, 0.3, 0.005]);
  assert.match(typographyFieldSource, /min=\{field\.min\}/);
  assert.match(typographyFieldSource, /max=\{field\.max\}/);
  assert.match(typographyFieldSource, /step=\{field\.step\}/);
  assert.match(typographyFieldSource, /type="number"/);
});

test("217 select changes dispatch design-update-typography-value", () => {
  assert.match(typographyFieldSource, /type: "design-update-typography-value"/);
  assert.match(typographyFieldSource, /handleSelectChange/);
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontFamily", value: "georgia" });
  assert.equal(state.design.textThemeStyles.body.fontFamily, "georgia");
  assert.equal(state.design.textHistory.past.length, 1);
});

test("218 numeric input does not dispatch on each keystroke", () => {
  assert.match(typographyFieldSource, /handleChange/);
  assert.doesNotMatch(typographyFieldSource, /const handleChange = \(event\) => \{[^}]*dispatch/);
  assert.match(typographyFieldSource, /onChange=\{handleChange\}[^]*type="number"/);
  assert.match(typographyFieldSource, /onKeyDown=\{handleKeyDown\}/);
  assert.match(typographyFieldSource, /onBlur=\{handleBlur\}/);
});

test("219 valid blur commits one update", () => {
  assert.match(typographyFieldSource, /handleBlur/);
  assert.match(typographyFieldSource, /commit\(draft\)/);
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 18 });
  assert.equal(state.design.textThemeStyles.body.fontSizePx, 18);
  assert.equal(state.design.textHistory.past.length, 1);
});

test("220 valid Enter commits one update", () => {
  assert.match(typographyFieldSource, /event\.key === "Enter"/);
  assert.match(typographyFieldSource, /commit\(draft\)/);
  assert.match(typographyFieldSource, /event\.preventDefault\(\)/);
});

test("221 Escape restores the current state value", () => {
  assert.match(typographyFieldSource, /event\.key === "Escape"/);
  assert.match(typographyFieldSource, /setDraft\(value == null \? "" : String\(value\)\)/);
  assert.match(typographyFieldSource, /setError\(""\)/);
});

test("222 invalid values do not dispatch", () => {
  assert.match(typographyFieldSource, /normalizeTypographyValue/);
  assert.equal(normalizeTypographyValue("fontSizePx", "16px"), null);
  assert.equal(normalizeTypographyValue("fontSizePx", 4), null);
  assert.equal(normalizeTypographyValue("lineHeight", 3), null);
  assert.equal(normalizeTypographyValue("letterSpacingEm", 5), null);
  assert.equal(normalizeTypographyValue("fontFamily", "Comic Sans MS"), null);
  assert.equal(normalizeTypographyValue("fontWeight", 900), null);
  const state = typographyState();
  assert.equal(siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: "nope" }), state);
});

test("223 invalid values show an accessible error", () => {
  assert.match(typographyFieldSource, /role="alert"/);
  assert.match(typographyFieldSource, /has-error/);
  assert.match(typographyFieldSource, /أدخل قيمة بين/);
  assert.match(typographyFieldSource, /Enter a value between/);
});

test("224 local numeric draft synchronizes after undo", () => {
  assert.match(typographyFieldSource, /useEffect/);
  assert.match(typographyFieldSource, /\[value\]/);
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 18 });
  state = siteEditorReducer(state, { type: "design-undo-text-theme" });
  assert.equal(state.design.textThemeStyles.body.fontSizePx, 16);
});

test("225 local numeric draft synchronizes after redo", () => {
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 18 });
  state = siteEditorReducer(state, { type: "design-undo-text-theme" });
  state = siteEditorReducer(state, { type: "design-redo-text-theme" });
  assert.equal(state.design.textThemeStyles.body.fontSizePx, 18);
});

test("226 local numeric draft synchronizes after reset", () => {
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 18 });
  state = siteEditorReducer(state, { type: "design-reset-typography-value", token: "body", property: "fontSizePx" });
  assert.equal(state.design.textThemeStyles.body.fontSizePx, 16);
});

test("227 field reset dispatches design-reset-typography-value", () => {
  assert.match(typographyFieldSource, /type: "design-reset-typography-value"/);
  assert.match(typographyFieldSource, /resetDisabled/);
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 18 });
  state = siteEditorReducer(state, { type: "design-reset-typography-value", token: "body", property: "fontSizePx" });
  assert.equal(state.design.textThemeStyles.body.fontSizePx, 16);
});

test("228 field reset is disabled when matching the preset", () => {
  assert.match(typographyFieldSource, /value != null && presetValue != null && value === presetValue/);
  const state = typographyState();
  assert.equal(siteEditorReducer(state, { type: "design-reset-typography-value", token: "body", property: "fontSizePx" }), state);
});

test("229 token reset dispatches design-reset-typography-token", () => {
  assert.match(typographyEditorSource, /type: "design-reset-typography-token"/);
  assert.match(typographyEditorSource, /استعادة إعدادات هذا النص/);
  assert.match(typographyEditorSource, /Reset This Text Style/);
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 18 });
  state = siteEditorReducer(state, { type: "design-reset-typography-token", token: "body" });
  assert.deepEqual(state.design.textThemeStyles.body, textThemeA.styles.body);
});

test("230 token reset is disabled when matching the preset", () => {
  assert.match(typographyEditorSource, /disabled=\{!selectedTokenModified\}/);
  const state = typographyState();
  assert.equal(siteEditorReducer(state, { type: "design-reset-typography-token", token: "body" }), state);
});

test("231 full reset dispatches design-reset-typography-customization", () => {
  assert.match(typographyEditorSource, /type: "design-reset-typography-customization"/);
  assert.match(typographyEditorSource, /استعادة جميع التخصيصات/);
  assert.match(typographyEditorSource, /Reset All Customization/);
  assert.match(typographyEditorSource, /disabled=\{!customized\}/);
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 22 });
  state = siteEditorReducer(state, { type: "design-reset-typography-customization" });
  assert.deepEqual(state.design.textThemeStyles, textThemeA.styles);
});

test("232 full reset retains the current preset id through existing reducer behavior", () => {
  assert.doesNotMatch(typographyEditorSource, /design-reset-text-theme/);
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-apply-text-theme", textThemeId: "classic" });
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 22 });
  state = siteEditorReducer(state, { type: "design-reset-typography-customization" });
  assert.equal(state.design.currentTextThemeId, "classic");
  assert.deepEqual(state.design.textThemeStyles, textThemeB.styles);
});

test("233 undo and redo use the existing text history actions", () => {
  assert.match(typographyEditorSource, /design-undo-text-theme/);
  assert.match(typographyEditorSource, /design-redo-text-theme/);
  assert.match(typographyEditorSource, /design\.textHistory\.past/);
  assert.match(typographyEditorSource, /design\.textHistory\.future/);
  assert.match(typographyEditorSource, /التراجع عن تعديل الخط/);
  assert.match(typographyEditorSource, /إعادة تعديل الخط/);
  assert.match(typographyEditorSource, /Undo Typography Change/);
  assert.match(typographyEditorSource, /Redo Typography Change/);
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 18 });
  assert.equal(state.design.textHistory.past.length, 1);
  state = siteEditorReducer(state, { type: "design-undo-text-theme" });
  assert.equal(state.design.textHistory.future.length, 1);
  state = siteEditorReducer(state, { type: "design-redo-text-theme" });
  assert.equal(state.design.textThemeStyles.body.fontSizePx, 18);
});

test("234 current preset displays Customized after a manual edit", () => {
  assert.match(textLibrarySource, /textThemeIsCustomized/);
  assert.match(textLibrarySource, /site-editor-design-customized/);
  let state = typographyState();
  assert.equal(textThemeIsCustomized(state.design.definition, state.design.currentTextThemeId, state.design.textThemeStyles), false);
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 18 });
  assert.equal(textThemeIsCustomized(state.design.definition, state.design.currentTextThemeId, state.design.textThemeStyles), true);
});

test("235 switching to another preset removes the customized indicator", () => {
  let state = typographyState();
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 18 });
  assert.equal(textThemeIsCustomized(state.design.definition, state.design.currentTextThemeId, state.design.textThemeStyles), true);
  state = siteEditorReducer(state, { type: "design-apply-text-theme", textThemeId: "classic" });
  assert.equal(state.design.currentTextThemeId, "classic");
  assert.equal(textThemeIsCustomized(state.design.definition, state.design.currentTextThemeId, state.design.textThemeStyles), false);
});

test("236 field-level modified indicator compares against preset value", () => {
  assert.match(typographyFieldSource, /modified = value != null && presetValue != null && value !== presetValue/);
  assert.match(typographyFieldSource, /site-editor-typo-dot/);
  let state = typographyState();
  assert.equal(getPresetTypographyValue(state.design.definition, state.design.currentTextThemeId, "body", "fontSizePx"), 16);
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontSizePx", value: 20 });
  assert.equal(getTypographyValue(state.design.textThemeStyles, "body", "fontSizePx"), 20);
});

test("237 token-level modified indicator appears when any field differs", () => {
  assert.match(typographyEditorSource, /tokenModified/);
  assert.match(typographyEditorSource, /SITE_DESIGN_TYPOGRAPHY_FIELDS\.some/);
  let state = typographyState();
  assert.equal(getPresetTypographyValue(state.design.definition, state.design.currentTextThemeId, "body", "fontWeight"), 400);
  state = siteEditorReducer(state, { type: "design-update-typography-value", token: "body", property: "fontWeight", value: 700 });
  assert.equal(getTypographyValue(state.design.textThemeStyles, "body", "fontWeight"), 700);
});

test("238 manual edits remain preview-only", () => {
  for (const source of [typographyEditorSource, typographyFieldSource, textLibrarySource]) {
    assert.doesNotMatch(source, /design-save|design-publish/);
    assert.doesNotMatch(source, /localStorage|fetch\(|googleapis|@font-face|upload/);
  }
  const state = typographyState();
  assert.equal(siteEditorReducer(state, { type: "design-save" }), state);
  assert.equal(siteEditorReducer(state, { type: "design-publish" }), state);
});

test("239 typography variables remain scoped to SiteEditorCanvas", () => {
  assert.match(cssSource, /\.site-editor-canvas \.site-editor-element-text p/);
  assert.match(cssSource, /\.site-editor-canvas[^{]*?\.site-editor-element-heading h1/);
  assert.match(canvasSourceForDesign, /createTypographyCssVariables/);
  for (const source of [typographyEditorSource, typographyFieldSource, textLibrarySource]) {
    assert.doesNotMatch(source, /:root|site-editor-rail|site-editor-topbar|site-editor-inspector/);
  }
  const applied = applyTextThemePreset(textThemeA);
  assert.equal(Object.keys(createTypographyCssVariables(applied.textThemeStyles)).every((key) => SITE_DESIGN_TYPOGRAPHY_CSS_VARIABLES.includes(key)), true);
});

test("240 no save, publish, API, fetch, localStorage, font upload, external URL, Google Fonts, or @font-face logic is introduced", () => {
  for (const source of [typographyEditorSource, typographyFieldSource, textLibrarySource]) {
    assert.doesNotMatch(source, /@font-face|fetch\(|localStorage|googleapis|fonts\.googleapis|design-save|design-publish|upload/);
    assert.doesNotMatch(source, /https?:\/\/[^"]+/);
  }
  assert.doesNotMatch(cssSource, /@font-face|fonts\.googleapis/);
});

test("241 Arabic and English UI text remains valid UTF-8", () => {
  for (const source of [typographyEditorSource, typographyFieldSource, textLibrarySource]) {
    assert.doesNotMatch(source, /\uFFFD/);
    assert.doesNotMatch(source, /\?import/);
  }
  assert.doesNotMatch(typographyEditorSource, /[?]import/);
  assert.match(typographyEditorSource, /تخصيص الخطوط/);
  assert.equal(findTypographyField("letterSpacingEm").label.ar, "تباعد الأحرف");
  assert.equal(findTypographyField("fontFamily").label.ar, "عائلة الخط");
});
