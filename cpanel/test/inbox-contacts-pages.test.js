import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { canonicalAdminPageKey, resolvePage } from "../src/utils/cpanelAccess.js";
import { canAccessAdminPage } from "../src/utils/roles.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const source = (file) => read(`src/${file}`);

test("Inbox and every Customers & Leads page remain wired in navigation", () => {
  const nav = source("data/adminNavigation.js");
  for (const key of ["admin-inbox", "admin-customers", "admin-forms", "admin-meetings", "admin-pipelines", "admin-community", "admin-loyalty"]) assert.match(nav, new RegExp(`existing\\("${key}"`));
});

test("Inbox uses the tenant inbox API and renders real conversation workspace states", () => {
  const client = source("utils/inboxApi.js");
  const page = source("pages/AdminInboxPage.jsx");
  assert.match(client, /apiRequest\(`\/admin\/inbox\/conversations\$\{buildInboxQuery\(filters\)\}`/);
  assert.match(client, /\/admin\/inbox\/conversations\/\$\{encodeURIComponent\(conversationId\)\}/);
  assert.match(page, /fetchInboxConversations/);
  assert.match(page, /fetchInboxConversation/);
  assert.match(page, /replyToInboxConversation/);
  assert.match(page, /admin-inbox-conversation-item/);
  assert.match(page, /admin-inbox-thread/);
  assert.match(page, /admin-inbox-composer/);
  assert.match(page, /canUseInboxAction/);
  assert.doesNotMatch(page, /fake message|fabricated conversation|localStorage/i);
});

test("Inbox keeps Meta connect deferred while internal conversations load from API", () => {
  const page = source("pages/AdminInboxPage.jsx");
  assert.match(page, /Connect Meta/);
  assert.match(page, /AdminUnderDevelopmentContent/);
  assert.match(page, /externalBanner/);
  assert.match(page, /No conversations yet/);
});

test("Inbox unsupported actions use the shared bilingual flow", () => {
  const page = source("pages/AdminInboxPage.jsx");
  assert.match(page, /AdminUnderDevelopmentContent/);
  assert.match(page, /setShowUnsupported\(true\)/);
  assert.match(page, /dir=\{ar \? "rtl" : "ltr"\}/);
});

test("Contacts uses the verified authenticated customer endpoint", () => {
  const client = source("utils/customersApi.js");
  assert.match(client, /apiRequest\(`\/admin\/customers\$\{buildCustomerQuery\(filters\)\}`/);
  assert.doesNotMatch(client, /apiRequest\("\/customers"\)/);
  assert.doesNotMatch(client, /companyId|X-Company-Id/i);
  assert.match(client, /signal: options\.signal/);
});

test("Contacts matches the reference page composition", () => {
  const page = source("pages/AdminContactsPage.jsx");
  for (const marker of ["admin-contacts-header", "admin-contacts-summary-strip", "admin-contacts-overview", "admin-contacts-audience-grid", "admin-contacts-toolbar", "admin-data-table-wrap"]) assert.match(page, new RegExp(marker));
  assert.match(page, /Manage Segments/);
  assert.match(page, /Add Contact/);
  assert.match(page, /Import \/ Export/);
});

test("Contacts audience counts and table rows use real API records", () => {
  const page = source("pages/AdminContactsPage.jsx");
  assert.match(page, /summary\?\.total \?\? total/);
  assert.match(page, /customers\.map\(\(contact\)/);
  assert.doesNotMatch(page, /uniqueCustomersFromOrders|const fake|mockContacts/i);
});

test("Contacts keeps its complete table shell for empty and unavailable states", () => {
  const page = source("pages/AdminContactsPage.jsx");
  assert.match(page, /contacts-table-empty/);
  assert.match(page, /admin-contacts-error/);
  assert.match(page, /error \? "—" : total/);
  assert.match(page, /page >= totalPages/);
  assert.match(page, /<table className="admin-data-table"/);
});

test("stable contact navigation uses the centralized callback", () => {
  const page = source("pages/AdminContactsPage.jsx");
  assert.match(page, /onNavigate\("admin-customers-detail", \{ path: `\/admin\/customers\/\$\{contact\.id\}` \}\)/);
  assert.doesNotMatch(page, /history\.pushState|window\.location\.href/);
  const layout = source("components/AdminLayout.jsx");
  assert.match(layout, /typeof onNavigate !== "function"/);
});

test("contact direct refresh keeps any stable ID and all eight tabs local", () => {
  const access = source("utils/cpanelAccess.js");
  const page = source("pages/AdminContactDetailPage.jsx");
  assert.match(access, /\^\\\/admin\\\/customers\\\/\[\^\/\]\+\$/);
  assert.match(page, /const \[activeTab, setActiveTab\]/);
  assert.match(page, /window\.location\.pathname\.match/);
  for (const tab of ["overview", "inbox", "pipelines", "notes", "subscriptions", "bookings", "invoices", "orders"]) assert.match(page, new RegExp(`"${tab}"`));
});

test("contact matching uses stable ID first and email or phone fallback only", () => {
  const helper = source("utils/contacts.js");
  assert.match(helper, /stableContactIds/);
  assert.match(helper, /if \(ids\.length\) return Boolean\(contactId\) && ids\.includes\(contactId\)/);
  assert.match(helper, /normalized\(contact\?\.email\)/);
  assert.match(helper, /normalizedPhone\(contact\?\.phone\)/);
  assert.doesNotMatch(helper, /customer_name|cName|contact\?\.name|\.name\).*===/);
});

test("Overview uses real order totals and dated activity only", () => {
  const page = source("pages/AdminContactDetailPage.jsx");
  assert.match(page, /orders\.reduce\(\(sum, order\) => sum \+ Number\(order\.total \|\| 0\), 0\)/);
  assert.match(page, /orders\.slice\(0, 5\)\.map/);
  assert.match(page, /contact\.createdAt/);
  assert.doesNotMatch(page, /fake event|sample order|mock timeline/i);
});

test("real invoices and orders are filtered for the selected contact", () => {
  const page = source("pages/AdminContactDetailPage.jsx");
  assert.match(page, /invoicesForContact\(/);
  assert.match(page, /ordersForContact\(orders, contact\)/);
  assert.match(page, /apiRequest\("\/admin\/invoices", \{ signal: controller\.signal \}\)/);
  assert.match(page, /invoice\.invoice_number/);
  assert.match(page, /order\.reference/);
  assert.match(page, /formatCompanyCurrency/);
});

test("unsupported contact tabs use distinct honest layouts", () => {
  const page = source("pages/AdminContactDetailPage.jsx");
  for (const component of ["ContactInboxTab", "PipelinesTab", "SubscriptionsTab", "BookingsTab", "InvoicesTab", "OrdersTab"]) assert.match(page, new RegExp(`function ${component}`));
  assert.match(page, /contactId: contact\.id/);
  assert.match(page, /createInboxConversation/);
  assert.match(page, /No pipeline boards yet/);
  assert.match(page, /No bookings yet/);
  assert.match(page, /AdminUnderDevelopmentContent/);
});

test("Notes tab renders persisted notes and edits through the customer update flow", () => {
  const page = source("pages/AdminContactDetailPage.jsx");
  const notesTab = page.slice(page.indexOf("function NotesTab"));
  assert.match(page, /function NotesTab/);
  assert.match(page, /contact\.notes/);
  assert.match(page, /No notes yet/);
  assert.match(page, /canUpdate=\{canUpdate\}/);
  assert.match(page, /onSave=\{saveNotes\}/);
  assert.match(notesTab, /textarea aria-label=\{labels\.notes\}/);
  assert.match(notesTab, /maxLength=\{4000\}/);
  assert.match(notesTab, /onSave\(draft\.trim\(\) \? draft : ""\)/);
  assert.match(notesTab, /canUpdate &&/);
  const saveNotes = page.slice(page.indexOf("async function saveNotes"));
  assert.match(saveNotes, /updateCustomer\(contactId, \{ notes: value \}, contact\)/);
  assert.match(saveNotes, /setContact\(saved\)/);
});

test("Pipelines and Booking actions retain existing centralized destinations", () => {
  const page = source("pages/AdminContactDetailPage.jsx");
  assert.match(page, /onNavigate\?\.\("admin-pipelines"\)/);
  assert.match(page, /onNavigate\?\.\("admin-bookings-calendar"\)/);
});

test("contact detail preserves customers permission and scoped invoice/order data", () => {
  const roles = source("utils/roles.js");
  assert.match(roles, /"admin-customers-detail":\s*\["customers\.view"\]/);
  const page = source("pages/AdminContactDetailPage.jsx");
  assert.doesNotMatch(page, /X-Company-Id|companyId.*body|window\.history\.pushState/);
});

test("Customers & Leads sub-pages have distinct large compositions", () => {
  const checks = {
    AdminFormsPage: "forms-workspace-panel",
    AdminMeetingsPage: "meetings-setup-panel",
    AdminPipelinesPage: "pipelines-board-panel",
    AdminCommunityPage: "community-hero-panel",
    AdminLoyaltyPage: "loyalty-setup-panel",
  };
  for (const [file, marker] of Object.entries(checks)) {
    const page = source(`pages/${file}.jsx`);
    assert.match(page, new RegExp(marker));
    assert.match(page, /AdminUnderDevelopmentContent/);
  }
});

test("Contacts horizontal scroll container has controlled max-height and sticky columns", () => {
  const css = source("styles/dashboard-shell.css");
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.admin-contacts-table-card \.admin-data-table-wrap[\s\S]*?max-height:\s*calc\(100vh\s*-\s*420px\)/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.admin-contacts-table-card \.admin-data-table-wrap[\s\S]*?overflow:\s*auto/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.admin-contacts-table-card \.admin-data-table-wrap[\s\S]*?scrollbar-gutter:\s*stable/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.admin-contacts-table-card \.admin-data-table[\s\S]*?min-width:\s*1280px/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.admin-contacts-table-card \.admin-data-table th:first-child[\s\S]*?position:\s*sticky/);
  assert.match(css, /\.admin-data-table-actions[\s\S]*?inset-inline-end:\s*0/);
});

test("Contacts toolbar and Import/Export buttons remain visible", () => {
  const page = source("pages/AdminContactsPage.jsx");
  assert.match(page, /Filter/);
  assert.match(page, /Import \/ Export/);
  assert.match(page, /Manage View/);
  assert.match(page, /contacts-search/);
});

test("Contacts sticky columns use logical properties for LTR and RTL support", () => {
  const css = source("styles/global.css");
  assert.match(css, /inset-inline-start:\s*0/);
  assert.match(css, /inset-inline-end:\s*0/);
});

test("Forms page has plan-unavailable strip without fabricated quotas", () => {
  const page = source("pages/AdminFormsPage.jsx");
  assert.match(page, /forms-plan-strip/);
  assert.match(page, /planUnavailable/);
  assert.match(page, /Form plan information is unavailable/);
  assert.doesNotMatch(page, /1\/25|\d+\/\d+|quota/i);
});

test("Meetings page shows not-configured state without claimed integration", () => {
  const page = source("pages/AdminMeetingsPage.jsx");
  assert.match(page, /meetings-setup-banner/);
  assert.match(page, /No scheduling service is currently connected/);
  assert.match(page, /Get Started/);
  assert.match(page, /Learn More/);
  assert.doesNotMatch(page, /calendar.*sync|AI scheduling|unlimited|active.*URL/i);
});

test("Pipeline templates are labeled as preview options, not active pipelines", () => {
  const page = source("pages/AdminPipelinesPage.jsx");
  assert.match(page, /pipelines-template-grid/);
  assert.match(page, /pipelines-template-card/);
  assert.match(page, /Lead Management/);
  assert.match(page, /Sales Pipeline/);
  assert.match(page, /Start from Scratch/);
  assert.match(page, /no pipeline is created/);
  assert.match(page, /Templates/);
  assert.doesNotMatch(page, /stages.*3|leads.*\d+|users.*\d+|active pipeline/i);
});

test("Community page does not fabricate members or engagement data", () => {
  const page = source("pages/AdminCommunityPage.jsx");
  assert.match(page, /community-hero-panel/);
  assert.match(page, /community-stats-panel/);
  assert.match(page, /Community statistics will appear here after setup/);
  assert.match(page, /Invite Members/);
  assert.doesNotMatch(page, /\d+ members|engagement|posts.*\d+|groups.*\d+|reports/i);
});

test("Loyalty page does not fabricate points, tiers, or rewards", () => {
  const page = source("pages/AdminLoyaltyPage.jsx");
  assert.match(page, /loyalty-setup-banner/);
  assert.match(page, /No loyalty plan is currently active/);
  assert.match(page, /Start Now/);
  assert.match(page, /Learn How It Works/);
  assert.doesNotMatch(page, /\d{2,} points|\d{3} points|\d+ tiers|tier.*gold|rewards.*active|redemption/i);
});

test("Inbox and Contacts styles are narrowly scoped and responsive", () => {
  const css = source("styles/global.css");
  const shell = source("styles/dashboard-shell.css");
  assert.match(css, /\/\* Inbox and Customers & Leads pages \*\//);
  assert.match(css, /\.admin-inbox-workspace[\s\S]*?grid-template-columns/);
  assert.match(css, /\.admin-contacts-table[\s\S]*?min-width:\s*1280px/);
  assert.match(css, /\.contact-overview-grid[\s\S]*?grid-template-columns/);
  assert.match(css, /@media \(max-width: 820px\)/);
  assert.doesNotMatch(css.slice(css.indexOf("/* Inbox and Customers & Leads pages */")), /transform:\s*scale|zoom:/);
  // Phase E: tenant CRM chrome prefers Dashboard tokens in dashboard-shell.css.
  assert.match(shell, /\.admin-studio-shell\.admin-tenant \.admin-inbox-page \.admin-inbox-workspace[\s\S]*?--dashboard-card-radius/);
  assert.match(shell, /\.admin-studio-shell\.admin-tenant \.admin-inbox-page \.admin-inbox-workspace[\s\S]*?--dashboard-shadow-card/);
  assert.match(shell, /\.admin-studio-shell\.admin-tenant \.admin-contacts-table-card \.admin-data-table-wrap[\s\S]*?--dashboard-bg-card/);
  assert.match(shell, /@media \(max-width: 820px\)[\s\S]*?\.admin-inbox-workspace \{ grid-template-columns: 1fr; \}/);
  assert.match(shell, /@media \(max-width: 390px\)[\s\S]*?\.admin-inbox-page \{ overflow-x: hidden; \}/);
});

test("Arabic and RTL are explicit across Inbox, Contacts, and details", () => {
  for (const file of ["AdminInboxPage.jsx", "AdminContactsPage.jsx", "AdminContactDetailPage.jsx"]) {
    const page = source(`pages/${file}`);
    assert.match(page, /rtl/);
    assert.match(page, /ar:/);
  }
});

test("no duplicate customer route conditions or missing centralized navigation", () => {
  const app = source("CPanelApp.jsx");
  assert.match(app, /const sharedLayoutProps = \{[\s\S]*?onNavigate: navigate/);
  assert.match(app, /activePage === "admin-customers"[\s\S]*?AdminContactsPage/);
  assert.match(app, /activePage === "admin-customers-detail"[\s\S]*?AdminContactDetailPage/);
});

const customersModule = [{ route: "/admin/customers", enabled: true }];
const companyAdmin = {
  role: "company_admin",
  activeCompany: { id: "icare", modules: customersModule },
};
const customerEmployee = {
  role: "employee",
  permissions: ["customers.view", "inbox.view"],
  activeCompany: { id: "icare", modules: customersModule },
};

test("all canonical Inbox and Customers & Leads paths resolve to their dedicated pages", () => {
  const routes = {
    "/admin/inbox": "admin-inbox",
    "/admin/customers": "admin-customers",
    "/admin/forms": "admin-forms",
    "/admin/meetings": "admin-meetings",
    "/admin/pipelines": "admin-pipelines",
    "/admin/community": "admin-community",
    "/admin/loyalty": "admin-loyalty",
  };
  for (const [pathname, page] of Object.entries(routes)) {
    assert.equal(resolvePage(pathname, companyAdmin, customersModule), page, pathname);
    assert.equal(resolvePage(`${pathname}/`, companyAdmin, customersModule), page, `${pathname}/`);
  }
});

test("contact detail keeps numeric and opaque contact IDs on direct refresh", () => {
  assert.equal(resolvePage("/admin/customers/123", companyAdmin, customersModule), "admin-customers-detail");
  assert.equal(resolvePage("/admin/customers/e34fcdf3-49da-47f4-a485-64bef24e5bdb", companyAdmin, customersModule), "admin-customers-detail");
  const app = source("CPanelApp.jsx");
  assert.match(app, /isCustomerDetailPath/);
  assert.match(app, /!isCustomerDetailPath/);
});

test("legacy coming-soon customer routes resolve to canonical dedicated pages", () => {
  const aliases = {
    "/admin/coming-soon/inbox": "admin-inbox",
    "/admin/coming-soon/customers": "admin-customers",
    "/admin/coming-soon/customers/forms": "admin-forms",
    "/admin/coming-soon/customers/meetings": "admin-meetings",
    "/admin/coming-soon/customers/pipelines": "admin-pipelines",
    "/admin/coming-soon/customers/community": "admin-community",
    "/admin/coming-soon/customers/loyalty": "admin-loyalty",
    "/admin/coming-soon/customers-leads/forms": "admin-forms",
  };
  for (const [pathname, page] of Object.entries(aliases)) {
    assert.equal(resolvePage(pathname, companyAdmin, customersModule), page, pathname);
  }
});

test("legacy navigation page keys canonicalize before centralized navigation", () => {
  assert.equal(canonicalAdminPageKey("admin-tenant-placeholder-inbox"), "admin-inbox");
  assert.equal(canonicalAdminPageKey("admin-tenant-placeholder-customers-forms"), "admin-forms");
  assert.equal(canonicalAdminPageKey("admin-tenant-placeholder-customers-leads-loyalty"), "admin-loyalty");
});

test("recognized unauthorized routes render the access state instead of Dashboard", () => {
  const productEmployee = {
    role: "employee",
    permissions: ["products.view"],
    activeCompany: { id: "icare", modules: customersModule },
  };
  for (const pathname of ["/admin/inbox", "/admin/customers", "/admin/forms", "/admin/meetings", "/admin/pipelines", "/admin/community", "/admin/loyalty", "/admin/customers/123"]) {
    assert.equal(resolvePage(pathname, productEmployee, customersModule), "admin-no-access", pathname);
  }
  assert.equal(canAccessAdminPage(productEmployee, "admin-no-access"), true);
});

test("customer employees retain restricted access through customers.view", () => {
  for (const page of ["admin-inbox", "admin-customers", "admin-customers-detail", "admin-forms", "admin-meetings", "admin-pipelines", "admin-community", "admin-loyalty"]) {
    assert.equal(canAccessAdminPage(customerEmployee, page), true, page);
  }
  assert.equal(resolvePage("/admin/inbox", customerEmployee, customersModule), "admin-inbox");
});

test("inbox access requires inbox.view, not customers.view", () => {
  const customersOnlyEmployee = {
    role: "employee",
    permissions: ["customers.view"],
    activeCompany: { id: "icare", modules: customersModule },
  };
  assert.equal(canAccessAdminPage(customersOnlyEmployee, "admin-inbox"), false);
  assert.equal(resolvePage("/admin/inbox", customersOnlyEmployee, customersModule), "admin-no-access");
  assert.equal(canAccessAdminPage(customersOnlyEmployee, "admin-customers"), true);
});

test("scoped Super Admin tenant sessions use the company-admin access model", () => {
  const scoped = { ...companyAdmin, globalRole: "super_admin", isCompanyScope: true };
  assert.equal(resolvePage("/admin/community", scoped, customersModule), "admin-community");
  assert.equal(resolvePage("/admin/customers/contact-42", scoped, customersModule), "admin-customers-detail");
});

test("only genuinely unknown routes use the safe role fallback", () => {
  assert.equal(resolvePage("/admin/not-a-real-page", companyAdmin, customersModule), "admin");
  assert.notEqual(resolvePage("/admin/forms", companyAdmin, customersModule), "admin");
});

test("CPanel renders every recognized route and keeps History API navigation centralized", () => {
  const app = source("CPanelApp.jsx");
  const renderers = {
    "admin-inbox": "AdminInboxPage",
    "admin-customers": "AdminContactsPage",
    "admin-customers-detail": "AdminContactDetailPage",
    "admin-forms": "AdminFormsPage",
    "admin-meetings": "AdminMeetingsPage",
    "admin-pipelines": "AdminPipelinesPage",
    "admin-community": "AdminCommunityPage",
    "admin-loyalty": "AdminLoyaltyPage",
  };
  for (const [page, component] of Object.entries(renderers)) {
    assert.match(app, new RegExp(`activePage === "${page}"[\\s\\S]*?<${component}`));
  }
  assert.match(app, /window\.addEventListener\("popstate", onPopState\)/);
  assert.match(app, /window\.history\[options\.replace \? "replaceState" : "pushState"\]/);
  for (const file of ["AdminInboxPage.jsx", "AdminContactsPage.jsx", "AdminContactDetailPage.jsx", "AdminFormsPage.jsx", "AdminMeetingsPage.jsx", "AdminPipelinesPage.jsx", "AdminCommunityPage.jsx", "AdminLoyaltyPage.jsx"]) {
    assert.doesNotMatch(source(`pages/${file}`), /window\.history|window\.location\.href/);
  }
});

test("All sub-pages use unsupported action fallback through the bilingual flow", () => {
  for (const file of ["AdminFormsPage.jsx", "AdminMeetingsPage.jsx", "AdminPipelinesPage.jsx", "AdminCommunityPage.jsx", "AdminLoyaltyPage.jsx"]) {
    const page = source(`pages/${file}`);
    assert.match(page, /AdminUnderDevelopmentContent/);
    assert.match(page, /setOpen\(true\)/);
  }
});
