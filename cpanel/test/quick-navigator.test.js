import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  filterNavigationDestinations,
  flattenNavigationDestinations,
  isQuickNavigatorShortcut,
  moveNavigatorSelection,
  navigationLabel,
} from "../src/utils/adminQuickNavigator.js";

const layoutSource = fs.readFileSync(
  new URL("../src/components/AdminLayout.jsx", import.meta.url),
  "utf8",
);
const navigatorSource = fs.readFileSync(
  new URL("../src/components/AdminQuickNavigator.jsx", import.meta.url),
  "utf8",
);
const cssSource = fs.readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");

const filteredSections = [
  {
    id: "catalog",
    label: { en: "Catalog", ar: "الكتالوج" },
    children: [
      {
        id: "admin-products",
        pageKey: "admin-products",
        label: { en: "Products", ar: "المنتجات" },
        icon: "package",
        path: "/admin/products",
      },
    ],
  },
  {
    id: "sales",
    label: { en: "Sales", ar: "المبيعات" },
    children: [
      {
        id: "admin-orders",
        pageKey: "admin-orders",
        label: { en: "Orders", ar: "الطلبات" },
        icon: "shoppingCart",
      },
    ],
  },
];

test("Quick Navigator trigger opens the dialog from the existing topbar search area", () => {
  assert.match(layoutSource, /className="admin-global-search"/);
  assert.match(layoutSource, /onClick=\{openQuickNavigator\}/);
  assert.match(layoutSource, /setQuickNavigatorOpen\(true\)/);
  assert.match(layoutSource, /<AdminQuickNavigator[\s\S]*?open=\{quickNavigatorOpen\}/);
  assert.match(layoutSource, /quickSearch: ar \? "بحث سريع" : "Quick search"/);
});

test("Ctrl+K and Cmd+K open only outside unrelated editable controls", () => {
  const plainTarget = { tagName: "DIV", dataset: {} };
  assert.equal(isQuickNavigatorShortcut({ ctrlKey: true, key: "k", target: plainTarget }), true);
  assert.equal(isQuickNavigatorShortcut({ metaKey: true, key: "K", target: plainTarget }), true);
  assert.equal(
    isQuickNavigatorShortcut({
      ctrlKey: true,
      key: "k",
      target: { tagName: "INPUT", dataset: {} },
    }),
    false,
  );
  assert.equal(
    isQuickNavigatorShortcut({
      metaKey: true,
      key: "k",
      target: { tagName: "TEXTAREA", dataset: {} },
    }),
    false,
  );
  assert.equal(
    isQuickNavigatorShortcut({
      ctrlKey: true,
      key: "k",
      target: { tagName: "DIV", isContentEditable: true, dataset: {} },
    }),
    false,
  );
  assert.equal(
    isQuickNavigatorShortcut({
      ctrlKey: true,
      key: "k",
      target: { tagName: "INPUT", dataset: { adminQuickNavigator: "input" } },
    }),
    true,
  );
  assert.match(layoutSource, /window\.addEventListener\("keydown", openFromShortcut\)/);
});

test("Escape closes and opening the navigator clears conflicting shell popovers", () => {
  assert.match(navigatorSource, /event\.key === "Escape"[\s\S]*?onClose\(\)/);
  assert.match(
    layoutSource,
    /openQuickNavigator[\s\S]*?setActivePopover\(null\)[\s\S]*?setQuickNavigatorOpen\(true\)/,
  );
});

test("English and Arabic searches filter the same existing destinations", () => {
  const destinations = flattenNavigationDestinations(filteredSections);
  assert.deepEqual(
    filterNavigationDestinations(destinations, "products").map((item) => item.pageKey),
    ["admin-products"],
  );
  assert.deepEqual(
    filterNavigationDestinations(destinations, "طلبات").map((item) => item.pageKey),
    ["admin-orders"],
  );
  assert.equal(navigationLabel(destinations[0], "en"), "Products");
  assert.equal(navigationLabel(destinations[0], "ar"), "المنتجات");
});

