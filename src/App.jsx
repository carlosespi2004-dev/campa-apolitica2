import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logocarmona from "./img/logocarmona.png";
import anrlogo from "./img/anrlogo.png";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Normalización ultra-segura para evitar errores con valores nulos o no-string
const normalizarCedula = (v) => {
  if (!v) return "";
  return String(v).replace(/[.\-\s]/g, "").trim();
};

const LISTA_BARRIOS = [
  "Santa Clara", "San José Obrero", "San Juan", "San Antonio", "San Rafael",
  "Las Mercedes", "San Roque", "San Damián", "Santa Rosa", "San Sebastián",
  "San Francisco", "San Isidro", "Sagrado Corazón de Jesús", "San Miguel",
  "San Lorenzo", "San Jorge", "Santo Domingo", "San Pablo",
  "Fray Luis de Bolaños", "Fátima 1", "Santo Tomás", "Área 5", "CONAVI",
  "Centro", "María Auxiliadora", "Caacupe-mí", "Kilómetro 7 Monday", "Tres Fronteras", "San Miguel vila baja",
  "Kilómetro 8 Monday", "Kilómetro 9 Monday", "Kilómetro 10 Monday",
  "Colonia Alfredo Pla", "Península", "Puerto Bertoni", "otros..."
];

function ANRLogo() {
  return (
    <img
      src={anrlogo}
      alt="Logo Oficial"
      style={{ width: "80px", borderRadius: "50%" }}
    />
  );
}

function GreenHeart() {
  return (
    <img
      src={logocarmona}
      alt="Logo Carmona"
      style={{ width: "50px", height: "50px", borderRadius: "10px" }}
    />
  );
}

