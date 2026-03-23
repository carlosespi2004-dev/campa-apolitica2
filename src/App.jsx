import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logocarmona from "./img/logocarmona.png";
import logoofi from "./img/logoofi.png";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const normalizarCedula = (v) => String(v || "").replace(/[.\-\s]/g, "").trim();

const LISTA_BARRIOS = [
  "Santa Clara", "San José Obrero", "San Juan", "San Antonio", "San Rafael",
  "Las Mercedes", "San Roque", "San Damián", "Santa Rosa", "San Sebastián",
  "San Francisco", "San Isidro", "Sagrado Corazón de Jesús", "San Miguel",
  "San Lorenzo", "San Jorge", "Santo Domingo", "San Pablo",
  "Fray Luis de Bolaños", "Fátima 1", "Santo Tomás", "Área 5", "CONAVI",
  "Centro", "María Auxiliadora", "Caacupe-mí", "Kilómetro 7 Monday",
  "Kilómetro 8 Monday", "Kilómetro 9 Monday", "Kilómetro 10 Monday",
  "Colonia Alfredo Pla", "Península", "Puerto Bertoni", "otros..."
];

function ANRLogo() {
  return (
    <img
      src={logoofi}
      alt="Logo Oficial"
      style={{ width: "80px", height: "80px", borderRadius: "50%", border: "3px solid white", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}
    />
  );
}

function GreenHeart() {
  return (
    <img
      src={logocarmona}
      alt="Logo Carmona"
      style={{ width: "25px", height: "25px", borderRadius: "5px", marginRight: "8px" }}
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
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontWeight: "800", fontSize: "11px", color: "#444" }}>CORREO</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: "15px", borderRadius: "12px", border: "1px solid #eee", width: "100%", marginTop: 5, fontSize: "16px", background: "#f8fafc" }} />
          </div>
          <div style={{ textAlign: 'left' }}>
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

  const [formVotante, setFormVotante] = useState({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", por_parte_de_id: "" });
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

  useEffect(() => { if (session) cargarDatos(); }, [session]);

  async function cargarDatos() {
    setLoading(true);
    try {
      const [v, e] = await Promise.all([
        supabase.from("votantes").select("*").order("created_at", { ascending: false }),
        supabase.from("equipo").select("*").order("created_at", { ascending: false }),
      ]);
      setVotantes(v.data || []);
      setEquipo(e.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  const rendimientoEquipo = useMemo(() => {
    const total = votantes?.length || 0;
    return (equipo || []).map((m) => {
      const cant = (votantes || []).filter((v) => v.por_parte_de_id === m.id).length;
      return { ...m, cantidad: cant, porcentaje: total > 0 ? Math.round((cant / total) * 100) : 0 };
    }).sort((a, b) => b.cantidad - a.cantidad);
  }, [votantes, equipo]);

  const conteoBarrio = useMemo(() => {
    const counts = {};
    (votantes || []).forEach((v) => {
      const b = v.barrio || "Sin barrio";
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
    setLoading(true);
    const resp = equipo.find((m) => m.id === formVotante.por_parte_de_id);
    const payload = { ...formVotante, cedula_limpia: normalizarCedula(formVotante.cedula), por_parte_de_nombre: resp?.nombre || "" };
    const { error } = editIdVotante ? await supabase.from("votantes").update(payload).eq("id", editIdVotante) : await supabase.from("votantes").insert([payload]);
    if (!error) {
      setFormVotante({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", por_parte_de_id: "" });
      setEditIdVotante(null); cargarDatos(); alert("¡Guardado!");
    }
    setLoading(false);
  }

  async function guardarEquipo(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = editIdEquipo ? await supabase.from("equipo").update(formEquipo).eq("id", editIdEquipo) : await supabase.from("equipo").insert([formEquipo]);
    if (!error) {
      setFormEquipo({ nombre: "", telefono: "", rol: "coordinador", zona: "" });
      setEditIdEquipo(null); cargarDatos();
    }
    setLoading(false);
  }

  const exportarExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const crearHoja = (nombreHoja, lista) => {
      const sheet = workbook.addWorksheet(nombreHoja.substring(0, 31));
      sheet.addRow(["HAGAMOS QUE SUCEDA"]); sheet.mergeCells("A1:I1");
      const r1 = sheet.getRow(1); r1.height = 30; r1.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8102E" } };
      r1.getCell(1).font = { color: { argb: "FFFFFFFF" }, size: 18, bold: true };
      r1.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
      sheet.addRow(["Darío Carmona Concejal 2026"]); sheet.mergeCells("A2:I2");
      const r2 = sheet.getRow(2); r2.height = 20; r2.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8102E" } };
      r2.getCell(1).font = { color: { argb: "FFFFFFFF" }, size: 12, bold: true };
      r2.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
      sheet.addRow([]);
      sheet.columns = [
        { header: "Nro", key: "nro", width: 5 }, { header: "Nombre", key: "nom", width: 25 }, { header: "Apellido", key: "ape", width: 25 },
        { header: "Cedula", key: "ci", width: 12 }, { header: "Orden", key: "ord", width: 8 }, { header: "Mesa", key: "mes", width: 8 },
        { header: "Seccional", key: "sec", width: 10 }, { header: "Local", key: "loc", width: 35 }, { header: "Captado por", key: "cap", width: 20 },
      ];
      const h = sheet.getRow(4); h.values = ["Nro", "Nombre", "Apellido", "Cedula", "Orden", "Mesa", "Seccional", "Local", "Captado por"];
      h.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8102E" } };
        c.font = { color: { argb: "FFFFFFFF" }, bold: true };
        c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      });
      lista.forEach((v, i) => {
        const row = sheet.addRow([i + 1, v.nombre, v.apellido, v.cedula, v.orden, v.mesa, v.seccional, v.local_votacion, v.por_parte_de_nombre]);
        const color = i % 2 !== 0 ? "FFFEE2E2" : "FFFFFFFF";
        row.eachCell((c) => {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
          c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
          c.alignment = { vertical: "middle", horizontal: "left" };
        });
      });
    };
    crearHoja("LISTA GENERAL", votantes);
    equipo.forEach((miembro) => {
      const datosMiembro = votantes.filter((v) => v.por_parte_de_id === miembro.id);
      if (datosMiembro.length > 0) crearHoja(miembro.nombre, datosMiembro);
    });
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "Campaña_Dario_Carmona.xlsx");
  };

  if (!session) return <LoginScreen onLogin={async (e, p) => await supabase.auth.signInWithPassword({ email: e, password: p })} loading={loading} />;

  const tabStyle = (id) => ({
    flex: 1, padding: "18px 5px", border: "none", background: activeTab === id ? "#C8102E" : "#f1f5f9",
    color: activeTab === id ? "white" : "#64748b", fontWeight: "900", fontSize: isMobile ? "10px" : "13px",
    textTransform: "uppercase", cursor: "pointer", borderRadius: "15px 15px 0 0", transition: "0.3s", margin: "0 2px",
  });

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      <header style={{ background: "white", padding: isMobile ? "20px 10px" : "40px 20px", textAlign: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", position: "relative" }}>
        <button onClick={() => supabase.auth.signOut()} style={{ background: "#f1f5f9", color: "#64748b", padding: "8px 15px", borderRadius: "10px", border: "none", fontWeight: "800", cursor: "pointer", position: "absolute", right: 10, top: 10, fontSize: "10px" }}>SALIR</button>
        
        {/* FILA DE LISTA 2 - LOGO - OPCION 5 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? "15px" : "40px", marginBottom: "10px" }}>
          <span style={{ color: "#C8102E", fontSize: isMobile ? "24px" : "48px", fontWeight: "900", fontFamily: "Impact, fantasy" }}>LISTA 2</span>
          <ANRLogo />
          <span style={{ color: "#C8102E", fontSize: isMobile ? "24px" : "48px", fontWeight: "900", fontFamily: "Impact, fantasy" }}>OPCIÓN 5</span>
        </div>

        <h1 style={{ fontFamily: "Akaya Kanadaka", fontWeight: "900", color: "#C8102E", fontSize: isMobile ? "28px" : "52px", margin: 0, textTransform: "uppercase", letterSpacing: "-1.5px" }}>HAGAMOS QUE SUCEDA</h1>
        
        <div style={{ background: "#C8102E", padding: "10px 30px", borderRadius: "50px", display: "inline-flex", alignItems: "center", gap: 5, marginTop: 15, boxShadow: "0 4px 10px rgba(200,16,46,0.3)" }}>
          <GreenHeart />
          <h2 style={{ fontFamily: "Montserrat", fontWeight: "800", color: "white", fontSize: isMobile ? "12px" : "16px", margin: 0, textTransform: "uppercase" }}>Darío Carmona Concejal 2026</h2>
        </div>
      </header>

      <nav style={{ display: "flex", background: "#f1f5f9", padding: "10px 10px 0 10px", sticky: "top", top: 0, zIndex: 100 }}>
        <button onClick={() => setActiveTab("inicio")} style={tabStyle("inicio")}>Inicio</button>
        <button onClick={() => setActiveTab("votantes")} style={tabStyle("votantes")}>Votantes</button>
        <button onClick={() => setActiveTab("equipo")} style={tabStyle("equipo")}>Equipo</button>
        <button onClick={() => setActiveTab("reportes")} style={tabStyle("reportes")}>Reportes</button>
      </nav>

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "30px 15px", paddingBottom: 120 }}>
        {activeTab === "inicio" && (
          <div style={{ display: "grid", gap: 25 }}>
            <div className="card" style={{ background: "white", padding: 25, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
              <h4 style={{ color: "#C8102E", fontWeight: "900", marginBottom: 20, fontSize: "14px", textTransform: "uppercase" }}>🔍 BUSCADOR DE PADRÓN</h4>
              <div style={{ display: "flex", gap: 10 }}>
                <input type="text" value={cedulaRapida} onChange={(e) => setCedulaRapida(e.target.value)} placeholder="Cédula..." style={{ flex: 1, padding: "15px", borderRadius: "12px", border: "2px solid #f1f5f9", fontSize: "16px" }} />
                <button onClick={buscarEnPadron} style={{ padding: "0 25px", background: "#C8102E", color: "white", border: "none", borderRadius: "12px", fontWeight: "900" }}>BUSCAR</button>
              </div>
              {resultadoPadron && (
                <div style={{ marginTop: 20, padding: 20, background: "#fef2f2", borderRadius: "20px", border: "2px dashed #C8102E", textAlign: "center" }}>
                  <h3 style={{ fontSize: "18px", color: "#C8102E", fontWeight: "900" }}>{resultadoPadron?.nombre} {resultadoPadron?.apellido}</h3>
                  <p style={{ fontWeight: "700", color: "#444", fontSize: "13px" }}>Mesa: {resultadoPadron?.mesa} | Orden: {resultadoPadron?.orden} | Sec: {resultadoPadron?.seccional}</p>
                  <button onClick={() => { setFormVotante({ ...formVotante, ...resultadoPadron }); setResultadoPadron(null); }} style={{ background: "#16a34a", color: "white", padding: "12px 25px", borderRadius: "10px", fontWeight: "900", border: "none" }}>ASIGNAR AL FORMULARIO</button>
                </div>
              )}
            </div>
            <div className="card" style={{ background: "white", padding: 30, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
              <h3 style={{ color: "#C8102E", fontWeight: "900", textAlign: "center", marginBottom: 25, fontSize: "20px", textTransform: "uppercase" }}>REGISTRAR VOTANTE</h3>
              <form onSubmit={guardarVotante} style={{ display: "grid", gap: 15 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                  <div><label style={{ fontWeight: "800", fontSize: "11px", color: "#C8102E" }}>NOMBRE</label><input type="text" value={formVotante.nombre} onChange={(e) => setFormVotante({ ...formVotante, nombre: e.target.value })} required style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px" }} /></div>
                  <div><label style={{ fontWeight: "800", fontSize: "11px", color: "#C8102E" }}>APELLIDO</label><input type="text" value={formVotante.apellido} onChange={(e) => setFormVotante({ ...formVotante, apellido: e.target.value })} required style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px" }} /></div>
                </div>
                <div><label style={{ fontWeight: "800", fontSize: "11px", color: "#C8102E" }}>CÉDULA</label><input type="text" value={formVotante.cedula} onChange={(e) => setFormVotante({ ...formVotante, cedula: e.target.value })} required style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px" }} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                  <div><label style={{ fontWeight: "800", fontSize: "11px", color: "#C8102E" }}>MESA</label><input type="text" value={formVotante.mesa} onChange={(e) => setFormVotante({ ...formVotante, mesa: e.target.value })} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px" }} /></div>
                  <div><label style={{ fontWeight: "800", fontSize: "11px", color: "#C8102E" }}>ORDEN</label><input type="text" value={formVotante.orden} onChange={(e) => setFormVotante({ ...formVotante, orden: e.target.value })} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px" }} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                  <div><label style={{ fontWeight: "800", fontSize: "11px", color: "#C8102E" }}>SECCIONAL</label><input type="text" value={formVotante.seccional} onChange={(e) => setFormVotante({ ...formVotante, seccional: e.target.value })} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px" }} /></div>
                  <div><label style={{ fontWeight: "800", fontSize: "11px", color: "#C8102E" }}>LOCAL</label><input type="text" value={formVotante.local_votacion} onChange={(e) => setFormVotante({ ...formVotante, local_votacion: e.target.value })} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px" }} /></div>
                </div>
                <div><label style={{ fontWeight: "800", fontSize: "11px", color: "#C8102E" }}>BARRIO</label><select value={formVotante.barrio} onChange={(e) => setFormVotante({ ...formVotante, barrio: e.target.value })} required style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px", background: "white" }}><option value="">Elegir barrio...</option>{LISTA_BARRIOS.map((b) => <option key={b} value={b}>{b}</option>)}</select></div>
                <div><label style={{ fontWeight: "800", fontSize: "11px", color: "#C8102E" }}>RESPONSABLE</label><select value={formVotante.por_parte_de_id} onChange={(e) => setFormVotante({ ...formVotante, por_parte_de_id: e.target.value })} required style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px", background: "white" }}>{equipo.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
                <button type="submit" style={{ background: "#C8102E", color: "white", fontWeight: "900", padding: "20px", borderRadius: "15px", border: "none", fontSize: "18px", marginTop: 10 }}>{editIdVotante ? "ACTUALIZAR DATOS" : "GUARDAR REGISTRO"}</button>
              </form>
            </div>
          </div>
        )}
        {activeTab === "votantes" && (
          <div className="card" style={{ background: "white", padding: isMobile ? 15 : 30, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
            <h3 style={{ color: "#C8102E", fontWeight: "900", marginBottom: 20, fontSize: "18px", textTransform: "uppercase" }}>Listado General</h3>
            <input type="text" placeholder="🔍 Buscar por CI..." value={busquedaLista} onChange={(e) => setBusquedaLista(e.target.value)} style={{ width: "100%", padding: "15px", borderRadius: "15px", border: "2px solid #f1f5f9", marginBottom: 25, fontSize: "16px" }} />
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                  <tr style={{ fontSize: "11px", color: "#64748b" }}><th style={{ padding: 15, textAlign: "left" }}>NOMBRE</th><th style={{ padding: 15, textAlign: "left" }}>CÉDULA</th><th style={{ padding: 15, textAlign: "center" }}>ACCIONES</th></tr>
                </thead>
                <tbody>
                  {(votantes || []).filter((v) => (v?.nombre + v?.apellido + v?.cedula).toLowerCase().includes(busquedaLista.toLowerCase())).map((v) => (
                    <tr key={v?.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: 15, fontWeight: "700" }}>{v?.nombre} {v?.apellido}</td>
                      <td style={{ padding: 15 }}>{v?.cedula}</td>
                      <td style={{ padding: 15, textAlign: "center" }}>
                        <button onClick={() => { setFormVotante(v); setEditIdVotante(v.id); setActiveTab("inicio"); window.scrollTo(0, 0); }} style={{ padding: "8px 15px", background: "#f1f5f9", border: "none", borderRadius: "10px", fontWeight: "800", color: "#64748b", fontSize: "10px" }}>EDITAR</button>
                        <button onClick={async () => { if (confirm("¿Borrar?")) { await supabase.from("votantes").delete().eq("id", v.id); cargarDatos(); } }} style={{ padding: "8px 15px", background: "#dc2626", color: "white", border: "none", borderRadius: "10px", fontWeight: "800", fontSize: "10px", marginLeft: 5 }}>BORRAR</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === "equipo" && (
          <div style={{ display: "grid", gap: 30 }}>
            <div className="card" style={{ background: "white", padding: 25, borderRadius: "25px" }}>
              <h3 style={{ color: "#C8102E", fontWeight: "900", marginBottom: 25, textAlign: "center", textTransform: "uppercase" }}>Gestión de Equipo</h3>
              <form onSubmit={guardarEquipo} style={{ display: "grid", gap: 15 }}>
                <input type="text" placeholder="Nombre completo" value={formEquipo.nombre} onChange={(e) => setFormEquipo({ ...formEquipo, nombre: e.target.value })} required style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0" }} />
                <input type="text" placeholder="Teléfono" value={formEquipo.telefono} onChange={(e) => setFormEquipo({ ...formEquipo, telefono: e.target.value })} style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0" }} />
                <button type="submit" style={{ background: "#C8102E", color: "white", fontWeight: "900", padding: "16px", borderRadius: "12px", border: "none" }}>GUARDAR MIEMBRO</button>
              </form>
            </div>
            <div className="card" style={{ background: "white", padding: 25, borderRadius: "25px" }}>
              {equipo.map((m) => (
                <div key={m?.id} style={{ padding: 15, borderBottom: "1px solid #f1f5f9", display: 'flex', justifyContent: 'space-between' }}>
                  <span>{m?.nombre}</span>
                  <button onClick={() => { setFormEquipo(m); setEditIdEquipo(m.id); window.scrollTo(0,0); }} style={{ padding: "6px 12px", background: "#f1f5f9", border: "none", borderRadius: "8px", fontWeight: "800", fontSize: "10px" }}>EDITAR</button>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === "reportes" && (
          <div style={{ display: "grid", gap: 30 }}>
            <div className="card" style={{ background: "white", padding: 30, borderRadius: "25px" }}>
              <h3 style={{ color: "#C8102E", fontWeight: "900", marginBottom: 25, textTransform: "uppercase" }}>Rendimiento</h3>
              {(rendimientoEquipo || []).map((m) => (
                <div key={m?.id} style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "900", color: "#475569", marginBottom: 8 }}><span>{m?.nombre}</span><span>{m?.cantidad} ({m?.porcentaje}%)</span></div>
                  <div style={{ width: "100%", height: "12px", background: "#f1f5f9", borderRadius: "10px", overflow: "hidden" }}><div style={{ width: `${m?.porcentaje}%`, height: "100%", background: "#C8102E" }}></div></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <button onClick={exportarExcel} style={{ position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)", background: "#16a34a", color: "white", padding: "18px 40px", borderRadius: "50px", fontWeight: "900", border: "none", boxShadow: "0 10px 30px rgba(22,163,74,0.3)", cursor: "pointer", zIndex: 1000, display: "flex", gap: 10, alignItems: "center" }}><span>📥</span> EXPORTAR EXCEL</button>
    </div>
  );
}