test("Navigator derives only from the already-filtered sections tree", () => {
  const destinations = flattenNavigationDestinations(filteredSections);
  assert.equal(
    destinations.some((item) => item.pageKey === "admin-platform-companies"),
    false,
    "unauthorized destination must remain absent",
  );
  assert.equal(
    destinations.some((item) => item.pageKey === "admin-inventory"),
    false,
    "module-disabled destination must remain absent",
  );
  assert.match(layoutSource, /sections=\{sections\}/);
  assert.doesNotMatch(layoutSource, /allNavigationItems/);
  assert.doesNotMatch(
    navigatorSource,
    /canAccessAdminPage|moduleAllowsPage|allNavigationItems|pagePaths/,
  );
});

test("No-results state is real and bilingual", () => {
  const destinations = flattenNavigationDestinations(filteredSections);
  assert.deepEqual(filterNavigationDestinations(destinations, "nonexistent destination"), []);
  assert.match(navigatorSource, /لا توجد صفحات مطابقة/);
  assert.match(navigatorSource, /No matching pages/);
  assert.match(navigatorSource, /!results\.length/);
});

test("Arrow Up and Arrow Down wrap the selected destination", () => {
  assert.equal(moveNavigatorSelection(0, "down", 2), 1);
  assert.equal(moveNavigatorSelection(1, "down", 2), 0);
  assert.equal(moveNavigatorSelection(0, "up", 2), 1);
  assert.equal(moveNavigatorSelection(1, "up", 2), 0);
  assert.equal(moveNavigatorSelection(0, "down", 0), -1);
  assert.match(navigatorSource, /event\.key === "ArrowDown" \|\| event\.key === "ArrowUp"/);
});

test("Enter and pointer selection use the existing AdminLayout go behavior", () => {
  assert.match(
    navigatorSource,
    /event\.key === "Enter"[\s\S]*?selectResult\(results\[activeIndex\]\)/,
  );
  assert.match(
    layoutSource,
    /onSelect=\{\(destination\) => go\(destination\.pageKey, destination\)\}/,
  );
  assert.match(layoutSource, /if \(item\?\.path\) onNavigate\(pageKey, \{ path: item\.path \}\)/);
  assert.match(layoutSource, /if \(item\?\.newTab && item\?\.path\)[\s\S]*?window\.open/);
});

test("Dynamic and custom navigation metadata survives flattening", () => {
  const dynamic = {
    id: "custom-module-fleet",
    pageKey: "admin-custom-module:fleet",
    path: "/admin/custom-modules/fleet",
    label: { en: "Fleet", ar: "الأسطول" },
    icon: "folder",
    existing: true,
  };
  const [destination] = flattenNavigationDestinations([
    {
      id: "custom",
      label: { en: "Custom modules", ar: "وحدات مخصصة" },
      children: [dynamic],
    },
  ]);
  assert.equal(destination.pageKey, dynamic.pageKey);
  assert.equal(destination.path, dynamic.path);
  assert.equal(destination.icon, dynamic.icon);
  assert.equal(destination.ancestors[0].en, "Custom modules");
  assert.deepEqual(
    filterNavigationDestinations([destination], "الأسطول").map((item) => item.pageKey),
    [dynamic.pageKey],
  );
});

test("Navigator has dialog, combobox, listbox, selected-option, focus, and responsive styling", () => {
  assert.match(navigatorSource, /aria-modal="true"/);
  assert.match(navigatorSource, /role="combobox"/);
  assert.match(navigatorSource, /role="listbox"/);
  assert.match(navigatorSource, /aria-selected=\{selected\}/);
  assert.match(navigatorSource, /inputRef\.current\?\.focus\(\)/);
  assert.match(navigatorSource, /previousFocus\?\.isConnected/);
  assert.match(
    cssSource,
    /\.admin-quick-navigator-dialog[\s\S]*?width:\s*min\(680px, calc\(100vw - 32px\)\)/,
  );
  assert.match(
    cssSource,
    /@media \(max-width: 760px\)[\s\S]*?\.admin-studio-shell \.admin-global-search[\s\S]*?width:\s*36px !important/,
  );
});
