import { useEffect, useMemo, useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { LogOut, UserCircle, Users, CheckCircle2 } from "lucide-react";
import { supabase, supabaseAuth } from "./lib/supabase";
import { normalizarCedula, LISTA_BARRIOS } from "./utils/helpers";
import { ANRLogo, GreenHeart } from "./components/Logos";
import { LoginScreen } from "./components/LoginScreen";
import logocarmona from "./img/logocarmona.png";
import anrlogo from "./img/anrlogo.png";

// ==========================================
// SVGs Y COMPONENTES DE LA RÉPLICA VISUAL
// ==========================================

const BridgeCityBackground = () => (
  <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "280px", overflow: "hidden", zIndex: 1, pointerEvents: "none" }}>
    {/* Silueta Ciudad */}
    <svg style={{ position: "absolute", bottom: "40px", left: 0, width: "100%", height: "140px", opacity: 0.8 }} viewBox="0 0 1440 140" preserveAspectRatio="none">
      <path fill="#94a3b8" d="M150,140 L150,50 L170,50 L170,40 L190,40 L190,60 L210,60 L210,140 Z M350,140 L350,30 L380,30 L380,140 Z M850,140 L850,20 L890,20 L890,140 Z M1150,140 L1150,40 L1170,40 L1170,10 L1190,10 L1190,140 Z M1250,140 Q1300,40 1350,140 Z"></path>
    </svg>
    {/* Silueta Puente */}
    <svg style={{ position: "absolute", bottom: "40px", left: 0, width: "100%", height: "150px" }} viewBox="0 0 1440 150" preserveAspectRatio="none">
      <path fill="none" stroke="#64748b" strokeWidth="3" d="M0,90 C320,150 420,30 720,70 C1020,110 1220,40 1440,80" opacity="0.6"></path>
      <path fill="none" stroke="#94a3b8" strokeWidth="1.5" d="M720,70 L680,90 M720,70 L760,90 M720,70 L640,90 M720,70 L800,90" opacity="0.5"></path>
    </svg>
    {/* Brillo Sol Horizon */}
    <div style={{ position: "absolute", bottom: "50px", left: "50%", transform: "translateX(-50%)", width: "250px", height: "150px", background: "radial-gradient(ellipse at bottom, rgba(254,240,138,0.8) 0%, rgba(255,255,255,0) 70%)" }} />
    {/* Ondas Tricolores Inferiores */}
    <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "80px" }} viewBox="0 0 1440 80" preserveAspectRatio="none">
      <path fill="#991b1b" d="M0,20 C480,90 720,-30 1440,40 L1440,80 L0,80 Z"></path>
      <path fill="#C8102E" d="M0,35 C480,105 720,-10 1440,55 L1440,80 L0,80 Z"></path>
      <path fill="#ffffff" opacity="0.9" d="M0,55 C480,120 720,10 1440,68 L1440,80 L0,80 Z"></path>
      <path fill="#1e3a8a" d="M0,65 C480,130 720,20 1440,73 L1440,80 L0,80 Z"></path>
    </svg>
  </div>
);

const AccentLeft = () => (
  <svg width="24" height="30" viewBox="0 0 24 30" style={{ position: "absolute", left: "-25px", top: "50%", transform: "translateY(-50%)", opacity: 0.8 }}>
    <path d="M20 2 L8 10 M22 15 L6 15 M20 28 L8 20" stroke="#C8102E" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const AccentRight = () => (
  <svg width="24" height="30" viewBox="0 0 24 30" style={{ position: "absolute", right: "-25px", top: "50%", transform: "translateY(-50%)", opacity: 0.8 }}>
    <path d="M4 2 L16 10 M2 15 L18 15 M4 28 L16 20" stroke="#C8102E" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const BrilloNumero = () => (
  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "160px", height: "160px", background: "radial-gradient(circle, rgba(254,240,138,0.6) 0%, rgba(254,240,138,0) 65%)", borderRadius: "50%", filter: "blur(12px)", pointerEvents: "none", zIndex: -1 }} />
);

// ==========================================
// COMPONENTE PRINCIPAL APP
// ==========================================

