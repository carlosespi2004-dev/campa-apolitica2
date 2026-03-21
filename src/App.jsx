import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Helper para evitar esperas infinitas en LECTURAS
function withTimeout(promise, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Tiempo de espera agotado")), ms)
    ),
  ]);
}

// --- FUNCIONES DE NORMALIZACIÓN ---
function normalizarCedula(valor) {
  return String(valor || "").replace(/[.\-\s]/g, "").trim();
}

function normalizarTexto(valor) {
  return String(valor || "").trim();
}

function normalizarEncabezado(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function mapearFilaExcel(fila) {
  const salida = {};
  Object.keys(fila || {}).forEach((key) => {
    const limpio = normalizarEncabezado(key);
    salida[limpio] = fila[key];
  });

  return {
    nombre: salida.nombre || "",
    apellido: salida.apellido || "",
    cedula: salida.cedula || "",
    orden: salida.orden || "",
    mesa: salida.mesa || "",
    local_votacion: salida.localdevotacion || salida.localvotacion || salida.local || "",
    seccional: salida.seccional || "",
    barrio: salida.barrio || "",
    por_parte_de: salida.porpartede || salida.porparte || salida.responsable || "",
  };
}

const initialForm = {
  nombre: "", apellido: "", cedula: "", orden: "", mesa: "",
  local_votacion: "", seccional: "", barrio: "",
  por_parte_de_id: "", por_parte_de_nombre: "", por_parte_de: "",
};

const initialEquipoForm = { nombre: "", telefono: "", rol: "coordinador", zona: "" };

// --- COMPONENTE LOGIN ---
function LoginScreen({ onLogin, loading }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    await onLogin(email, password);
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f3f4f6", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "white", borderRadius: 16, padding: 24, boxShadow: "0 8px 30px rgba(0,0,0,.08)" }}>
        <h1 style={{ marginTop: 0 }}>Ingreso al sistema</h1>
        <p style={{ color: "#666" }}>Campaña Política · Presidente Franco</p>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <input type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading}>
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const [form, setForm] = useState(initialForm);
  const [votantes, setVotantes] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  const [equipo, setEquipo] = useState([]);
  const [formEquipo, setFormEquipo] = useState(initialEquipoForm);
  const [guardandoEquipo, setGuardandoEquipo] = useState(false);
  const [editandoEquipoId, setEditandoEquipoId] = useState(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [cedulaBusqueda, setCedulaBusqueda] = useState("");
  const [buscandoCedula, setBuscandoCedula] = useState(false);
  const [resultadoCedula, setResultadoCedula] = useState(null);
  const [mensajeCedula, setMensajeCedula] = useState("");

  const [archivoExcelPadron, setArchivoExcelPadron] = useState(null);
  const [importandoPadron, setImportandoPadron] = useState(false);
  const [estadoImportacionPadron, setEstadoImportacionPadron] = useState("");

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // --- LÓGICA DE AUTH ---
  useEffect(() => {
    let mounted = true;
    async function initAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        if (mounted && data?.session) {
          setSession(data.session);
          const { data: p } = await supabase.from("profiles").select("*").eq("id", data.session.user.id).single();
          setPerfil(p);
        }
      } catch (err) { console.error(err); }
      finally { if (mounted) setAuthLoading(false); }
    }
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (!currentSession) setPerfil(null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // --- CARGA DE DATOS ---
  async function cargarTodo() {
    if (!session) return;
    setDataLoading(true);
    try {
      const [vRes, eRes] = await Promise.all([
        supabase.from("votantes").select("*").order("created_at", { ascending: false }),
        supabase.from("equipo").select("*").order("created_at", { ascending: false })
      ]);
      setVotantes(vRes.data || []);
      setEquipo(eRes.data || []);
    } finally { setDataLoading(false); }
  }

  useEffect(() => { cargarTodo(); }, [session]);

  // --- ACCIONES ---
  async function login(email, password) {
    setLoginLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    } finally { setLoginLoading(false); }
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
  }

  async function buscarPersonaPorCedula() {
    const limpia = normalizarCedula(cedulaBusqueda);
    if (!limpia) return setMensajeCedula("Ingresá una cédula.");

    setBuscandoCedula(true);
    setResultadoCedula(null);
    setMensajeCedula("");

    try {
      // Búsqueda optimizada con OR
      const { data, error } = await supabase
        .from("padron_importado")
        .select("*")
        .or(`cedula_limpia.eq.${limpia},cedula.eq.${cedulaBusqueda}`)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) setMensajeCedula("No se encontró a nadie con esa cédula.");
      else setResultadoCedula(data);
    } catch (err) {
      setMensajeCedula("Error al conectar con la base de datos.");
    } finally { setBuscandoCedula(false); }
  }

  async function guardarVotante(e) {
    e.preventDefault();
    if (!form.por_parte_de_id) return alert("Debes seleccionar un responsable del equipo.");
    
    setGuardando(true);
    try {
      const cedulaLimpia = normalizarCedula(form.cedula);
      const payload = {
        ...form,
        cedula_limpia: cedulaLimpia,
        nombre: normalizarTexto(form.nombre),
        apellido: normalizarTexto(form.apellido),
      };

      const { error } = editandoId 
        ? await supabase.from("votantes").update(payload).eq("id", editandoId)
        : await supabase.from("votantes").insert([payload]);

      if (error) throw error;
      setForm(initialForm);
      setEditandoId(null);
      await cargarTodo();
      alert("¡Datos guardados!");
    } catch (err) {
      alert("Error: " + err.message);
    } finally { setGuardando(false); }
  }

  async function importarExcelPadron() {
    if (!archivoExcelPadron) return alert("Seleccioná un archivo.");
    setImportandoPadron(true);
    setEstadoImportacionPadron("Procesando archivo...");

    try {
      const buffer = await archivoExcelPadron.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const filas = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
      
      const procesadas = filas.map(mapearFilaExcel).filter(f => normalizarCedula(f.cedula));
      
      setEstadoImportacionPadron(`Subiendo ${procesadas.length} registros...`);
      
      // Lotes más pequeños para evitar timeouts en Vercel
      const loteSize = 100;
      for (let i = 0; i < procesadas.length; i += loteSize) {
        const bloque = procesadas.slice(i, i + loteSize).map(f => ({
          ...f,
          cedula_limpia: normalizarCedula(f.cedula)
        }));
        const { error } = await supabase.from("padron_importado").insert(bloque);
        if (error) throw error;
        setEstadoImportacionPadron(`Progreso: ${i + bloque.length} / ${procesadas.length}`);
      }
      setEstadoImportacionPadron("¡Importación exitosa!");
    } catch (err) {
      setEstadoImportacionPadron("Error: " + err.message);
    } finally { setImportandoPadron(false); }
  }

  // --- RENDERIZADO (Simplificado para el ejemplo, mantén tus estilos) ---
  if (authLoading) return <div style={{textAlign:'center', padding:50}}><h2>Cargando sistema...</h2></div>;
  if (!session) return <LoginScreen onLogin={login} loading={loginLoading} />;

  return (
    <div className="container" style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1>Campaña Presidente Franco</h1>
        <button onClick={logout} style={{ background: '#dc2626', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8 }}>Cerrar Sesión</button>
      </div>

      {/* SECCIÓN BÚSQUEDA RÁPIDA */}
      <div className="card" style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.1)', marginBottom: 20 }}>
        <h3>Buscador del Padrón</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <input 
            type="text" 
            placeholder="Nro de Cédula..." 
            value={cedulaBusqueda} 
            onChange={(e) => setCedulaBusqueda(e.target.value)}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          />
          <button onClick={buscarPersonaPorCedula} disabled={buscandoCedula} style={{ padding: '10px 20px' }}>
            {buscandoCedula ? "Buscando..." : "Buscar"}
          </button>
        </div>
        {mensajeCedula && <p style={{ color: 'red' }}>{mensajeCedula}</p>}
        {resultadoCedula && (
          <div style={{ marginTop: 15, padding: 15, background: '#f9f9f9', borderRadius: 8, border: '1px solid #eee' }}>
            <p><strong>Votante:</strong> {resultadoCedula.nombre} {resultadoCedula.apellido}</p>
            <p><strong>Local:</strong> {resultadoCedula.local_votacion} - Mesa: {resultadoCedula.mesa}</p>
            <button onClick={() => {
              setForm({
                ...initialForm,
                nombre: resultadoCedula.nombre,
                apellido: resultadoCedula.apellido,
                cedula: resultadoCedula.cedula,
                local_votacion: resultadoCedula.local_votacion,
                mesa: resultadoCedula.mesa,
                orden: resultadoCedula.orden
              });
            }}>Cargar en Formulario</button>
          </div>
        )}
      </div>

      {/* FORMULARIO DE REGISTRO */}
      <div className="card" style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h3>{editandoId ? "Editar Registro" : "Nuevo Futuro Votante"}</h3>
        <form onSubmit={guardarVotante} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 15 }}>
          <input type="text" placeholder="Nombre" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required />
          <input type="text" placeholder="Apellido" value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})} required />
          <input type="text" placeholder="Cédula" value={form.cedula} onChange={e => setForm({...form, cedula: e.target.value})} required />
          
          <select 
            value={form.por_parte_de_id} 
            onChange={e => {
              const m = equipo.find(x => x.id == e.target.value);
              setForm({...form, por_parte_de_id: e.target.value, por_parte_de_nombre: m?.nombre || ""});
            }}
            required
          >
            <option value="">Seleccionar Responsable...</option>
            {equipo.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>

          <button type="submit" disabled={guardando} style={{ gridColumn: isMobile ? 'auto' : 'span 2', background: '#2563eb', color: 'white', padding: 15, border: 'none', borderRadius: 8 }}>
            {guardando ? "Guardando..." : "Confirmar Registro"}
          </button>
        </form>
      </div>

      {/* IMPORTACIÓN EXCEL */}
      <div className="card" style={{ marginTop: 20, padding: 20, background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0' }}>
        <h4>Importar Padrón (Excel)</h4>
        <input type="file" accept=".xlsx" onChange={e => setArchivoExcelPadron(e.target.files[0])} />
        <button onClick={importarExcelPadron} disabled={importandoPadron} style={{ marginTop: 10 }}>
          {importandoPadron ? "Procesando..." : "Subir al Sistema"}
        </button>
        {estadoImportacionPadron && <p>{estadoImportacionPadron}</p>}
      </div>
    </div>
  );
}