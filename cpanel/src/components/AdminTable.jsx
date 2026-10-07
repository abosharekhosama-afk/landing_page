import React from "react";

export default function AdminTable({ children }) {
  return (
    <div className="admin-data-table-wrap">
      <table className="admin-data-table">{children}</table>
    </div>
  );
}
