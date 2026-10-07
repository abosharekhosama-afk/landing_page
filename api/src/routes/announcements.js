import { announcementRepository } from "../data/store.js";
import { createCrudRouter } from "./employee4Crud.js";

const placements = new Set(["ALL_PAGES", "HOMEPAGE", "SELECTED_PAGES"]);
const alignments = new Set(["LEFT", "CENTER", "RIGHT"]);
const animStyles = new Set(["fade", "rise", "zoom", "slide", "blur"]);
const animSpeeds = new Set(["slow", "normal", "fast"]);
const animDirections = new Set(["up", "down", "left", "right", "none"]);

function validateAnimationFields(value = {}) {
  if (value.animation_style != null && !animStyles.has(value.animation_style)) return "Invalid animation style.";
  if (value.animation_speed != null && !animSpeeds.has(value.animation_speed)) return "Invalid animation speed.";
  if (value.animation_direction != null && !animDirections.has(value.animation_direction)) return "Invalid animation direction.";
  if (value.animation_duration != null && (!Number.isFinite(Number(value.animation_duration)) || Number(value.animation_duration) < 200 || Number(value.animation_duration) > 2000)) {
    return "Animation duration must be between 200 and 2000 ms.";
  }
  return null;
}

function validateAnnouncement(value = {}) {
  if (!String(value.title || "").trim()) return "Title is required.";
  if (!String(value.text || "").trim()) return "Announcement text is required.";
  if (String(value.title || "").length > 200) return "Title is too long.";
  if (String(value.text || "").length > 2000) return "Announcement text is too long.";
  for (const field of ["text_color", "background_color"]) {
    if (value[field] && !/^#[0-9a-f]{6}$/i.test(String(value[field]))) return `${field} must be a 6-digit hex color.`;
  }
  if (value.link && !/^(?:https?:\/\/|\/)/i.test(String(value.link))) return "Link must be an absolute HTTP(S) URL or an internal path.";
  if (!placements.has(String(value.placement || "ALL_PAGES"))) return "Invalid announcement placement.";
  if (!alignments.has(String(value.alignment || "CENTER"))) return "Invalid announcement alignment.";
  if (!Array.isArray(value.selected_pages || [])) return "Selected pages must be an array.";
  if (String(value.placement || "ALL_PAGES") === "SELECTED_PAGES" && !(value.selected_pages || []).length) {
    return "At least one selected page is required.";
  }
  const start = value.start_date ?? value.start_at;
  const end = value.end_date ?? value.end_at;
  if (start && Number.isNaN(Date.parse(start))) return "Invalid start date.";
  if (end && Number.isNaN(Date.parse(end))) return "Invalid end date.";
  if (start && end && new Date(start) > new Date(end)) return "End date must be after start date.";
  if (!Number.isInteger(Number(value.priority ?? 0))) return "Priority must be an integer.";
  return validateAnimationFields(value);
}

export default createCrudRouter({
  repository: announcementRepository,
  viewPermission: "announcements.view",
  managePermission: "announcements.manage",
  entityType: "ANNOUNCEMENT",
  actionPrefix: "ANNOUNCEMENT",
  validate: validateAnnouncement,
});
