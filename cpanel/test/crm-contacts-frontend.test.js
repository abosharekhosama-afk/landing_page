import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { canUseCustomerAction } from "../src/utils/roles.js";
import {
  archiveCustomer,
  buildCustomerQuery,
  createCustomer,
  fetchCustomer,
  fetchCustomers,
  restoreCustomer,
  sanitizeCustomerPayload,
  unwrapCustomersResponse,
  updateCustomer,
} from "../src/utils/customersApi.js";

const root = path.resolve(import.meta.dirname, "..");
const source = (file) => fs.readFileSync(path.join(root, "src", file), "utf8");
globalThis.localStorage = { getItem: () => "scoped-token" };

function mockJson(data, status = 200) {
  globalThis.fetch = async (url, options = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    request: { url, options },
  });
}

test("1. contact list loads real API records", async () => {
  mockJson([{ id: "contact-1", email: "one@example.test" }]);
  assert.equal((await fetchCustomers())[0].id, "contact-1");
});

test("2. loading state appears", () => assert.match(source("pages/AdminContactsPage.jsx"), /crm-contact-skeleton-row/));
test("3. empty state appears for an empty result", () => assert.match(source("pages/AdminContactsPage.jsx"), /emptyTitle/));
test("4. API error shows retry", () => assert.match(source("pages/AdminContactsPage.jsx"), /onClick=\{refresh\}[\s\S]*?labels\.retry/));

test("5. search sends q to the API", () => assert.equal(buildCustomerQuery({ q: "rana" }), "?q=rana"));
test("6. type filter sends type", () => assert.equal(buildCustomerQuery({ type: "lead" }), "?type=lead"));
test("7. archived filter sends archived", () => assert.equal(buildCustomerQuery({ archived: true }), "?archived=true"));
test("8. Add Contact opens the form", () => assert.match(source("pages/AdminContactsPage.jsx"), /setShowCreate\(true\)/));

test("9. valid create sends only supported fields", async () => {
  let request;
  globalThis.fetch = async (url, options) => { request = { url, options }; return { ok: true, status: 201, json: async () => ({ id: "new" }) }; };
  await createCustomer({ firstName: "Rana", email: "rana@example.test", type: "lead", internal: "blocked" });
  assert.deepEqual(JSON.parse(request.options.body), { firstName: "Rana", email: "rana@example.test", type: "lead" });
});

test("10. companyId is never sent", () => {
  const payload = sanitizeCustomerPayload({ firstName: "Rana", email: "r@example.test", companyId: "eb-chemical" });
  assert.equal(Object.hasOwn(payload, "companyId"), false);
  assert.doesNotMatch(source("utils/customersApi.js"), /X-Company-Id/);
});

test("11. create validation errors render by field", async () => {
  mockJson({ message: "Validation failed.", errors: { email: "email is required." } }, 400);
  await assert.rejects(createCustomer({ firstName: "Rana", email: "" }), (error) => error.errors.email === "email is required.");
  assert.match(source("components/ContactFormDialog.jsx"), /normalizeFieldErrors\(error\?\.errors\)/);
});

test("12. duplicate submission is prevented", () => assert.match(source("components/ContactFormDialog.jsx"), /if \(saving\) return/));
test("13. successful creation refreshes the list", () => assert.match(source("pages/AdminContactsPage.jsx"), /setPage\(1\); refresh\(\)/));
test("14. contact row opens the detail page", () => assert.match(source("pages/AdminContactsPage.jsx"), /`\/admin\/customers\/\$\{contact\.id\}`/));

test("15. detail page loads by contact ID", async () => {
  let requestedUrl = "";
  globalThis.fetch = async (url) => { requestedUrl = url; return { ok: true, status: 200, json: async () => ({ id: "opaque-id" }) }; };
  assert.equal((await fetchCustomer("opaque-id")).id, "opaque-id");
  assert.match(requestedUrl, /\/api\/admin\/customers\/opaque-id$/);
});

test("16. detail not-found state works", () => assert.match(source("pages/AdminContactDetailPage.jsx"), /loadStatus === 404/));
test("17. edit form is prefilled", () => assert.match(source("components/ContactFormDialog.jsx"), /valuesFromContact\(contact\)/));

