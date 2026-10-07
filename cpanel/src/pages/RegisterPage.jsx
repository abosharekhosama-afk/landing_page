import React from "react";

function RegisterPage({ message, onNavigate, onRegister, t }) {
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onRegister(form);
  }

  return (
    <section className="auth-kinfill-page">
      <form className="auth-kinfill-card" onSubmit={handleSubmit}>
        <div className="auth-tabs">
          <button onClick={() => onNavigate("login")} type="button">
            {t("auth.login")}
          </button>
          <button className="active" type="button">{t("auth.register")}</button>
        </div>

        <h1>{t("auth.registerTitle")}</h1>
        <p className="auth-copy">{t("auth.registerPageText")}</p>
        {message && <div className="message-panel success">{message}</div>}

        <label>
          {t("auth.name")}
          <input name="name" onChange={handleChange} placeholder={t("auth.name")} required value={form.name} />
        </label>
        <label>
          {t("auth.email")}
          <input name="email" onChange={handleChange} placeholder={t("auth.email")} required type="email" value={form.email} />
        </label>
        <label>
          {t("auth.phone")}
          <input name="phone" onChange={handleChange} placeholder={t("auth.phone")} required type="tel" value={form.phone} />
        </label>
        <label>
          {t("auth.password")}
          <input
            name="password"
            onChange={handleChange}
            placeholder={t("auth.password")}
            required
            type="password"
            value={form.password}
          />
        </label>
        <button className="auth-submit" type="submit">
          {t("auth.register")}
        </button>
      </form>
    </section>
  );
}

export default RegisterPage;
