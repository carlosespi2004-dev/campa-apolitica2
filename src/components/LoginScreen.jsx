import { useState } from "react";
import anrlogo from "../img/anrlogo.png";

export function LoginScreen({ onLogin, loading }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError(false);
    const { error } = await onLogin(email, password);
    if (error) setLoginError(true);
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <img src={anrlogo} alt="Logo Oficial" className="login-card__logo" />

        <h1 className="login-card__title">BIENVENIDO</h1>
        <p className="login-card__subtitle">Gestión Política · Darío Carmona</p>

        {loginError && (
          <div className="login-card__error">
            Credenciales incorrectas. Intente de nuevo.
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-card__form">
          <div className="login-card__field">
            <label style={{ fontFamily: "var(--f-condensed)", fontWeight: 700, fontSize: 11, color: "var(--text-2)", letterSpacing: "0.07em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              CORREO
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="usuario@campaña.com"
              className="login-card__input"
            />
          </div>

          <div className="login-card__field">
            <label style={{ fontFamily: "var(--f-condensed)", fontWeight: 700, fontSize: 11, color: "var(--text-2)", letterSpacing: "0.07em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              CONTRASEÑA
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="login-card__input"
            />
          </div>

          <button type="submit" disabled={loading} className="login-card__btn">
            {loading ? "VERIFICANDO..." : "ENTRAR AL PANEL"}
          </button>
        </form>
      </div>
    </div>
  );
}