test("18. edit sends supported changed values", async () => {
  let body;
  globalThis.fetch = async (_url, options) => { body = JSON.parse(options.body); return { ok: true, status: 200, json: async () => ({ id: "c1" }) }; };
  await updateCustomer("c1", { firstName: "New", lastName: "Same", email: "same@example.test" }, { firstName: "Old", lastName: "Same", email: "same@example.test" });
  assert.deepEqual(body, { firstName: "New" });
});

test("19. archive requires confirmation", () => assert.match(source("pages/AdminContactDetailPage.jsx"), /ArchiveConfirmDialog/));

test("20. archive calls the correct endpoint", async () => {
  let requestedUrl = ""; globalThis.fetch = async (url) => { requestedUrl = url; return { ok: true, status: 200, json: async () => ({}) }; };
  await archiveCustomer("c1"); assert.match(requestedUrl, /\/admin\/customers\/c1\/archive$/);
});

test("21. restore calls the correct endpoint", async () => {
  let requestedUrl = ""; globalThis.fetch = async (url) => { requestedUrl = url; return { ok: true, status: 200, json: async () => ({}) }; };
  await restoreCustomer("c1"); assert.match(requestedUrl, /\/admin\/customers\/c1\/restore$/);
});

test("22. permission restrictions affect actions correctly", () => {
  assert.equal(canUseCustomerAction({ role: "employee", permissions: ["customers.view"] }, "customers.create"), false);
  assert.equal(canUseCustomerAction({ role: "employee", permissions: ["customers.manage"] }, "customers.archive"), true);
  assert.equal(canUseCustomerAction({ role: "super_admin", isCompanyScope: true, activeCompany: { id: "icare" } }, "customers.update"), true);
});

test("23. Arabic labels and RTL are preserved", () => {
  for (const file of ["pages/AdminContactsPage.jsx", "pages/AdminContactDetailPage.jsx", "components/ContactFormDialog.jsx"]) {
    assert.match(source(file), /[\u0600-\u06ff]/); assert.match(source(file), /rtl/);
  }
});

test("24. no hard-delete action exists", () => {
  for (const file of ["pages/AdminContactsPage.jsx", "pages/AdminContactDetailPage.jsx", "utils/customersApi.js"]) assert.doesNotMatch(source(file), /deleteCustomer|method:\s*"DELETE"/);
});

test("25. no fabricated CRM activity or metrics are displayed", () => {
  const detail = source("pages/AdminContactDetailPage.jsx");
  assert.doesNotMatch(detail, /mock activity|sample campaign|fake revenue/i);
  assert.match(detail, /orders\.slice\(0, 5\)\.map/);
});

test("26. notes save sends only the notes field through updateCustomer", async () => {
  let body;
  globalThis.fetch = async (_url, options) => { body = JSON.parse(options.body); return { ok: true, status: 200, json: async () => ({ id: "c1", notes: "Follow up next week." }) }; };
  await updateCustomer("c1", { notes: "Follow up next week." }, { id: "c1", notes: "Old note" });
  assert.deepEqual(body, { notes: "Follow up next week." });
});

test("27. notes tab renders existing notes and edits via the contact update flow", () => {
  const page = source("pages/AdminContactDetailPage.jsx");
  const notesTab = page.slice(page.indexOf("function NotesTab"));
  assert.match(notesTab, /const notes = contact\?\.notes \|\| ""/);
  assert.match(notesTab, /<div className="contact-notes-body">\{notes\}<\/div>/);
  assert.match(notesTab, /textarea/);
  assert.match(notesTab, /maxLength=\{4000\}/);
  assert.match(notesTab, /onSave\(draft\.trim\(\) \? draft : ""\)/);
  const saveNotes = page.slice(page.indexOf("async function saveNotes"));
  assert.match(saveNotes, /updateCustomer\(contactId, \{ notes: value \}, contact\)/);
  assert.match(saveNotes, /setContact\(saved\)/);
});

test("28. empty notes show the honest empty state", () => {
  const page = source("pages/AdminContactDetailPage.jsx");
  assert.match(page, /notesEmptyDescription/);
  assert.match(page, /No notes yet/);
  assert.doesNotMatch(page, /notes storage is available/);
});

test("29. notes are read-only without customers.update", () => {
  const viewer = { role: "employee", permissions: ["customers.view"] };
  assert.equal(canUseCustomerAction(viewer, "customers.update"), false);
  const page = source("pages/AdminContactDetailPage.jsx");
  const notesTab = page.slice(page.indexOf("function NotesTab"));
  assert.match(notesTab, /if \(!canUpdate\) return/);
  assert.match(notesTab, /canUpdate && <button/);
  assert.match(page, /canUpdate=\{canUpdate\}/);
});

