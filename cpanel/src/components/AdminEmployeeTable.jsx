import React from "react";

function AdminEmployeeTable({ employees, onDelete, onEdit, t }) {
  if (employees.length === 0) {
    return <div className="empty-panel compact-empty">{t("admin.noEmployees")}</div>;
  }

  return (
    <div className="admin-data-table-wrap">
      <table className="admin-data-table">
        <thead>
          <tr>
            <th>{t("admin.employee")}</th>
            <th>{t("admin.position")}</th>
            <th>{t("admin.department")}</th>
            <th>{t("admin.employeeStatus")}</th>
            <th>{t("admin.hireDate")}</th>
            <th>{t("admin.salary")}</th>
            <th className="admin-data-table-actions">{t("admin.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id}>
              <td>
                <strong className="admin-data-table-cell-clip" title={employee.name}>{employee.name}</strong>
                <span className="table-muted">{employee.email}</span>
                {employee.phone && <span className="table-muted">{employee.phone}</span>}
              </td>
              <td>{employee.position}</td>
              <td>{employee.department}</td>
              <td>{t(`employeeStatus.${employee.status}`)}</td>
              <td>{employee.hireDate}</td>
              <td>
                {employee.salary} {t("common.ils")}
              </td>
              <td className="admin-data-table-actions">
                <div className="row-actions">
                  <button
                    aria-label={`${t("admin.editEmployee")} ${employee.name || employee.id}`}
                    className="text-action"
                    onClick={() => onEdit(employee)}
                    type="button"
                  >
                    {t("admin.editEmployee")}
                  </button>
                  <button
                    aria-label={`${t("admin.delete")} ${employee.name || employee.id}`}
                    className="text-action danger"
                    onClick={() => onDelete(employee.id)}
                    type="button"
                  >
                    {t("admin.delete")}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminEmployeeTable;
