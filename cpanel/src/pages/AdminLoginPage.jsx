import React from "react";

function AdminLoginPage({ company, message, onLogin, t }) {
  const [form, setForm] = React.useState({
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onLogin(form);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="admin-login-page">
      <div className="admin-login-brand">
        {company?.logoUrl ? (
          <img src={company.logoUrl} alt={`${company.name} logo`} />
        ) : (
          <strong>{company?.name || "Company CPanel"}</strong>
        )}
      </div>

      <form className="admin-login-card" onSubmit={handleSubmit}>
        <div className="admin-login-icon" aria-hidden="true">
          <span>{(company?.name || "CP").slice(0, 2).toUpperCase()}</span>
        </div>
        <h1>{company?.name ? `${company.name} CPanel` : "Company CPanel"}</h1>
        <p>{t("adminLogin.subtitle")}</p>

        {message && <div className="message-panel error">{message}</div>}

        <label>
          {t("auth.email")}
          <input
            autoComplete="email"
            name="email"
            onChange={handleChange}
            placeholder={t("auth.email")}
            required
            type="email"
            value={form.email}
          />
        </label>

        <label>
          {t("auth.password")}
          <input
            autoComplete="current-password"
            name="password"
            onChange={handleChange}
            placeholder={t("auth.password")}
            required
            type="password"
            value={form.password}
          />
        </label>

        <button className="admin-login-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? t("common.temporaryContent") : t("adminLogin.signIn")}
        </button>
      </form>
    </section>
  );
}

export default AdminLoginPage;