test("30. overview labels card renders real contact labels as chips", () => {
  const detail = source("pages/AdminContactDetailPage.jsx");
  assert.match(
    detail,
    /contact\.labels\?\.length \? <div className="crm-contact-labels contact-labels-chips">/,
  );
  assert.match(detail, /contact\.labels\.map\(\(label\) => <span key=\{label\}>/);
});

test("31. overview labels card has an honest empty state", () => {
  const detail = source("pages/AdminContactDetailPage.jsx");
  assert.match(detail, /: <p>\{labels\.noLabelsAssigned\}<\/p>/);
  assert.doesNotMatch(detail, /labels\.unavailable<\/p><button[^>]*>\{labels\.setup\}/);
});

test("32. edit labels action requires customers.update", () => {
  const detail = source("pages/AdminContactDetailPage.jsx");
  assert.match(detail, /canUpdate && <button onClick=\{onEditLabels\}/);
  assert.equal(
    canUseCustomerAction({ role: "employee", permissions: ["customers.view"] }, "customers.update"),
    false,
  );
  assert.equal(
    canUseCustomerAction(
      { role: "employee", permissions: ["customers.update"] },
      "customers.update",
    ),
    true,
  );
  assert.equal(
    canUseCustomerAction(
      { role: "employee", permissions: ["customers.manage"] },
      "customers.update",
    ),
    true,
  );
});

test("33. saving labels updates the parent contact state immediately", () => {
  const detail = source("pages/AdminContactDetailPage.jsx");
  assert.match(detail, /updateCustomer\(contactId, values, contact\)[\s\S]*setContact\(saved\)/);
});

test("34. overview member account type uses the existing customer update API", () => {
  const detail = source("pages/AdminContactDetailPage.jsx");
  const api = source("utils/customersApi.js");
  assert.match(api, /"accountType"/);
  assert.match(detail, /ACCOUNT_TYPE_OPTIONS = \["retail", "trader", "wholesale"\]/);
  assert.match(detail, /updateCustomer\(contactId, \{ accountType: value \}, contact\)/);
  assert.match(detail, /setContact\(saved\)[\s\S]*setNotice\(labels\.accountTypeSaved\)/);
});

test("35. account type editor is read-only without customers.update", () => {
  const detail = source("pages/AdminContactDetailPage.jsx");
  const field = detail.slice(detail.indexOf("function AccountTypeField"));
  assert.match(field, /if \(!canUpdate\) return/);
  assert.match(field, /canUpdate && <button onClick=\{startEdit\}/);
  assert.equal(
    canUseCustomerAction({ role: "employee", permissions: ["customers.view"] }, "customers.update"),
    false,
  );
});

test("36. account type editor has save, cancel, loading, and error states", () => {
  const detail = source("pages/AdminContactDetailPage.jsx");
  const field = detail.slice(detail.indexOf("function AccountTypeField"), detail.indexOf("function OverviewTab"));
  assert.match(field, /labels\.cancel/);
  assert.match(field, /labels\.save/);
  assert.match(field, /labels\.saving/);
  assert.match(field, /crm-account-type-error/);
  assert.match(field, /setSaving\(false\)/);
});

test("37. paginated contacts unwrap uses server total not page length", async () => {
  const envelope = unwrapCustomersResponse({
    items: [{ id: "a" }, { id: "b" }],
    total: 40,
    page: 1,
    limit: 25,
    summary: { total: 40, customers: 30, active: 35, archived: 5 },
  });
  assert.equal(envelope.total, 40);
  assert.equal(envelope.items.length, 2);
  assert.equal(envelope.summary.total, 40);
  mockJson({
    items: [{ id: "page-1" }],
    total: 26,
    page: 1,
    limit: 25,
    summary: { total: 26, customers: 20, active: 26, archived: 0 },
  });
  const page = await fetchCustomers({ page: 1, limit: 25 });
  assert.equal(page.total, 26);
  assert.equal(page.items.length, 1);
  const contactsPage = source("pages/AdminContactsPage.jsx");
  assert.match(contactsPage, /totalPages/);
  assert.match(contactsPage, /page >= totalPages/);
  assert.match(contactsPage, /summary\?\.total \?\? total/);
});

