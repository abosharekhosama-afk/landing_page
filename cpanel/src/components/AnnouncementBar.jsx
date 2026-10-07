import React from "react";
import { adAnimationProps } from "../utils/adAnimation.js";

export default function AnnouncementBar({ items = [], onNavigate }) {
  const visible = items.filter(Boolean);
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (visible.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % visible.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [visible.length]);

  if (!visible.length) return null;
  const item = visible[index % visible.length];
  const anim = adAnimationProps(item);
  return (
    <div
      className={`store-announcement-bar store-announcement-crossfade ${anim.className}`}
      key={item.id || index}
      style={{ ...anim.style, color: item.text_color || undefined, backgroundColor: item.background_color || undefined, textAlign: String(item.alignment || "CENTER").toLowerCase() }}
    >
      <span><strong>{item.title}</strong>{item.text ? ` — ${item.text}` : ""}</span>
      {item.link && <button type="button" onClick={() => item.link.startsWith("/") ? (window.location.href = item.link) : window.open(item.link, "_blank", "noopener,noreferrer")}>Learn more</button>}
      {visible.length > 1 && (
        <span className="store-announcement-dots" aria-label="Announcements">
          {visible.map((entry, entryIndex) => (
            <button
              aria-label={`Announcement ${entryIndex + 1}`}
              className={entryIndex === index % visible.length ? "is-active" : ""}
              key={entry.id || entryIndex}
              onClick={() => setIndex(entryIndex)}
              type="button"
            />
          ))}
        </span>
      )}
    </div>
  );
}
