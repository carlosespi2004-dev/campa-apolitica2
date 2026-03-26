import { useState } from "react";
import { ANRLogo } from "./Logos";

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
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#e2e8f0", padding: 15 }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "40px 30px", textAlign: "center", borderRadius: "30px", background: "white", boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}>
        <ANRLogo />
        <h1 style={{ fontFamily: "Montserrat", fontWeight: "900", color: "#C8102E", fontSize: "28px", marginTop: 15, marginBottom: 5 }}>BIENVENIDO</h1>
        <p style={{ color: "#64748b", marginBottom: 35, fontWeight: "600", fontSize: "13px" }}>Gestión Política Darío Carmona</p>
        {loginError && (
          <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px", borderRadius: "10px", marginBottom: 20, fontSize: "13px", fontWeight: "700", border: "1px solid #fca5a5" }}>
            Credenciales incorrectas. Intente de nuevo.
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>
          <div style={{ textAlign: "left" }}>
            <label style={{ fontWeight: "800", fontSize: "11px", color: "#444" }}>CORREO</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: "15px", borderRadius: "12px", border: "1px solid #eee", width: "100%", marginTop: 5, fontSize: "16px", background: "#f8fafc" }} />
          </div>
          <div style={{ textAlign: "left" }}>
            <label style={{ fontWeight: "800", fontSize: "11px", color: "#444" }}>CONTRASEÑA</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: "15px", borderRadius: "12px", border: "1px solid #eee", width: "100%", marginTop: 5, fontSize: "16px", background: "#f8fafc" }} />
          </div>
          <button type="submit" disabled={loading} style={{ background: "#C8102E", color: "white", fontWeight: "900", padding: "18px", borderRadius: "15px", border: "none", cursor: "pointer", fontSize: "16px" }}>
            {loading ? "VERIFICANDO..." : "ENTRAR AL PANEL"}
          </button>
        </form>
      </div>
    </div>
  );
}