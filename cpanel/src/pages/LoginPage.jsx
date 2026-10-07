import React from "react";

function LoginPage({ loginMessage, onLogin, onNavigate, t }) {
  const [form, setForm] = React.useState({
    email: "",
    password: "",
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onLogin(form);
  }

  return (
    <section className="auth-kinfill-page">
      <form className="auth-kinfill-card" onSubmit={handleSubmit}>
        <div className="auth-tabs">
          <button className="active" type="button">{t("auth.login")}</button>
          <button onClick={() => onNavigate("register")} type="button">
            {t("auth.register")}
          </button>
        </div>

        <h1>{t("auth.loginTitle")}</h1>
        <p className="auth-copy">{t("auth.loginPageText")}</p>
        {loginMessage && <div className="message-panel error">{loginMessage}</div>}

        <label>
          {t("auth.email")}
          <input
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
            name="password"
            onChange={handleChange}
            placeholder={t("auth.password")}
            required
            type="password"
            value={form.password}
          />
        </label>
        <button className="forgot-link" type="button">
          {t("auth.forgotPassword")}
        </button>
        <button className="auth-submit" type="submit">
          {t("auth.login")}
        </button>
      </form>
    </section>
  );
}

export default LoginPage;
