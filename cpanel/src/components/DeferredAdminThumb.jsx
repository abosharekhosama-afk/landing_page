import React from "react";
import {
  resolveAdminPreviewUrl,
  useProductImagePlaceholder,
} from "../utils/productImages.js";

/**
 * Defers setting img.src until the thumb is near/inside the viewport.
 * loading="lazy" alone is not enough for dense admin tables.
 * Resolves the `*.admin-preview.webp` sibling (admin-only small asset).
 * If the preview sibling is missing (backfill not yet run), the img onError
 * swaps to the lightweight placeholder SVG. List/table thumbs NEVER request
 * the full-resolution main asset.
 */
export default function DeferredAdminThumb({ src, alt = "", placeholder = "·" }) {
  const ref = React.useRef(null);
  const [activeSrc, setActiveSrc] = React.useState(null);
  const resolved = src ? resolveAdminPreviewUrl(src) : "";

  React.useEffect(() => {
    setActiveSrc(null);
    if (!resolved) return undefined;
    const node = ref.current;
    if (!node) return undefined;

    if (typeof IntersectionObserver === "undefined") {
      setActiveSrc(resolved);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setActiveSrc(resolved);
          observer.disconnect();
        }
      },
      { root: null, rootMargin: "160px 0px", threshold: 0.01 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [resolved]);

  function handleError(event) {
    // Preview sibling missing (backfill not yet run): swap to the lightweight
    // placeholder. Never fall back to the full-resolution main asset.
    useProductImagePlaceholder(event);
  }

  if (!resolved) {
    return <span className="admin-logo-mini">{placeholder}</span>;
  }

  if (!activeSrc) {
    return (
      <span ref={ref} className="admin-logo-mini admin-thumb-deferred" aria-hidden="true">
        {placeholder}
      </span>
    );
  }

  return (
    <img
      ref={ref}
      alt={alt}
      className="admin-thumb"
      decoding="async"
      loading="lazy"
      onError={handleError}
      src={activeSrc}
    />
  );
}
