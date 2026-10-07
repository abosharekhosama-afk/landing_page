import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/CPanelApp.jsx");

test("CPanel gates tenant data loads until auth bootstrap finishes", () => {
  const source = fs.readFileSync(appPath, "utf8");
  assert.ok(source.includes("sessionInvalidatingRef"), "401 handling must be single-flight");
  assert.ok(
    source.includes("if (isAuthResolving || sessionInvalidatingRef.current) return;"),
    "protected refresh effect must wait for auth resolve and skip during 401 invalidation",
  );
  assert.ok(
    /error\?\.status === 403 \? "Access denied\."/.test(source),
    "403 must stay logged in with Access denied message",
  );
  const handleApiError = source.slice(source.indexOf("function handleApiError"), source.indexOf("function handleApiError") + 1200);
  assert.ok(handleApiError.includes("sessionInvalidatingRef.current"), "401 path uses invalidation guard");
  assert.ok(!/if \(error\?\.status === 403\)[\s\S]{0,200}persistCurrentUser\(null\)/.test(handleApiError), "403 must not clear session");
});