export default function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null); 
  const [userName, setUserName] = useState("");
  const [userEquipoId, setUserEquipoId] = useState(null);
  const [votantes, setVotantes] = useState([]);
  const [equipo, setEquipo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState("inicio");

  const [formVotante, setFormVotante] = useState({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", fecha_nacimiento: "", telefono: "", observacion: "" });
  const [formEquipo, setFormEquipo] = useState({ nombre: "", telefono: "", rol: "coordinador", zona: "", email: "", password: "" });
  const [editIdVotante, setEditIdVotante] = useState(null);
  const [editIdEquipo, setEditIdEquipo] = useState(null);
  const [busquedaLista, setBusquedaLista] = useState("");
  const [cedulaRapida, setCedulaRapida] = useState("");
  const [resultadoPadron, setResultadoPadron] = useState(null);
  const [busquedaListaGeneral, setBusquedaListaGeneral] = useState("");

  const limpiarEstado = () => {
    setVotantes([]); setEquipo([]); setUserRole(null); setUserName(""); setUserEquipoId(null);
    setActiveTab("inicio");
    setFormVotante({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", fecha_nacimiento: "", telefono: "", observacion: "" });
    setFormEquipo({ nombre: "", telefono: "", rol: "coordinador", zona: "", email: "", password: "" });
    setEditIdVotante(null); setEditIdEquipo(null); setBusquedaLista(""); setCedulaRapida(""); setResultadoPadron(null); setBusquedaListaGeneral("");
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    supabase.auth.getSession().then(({ data }) => { if (!data.session) limpiarEstado(); setSession(data.session); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { if (!session) limpiarEstado(); setSession(session); });
    return () => { window.removeEventListener("resize", handleResize); subscription.unsubscribe(); };
  }, []);

  useEffect(() => { if (session) cargarRolYDatos(); }, [session]);

  useEffect(() => {
    let timeoutId;
    const resetTimer = () => { clearTimeout(timeoutId); if (session) { timeoutId = setTimeout(() => { supabase.auth.signOut(); }, 15 * 60 * 1000); } };
    if (session) {
      resetTimer(); 
      const eventos = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
      eventos.forEach((evento) => window.addEventListener(evento, resetTimer));
      return () => { clearTimeout(timeoutId); eventos.forEach((evento) => window.removeEventListener(evento, resetTimer)); };
    }
  }, [session]);

  async function cargarRolYDatos() {
    setLoading(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("rol, nombre, equipo_id").eq("user_id", session.user.id).single();
      setUserRole(profile?.rol || "coordinador"); setUserName(profile?.nombre || "Usuario"); setUserEquipoId(profile?.equipo_id || null);
      await cargarDatos();
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  async function cargarDatos() {
    try {
      const [v, e] = await Promise.all([ supabase.from("votantes").select("*").order("created_at", { ascending: false }), supabase.from("equipo").select("*").order("created_at", { ascending: false }) ]);
      setVotantes(v.data || []); setEquipo(e.data || []);
    } catch (err) { console.error(err); }
  }

  const votantesFiltrados = useMemo(() => votantes.filter(v => v.created_by === session?.user?.id), [votantes, session]);
  const votantesUnicos = useMemo(() => {
    const seen = new Set();
    return votantesFiltrados.filter(v => { const duplicate = seen.has(normalizarCedula(v.cedula)); seen.add(normalizarCedula(v.cedula)); return !duplicate; });
  }, [votantesFiltrados]);

  const rendimientoEquipo = useMemo(() => {
    const total = votantes?.length || 0; const captadoresMap = new Map();
    (equipo || []).forEach((m) => captadoresMap.set(m.nombre, { id: m.id, nombre: m.nombre, cantidad: 0 }));
    (votantes || []).forEach((v) => {
      const nombre = v.por_parte_de_nombre;
      if (nombre) { if (!captadoresMap.has(nombre)) captadoresMap.set(nombre, { id: v.created_by || nombre, nombre: nombre, cantidad: 0 }); captadoresMap.get(nombre).cantidad += 1; }
    });
    return Array.from(captadoresMap.values()).map((m) => ({ ...m, porcentaje: total > 0 ? Math.round((m.cantidad / total) * 100) : 0 })).sort((a, b) => b.cantidad - a.cantidad);
  }, [votantes, equipo]);

  const totalVotantesGeneral = useMemo(() => {
    const seen = new Set();
    return votantes.filter(v => { const duplicate = seen.has(normalizarCedula(v.cedula)); seen.add(normalizarCedula(v.cedula)); return !duplicate; }).length;
  }, [votantes]); 

  const listaGeneralAdmin = useMemo(() => {
    const seen = new Set();
    return votantes.filter(v => { const duplicate = seen.has(normalizarCedula(v.cedula)); seen.add(normalizarCedula(v.cedula)); return !duplicate; });
  }, [votantes]);

  const conteoBarrio = useMemo(() => {
    const counts = {}; const fuenteDatos = userRole === "administrador" ? votantes : votantesFiltrados;
    (fuenteDatos || []).forEach((v) => { const b = v.barrio || "Sin barrio"; counts[b] = (counts[b] || 0) + 1; });
    return Object.entries(counts).map(([name, total]) => ({ name, total }));
  }, [votantes, votantesFiltrados, userRole]);

  async function buscarEnPadron() {
    const limpia = normalizarCedula(cedulaRapida);
    if (!limpia) return;
    setLoading(true); setResultadoPadron(null);
    const { data, error } = await supabase.from("padron_importado").select("*").or(`cedula_limpia.eq.${limpia},cedula.eq.${cedulaRapida}`).limit(1).maybeSingle();
    if (error) { if (error.code === "42501") alert("Error de permisos."); else alert("Error: " + error.message); } 
    else if (data) setResultadoPadron(data); 
    else alert("Cédula no encontrada");
    setLoading(false);
  }

  async function guardarVotante(e) {
    e.preventDefault();
    const cedulaLimpiaActual = normalizarCedula(formVotante.cedula);
    const existeEnMiLista = votantes.some(v => normalizarCedula(v.cedula) === cedulaLimpiaActual && v.created_by === session?.user?.id && v.id !== editIdVotante);
    if (existeEnMiLista) return alert("Ya registrado en tu lista.");
    setLoading(true);
    const { id, created_at, ...datosLimpios } = formVotante;
    const payload = { ...datosLimpios, fecha_nacimiento: datosLimpios.fecha_nacimiento && datosLimpios.fecha_nacimiento.includes("/") ? datosLimpios.fecha_nacimiento.split("/").reverse().join("-") : datosLimpios.fecha_nacimiento || null, cedula_limpia: cedulaLimpiaActual, por_parte_de_nombre: userName, equipo_id: userEquipoId, user_id: session?.user?.id, created_by: session?.user?.id };
    const { error } = editIdVotante ? await supabase.from("votantes").update(payload).eq("id", editIdVotante) : await supabase.from("votantes").insert([payload]);
    if (!error) {
      setFormVotante({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", fecha_nacimiento: "", telefono: "", observacion: "" });
      setEditIdVotante(null); cargarDatos(); alert("¡Guardado!");
    } else { alert("Error: " + error.message); }
    setLoading(false);
  }

  async function guardarEquipo(e) {
    e.preventDefault(); if(userRole !== "administrador") return;
    setLoading(true); let authUserId = null;
    if (!editIdEquipo) {
      const { data: authData, error: authError } = await supabaseAuth.auth.signUp({ email: formEquipo.email, password: formEquipo.password });
      if (authError) { alert("❌ Error: " + authError.message); setLoading(false); return; }
      authUserId = authData.user.id;
    }
    const payloadEquipo = { nombre: formEquipo.nombre, telefono: formEquipo.telefono, zona: formEquipo.zona, rol: formEquipo.rol, ...(authUserId && { user_id: authUserId }) };
    if (editIdEquipo) {
      const { error: err1 } = await supabase.from("equipo").update(payloadEquipo).eq("id", editIdEquipo);
      const { error: err2 } = await supabase.from("profiles").update({ nombre: formEquipo.nombre, rol: formEquipo.rol, telefono: formEquipo.telefono, zona: formEquipo.zona }).eq("equipo_id", editIdEquipo);
      if (err1 || err2) alert("❌ Error al actualizar"); else { setFormEquipo({ nombre: "", telefono: "", rol: "coordinador", zona: "", email: "", password: "" }); setEditIdEquipo(null); cargarDatos(); alert("✅ Actualizado"); }
    } else {
      const { data: nuevoEquipo, error: err1 } = await supabase.from("equipo").insert([payloadEquipo]).select(); 
      if (err1) alert("❌ Error: " + err1.message);
      else if (nuevoEquipo && authUserId) {
        const payloadProfile = { id: authUserId, user_id: authUserId, equipo_id: nuevoEquipo[0].id, nombre: formEquipo.nombre, rol: formEquipo.rol, telefono: formEquipo.telefono, zona: formEquipo.zona };
        const { error: err2 } = await supabase.from("profiles").insert([payloadProfile]);
        if (err2) alert("⚠️ Error perfil."); else { setFormEquipo({ nombre: "", telefono: "", rol: "coordinador", zona: "", email: "", password: "" }); setEditIdEquipo(null); cargarDatos(); alert("✅ Creado"); }
      }
    }
    setLoading(false);
  }

  const exportarExcel = async () => {
    if (userRole !== "administrador") return;
    const workbook = new ExcelJS.Workbook();
    const crearHoja = (nombreHoja, lista) => {
      const sheet = workbook.addWorksheet(nombreHoja.substring(0, 31));
      const esListaGeneral = nombreHoja === "LISTA GENERAL"; const colFinal = esListaGeneral ? "L" : "M";
      sheet.addRow(["HAGAMOS QUE SUCEDA"]); sheet.mergeCells(`A1:${colFinal}1`);
      sheet.getRow(1).height = 30; sheet.getRow(1).getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8102E" } }; sheet.getRow(1).getCell(1).font = { color: { argb: "FFFFFFFF" }, size: 18, bold: true }; sheet.getRow(1).getCell(1).alignment = { vertical: "middle", horizontal: "center" };
      sheet.addRow(["Darío Carmona Concejal 2026"]); sheet.mergeCells(`A2:${colFinal}2`);
      sheet.getRow(2).height = 20; sheet.getRow(2).getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8102E" } }; sheet.getRow(2).getCell(1).font = { color: { argb: "FFFFFFFF" }, size: 12, bold: true }; sheet.getRow(2).getCell(1).alignment = { vertical: "middle", horizontal: "center" };
      sheet.addRow([]); 
      const anchosColumnas = esListaGeneral ? [5, 25, 25, 12, 17, 15, 20, 10, 10, 10, 37, 40] : [5, 25, 25, 12, 17, 15, 20, 10, 10, 10, 37, 20, 40];
      anchosColumnas.forEach((ancho, index) => sheet.getColumn(index + 1).width = ancho);
      const headerRow = sheet.getRow(4);
      const headerNombres = esListaGeneral ? ["Nro", "Nombre", "Apellido", "Cedula", "Fecha Nacimiento", "Teléfono", "Barrio", "Orden", "Mesa", "Seccional", "Local", "Observación"] : ["Nro", "Nombre", "Apellido", "Cedula", "Fecha Nacimiento", "Teléfono", "Barrio", "Orden", "Mesa", "Seccional", "Local", "Captado por", "Observación"];
      headerRow.values = headerNombres;
      headerRow.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8102E" } }; c.font = { color: { argb: "FFFFFFFF" }, bold: true }; c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }; });
      lista.forEach((v, i) => {
        const fechaFormateada = v.fecha_nacimiento && v.fecha_nacimiento.includes("-") ? v.fecha_nacimiento.split("-").reverse().join("/") : (v.fecha_nacimiento || "");
        const valoresFila = esListaGeneral ? [i + 1, v.nombre, v.apellido, v.cedula, fechaFormateada, v.telefono, v.barrio, v.orden, v.mesa, v.seccional, v.local_votacion, v.observacion] : [i + 1, v.nombre, v.apellido, v.cedula, fechaFormateada, v.telefono, v.barrio, v.orden, v.mesa, v.seccional, v.local_votacion, v.por_parte_de_nombre, v.observacion];
        const row = sheet.addRow(valoresFila); const color = i % 2 !== 0 ? "FFFEE2E2" : "FFFFFFFF";
        row.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } }; c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }; c.alignment = { vertical: "middle", horizontal: "left" }; });
      });
    };
    const todosVotantesUnicos = (() => { const seen = new Set(); return votantes.filter(v => { const duplicate = seen.has(normalizarCedula(v.cedula)); seen.add(normalizarCedula(v.cedula)); return !duplicate; }); })();
    crearHoja("LISTA GENERAL", todosVotantesUnicos);
    const nombresCaptadores = [...new Set(votantes.map((v) => v.por_parte_de_nombre).filter(Boolean))];
    nombresCaptadores.forEach((nombre) => { const datosMiembro = votantes.filter((v) => v.por_parte_de_nombre === nombre); if (datosMiembro.length > 0) crearHoja(nombre, datosMiembro); });
    const buffer = await workbook.xlsx.writeBuffer(); saveAs(new Blob([buffer]), "Campaña_Dario_Carmona.xlsx");
  };

  if (!session) { return <LoginScreen onLogin={async (e, p) => await supabase.auth.signInWithPassword({ email: e, password: p })} loading={loading} />; }

  const tabStyle = (id) => ({
    flex: 1, padding: "18px 5px", border: "none", background: activeTab === id ? "#C8102E" : "#f1f5f9", color: activeTab === id ? "white" : "#64748b", fontWeight: "900", fontSize: isMobile ? "10px" : "13px", textTransform: "uppercase", cursor: "pointer", borderRadius: "15px 15px 0 0", transition: "0.3s", margin: "0 2px", outline: "none",
  });

  return (
    <div style={{ background: "white", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      
      {/* --- ENCABEZADO SUPERIOR RÉPLICA --- */}
      <header style={{ background: "white", padding: isMobile ? "12px 15px" : "15px 30px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", position: "relative", zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img src={anrlogo} alt="ANR" style={{ width: "35px", height: "35px", borderRadius: "50%" }} />
          {!isMobile && (
            <span style={{ fontSize: "14px", color: "#64748b", fontWeight: "500", marginLeft: "5px" }}>
              Sistema de Gestión – <span style={{ background: "#C8102E", color: "white", padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", verticalAlign: "middle" }}>Lista 2 / Opción 5</span>
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "10px" : "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingRight: isMobile ? 0 : "20px", borderRight: isMobile ? "none" : "1px solid #e2e8f0" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "13px", color: "#64748b" }}>Hola, <span style={{ fontWeight: "800", color: "#1e293b" }}>{userName}</span></div>
              <div style={{ background: "#C8102E", color: "white", padding: "2px 8px", borderRadius: "10px", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", display: "inline-block", marginTop: "2px" }}>{userRole}</div>
            </div>
            <UserCircle size={36} color="#94a3b8" strokeWidth={1.5} />
          </div>
          <button onClick={() => supabase.auth.signOut()} style={{ background: "transparent", color: "#1e293b", border: "1px solid #cbd5e1", padding: "8px 15px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
            <LogOut size={16} color="#C8102E" /> {!isMobile && "Cerrar sesión"}
          </button>
        </div>
      </header>
      
      {isMobile && (
        <div style={{ background: "#f8fafc", padding: "10px", borderBottom: "1px solid #e2e8f0", textAlign: "center", fontSize: "12px", color: "#64748b", fontWeight: "500" }}>
           Sistema de Gestión – <span style={{fontWeight: "800", color: "#C8102E"}}>Lista 2 / Opción 5</span>
        </div>
      )}

      {/* --- SECCIÓN PRINCIPAL HERO RÉPLICA EXACTA --- */}
      <section style={{ position: "relative", width: "100%", background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)", padding: isMobile ? "40px 15px 160px 15px" : "50px 20px 180px 20px", textAlign: "center" }}>
        
        <BridgeCityBackground />

        <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "25px" }}>
            {!isMobile && <svg width="50" height="2"><rect width="50" height="2" fill="#cbd5e1"/></svg>}
            <div style={{ background: "white", borderRadius: "50%", padding: "6px", boxShadow: "0 4px 15px rgba(0,0,0,0.06)" }}>
              <img src={anrlogo} alt="ANR" style={{ width: "90px", height: "90px", borderRadius: "50%" }} />
            </div>
            {!isMobile && <svg width="50" height="2"><rect width="50" height="2" fill="#cbd5e1"/></svg>}
          </div>

          <div style={{ display: "inline-flex", alignItems: "center", background: "#C8102E", borderRadius: "40px", color: "white", fontWeight: "900", fontSize: isMobile ? "16px" : "18px", marginBottom: "15px", boxShadow: "0 5px 15px rgba(200,16,46,0.3)", padding: "4px 6px 4px 20px" }}>
            <span>LISTA 2</span>
            <span style={{ background: "white", color: "#C8102E", padding: "4px 15px", borderRadius: "30px", marginLeft: "10px" }}>OPCIÓN 5</span>
          </div>

          <h1 style={{ fontFamily: "'Inter', sans-serif", fontStyle: "italic", fontWeight: "900", color: "#C8102E", fontSize: isMobile ? "30px" : "65px", margin: "0 0 5px 0", textTransform: "uppercase", letterSpacing: "-2px", lineHeight: 1.1 }}>
            HAGAMOS QUE SUCEDA
          </h1>

          <button style={{ background: "linear-gradient(90deg, #a00d25 0%, #C8102E 50%, #a00d25 100%)", borderRadius: "50px", padding: "8px 30px 8px 8px", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 10px 25px rgba(200,16,46,0.4)", width: isMobile ? "100%" : "auto", maxWidth: "550px", border: "none" }}>
            <div style={{ background: "white", borderRadius: "50%", width: "46px", height: "46px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <img src={logocarmona} alt="Carmona" style={{ width: "100%", height: "auto" }} />
            </div>
            <span style={{ color: "white", fontWeight: "800", fontSize: isMobile ? "10px" : "19px", flex: 1, textAlign: "center" }}>
              DARÍO CARMONA – CONCEJAL 2026
            </span>
            <span style={{ color: "white", fontSize: "22px", fontWeight: "bold" }}></span>
          </button>
          
        </div>
      </section>

      {/* --- TARJETA DEL CONTADOR RÉPLICA EXACTA --- */}
      <div style={{ position: "relative", zIndex: 20, marginTop: "-80px", display: "flex", justifyContent: "center", padding: "0 20px", marginBottom: "50px" }}>
        <div style={{ background: "white", borderRadius: "20px", padding: isMobile ? "30px 20px" : "25px 50px", display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: "center", gap: isMobile ? "20px" : "40px", boxShadow: "0 15px 35px rgba(0,0,0,0.1)", position: "relative", border: "1px solid #f1f5f9", maxWidth: "850px", width: "100%" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <div style={{ background: "#C8102E", color: "white", width: "60px", height: "60px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 5px 15px rgba(200,16,46,0.3)" }}>
              <Users size={32} strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: "900", fontSize: "32px", color: "#1e293b", fontStyle: "italic" }}>YA SOMOS</span>
          </div>

          <div style={{ position: "relative", padding: "0 15px", display: "flex", alignItems: "center", justifyContent: "center", flex: isMobile ? "none" : 1 }}>
            <BrilloNumero />
            <AccentLeft />
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: "900", fontSize: isMobile ? "80px" : "110px", color: "#C8102E", fontStyle: "italic", lineHeight: 0.8, letterSpacing: "-3px", textShadow: "2px 2px 0px rgba(0,0,0,0.05)" }}>
              {totalVotantesGeneral.toLocaleString('es-PY')}
            </span>
            <AccentRight />
          </div>

          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: "800", color: "#64748b", fontSize: "18px", lineHeight: 1.2, textAlign: isMobile ? "center" : "left" }}>
            personas
          </div>

          {/* Cápsula inferior */}
          <div style={{ position: "absolute", bottom: "-20px", left: "50%", transform: "translateX(-50%)", background: "#fee2e2", border: "4px solid white", borderRadius: "30px", padding: "6px 25px", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 10px rgba(0,0,0,0.05)", whiteSpace: "nowrap" }}>
            <div style={{ background: "#C8102E", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px" }}>
              <CheckCircle2 color="white" size={14} strokeWidth={4} />
            </div>
            <span style={{ color: "#C8102E", fontWeight: "800", fontSize: "15px" }}>¡Y vamos por más!</span>
          </div>
        </div>
      </div>

      
      {/* --- FIN RÉPLICA VISUAL --- */}

      <nav style={{ display: "flex", background: "#f1f5f9", padding: "10px 10px 0 10px", position: "sticky", top: 0, zIndex: 90, borderBottom: "1px solid #e2e8f0" }}>
        <button onClick={() => setActiveTab("inicio")} style={tabStyle("inicio")}>Inicio</button>
        <button onClick={() => setActiveTab("votantes")} style={tabStyle("votantes")}>Mis Votantes</button>
        {userRole === "administrador" && (
          <>
            <button onClick={() => setActiveTab("lista_general")} style={tabStyle("lista_general")}>Lista General</button>
            <button onClick={() => setActiveTab("equipo")} style={tabStyle("equipo")}>Equipo</button>
            <button onClick={() => setActiveTab("reportes")} style={tabStyle("reportes")}>Reportes</button>
          </>
        )}
      </nav>

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: isMobile ? "20px 15px" : "30px 15px", paddingBottom: 120 }}>
        {activeTab === "inicio" && (
          <div style={{ display: "grid", gap: 25 }}>
            <div style={{ background: "white", padding: isMobile ? 20 : 35, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", border: "1px solid #f1f5f9" }}>
              <h4 style={{ color: "#C8102E", fontWeight: "900", marginBottom: 20, fontSize: "14px", textTransform: "uppercase" }}>🔍 BUSCADOR DE PADRÓN</h4>
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10 }}>
                <input type="text" value={cedulaRapida} onChange={(e) => setCedulaRapida(e.target.value.replace(/\D/g, ''))} placeholder="Ingrese número de cédula..." style={{ flex: 1, padding: "15px", borderRadius: "12px", border: "2px solid #f1f5f9", fontSize: "16px", outline: "none" }} />
                <button onClick={buscarEnPadron} style={{ padding: "15px 30px", background: "#C8102E", color: "white", border: "none", borderRadius: "12px", fontWeight: "900", fontSize: "16px", cursor: "pointer" }}>
                  BUSCAR
                </button>
              </div>

              {resultadoPadron && (
                <div style={{ marginTop: 20, padding: 20, background: "#fef2f2", borderRadius: "20px", border: "2px dashed #C8102E", textAlign: "center" }}>
                  <h3 style={{ fontSize: "20px", color: "#C8102E", fontWeight: "900", marginBottom: "10px" }}>
                    {resultadoPadron?.nombre} {resultadoPadron?.apellido}
                  </h3>
                  <p style={{ fontWeight: "700", color: "#475569", fontSize: "14px", marginBottom: "5px" }}>
                    Mesa: <span style={{color: "#1e293b"}}>{resultadoPadron?.mesa}</span> | Orden: <span style={{color: "#1e293b"}}>{resultadoPadron?.orden}</span> | Seccional: <span style={{color: "#1e293b"}}>{resultadoPadron?.seccional}</span>
                  </p>
                  <p style={{ color: "#C8102E", fontWeight: "800", fontSize: "13px", marginBottom: 18 }}>
                    {resultadoPadron?.local_votacion}
                  </p>
                  <button
                    onClick={() => {
                      const fechaCasteada = resultadoPadron.fecha_nacimiento && resultadoPadron.fecha_nacimiento.includes("-") ? resultadoPadron.fecha_nacimiento.split("-").reverse().join("/") : (resultadoPadron.fecha_nacimiento || "");
                      setFormVotante({ ...formVotante, ...resultadoPadron, fecha_nacimiento: fechaCasteada });
                      setResultadoPadron(null);
                      alert("Datos cargados en el formulario inferior.");
                    }}
                    style={{ background: "#16a34a", color: "white", padding: "12px 25px", borderRadius: "10px", fontWeight: "900", border: "none", cursor: "pointer", fontSize: "14px" }}
                  >
                    COPIAR AL FORMULARIO
                  </button>
                </div>
              )}
            </div>

            <div id="formVotante" style={{ background: "white", padding: isMobile ? 25 : 40, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", border: "1px solid #f1f5f9" }}>
              <h3 style={{ color: "#1e293b", fontWeight: "900", textAlign: "center", marginBottom: 30, fontSize: "22px", textTransform: "uppercase" }}>{editIdVotante ? "Editar Votante" : "Registrar Nuevo Votante"}</h3>
              <form onSubmit={guardarVotante} style={{ display: "grid", gap: 18 }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18 }}>
                  <div><label style={{ fontWeight: "700", fontSize: "12px", color: "#64748b", marginBottom: "5px", display: "block" }}>NOMBRE *</label><input type="text" value={formVotante.nombre} onChange={(e) => setFormVotante({ ...formVotante, nombre: e.target.value })} required style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px", outline: "none" }} /></div>
                  <div><label style={{ fontWeight: "700", fontSize: "12px", color: "#64748b", marginBottom: "5px", display: "block" }}>APELLIDO *</label><input type="text" value={formVotante.apellido} onChange={(e) => setFormVotante({ ...formVotante, apellido: e.target.value })} required style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px", outline: "none" }} /></div>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18 }}>
                  <div><label style={{ fontWeight: "700", fontSize: "12px", color: "#64748b", marginBottom: "5px", display: "block" }}>CÉDULA DE IDENTIDAD *</label><input type="text" value={formVotante.cedula} onChange={(e) => setFormVotante({ ...formVotante, cedula: e.target.value.replace(/\D/g, '') })} required style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px", outline: "none" }} /></div>
                  <div><label style={{ fontWeight: "700", fontSize: "12px", color: "#64748b", marginBottom: "5px", display: "block" }}>TELÉFONO / WHATSAPP *</label><input type="tel" value={formVotante.telefono} onChange={(e) => setFormVotante({ ...formVotante, telefono: e.target.value.replace(/\D/g, '') })} required style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px", outline: "none" }} /></div>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18 }}>
                  <div><label style={{ fontWeight: "700", fontSize: "12px", color: "#64748b", marginBottom: "5px", display: "block" }}>FECHA DE NACIMIENTO *</label><input type="text" placeholder="DD/MM/AAAA" value={formVotante.fecha_nacimiento} onChange={(e) => { let v = e.target.value.replace(/\D/g, ''); if (v.length > 8) v = v.substring(0, 8); if (v.length > 4) { v = v.replace(/(\d{2})(\d{2})(\d{1,4})/, '$1/$2/$3'); } else if (v.length > 2) { v = v.replace(/(\d{2})(\d{1,2})/, '$1/$2'); } setFormVotante({ ...formVotante, fecha_nacimiento: v }); }} required style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px", outline: "none" }} /></div>
                  <div><label style={{ fontWeight: "700", fontSize: "12px", color: "#64748b", marginBottom: "5px", display: "block" }}>BARRIO *</label><select value={formVotante.barrio} onChange={(e) => setFormVotante({ ...formVotante, barrio: e.target.value })} required style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px", background: "white", outline: "none" }}><option value="">Seleccione un barrio...</option>{LISTA_BARRIOS.map((b) => <option key={b} value={b}>{b}</option>)}</select></div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 15, padding: "15px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                   <div style={{gridColumn: isMobile ? "1 / -1" : "auto"}}><label style={{ fontWeight: "700", fontSize: "11px", color: "#64748b", marginBottom: "3px", display: "block" }}>LOCAL DE VOTACIÓN</label><input type="text" value={formVotante.local_votacion} onChange={(e) => setFormVotante({ ...formVotante, local_votacion: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none" }} /></div>
                   <div><label style={{ fontWeight: "700", fontSize: "11px", color: "#64748b", marginBottom: "3px", display: "block" }}>MESA</label><input type="text" value={formVotante.mesa} onChange={(e) => setFormVotante({ ...formVotante, mesa: e.target.value.replace(/\D/g, '') })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none" }} /></div>
                   <div><label style={{ fontWeight: "700", fontSize: "11px", color: "#64748b", marginBottom: "3px", display: "block" }}>ORDEN</label><input type="text" value={formVotante.orden} onChange={(e) => setFormVotante({ ...formVotante, orden: e.target.value.replace(/\D/g, '') })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none" }} /></div>
                </div>
                
                <div><label style={{ fontWeight: "700", fontSize: "12px", color: "#64748b", marginBottom: "5px", display: "block" }}>OBSERVACIÓN / COMENTARIO</label><input type="text" value={formVotante.observacion} onChange={(e) => setFormVotante({ ...formVotante, observacion: e.target.value })} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px", outline: "none" }} /></div>
                
                <div style={{display: "flex", gap: "10px", marginTop: "15px"}}>
                   {editIdVotante && <button type="button" onClick={() => { setEditIdVotante(null); setFormVotante({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", fecha_nacimiento: "", telefono: "", observacion: "" }); }} style={{ background: "#f1f5f9", color: "#64748b", fontWeight: "700", padding: "18px", borderRadius: "15px", border: "none", fontSize: "16px", cursor: "pointer", flex: 1 }}>CANCELAR</button>}
                   <button type="submit" disabled={loading} style={{ background: "#C8102E", color: "white", fontWeight: "900", padding: "18px", borderRadius: "15px", border: "none", fontSize: "18px", cursor: "pointer", flex: 2 }}>{loading ? "PROCESANDO..." : editIdVotante ? "GUARDAR CAMBIOS" : "REGISTRAR VOTANTE"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "votantes" && (
          <div style={{ background: "white", padding: isMobile ? 15 : 30, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9" }}>
            <h3 style={{ color: "#1e293b", fontWeight: "900", marginBottom: 20, fontSize: "20px", textTransform: "uppercase" }}>Mi Lista de Votantes</h3>
            <input type="text" placeholder="🔍 Buscar por nombre o cédula..." value={busquedaLista} onChange={(e) => setBusquedaLista(e.target.value)} style={{ width: "100%", padding: "15px", borderRadius: "15px", border: "2px solid #f1f5f9", marginBottom: 25, fontSize: "16px", outline: "none" }} />
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <div style={{ minWidth: isMobile ? "600px" : "100%", overflowY: "auto", maxHeight: "65vh" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 10 }}>
                    <tr style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase" }}><th style={{ padding: "15px", textAlign: "left" }}>NOMBRE</th><th style={{ padding: "15px", textAlign: "left" }}>CÉDULA</th><th style={{ padding: "15px", textAlign: "left" }}>TELÉFONO</th><th style={{ padding: "15px", textAlign: "center" }}>ACCIONES</th></tr>
                  </thead>
                  <tbody>
                    {(votantesUnicos || []).filter((v) => (v?.nombre + v?.apellido + v?.cedula).toLowerCase().includes(busquedaLista.toLowerCase())).map((v) => (
                      <tr key={v?.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "18px 15px", fontWeight: "700", color: "#1e293b" }}>{v?.nombre} {v?.apellido}<br /><small style={{ color: "#C8102E", fontWeight: "600" }}>{v?.barrio}</small></td>
                        <td style={{ padding: "15px", color: "#475569", fontWeight: "500" }}>{v?.cedula}</td>
                        <td style={{ padding: "15px", color: "#475569", fontWeight: "500" }}>{v?.telefono}</td>
                        <td style={{ padding: "15px", textAlign: "center", display: "flex", gap: 8, justifyContent: "center" }}>
                          <button onClick={() => { setFormVotante({ ...v, fecha_nacimiento: v.fecha_nacimiento && v.fecha_nacimiento.includes("-") ? v.fecha_nacimiento.split("-").reverse().join("/") : (v.fecha_nacimiento || "") }); setEditIdVotante(v.id); setActiveTab("inicio"); setTimeout(() => document.getElementById('formVotante').scrollIntoView({ behavior: 'smooth' }), 100); }} style={{ padding: "8px 15px", background: "#f1f5f9", border: "none", borderRadius: "10px", fontWeight: "800", color: "#64748b", fontSize: "11px", cursor: "pointer" }}>EDITAR</button>
                          <button onClick={async () => { if (confirm(`¿Borrar a ${v.nombre}?`)) { setLoading(true); const { error } = await supabase.from("votantes").delete().eq("id", v.id); if (!error) { setVotantes(prev => prev.filter(item => item.id !== v.id)); } else { alert("Error: " + error.message); } setLoading(false); } }} style={{ padding: "8px 15px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "10px", fontWeight: "800", fontSize: "11px", cursor: "pointer" }}>BORRAR</button>
                        </td>
                      </tr>
                    ))}
                    {votantesUnicos.length === 0 && <tr><td colSpan="4" style={{textAlign: "center", padding: "40px", color: "#64748b"}}>Aún no has registrado votantes.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "lista_general" && userRole === "administrador" && (
          <div style={{ background: "white", padding: isMobile ? 15 : 30, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", border: "1px solid #f1f5f9" }}>
            <h3 style={{ color: "#1e293b", fontWeight: "900", marginBottom: 20, fontSize: "20px", textTransform: "uppercase" }}>Control de Asistencia General (Día D)</h3>
            <input type="text" placeholder="🔍 Buscar por cédula..." value={busquedaListaGeneral} onChange={(e) => setBusquedaListaGeneral(e.target.value.replace(/\D/g, ''))} style={{ width: "100%", padding: "15px", borderRadius: "15px", border: "2px solid #f1f5f9", marginBottom: 25, fontSize: "16px", outline: "none" }} />
            
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", marginBottom: "30px" }}>
              <div style={{ minWidth: isMobile ? "600px" : "100%", overflowY: "auto", maxHeight: "60vh" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 10 }}>
                    <tr style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase" }}>
                      <th style={{ padding: "15px", textAlign: "left" }}>NOMBRE COMPLETO</th>
                      <th style={{ padding: "15px", textAlign: "left" }}>CÉDULA</th>
                      <th style={{ padding: "15px", textAlign: "left" }}>UBICACIÓN</th>
                      <th style={{ padding: "15px", textAlign: "center" }}>¿YA VOTÓ?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(listaGeneralAdmin || []).filter((v) => busquedaListaGeneral ? v.cedula.includes(busquedaListaGeneral) : true).slice(0, 50).map((v) => (
                      <tr key={v?.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "18px 15px", fontWeight: "700", color: "#1e293b" }}>{v?.nombre} {v?.apellido}<br /><small style={{ color: "#64748b" }}>Captado por: {v.por_parte_de_nombre}</small></td>
                        <td style={{ padding: "15px", color: "#475569", fontWeight: "500" }}>{v?.cedula}</td>
                        <td style={{ padding: "15px", color: "#475569", fontWeight: "500", fontSize: "13px" }}>Mesa: {v.mesa} | Orden: {v.orden}<br/>{v.local_votacion}</td>
                        <td style={{ padding: "15px", textAlign: "center" }}>
                          <input type="checkbox" checked={v.ha_votado || false} onChange={async (e) => { const checked = e.target.checked; const { error } = await supabase.from("votantes").update({ ha_votado: checked }).eq("id", v.id); if (!error) { setVotantes(prev => prev.map(item => item.id === v.id ? { ...item, ha_votado: checked } : item)); } else { alert("Error: " + error.message); } }} style={{ width: "22px", height: "22px", cursor: "pointer", accentColor: "#C8102E" }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: "25px", borderRadius: "20px", border: "1px solid #e2e8f0", textAlign: "center", maxWidth: "500px", margin: "0 auto" }}>
              <h4 style={{ margin: "0 0 15px 0", color: "#475569", fontSize: "15px", fontWeight: "800" }}>RESUMEN DE PARTICIPACIÓN</h4>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontSize: "48px", fontWeight: "900", color: "#C8102E", fontStyle: "italic", lineHeight: 1 }}>
                  {listaGeneralAdmin.length > 0 ? Math.round((listaGeneralAdmin.filter(v => v.ha_votado).length / listaGeneralAdmin.length) * 100) : 0}%
                </span>
                <span style={{ fontSize: "16px", fontWeight: "700", color: "#64748b" }}>participación</span>
              </div>
              <p style={{ margin: "10px 0 0 0", color: "#1e293b", fontWeight: "700", fontSize: "17px" }}>
                Han votado <span style={{color: "#C8102E", fontWeight: "900"}}>{listaGeneralAdmin.filter(v => v.ha_votado).length.toLocaleString('es-PY')}</span> de <span style={{fontWeight: "900"}}>{listaGeneralAdmin.length.toLocaleString('es-PY')}</span> personas registradas.
              </p>
            </div>
          </div>
        )}

        {activeTab === "equipo" && userRole === "administrador" && (
          <div style={{ display: "grid", gap: 30 }}>
            <div style={{ background: "white", padding: isMobile ? 25 : 35, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", border: "1px solid #f1f5f9" }}>
              <h3 style={{ color: "#1e293b", fontWeight: "900", marginBottom: 30, textAlign: "center", textTransform: "uppercase", fontSize: "20px" }}>Gestión de Equipo</h3>
              <form onSubmit={guardarEquipo} style={{ display: "grid", gap: 18 }}>
                <input type="text" placeholder="Nombre completo" value={formEquipo.nombre} onChange={(e) => setFormEquipo({ ...formEquipo, nombre: e.target.value })} required style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0", fontSize: "16px", outline: "none" }} />
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18 }}>
                  <input type="text" placeholder="Teléfono" value={formEquipo.telefono} onChange={(e) => setFormEquipo({ ...formEquipo, telefono: e.target.value.replace(/\D/g, '') })} style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0", fontSize: "16px", outline: "none" }} />
                  <input type="text" placeholder="Zona o Barrio" value={formEquipo.zona} onChange={(e) => setFormEquipo({ ...formEquipo, zona: e.target.value })} style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0", fontSize: "16px", outline: "none" }} />
                </div>
                {!editIdEquipo && (
                  <div style={{ padding: "18px", background: "#f8fafc", borderRadius: "15px", border: "1px dashed #cbd5e1" }}>
                    <p style={{ margin: "0 0 12px 0", fontSize: "12px", fontWeight: "800", color: "#64748b" }}>CREDENCIALES DE ACCESO</p>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 15 }}>
                      <input type="email" placeholder="Correo electrónico" value={formEquipo.email} onChange={(e) => setFormEquipo({ ...formEquipo, email: e.target.value })} required style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0", fontSize: "15px", outline: "none" }} />
                      <input type="password" placeholder="Contraseña (mín 6 letras)" value={formEquipo.password} onChange={(e) => setFormEquipo({ ...formEquipo, password: e.target.value })} required minLength={6} style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0", fontSize: "15px", outline: "none" }} />
                    </div>
                  </div>
                )}
                <select value={formEquipo.rol} onChange={(e) => setFormEquipo({ ...formEquipo, rol: e.target.value })} required style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0", fontSize: "16px", background: "white", outline: "none" }}>
                  <option value="coordinador">Rol: Coordinador</option>
                  <option value="administrador">Rol: Administrador</option>
                </select>
                <div style={{display: "flex", gap: "10px", marginTop: "10px"}}>
                   {editIdEquipo && <button type="button" onClick={() => { setEditIdEquipo(null); setFormEquipo({ nombre: "", telefono: "", rol: "coordinador", zona: "", email: "", password: "" }); }} style={{ background: "#f1f5f9", color: "#64748b", fontWeight: "700", padding: "16px", borderRadius: "12px", border: "none", fontSize: "16px", cursor: "pointer", flex: 1 }}>CANCELAR</button>}
                   <button type="submit" disabled={loading} style={{ background: "#1e293b", color: "white", fontWeight: "900", padding: "16px", borderRadius: "12px", border: "none", fontSize: "16px", cursor: "pointer", flex: 2 }}>{loading ? "PROCESANDO..." : editIdEquipo ? "GUARDAR CAMBIOS" : "CREAR USUARIO"}</button>
                </div>
              </form>
            </div>
            
            <div style={{ background: "white", padding: isMobile ? 20 : 30, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", border: "1px solid #f1f5f9" }}>
              <h4 style={{ fontWeight: "900", color: "#1e293b", marginBottom: 20, fontSize: "18px" }}>MIEMBROS ACTIVOS</h4>
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: "500px", overflowY: "auto", maxHeight: "60vh" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 10 }}>
                        <tr style={{ fontSize: "11px", color: "#64748b" }}><th style={{ padding: 15, textAlign: "left" }}>NOMBRE / ROL</th><th style={{ padding: 15, textAlign: "left" }}>CONTACTO</th><th style={{ padding: 15, textAlign: "center" }}>ACCIONES</th></tr>
                    </thead>
                    <tbody>
                      {(equipo || []).map((m) => (
                        <tr key={m?.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "15px", fontWeight: "700", color: "#1e293b" }}>{m?.nombre}<br /><small style={{ color: m?.rol === 'administrador' ? "#C8102E" : "#64748b", textTransform: "capitalize" }}>{m?.rol}</small></td>
                          <td style={{ padding: "15px", color: "#475569", fontWeight: "500" }}>{m?.telefono}<br /><small>{m?.zona}</small></td>
                          <td style={{ padding: "15px", textAlign: "center", display: "flex", gap: 8, justifyContent: "center" }}>
                            <button onClick={() => { setFormEquipo(m); setEditIdEquipo(m.id); window.scrollTo(0, 0); }} style={{ padding: "7px 12px", background: "#f1f5f9", border: "none", borderRadius: "8px", fontWeight: "800", color: "#64748b", fontSize: "10px", cursor: "pointer" }}>EDITAR</button>
                            <button onClick={async () => { if (confirm(`¿Borrar a ${m.nombre}?`)) { setLoading(true); try { let uid = m.user_id; if (!uid) { const { data } = await supabase.from("profiles").select("user_id").eq("equipo_id", m.id).maybeSingle(); if (data) uid = data.user_id; } if (uid) { await supabase.from("votantes").update({ user_id: null, created_by: null }).eq("user_id", uid); await supabase.from("profiles").delete().eq("user_id", uid); } await supabase.from("equipo").delete().eq("id", m.id); cargarDatos(); } catch (error) { alert("Error: " + error.message); } setLoading(false); } }} style={{ padding: "7px 12px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "8px", fontWeight: "800", fontSize: "10px", cursor: "pointer" }}>BORRAR</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "reportes" && userRole === "administrador" && (
          <div style={{ display: "grid", gap: 30 }}>
            <div style={{ background: "white", padding: 30, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", border: "1px solid #f1f5f9" }}>
              <h3 style={{ color: "#1e293b", fontWeight: "900", marginBottom: 25, textTransform: "uppercase", fontSize: "20px" }}>Ranking (Top 10)</h3>
              {(rendimientoEquipo || []).slice(0, 10).map((m, index) => (
                <div key={m?.id} style={{ marginBottom: 18, padding: "15px", background: index < 3 ? "#fef2f2" : "white", borderRadius: "12px", border: index < 3 ? "1px solid #fecaca" : "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                        <span style={{fontWeight: "900", color: "#C8102E", fontSize: "18px"}}>#{index + 1}</span>
                        <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "15px" }}>{m?.nombre}</span>
                    </div>
                    <span style={{ fontSize: "15px", fontWeight: "800", color: "#C8102E" }}>{m?.cantidad.toLocaleString('es-PY')} <small style={{color: "#64748b", fontWeight: "600"}}>votantes</small></span>
                  </div>
                  <div style={{ width: "100%", height: "10px", background: "#f1f5f9", borderRadius: "10px", overflow: "hidden" }}>
                    <div style={{ width: `${m?.porcentaje}%`, height: "100%", background: "#C8102E", borderRadius: "10px" }}></div>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ background: "white", padding: 25, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", border: "1px solid #f1f5f9" }}>
              <h3 style={{ color: "#1e293b", fontWeight: "900", marginBottom: 25, textTransform: "uppercase", fontSize: "20px" }}>Distribución por Barrio</h3>
              <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "400px" }}>
                    <thead style={{ background: "#C8102E" }}>
                      <tr style={{ fontSize: "12px", color: "white", fontWeight: "900" }}>
                        <th style={{ padding: "14px", textAlign: "left" }}>BARRIO</th>
                        <th style={{ padding: "14px", textAlign: "right" }}>TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(conteoBarrio || []).sort((a, b) => b.total - a.total).map((b, index) => (
                        <tr key={b?.name} style={{ borderBottom: "1px solid #f1f5f9", background: index % 2 === 0 ? "white" : "#f8fafc" }}>
                          <td style={{ padding: "14px", fontWeight: "700", color: "#334155", fontSize: "15px" }}>{b?.name}</td>
                          <td style={{ textAlign: "right", fontWeight: "900", color: "#C8102E", fontSize: "16px", paddingRight: "14px" }}>{b?.total.toLocaleString('es-PY')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {userRole === "administrador" && (
        <button onClick={exportarExcel} style={{ position: "fixed", bottom: 25, right: 25, background: "#16a34a", color: "white", padding: isMobile ? "15px" : "18px 35px", borderRadius: isMobile ? "50%" : "50px", fontWeight: "900", border: "none", boxShadow: "0 10px 30px rgba(22,163,74,0.4)", cursor: "pointer", zIndex: 1000, display: "flex", gap: 10, alignItems: "center", fontSize: "16px" }}>
          <span>📊</span> {!isMobile && "DESCARGAR EXCEL"}
        </button>
      )}
    </div>
  );
}