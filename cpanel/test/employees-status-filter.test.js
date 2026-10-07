import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const employeesPageSource = fs.readFileSync(
  new URL("../src/pages/AdminEmployeesPage.jsx", import.meta.url),
  "utf8",
);

const employeeTableSource = fs.readFileSync(
  new URL("../src/components/EmployeeTable.jsx", import.meta.url),
  "utf8",
);

const translationsSource = fs.readFileSync(
  new URL("../src/data/translations.js", import.meta.url),
  "utf8",
);

test("AdminEmployeesPage has All/Active/Disabled filter tabs", () => {
  assert.ok(
    employeesPageSource.includes('statusFilter'),
    "AdminEmployeesPage uses statusFilter state",
  );
  assert.ok(
    employeesPageSource.includes('"all"'),
    "AdminEmployeesPage has All filter option",
  );
  assert.ok(
    employeesPageSource.includes('"active"'),
    "AdminEmployeesPage has Active filter option",
  );
  assert.ok(
    employeesPageSource.includes('"disabled"'),
    "AdminEmployeesPage has Disabled filter option",
  );
  assert.ok(
    employeesPageSource.includes('admin-segmented'),
    "AdminEmployeesPage uses admin-segmented CSS class for filter tabs",
  );
  assert.ok(
    employeesPageSource.includes('filterAll'),
    "AdminEmployeesPage references filterAll translation key",
  );
  assert.ok(
    employeesPageSource.includes('filterActive'),
    "AdminEmployeesPage references filterActive translation key",
  );
  assert.ok(
    employeesPageSource.includes('filterDisabled'),
    "AdminEmployeesPage references filterDisabled translation key",
  );
});

test("AdminEmployeesPage filters employees by status", () => {
  assert.ok(
    employeesPageSource.includes('emp.isActive'),
    "AdminEmployeesPage filters by isActive for active tab",
  );
  assert.ok(
    employeesPageSource.includes('!emp.isActive'),
    "AdminEmployeesPage filters by !isActive for disabled tab",
  );
});

test("EmployeeTable shows Disabled status label and Enable action for disabled employees", () => {
  assert.ok(
    employeeTableSource.includes('admin.disabled'),
    "EmployeeTable shows admin.disabled translation for disabled employees",
  );
  assert.ok(
    employeeTableSource.includes('admin.enable'),
    "EmployeeTable shows admin.enable translation for enabling disabled employees",
  );
  assert.ok(
    employeeTableSource.includes('admin.deactivate'),
    "EmployeeTable shows admin.deactivate translation for disabling active employees",
  );
  assert.ok(
    !employeeTableSource.includes('isActive ? t("admin.active") : t("admin.inactive")'),
    "EmployeeTable no longer shows Inactive label for disabled employees",
  );
});

test("translations include disabled, enable, and filter keys", () => {
  assert.ok(
    translationsSource.includes('disabled: "Disabled"'),
    "English translations include admin.disabled",
  );
  assert.ok(
    translationsSource.includes('enable: "Enable"'),
    "English translations include admin.enable",
  );
  assert.ok(
    translationsSource.includes('filterAll: "All"'),
    "English translations include admin.filterAll",
  );
  assert.ok(
    translationsSource.includes('filterActive: "Active"'),
    "English translations include admin.filterActive",
  );
  assert.ok(
    translationsSource.includes('filterDisabled: "Disabled"'),
    "English translations include admin.filterDisabled",
  );
  assert.ok(
    translationsSource.includes('disabled: "معطّل"'),
    "Arabic translations include admin.disabled",
  );
  assert.ok(
    translationsSource.includes('enable: "تفعيل"'),
    "Arabic translations include admin.enable",
  );
  assert.ok(
    translationsSource.includes('filterAll: "الكل"'),
    "Arabic translations include admin.filterAll",
  );
  assert.ok(
    translationsSource.includes('filterActive: "نشط"'),
    "Arabic translations include admin.filterActive",
  );
  assert.ok(
    translationsSource.includes('filterDisabled: "معطّل"'),
    "Arabic translations include admin.filterDisabled",
  );
});
