import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const normalizarCedula = (v) => String(v || "").replace(/[.\-\s]/g, "").trim();

function LoginScreen({ onLogin, loading }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f4f4f4", padding: 20 }}>
      <div className="card" style={{ width: "100%", maxWidth: 400, padding: 30 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 20, fontFamily: 'Montserrat', color: '#C8102E' }}>Acceso al Sistema</h2>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }} style={{ display: "grid", gap: 15 }}>
          <input type="email" placeholder="Correo" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading} style={{ background: '#C8102E', fontFamily: 'Montserrat' }}>{loading ? "Iniciando..." : "Ingresar"}</button>
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

  const rendimientoEquipo = useMemo(() => {
    const totalVotantes = votantes.length;
    return equipo.map(miembro => {
      const cantidad = votantes.filter(v => v.por_parte_de_id === miembro.id).length;
      const porcentaje = totalVotantes > 0 ? Math.round((cantidad / totalVotantes) * 100) : 0;
      return { ...miembro, cantidad, porcentaje };
    }).sort((a, b) => b.cantidad - a.cantidad);
  }, [votantes, equipo]);

  const conteoBarrio = useMemo(() => {
    const counts = {};
    votantes.forEach(v => { const b = v.barrio || "Sin barrio"; counts[b] = (counts[b] || 0) + 1; });
    return Object.entries(counts).map(([name, total]) => ({ name, total }));
  }, [votantes]);

  async function buscarEnPadron() {
    const limpia = normalizarCedula(cedulaRapida);
    if (!limpia) return;
    const { data } = await supabase.from("padron_importado").select("*").or(`cedula_limpia.eq.${limpia},cedula.eq.${cedulaRapida}`).limit(1).maybeSingle();
    if (data) setResultadoPadron(data); else alert("No encontrado en el padrón.");
  }

  async function guardarVotante(e) {
    e.preventDefault();
    if (!formVotante.por_parte_de_id) return alert("Selecciona quién lo consiguió.");
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

  if (!session) return <LoginScreen onLogin={async (e, p) => await supabase.auth.signInWithPassword({ email: e, password: p })} loading={loading} />;

  return (
    <div className="container" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* HEADER CON LOGO Y TITULOS */}
      <header style={{ textAlign: 'center', marginBottom: 40, position: 'relative' }}>
        <button onClick={() => supabase.auth.signOut()} style={{ position: 'absolute', right: 0, top: 0, width: 'auto', background: '#C8102E' }}>Cerrar Sesión</button>
        <div style={{ marginBottom: 15 }}>
          {/* Aquí puedes poner el <img> de tu logo "Hagamos que suceda" */}
          <h2 style={{ fontFamily: 'Montserrat', color: '#6B6B6B', fontSize: 18, margin: 0 }}>HAGAMOS QUE SUCEDA</h2>
        </div>
        <h1 style={{ fontFamily: 'Montserrat', fontSize: isMobile ? 24 : 36, color: '#C8102E', margin: '10px 0' }}>Campaña Política – Presidente Franco</h1>
        <p className="user-session">Sesión iniciada como: <strong>{session.user.email}</strong></p>
      </header>

      {/* DASHBOARD PRINCIPAL */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 20, marginBottom: 30 }}>
        <div className="stat"><h3>{votantes.length}</h3><p>Total futuros votantes</p></div>
        <div className="stat"><h3>{equipo.length}</h3><p>Miembros del equipo</p></div>
        
        <div className="card">
          <h4 style={{ fontFamily: 'Montserrat' }}>Buscador de Padrón</h4>
          <div style={{ display: 'flex', gap: 5 }}>
            <input type="text" placeholder="Cédula..." value={cedulaRapida} onChange={e => setCedulaRapida(e.target.value)} />
            <button onClick={buscarEnPadron} style={{ width: 'auto', background: '#C8102E' }}>🔍</button>
          </div>
          {resultadoPadron && (
            <div style={{ marginTop: 15, padding: 10, background: '#fef2f2', borderRadius: 8, border: '1px solid #C8102E' }}>
              <p style={{ margin: 0, fontSize: 13 }}><strong>{resultadoPadron.nombre} {resultadoPadron.apellido}</strong></p>
              <button onClick={() => { setFormVotante({ ...formVotante, ...resultadoPadron }); setResultadoPadron(null); }} 
                style={{ background: '#16a34a', padding: '5px 10px', fontSize: 12, marginTop: 5 }}>ASIGNAR</button>
            </div>
          )}
        </div>
      </div>

      <div className="grid">
        {/* RENDIMIENTO CON BARRAS ROJAS */}
        <div className="card">
          <h4 style={{ fontFamily: 'Montserrat' }}>Conteo por miembro del equipo</h4>
          <button onClick={exportarExcel} style={{ background: '#111', marginBottom: 15, width: 'auto' }}>Exportar Excel</button>
          <div style={{ display: 'grid', gap: 15 }}>
            {rendimientoEquipo.map(m => (
              <div key={m.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                  <span>{m.nombre}</span> <strong>{m.cantidad} ({m.porcentaje}%)</strong>
                </div>
                <div style={{ width: '100%', height: 10, background: '#eee', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${m.porcentaje}%`, height: '100%', background: '#C8102E' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CONTEO POR BARRIO */}
        <div className="card">
          <h4 style={{ fontFamily: 'Montserrat' }}>Conteo por barrio</h4>
          <table>
            <thead><tr><th>Barrio</th><th>Total</th></tr></thead>
            <tbody>
              {conteoBarrio.map(b => <tr key={b.name}><td>{b.name}</td><td>{b.total}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 30 }}>
        {/* FORMULARIO VOTANTES */}
        <div className="card">
          <h3 style={{ fontFamily: 'Montserrat' }}>Cargar futuros votantes</h3>
          <form onSubmit={guardarVotante} className="form">
            <input placeholder="Nombre" value={formVotante.nombre} onChange={e => setFormVotante({ ...formVotante, nombre: e.target.value })} required />
            <input placeholder="Apellido" value={formVotante.apellido} onChange={e => setFormVotante({ ...formVotante, apellido: e.target.value })} required />
            <input placeholder="Cédula" value={formVotante.cedula} onChange={e => setFormVotante({ ...formVotante, cedula: e.target.value })} required />
            <input placeholder="Orden" value={formVotante.orden} onChange={e => setFormVotante({ ...formVotante, orden: e.target.value })} />
            <input placeholder="Mesa" value={formVotante.mesa} onChange={e => setFormVotante({ ...formVotante, mesa: e.target.value })} />
            <input placeholder="Local de votación" value={formVotante.local_votacion} onChange={e => setFormVotante({ ...formVotante, local_votacion: e.target.value })} />
            <input placeholder="Seccional" value={formVotante.seccional} onChange={e => setFormVotante({ ...formVotante, seccional: e.target.value })} />
            <input placeholder="Barrio" value={formVotante.barrio} onChange={e => setFormVotante({ ...formVotante, barrio: e.target.value })} />
            <select value={formVotante.por_parte_de_id} onChange={e => setFormVotante({ ...formVotante, por_parte_de_id: e.target.value })} required>
              <option value="">Seleccionar miembro de...</option>
              {equipo.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
            <button type="submit" style={{ background: '#C8102E', fontFamily: 'Montserrat' }}>{editIdVotante ? "Actualizar" : "Guardar futuro votante"}</button>
          </form>
        </div>

        {/* LISTA DE VOTANTES */}
        <div className="card">
          <h3 style={{ fontFamily: 'Montserrat' }}>Lista de futuros votantes</h3>
          <input placeholder="🔍 Buscar..." value={busquedaVotante} onChange={e => setBusquedaVotante(e.target.value)} style={{ marginBottom: 15 }} />
          <div className="table-wrap">
            <table>
              <thead style={{ background: '#C8102E', color: 'white' }}>
                <tr><th>Nombre</th><th>Apellido</th><th>Cédula</th><th>Mesa</th><th>Local</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {votantes.filter(v => v.nombre.toLowerCase().includes(busquedaVotante.toLowerCase())).slice(0, 10).map(v => (
                  <tr key={v.id}>
                    <td>{v.nombre}</td><td>{v.apellido}</td><td>{v.cedula}</td><td>{v.mesa}</td><td>{v.local_votacion}</td>
                    <td>
                      <button onClick={() => { setFormVotante(v); setEditIdVotante(v.id); }} style={{ padding: '4px 8px', background: '#2563eb', marginRight: 5 }}>Editar</button>
                      <button onClick={async () => { if(confirm("¿Borrar?")) { await supabase.from("votantes").delete().eq("id", v.id); cargarDatos(); } }} style={{ padding: '4px 8px', background: '#dc2626' }}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* EQUIPO */}
      <div className="grid" style={{ marginTop: 30 }}>
        <div className="card">
          <h3 style={{ fontFamily: 'Montserrat' }}>Equipo de campaña</h3>
          <form onSubmit={guardarEquipo} className="form">
            <input placeholder="Nombre del miembro" value={formEquipo.nombre} onChange={e => setFormEquipo({ ...formEquipo, nombre: e.target.value })} required />
            <input placeholder="Teléfono" value={formEquipo.telefono} onChange={e => setFormEquipo({ ...formEquipo, telefono: e.target.value })} />
            <input placeholder="Zona o barrio" value={formEquipo.zona} onChange={e => setFormEquipo({ ...formEquipo, zona: e.target.value })} />
            <select value={formEquipo.rol} onChange={e => setFormEquipo({ ...formEquipo, rol: e.target.value })}>
              <option value="coordinador">Coordinador</option>
              <option value="jefe_de_campana">Jefe de Campaña</option>
            </select>
            <button type="submit" style={{ background: '#111', fontFamily: 'Montserrat' }}>Guardar usuario</button>
          </form>
        </div>
        <div className="card">
          <h3 style={{ fontFamily: 'Montserrat' }}>Lista del equipo</h3>
          <table>
            <thead><tr><th>Nombre</th><th>Rol</th><th>Acciones</th></tr></thead>
            <tbody>
              {equipo.map(m => (
                <tr key={m.id}>
                  <td>{m.nombre}</td><td>{m.rol}</td>
                  <td>
                    <button onClick={() => { setFormEquipo(m); setEditIdEquipo(m.id); }} style={{ padding: '4px 8px', background: '#2563eb', marginRight: 5 }}>Editar</button>
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