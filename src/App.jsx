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
import "./styles.css";

const BridgeCityBackground = () => (
  <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "360px", overflow: "hidden", zIndex: 1, pointerEvents: "none" }}>

    {/* Skyline de edificios - centro */}
    <svg style={{ position: "absolute", bottom: "58px", left: "15%", width: "70%", height: "190px", opacity: 0.32 }} viewBox="0 0 864 190" preserveAspectRatio="xMidYMax meet">
      <path fill="#78909c" d="
        M0,190 L0,130 L18,130 L18,110 L30,110 L30,100 L38,100 L38,88 L46,88 L46,100 L54,100 L54,110 L66,110 L66,130 L84,130 L84,190
        M90,190 L90,100 L104,100 L104,78 L114,78 L114,65 L122,65 L122,55 L130,55 L130,65 L138,65 L138,78 L148,78 L148,100 L162,100 L162,190
        M170,190 L170,118 L184,118 L184,100 L198,100 L198,190
        M206,190 L206,90 L220,90 L220,65 L230,65 L230,50 L238,50 L238,40 L246,40 L246,50 L254,50 L254,65 L264,65 L264,90 L278,90 L278,190
        M286,190 L286,108 L300,108 L300,88 L314,88 L314,190
        M322,190 L322,78 L336,78 L336,52 L346,52 L346,38 L354,38 L354,28 L362,28 L362,38 L370,38 L370,52 L380,52 L380,78 L394,78 L394,190
        M402,190 L402,102 L416,102 L416,82 L430,82 L430,190
        M438,190 L438,88 L452,88 L452,62 L462,62 L462,48 L470,48 L470,40 L478,40 L478,48 L486,48 L486,62 L496,62 L496,88 L510,88 L510,190
        M518,190 L518,112 L532,112 L532,90 L546,90 L546,190
        M554,190 L554,96 L568,96 L568,74 L582,74 L582,190
        M590,190 L590,122 L604,122 L604,100 L618,100 L618,190
        M626,190 L626,108 L640,108 L640,86 L654,86 L654,190
        M662,190 L662,130 L676,130 L676,110 L690,110 L690,190
        M698,190 L698,118 L712,118 L712,96 L726,96 L726,190
        M734,190 L734,128 L748,128 L748,190
        M756,190 L756,138 L770,138 L770,190
        M778,190 L778,120 L792,120 L792,190
        M800,190 L800,132 L814,132 L814,190
        M820,190 L820,140 L834,140 L834,190
        M840,190 L840,148 L854,148 L854,190
      "/>
    </svg>

    {/* Catedral / Iglesia - izquierda */}
    <svg style={{ position: "absolute", bottom: "58px", left: "3%", width: "9%", height: "210px", opacity: 0.48 }} viewBox="0 0 130 210" preserveAspectRatio="xMidYMax meet">
      <path fill="#607080" d="
        M25,210 L25,120 L40,120 L40,105 L47,105 L47,94 L51,94 L51,82 L54,82 L54,60 L57,60 L57,38 L59,38 L59,10 L60,0 L61,10 L61,38 L63,38 L63,60 L66,60 L66,82 L69,82 L69,94 L73,94 L73,105 L80,105 L80,120 L95,120 L95,210 Z
        M42,120 L42,108 L48,108 L48,120 Z
        M72,120 L72,108 L78,108 L78,120 Z
        M50,94 L50,85 L70,85 L70,94 Z
      "/>
    </svg>

    {/* Puente de la Amistad - derecha */}
    <svg style={{ position: "absolute", bottom: "58px", right: "1%", width: "20%", height: "185px", opacity: 0.42 }} viewBox="0 0 280 185" preserveAspectRatio="xMidYMax meet">
      <path fill="#607898" d="M75,185 L75,38 L92,38 L92,185 Z M185,185 L185,22 L202,22 L202,185 Z"/>
      <rect fill="#607898" x="0" y="112" width="280" height="9"/>
      <path fill="none" stroke="#607898" strokeWidth="1.8" d="
        M83,43 L0,115 M83,48 L28,115 M83,54 L55,115
        M193,27 L280,115 M193,32 L252,115 M193,38 L224,115
        M83,43 L138,115 M83,48 L116,115
        M193,27 L138,115 M193,32 L160,115
      "/>
    </svg>

    {/* Resplandor dorado central */}
    <div style={{
      position: "absolute", bottom: "70px", left: "50%",
      transform: "translateX(-50%)",
      width: "440px", height: "240px",
      background: "radial-gradient(ellipse at 50% 100%, rgba(255,218,45,0.9) 0%, rgba(255,200,35,0.45) 28%, rgba(255,210,60,0.12) 55%, transparent 68%)"
    }} />

    {/* Colinas rojas - IZQUIERDA (capa trasera oscura) */}
    <svg style={{ position: "absolute", bottom: "42px", left: 0, width: "54%", height: "295px" }} viewBox="0 0 780 295" preserveAspectRatio="none">
      <path fill="#8b0e1e" d="M0,295 L0,130 C55,88 110,148 175,112 C232,80 292,128 362,104 C422,84 488,116 552,96 C608,78 662,105 720,88 C745,80 762,84 780,78 L780,295 Z"/>
    </svg>
    {/* Colinas rojas - IZQUIERDA (capa delantera) */}
    <svg style={{ position: "absolute", bottom: "42px", left: 0, width: "54%", height: "295px" }} viewBox="0 0 780 295" preserveAspectRatio="none">
      <path fill="#C8102E" d="M0,295 L0,162 C68,118 142,172 218,144 C286,118 354,162 428,138 C490,118 558,148 626,128 C672,114 718,134 780,118 L780,295 Z"/>
    </svg>

    {/* Colinas rojas - DERECHA (capa trasera oscura) */}
    <svg style={{ position: "absolute", bottom: "42px", right: 0, width: "54%", height: "295px" }} viewBox="0 0 780 295" preserveAspectRatio="none">
      <path fill="#8b0e1e" d="M780,295 L780,130 C725,88 670,148 605,112 C548,80 488,128 418,104 C358,84 292,116 228,96 C172,78 118,105 60,88 C35,80 18,84 0,78 L0,295 Z"/>
    </svg>
    {/* Colinas rojas - DERECHA (capa delantera) */}
    <svg style={{ position: "absolute", bottom: "42px", right: 0, width: "54%", height: "295px" }} viewBox="0 0 780 295" preserveAspectRatio="none">
      <path fill="#C8102E" d="M780,295 L780,162 C712,118 638,172 562,144 C494,118 426,162 352,138 C290,118 222,148 154,128 C108,114 62,134 0,118 L0,295 Z"/>
    </svg>

    {/* Bandera Paraguay - ondas al fondo */}
    <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "54px" }} viewBox="0 0 1440 54" preserveAspectRatio="none">
      <path fill="#C8102E" d="M0,0 C360,16 720,-2 1080,12 C1200,16 1320,10 1440,14 L1440,18 C1320,14 1200,20 1080,16 C720,4 360,22 0,6 Z"/>
      <path fill="#C8102E" d="M0,5 C360,21 720,1 1080,17 C1200,21 1320,13 1440,17 L1440,54 L0,54 Z" opacity="0.97"/>
      <path fill="#f1f5f9" d="M0,17 C360,28 720,13 1080,24 C1200,28 1320,20 1440,24 L1440,36 C1320,32 1200,38 1080,34 C720,24 360,36 0,30 Z"/>
      <path fill="#1e3a8a" d="M0,30 C360,40 720,26 1080,36 C1200,40 1320,34 1440,38 L1440,54 L0,54 Z"/>
    </svg>
  </div>
);




