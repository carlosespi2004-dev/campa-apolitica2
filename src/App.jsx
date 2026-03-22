import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const normalizarCedula = (v) => String(v || "").replace(/[.\-\s]/g, "").trim();

const LISTA_BARRIOS = [
  "Santa Clara", "San José Obrero", "San Juan", "San Antonio", "San Rafael", 
  "Las Mercedes", "San Roque", "San Damián", "Santa Rosa", "San Sebastián", 
  "San Francisco", "San Isidro", "Sagrado Corazón de Jesús", "San Miguel", 
  "San Lorenzo", "San Jorge", "Santo Domingo", "San Pablo", 
  "Fray Luis de Bolaños", "Fátima 1", "Santo Tomás", "Área 5", "CONAVI", 
  "Centro", "María Auxiliadora", "Caacupe-mí", "Kilómetro 7 Monday", 
  "Kilómetro 8 Monday", "Kilómetro 9 Monday", "Kilómetro 10 Monday", 
  "Colonia Alfredo Pla", "Península", "Puerto Bertoni", "otros..."
];

function LoginScreen({ onLogin, loading }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f4f4f4", padding: 20 }}>
      <div className="card" style={{ width: "100%", maxWidth: 400, padding: 30, borderRadius: '15px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 20, fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E' }}>ACCESO AL SISTEMA</h2>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }} style={{ display: "grid", gap: 15 }}>
          <input type="email" placeholder="Correo" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '15px', borderRadius: '10px' }} />
          <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '15px', borderRadius: '10px' }} />
          <button type="submit" disabled={loading} style={{ background: '#C8102E', color: 'white', fontWeight: '800', padding: '15px', borderRadius: '10px', border: 'none' }}>INGRESAR</button>
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
  const [cedulaRapida, setCedulaRapida] = useState("");
  const [resultadoPadron, setResultadoPadron] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('resize', handleResize);
    };
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
    const total = votantes.length;
    return equipo.map(m => {
      const cant = votantes.filter(v => v.por_parte_de_id === m.id).length;
      const porc = total > 0 ? Math.round((cant / total) * 100) : 0;
      return { ...m, cant, porc };
    }).sort((a, b) => b.cant - a.cant);
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

  async function guardarEquipo(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = editIdEquipo ? await supabase.from("equipo").update(formEquipo).eq("id", editIdEquipo) : await supabase.from("equipo").insert([formEquipo]);
    if (!error) { setFormEquipo({ nombre: "", telefono: "", rol: "coordinador", zona: "" }); setEditIdEquipo(null); cargarDatos(); }
    setLoading(false);
  }

  if (!session) return <LoginScreen onLogin={async (e, p) => await supabase.auth.signInWithPassword({ email: e, password: p })} loading={loading} />;

  return (
    <div className="container" style={{ fontFamily: 'Inter, sans-serif', paddingBottom: '60px' }}>
      <header style={{ textAlign: 'center', marginBottom: 30, position: 'relative' }}>
        <button onClick={() => supabase.auth.signOut()} style={{ position: 'absolute', right: 0, top: 0, width: 'auto', background: '#C8102E', color: 'white', fontWeight: '800', padding: '10px 15px', borderRadius: '8px', border: 'none' }}>SALIR</button>
        <h1 style={{ fontFamily: 'Montserrat', fontWeight: '900', fontSize: isMobile ? 22 : 36, color: '#C8102E', margin: '5px 0' }}>CAMPAÑA POLÍTICA</h1>
      </header>

      {/* DASHBOARD INDICADORES COMPACTOS (MAS CHICOS) */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 15, marginBottom: 30 }}>
        <div className="stat" style={{ borderLeft: '8px solid #C8102E', padding: '15px 20px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: 32, fontWeight: '900', margin: 0, color: '#222' }}>{votantes.length}</h3>
          <p style={{ textTransform: 'uppercase', fontWeight: '900', fontSize: 11, color: '#C8102E', marginTop: 5 }}>Votantes</p>
        </div>
        <div className="stat" style={{ borderLeft: '8px solid #C8102E', padding: '15px 20px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: 32, fontWeight: '900', margin: 0, color: '#222' }}>{equipo.length}</h3>
          <p style={{ textTransform: 'uppercase', fontWeight: '900', fontSize: 11, color: '#C8102E', marginTop: 5 }}>Equipo</p>
        </div>
        <div className="card" style={{ padding: '15px 20px', borderRadius: '12px' }}>
          <h4 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', fontSize: 12, marginBottom: 10 }}>BUSCADOR</h4>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" placeholder="Cédula..." value={cedulaRapida} onChange={e => setCedulaRapida(e.target.value)} style={{ padding: '10px', fontSize: '14px' }} />
            <button onClick={buscarEnPadron} style={{ width: '50px', background: '#C8102E', color: 'white', fontSize: '18px', border: 'none', borderRadius: '8px' }}>🔍</button>
          </div>
        </div>
      </div>

      {/* Resto del sistema... */}
      <div className="grid">
        <div className="card">
          <h4 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E' }}>RENDIMIENTO</h4>
          <div style={{ display: 'grid', gap: 15 }}>
            {rendimientoEquipo.map(m => (
              <div key={m.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span>{m.nombre}</span> <strong>{m.cant} ({m.porc}%)</strong>
                </div>
                <div style={{ width: '100%', height: 10, background: '#eee', borderRadius: 5, overflow: 'hidden', marginTop: 5 }}>
                  <div style={{ width: `${m.porc}%`, height: '100%', background: '#C8102E' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h4 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E' }}>BARRIOS</h4>
          <table style={{ width: '100%' }}>
            <tbody>
              {conteoBarrio.map(b => <tr key={b.name}><td>{b.name}</td><td style={{ fontWeight: '900', color: '#C8102E', textAlign: 'right' }}>{b.total}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 30 }}>
        <div className="card" style={{ padding: '30px' }}>
          <h3 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', borderBottom: '3px solid #C8102E', paddingBottom: 15 }}>REGISTRAR VOTANTE</h3>
          <form onSubmit={guardarVotante} className="form" style={{ marginTop: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
              <input placeholder="Nombre" value={formVotante.nombre} onChange={e => setFormVotante({ ...formVotante, nombre: e.target.value })} required style={{ padding: '14px' }} />
              <input placeholder="Apellido" value={formVotante.apellido} onChange={e => setFormVotante({ ...formVotante, apellido: e.target.value })} required style={{ padding: '14px' }} />
            </div>
            <input placeholder="Cédula" value={formVotante.cedula} onChange={e => setFormVotante({ ...formVotante, cedula: e.target.value })} required style={{ padding: '14px' }} />
            <select value={formVotante.barrio} onChange={e => setFormVotante({ ...formVotante, barrio: e.target.value })} style={{ padding: '14px', borderRadius: '10px' }} required>
              <option value="">Elegir barrio...</option>
              {LISTA_BARRIOS.map(barrio => <option key={barrio} value={barrio}>{barrio}</option>)}
            </select>
            <select value={formVotante.por_parte_de_id} onChange={e => setFormVotante({ ...formVotante, por_parte_de_id: e.target.value })} required style={{ padding: '14px', borderRadius: '10px' }}>
              <option value="">¿Quién lo consiguió?</option>
              {equipo.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
            <button type="submit" style={{ background: '#C8102E', color: 'white', fontWeight: '900', padding: '18px', borderRadius: '10px', border: 'none' }}>GUARDAR REGISTRO</button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E' }}>LISTADO</h3>
          <div className="table-wrap">
            <table style={{ width: '100%' }}>
              <thead style={{ background: '#C8102E', color: 'white' }}>
                <tr><th>NOMBRE</th><th>ACCIONES</th></tr>
              </thead>
              <tbody>
                {votantes.slice(0, 10).map(v => (
                  <tr key={v.id}>
                    <td>{v.nombre} {v.apellido}</td>
                    <td>
                      <button onClick={() => { setFormVotante(v); setEditIdVotante(v.id); }} style={{ padding: '8px 12px', background: '#2563eb', color: 'white', fontWeight: '800', borderRadius: '6px', border: 'none', marginRight: 5 }}>EDITAR</button>
                      <button onClick={async () => { if(confirm("¿Borrar?")) { await supabase.from("votantes").delete().eq("id", v.id); cargarDatos(); } }} style={{ padding: '8px 12px', background: '#dc2626', color: 'white', fontWeight: '800', borderRadius: '6px', border: 'none' }}>BORRAR</button>
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