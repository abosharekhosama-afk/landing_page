// Shared animation system for storefront ads (splash ads + urgent announcement bars).
// Five professional, smooth entrance styles, each fully customizable through
// speed, direction and an explicit duration (ms). Used by both the storefront
// renderers and the admin picker.

export const AD_ANIMATION_STYLES = [
  { value: "fade",  en: "Fade",          ar: "تلاشي",       descEn: "Soft fade with a subtle scale",               descAr: "تلاشٍ ناعم مع تكبير خفيف" },
  { value: "rise",  en: "Rise",          ar: "صعود",        descEn: "Smooth upward glide",                         descAr: "انزلاق صاعد أملس" },
  { value: "zoom",  en: "Zoom",          ar: "تكبير",       descEn: "Springy pop-in from the center",               descAr: "ظهور مرن من المركز" },
  { value: "slide", en: "Slide",         ar: "انزلاق",      descEn: "Elegant side slide with fade",                 descAr: "انزلاق جانبي أنيق مع تلاشٍ" },
  { value: "blur",  en: "Blur reveal",   ar: "إظهار بتعتيم", descEn: "Premium blur-to-sharp reveal",                descAr: "إظهار فاخر من الضبابية إلى الوضوح" },
];

export const AD_ANIMATION_SPEEDS = [
  { value: "slow",   en: "Slow",   ar: "بطيء" },
  { value: "normal", en: "Normal", ar: "عادي" },
  { value: "fast",   en: "Fast",   ar: "سريع" },
];

export const AD_ANIMATION_DIRECTIONS = [
  { value: "up",    en: "Up",    ar: "أعلى" },
  { value: "down",  en: "Down",  ar: "أسفل" },
  { value: "left",  en: "Left",  ar: "يسار" },
  { value: "right", en: "Right", ar: "يمين" },
  { value: "none",  en: "None",  ar: "بدون" },
];

const STYLE_VALUES = new Set(AD_ANIMATION_STYLES.map((s) => s.value));
const SPEED_VALUES = new Set(AD_ANIMATION_SPEEDS.map((s) => s.value));
const DIRECTION_VALUES = new Set(AD_ANIMATION_DIRECTIONS.map((s) => s.value));

// Default durations (seconds) per speed. Overridden by an explicit custom duration.
const SPEED_DURATION = { slow: 0.9, normal: 0.55, fast: 0.35 };

export function animationLocalizedLabel(list, value, ar) {
  const entry = list.find((item) => item.value === value);
  return ar ? entry?.ar || value : entry?.en || value;
}

// Build CSS custom properties + animation class name for a given ad config.
export function adAnimationProps(ad = {}) {
  const style = STYLE_VALUES.has(ad.animation_style) ? ad.animation_style : "fade";
  const speed = SPEED_VALUES.has(ad.animation_speed) ? ad.animation_speed : "normal";
  let direction = DIRECTION_VALUES.has(ad.animation_direction) ? ad.animation_direction : "up";

  // Only slide/rise actually use a direction; the others animate uniformly.
  if (style !== "rise" && style !== "slide") direction = "none";

  const duration = Math.max(200, Math.min(2000, Number(ad.animation_duration) || SPEED_DURATION[speed] * 1000));
  const ease = style === "zoom" ? "cubic-bezier(0.34, 1.56, 0.64, 1)" : "cubic-bezier(0.22, 1, 0.36, 1)";

  let fromY = "0px";
  let fromX = "0px";
  if (style === "rise") fromY = direction === "down" ? "-26px" : "26px";
  if (style === "slide") fromX = direction === "left" ? "-42px" : "42px";

  return {
    className: `store-ad-anim store-ad-anim-${style}`,
    style: {
      "--ad-dur": `${duration}ms`,
      "--ad-ease": ease,
      "--ad-from-y": fromY,
      "--ad-from-x": fromX,
    },
  };
}
