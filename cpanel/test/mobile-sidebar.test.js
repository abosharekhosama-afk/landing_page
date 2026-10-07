import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const layout = fs.readFileSync(path.join(root, "src/components/AdminLayout.jsx"), "utf8");
const css = fs.readFileSync(path.join(root, "src/styles/global.css"), "utf8");

test("mobile sidebar toggle lives in the topnav and supports open/close", () => {
  assert.ok(layout.includes("admin-topnav-left"), "toggle must sit in topnav");
  assert.ok(layout.includes("toggleMobileSidebar"), "toggle handler required");
  assert.ok(layout.includes("setMobileOpen((open) => !open)"), "toggle must flip open state");
  assert.ok(layout.includes("aria-expanded={mobileOpen}"), "ARIA expanded required");
  assert.ok(layout.includes("aria-controls={sidebarId}"), "ARIA controls required");
  assert.ok(layout.includes("admin-sidebar-close-mobile"), "explicit close control required");
  assert.ok(layout.includes("admin-sidebar-backdrop"), "outside click backdrop required");
  assert.ok(layout.includes("closeMobileSidebar"), "shared close helper required");
  assert.ok(layout.includes("closeMobileSidebar();"), "nav and route handlers close drawer");
  assert.ok(layout.includes('window.addEventListener("popstate"'), "Back/Forward closes drawer");
  assert.ok(layout.includes("if (mobileOpen) closeMobileSidebar()"), "Escape closes mobile nav");
  assert.ok(
    /closeMobileSidebar\(\);\s*if \(typeof window !== "undefined"\) setLocationPath\(window\.location\.pathname\);\s*\}, \[activeKey, activePage, company\?\.id, currentUser\?\.id, closeMobileSidebar\]/.test(layout)
      || /\[activeKey, activePage, company\?\.id, currentUser\?\.id, closeMobileSidebar\]/.test(layout),
    "route/auth changes close mobile nav",
  );
  assert.ok(layout.includes("[locationPath, closeMobileSidebar]"), "pathname changes close mobile nav");
});

test("mobile sidebar CSS keeps drawer below topnav with RTL/LTR inset and no left/right conflict", () => {
  assert.ok(css.includes(".admin-studio-shell .admin-mobile-menu"), "studio mobile toggle styles exist");
  assert.ok(css.includes("inset-inline-start: -110%"), "closed drawer uses logical inset hide");
  assert.ok(css.includes("inset-inline-start: 0 !important"), "open drawer docks with logical inset");
  assert.ok(css.includes("left: auto !important"), "legacy left positioning must not fight drawer");
  assert.ok(css.includes("overflow-x: hidden"), "open state prevents horizontal overflow");
  assert.ok(css.includes("z-index: 1250 !important"), "drawer stays above backdrop after late desktop rules");
  assert.ok(css.includes("z-index: 1240 !important"), "backdrop stays under open drawer");
  assert.ok(css.includes("pointer-events: none"), "closed drawer does not intercept taps");
  assert.ok(css.includes("visibility: hidden"), "closed drawer is not visually sticky");
  assert.ok(!/admin-studio-shell[\s\S]{0,200}padding-inline-start:\s*72px/.test(css), "toggle no longer needs reserved 72px gutter");
});
