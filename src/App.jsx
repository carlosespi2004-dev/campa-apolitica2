import { useEffect, useMemo, useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { LogOut, UserCircle, Users, User, CheckCircle2 } from "lucide-react";
import { supabase, supabaseAuth } from "./lib/supabase";
import { normalizarCedula, LISTA_BARRIOS } from "./utils/helpers";
import { ANRLogo, GreenHeart } from "./components/Logos";
import { LoginScreen } from "./components/LoginScreen";
import logocarmona from "./img/logocarmona.png";
import anrlogo from "./img/anrlogo.png";

// --- SVGs Decorativos para el Diseño Visual ---
const BackgroundWaves = () => (
  <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "250px", zIndex: 1, pointerEvents: "none" }} viewBox="0 0 1440 250" preserveAspectRatio="none">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#991b1b" />
        <stop offset="50%" stopColor="#dc2626" />
        <stop offset="100%" stopColor="#991b1b" />
      </linearGradient>
    </defs>
    <path fill="#e2e8f0" opacity="0.4" d="M150,180 L150,140 L170,140 L170,130 L190,130 L190,150 L210,150 L210,180 Z M350,180 L350,120 L380,120 L380,180 Z M850,180 L850,110 L890,110 L890,180 Z M1150,180 L1150,130 L1170,130 L1170,100 L1190,100 L1190,180 Z M1250,180 Q1300,130 1350,180 Z"></path>
    <path fill="none" stroke="#1e3a8a" strokeWidth="4" d="M0,180 C320,240 420,120 720,160 C1020,200 1220,130 1440,170" opacity="0.6"></path>
    <circle cx="720" cy="180" r="100" fill="#fef08a" opacity="0.4" filter="blur(20px)" />
    <path fill="url(#grad1)" d="M0,200 C480,280 720,120 1440,190 L1440,250 L0,250 Z"></path>
    <path fill="#7f1d1d" d="M0,220 C480,290 820,160 1440,220 L1440,250 L0,250 Z"></path>
  </svg>
);

const AccentLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" style={{ position: "absolute", left: -15, top: "25%", opacity: 0.8 }}>
    <path d="M20 4 L10 10 M22 12 L10 12 M20 20 L10 14" stroke="#C8102E" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
  </svg>
);

const AccentRight = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" style={{ position: "absolute", right: -15, top: "25%", opacity: 0.8 }}>
    <path d="M4 4 L14 10 M2 12 L14 12 M4 20 L14 14" stroke="#C8102E" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
  </svg>
);

const ANRLogoSmall = () => (
  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
    <div style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: "50%" }}>
      <div style={{ transform: "scale(0.4)" }}>
        <ANRLogo />
      </div>
    </div>
    <span style={{ fontSize: "14px", fontWeight: "600", color: "#C8102E" }}>ANR</span>
  </div>
);

