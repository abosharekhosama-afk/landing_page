import React from "react";

const emptyForm = {
  id: "",
  name: "",
  email: "",
  phone: "",
  position: "",
  department: "",
  hireDate: new Date().toISOString().slice(0, 10),
  salary: "",
  status: "Active",
  notes: "",
};

const statuses = ["Active", "On Leave", "Inactive"];

function employeeToForm(employee) {
  if (!employee) {
    return emptyForm;
  }

  return {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    phone: employee.phone || "",
    position: employee.position,
    department: employee.department,
    hireDate: employee.hireDate,
    salary: String(employee.salary || 0),
    status: employee.status,
    notes: employee.notes || "",
  };
}

function AdminEmployeeForm({ editingEmployee, onCancel, onSave, t }) {
  const [form, setForm] = React.useState(() => employeeToForm(editingEmployee));

  React.useEffect(() => {
    setForm(employeeToForm(editingEmployee));
  }, [editingEmployee]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave({
      ...form,
      id: form.id || `employee-${Date.now()}`,
      salary: Number(form.salary || 0),
    });
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <h3>
        {editingEmployee ? t("admin.editEmployee") : t("admin.addEmployee")}
      </h3>
      <label>
        {t("admin.employeeName")}
        <input name="name" onChange={handleChange} required value={form.name} />
      </label>
      <label>
        {t("auth.email")}
        <input
          name="email"
          onChange={handleChange}
          required
          type="email"
          value={form.email}
        />
      </label>
      <label>
        {t("auth.phone")}
        <input name="phone" onChange={handleChange} value={form.phone} />
      </label>
      <label>
        {t("admin.position")}
        <input
          name="position"
          onChange={handleChange}
          required
          value={form.position}
        />
      </label>
      <label>
        {t("admin.department")}
        <input
          name="department"
          onChange={handleChange}
          required
          value={form.department}
        />
      </label>
      <label>
        {t("admin.hireDate")}
        <input
          name="hireDate"
          onChange={handleChange}
          required
          type="date"
          value={form.hireDate}
        />
      </label>
      <label>
        {t("admin.salary")}
        <input
          min="0"
          name="salary"
          onChange={handleChange}
          type="number"
          value={form.salary}
        />
      </label>
      <label>
        {t("admin.employeeStatus")}
        <select name="status" onChange={handleChange} value={form.status}>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {t(`employeeStatus.${status}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="full-field">
        {t("checkout.notes")}
        <textarea name="notes" onChange={handleChange} value={form.notes} />
      </label>
      <div className="form-actions full-field">
        <button className="primary-action" type="submit">
          {t("admin.save")}
        </button>
        <button className="secondary-action" onClick={onCancel} type="button">
          {t("admin.cancel")}
        </button>
      </div>
    </form>
  );
}

export default AdminEmployeeForm;
