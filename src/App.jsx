import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// --- HELPERS ---
function normalizarCedula(valor) { return String(valor || "").replace(/[.\-\s]/g, "").trim(); }
function normalizarTexto(valor) { return String(valor || "").trim(); }
function normalizarEncabezado(texto) {
  return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function mapearFilaExcel(fila) {
  const salida = {};
  Object.keys(fila || {}).forEach((key) => {
    const limpio = normalizarEncabezado(key);
    salida[limpio] = fila[key];
  });
  return {
    nombre: salida.nombre || "", apellido: salida.apellido || "", cedula: salida.cedula || "",
    orden: salida.orden || "", mesa: salida.mesa || "",
    local_votacion: salida.localdevotacion || salida.localvotacion || salida.local || "",
    seccional: salida.seccional || "", barrio: salida.barrio || "",
    por_parte_de: salida.porpartede || salida.porparte || salida.responsable || "",
  };
}

const initialForm = {
  nombre: "", apellido: "", cedula: "", orden: "", mesa: "",
  local_votacion: "", seccional: "", barrio: "",
  por_parte_de_id: "", por_parte_de_nombre: "", por_parte_de: "",
};

const initialEquipoForm = { nombre: "", telefono: "", rol: "coordinador", zona: "" };

// --- LOGIN SCREEN ---
function LoginScreen({ onLogin, loading }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f3f4f6", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "white", borderRadius: 16, padding: 24, boxShadow: "0 8px 30px rgba(0,0,0,.08)" }}>
        <h1>Ingreso al sistema</h1>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }} style={{ display: "grid", gap: 12 }}>
          <input type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading}>{loading ? "Ingresando..." : "Iniciar sesión"}</button>
        </form>
      </div>
    </div>
  );
}

