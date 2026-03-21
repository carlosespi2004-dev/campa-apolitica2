import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// --- HELPERS ---
const normalizarCedula = (v) => String(v || "").replace(/[.\-\s]/g, "").trim();

// --- LOGIN ---
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
          <button type="submit" disabled={loading} style={{ background: '#000' }}>{loading ? "Iniciando..." : "Ingresar"}</button>
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

  const [formVotante, setFormVotante] = useState({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", por_parte_de_id: "" });
  const [formEquipo, setFormEquipo] = useState({ nombre: "", telefono: "", rol: "coordinador", zona: "" });
  const [editIdVotante, setEditIdVotante] = useState(null);
  const [editIdEquipo, setEditIdEquipo] = useState(null);

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

  // --- LÓGICA DE RENDIMIENTO (BARRAS AZULES) ---
  const rendimientoEquipo = useMemo(() => {
    const totalVotantes = votantes.length;
    return equipo.map(miembro => {
      const cantidad = votantes.filter(v => v.por_parte_de_id === miembro.id).length;
      const porcentaje = totalVotantes > 0 ? Math.round((cantidad / totalVotantes) * 100) : 0;
      return { ...miembro, cantidad, porcentaje };
    }).sort((a, b) => b.cantidad - a.cantidad);
  }, [votantes, equipo]);

  async function buscarEnPadron() {
    const limpia = normalizarCedula(cedulaRapida);
    if (!limpia) return;
    setBuscandoCedula(true);
    setResultadoPadron(null);
    const { data } = await supabase.from("padron_importado").select("*")
      .or(`cedula_limpia.eq.${limpia},cedula.eq.${cedulaRapida}`).limit(1).maybeSingle();
    
    if (data) setResultadoPadron(data);
    else alert("No encontrado en el padrón.");
    setBuscandoCedula(false);
  }

  async function guardarVotante(e) {
    e.preventDefault();
    if (!formVotante.por_parte_de_id) return alert("Selecciona quién lo consiguió.");
    setLoading(true);
    const responsable = equipo.find(m => m.id === formVotante.por_parte_de_id);
    const payload = { ...formVotante, cedula_limpia: normalizarCedula(formVotante.cedula), por_parte_de_nombre: responsable?.nombre || "" };
    
    const { error } = editIdVotante 
      ? await supabase.from("votantes").update(payload).eq("id", editIdVotante)
      : await supabase.from("votantes").insert([payload]);

    if (!error) { 
      setFormVotante({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", por_parte_de_id: "" }); 
      setEditIdVotante(null); 
      cargarDatos(); 
    }
    setLoading(false);
  }

  function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(votantes);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Votantes");
    XLSX.writeFile(wb, "Reporte_Campana.xlsx");
  }

  if (!session) return <LoginScreen onLogin={async (e, p) => await supabase.auth.signInWithPassword({ email: e, password: p })} loading={loading} />;

  return (
    <div style={{ padding: isMobile ? 10 : 30, maxWidth: 1400, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30, alignItems: 'center' }}>
        <h1 style={{ fontSize: isMobile ? 20 : 28 }}>Campaña Presidente Franco</h1>
        <button onClick={() => supabase.auth.signOut()} style={{ width: 'auto', background: '#333' }}>Salir</button>
      </header>

      {/* DASHBOARD PRINCIPAL */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 20, marginBottom: 30 }}>
        <div className="card"><h3>{votantes.length}</h3><p>Votantes Registrados</p></div>
        
        {/* BUSCADOR PADRÓN */}
        <div className="card">
          <h4>Buscador de Padrón</h4>
          <div style={{ display: 'flex', gap: 5 }}>
            <input type="text" placeholder="Nro de Cédula..." value={cedulaRapida} onChange={e => setCedulaRapida(e.target.value)} />
            <button onClick={buscarEnPadron} style={{ width: 'auto' }}>🔍</button>
          </div>
          {resultadoPadron && (
            <div style={{ marginTop: 15, padding: 10, background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
              <p style={{ margin: 0, fontSize: 13 }}><strong>{resultadoPadron.nombre} {resultadoPadron.apellido}</strong></p>
              <button 
                onClick={() => { setFormVotante({ ...formVotante, ...resultadoPadron }); setResultadoPadron(null); }} 
                style={{ background: '#16a34a', padding: '5px 10px', fontSize: 12, marginTop: 5 }}
              >ASIGNAR</button>
            </div>
          )}
        </div>

        {/* RENDIMIENTO POR MIEMBRO (NUEVO / REINCORPORADO) */}
        <div className="card">
          <h4 style={{ margin: '0 0 15px 0' }}>Conteo por miembro del equipo</h4>
          <button onClick={exportarExcel} style={{ background: '#000', marginBottom: 15, width: 'auto', padding: '8px 15px', fontSize: 13 }}>Exportar Excel</button>
          <div style={{ display: 'grid', gap: 15 }}>
            {rendimientoEquipo.map(miembro => (
              <div key={miembro.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                  <span>{miembro.nombre}</span>
                  <strong>{miembro.cantidad} ({miembro.porcentaje}%)</strong>
                </div>
                <div style={{ width: '100%', height: 10, background: '#eee', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${miembro.porcentaje}%`, height: '100%', background: '#2563eb', transition: 'width 0.5s ease' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '380px 1fr', gap: 30 }}>
        {/* FORMULARIO */}
        <div className="card">
          <h3>Cargar futuros votantes</h3>
          <form onSubmit={guardarVotante} style={{ display: 'grid', gap: 10 }}>
            <input placeholder="Nombre" value={formVotante.nombre} onChange={e => setFormVotante({ ...formVotante, nombre: e.target.value })} required />
            <input placeholder="Apellido" value={formVotante.apellido} onChange={e => setFormVotante({ ...formVotante, apellido: e.target.value })} required />
            <input placeholder="Cédula" value={formVotante.cedula} onChange={e => setFormVotante({ ...formVotante, cedula: e.target.value })} required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input placeholder="Orden" value={formVotante.orden} onChange={e => setFormVotante({ ...formVotante, orden: e.target.value })} />
              <input placeholder="Mesa" value={formVotante.mesa} onChange={e => setFormVotante({ ...formVotante, mesa: e.target.value })} />
            </div>
            <input placeholder="Local" value={formVotante.local_votacion} onChange={e => setFormVotante({ ...formVotante, local_votacion: e.target.value })} />
            <input placeholder="Barrio" value={formVotante.barrio} onChange={e => setFormVotante({ ...formVotante, barrio: e.target.value })} />
            <select value={formVotante.por_parte_de_id} onChange={e => setFormVotante({ ...formVotante, por_parte_de_id: e.target.value })} required>
              <option value="">Seleccionar miembro...</option>
              {equipo.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
            <button type="submit" style={{ background: '#000' }}>Guardar Registro</button>
          </form>
        </div>

        {/* LISTADO */}
        <div className="card">
          <input placeholder="🔍 Buscar votante..." value={busquedaVotante} onChange={e => setBusquedaVotante(e.target.value)} style={{ marginBottom: 15 }} />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th>Nombre</th><th>Cédula</th><th>Mesa</th><th>Local</th><th>Barrio</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {votantes.filter(v => v.nombre.toLowerCase().includes(busquedaVotante.toLowerCase())).slice(0, 10).map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td>{v.nombre} {v.apellido}</td><td>{v.cedula}</td><td>{v.mesa}</td><td>{v.local_votacion}</td><td>{v.barrio}</td>
                    <td>
                      <button onClick={() => { setFormVotante(v); setEditIdVotante(v.id); }} style={{ padding: '3px 7px', background: '#2563eb', fontSize: 11, marginRight: 5 }}>Editar</button>
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