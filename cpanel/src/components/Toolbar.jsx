import React from "react";

export default function Toolbar({ children, onAdd, addLabel, className }) {
  return (
    <div className={["admin-toolbar", className].filter(Boolean).join(" ")}>
      <div className="admin-toolbar-main">{children}</div>
      {onAdd && (
        <button className="admin-primary-button" onClick={onAdd} type="button">
          {addLabel}
        </button>
      )}
    </div>
  );
}
