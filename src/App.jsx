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
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f3f4f6", padding: 20 }}>
      <div className="card" style={{ width: "100%", maxWidth: 400, padding: 30 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 20 }}>Acceso al Sistema</h2>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }} style={{ display: "grid", gap: 15 }}>
          <input type="email" placeholder="Correo" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading} style={{ background: '#000', color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}>
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

  // Buscadores y Vistas
  const [busquedaVotante, setBusquedaVotante] = useState("");
  const [verTodosVotantes, setVerTodosVotantes] = useState(false);
  const [cedulaRapida, setCedulaRapida] = useState("");
  const [buscandoCedula, setBuscandoCedula] = useState(false);
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

  // --- RENDIMIENTO (BARRAS AZULES) ---
  const rendimientoEquipo = useMemo(() => {
    const totalVotantes = votantes.length;
    return equipo.map(m => {
      const cant = votantes.filter(v => v.por_parte_de_id === m.id).length;
      const porc = totalVotantes > 0 ? Math.round((cant / totalVotantes) * 100) : 0;
      return { ...m, cant, porc };
    }).sort((a, b) => b.cant - a.cant);
  }, [votantes, equipo]);

  // --- CONTEO POR BARRIO ---
  const conteoBarrio = useMemo(() => {
    const counts = {};
    votantes.forEach(v => {
      const b = v.barrio || "Sin barrio";
      counts[b] = (counts[b] || 0) + 1;
    });
    return Object.entries(counts).map(([name, total]) => ({ name, total }));
  }, [votantes]);

  // --- ACCIONES ---
  async function buscarEnPadron() {
    const limpia = normalizarCedula(cedulaRapida);
    if (!limpia) return;
    setBuscandoCedula(true); setResultadoPadron(null);
    const { data } = await supabase.from("padron_importado").select("*").or(`cedula_limpia.eq.${limpia},cedula.eq.${cedulaRapida}`).limit(1).maybeSingle();
    if (data) setResultadoPadron(data);
    else alert("No se encontró en el padrón.");
    setBuscandoCedula(false);
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

  async function guardarEquipo(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = editIdEquipo ? await supabase.from("equipo").update(formEquipo).eq("id", editIdEquipo) : await supabase.from("equipo").insert([formEquipo]);
    if (!error) { setFormEquipo({ nombre: "", telefono: "", rol: "coordinador", zona: "" }); setEditIdEquipo(null); cargarDatos(); }
    setLoading(false);
  }

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(votantes);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Votantes");
    XLSX.writeFile(wb, "Reporte_Campana.xlsx");
  };

  const votantesFiltrados = votantes.filter(v => Object.values(v).some(val => String(val).toLowerCase().includes(busquedaVotante.toLowerCase())));
  const votantesVisibles = verTodosVotantes ? votantesFiltrados : votantesFiltrados.slice(0, 10);

  if (!session) return <LoginScreen onLogin={async (e, p) => await supabase.auth.signInWithPassword({ email: e, password: p })} loading={loading} />;

  return (
    <div style={{ padding: isMobile ? 10 : 30, maxWidth: 1400, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30, alignItems: 'center' }}>
        <h1 style={{ fontSize: isMobile ? 20 : 28 }}>Campaña Presidente Franco</h1>
        <button onClick={() => supabase.auth.signOut()} style={{ width: 'auto', background: '#333' }}>Salir</button>
      </header>

      {/* SECCIÓN ESTADÍSTICAS Y BUSCADOR RÁPIDO */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 20, marginBottom: 30 }}>
        
        {/* BUSCADOR PADRÓN CON ASIGNAR */}
        <div className="card">
          <h4>Buscador de Padrón</h4>
          <div style={{ display: 'flex', gap: 5 }}>
            <input type="text" placeholder="Cédula..." value={cedulaRapida} onChange={e => setCedulaRapida(e.target.value)} />
            <button onClick={buscarEnPadron} style={{ width: 'auto' }}>🔍</button>
          </div>
          {resultadoPadron && (
            <div style={{ marginTop: 15, padding: 10, background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
              <p style={{ margin: 0, fontSize: 13 }}><strong>{resultadoPadron.nombre} {resultadoPadron.apellido}</strong></p>
              <button onClick={() => { setFormVotante({ ...formVotante, ...resultadoPadron }); setResultadoPadron(null); }} 
                style={{ background: '#16a34a', padding: '5px 10px', fontSize: 12, marginTop: 5 }}>ASIGNAR</button>
            </div>
          )}
        </div>

        {/* RENDIMIENTO (FOTO 1 y 6) */}
        <div className="card">
          <h4 style={{ margin: '0 0 10px 0' }}>Conteo de futuros votantes por miembro del equipo</h4>
          <button onClick={exportarExcel} style={{ background: '#000', marginBottom: 15, width: 'auto', padding: '8px 15px' }}>Exportar Excel</button>
          <div style={{ display: 'grid', gap: 12 }}>
            {rendimientoEquipo.map(m => (
              <div key={m.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>{m.nombre}</span> <strong>{m.cant} ({m.porc}%)</strong>
                </div>
                <div style={{ width: '100%', height: 8, background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${m.porc}%`, height: '100%', background: '#2563eb' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CONTEO POR BARRIO (FOTO 2) */}
        <div className="card">
          <h4>Conteo por barrio</h4>
          <table style={{ width: '100%', fontSize: 13 }}>
            <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}><th>Barrio</th><th>Total</th></tr></thead>
            <tbody>
              {conteoBarrio.map(b => <tr key={b.name} style={{ borderBottom: '1px solid #fafafa' }}><td>{b.name}</td><td>{b.total}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORMULARIO Y LISTA DE VOTANTES (FOTO 3 y 4) */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '380px 1fr', gap: 30 }}>
        <div className="card">
          <h3>Cargar futuros votantes</h3>
          <form onSubmit={guardarVotante} style={{ display: 'grid', gap: 10 }}>
            <input placeholder="Nombre" value={formVotante.nombre} onChange={e => setFormVotante({ ...formVotante, nombre: e.target.value })} required />
            <input placeholder="Apellido" value={formVotante.apellido} onChange={e => setFormVotante({ ...formVotante, apellido: e.target.value })} required />
            <input placeholder="Cédula" value={formVotante.cedula} onChange={e => setFormVotante({ ...formVotante, cedula: e.target.value })} required />
            <input placeholder="Orden" value={formVotante.orden} onChange={e => setFormVotante({ ...formVotante, orden: e.target.value })} />
            <input placeholder="Mesa" value={formVotante.mesa} onChange={e => setFormVotante({ ...formVotante, mesa: e.target.value })} />
            <input placeholder="Local de votación" value={formVotante.local_votacion} onChange={e => setFormVotante({ ...formVotante, local_votacion: e.target.value })} />
            <input placeholder="Seccional" value={formVotante.seccional} onChange={e => setFormVotante({ ...formVotante, seccional: e.target.value })} />
            <input placeholder="Barrio" value={formVotante.barrio} onChange={e => setFormVotante({ ...formVotante, barrio: e.target.value })} />
            <select value={formVotante.por_parte_de_id} onChange={e => setFormVotante({ ...formVotante, por_parte_de_id: e.target.value })} required>
              <option value="">Seleccionar miembro del equipo</option>
              {equipo.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
            <button type="submit" style={{ background: '#000', color: '#fff' }}>{editIdVotante ? "Actualizar" : "Guardar futuro votante"}</button>
          </form>
        </div>

        <div className="card">
          <h3>Lista de futuros votantes</h3>
          <input placeholder="🔍 Buscar por nombre, apellido, cédula, local o equipo" value={busquedaVotante} onChange={e => setBusquedaVotante(e.target.value)} style={{ marginBottom: 15 }} />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th>Nombre</th><th>Apellido</th><th>Cédula</th><th>Mesa</th><th>Local</th><th>Barrio</th><th>Por parte de</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {votantesVisibles.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td>{v.nombre}</td><td>{v.apellido}</td><td>{v.cedula}</td><td>{v.mesa}</td><td>{v.local_votacion}</td><td>{v.barrio}</td><td>{v.por_parte_de_nombre}</td>
                    <td>
                      <button onClick={() => { setFormVotante(v); setEditIdVotante(v.id); }} style={{ padding: '4px 8px', background: '#2563eb', marginRight: 5 }}>Editar</button>
                      <button onClick={async () => { if(confirm("¿Borrar?")) { await supabase.from("votantes").delete().eq("id", v.id); cargarDatos(); } }} style={{ padding: '4px 8px', background: '#dc2626' }}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!verTodosVotantes && votantesFiltrados.length > 10 && <button onClick={() => setVerTodosVotantes(true)} style={{ marginTop: 15, background: '#64748b' }}>Mostrar todo</button>}
        </div>
      </div>

      {/* GESTIÓN DE EQUIPO (FOTO 5) */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '380px 1fr', gap: 30, marginTop: 40 }}>
        <div className="card">
          <h3>Equipo de campaña</h3>
          <form onSubmit={guardarEquipo} style={{ display: 'grid', gap: 10 }}>
            <input placeholder="Nombre del miembro" value={formEquipo.nombre} onChange={e => setFormEquipo({ ...formEquipo, nombre: e.target.value })} required />
            <input placeholder="Teléfono" value={formEquipo.telefono} onChange={e => setFormEquipo({ ...formEquipo, telefono: e.target.value })} />
            <input placeholder="Zona o barrio" value={formEquipo.zona} onChange={e => setFormEquipo({ ...formEquipo, zona: e.target.value })} />
            <select value={formEquipo.rol} onChange={e => setFormEquipo({ ...formEquipo, rol: e.target.value })}>
              <option value="coordinador">Coordinador</option>
              <option value="jefe_de_campana">Jefe de Campaña</option>
            </select>
            <button type="submit" style={{ background: '#000', color: '#fff' }}>Guardar usuario</button>
          </form>
        </div>
        <div className="card">
          <h3>Lista del equipo</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}><th>Nombre</th><th>Rol</th><th>Zona</th><th>Acciones</th></tr></thead>
            <tbody>
              {equipo.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td><strong>{m.nombre}</strong><br/><small>{m.telefono}</small></td><td>{m.rol}</td><td>{m.zona}</td>
                  <td>
                    <button onClick={() => { setFormEquipo(m); setEditIdEquipo(m.id); }} style={{ padding: '4px 8px', background: '#2563eb', marginRight: 5 }}>Editar</button>
                    <button onClick={async () => { if(confirm("¿Eliminar?")) { await supabase.from("equipo").delete().eq("id", m.id); cargarDatos(); } }} style={{ padding: '4px 8px', background: '#dc2626' }}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}