// --- APP PRINCIPAL ---
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

  // --- EFECTOS ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) cargarPerfil(session.user.id);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) cargarPerfil(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session) cargarTodo(); }, [session]);

  // --- FUNCIONES DE CARGA ---
  async function cargarPerfil(id) {
    const { data } = await supabase.from("profiles").select("*").eq("id", id).single();
    if (data) setPerfil(data);
  }

  async function cargarTodo() {
    setDataLoading(true);
    try {
      const [v, e] = await Promise.all([
        supabase.from("votantes").select("*").order("created_at", { ascending: false }),
        supabase.from("equipo").select("*").order("created_at", { ascending: false })
      ]);
      setVotantes(v.data || []);
      setEquipo(e.data || []);
    } finally { setDataLoading(false); }
  }

  // --- ACCIONES ---
  async function login(email, password) {
    setLoginLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    } finally { setLoginLoading(false); }
  }

  async function buscarPersonaPorCedula() {
    const limpia = normalizarCedula(cedulaBusqueda);
    if (!limpia) return;
    setBuscandoCedula(true); setResultadoCedula(null); setMensajeCedula("");
    try {
      const { data, error } = await supabase.from("padron_importado").select("*")
        .or(`cedula_limpia.eq.${limpia},cedula.eq.${cedulaBusqueda}`).limit(1).maybeSingle();
      if (error) throw error;
      if (data) setResultadoCedula(data);
      else setMensajeCedula("No se encontró a la persona.");
    } catch (err) { setMensajeCedula("Error de conexión."); }
    finally { setBuscandoCedula(false); }
  }

  async function guardarVotante(e) {
    e.preventDefault();
    if (!form.por_parte_de_id) return alert("Selecciona un responsable.");
    setGuardando(true);
    try {
      const payload = { ...form, cedula_limpia: normalizarCedula(form.cedula) };
      const { error } = editandoId ? await supabase.from("votantes").update(payload).eq("id", editandoId) : await supabase.from("votantes").insert([payload]);
      if (error) throw error;
      setForm(initialForm); setEditandoId(null); await cargarTodo();
    } catch (err) { alert(err.message); }
    finally { setGuardando(false); }
  }

  async function importarExcelPadron() {
    if (!archivoExcelPadron) return;
    setImportandoPadron(true);
    try {
      const buffer = await archivoExcelPadron.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const filas = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      const procesadas = filas.map(mapearFilaExcel).filter(f => normalizarCedula(f.cedula));
      const lote = 100;
      for (let i = 0; i < procesadas.length; i += lote) {
        const bloque = procesadas.slice(i, i + lote).map(f => ({ ...f, cedula_limpia: normalizarCedula(f.cedula) }));
        await supabase.from("padron_importado").insert(bloque);
        setEstadoImportacionPadron(`Cargando: ${i + bloque.length} de ${procesadas.length}`);
      }
      setEstadoImportacionPadron("¡Éxito!");
    } catch (err) { setEstadoImportacionPadron("Error."); }
    finally { setImportandoPadron(false); }
  }

  // --- MEMOS (ESTADÍSTICAS ORIGINALES) ---
  const stats = useMemo(() => ({ total: votantes.length, equipo: equipo.length }), [votantes, equipo]);
  
  const conteoPorEquipo = useMemo(() => {
    const acc = {};
    equipo.forEach(m => acc[m.id] = { nombre: m.nombre, total: 0 });
    votantes.forEach(v => { if (acc[v.por_parte_de_id]) acc[v.por_parte_de_id].total++; });
    return Object.values(acc).sort((a, b) => b.total - a.total);
  }, [votantes, equipo]);

  if (authLoading) return <div style={{ display: "grid", placeItems: "center", height: "100vh" }}><h2>Cargando...</h2></div>;
  if (!session) return <LoginScreen onLogin={login} loading={loginLoading} />;

  return (
    <div className="container" style={{ padding: 20 }}>
      {/* HEADER ORIGINAL */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0 }}>Campaña Política · Presidente Franco</h1>
          <p className="small">Usuario: {perfil?.nombre || session.user.email}</p>
        </div>
        <button onClick={() => supabase.auth.signOut()} style={{ background: "#dc2626", width: "auto", padding: "8px 16px" }}>Cerrar sesión</button>
      </div>

      {/* STATS ORIGINALES */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)", gap: 16, marginTop: 20 }}>
        <div className="stat"><h3>{stats.total}</h3><p>Votantes</p></div>
        <div className="stat"><h3>{stats.equipo}</h3><p>Equipo</p></div>
        
        {/* BUSCADOR DE CEDULA INTEGRADO */}
        <div className="card" style={{ gridColumn: isMobile ? "span 1" : "span 2" }}>
          <h4 style={{ margin: 0 }}>Buscador de Padrón</h4>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input type="text" placeholder="Cédula..." value={cedulaBusqueda} onChange={(e) => setCedulaBusqueda(e.target.value)} style={{ marginBottom: 0 }} />
            <button onClick={buscarPersonaPorCedula} style={{ width: "auto" }}>{buscandoCedula ? "..." : "Buscar"}</button>
          </div>
          {resultadoCedula && (
            <div style={{ marginTop: 10, padding: 10, background: "#f8fafc", borderRadius: 8, fontSize: 13, border: "1px solid #e2e8f0" }}>
              <strong>{resultadoCedula.nombre} {resultadoCedula.apellido}</strong><br/>
              Loc: {resultadoCedula.local_votacion} | Mesa: {resultadoCedula.mesa}
              <button onClick={() => {
                setForm({ ...initialForm, nombre: resultadoCedula.nombre, apellido: resultadoCedula.apellido, cedula: resultadoCedula.cedula, local_votacion: resultadoCedula.local_votacion, mesa: resultadoCedula.mesa, orden: resultadoCedula.orden });
              }} style={{ marginTop: 8, padding: "4px 8px", fontSize: 12, background: "#16a34a" }}>ASIGNAR A FORMULARIO</button>
            </div>
          )}
        </div>
      </div>

      {/* LAYOUT PRINCIPAL DE DOS COLUMNAS */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20, marginTop: 20 }}>
        
        {/* COLUMNA IZQUIERDA: FORMULARIO */}
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{editandoId ? "Editar Votante" : "Registrar Votante"}</h2>
          <form onSubmit={guardarVotante} style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input type="text" placeholder="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
              <input type="text" placeholder="Apellido" value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} required />
            </div>
            <input type="text" placeholder="Cédula" value={form.cedula} onChange={e => setForm({ ...form, cedula: e.target.value })} required />
            <select value={form.por_parte_de_id} onChange={e => {
              const m = equipo.find(x => x.id == e.target.value);
              setForm({ ...form, por_parte_de_id: e.target.value, por_parte_de_nombre: m?.nombre || "" });
            }} required>
              <option value="">¿Quién lo consiguió?</option>
              {equipo.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input type="text" placeholder="Local" value={form.local_votacion} onChange={e => setForm({ ...form, local_votacion: e.target.value })} />
              <input type="text" placeholder="Mesa" value={form.mesa} onChange={e => setForm({ ...form, mesa: e.target.value })} />
            </div>
            <button type="submit" disabled={guardando}>{guardando ? "Guardando..." : "Guardar Registro"}</button>
            {editandoId && <button type="button" onClick={() => { setEditandoId(null); setForm(initialForm); }} style={{ background: "#64748b" }}>Cancelar</button>}
          </form>
        </div>

        {/* COLUMNA DERECHA: CONTEO POR EQUIPO */}
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Rendimiento del Equipo</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {conteoPorEquipo.map(item => (
              <div key={item.nombre}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}>
                  <span>{item.nombre}</span>
                  <strong>{item.total}</strong>
                </div>
                <div style={{ width: "100%", height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${(item.total / (stats.total || 1)) * 100}%`, height: "100%", background: "#3b82f6" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECCIÓN DE IMPORTACIÓN Y LISTADO */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3>Importar Padrón (.xlsx)</h3>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="file" accept=".xlsx" onChange={e => setArchivoExcelPadron(e.target.files[0])} />
          <button onClick={importarExcelPadron} disabled={importandoPadron} style={{ width: "auto" }}>Subir</button>
        </div>
        {estadoImportacionPadron && <p className="small">{estadoImportacionPadron}</p>}
      </div>
    </div>
  );
}