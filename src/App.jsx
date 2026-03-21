import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- HELPERS ---
const normalizarCedula = (v) => String(v || "").replace(/[.\-\s]/g, "").trim();

function LoginScreen({ onLogin, loading }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f4f4f4", padding: 20 }}>
      <div className="card-form" style={{ width: "100%", maxWidth: 400 }}>
        <h2 style={{ textAlign: 'center', color: '#C8102E', fontFamily: 'Montserrat' }}>Acceso al Sistema</h2>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }} className="form">
          <label>Correo Electrónico</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <label>Contraseña</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Iniciando..." : "Ingresar"}
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

  // Estados Formularios
  const [formVotante, setFormVotante] = useState({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", por_parte_de_id: "" });
  const [formEquipo, setFormEquipo] = useState({ nombre: "", telefono: "", rol: "coordinador", zona: "" });
  const [editIdVotante, setEditIdVotante] = useState(null);
  const [editIdEquipo, setEditIdEquipo] = useState(null);

  // Buscadores
  const [busquedaVotante, setBusquedaVotante] = useState("");
  const [verTodosVotantes, setVerTodosVotantes] = useState(false);
  const [cedulaRapida, setCedulaRapida] = useState("");
  const [resultadoPadron, setResultadoPadron] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session) cargarDatos(); }, [session]);

  async function cargarDatos() {
    setLoading(true);
    const [v, e] = await Promise.all([
      supabase.from("votantes").select("*").order("created_at", { ascending: false }),
      supabase.from("equipo").select("*").order("created_at", { ascending: false })
    ]);
    setVotantes(v.data || []);
    setEquipo(e.data || []);
    setLoading(false);
  }

  // Lógica de Rendimiento (Barras Rojas)
  const rendimientoEquipo = useMemo(() => {
    const total = votantes.length;
    return equipo.map(m => {
      const cant = votantes.filter(v => v.por_parte_de_id === m.id).length;
      const porc = total > 0 ? Math.round((cant / total) * 100) : 0;
      return { ...m, cant, porc };
    }).sort((a, b) => b.cant - a.cant);
  }, [votantes, equipo]);

  // Conteo por Barrio
  const conteoBarrio = useMemo(() => {
    const counts = {};
    votantes.forEach(v => { counts[v.barrio || "Sin barrio"] = (counts[v.barrio || "Sin barrio"] || 0) + 1; });
    return Object.entries(counts).map(([name, total]) => ({ name, total }));
  }, [votantes]);

  // Acciones
  async function buscarEnPadron() {
    const limpia = normalizarCedula(cedulaRapida);
    if (!limpia) return;
    const { data } = await supabase.from("padron_importado").select("*").or(`cedula_limpia.eq.${limpia},cedula.eq.${cedulaRapida}`).limit(1).maybeSingle();
    if (data) setResultadoPadron(data); else alert("No encontrado.");
  }

  async function guardarVotante(e) {
    e.preventDefault();
    if (!formVotante.por_parte_de_id) return alert("Selecciona un responsable.");
    setLoading(true);
    const responsable = equipo.find(m => m.id === formVotante.por_parte_de_id);
    const payload = { ...formVotante, cedula_limpia: normalizarCedula(formVotante.cedula), por_parte_de_nombre: responsable?.nombre || "" };
    const { error } = editIdVotante ? await supabase.from("votantes").update(payload).eq("id", editIdVotante) : await supabase.from("votantes").insert([payload]);
    if (!error) { setFormVotante({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", por_parte_de_id: "" }); setEditIdVotante(null); cargarDatos(); }
    setLoading(false);
  }

  if (!session) return <LoginScreen onLogin={async (e, p) => await supabase.auth.signInWithPassword({ email: e, password: p })} loading={loading} />;

  return (
    <div style={{ paddingBottom: 50 }}>
      {/* HEADER INSTITUCIONAL */}
      <header className="main-header">
        <button onClick={() => supabase.auth.signOut()} className="btn-primary btn-logout">Cerrar Sesión</button>
        <div className="logo-container">
          <h1 className="system-title">Campaña Política – Presidente Franco</h1>
        </div>
        <div className="user-session">
          Sesión iniciada como: <strong>{session.user.email}</strong>
        </div>
      </header>

      <div className="container">
        {/* DASHBOARD DE INDICADORES */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">{votantes.length}</span>
            <span className="stat-label">Total Futuros Votantes</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{equipo.length}</span>
            <span className="stat-label">Miembros del Equipo</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Rendimiento General</span>
            <div className="progress-bg"><div className="progress-fill" style={{ width: '100%' }}></div></div>
          </div>
        </div>

        <div className="grid">
          {/* BUSCADOR DE PADRÓN */}
          <div className="card-form">
            <h3>Buscador de Padrón</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              <input type="text" placeholder="Nro de Cédula..." value={cedulaRapida} onChange={e => setCedulaRapida(e.target.value)} />
              <button onClick={buscarEnPadron} style={{ width: 'auto' }} className="btn-primary">🔍</button>
            </div>
            {resultadoPadron && (
              <div style={{ marginTop: 15, padding: 15, background: '#f8f9fa', borderRadius: 10, borderLeft: '5px solid #16a34a' }}>
                <p><strong>{resultadoPadron.nombre} {resultadoPadron.apellido}</strong></p>
                <button onClick={() => { setFormVotante({ ...formVotante, ...resultadoPadron }); setResultadoPadron(null); }} className="btn-primary" style={{ background: '#16a34a' }}>ASIGNAR</button>
              </div>
            )}
          </div>

          {/* RENDIMIENTO EQUIPO */}
          <div className="card-form">
            <h3>Conteo por miembro del equipo</h3>
            <button onClick={() => {}} className="btn-primary" style={{ marginBottom: 15, width: 'auto', fontSize: 12 }}>Exportar Excel</button>
            {rendimientoEquipo.map(m => (
              <div key={m.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                  <span>{m.nombre}</span> <span>{m.cant} ({m.porc}%)</span>
                </div>
                <div className="progress-bg"><div className="progress-fill" style={{ width: `${m.porc}%` }}></div></div>
              </div>
            ))}
          </div>
        </div>

        {/* REGISTRO DE VOTANTES */}
        <div className="grid" style={{ marginTop: 30 }}>
          <div className="card-form">
            <h3>Cargar futuros votantes</h3>
            <form onSubmit={guardarVotante} className="form">
              <input placeholder="Nombre" value={formVotante.nombre} onChange={e => setFormVotante({...formVotante, nombre: e.target.value})} required />
              <input placeholder="Apellido" value={formVotante.apellido} onChange={e => setFormVotante({...formVotante, apellido: e.target.value})} required />
              <input placeholder="Cédula" value={formVotante.cedula} onChange={e => setFormVotante({...formVotante, cedula: e.target.value})} required />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input placeholder="Mesa" value={formVotante.mesa} onChange={e => setFormVotante({...formVotante, mesa: e.target.value})} />
                <input placeholder="Orden" value={formVotante.orden} onChange={e => setFormVotante({...formVotante, orden: e.target.value})} />
              </div>
              <input placeholder="Barrio" value={formVotante.barrio} onChange={e => setFormVotante({...formVotante, barrio: e.target.value})} />
              <select value={formVotante.por_parte_de_id} onChange={e => setFormVotante({...formVotante, por_parte_de_id: e.target.value})} required>
                <option value="">Seleccionar miembro del equipo</option>
                {equipo.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
              <button type="submit" className="btn-primary">Guardar futuro votante</button>
            </form>
          </div>

          {/* LISTADO PROFESIONAL */}
          <div className="table-container">
            <div style={{ padding: 20 }}>
              <h3>Lista de futuros votantes</h3>
              <input placeholder="🔍 Buscar por nombre, cédula o local..." value={busquedaVotante} onChange={e => setBusquedaVotante(e.target.value)} />
            </div>
            <table>
              <thead>
                <tr>
                  <th>Nombre</th><th>Cédula</th><th>Mesa</th><th>Barrio</th><th>Por parte de</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {votantes.filter(v => v.nombre.toLowerCase().includes(busquedaVotante.toLowerCase())).slice(0, 10).map(v => (
                  <tr key={v.id}>
                    <td>{v.nombre} {v.apellido}</td><td>{v.cedula}</td><td>{v.mesa}</td><td>{v.barrio}</td><td>{v.por_parte_de_nombre}</td>
                    <td>
                      <button className="btn-primary" style={{ padding: '5px 10px', fontSize: 11 }}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}