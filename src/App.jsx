import { useEffect, useMemo, useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { LogOut, UserCircle, Users, CheckCircle2 } from "lucide-react";
import { supabase, supabaseAuth } from "./lib/supabase";
import { normalizarCedula, LISTA_BARRIOS } from "./utils/helpers";
import { ANRLogo } from "./components/Logos";
import { LoginScreen } from "./components/LoginScreen";
import logocarmona from "./img/logocarmona.png";
import anrlogo from "./img/anrlogo.png";
import "./styles.css"; // <-- Aseguramos que se importen los estilos

// --- COMPONENTES VISUALES EXACTOS PARA EL HERO Y FONDO ---

const LineAccent = () => (
  <svg width="60" height="2" viewBox="0 0 60 2">
    <rect width="60" height="2" fill="#cbd5e1"/>
  </svg>
);

const BurstAccentsLeft = () => (
  <svg width="40" height="50" viewBox="0 0 40 50" style={{ position: "absolute", left: -25, top: "20%", pointerEvents: "none" }}>
    <path d="M30 10 L15 20 M35 25 L10 25 M30 40 L15 30" stroke="#C8102E" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const BurstAccentsRight = () => (
  <svg width="40" height="50" viewBox="0 0 40 50" style={{ position: "absolute", right: -25, top: "20%", pointerEvents: "none" }}>
    <path d="M10 10 L25 20 M5 25 L30 25 M10 40 L25 30" stroke="#C8102E" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const SceneryBackground = () => (
  <div className="scenery-layer">
    {/* Silueta de la Ciudad (Izquierda) */}
    <svg style={{ position: "absolute", bottom: "40px", left: "0", width: "50%", height: "100px" }} viewBox="0 0 500 100" preserveAspectRatio="none">
      <path fill="#cbd5e1" opacity="0.8" d="M0,100 L0,50 L20,50 L20,30 L40,30 L40,60 L70,60 L70,20 L100,20 L100,50 L140,50 L140,40 L160,40 L160,70 L200,70 L200,30 L220,30 L220,10 L240,10 L240,40 L270,40 L270,60 L320,60 L320,40 L350,40 L350,70 L400,70 L400,50 L450,50 L450,80 L500,80 L500,100 Z" />
      {/* Cúpula Iglesia de ciudad */}
      <path fill="#94a3b8" opacity="0.9" d="M80,50 L80,10 L90,0 L100,10 L100,50 Z" />
    </svg>

    {/* Silueta del Puente (Derecha) */}
    <svg style={{ position: "absolute", bottom: "40px", right: "0", width: "50%", height: "120px" }} viewBox="0 0 600 120" preserveAspectRatio="none">
      <path fill="none" stroke="#94a3b8" strokeWidth="4" opacity="0.8" d="M0,100 Q300,0 600,100" />
      {/* Pilares y tensores del puente */}
      <rect x="450" y="20" width="15" height="100" fill="#94a3b8" opacity="0.9" />
      <path fill="none" stroke="#cbd5e1" strokeWidth="2" opacity="0.6" d="M450,30 L300,100 M450,40 L350,100 M450,50 L400,100 M465,30 L600,100 M465,40 L550,100 M465,50 L500,100" />
    </svg>

    {/* Sol / Destello Central en el horizonte */}
    <div style={{ position: "absolute", bottom: "20px", left: "50%", transform: "translateX(-50%)", width: "300px", height: "150px", background: "radial-gradient(ellipse at bottom, rgba(254, 240, 138, 0.9) 0%, rgba(255, 255, 255, 0) 70%)", zIndex: 2 }}></div>

    {/* Ondas Rojas y Azules (Idénticas a la imagen) */}
    <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "90px", zIndex: 3 }} viewBox="0 0 1440 90" preserveAspectRatio="none">
      <path fill="#991b1b" d="M0,40 C400,120 800,-20 1440,50 L1440,90 L0,90 Z" />
      <path fill="#C8102E" d="M0,50 C500,130 900,-10 1440,60 L1440,90 L0,90 Z" />
      {/* Línea Azul/Blanca decorativa pegada al borde */}
      <path fill="#1e3a8a" d="M0,75 C500,140 900,10 1440,80 L1440,90 L0,90 Z" />
      <path fill="#ffffff" d="M0,72 C500,135 900,5 1440,77 L1440,80 L0,80 Z" opacity="0.8" />
    </svg>
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
      
      {/* ------------------ ENCABEZADO SUPERIOR RÉPLICA ------------------ */}
      <header className="modern-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <ANRLogoSmall />
          {!isMobile && (
            <span className="system-tag">
              Sistema de Gestión – <span className="system-tag-pill">Lista 2 / Opción 5</span>
            </span>
          )}
        </div>

        <div className="user-profile-zone">
          <div className="user-details">
            <UserAvatar name={userName} role={userRole === "administrador" ? "Administrador" : "Coordinador"} isMobile={isMobile} />
          </div>
          <button onClick={() => supabase.auth.signOut()} className="btn-logout-modern">
            <LogOut size={16} /> {!isMobile && "Cerrar sesión"}
          </button>
        </div>
      </header>
      
      {isMobile && (
        <div style={{ background: "#f8fafc", padding: "10px 15px", borderBottom: "1px solid #f1f5f9", textAlign: "center", fontSize: "12px", color: "#64748b", fontWeight: "500" }}>
           Sistema de Gestión – <span style={{fontWeight: "800", color: "#C8102E"}}>Lista 2 / Opción 5</span>
        </div>
      )}

      {/* ------------------ SECCIÓN PRINCIPAL HERO RÉPLICA ------------------ */}
      <section className="hero-wrapper">
        
        <SceneryBackground />

        <div className="hero-content">
          
          <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "25px" }}>
            {!isMobile && <LineAccent />}
            <div className="logo-box">
              <img src={anrlogo} alt="ANR" style={{ width: "90px", height: "90px", borderRadius: "50%", display: "block" }} />
            </div>
            {!isMobile && <LineAccent />}
          </div>

          <div className="badge-lista">
            <span>LISTA 2</span>
            <span className="opcion-tag">OPCIÓN 5</span>
          </div>

          <h1 className="main-title">
            HAGAMOS QUE SUCEDA
          </h1>
          
          <p className="sub-title">
            Unidos por el cambio que nuestra ciudad necesita
          </p>

          <button className="hero-btn-main">
            <div className="hero-btn-avatar">
              <img src={logocarmona} alt="Carmona" style={{ width: "100%", height: "auto" }} />
            </div>
            <span className="hero-btn-text">
              DARÍO CARMONA – CONCEJAL 2026
            </span>
            <span style={{ color: "white", fontSize: "22px", fontWeight: "bold", marginRight: "10px" }}>→</span>
          </button>
          
          <div className="hero-links">
            Ir al panel / Ver perfil / Gestionar campaña
          </div>
        </div>
      </section>

      {/* ------------------ TARJETA DEL CONTADOR RÉPLICA ------------------ */}
      <div className="counter-wrapper">
        <div className="counter-card">
          
          <div className="counter-left">
            <div className="counter-icon">
              <Users size={32} strokeWidth={2.5} />
            </div>
            <span className="counter-text-ya-somos">YA SOMOS</span>
          </div>

          <div className="counter-center">
            <BurstAccentsLeft />
            <div className="glow-effect"></div>
            <span className="counter-number">
              {totalVotantesGeneral.toLocaleString('es-PY')}
            </span>
            <BurstAccentsRight />
          </div>

          <div className="counter-right">
            personas<br/>registradas
          </div>

          <div className="counter-pill-bottom">
            <div className="pill-check">
              <CheckCircle2 color="white" size={14} strokeWidth={4} />
            </div>
            <span className="pill-text">¡Y vamos por más!</span>
          </div>
        </div>
      </div>

      <div className="footer-replica">
        Partido Colorado - ANR &nbsp;|&nbsp; Lista 2 &nbsp;|&nbsp; Opción 5 &nbsp;|&nbsp; Elecciones Municipales 2026<br/>
        Desarrollado para la campaña de Darío Carmona
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
            <div className="card-form">
              <h4 style={{ color: "#C8102E", fontWeight: "900", marginBottom: 20, fontSize: "14px", textTransform: "uppercase" }}>🔍 BUSCADOR DE PADRÓN</h4>
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10 }}>
                <input type="text" value={cedulaRapida} onChange={(e) => setCedulaRapida(e.target.value.replace(/\D/g, ''))} placeholder="Ingrese número de cédula..." style={{ flex: 1, padding: "15px", borderRadius: "12px", border: "2px solid #f1f5f9", fontSize: "16px", outline: "none", margin: 0 }} />
                <button onClick={buscarEnPadron} style={{ padding: "15px 30px", background: "#C8102E", color: "white", border: "none", borderRadius: "12px", fontWeight: "900", fontSize: "16px", cursor: "pointer" }}>
                  BUSCAR
                </button>
              </div>

              {resultadoPadron && (
                <div style={{ marginTop: 20, padding: 20, background: "#fef2f2", borderRadius: "20px", border: "2px dashed #C8102E", textAlign: "center" }}>
                  <h3 style={{ fontSize: "20px", color: "#C8102E", fontWeight: "900", marginBottom: "10px", borderBottom: "none" }}>
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

            <div id="formVotante" className="card-form">
              <h3 style={{ color: "#1e293b", fontWeight: "900", textAlign: "center", marginBottom: 30, fontSize: "22px", textTransform: "uppercase" }}>{editIdVotante ? "Editar Votante" : "Registrar Nuevo Votante"}</h3>
              <form onSubmit={guardarVotante} style={{ display: "grid", gap: 18 }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18 }}>
                  <div><label>NOMBRE *</label><input type="text" value={formVotante.nombre} onChange={(e) => setFormVotante({ ...formVotante, nombre: e.target.value })} required style={{ margin: 0 }} /></div>
                  <div><label>APELLIDO *</label><input type="text" value={formVotante.apellido} onChange={(e) => setFormVotante({ ...formVotante, apellido: e.target.value })} required style={{ margin: 0 }} /></div>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18 }}>
                  <div><label>CÉDULA DE IDENTIDAD *</label><input type="text" value={formVotante.cedula} onChange={(e) => setFormVotante({ ...formVotante, cedula: e.target.value.replace(/\D/g, '') })} required style={{ margin: 0 }} /></div>
                  <div><label>TELÉFONO / WHATSAPP *</label><input type="tel" value={formVotante.telefono} onChange={(e) => setFormVotante({ ...formVotante, telefono: e.target.value.replace(/\D/g, '') })} required style={{ margin: 0 }} /></div>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18 }}>
                  <div><label>FECHA DE NACIMIENTO *</label><input type="text" placeholder="DD/MM/AAAA" value={formVotante.fecha_nacimiento} onChange={(e) => { let v = e.target.value.replace(/\D/g, ''); if (v.length > 8) v = v.substring(0, 8); if (v.length > 4) { v = v.replace(/(\d{2})(\d{2})(\d{1,4})/, '$1/$2/$3'); } else if (v.length > 2) { v = v.replace(/(\d{2})(\d{1,2})/, '$1/$2'); } setFormVotante({ ...formVotante, fecha_nacimiento: v }); }} required style={{ margin: 0 }} /></div>
                  <div><label>BARRIO *</label><select value={formVotante.barrio} onChange={(e) => setFormVotante({ ...formVotante, barrio: e.target.value })} required style={{ margin: 0, background: "white" }}><option value="">Seleccione un barrio...</option>{LISTA_BARRIOS.map((b) => <option key={b} value={b}>{b}</option>)}</select></div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 15, padding: "15px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                   <div style={{gridColumn: isMobile ? "1 / -1" : "auto"}}><label style={{fontSize: "11px"}}>LOCAL DE VOTACIÓN</label><input type="text" value={formVotante.local_votacion} onChange={(e) => setFormVotante({ ...formVotante, local_votacion: e.target.value })} style={{ padding: "10px", fontSize: "14px", margin: 0 }} /></div>
                   <div><label style={{fontSize: "11px"}}>MESA</label><input type="text" value={formVotante.mesa} onChange={(e) => setFormVotante({ ...formVotante, mesa: e.target.value.replace(/\D/g, '') })} style={{ padding: "10px", fontSize: "14px", margin: 0 }} /></div>
                   <div><label style={{fontSize: "11px"}}>ORDEN</label><input type="text" value={formVotante.orden} onChange={(e) => setFormVotante({ ...formVotante, orden: e.target.value.replace(/\D/g, '') })} style={{ padding: "10px", fontSize: "14px", margin: 0 }} /></div>
                </div>
                
                <div><label>OBSERVACIÓN / COMENTARIO</label><input type="text" value={formVotante.observacion} onChange={(e) => setFormVotante({ ...formVotante, observacion: e.target.value })} style={{ margin: 0 }} /></div>
                
                <div style={{display: "flex", gap: "10px", marginTop: "15px"}}>
                   {editIdVotante && <button type="button" className="btn-primary" onClick={() => { setEditIdVotante(null); setFormVotante({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", fecha_nacimiento: "", telefono: "", observacion: "" }); }} style={{ background: "#f1f5f9", color: "#64748b", flex: 1 }}>CANCELAR</button>}
                   <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 2 }}>{loading ? "PROCESANDO..." : editIdVotante ? "GUARDAR CAMBIOS" : "REGISTRAR VOTANTE"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "votantes" && (
          <div className="card-form" style={{ marginTop: 20 }}>
            <h3 style={{ color: "#1e293b", fontWeight: "900", marginBottom: 20, fontSize: "20px", textTransform: "uppercase", borderBottom: "none" }}>Mi Lista de Votantes Captados</h3>
            <input type="text" placeholder="🔍 Buscar por nombre o cédula en mi lista..." value={busquedaLista} onChange={(e) => setBusquedaLista(e.target.value)} style={{ width: "100%", padding: "15px", borderRadius: "15px", border: "2px solid #f1f5f9", marginBottom: 25, fontSize: "16px", outline: "none" }} />
            <div className="table-container">
              <div style={{ minWidth: isMobile ? "600px" : "100%", overflowY: "auto", maxHeight: "65vh" }}>
                <table>
                  <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                    <tr><th>NOMBRE COMPLETO</th><th>CÉDULA</th><th>TELÉFONO</th><th style={{ textAlign: "center" }}>ACCIONES</th></tr>
                  </thead>
                  <tbody>
                    {(votantesUnicos || []).filter((v) => (v?.nombre + v?.apellido + v?.cedula).toLowerCase().includes(busquedaLista.toLowerCase())).map((v) => (
                      <tr key={v?.id}>
                        <td style={{ fontWeight: "700", color: "#1e293b" }}>{v?.nombre} {v?.apellido}<br /><small style={{ color: "#C8102E", fontWeight: "600" }}>{v?.barrio}</small></td>
                        <td style={{ color: "#475569", fontWeight: "500" }}>{v?.cedula}</td>
                        <td style={{ color: "#475569", fontWeight: "500" }}>{v?.telefono}</td>
                        <td style={{ textAlign: "center", display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
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
          <div className="card-form" style={{ marginTop: 20 }}>
            <h3 style={{ color: "#1e293b", fontWeight: "900", marginBottom: 20, fontSize: "20px", textTransform: "uppercase", borderBottom: "none" }}>Control de Asistencia General (Día D)</h3>
            <input type="text" placeholder="🔍 Buscar por número de cédula..." value={busquedaListaGeneral} onChange={(e) => setBusquedaListaGeneral(e.target.value.replace(/\D/g, ''))} style={{ width: "100%", padding: "15px", borderRadius: "15px", border: "2px solid #f1f5f9", marginBottom: 25, fontSize: "16px", outline: "none" }} />
            
            <div className="table-container" style={{ marginBottom: "30px" }}>
              <div style={{ minWidth: isMobile ? "600px" : "100%", overflowY: "auto", maxHeight: "60vh" }}>
                <table>
                  <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                    <tr>
                      <th>NOMBRE COMPLETO</th>
                      <th>CÉDULA</th>
                      <th>UBICACIÓN</th>
                      <th style={{ textAlign: "center" }}>¿YA VOTÓ?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(listaGeneralAdmin || [])
                      .filter((v) => busquedaListaGeneral ? v.cedula.includes(busquedaListaGeneral) : true)
                      .slice(0, 50)
                      .map((v) => (
                      <tr key={v?.id}>
                        <td style={{ fontWeight: "700", color: "#1e293b" }}>{v?.nombre} {v?.apellido}<br /><small style={{ color: "#64748b" }}>Captado por: {v.por_parte_de_nombre}</small></td>
                        <td style={{ color: "#475569", fontWeight: "500" }}>{v?.cedula}</td>
                        <td style={{ color: "#475569", fontWeight: "500", fontSize: "13px" }}>Mesa: {v.mesa} | Orden: {v.orden}<br/>{v.local_votacion}</td>
                        <td style={{ textAlign: "center" }}>
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
                            style={{ width: "22px", height: "22px", cursor: "pointer", accentColor: "#C8102E", margin: "0 auto" }}
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
            <div className="card-form" style={{ marginTop: 20 }}>
              <h3 style={{ color: "#1e293b", fontWeight: "900", marginBottom: 30, textAlign: "center", textTransform: "uppercase", fontSize: "20px", borderBottom: "none" }}>Gestión de Miembros del Equipo</h3>
              <form onSubmit={guardarEquipo} style={{ display: "grid", gap: 18 }}>
                <div><input type="text" placeholder="Nombre completo del miembro" value={formEquipo.nombre} onChange={(e) => setFormEquipo({ ...formEquipo, nombre: e.target.value })} required style={{ margin: 0 }} /></div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18 }}>
                  <div><input type="text" placeholder="Teléfono" value={formEquipo.telefono} onChange={(e) => setFormEquipo({ ...formEquipo, telefono: e.target.value.replace(/\D/g, '') })} style={{ margin: 0 }} /></div>
                  <div><input type="text" placeholder="Zona o Barrio de referencia" value={formEquipo.zona} onChange={(e) => setFormEquipo({ ...formEquipo, zona: e.target.value })} style={{ margin: 0 }} /></div>
                </div>
                {!editIdEquipo && (
                  <div style={{ padding: "18px", background: "#f8fafc", borderRadius: "15px", border: "1px dashed #cbd5e1" }}>
                    <p style={{ margin: "0 0 12px 0", fontSize: "12px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>CREDENCIALES DE ACCESO AL SISTEMA</p>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 15 }}>
                      <div><input type="email" placeholder="Correo electrónico (Login)" value={formEquipo.email} onChange={(e) => setFormEquipo({ ...formEquipo, email: e.target.value })} required style={{ margin: 0 }} /></div>
                      <div><input type="password" placeholder="Contraseña (mín. 6 caracteres)" value={formEquipo.password} onChange={(e) => setFormEquipo({ ...formEquipo, password: e.target.value })} required minLength={6} style={{ margin: 0 }} /></div>
                    </div>
                  </div>
                )}
                <div>
                  <select value={formEquipo.rol} onChange={(e) => setFormEquipo({ ...formEquipo, rol: e.target.value })} required style={{ margin: 0, background: "white" }}>
                    <option value="coordinador">Rol: Coordinador (Solo ve sus cargas)</option>
                    <option value="administrador">Rol: Administrador (Ve todo)</option>
                  </select>
                </div>
                
                <div style={{display: "flex", gap: "10px", marginTop: "10px"}}>
                   {editIdEquipo && <button type="button" className="btn-primary" onClick={() => { setEditIdEquipo(null); setFormEquipo({ nombre: "", telefono: "", rol: "coordinador", zona: "", email: "", password: "" }); }} style={{ background: "#f1f5f9", color: "#64748b", flex: 1 }}>CANCELAR</button>}
                   <button type="submit" className="btn-primary" disabled={loading} style={{ background: "#1e293b", flex: 2 }}>
                    {loading ? "PROCESANDO..." : editIdEquipo ? "GUARDAR CAMBIOS" : "CREAR NUEVO USUARIO"}
                   </button>
                </div>
              </form>
            </div>
            
            <div className="card-form">
              <h4 style={{ fontWeight: "900", color: "#1e293b", marginBottom: 20, fontSize: "18px" }}>MIEMBROS ACTIVOS DEL EQUIPO</h4>
              <div className="table-container">
                <div style={{ minWidth: "500px", overflowY: "auto", maxHeight: "60vh" }}>
                  <table>
                    <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                        <tr><th>NOMBRE / ROL</th><th>CONTACTO</th><th style={{ textAlign: "center" }}>ACCIONES</th></tr>
                    </thead>
                    <tbody>
                      {(equipo || []).map((m) => (
                        <tr key={m?.id}>
                          <td style={{ fontWeight: "700", color: "#1e293b" }}>{m?.nombre}<br /><small style={{ color: m?.rol === 'administrador' ? "#C8102E" : "#64748b", fontWeight: "600", textTransform: "capitalize" }}>{m?.rol}</small></td>
                          <td style={{ color: "#475569", fontWeight: "500" }}>{m?.telefono}<br /><small>{m?.zona}</small></td>
                          <td style={{ textAlign: "center", display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
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
                                    const { error: errVotantes } = await supabase.from("votantes").update({ user_id: null, created_by: null }).eq("user_id", uid);
                                    if (errVotantes) console.error("Error al desvincular votantes:", errVotantes.message);
                                    
                                    const { error: errProfile } = await supabase.from("profiles").delete().eq("user_id", uid);
                                    if (errProfile) console.error("Error al eliminar perfil:", errProfile.message);
                                  }
                    
                                  const { error: errEquipo } = await supabase.from("equipo").delete().eq("id", m.id);
                                  if (errEquipo) throw new Error(errEquipo.message);
                    
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
            <div className="card-form" style={{ marginTop: 20 }}>
              <h3 style={{ color: "#1e293b", fontWeight: "900", marginBottom: 25, textTransform: "uppercase", fontSize: "20px", borderBottom: "none" }}>Ranking de Captación (Top 10)</h3>
              {(rendimientoEquipo || []).slice(0, 10).map((m, index) => (
                <div key={m?.id} style={{ marginBottom: 18, padding: "15px", background: index < 3 ? "#fef2f2" : "white", borderRadius: "12px", border: index < 3 ? "1px solid #fecaca" : "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                        <span style={{fontWeight: "900", color: "#C8102E", fontSize: "18px"}}>#{index + 1}</span>
                        <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "15px" }}>{m?.nombre}</span>
                    </div>
                    <span style={{ fontSize: "15px", fontWeight: "800", color: "#C8102E" }}>{m?.cantidad.toLocaleString('es-PY')} <small style={{color: "#64748b", fontWeight: "600"}}>votantes ({m?.porcentaje}%)</small></span>
                  </div>
                  <div className="progress-bg">
                    <div className="progress-fill" style={{ width: `${m?.porcentaje}%`, borderRadius: "10px" }}></div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="card-form">
              <h3 style={{ color: "#1e293b", fontWeight: "900", marginBottom: 25, textTransform: "uppercase", fontSize: "20px", borderBottom: "none" }}>Distribución por Barrio</h3>
              <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>BARRIO</th>
                        <th style={{ textAlign: "right" }}>TOTAL VOTANTES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(conteoBarrio || []).sort((a, b) => b.total - a.total).map((b, index) => (
                        <tr key={b?.name} style={{ background: index % 2 === 0 ? "white" : "#f8fafc" }}>
                          <td style={{ fontWeight: "700", color: "#334155", fontSize: "15px" }}>{b?.name}</td>
                          <td style={{ textAlign: "right", fontWeight: "900", color: "#C8102E", fontSize: "16px" }}>{b?.total.toLocaleString('es-PY')}</td>
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