const AccentLeft = () => (
  <svg width="24" height="30" viewBox="0 0 24 30" style={{ opacity: 0.8, marginRight: "5px" }}>
    <path d="M20 2 L8 10 M22 15 L6 15 M20 28 L8 20" stroke="#C8102E" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const AccentRight = () => (
  <svg width="24" height="30" viewBox="0 0 24 30" style={{ opacity: 0.8, marginLeft: "5px" }}>
    <path d="M4 2 L16 10 M2 15 L18 15 M4 28 L16 20" stroke="#C8102E" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const BrilloNumero = () => (
  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "160px", height: "160px", background: "radial-gradient(circle, rgba(200,16,46,0.08) 0%, rgba(200,16,46,0) 65%)", borderRadius: "50%", filter: "blur(12px)", pointerEvents: "none", zIndex: -1 }} />
);

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
  const [conteoGlobal, setConteoGlobal] = useState(0);

  const [formVotante, setFormVotante] = useState({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", fecha_nacimiento: "", telefono: "", observacion: "" });
  const [formEquipo, setFormEquipo] = useState({ nombre: "", telefono: "", rol: "coordinador", zona: "", email: "", password: "" });
  const [editIdVotante, setEditIdVotante] = useState(null);
  const [editIdEquipo, setEditIdEquipo] = useState(null);
  const [busquedaLista, setBusquedaLista] = useState("");
  const [cedulaRapida, setCedulaRapida] = useState("");
  const [resultadoPadron, setResultadoPadron] = useState(null);
  const [busquedaListaGeneral, setBusquedaListaGeneral] = useState("");

  const limpiarEstado = () => {
    setVotantes([]); setEquipo([]); setUserRole(null); setUserName(""); setUserEquipoId(null); setConteoGlobal(0);
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
      const [v, e, conteo] = await Promise.all([
        supabase.from("votantes").select("*").order("created_at", { ascending: false }),
        supabase.from("equipo").select("*").order("created_at", { ascending: false }),
        supabase.rpc("obtener_conteo_total_votantes")
      ]);
      setVotantes(v.data || []);
      setEquipo(e.data || []);
      if (conteo && conteo.data !== null) setConteoGlobal(conteo.data);
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
    if (conteoGlobal > 0) return conteoGlobal;
    const seen = new Set();
    return votantes.filter(v => { const duplicate = seen.has(normalizarCedula(v.cedula)); seen.add(normalizarCedula(v.cedula)); return !duplicate; }).length;
  }, [votantes, conteoGlobal]);

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
    e.preventDefault(); if (userRole !== "administrador") return;
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
      const anchosColumnas = esListaGeneral ? [5, 25, 25, 12, 17, 15, 25, 10, 10, 10, 37, 40] : [5, 25, 25, 12, 17, 15, 25, 10, 10, 10, 37, 20, 40];
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

  if (!session) {
    return <LoginScreen onLogin={async (e, p) => await supabase.auth.signInWithPassword({ email: e, password: p })} loading={loading} />;
  }

  const tabClass = (id) => `tab-button ${activeTab === id ? "tab-button--active" : ""}`;
  const appClass = `app-shell ${isMobile ? "is-mobile" : ""}`;

  return (
    <div className={appClass}>
      <header className="topbar">
        <div className="topbar__left">
          <img src={anrlogo} alt="ANR" className="topbar__logo" />
          {!isMobile && (
            <span className="topbar__system-label">
              Sistema de Gestión – <span className="topbar__badge">Lista 2 / Opción 5</span>
            </span>
          )}
        </div>

        <div className="topbar__right">
          <div className={`topbar__user ${isMobile ? "topbar__user--mobile" : ""}`}>
            <div className="topbar__user-text">
              <div className="topbar__hello">Hola, <span>{userName}</span></div>
              <div className="topbar__role">{userRole}</div>
            </div>
            <UserCircle size={36} color="#94a3b8" strokeWidth={1.5} />
          </div>

          <button onClick={() => supabase.auth.signOut()} className="logout-button">
            <LogOut size={16} color="#C8102E" /> {!isMobile && "Cerrar sesión"}
          </button>
        </div>
      </header>

      {isMobile && (
        <div className="topbar-mobile-label">
          Sistema de Gestión – <span>Lista 2 / Opción 5</span>
        </div>
      )}

      <section className="hero-section">
        <BridgeCityBackground />

        <div className="hero-content">
          <div className="hero-logo-row">
            {!isMobile && <svg width="120" height="2"><rect width="120" height="2" fill="#cbd5e1" /></svg>}
            <div className="hero-logo-wrap">
              <img src={anrlogo} alt="ANR" className="hero-logo" />
            </div>
            {!isMobile && <svg width="120" height="2"><rect width="120" height="2" fill="#cbd5e1" /></svg>}
          </div>

          <div className="hero-pill">
            <span>LISTA 2</span>
            <span className="hero-pill__sep">–</span>
            <span className="hero-pill__secondary">OPCIÓN 5</span>
          </div>

          <h1 className="hero-title">HAGAMOS QUE SUCEDA</h1>

          <button className="hero-candidate-button">
            <div className="hero-candidate-avatar">
              <img src={logocarmona} alt="Carmona" className="hero-candidate-image" />
            </div>
            <span className="hero-candidate-text">DARÍO CARMONA – CONCEJAL 2026</span>
            <span className="hero-candidate-spacer">→</span>
          </button>
        </div>
      </section>

      <div className="counter-wrap">
        <div className="counter-card">
          <div className="counter-card__left">
            <div className="counter-card__icon"><Users size={32} strokeWidth={2.5} /></div>
            <span className="counter-card__label">YA SOMOS</span>
          </div>

          <div className="counter-card__number-wrap">
            <BrilloNumero />
            <AccentLeft />
            <span className="counter-card__number">{totalVotantesGeneral.toLocaleString("es-PY")}</span>
            <AccentRight />
          </div>

          <div className="counter-card__text">
            personas<br />registradas
          </div>

          <div className="counter-card__capsule">
            <div className="counter-card__capsule-icon"><CheckCircle2 color="white" size={14} strokeWidth={4} /></div>
            <span>¡Y vamos por más!</span>
          </div>
        </div>
      </div>

      <nav className="tabs-nav">
        <button onClick={() => setActiveTab("inicio")} className={tabClass("inicio")}>Inicio</button>
        <button onClick={() => setActiveTab("votantes")} className={tabClass("votantes")}>Mis Votantes</button>
        {userRole === "administrador" && (
          <>
            <button onClick={() => setActiveTab("lista_general")} className={tabClass("lista_general")}>Lista General</button>
            <button onClick={() => setActiveTab("equipo")} className={tabClass("equipo")}>Equipo</button>
            <button onClick={() => setActiveTab("reportes")} className={tabClass("reportes")}>Reportes</button>
          </>
        )}
      </nav>

      <main className="main-content">
        {activeTab === "inicio" && (
          <div className="stack-lg">
            <div className="panel panel--padded-lg">
              <h4 className="section-label">🔍 BUSCADOR DE PADRÓN</h4>
              <div className="search-row">
                <input type="text" value={cedulaRapida} onChange={(e) => setCedulaRapida(e.target.value.replace(/\D/g, ""))} placeholder="Ingrese número de cédula..." className="input input--search" />
                <button onClick={buscarEnPadron} className="btn btn--primary btn--search">BUSCAR</button>
              </div>

              {resultadoPadron && (
                <div className="padron-result">
                  <h3 className="padron-result__title">{resultadoPadron?.nombre} {resultadoPadron?.apellido}</h3>
                  <p className="padron-result__meta">
                    Mesa: <span>{resultadoPadron?.mesa}</span> | Orden: <span>{resultadoPadron?.orden}</span> | Seccional: <span>{resultadoPadron?.seccional}</span>
                  </p>
                  <p className="padron-result__place">{resultadoPadron?.local_votacion}</p>
                  <button
                    onClick={() => {
                      const fechaCasteada = resultadoPadron.fecha_nacimiento && resultadoPadron.fecha_nacimiento.includes("-") ? resultadoPadron.fecha_nacimiento.split("-").reverse().join("/") : (resultadoPadron.fecha_nacimiento || "");
                      setFormVotante({ ...formVotante, ...resultadoPadron, fecha_nacimiento: fechaCasteada });
                      setResultadoPadron(null);
                      alert("Datos cargados en el formulario inferior.");
                    }}
                    className="btn btn--success"
                  >
                    COPIAR AL FORMULARIO
                  </button>
                </div>
              )}
            </div>

            <div id="formVotante" className="panel panel--padded-xl">
              <h3 className="panel-title panel-title--center">{editIdVotante ? "Editar Votante" : "Registrar Nuevo Votante"}</h3>
              <form onSubmit={guardarVotante} className="form-stack">
                <div className="form-grid-two">
                  <div>
                    <label className="field-label">NOMBRE *</label>
                    <input type="text" value={formVotante.nombre} onChange={(e) => setFormVotante({ ...formVotante, nombre: e.target.value })} required className="input" />
                  </div>
                  <div>
                    <label className="field-label">APELLIDO *</label>
                    <input type="text" value={formVotante.apellido} onChange={(e) => setFormVotante({ ...formVotante, apellido: e.target.value })} required className="input" />
                  </div>
                </div>

                <div className="form-grid-two">
                  <div>
                    <label className="field-label">CÉDULA DE IDENTIDAD *</label>
                    <input type="text" value={formVotante.cedula} onChange={(e) => setFormVotante({ ...formVotante, cedula: e.target.value.replace(/\D/g, "") })} required className="input" />
                  </div>
                  <div>
                    <label className="field-label">TELÉFONO / WHATSAPP</label>
                    <input type="tel" value={formVotante.telefono} onChange={(e) => setFormVotante({ ...formVotante, telefono: e.target.value.replace(/\D/g, "") })} className="input" />
                  </div>
                </div>

                <div className="form-grid-two">
                  <div>
                    <label className="field-label">FECHA DE NACIMIENTO </label>
                    <input
                      type="text"
                      placeholder="DD/MM/AAAA"
                      value={formVotante.fecha_nacimiento}
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, "");
                        if (v.length > 8) v = v.substring(0, 8);
                        if (v.length > 4) {
                          v = v.replace(/(\d{2})(\d{2})(\d{1,4})/, "$1/$2/$3");
                        } else if (v.length > 2) {
                          v = v.replace(/(\d{2})(\d{1,2})/, "$1/$2");
                        }
                        setFormVotante({ ...formVotante, fecha_nacimiento: v });
                      }}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="field-label">BARRIO *</label>
                    <select value={formVotante.barrio} onChange={(e) => setFormVotante({ ...formVotante, barrio: e.target.value })} required className="input">
                      <option value="">Seleccione un barrio...</option>
                      {LISTA_BARRIOS.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-grid-three form-grid-three--box">
                  <div className="form-grid-three__full-mobile">
                    <label className="field-label field-label--xs">LOCAL DE VOTACIÓN</label>
                    <input type="text" value={formVotante.local_votacion} onChange={(e) => setFormVotante({ ...formVotante, local_votacion: e.target.value })} className="input input--compact" />
                  </div>
                  <div>
                    <label className="field-label field-label--xs">MESA</label>
                    <input type="text" value={formVotante.mesa} onChange={(e) => setFormVotante({ ...formVotante, mesa: e.target.value.replace(/\D/g, "") })} className="input input--compact" />
                  </div>
                  <div>
                    <label className="field-label field-label--xs">ORDEN</label>
                    <input type="text" value={formVotante.orden} onChange={(e) => setFormVotante({ ...formVotante, orden: e.target.value.replace(/\D/g, "") })} className="input input--compact" />
                  </div>
                </div>

                <div>
                  <label className="field-label">OBSERVACIÓN / COMENTARIO</label>
                  <input type="text" value={formVotante.observacion} onChange={(e) => setFormVotante({ ...formVotante, observacion: e.target.value })} className="input" />
                </div>

                <div className="action-row">
                  {editIdVotante && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditIdVotante(null);
                        setFormVotante({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", fecha_nacimiento: "", telefono: "", observacion: "" });
                      }}
                      className="btn btn--ghost btn--flex-1"
                    >
                      CANCELAR
                    </button>
                  )}
                  <button type="submit" disabled={loading} className="btn btn--primary btn--voter-submit">
                    {loading ? "PROCESANDO..." : editIdVotante ? "GUARDAR CAMBIOS" : "REGISTRAR VOTANTE"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "votantes" && (
          <div className="panel panel--padded-md panel--shadow-strong">
            <h3 className="panel-title">Mi Lista de Votantes</h3>
            <input type="text" placeholder="🔍 Buscar por nombre o cédula..." value={busquedaLista} onChange={(e) => setBusquedaLista(e.target.value)} className="input input--search mb-25" />
            <div className="table-scroll">
              <div className="table-viewport table-viewport--votantes">
                <table className="table">
                  <thead className="table-head table-head--light">
                    <tr className="table-head__row table-head__row--uppercase">
                      <th>NOMBRE</th><th>CÉDULA</th><th>TELÉFONO</th><th className="ta-center">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(votantesUnicos || []).filter((v) => (v?.nombre + v?.apellido + v?.cedula).toLowerCase().includes(busquedaLista.toLowerCase())).map((v) => (
                      <tr key={v?.id} className="table-row">
                        <td className="table-cell table-cell--strong">{v?.nombre} {v?.apellido}<br /><small className="text-red-muted">{v?.barrio}</small></td>
                        <td className="table-cell table-cell--muted">{v?.cedula}</td>
                        <td className="table-cell table-cell--muted">{v?.telefono}</td>
                        <td className="table-cell table-cell--actions">
                          <button onClick={() => { setFormVotante({ ...v, fecha_nacimiento: v.fecha_nacimiento && v.fecha_nacimiento.includes("-") ? v.fecha_nacimiento.split("-").reverse().join("/") : (v.fecha_nacimiento || "") }); setEditIdVotante(v.id); setActiveTab("inicio"); setTimeout(() => document.getElementById("formVotante").scrollIntoView({ behavior: "smooth" }), 100); }} className="mini-btn mini-btn--edit">EDITAR</button>
                          <button onClick={async () => { if (confirm(`¿Borrar a ${v.nombre}?`)) { setLoading(true); const { error } = await supabase.from("votantes").delete().eq("id", v.id); if (!error) { setVotantes(prev => prev.filter(item => item.id !== v.id)); } else { alert("Error: " + error.message); } setLoading(false); } }} className="mini-btn mini-btn--delete">BORRAR</button>
                        </td>
                      </tr>
                    ))}
                    {votantesUnicos.length === 0 && <tr><td colSpan="4" className="table-empty">Aún no has registrado votantes.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "lista_general" && userRole === "administrador" && (
          <div className="panel panel--padded-md">
            <h3 className="panel-title">Control de Asistencia General (Día D)</h3>
            <input type="text" placeholder="🔍 Buscar por cédula..." value={busquedaListaGeneral} onChange={(e) => setBusquedaListaGeneral(e.target.value.replace(/\D/g, ""))} className="input input--search mb-25" />

            <div className="table-scroll mb-30">
              <div className="table-viewport table-viewport--general">
                <table className="table">
                  <thead className="table-head table-head--light">
                    <tr className="table-head__row table-head__row--uppercase">
                      <th>NOMBRE COMPLETO</th>
                      <th>CÉDULA</th>
                      <th>UBICACIÓN</th>
                      <th className="ta-center">¿YA VOTÓ?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(listaGeneralAdmin || []).filter((v) => busquedaListaGeneral ? v.cedula.includes(busquedaListaGeneral) : true).slice(0, 50).map((v) => (
                      <tr key={v?.id} className="table-row">
                        <td className="table-cell table-cell--strong">{v?.nombre} {v?.apellido}<br /><small className="text-muted">Captado por: {v.por_parte_de_nombre}</small></td>
                        <td className="table-cell table-cell--muted">{v?.cedula}</td>
                        <td className="table-cell table-cell--muted table-cell--small">Mesa: {v.mesa} | Orden: {v.orden}<br />{v.local_votacion}</td>
                        <td className="table-cell ta-center">
                          <input type="checkbox" checked={v.ha_votado || false} onChange={async (e) => { const checked = e.target.checked; const { error } = await supabase.from("votantes").update({ ha_votado: checked }).eq("id", v.id); if (!error) { setVotantes(prev => prev.map(item => item.id === v.id ? { ...item, ha_votado: checked } : item)); } else { alert("Error: " + error.message); } }} className="vote-checkbox" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="summary-card">
              <h4 className="summary-card__title">RESUMEN DE PARTICIPACIÓN</h4>
              <div className="summary-card__percent-row">
                <span className="summary-card__percent">{listaGeneralAdmin.length > 0 ? Math.round((listaGeneralAdmin.filter(v => v.ha_votado).length / listaGeneralAdmin.length) * 100) : 0}%</span>
                <span className="summary-card__text-small">participación</span>
              </div>
              <p className="summary-card__text">
                Han votado <span>{listaGeneralAdmin.filter(v => v.ha_votado).length.toLocaleString("es-PY")}</span> de <strong>{listaGeneralAdmin.length.toLocaleString("es-PY")}</strong> personas registradas.
              </p>
            </div>
          </div>
        )}

        {activeTab === "equipo" && userRole === "administrador" && (
          <div className="stack-xl">
            <div className="panel panel--padded-lg">
              <h3 className="panel-title panel-title--center">Gestión de Equipo</h3>
              <form onSubmit={guardarEquipo} className="form-stack">
                <input type="text" placeholder="Nombre completo" value={formEquipo.nombre} onChange={(e) => setFormEquipo({ ...formEquipo, nombre: e.target.value })} required className="input" />
                <div className="form-grid-two">
                  <input type="text" placeholder="Teléfono" value={formEquipo.telefono} onChange={(e) => setFormEquipo({ ...formEquipo, telefono: e.target.value.replace(/\D/g, "") })} className="input" />
                  <input type="text" placeholder="Zona o Barrio" value={formEquipo.zona} onChange={(e) => setFormEquipo({ ...formEquipo, zona: e.target.value })} className="input" />
                </div>
                {!editIdEquipo && (
                  <div className="credentials-box">
                    <p className="credentials-box__title">CREDENCIALES DE ACCESO</p>
                    <div className="form-grid-two form-grid-two--compact-gap">
                      <input type="email" placeholder="Correo electrónico" value={formEquipo.email} onChange={(e) => setFormEquipo({ ...formEquipo, email: e.target.value })} required className="input input--sm" />
                      <input type="password" placeholder="Contraseña (mín 6 letras)" value={formEquipo.password} onChange={(e) => setFormEquipo({ ...formEquipo, password: e.target.value })} required minLength={6} className="input input--sm" />
                    </div>
                  </div>
                )}
                <select value={formEquipo.rol} onChange={(e) => setFormEquipo({ ...formEquipo, rol: e.target.value })} required className="input">
                  <option value="coordinador">Rol: Coordinador</option>
                  <option value="administrador">Rol: Administrador</option>
                </select>
                <div className="action-row action-row--mt-sm">
                  {editIdEquipo && <button type="button" onClick={() => { setEditIdEquipo(null); setFormEquipo({ nombre: "", telefono: "", rol: "coordinador", zona: "", email: "", password: "" }); }} className="btn btn--ghost btn--flex-1 btn--team-cancel">CANCELAR</button>}
                  <button type="submit" disabled={loading} className="btn btn--dark btn--team-submit">{loading ? "PROCESANDO..." : editIdEquipo ? "GUARDAR CAMBIOS" : "CREAR USUARIO"}</button>
                </div>
              </form>
            </div>

            <div className="panel panel--padded-md">
              <h4 className="subpanel-title">MIEMBROS ACTIVOS</h4>
              <div className="table-scroll">
                <div className="table-viewport table-viewport--equipo">
                  <table className="table">
                    <thead className="table-head table-head--light">
                      <tr className="table-head__row table-head__row--sm">
                        <th>NOMBRE / ROL</th><th>CONTACTO</th><th className="ta-center">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(equipo || []).map((m) => (
                        <tr key={m?.id} className="table-row">
                          <td className="table-cell table-cell--strong">{m?.nombre}<br /><small className={m?.rol === "administrador" ? "role-tag role-tag--admin" : "role-tag"}>{m?.rol}</small></td>
                          <td className="table-cell table-cell--muted">{m?.telefono}<br /><small>{m?.zona}</small></td>
                          <td className="table-cell table-cell--actions">
                            <button onClick={() => { setFormEquipo(m); setEditIdEquipo(m.id); window.scrollTo(0, 0); }} className="mini-btn mini-btn--edit mini-btn--tiny">EDITAR</button>
                            <button onClick={async () => { 
                                if (confirm(`¿Borrar a ${m.nombre}? Esta acción eliminará su acceso y sus datos permanentemente.`)) { 
                                    setLoading(true); 
                                    try { 
                                        const { data, error } = await supabase.rpc('eliminar_usuario_completo', { target_equipo_id: m.id });
                                        if (error) throw error;
                                        alert("✅ Usuario y acceso eliminados correctamente");
                                        cargarDatos(); 
                                    } catch (error) { 
                                        alert("Error: " + error.message); 
                                    } finally {
                                        setLoading(false); 
                                    }
                                } 
                            }} className="mini-btn mini-btn--delete mini-btn--tiny">BORRAR</button>
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
          <div className="stack-xl">
            <div className="panel panel--padded-30">
              <h3 className="panel-title">Ranking (Top 10)</h3>
              {(rendimientoEquipo || []).slice(0, 10).map((m, index) => (
                <div key={m?.id} className={`ranking-card ${index < 3 ? "ranking-card--top" : ""}`}>
                  <div className="ranking-card__header">
                    <div className="ranking-card__name-row">
                      <span className="ranking-card__position">#{index + 1}</span>
                      <span className="ranking-card__name">{m?.nombre}</span>
                    </div>
                    <span className="ranking-card__count">{m?.cantidad.toLocaleString("es-PY")} <small>votantes</small></span>
                  </div>
                  <div className="ranking-card__bar-bg">
                    <div className="ranking-card__bar-fill" style={{ width: `${m?.porcentaje}%` }}></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="panel panel--padded-25">
              <h3 className="panel-title">Distribución por Barrio</h3>
              <div className="table-scroll">
                <table className="table table--min-400">
                  <thead className="table-head table-head--red">
                    <tr className="table-head__row table-head__row--white table-head__row--uppercase">
                      <th>BARRIO</th>
                      <th className="ta-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(conteoBarrio || []).sort((a, b) => b.total - a.total).map((b, index) => (
                      <tr key={b?.name} className={`table-row ${index % 2 === 0 ? "" : "table-row--alt"}`}>
                        <td className="table-cell table-cell--neighborhood">{b?.name}</td>
                        <td className="table-cell table-cell--total">{b?.total.toLocaleString("es-PY")}</td>
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
        <button onClick={exportarExcel} className={`floating-excel-btn ${isMobile ? "floating-excel-btn--mobile" : ""}`}>
          <span>📊</span> {!isMobile && "DESCARGAR EXCEL"}
        </button>
      )}
    </div>
  );
}