import React from "react";
import { CornerDownLeft, Search, X } from "lucide-react";
import {
  filterNavigationDestinations,
  flattenNavigationDestinations,
  moveNavigatorSelection,
  navigationAncestorLabel,
  navigationLabel,
} from "../utils/adminQuickNavigator.js";

function AdminQuickNavigator({
  language = "en",
  onClose,
  onSelect,
  open,
  resolveIcon,
  sections = [],
}) {
  const ar = language === "ar";
  const dialogRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const previousFocusRef = React.useRef(null);
  const resultRefs = React.useRef([]);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const destinations = React.useMemo(() => flattenNavigationDestinations(sections), [sections]);
  const results = React.useMemo(
    () => filterNavigationDestinations(destinations, query),
    [destinations, query],
  );

  React.useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    setQuery("");
    setActiveIndex(0);
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      const previousFocus = previousFocusRef.current;
      if (previousFocus?.isConnected && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      }
    };
  }, [open]);

  React.useEffect(() => {
    setActiveIndex(results.length ? 0 : -1);
  }, [query, destinations, results.length]);

  React.useEffect(() => {
    if (!open || activeIndex < 0) return;
    resultRefs.current[activeIndex]?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, open]);

  if (!open) return null;

  const selectResult = (destination) => {
    if (!destination) return;
    onClose();
    onSelect(destination);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key === "Tab") {
      const focusable = [
        ...(dialogRef.current?.querySelectorAll("input, button:not([disabled])") || []),
      ];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        moveNavigatorSelection(index, event.key === "ArrowUp" ? "up" : "down", results.length),
      );
      return;
    }
    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectResult(results[activeIndex]);
    }
  };

  const inputLabel = ar ? "بحث سريع" : "Quick search";
  const emptyLabel = ar ? "لا توجد صفحات مطابقة" : "No matching pages";

  return (
    <div
      className="admin-quick-navigator-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <section
        aria-label={inputLabel}
        aria-modal="true"
        className="admin-quick-navigator-dialog"
        dir={ar ? "rtl" : "ltr"}
        ref={dialogRef}
        role="dialog"
      >
        <div className="admin-quick-navigator-input-row">
          <Search aria-hidden="true" size={19} />
          <input
            aria-activedescendant={
              activeIndex >= 0 ? `admin-quick-nav-result-${activeIndex}` : undefined
            }
            aria-autocomplete="list"
            aria-controls="admin-quick-navigator-results"
            aria-expanded="true"
            aria-label={inputLabel}
            autoComplete="off"
            data-admin-quick-navigator="input"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={inputLabel}
            ref={inputRef}
            role="combobox"
            type="search"
            value={query}
          />
          <button aria-label={ar ? "إغلاق" : "Close"} onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div
          aria-label={ar ? "صفحات الإدارة" : "Admin pages"}
          className="admin-quick-navigator-results"
          id="admin-quick-navigator-results"
          role="listbox"
        >
          {!results.length && (
            <div className="admin-quick-navigator-empty" role="status">
              {emptyLabel}
            </div>
          )}
          {results.map((destination, index) => {
            const DestinationIcon = resolveIcon(destination.icon);
            const selected = index === activeIndex;
            const ancestor = navigationAncestorLabel(destination, language);
            return (
              <button
                aria-selected={selected}
                className={`admin-quick-navigator-result ${selected ? "selected" : ""}`}
                id={`admin-quick-nav-result-${index}`}
                key={`${destination.pageKey}-${destination.path || "default"}`}
                onClick={() => selectResult(destination)}
                onFocus={() => setActiveIndex(index)}
                onMouseMove={() => setActiveIndex(index)}
                ref={(node) => {
                  resultRefs.current[index] = node;
                }}
                role="option"
                type="button"
              >
                <span className="admin-quick-navigator-icon">
                  <DestinationIcon size={18} />
                </span>
                <span className="admin-quick-navigator-copy">
                  <strong>{navigationLabel(destination, language)}</strong>
                  {ancestor && <small>{ancestor}</small>}
                </span>
                {destination.placeholder && (
                  <span className="admin-quick-navigator-status">{ar ? "قريباً" : "Soon"}</span>
                )}
                <CornerDownLeft
                  aria-hidden="true"
                  className="admin-quick-navigator-enter"
                  size={15}
                />
              </button>
            );
          })}
        </div>

        <footer className="admin-quick-navigator-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            {ar ? "للتنقل" : "to navigate"}
          </span>
          <span>
            <kbd>Enter</kbd>
            {ar ? "للفتح" : "to open"}
          </span>
          <span>
            <kbd>Esc</kbd>
            {ar ? "للإغلاق" : "to close"}
          </span>
        </footer>
      </section>
    </div>
  );
}

export default AdminQuickNavigator;
