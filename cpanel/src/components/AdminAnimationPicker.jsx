import React from "react";
import {
  AD_ANIMATION_DIRECTIONS,
  AD_ANIMATION_SPEEDS,
  AD_ANIMATION_STYLES,
  adAnimationProps,
  animationLocalizedLabel,
} from "../utils/adAnimation.js";

// Admin picker for the storefront ad animation system (splash ads + urgent bars).
export default function AdminAnimationPicker({ value = {}, onChange, language = "en" }) {
  const ar = language === "ar";
  const patch = (next) => onChange({ ...value, ...next });

  const style = AD_ANIMATION_STYLES.some((s) => s.value === value.animation_style)
    ? value.animation_style
    : "fade";
  const speed = AD_ANIMATION_SPEEDS.some((s) => s.value === value.animation_speed)
    ? value.animation_speed
    : "normal";
  const direction = ["rise", "slide"].includes(style)
    ? (AD_ANIMATION_DIRECTIONS.some((d) => d.value === value.animation_direction) ? value.animation_direction : "up")
    : "none";

  const preview = adAnimationProps({ ...value, animation_style: style, animation_speed: speed, animation_direction: direction });

  return (
    <div className="admin-panel-card admin-anim-picker">
      <div className="admin-section-head">
        <div>
          <h3>{ar ? "نظام الحركة (الأنميشن)" : "Animation style"}</h3>
          <p>{ar ? "خمسة أنماط دخول احترافية وسلسة قابلة للتخصيص. تُطبَّق على إعلانات البداية والإعلانات العاجلة." : "Five professional, smooth entrance styles — fully customizable. Applied to both splash ads and urgent announcement bars."}</p>
        </div>
      </div>

      <div className="admin-anim-grid">
        {AD_ANIMATION_STYLES.map((entry) => (
          <label
            key={entry.value}
            className={"admin-anim-option" + (style === entry.value ? " is-active" : "")}
          >
            <input
              type="radio"
              name="admin-anim-style"
              checked={style === entry.value}
              onChange={() => patch({ animation_style: entry.value })}
            />
            <span className={`admin-anim-preview ${preview.className}`} style={preview.style}>
              <span />
            </span>
            <strong>{ar ? entry.ar : entry.en}</strong>
            <small>{ar ? entry.descAr : entry.descEn}</small>
          </label>
        ))}
      </div>

      <div className="admin-anim-controls">
        <label>
          {ar ? "السرعة" : "Speed"}
          <select value={speed} onChange={(e) => patch({ animation_speed: e.target.value })}>
            {AD_ANIMATION_SPEEDS.map((entry) => (
              <option key={entry.value} value={entry.value}>{animationLocalizedLabel(AD_ANIMATION_SPEEDS, entry.value, ar)}</option>
            ))}
          </select>
        </label>

        {["rise", "slide"].includes(style) && (
          <label>
            {ar ? "الاتجاه" : "Direction"}
            <select value={direction} onChange={(e) => patch({ animation_direction: e.target.value })}>
              {AD_ANIMATION_DIRECTIONS.filter((d) => d.value !== "none").map((entry) => (
                <option key={entry.value} value={entry.value}>{animationLocalizedLabel(AD_ANIMATION_DIRECTIONS, entry.value, ar)}</option>
              ))}
            </select>
          </label>
        )}

        <label className="admin-anim-custom">
          <span>{ar ? "تخصيص المدة" : "Custom duration"}</span>
          <input
            type="range"
            min="200"
            max="2000"
            step="50"
            value={Number(value.animation_duration) || 550}
            onChange={(e) => patch({ animation_duration: Number(e.target.value) })}
          />
          <output>{value.animation_duration ? value.animation_duration + "ms" : (ar ? "تلقائي" : "Auto")}</output>
        </label>
        <label className="checkbox-line">
          <input
            type="checkbox"
            checked={Boolean(value.animation_duration)}
            onChange={(e) => patch({ animation_duration: e.target.checked ? 550 : null })}
          />
          {ar ? "تفعيل المدة المخصصة" : "Use custom duration"}
        </label>
      </div>
    </div>
  );
}
