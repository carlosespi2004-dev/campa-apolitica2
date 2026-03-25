import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logocarmona from "./img/logocarmona.png";
import anrlogo from "./img/anrlogo.png";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
  auth: { 
    persistSession: false, 
    autoRefreshToken: false,
    storageKey: "silent-auth-key"
  }
});

const normalizarCedula = (v) => String(v || "").replace(/[.\-\s]/g, "").trim();

const LISTA_BARRIOS = [
  "Santa Clara", "San José Obrero", "San Juan", "San Antonio", "San Rafael",
  "Las Mercedes", "San Roque", "San Damián", "Santa Rosa", "San Sebastián",
  "San Francisco", "San Isidro", "Sagrado Corazón de Jesús", "San Miguel",
  "San Lorenzo", "San Jorge", "Santo Domingo", "San Pablo",
  "Fray Luis de Bolaños", "Fátima 1", "Santo Tomás", "Area 5", "CONAVI",
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
  const [userRole, setUserRole] = useState(null); 
  const [userName, setUserName] = useState("");
  const [userEquipoId, setUserEquipoId] = useState(null);
  const [votantes, setVotantes] = useState([]);
  const [equipo, setEquipo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState("inicio");

  const [formVotante, setFormVotante] = useState({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", fecha_nacimiento: "", telefono: "" });
  const [formEquipo, setFormEquipo] = useState({ nombre: "", telefono: "", rol: "coordinador", zona: "", email: "", password: "" });
  const [editIdVotante, setEditIdVotante] = useState(null);
  const [editIdEquipo, setEditIdEquipo] = useState(null);
  const [busquedaLista, setBusquedaLista] = useState("");
  const [cedulaRapida, setCedulaRapida] = useState("");
  const [resultadoPadron, setResultadoPadron] = useState(null);

  const limpiarEstado = () => {
    setVotantes([]);
    setEquipo([]);
    setUserRole(null);
    setUserName("");
    setUserEquipoId(null);
    setActiveTab("inicio");
    setFormVotante({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", fecha_nacimiento: "", telefono: "" });
    setFormEquipo({ nombre: "", telefono: "", rol: "coordinador", zona: "", email: "", password: "" });
    setEditIdVotante(null);
    setEditIdEquipo(null);
    setBusquedaLista("");
    setCedulaRapida("");
    setResultadoPadron(null);
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
    return (equipo || [])
      .map((m) => {
        const cant = (votantes || []).filter((v) => v.equipo_id === m.id).length;
        return { ...m, cantidad: cant, porcentaje: total > 0 ? Math.round((cant / total) * 100) : 0 };
      })
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [votantes, equipo]);

  const conteoBarrio = useMemo(() => {
    const counts = {};
    // AJUSTE PUNTUAL: Administrador procesa la lista global, Coordinador solo su filtro personal
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
      alert("Cédula realmente no encontrada en el padrón.");
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
      setFormVotante({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", fecha_nacimiento: "", telefono: "" });
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
      sheet.addRow(["HAGAMOS QUE SUCEDA"]);
      sheet.mergeCells("A1:L1");
      const r1 = sheet.getRow(1);
      r1.height = 30;
      r1.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8102E" } };
      r1.getCell(1).font = { color: { argb: "FFFFFFFF" }, size: 18, bold: true };
      r1.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
      sheet.addRow(["Darío Carmona Concejal 2026"]);
      sheet.mergeCells("A2:L2");
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
        { header: "Barrio", key: "bar", width: 20 },
        { header: "Orden", key: "ord", width: 8 },
        { header: "Mesa", key: "mes", width: 8 },
        { header: "Seccional", key: "sec", width: 10 },
        { header: "Local", key: "loc", width: 35 },
        { header: "Captado por", key: "cap", width: 20 },
      ];
      const headerRow = sheet.getRow(4);
      headerRow.values = ["Nro", "Nombre", "Apellido", "Cedula", "Fecha Nacimiento", "Teléfono", "Barrio", "Orden", "Mesa", "Seccional", "Local", "Captado por"];
      headerRow.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8102E" } };
        c.font = { color: { argb: "FFFFFFFF" }, bold: true };
        c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      });
      lista.forEach((v, i) => {
        const row = sheet.addRow([i + 1, v.nombre, v.apellido, v.cedula, v.fecha_nacimiento, v.telefono, v.barrio, v.orden, v.mesa, v.seccional, v.local_votacion, v.por_parte_de_nombre]);
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
    
    equipo.forEach((miembro) => {
      const datosMiembro = votantes.filter((v) => v.equipo_id === miembro.id);
      if (datosMiembro.length > 0) crearHoja(miembro.nombre, datosMiembro);
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
  });

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      <header style={{ background: "white", padding: isMobile ? "20px 10px" : "40px 20px", textAlign: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", position: "relative" }}>
        <button onClick={() => supabase.auth.signOut()} style={{ background: "#f1f5f9", color: "#64748b", padding: "8px 15px", borderRadius: "10px", border: "none", fontWeight: "800", cursor: "pointer", position: "absolute", right: 10, top: 10, fontSize: "10px" }}>
          SALIR
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? "15px" : "40px", marginBottom: "10px" }}>
          <span style={{ color: "#C8102E", fontSize: isMobile ? "24px" : "48px", fontWeight: "900", fontFamily: "Domine" }}>LISTA 2</span>
          <ANRLogo />
          <span style={{ color: "#C8102E", fontSize: isMobile ? "24px" : "48px", fontWeight: "900", fontFamily: "Domine" }}>OPCIÓN 5</span>
        </div>

        <h1 style={{ fontFamily: "Kumar One", fontWeight: "900", color: "#C8102E", fontSize: isMobile ? "28px" : "52px", margin: 0, textTransform: "uppercase", letterSpacing: "-1.5px" }}>
          HAGAMOS QUE SUCEDA
        </h1>
        
        <div style={{ background: "#C8102E", padding: "10px 30px", borderRadius: "50px", display: "inline-flex", alignItems: "center", gap: 5, marginTop: 15, boxShadow: "0 4px 10px rgba(200,16,46,0.3)" }}>
          <GreenHeart />
          <h2 style={{ fontFamily: "Montserrat", fontWeight: "800", color: "white", fontSize: isMobile ? "12px" : "16px", margin: 0, textTransform: "uppercase" }}>
            Darío Carmona Concejal 2026
          </h2>
        </div>
      </header>

      <nav style={{ display: "flex", background: "#f1f5f9", padding: "10px 10px 0 10px", sticky: "top", top: 0, zIndex: 100 }}>
        <button onClick={() => setActiveTab("inicio")} style={tabStyle("inicio")}>Inicio</button>
        <button onClick={() => setActiveTab("votantes")} style={tabStyle("votantes")}>Votantes</button>
        {userRole === "administrador" && (
          <>
            <button onClick={() => setActiveTab("equipo")} style={tabStyle("equipo")}>Equipo</button>
            <button onClick={() => setActiveTab("reportes")} style={tabStyle("reportes")}>Reportes</button>
          </>
        )}
      </nav>

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "30px 15px", paddingBottom: 120 }}>
        {activeTab === "inicio" && (
          <div style={{ display: "grid", gap: 25 }}>
            <div className="card" style={{ background: "white", padding: isMobile ? 20 : 35, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
              <h4 style={{ color: "#C8102E", fontWeight: "900", marginBottom: 20, fontSize: "14px", textTransform: "uppercase" }}>🔍 BUSCADOR DE PADRÓN</h4>
              <div style={{ display: "flex", gap: 10 }}>
                <input type="text" value={cedulaRapida} onChange={(e) => setCedulaRapida(e.target.value.replace(/\D/g, ''))} placeholder="Cédula..." style={{ flex: 1, padding: "15px", borderRadius: "12px", border: "2px solid #f1f5f9", fontSize: "16px" }} />
                <button onClick={buscarEnPadron} style={{ padding: "0 25px", background: "#C8102E", color: "white", border: "none", borderRadius: "12px", fontWeight: "900" }}>
                  BUSCAR
                </button>
              </div>

              {resultadoPadron && (
                <div style={{ marginTop: 20, padding: 20, background: "#fef2f2", borderRadius: "20px", border: "2px dashed #C8102E", textAlign: "center" }}>
                  <h3 style={{ fontSize: "18px", color: "#C8102E", fontWeight: "900" }}>
                    {resultadoPadron?.nombre} {resultadoPadron?.apellido}
                  </h3>
                  <p style={{ fontWeight: "700", color: "#444", fontSize: "13px" }}>
                    Mesa: {resultadoPadron?.mesa} | Orden: {resultadoPadron?.orden} | Sec: {resultadoPadron?.seccional}
                  </p>
                  <p style={{ color: "#C8102E", fontWeight: "800", fontSize: "12px", marginBottom: 15 }}>
                    {resultadoPadron?.local_votacion}
                  </p>
                  <button
                    onClick={() => {
                      setFormVotante({ ...formVotante, ...resultadoPadron });
                      setResultadoPadron(null);
                    }}
                    style={{ background: "#16a34a", color: "white", padding: "12px 25px", borderRadius: "10px", fontWeight: "900", border: "none" }}
                  >
                    ASIGNAR AL FORMULARIO
                  </button>
                </div>
              )}
            </div>

            <div className="card" style={{ background: "white", padding: isMobile ? 25 : 40, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
              <h3 style={{ color: "#C8102E", fontWeight: "900", textAlign: "center", marginBottom: 25, fontSize: "20px", textTransform: "uppercase" }}>REGISTRAR VOTANTE</h3>
              <form onSubmit={guardarVotante} style={{ display: "grid", gap: 15 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                  <div><label style={{ fontWeight: "800", fontSize: "11px", color: "#C8102E" }}>NOMBRE</label><input type="text" value={formVotante.nombre} onChange={(e) => setFormVotante({ ...formVotante, nombre: e.target.value })} required style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px" }} /></div>
                  <div><label style={{ fontWeight: "800", fontSize: "11px", color: "#C8102E" }}>APELLIDO</label><input type="text" value={formVotante.apellido} onChange={(e) => setFormVotante({ ...formVotante, apellido: e.target.value })} required style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px" }} /></div>
                </div>
                <div><label style={{ fontWeight: "800", fontSize: "11px", color: "#C8102E" }}>CÉDULA</label><input type="text" value={formVotante.cedula} onChange={(e) => setFormVotante({ ...formVotante, cedula: e.target.value.replace(/\D/g, '') })} required style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px" }} /></div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                  <div><label style={{ fontWeight: "800", fontSize: "11px", color: "#C8102E" }}>FECHA DE NACIMIENTO</label><input type="date" value={formVotante.fecha_nacimiento} onChange={(e) => setFormVotante({ ...formVotante, fecha_nacimiento: e.target.value })} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px" }} /></div>
                  <div><label style={{ fontWeight: "800", fontSize: "11px", color: "#C8102E" }}>TELÉFONO</label><input type="tel" value={formVotante.telefono} onChange={(e) => setFormVotante({ ...formVotante, telefono: e.target.value })} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px" }} /></div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                  <div><label style={{ fontWeight: "800", fontSize: "11px", color: "#C8102E" }}>MESA</label><input type="text" value={formVotante.mesa} onChange={(e) => setFormVotante({ ...formVotante, mesa: e.target.value })} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px" }} /></div>
                  <div><label style={{ fontWeight: "800", fontSize: "11px", color: "#C8102E" }}>ORDEN</label><input type="text" value={formVotante.orden} onChange={(e) => setFormVotante({ ...formVotante, orden: e.target.value })} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px" }} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                  <div><label style={{ fontWeight: "800", fontSize: "11px", color: "#C8102E" }}>SECCIONAL</label><input type="text" value={formVotante.seccional} onChange={(e) => setFormVotante({ ...formVotante, seccional: e.target.value })} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px" }} /></div>
                  <div><label style={{ fontWeight: "800", fontSize: "11px", color: "#C8102E" }}>LOCAL</label><input type="text" value={formVotante.local_votacion} onChange={(e) => setFormVotante({ ...formVotante, local_votacion: e.target.value })} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px" }} /></div>
                </div>
                <div><label style={{ fontWeight: "800", fontSize: "11px", color: "#C8102E" }}>BARRIO</label><select value={formVotante.barrio} onChange={(e) => setFormVotante({ ...formVotante, barrio: e.target.value })} required style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px", background: "white" }}><option value="">Elegir barrio...</option>{LISTA_BARRIOS.map((b) => <option key={b} value={b}>{b}</option>)}</select></div>
                
                <button type="submit" style={{ background: "#C8102E", color: "white", fontWeight: "900", padding: "20px", borderRadius: "15px", border: "none", fontSize: "18px", marginTop: 10 }}>{editIdVotante ? "ACTUALIZAR DATOS" : "GUARDAR REGISTRO"}</button>
              </form>
            </div>
          </div>
        )}

        {activeTab === "votantes" && (
          <div className="card" style={{ background: "white", padding: isMobile ? 15 : 30, borderRadius: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
            <h3 style={{ color: "#C8102E", fontWeight: "900", marginBottom: 20, fontSize: "18px", textTransform: "uppercase" }}>Listado General</h3>
            <input type="text" placeholder="🔍 Buscar por nombre o CI..." value={busquedaLista} onChange={(e) => setBusquedaLista(e.target.value)} style={{ width: "100%", padding: "15px", borderRadius: "15px", border: "2px solid #f1f5f9", marginBottom: 25, fontSize: "16px" }} />
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <div style={{ minWidth: isMobile ? "500px" : "100%", overflowY: "auto", maxHeight: "60vh" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                    <tr style={{ fontSize: "11px", color: "#64748b" }}><th style={{ padding: 15, textAlign: "left" }}>NOMBRE</th><th style={{ padding: 15, textAlign: "left" }}>CÉDULA</th><th style={{ padding: 15, textAlign: "center" }}>ACCIONES</th></tr>
                  </thead>
                  <tbody>
                    {(votantesUnicos || []).filter((v) => (v?.nombre + v?.apellido + v?.cedula).toLowerCase().includes(busquedaLista.toLowerCase())).map((v) => (
                      <tr key={v?.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: 15, fontWeight: "700", color: "#1e293b" }}>{v?.nombre} {v?.apellido}<br /><small style={{ color: "#94a3b8" }}>{v?.barrio}</small></td>
                        <td style={{ padding: 15, color: "#475569" }}>{v?.cedula}</td>
                        <td style={{ padding: 15, textAlign: "center", display: "flex", gap: 5, justifyContent: "center" }}>
                          <button onClick={() => { setFormVotante(v); setEditIdVotante(v.id); setActiveTab("inicio"); window.scrollTo(0, 0); }} style={{ padding: "8px 15px", background: "#f1f5f9", border: "none", borderRadius: "10px", fontWeight: "800", color: "#64748b", fontSize: "10px" }}>EDITAR</button>
                          <button onClick={async () => { if (confirm("¿Borrar?")) { await supabase.from("votantes").delete().eq("id", v.id); cargarDatos(); } }} style={{ padding: "8px 15px", background: "#dc2626", color: "white", border: "none", borderRadius: "10px", fontWeight: "800", fontSize: "10px" }}>BORRAR</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "equipo" && userRole === "administrador" && (
          <div style={{ display: "grid", gap: 30 }}>
            <div className="card" style={{ background: "white", padding: 25, borderRadius: "25px" }}>
              <h3 style={{ color: "#C8102E", fontWeight: "900", marginBottom: 25, textAlign: "center", textTransform: "uppercase" }}>Gestión de Equipo</h3>
              <form onSubmit={guardarEquipo} style={{ display: "grid", gap: 15 }}>
                <input type="text" placeholder="Nombre completo" value={formEquipo.nombre} onChange={(e) => setFormEquipo({ ...formEquipo, nombre: e.target.value })} required style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                  <input type="text" placeholder="Teléfono" value={formEquipo.telefono} onChange={(e) => setFormEquipo({ ...formEquipo, telefono: e.target.value })} style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0" }} />
                  <input type="text" placeholder="Zona o Barrio" value={formEquipo.zona} onChange={(e) => setFormEquipo({ ...formEquipo, zona: e.target.value })} style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0" }} />
                </div>
                {!editIdEquipo && (
                  <div style={{ padding: 15, background: "#f8fafc", borderRadius: 12, border: "1px dashed #cbd5e1" }}>
                    <p style={{ margin: "0 0 10px 0", fontSize: "11px", fontWeight: "800", color: "#64748b" }}>CREDENCIALES DE ACCESO AL SISTEMA</p>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 15 }}>
                      <input type="email" placeholder="Correo electrónico" value={formEquipo.email} onChange={(e) => setFormEquipo({ ...formEquipo, email: e.target.value })} required style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0" }} />
                      <input type="password" placeholder="Contraseña (mín 6 letras)" value={formEquipo.password} onChange={(e) => setFormEquipo({ ...formEquipo, password: e.target.value })} required minLength={6} style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0" }} />
                    </div>
                  </div>
                )}
                <select value={formEquipo.rol} onChange={(e) => setFormEquipo({ ...formEquipo, rol: e.target.value })} required style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0", background: "white" }}>
                  <option value="coordinador">Coordinador (Solo ve su zona)</option>
                  <option value="administrador">Administrador (Ve todo)</option>
                </select>
                <button type="submit" disabled={loading} style={{ background: "#C8102E", color: "white", fontWeight: "900", padding: "16px", borderRadius: "12px", border: "none" }}>
                  {loading ? "GUARDANDO..." : editIdEquipo ? "ACTUALIZAR DATOS" : "CREAR USUARIO"}
                </button>
              </form>
            </div>
            <div className="card" style={{ background: "white", padding: 25, borderRadius: "25px" }}>
              <h4 style={{ fontWeight: "900", color: "#1e293b", marginBottom: 20 }}>MIEMBROS ACTIVOS</h4>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", minWidth: "400px" }}>
                  <tbody>
                    {(equipo || []).map((m) => (
                      <tr key={m?.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: 15, fontWeight: "700" }}>{m?.nombre}<br /><small style={{ color: "#64748b" }}>{m?.rol}</small><br /><small style={{ color: "#64748b" }}>{m?.telefono}</small></td>
                        <td style={{ padding: 15, color: "#C8102E", fontWeight: "800", textTransform: "uppercase", fontSize: "10px" }}>{m?.zona}</td>
                        <td style={{ padding: 15, textAlign: "center", display: "flex", gap: 5 }}>
                          <button onClick={() => { setFormEquipo(m); setEditIdEquipo(m.id); window.scrollTo(0, 0); }} style={{ padding: "6px 12px", background: "#f1f5f9", border: "none", borderRadius: "8px", fontWeight: "800", fontSize: "10px" }}>EDITAR</button>
                          <button onClick={async () => { if (confirm("¿Seguro que deseas eliminar este miembro?")) { await supabase.from("equipo").delete().eq("id", m.id); cargarDatos(); } }} style={{ padding: "6px 12px", background: "#dc2626", color: "white", border: "none", borderRadius: "8px", fontWeight: "800", fontSize: "10px" }}>BORRAR</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "reportes" && userRole === "administrador" && (
          <div style={{ display: "grid", gap: 30 }}>
            <div className="card" style={{ background: "white", padding: 30, borderRadius: "25px" }}>
              <h3 style={{ color: "#C8102E", fontWeight: "900", marginBottom: 25, textTransform: "uppercase" }}>Rendimiento</h3>
              {(rendimientoEquipo || []).map((m) => (
                <div key={m?.id} style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "900", color: "#475569", marginBottom: 8 }}>
                    <span>{m?.nombre}</span>
                    <span>{m?.cantidad} ({m?.porcentaje}%)</span>
                  </div>
                  <div style={{ width: "100%", height: "12px", background: "#f1f5f9", borderRadius: "10px", overflow: "hidden" }}>
                    <div style={{ width: `${m?.porcentaje}%`, height: "100%", background: "#C8102E" }}></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="card" style={{ background: "white", padding: 25, borderRadius: "25px" }}>
              <h3 style={{ color: "#C8102E", fontWeight: "900", marginBottom: 25, textTransform: "uppercase" }}>Votos por Barrio</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#C8102E" }}>
                  <tr style={{ fontSize: "12px", color: "white", fontWeight: "900" }}>
                    <th style={{ padding: "12px", textAlign: "left" }}>BARRIO</th>
                    <th style={{ padding: "12px", textAlign: "right" }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {(conteoBarrio || []).map((b) => (
                    <tr key={b?.name} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px", fontWeight: "700", color: "#334155", fontSize: "14px" }}>{b?.name}</td>
                      <td style={{ textAlign: "right", fontWeight: "900", color: "#C8102E", fontSize: "15px", paddingRight: "12px" }}>{b?.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {userRole === "administrador" && (
        <button onClick={exportarExcel} style={{ position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)", background: "#16a34a", color: "white", padding: "18px 40px", borderRadius: "50px", fontWeight: "900", border: "none", boxShadow: "0 10px 30px rgba(22,163,74,0.3)", cursor: "pointer", zIndex: 1000, display: "flex", gap: 10, alignItems: "center" }}>
          <span>📥</span> EXPORTAR EXCEL
        </button>
      )}
    </div>
  );
}