function LoginScreen({ onLogin, loading }) {
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

export default function App() {
  const [session, setSession] = useState(null);
  const [votantes, setVotantes] = useState([]);
  const [equipo, setEquipo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState("inicio");

  const userRole = session?.user?.user_metadata?.role || "coordinador";
  const isAdmin = userRole === "administrador";
  const userId = session?.user?.id;

  const [formVotante, setFormVotante] = useState({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", por_parte_de_id: "", fecha_nacimiento: "", telefono: "" });
  const [formEquipo, setFormEquipo] = useState({ nombre: "", telefono: "", rol: "coordinador", zona: "" });
  const [editIdVotante, setEditIdVotante] = useState(null);
  const [editIdEquipo, setEditIdEquipo] = useState(null);
  const [busquedaLista, setBusquedaLista] = useState("");
  const [cedulaRapida, setCedulaRapida] = useState("");
  const [resultadoPadron, setResultadoPadron] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => {
      window.removeEventListener("resize", handleResize);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) cargarDatos();
  }, [session]);

  async function cargarDatos() {
    setLoading(true);
    try {
      let queryV = supabase.from("votantes").select("*");
      let queryE = supabase.from("equipo").select("*");
      if (!isAdmin) {
        queryV = queryV.eq("user_id", userId);
        queryE = queryE.eq("user_id", userId);
      }
      const [v, e] = await Promise.all([
        queryV.order("created_at", { ascending: false }),
        queryE.order("created_at", { ascending: false }),
      ]);
      setVotantes(v.data || []);
      setEquipo(e.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const rendimientoEquipo = useMemo(() => {
    const vts = votantes || [];
    const eqp = equipo || [];
    const total = vts.length;
    return eqp.map((m) => {
        const cant = vts.filter((v) => v.por_parte_de_id === m.id).length;
        return { ...m, cantidad: cant, porcentaje: total > 0 ? Math.round((cant / total) * 100) : 0 };
      }).sort((a, b) => b.cantidad - a.cantidad);
  }, [votantes, equipo]);

  const conteoBarrio = useMemo(() => {
    const counts = {};
    (votantes || []).forEach((v) => {
      const b = v?.barrio || "Sin barrio";
      counts[b] = (counts[b] || 0) + 1;
    });
    return Object.entries(counts).map(([name, total]) => ({ name, total }));
  }, [votantes]);

  async function buscarEnPadron() {
    const limpia = normalizarCedula(cedulaRapida);
    if (!limpia) return;
    setLoading(true);
    const { data } = await supabase.from("padron_importado").select("*").or(`cedula_limpia.eq.${limpia},cedula.eq.${cedulaRapida}`).limit(1).maybeSingle();
    if (data) setResultadoPadron(data);
    else alert("Cédula no encontrada.");
    setLoading(false);
  }

  async function guardarVotante(e) {
    e.preventDefault();
    if (!formVotante.por_parte_de_id) return alert("Selecciona un responsable.");
    const ciActual = normalizarCedula(formVotante.cedula);
    const existeParaMi = (votantes || []).some(v => normalizarCedula(v.cedula) === ciActual && v.id !== editIdVotante && v.user_id === userId);
    if (existeParaMi) return alert("Ya tienes a este votante registrado.");
    setLoading(true);
    const resp = (equipo || []).find((m) => m.id === formVotante.por_parte_de_id);
    const payload = {
      nombre: formVotante.nombre || "",
      apellido: formVotante.apellido || "",
      cedula: formVotante.cedula || "",
      cedula_limpia: ciActual,
      orden: formVotante.orden || "",
      mesa: formVotante.mesa || "",
      local_votacion: formVotante.local_votacion || "",
      seccional: formVotante.seccional || "",
      barrio: formVotante.barrio || "",
      por_parte_de_id: formVotante.por_parte_de_id,
      por_parte_de_nombre: resp?.nombre || "",
      fecha_nacimiento: formVotante.fecha_nacimiento || null,
      telefono: formVotante.telefono || "",
      user_id: userId
    };
    const { error } = editIdVotante ? await supabase.from("votantes").update(payload).eq("id", editIdVotante) : await supabase.from("votantes").insert([payload]);
    if (!error) {
      setFormVotante({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", por_parte_de_id: "", fecha_nacimiento: "", telefono: "" });
      setEditIdVotante(null);
      cargarDatos();
      alert("¡Registro exitoso!");
    } else alert("Error: " + error.message);
    setLoading(false);
  }

  async function guardarEquipo(e) {
    e.preventDefault();
    setLoading(true);
    const payload = { ...formEquipo, user_id: userId };
    const { error } = editIdEquipo ? await supabase.from("equipo").update(payload).eq("id", editIdEquipo) : await supabase.from("equipo").insert([payload]);
    if (!error) {
      setFormEquipo({ nombre: "", telefono: "", rol: "coordinador", zona: "" });
      setEditIdEquipo(null);
      cargarDatos();
    } else alert("Error: " + error.message);
    setLoading(false);
  }

  const exportarExcel = async () => {
    if (!isAdmin) return;
    const workbook = new ExcelJS.Workbook();
    const crearHoja = (nombreHoja, lista) => {
      const sheet = workbook.addWorksheet(nombreHoja.substring(0, 31));
      sheet.addRow(["HAGAMOS QUE SUCEDA "]);
      sheet.mergeCells("A1:K1");
      const r1 = sheet.getRow(1);
      r1.height = 30;
      r1.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8102E" } };
      r1.getCell(1).font = { color: { argb: "FFFFFFFF" }, size: 18, bold: true };
      r1.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
      sheet.addRow(["Darío Carmona Concejal 2026"]);
      sheet.mergeCells("A2:K2");
      const r2 = sheet.getRow(2);
      r2.height = 20;
      r2.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8102E" } };
      r2.getCell(1).font = { color: { argb: "FFFFFFFF" }, size: 12, bold: true };
      r2.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
      sheet.addRow([]);
      sheet.columns = [
        { header: "Nro", key: "nro", width: 5 },
        { header: "Nombre", key: "nom", width: 25 },
        { header: "Apellido", key: "ape", width: 25 },
        { header: "Cedula", key: "ci", width: 12 },
        { header: "Fecha Nacimiento", key: "fnac", width: 20 },
        { header: "Teléfono", key: "tel", width: 15 },
        { header: "Orden", key: "ord", width: 8 },
        { header: "Mesa", key: "mes", width: 8 },
        { header: "Seccional", key: "sec", width: 10 },
        { header: "Local", key: "loc", width: 35 },
        { header: "Captado por", key: "cap", width: 20 },
      ];
      const headerRow = sheet.getRow(4);
      headerRow.values = ["Nro", "Nombre", "Apellido", "Cedula", "Fecha Nacimiento", "Teléfono", "Orden", "Mesa", "Seccional", "Local", "Captado por"];
      headerRow.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8102E" } };
        c.font = { color: { argb: "FFFFFFFF" }, bold: true };
        c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      });
      lista.forEach((v, i) => {
        const row = sheet.addRow([i + 1, v.nombre, v.apellido, v.cedula, v.fecha_nacimiento, v.telefono, v.orden, v.mesa, v.seccional, v.local_votacion, v.por_parte_de_nombre]);
        const color = i % 2 !== 0 ? "FFFEE2E2" : "FFFFFFFF";
        row.eachCell((c) => {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
          c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
          c.alignment = { vertical: "middle", horizontal: "left" };
        });
      });
    };
    const mapaUnicos = new Map();
    (votantes || []).forEach(v => {
      const ci = normalizarCedula(v?.cedula);
      if (ci && !mapaUnicos.has(ci)) mapaUnicos.set(ci, v);
    });
    crearHoja("LISTA GENERAL", Array.from(mapaUnicos.values()));
    (equipo || []).forEach((m) => {
      const datosMiembro = (votantes || []).filter((v) => v.por_parte_de_id === m.id);
      if (datosMiembro.length > 0) crearHoja(m.nombre || "Miembro", datosMiembro);
    });
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "Campaña_Dario_Carmona.xlsx");
  };

  const votantesFiltrados = useMemo(() => {
    const term = (busquedaLista || "").toLowerCase();
    const filtrados = (votantes || []).filter((v) => {
        const n = String(v?.nombre || "").toLowerCase();
        const a = String(v?.apellido || "").toLowerCase();
        const c = String(v?.cedula || "").toLowerCase();
        return n.includes(term) || a.includes(term) || c.includes(term);
    });
    if (isAdmin) {
      const unicos = new Map();
      filtrados.forEach(v => {
        const ci = normalizarCedula(v?.cedula);
        if (ci && !unicos.has(ci)) unicos.set(ci, v);
      });
      return Array.from(unicos.values());
    }
    return filtrados;
  }, [votantes, busquedaLista, isAdmin]);

  if (!session) return <LoginScreen onLogin={async (e, p) => await supabase.auth.signInWithPassword({ email: e, password: p })} loading={loading} />;

  const tabStyle = (id) => ({
    flex: 1, padding: "18px 5px", border: "none",
    background: activeTab === id ? "#C8102E" : "#f1f5f9",
    color: activeTab === id ? "white" : "#64748b",
    fontWeight: "900", fontSize: isMobile ? "10px" : "13px",
    textTransform: "uppercase", cursor: "pointer", borderRadius: "15px 15px 0 0",
    transition: "0.3s", margin: "0 2px",
  });

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      <header style={{ background: "white", padding: isMobile ? "20px 10px" : "40px 20px", textAlign: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", position: "relative" }}>
        <button onClick={() => supabase.auth.signOut()} style={{ background: "#f1f5f9", color: "#64748b", padding: "8px 15px", borderRadius: "10px", border: "none", fontWeight: "800", cursor: "pointer", position: "absolute", right: 10, top: 10, fontSize: "10px" }}>SALIR</button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? "15px" : "40px", marginBottom: "10px" }}>
          <span style={{ color: "#C8102E", fontSize: isMobile ? "24px" : "48px", fontWeight: "900", fontFamily: "Domine" }}>LISTA 2</span>
          <ANRLogo />
          <span style={{ color: "#C8102E", fontSize: isMobile ? "24px" : "48px", fontWeight: "900", fontFamily: "Domine" }}>OPCIÓN 5</span>
        </div>
        <h1 style={{ fontFamily: "Kumar One", fontWeight: "900", color: "#C8102E", fontSize: isMobile ? "28px" : "52px", margin: 0, textTransform: "uppercase", letterSpacing: "-1.5px" }}>HAGAMOS QUE SUCEDA</h1>
        <div style={{ background: "#C8102E", padding: "10px 30px", borderRadius: "50px", display: "inline-flex", alignItems: "center", gap: 5, marginTop: 15, boxShadow: "0 4px 10px rgba(200,16,46,0.3)" }}>
          <GreenHeart />
          <h2 style={{ fontFamily: "Montserrat", fontWeight: "800", color: "white", fontSize: isMobile ? "12px" : "16px", margin: 0, textTransform: "uppercase" }}>Darío Carmona Concejal 2026</h2>
        </div>
      </header>

      <nav style={{ display: "flex", background: "#f1f5f9", padding: "10px 10px 0 10px", sticky: "top", top: 0, zIndex: 100 }}>
        {["inicio", "votantes", "equipo", "reportes"].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={tabStyle(t)}>{t}</button>
        ))}
      </nav>

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "30px 15px", paddingBottom: 120 }}>
        {activeTab === "inicio" && (
          <div style={{ display: "grid", gap: 25 }}>
            <div className="card" style={{ background: "white", padding: isMobile ? 20 : 35, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
              <h4 style={{ color: "#C8102E", fontWeight: "900", marginBottom: 20, fontSize: "14px", textTransform: "uppercase" }}>🔍 BUSCADOR DE PADRÓN</h4>
              <div style={{ display: "flex", gap: 10 }}>
                <input type="text" value={cedulaRapida} onChange={(e) => setCedulaRapida(e.target.value)} placeholder="Cédula..." style={{ flex: 1, padding: "15px", borderRadius: "12px", border: "2px solid #f1f5f9", fontSize: "16px" }} />
                <button onClick={buscarEnPadron} style={{ padding: "0 25px", background: "#C8102E", color: "white", border: "none", borderRadius: "12px", fontWeight: "900" }}>BUSCAR</button>
              </div>
              {resultadoPadron && (
                <div style={{ marginTop: 20, padding: 20, background: "#fef2f2", borderRadius: "20px", border: "2px dashed #C8102E", textAlign: "center" }}>
                  <h3 style={{ fontSize: "18px", color: "#C8102E", fontWeight: "900" }}>{resultadoPadron?.nombre} {resultadoPadron?.apellido}</h3>
                  <button onClick={() => { setFormVotante({ ...formVotante, nombre: resultadoPadron.nombre, apellido: resultadoPadron.apellido, cedula: resultadoPadron.cedula, orden: resultadoPadron.orden, mesa: resultadoPadron.mesa, seccional: resultadoPadron.seccional, local_votacion: resultadoPadron.local_votacion }); setResultadoPadron(null); }} style={{ background: "#16a34a", color: "white", padding: "12px 25px", borderRadius: "10px", fontWeight: "900", border: "none" }}>ASIGNAR AL FORMULARIO</button>
                </div>
              )}
            </div>
            <div className="card" style={{ background: "white", padding: isMobile ? 25 : 40, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
              <h3 style={{ color: "#C8102E", fontWeight: "900", textAlign: "center", marginBottom: 25, fontSize: "20px", textTransform: "uppercase" }}>REGISTRAR VOTANTE</h3>
              <form onSubmit={guardarVotante} style={{ display: "grid", gap: 15 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                  <input type="text" placeholder="Nombre" value={formVotante.nombre} onChange={(e) => setFormVotante({ ...formVotante, nombre: e.target.value })} required style={{ padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                  <input type="text" placeholder="Apellido" value={formVotante.apellido} onChange={(e) => setFormVotante({ ...formVotante, apellido: e.target.value })} required style={{ padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                </div>
                <input type="text" placeholder="Cédula" value={formVotante.cedula} onChange={(e) => setFormVotante({ ...formVotante, cedula: e.target.value })} required style={{ padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                  <input type="date" value={formVotante.fecha_nacimiento} onChange={(e) => setFormVotante({ ...formVotante, fecha_nacimiento: e.target.value })} style={{ padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                  <input type="tel" placeholder="Teléfono" value={formVotante.telefono} onChange={(e) => setFormVotante({ ...formVotante, telefono: e.target.value })} style={{ padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                </div>
                <select value={formVotante.barrio} onChange={(e) => setFormVotante({ ...formVotante, barrio: e.target.value })} required style={{ padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <option value="">Elegir barrio...</option>{LISTA_BARRIOS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select value={formVotante.por_parte_de_id} onChange={(e) => setFormVotante({ ...formVotante, por_parte_de_id: e.target.value })} required style={{ padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <option value="">¿Quién lo captó?</option>{(equipo || []).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
                <button type="submit" style={{ background: "#C8102E", color: "white", fontWeight: "900", padding: "20px", borderRadius: "15px", border: "none" }}>{editIdVotante ? "ACTUALIZAR" : "GUARDAR"}</button>
              </form>
            </div>
          </div>
        )}

        {activeTab === "votantes" && (
          <div className="card" style={{ background: "white", padding: isMobile ? 15 : 30, borderRadius: "25px" }}>
            <input type="text" placeholder="🔍 Buscar..." value={busquedaLista} onChange={(e) => setBusquedaLista(e.target.value)} style={{ width: "100%", padding: "15px", borderRadius: "15px", border: "2px solid #f1f5f9", marginBottom: 25 }} />
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ fontSize: "11px", color: "#64748b" }}><th style={{ textAlign: "left", padding: 10 }}>NOMBRE</th><th style={{ textAlign: "left", padding: 10 }}>CÉDULA</th><th style={{ textAlign: "center", padding: 10 }}>ACCIONES</th></tr></thead>
                <tbody>
                  {votantesFiltrados.map((v) => (
                    <tr key={v?.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: 10 }}>{v?.nombre} {v?.apellido}</td>
                      <td style={{ padding: 10 }}>{v?.cedula}</td>
                      <td style={{ padding: 10, textAlign: "center" }}>
                        <button onClick={() => { setFormVotante(v); setEditIdVotante(v.id); setActiveTab("inicio"); }} style={{ border: "none", background: "#f1f5f9", padding: "5px 10px", borderRadius: 5 }}>EDITAR</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "equipo" && (
           <div className="card" style={{ background: "white", padding: 25, borderRadius: "25px" }}>
             <form onSubmit={guardarEquipo} style={{ display: "grid", gap: 15 }}>
               <input type="text" placeholder="Nombre" value={formEquipo.nombre} onChange={(e) => setFormEquipo({ ...formEquipo, nombre: e.target.value })} required style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0" }} />
               <button type="submit" style={{ background: "#C8102E", color: "white", fontWeight: "900", padding: 16, borderRadius: 12, border: "none" }}>GUARDAR MIEMBRO</button>
             </form>
             <table style={{ width: "100%", marginTop: 20 }}>
               <tbody>
                 {(equipo || []).map(m => <tr key={m.id} style={{ borderBottom: "1px solid #eee" }}><td style={{ padding: 10 }}>{m.nombre}</td></tr>)}
               </tbody>
             </table>
           </div>
        )}

        {activeTab === "reportes" && (
          <div style={{ display: "grid", gap: 30 }}>
            <div className="card" style={{ background: "white", padding: 30, borderRadius: "25px" }}>
              <h3 style={{ color: "#C8102E", fontWeight: "900" }}>Rendimiento</h3>
              {rendimientoEquipo.map(m => (
                <div key={m.id} style={{ marginBottom: 15 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}><span>{m.nombre}</span><span>{m.cantidad}</span></div>
                  <div style={{ width: "100%", height: 8, background: "#f1f5f9", borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ width: `${m.porcentaje}%`, height: "100%", background: "#C8102E" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {isAdmin && (
        <button onClick={exportarExcel} style={{ position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)", background: "#16a34a", color: "white", padding: "18px 40px", borderRadius: "50px", fontWeight: "900", border: "none", zIndex: 1000 }}>📥 EXPORTAR EXCEL</button>
      )}
    </div>
  );
}