const UserAvatar = ({ name, role, isMobile }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingLeft: isMobile ? 0 : "20px", borderLeft: isMobile ? "none" : "1px solid #e2e8f0" }}>
    <div style={{ textAlign: isMobile ? "center" : "left" }}>
      <div style={{ fontSize: "12px", color: "#64748b" }}>Hola, <span style={{ fontWeight: "700", color: "#1e293b" }}>{name}</span></div>
      <div style={{ color: "#64748b", fontSize: "11px", fontWeight: "500", textTransform: "capitalize", marginTop: "1px" }}>
        {role}
      </div>
    </div>
    <UserCircle size={32} color="#94a3b8" strokeWidth={1.5} />
  </div>
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

  const [formVotante, setFormVotante] = useState({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", fecha_nacimiento: "", telefono: "", observacion: "" });
  const [formEquipo, setFormEquipo] = useState({ nombre: "", telefono: "", rol: "coordinador", zona: "", email: "", password: "" });
  const [editIdVotante, setEditIdVotante] = useState(null);
  const [editIdEquipo, setEditIdEquipo] = useState(null);
  const [busquedaLista, setBusquedaLista] = useState("");
  const [cedulaRapida, setCedulaRapida] = useState("");
  const [resultadoPadron, setResultadoPadron] = useState(null);
  const [busquedaListaGeneral, setBusquedaListaGeneral] = useState("");

  const limpiarEstado = () => {
    setVotantes([]);
    setEquipo([]);
    setUserRole(null);
    setUserName("");
    setUserEquipoId(null);
    setActiveTab("inicio");
    setFormVotante({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", fecha_nacimiento: "", telefono: "", observacion: "" });
    setFormEquipo({ nombre: "", telefono: "", rol: "coordinador", zona: "", email: "", password: "" });
    setEditIdVotante(null);
    setEditIdEquipo(null);
    setBusquedaLista("");
    setCedulaRapida("");
    setResultadoPadron(null);
    setBusquedaListaGeneral("");
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) limpiarEstado();
      setSession(data.session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        limpiarEstado();
      }
      setSession(session);
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) {
      cargarRolYDatos();
    }
  }, [session]);

  useEffect(() => {
    let timeoutId;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      if (session) {
        timeoutId = setTimeout(() => {
          supabase.auth.signOut();
        }, 15 * 60 * 1000); 
      }
    };

    if (session) {
      resetTimer(); 
      const eventos = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
      
      eventos.forEach((evento) => {
        window.addEventListener(evento, resetTimer);
      });

      return () => {
        clearTimeout(timeoutId);
        eventos.forEach((evento) => {
          window.removeEventListener(evento, resetTimer);
        });
      };
    }
  }, [session]);

  async function cargarRolYDatos() {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("rol, nombre, equipo_id")
        .eq("user_id", session.user.id)
        .single();
      
      setUserRole(profile?.rol || "coordinador");
      setUserName(profile?.nombre || "Usuario");
      setUserEquipoId(profile?.equipo_id || null);
      await cargarDatos();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function cargarDatos() {
    try {
      const [v, e] = await Promise.all([
        supabase.from("votantes").select("*").order("created_at", { ascending: false }),
        supabase.from("equipo").select("*").order("created_at", { ascending: false }),
      ]);
      setVotantes(v.data || []);
      setEquipo(e.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  const votantesFiltrados = useMemo(() => {
    return votantes.filter(v => v.created_by === session?.user?.id);
  }, [votantes, session]);

  const votantesUnicos = useMemo(() => {
    const seen = new Set();
    return votantesFiltrados.filter(v => {
      const duplicate = seen.has(normalizarCedula(v.cedula));
      seen.add(normalizarCedula(v.cedula));
      return !duplicate;
    });
  }, [votantesFiltrados]);

  const rendimientoEquipo = useMemo(() => {
    const total = votantes?.length || 0;
    const captadoresMap = new Map();

    (equipo || []).forEach((m) => {
      captadoresMap.set(m.nombre, { id: m.id, nombre: m.nombre, cantidad: 0 });
    });

    (votantes || []).forEach((v) => {
      const nombre = v.por_parte_de_nombre;
      if (nombre) {
        if (!captadoresMap.has(nombre)) {
          captadoresMap.set(nombre, { id: v.created_by || nombre, nombre: nombre, cantidad: 0 });
        }
        captadoresMap.get(nombre).cantidad += 1;
      }
    });

    return Array.from(captadoresMap.values())
      .map((m) => ({ ...m, porcentaje: total > 0 ? Math.round((m.cantidad / total) * 100) : 0 }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [votantes, equipo]);

  const totalVotantesGeneral = useMemo(() => {
    const seen = new Set();
    return votantes.filter(v => {
      const duplicate = seen.has(normalizarCedula(v.cedula));
      seen.add(normalizarCedula(v.cedula));
      return !duplicate;
    }).length;
  }, [votantes]); 

  const listaGeneralAdmin = useMemo(() => {
    const seen = new Set();
    return votantes.filter(v => {
      const duplicate = seen.has(normalizarCedula(v.cedula));
      seen.add(normalizarCedula(v.cedula));
      return !duplicate;
    });
  }, [votantes]);

  const conteoBarrio = useMemo(() => {
    const counts = {};
    const fuenteDatos = userRole === "administrador" ? votantes : votantesFiltrados;
    
    (fuenteDatos || []).forEach((v) => {
      const b = v.barrio || "Sin barrio";
      counts[b] = (counts[b] || 0) + 1;
    });
    return Object.entries(counts).map(([name, total]) => ({ name, total }));
  }, [votantes, votantesFiltrados, userRole]);

  async function buscarEnPadron() {
    const limpia = normalizarCedula(cedulaRapida);
    if (!limpia) return;
    setLoading(true);
    setResultadoPadron(null);

    const { data, error } = await supabase
      .from("padron_importado")
      .select("*")
      .or(`cedula_limpia.eq.${limpia},cedula.eq.${cedulaRapida}`)
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === "42501") alert("Error de permisos: No tienes acceso al padrón.");
      else alert("Error de consulta: " + error.message);
    } else if (data) {
      setResultadoPadron(data);
    } else {
      alert("Cédula no encontrada en el padrón");
    }
    setLoading(false);
  }

  async function guardarVotante(e) {
    e.preventDefault();
    
    const cedulaLimpiaActual = normalizarCedula(formVotante.cedula);
    const existeEnMiLista = votantes.some(v => 
      normalizarCedula(v.cedula) === cedulaLimpiaActual && 
      v.created_by === session?.user?.id &&
      v.id !== editIdVotante
    );
    
    if (existeEnMiLista) {
      return alert("Ya has registrado a esta persona en tu lista.");
    }

    setLoading(true);
    
    const { id, created_at, ...datosLimpios } = formVotante;

    const payload = {
      ...datosLimpios,
      fecha_nacimiento: datosLimpios.fecha_nacimiento && datosLimpios.fecha_nacimiento.includes("/") ? datosLimpios.fecha_nacimiento.split("/").reverse().join("-") : datosLimpios.fecha_nacimiento || null, 
      cedula_limpia: cedulaLimpiaActual,
      por_parte_de_nombre: userName,
      equipo_id: userEquipoId, 
      user_id: session?.user?.id, 
      created_by: session?.user?.id 
    };

    const { error } = editIdVotante
      ? await supabase.from("votantes").update(payload).eq("id", editIdVotante)
      : await supabase.from("votantes").insert([payload]);

    if (!error) {
      setFormVotante({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", fecha_nacimiento: "", telefono: "", observacion: "" });
      setEditIdVotante(null);
      cargarDatos();
      alert("¡Guardado!");
    } else {
      alert("Error al guardar: " + error.message);
      console.error(error);
    }
    setLoading(false);
  }

  async function guardarEquipo(e) {
    e.preventDefault();
    if(userRole !== "administrador") return;
    setLoading(true);

    let authUserId = null;
    if (!editIdEquipo) {
      const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
        email: formEquipo.email,
        password: formEquipo.password,
      });
      if (authError) {
        alert("❌ El correo electrónico ya está en uso " + authError.message);
        setLoading(false);
        return;
      }
      authUserId = authData.user.id;
    }

    const payloadEquipo = {
      nombre: formEquipo.nombre,
      telefono: formEquipo.telefono,
      zona: formEquipo.zona,
      rol: formEquipo.rol,
      ...(authUserId && { user_id: authUserId })
    };

    if (editIdEquipo) {
      const { error: errorEquipo } = await supabase.from("equipo").update(payloadEquipo).eq("id", editIdEquipo);
      const { error: errorPerfil } = await supabase.from("profiles").update({
        nombre: formEquipo.nombre,
        rol: formEquipo.rol,
        telefono: formEquipo.telefono,
        zona: formEquipo.zona
      }).eq("equipo_id", editIdEquipo);

      if (errorEquipo || errorPerfil) {
        alert("❌ Error al actualizar: " + (errorEquipo?.message || errorPerfil?.message));
      } else {
        setFormEquipo({ nombre: "", telefono: "", rol: "coordinador", zona: "", email: "", password: "" });
        setEditIdEquipo(null);
        cargarDatos();
        alert("✅ ¡Datos actualizados con éxito!");
      }
    } else {
      const { data: nuevoEquipo, error: errorEquipo } = await supabase
        .from("equipo")
        .insert([payloadEquipo])
        .select(); 

      if (errorEquipo) {
        alert("❌ Error al guardar equipo: " + errorEquipo.message);
      } else if (nuevoEquipo && nuevoEquipo.length > 0 && authUserId) {
        const payloadProfile = {
          id: authUserId,
          user_id: authUserId,
          equipo_id: nuevoEquipo[0].id,
          nombre: formEquipo.nombre,
          rol: formEquipo.rol,
          telefono: formEquipo.telefono,
          zona: formEquipo.zona
        };
        const { error: errorPerfil } = await supabase.from("profiles").insert([payloadProfile]);
        if (errorPerfil) {
          alert("⚠️ Hubo un error al crear su perfil de seguridad.");
        } else {
          setFormEquipo({ nombre: "", telefono: "", rol: "coordinador", zona: "", email: "", password: "" });
          setEditIdEquipo(null);
          cargarDatos();
          alert("✅ ¡Usuario creado con éxito!");
        }
      }
    }
    setLoading(false);
  }

  const exportarExcel = async () => {
    if (userRole !== "administrador") return;

    const workbook = new ExcelJS.Workbook();
    const crearHoja = (nombreHoja, lista) => {
      const sheet = workbook.addWorksheet(nombreHoja.substring(0, 31));
      const esListaGeneral = nombreHoja === "LISTA GENERAL";
      const colFinal = esListaGeneral ? "L" : "M";

      sheet.addRow(["HAGAMOS QUE SUCEDA"]);
      sheet.mergeCells(`A1:${colFinal}1`);
      const r1 = sheet.getRow(1);
      r1.height = 30;
      r1.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8102E" } };
      r1.getCell(1).font = { color: { argb: "FFFFFFFF" }, size: 18, bold: true };
      r1.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
      
      sheet.addRow(["Darío Carmona Concejal 2026"]);
      sheet.mergeCells(`A2:${colFinal}2`);
      const r2 = sheet.getRow(2);
      r2.height = 20;
      r2.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8102E" } };
      r2.getCell(1).font = { color: { argb: "FFFFFFFF" }, size: 12, bold: true };
      r2.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
      
      sheet.addRow([]); 
      
      const anchosColumnas = esListaGeneral 
        ? [5, 25, 25, 12, 17, 15, 20, 10, 10, 10, 37, 40] 
        : [5, 25, 25, 12, 17, 15, 20, 10, 10, 10, 37, 20, 40];
      
      anchosColumnas.forEach((ancho, index) => {
        sheet.getColumn(index + 1).width = ancho;
      });

      const headerRow = sheet.getRow(4);
      const headerNombres = esListaGeneral
        ? ["Nro", "Nombre", "Apellido", "Cedula", "Fecha Nacimiento", "Teléfono", "Barrio", "Orden", "Mesa", "Seccional", "Local", "Observación"]
        : ["Nro", "Nombre", "Apellido", "Cedula", "Fecha Nacimiento", "Teléfono", "Barrio", "Orden", "Mesa", "Seccional", "Local", "Captado por", "Observación"];
      
      headerRow.values = headerNombres;

      headerRow.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8102E" } };
        c.font = { color: { argb: "FFFFFFFF" }, bold: true };
        c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      });

      lista.forEach((v, i) => {
        const fechaFormateada = v.fecha_nacimiento && v.fecha_nacimiento.includes("-") ? v.fecha_nacimiento.split("-").reverse().join("/") : (v.fecha_nacimiento || "");
        
        const valoresFila = esListaGeneral
          ? [i + 1, v.nombre, v.apellido, v.cedula, fechaFormateada, v.telefono, v.barrio, v.orden, v.mesa, v.seccional, v.local_votacion, v.observacion]
          : [i + 1, v.nombre, v.apellido, v.cedula, fechaFormateada, v.telefono, v.barrio, v.orden, v.mesa, v.seccional, v.local_votacion, v.por_parte_de_nombre, v.observacion];
        
        const row = sheet.addRow(valoresFila);
        const color = i % 2 !== 0 ? "FFFEE2E2" : "FFFFFFFF";
        row.eachCell((c) => {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
          c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
          c.alignment = { vertical: "middle", horizontal: "left" };
        });
      });
    };
    
    const todosVotantesUnicos = (() => {
      const seen = new Set();
      return votantes.filter(v => {
        const duplicate = seen.has(normalizarCedula(v.cedula));
        seen.add(normalizarCedula(v.cedula));
        return !duplicate;
      });
    })();

    crearHoja("LISTA GENERAL", todosVotantesUnicos);
    
    const nombresCaptadores = [...new Set(votantes.map((v) => v.por_parte_de_nombre).filter(Boolean))];
    
    nombresCaptadores.forEach((nombre) => {
      const datosMiembro = votantes.filter((v) => v.por_parte_de_nombre === nombre);
      if (datosMiembro.length > 0) crearHoja(nombre, datosMiembro);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "Campaña_Dario_Carmona.xlsx");
  };

  if (!session) {
    return (
      <LoginScreen
        onLogin={async (e, p) =>
          await supabase.auth.signInWithPassword({ email: e, password: p })
        }
        loading={loading}
      />
    );
  }

  const tabStyle = (id) => ({
    flex: 1,
    padding: "18px 5px",
    border: "none",
    background: activeTab === id ? "#C8102E" : "#f1f5f9",
    color: activeTab === id ? "white" : "#64748b",
    fontWeight: "900",
    fontSize: isMobile ? "10px" : "13px",
    textTransform: "uppercase",
    cursor: "pointer",
    borderRadius: "15px 15px 0 0",
    transition: "0.3s",
    margin: "0 2px",
    outline: "none",
  });

  return (
    <div style={{ background: "white", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      
      {/* ------------------ ENCABEZADO SUPERIOR RÉPLICA EXACTA ------------------ */}
      <header style={{ background: "white", padding: "10px 25px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 100 }}>
        
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "14px", color: "#64748b", fontWeight: "500" }}>
            Sistema de Gestión – <span style={{ background: "#C8102E", color: "white", padding: "2px 10px", borderRadius: "10px", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", verticalAlign: "middle", marginLeft: "5px" }}>Lista 2 / Opción 5</span>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "25px" }}>
          <UserAvatar name={userName} role={userRole === "administrador" ? "Administrador" : "Coordinador"} isMobile={isMobile} />
          <button 
            onClick={() => supabase.auth.signOut()} 
            style={{ background: "white", color: "#1e293b", padding: "8px 20px", borderRadius: "8px", border: "1px solid #e2e8f0", fontWeight: "600", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <LogOut size={16} style={{ verticalAlign: "middle", marginRight: "8px" }} /> {!isMobile && "Cerrar sesión"}
          </button>
        </div>
      </header>

      {/* ------------------ SECCIÓN PRINCIPAL HERO RÉPLICA EXACTA ------------------ */}
      <section style={{ position: "relative", width: "100%", background: "#f8fafc", padding: isMobile ? "40px 15px 140px 15px" : "60px 20px 160px 20px", textAlign: "center", overflow: "hidden" }}>
        
        <BackgroundWaves />

        <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", maxWidth: "800px", margin: "0 auto" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "25px" }}>
           <img src={anrlogo} alt="ANR" style={{ width: "90px", height: "90px", borderRadius: "50%", background: "white", padding: "5px", boxShadow: "0 5px 15px rgba(0,0,0,0.05)", marginBottom: "25px" }} />

          </div>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: "#fef2f2", padding: "6px 20px", borderRadius: "30px", color: "#C8102E", fontWeight: "900", fontSize: isMobile ? "15px" : "18px", marginBottom: "15px", border: "2px solid #C8102E" }}>
            <span>LISTA 2</span>
            <span>—</span>
            <span>OPCIÓN 5</span>
          </div>

          <h1 style={{ fontFamily: "'Inter', sans-serif", fontStyle: "italic", fontWeight: "900", color: "#C8102E", fontSize: isMobile ? "40px" : "68px", margin: "0 0 10px 0", textTransform: "uppercase", letterSpacing: "-1.5px", textShadow: "1px 1px 0px rgba(0,0,0,0.05)", lineHeight: 1.1 }}>
            HAGAMOS QUE SUCEDA
          </h1>
          
          <p style={{ fontSize: isMobile ? "16px" : "19px", color: "#1e3a8a", margin: "0 0 45px 0", fontWeight: "500", maxWidth: "600px" }}>
            Unidos por el cambio que nuestra ciudad necesita
          </p>

          <button style={{ background: "#C8102E", borderRadius: "50px", padding: "10px 25px 10px 10px", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 10px 25px rgba(200,16,46,0.3)", width: isMobile ? "100%" : "auto", maxWidth: "520px", border: "none", cursor: "default" }}>
            <div style={{ background: "white", borderRadius: "50%", width: "42px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* CAMBIO REALIZADO: Se reemplazó el componente <GreenHeart /> por la etiqueta <img /> directa llamando a logocarmona para que vuelva a mostrarse correctamente */}
              <img src={logocarmona} alt="Logo Carmona" style={{ width: "24px", height: "24px", borderRadius: "50%" }} />
            </div>
            <span style={{ color: "white", fontWeight: "800", fontSize: isMobile ? "16px" : "19px", flex: 1, textAlign: "center", letterSpacing: "0.5px" }}>
              DARÍO CARMONA – CONCEJAL 2026
            </span>
            <span style={{ color: "white", fontSize: "20px", fontWeight: "bold" }}>→</span>
          </button>
          
          <div style={{ fontSize: "13px", color: "#1e293b", marginTop: "25px", fontWeight: "600" }}>
            Ir al panel / Ver perfil / Gestionar campaña
          </div>
        </div>
      </section>

      {/* ------------------ TARJETA DEL CONTADOR RÉPLICA EXACTA ------------------ */}
      <div style={{ position: "relative", zIndex: 20, marginTop: "-70px", display: "flex", justifyContent: "center", padding: "0 15px", marginBottom: "40px" }}>
        <div style={{ background: "white", borderRadius: "20px", padding: isMobile ? "30px 20px" : "25px 45px", display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: "center", gap: isMobile ? "20px" : "35px", boxShadow: "0 15px 45px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0", maxWidth: "800px", width: "100%" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div style={{ background: "#C8102E", color: "white", width: isMobile ? "50px" : "60px", height: isMobile ? "50px" : "60px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 5px 15px rgba(200,16,46,0.2)" }}>
              <Users size={isMobile ? 26 : 30} strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: "900", fontSize: isMobile ? "24px" : "30px", color: "#1e293b", fontStyle: "italic" }}>YA SOMOS</span>
          </div>

          <div style={{ position: "relative", padding: "0 10px", display: "flex", alignItems: "center", justifyContent: "center", flex: isMobile ? "none" : 1 }}>
            <BrilloNumero />
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: "900", fontSize: isMobile ? "70px" : "96px", color: "#C8102E", fontStyle: "italic", lineHeight: 0.8, letterSpacing: "-3px" }}>
              {totalVotantesGeneral.toLocaleString('es-PY')}
            </span>
          </div>

          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: "800", color: "#475569", fontSize: isMobile ? "16px" : "19px", lineHeight: 1.2, textAlign: isMobile ? "center" : "left" }}>
            personas<br/>registradas
          </div>

          {/* Pequeña cápsula inferior */}
          <div style={{ position: "absolute", bottom: "-16px", left: "50%", transform: "translateX(-50%)", background: "#fee2e2", border: "4px solid white", borderRadius: "30px", padding: "5px 22px", display: "flex", alignItems: "center", gap: "7px", boxShadow: "0 5px 15px rgba(0,0,0,0.05)", width: "max-content" }}>
            <div style={{ background: "#C8102E", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", width: "18px", height: "18px" }}>
              <CheckCircle2 color="white" size={13} strokeWidth={4} />
            </div>
            <span style={{ color: "#C8102E", fontWeight: "800", fontSize: "14px" }}>¡Y vamos por más!</span>
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginBottom: "40px", fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>
        Partido Colorado - ANR &nbsp;|&nbsp; Lista 2 &nbsp;|&nbsp; Opción 5 &nbsp;|&nbsp; Elecciones Municipales 2026
      </div>
      
      {/* ------------------ FIN RÉPLICA VISUAL ------------------ */}

      <nav style={{ display: "flex", background: "#f1f5f9", padding: "10px 10px 0 10px", sticky: "top", top: 0, zIndex: 90, borderBottom: "1px solid #e2e8f0" }}>
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
            <div className="card" style={{ background: "white", padding: isMobile ? 20 : 35, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", border: "1px solid #f1f5f9" }}>
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

            <div id="formVotante" className="card" style={{ background: "white", padding: isMobile ? 25 : 40, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", border: "1px solid #f1f5f9" }}>
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
                  <div><label style={{ fontWeight: "700", fontSize: "12px", color: "#64748b", marginBottom: "5px", display: "block" }}>BARRIO *</label><select value={formVotante.barrio} onChange={(e) => setFormVotante({ ...formVotante, barrio: e.target.value })} required style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px", background: "white", outline: "none", appearance: "none" }}><option value="">Seleccione un barrio...</option>{LISTA_BARRIOS.map((b) => <option key={b} value={b}>{b}</option>)}</select></div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 15, padding: "15px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                   <div style={{gridColumn: isMobile ? "1 / -1" : "auto"}}><label style={{ fontWeight: "700", fontSize: "11px", color: "#64748b", marginBottom: "3px", display: "block" }}>LOCAL DE VOTACIÓN</label><input type="text" value={formVotante.local_votacion} onChange={(e) => setFormVotante({ ...formVotante, local_votacion: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }} /></div>
                   <div><label style={{ fontWeight: "700", fontSize: "11px", color: "#64748b", marginBottom: "3px", display: "block" }}>MESA</label><input type="text" value={formVotante.mesa} onChange={(e) => setFormVotante({ ...formVotante, mesa: e.target.value.replace(/\D/g, '') })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }} /></div>
                   <div><label style={{ fontWeight: "700", fontSize: "11px", color: "#64748b", marginBottom: "3px", display: "block" }}>ORDEN</label><input type="text" value={formVotante.orden} onChange={(e) => setFormVotante({ ...formVotante, orden: e.target.value.replace(/\D/g, '') })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }} /></div>
                </div>
                
                <div><label style={{ fontWeight: "700", fontSize: "12px", color: "#64748b", marginBottom: "5px", display: "block" }}>OBSERVACIÓN / COMENTARIO</label><input type="text" value={formVotante.observacion} onChange={(e) => setFormVotante({ ...formVotante, observacion: e.target.value })} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px", outline: "none" }} /></div>
                
                <div style={{display: "flex", gap: "10px", marginTop: "15px"}}>
                   {editIdVotante && <button type="button" onClick={() => { setEditIdVotante(null); setFormVotante({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", fecha_nacimiento: "", telefono: "", observacion: "" }); }} style={{ background: "#f1f5f9", color: "#64748b", fontWeight: "700", padding: "18px", borderRadius: "15px", border: "none", fontSize: "16px", cursor: "pointer", flex: 1 }}>CANCELAR EDICIÓN</button>}
                   <button type="submit" disabled={loading} style={{ background: "#C8102E", color: "white", fontWeight: "900", padding: "18px", borderRadius: "15px", border: "none", fontSize: "18px", cursor: "pointer", flex: 2 }}>{loading ? "PROCESANDO..." : editIdVotante ? "GUARDAR CAMBIOS" : "REGISTRAR VOTANTE"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "votantes" && (
          <div className="card" style={{ background: "white", padding: isMobile ? 15 : 30, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9" }}>
            <h3 style={{ color: "#1e293b", fontWeight: "900", marginBottom: 20, fontSize: "20px", textTransform: "uppercase" }}>Mi Lista de Votantes Captados</h3>
            <input type="text" placeholder="🔍 Buscar por nombre o cédula en mi lista..." value={busquedaLista} onChange={(e) => setBusquedaLista(e.target.value)} style={{ width: "100%", padding: "15px", borderRadius: "15px", border: "2px solid #f1f5f9", marginBottom: 25, fontSize: "16px", outline: "none" }} />
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <div style={{ minWidth: isMobile ? "600px" : "100%", overflowY: "auto", maxHeight: "65vh" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 10 }}>
                    <tr style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}><th style={{ padding: "15px", textAlign: "left" }}>NOMBRE COMPLETO</th><th style={{ padding: "15px", textAlign: "left" }}>CÉDULA</th><th style={{ padding: "15px", textAlign: "left" }}>TELÉFONO</th><th style={{ padding: "15px", textAlign: "center" }}>ACCIONES</th></tr>
                  </thead>
                  <tbody>
                    {(votantesUnicos || []).filter((v) => (v?.nombre + v?.apellido + v?.cedula).toLowerCase().includes(busquedaLista.toLowerCase())).map((v) => (
                      <tr key={v?.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "18px 15px", fontWeight: "700", color: "#1e293b" }}>{v?.nombre} {v?.apellido}<br /><small style={{ color: "#C8102E", fontWeight: "600" }}>{v?.barrio}</small></td>
                        <td style={{ padding: "15px", color: "#475569", fontWeight: "500" }}>{v?.cedula}</td>
                        <td style={{ padding: "15px", color: "#475569", fontWeight: "500" }}>{v?.telefono}</td>
                        <td style={{ padding: "15px", textAlign: "center", display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
                          <button onClick={() => { setFormVotante({ ...v, fecha_nacimiento: v.fecha_nacimiento && v.fecha_nacimiento.includes("-") ? v.fecha_nacimiento.split("-").reverse().join("/") : (v.fecha_nacimiento || "") }); setEditIdVotante(v.id); setActiveTab("inicio"); setTimeout(() => document.getElementById('formVotante').scrollIntoView({ behavior: 'smooth' }), 100); }} style={{ padding: "8px 15px", background: "#f1f5f9", border: "none", borderRadius: "10px", fontWeight: "800", color: "#64748b", fontSize: "11px", cursor: "pointer" }}>EDITAR</button>
                          <button onClick={async () => { if (confirm(`¿Seguro que desea eliminar a ${v.nombre} ${v.apellido} de su lista?`)) { setLoading(true); const { error } = await supabase.from("votantes").delete().eq("id", v.id); if (!error) { setVotantes(prev => prev.filter(item => item.id !== v.id)); } else { alert("Error al borrar: " + error.message); } setLoading(false); } }} style={{ padding: "8px 15px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "10px", fontWeight: "800", fontSize: "11px", cursor: "pointer" }}>BORRAR</button>
                        </td>
                      </tr>
                    ))}
                    {votantesUnicos.length === 0 && (
                        <tr><td colSpan="4" style={{textAlign: "center", padding: "40px", color: "#64748b", fontWeight: "600"}}>Aún no has registrado votantes en tu lista.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "lista_general" && userRole === "administrador" && (
          <div className="card" style={{ background: "white", padding: isMobile ? 15 : 30, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9" }}>
            <h3 style={{ color: "#1e293b", fontWeight: "900", marginBottom: 20, fontSize: "20px", textTransform: "uppercase" }}>Control de Asistencia General (Día E)</h3>
            <input type="text" placeholder="🔍 Buscar por número de cédula..." value={busquedaListaGeneral} onChange={(e) => setBusquedaListaGeneral(e.target.value.replace(/\D/g, ''))} style={{ width: "100%", padding: "15px", borderRadius: "15px", border: "2px solid #f1f5f9", marginBottom: 25, fontSize: "16px", outline: "none" }} />
            
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", marginBottom: "30px" }}>
              <div style={{ minWidth: isMobile ? "600px" : "100%", overflowY: "auto", maxHeight: "60vh" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 10 }}>
                    <tr style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      <th style={{ padding: "15px", textAlign: "left" }}>NOMBRE COMPLETO</th>
                      <th style={{ padding: "15px", textAlign: "left" }}>CÉDULA</th>
                      <th style={{ padding: "15px", textAlign: "left" }}>UBICACIÓN</th>
                      <th style={{ padding: "15px", textAlign: "center" }}>¿YA VOTÓ?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(listaGeneralAdmin || [])
                      .filter((v) => busquedaListaGeneral ? v.cedula.includes(busquedaListaGeneral) : true)
                      .slice(0, 50) // Limitamos a 50 por performance en vista
                      .map((v) => (
                      <tr key={v?.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "18px 15px", fontWeight: "700", color: "#1e293b" }}>{v?.nombre} {v?.apellido}<br /><small style={{ color: "#64748b" }}>Captado por: {v.por_parte_de_nombre}</small></td>
                        <td style={{ padding: "15px", color: "#475569", fontWeight: "500" }}>{v?.cedula}</td>
                        <td style={{ padding: "15px", color: "#475569", fontWeight: "500", fontSize: "13px" }}>Mesa: {v.mesa} | Orden: {v.orden}<br/>{v.local_votacion}</td>
                        <td style={{ padding: "15px", textAlign: "center" }}>
                          <input 
                            type="checkbox" 
                            checked={v.ha_votado || false}
                            onChange={async (e) => {
                              const checked = e.target.checked;
                              const { error } = await supabase.from("votantes").update({ ha_votado: checked }).eq("id", v.id);
                              if (!error) {
                                setVotantes(prev => prev.map(item => item.id === v.id ? { ...item, ha_votado: checked } : item));
                              } else {
                                alert("Error al actualizar: " + error.message);
                              }
                            }}
                            style={{ width: "22px", height: "22px", cursor: "pointer", accentColor: "#C8102E" }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: "25px", borderRadius: "20px", border: "1px solid #e2e8f0", textAlign: "center", maxWidth: "500px", margin: "0 auto" }}>
              <h4 style={{ margin: "0 0 15px 0", color: "#475569", fontSize: "15px", fontWeight: "800", textTransform: "uppercase" }}>RESUMEN DE PARTICIPACIÓN REAL</h4>
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
            <div className="card" style={{ background: "white", padding: isMobile ? 25 : 35, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", border: "1px solid #f1f5f9" }}>
              <h3 style={{ color: "#1e293b", fontWeight: "900", marginBottom: 30, textAlign: "center", textTransform: "uppercase", fontSize: "20px" }}>Gestión de Miembros del Equipo</h3>
              <form onSubmit={guardarEquipo} style={{ display: "grid", gap: 18 }}>
                <input type="text" placeholder="Nombre completo del miembro" value={formEquipo.nombre} onChange={(e) => setFormEquipo({ ...formEquipo, nombre: e.target.value })} required style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0", fontSize: "16px" }} />
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18 }}>
                  <input type="text" placeholder="Teléfono" value={formEquipo.telefono} onChange={(e) => setFormEquipo({ ...formEquipo, telefono: e.target.value.replace(/\D/g, '') })} style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0", fontSize: "16px" }} />
                  <input type="text" placeholder="Zona o Barrio de referencia" value={formEquipo.zona} onChange={(e) => setFormEquipo({ ...formEquipo, zona: e.target.value })} style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0", fontSize: "16px" }} />
                </div>
                {!editIdEquipo && (
                  <div style={{ padding: "18px", background: "#f8fafc", borderRadius: "15px", border: "1px dashed #cbd5e1" }}>
                    <p style={{ margin: "0 0 12px 0", fontSize: "12px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>CREDENCIALES DE ACCESO AL SISTEMA</p>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 15 }}>
                      <input type="email" placeholder="Correo electrónico (Login)" value={formEquipo.email} onChange={(e) => setFormEquipo({ ...formEquipo, email: e.target.value })} required style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0", fontSize: "15px" }} />
                      <input type="password" placeholder="Contraseña (mín. 6 caracteres)" value={formEquipo.password} onChange={(e) => setFormEquipo({ ...formEquipo, password: e.target.value })} required minLength={6} style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0", fontSize: "15px" }} />
                    </div>
                  </div>
                )}
                <select value={formEquipo.rol} onChange={(e) => setFormEquipo({ ...formEquipo, rol: e.target.value })} required style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0", fontSize: "16px", background: "white", outline: "none" }}>
                  <option value="coordinador">Rol: Coordinador (Solo ve sus cargas)</option>
                  <option value="administrador">Rol: Administrador (Ve todo)</option>
                </select>
                
                <div style={{display: "flex", gap: "10px", marginTop: "10px"}}>
                   {editIdEquipo && <button type="button" onClick={() => { setEditIdEquipo(null); setFormEquipo({ nombre: "", telefono: "", rol: "coordinador", zona: "", email: "", password: "" }); }} style={{ background: "#f1f5f9", color: "#64748b", fontWeight: "700", padding: "16px", borderRadius: "12px", border: "none", fontSize: "16px", cursor: "pointer", flex: 1 }}>CANCELAR</button>}
                   <button type="submit" disabled={loading} style={{ background: "#1e293b", color: "white", fontWeight: "900", padding: "16px", borderRadius: "12px", border: "none", fontSize: "16px", cursor: "pointer", flex: 2 }}>
                    {loading ? "PROCESANDO..." : editIdEquipo ? "GUARDAR CAMBIOS" : "CREAR NUEVO USUARIO"}
                   </button>
                </div>
              </form>
            </div>
            
            <div className="card" style={{ background: "white", padding: isMobile ? 20 : 30, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", border: "1px solid #f1f5f9" }}>
              <h4 style={{ fontWeight: "900", color: "#1e293b", marginBottom: 20, fontSize: "18px" }}>MIEMBROS ACTIVOS DEL EQUIPO</h4>
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: "500px", overflowY: "auto", maxHeight: "60vh" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 10 }}>
                        <tr style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}><th style={{ padding: 15, textAlign: "left" }}>NOMBRE / ROL</th><th style={{ padding: 15, textAlign: "left" }}>CONTACTO</th><th style={{ padding: 15, textAlign: "center" }}>ACCIONES</th></tr>
                    </thead>
                    <tbody>
                      {(equipo || []).map((m) => (
                        <tr key={m?.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "15px", fontWeight: "700", color: "#1e293b" }}>{m?.nombre}<br /><small style={{ color: m?.rol === 'administrador' ? "#C8102E" : "#64748b", fontWeight: "600", textTransform: "capitalize" }}>{m?.rol}</small></td>
                          <td style={{ padding: "15px", color: "#475569", fontWeight: "500" }}>{m?.telefono}<br /><small>{m?.zona}</small></td>
                          <td style={{ padding: "15px", textAlign: "center", display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
                            <button onClick={() => { setFormEquipo(m); setEditIdEquipo(m.id); window.scrollTo(0, 0); }} style={{ padding: "7px 12px", background: "#f1f5f9", border: "none", borderRadius: "8px", fontWeight: "800", color: "#64748b", fontSize: "10px", cursor: "pointer" }}>EDITAR</button>
                            <button onClick={async () => { 
                              if (confirm(`¿Seguro que deseas eliminar a ${m.nombre}? Esto borrará su acceso y perfil, pero mantendrá los votantes que captó (sin asignación).`)) { 
                                setLoading(true);
                                try {
                                  let uid = m.user_id;
                                  
                                  if (!uid) {
                                    const { data } = await supabase.from("profiles").select("user_id").eq("equipo_id", m.id).maybeSingle();
                                    if (data) uid = data.user_id;
                                  }
                    
                                  if (uid) {
                                    // Desvincular votantes
                                    const { error: errVotantes } = await supabase.from("votantes").update({ user_id: null, created_by: null }).eq("user_id", uid);
                                    if (errVotantes) console.error("Error al desvincular votantes:", errVotantes.message);
                                    
                                    // Borrar perfil
                                    const { error: errProfile } = await supabase.from("profiles").delete().eq("user_id", uid);
                                    if (errProfile) console.error("Error al eliminar perfil:", errProfile.message);
                                  }
                    
                                  // Borrar miembro equipo
                                  const { error: errEquipo } = await supabase.from("equipo").delete().eq("id", m.id);
                                  if (errEquipo) throw new Error(errEquipo.message);
                    
                                  // Borrar auth user (requiere RPC o servicio backend, Supabase client no puede borrar otros users directamente)
                                  if (uid) {
                                    alert("El usuario de autenticación debe ser eliminado manualmente desde el dashboard de Supabase (Sección Auth) buscando por la UID.");
                                    console.log("Eliminar manualmente UID:", uid);
                                  }
                    
                                  cargarDatos();
                                  alert("Miembro eliminado exitosamente de la lista del equipo.");
                                } catch (error) {
                                  console.error(error);
                                  alert("Ocurrió un error al intentar borrar: " + error.message);
                                }
                                setLoading(false);
                              } 
                            }} style={{ padding: "7px 12px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "8px", fontWeight: "800", fontSize: "10px", cursor: "pointer" }}>BORRAR</button>
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
            <div className="card" style={{ background: "white", padding: 30, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", border: "1px solid #f1f5f9" }}>
              <h3 style={{ color: "#1e293b", fontWeight: "900", marginBottom: 25, textTransform: "uppercase", fontSize: "20px" }}>Ranking de Captación (Top 10)</h3>
              {(rendimientoEquipo || []).slice(0, 10).map((m, index) => (
                <div key={m?.id} style={{ marginBottom: 18, padding: "15px", background: index < 3 ? "#fef2f2" : "white", borderRadius: "12px", border: index < 3 ? "1px solid #fecaca" : "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                        <span style={{fontWeight: "900", color: "#C8102E", fontSize: "18px"}}>#{index + 1}</span>
                        <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "15px" }}>{m?.nombre}</span>
                    </div>
                    <span style={{ fontSize: "15px", fontWeight: "800", color: "#C8102E" }}>{m?.cantidad.toLocaleString('es-PY')} <small style={{color: "#64748b", fontWeight: "600"}}>votantes ({m?.porcentaje}%)</small></span>
                  </div>
                  <div style={{ width: "100%", height: "10px", background: "#f1f5f9", borderRadius: "10px", overflow: "hidden" }}>
                    <div style={{ width: `${m?.porcentaje}%`, height: "100%", background: "#C8102E", borderRadius: "10px" }}></div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="card" style={{ background: "white", padding: 25, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", border: "1px solid #f1f5f9" }}>
              <h3 style={{ color: "#1e293b", fontWeight: "900", marginBottom: 25, textTransform: "uppercase", fontSize: "20px" }}>Distribución por Barrio</h3>
              <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "400px" }}>
                    <thead style={{ background: "#C8102E" }}>
                      <tr style={{ fontSize: "12px", color: "white", fontWeight: "900", textTransform: "uppercase" }}>
                        <th style={{ padding: "14px", textAlign: "left" }}>BARRIO</th>
                        <th style={{ padding: "14px", textAlign: "right" }}>TOTAL VOTANTES</th>
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
          <span>📊</span> {!isMobile && "DESCARGAR REPORTE EXCEL"}
        </button>
      )}
    </div>
  );
}