import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  validateWebsiteVideoFile,
  websiteVideoUploadLimitMb,
} from "../src/utils/api.js";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const managerSource = read("../src/components/WebsiteMediaManager.jsx");
const apiSource = read("../src/utils/api.js");
const cssSource = read("../src/styles/global.css");

test("website video upload size limit defaults to 150 MB", () => {
  assert.equal(websiteVideoUploadLimitMb(), 150);
});

test("validateWebsiteVideoFile accepts MP4 and WEBM within the size limit", () => {
  const valid = validateWebsiteVideoFile({ type: "video/mp4", size: 1000 });
  assert.equal(valid.maxBytes, 150 * 1024 * 1024);
  assert.equal(validateWebsiteVideoFile({ type: "video/webm", size: 1000 }).maxBytes, valid.maxBytes);
});

test("validateWebsiteVideoFile rejects unsupported video types", () => {
  assert.throws(
    () => validateWebsiteVideoFile({ type: "video/avi", size: 1000 }),
    /MP4 or WEBM/i,
  );
  assert.throws(
    () => validateWebsiteVideoFile({ type: "video/mov", size: 1000 }),
    /MP4 or WEBM/i,
  );
  assert.throws(() => validateWebsiteVideoFile(null), /No video file/i);
});

test("validateWebsiteVideoFile rejects files over 150 MB", () => {
  assert.throws(
    () => validateWebsiteVideoFile({ type: "video/mp4", size: 150 * 1024 * 1024 + 1 }),
    /150 MB limit/i,
  );
});

test("website media upload uploads to the tenant-scoped website-media endpoint", () => {
  assert.match(apiSource, /open\("POST",\s*`\$\{apiBaseUrl\}\/uploads\/website-media`\)/);
  assert.match(apiSource, /url:\s*data\.url \|\| data\.path/);
});

test("website media manager exposes a video upload, replace, preview and remove UX", () => {
  assert.match(managerSource, /website_video_upload|uploadWebsiteVideo/);
  assert.match(managerSource, /accept="video\/mp4,video\/webm"/);
  assert.match(managerSource, /"Upload video"|"رفع فيديو"/);
  assert.match(managerSource, /"Remove video"|"إزالة الفيديو"/);
  assert.match(managerSource, /website-media-upload-progress/);
  assert.match(managerSource, /role="progressbar"/);
  assert.match(managerSource, /website-media-video-hint/);
  assert.match(managerSource, /MP4 or WEBM - max \$\{maxVideoMb\} MB/);
  assert.match(managerSource, /mediaType: url \? "video"/);
  assert.match(managerSource, /\.videoUrl/);
  assert.match(managerSource, /websiteVideoUploadLimitMb\(\)/);
});

test("video manager CSS includes the preview and progress bar styles", () => {
  assert.match(cssSource, /\.website-media-preview video/);
  assert.match(cssSource, /\.website-media-upload-progress/);
  assert.match(cssSource, /\.website-media-video-hint/);
});
