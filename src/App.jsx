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
      <div className="card" style={{ width: "100%", maxWidth: 450, padding: 40, textAlign: 'center', borderRadius: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', marginBottom: 30, fontSize: '28px' }}>ACCESO AL SISTEMA</h2>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }} style={{ display: "grid", gap: 20 }}>
          <input type="email" placeholder="Correo electrónico" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '18px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px' }} />
          <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '18px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px' }} />
          <button type="submit" disabled={loading} style={{ background: '#C8102E', color: 'white', fontWeight: '900', fontFamily: 'Montserrat', padding: '20px', fontSize: '18px', borderRadius: '10px', cursor: 'pointer', border: 'none' }}>
            {loading ? "INICIANDO..." : "INGRESAR AL PANEL"}
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

  if (!session) return <LoginScreen onLogin={async (e, p) => await supabase.auth.signInWithPassword({ email: e, password: p })} loading={loading} />;

  return (
    <div className="container" style={{ fontFamily: 'Inter, sans-serif', paddingBottom: '80px' }}>
      <header style={{ textAlign: 'center', marginBottom: 60, position: 'relative', paddingTop: '30px' }}>
        <button onClick={() => supabase.auth.signOut()} style={{ position: 'absolute', right: 0, top: 0, width: 'auto', background: '#C8102E', color: 'white', fontWeight: '900', padding: '15px 25px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>Cerrar Sesión</button>
        <div style={{ marginBottom: 15 }}>
          <h2 style={{ fontFamily: 'Montserrat', fontWeight: '800', color: '#6B6B6B', fontSize: 18, margin: 0, letterSpacing: '4px' }}>HAGAMOS QUE SUCEDA</h2>
        </div>
        <h1 style={{ fontFamily: 'Montserrat', fontWeight: '900', fontSize: isMobile ? 32 : 54, color: '#C8102E', margin: '15px 0', textTransform: 'uppercase', lineHeight: '1' }}>
          Campaña Política <br/> Presidente Franco
        </h1>
        <p style={{ fontWeight: '700', color: '#444', fontSize: '16px', marginTop: '10px' }}>Usuario: <strong>{session.user.email}</strong></p>
      </header>

      {/* DASHBOARD INDICADORES */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 25, marginBottom: 50 }}>
        <div className="stat" style={{ borderLeft: '15px solid #C8102E', padding: '35px', background: 'white', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: 60, fontWeight: '900', margin: 0, color: '#222', lineHeight: '1' }}>{votantes.length}</h3>
          <p style={{ textTransform: 'uppercase', fontWeight: '900', fontSize: 14, color: '#C8102E', marginTop: 10 }}>Total futuros votantes</p>
        </div>
        <div className="stat" style={{ borderLeft: '15px solid #C8102E', padding: '35px', background: 'white', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: 60, fontWeight: '900', margin: 0, color: '#222', lineHeight: '1' }}>{equipo.length}</h3>
          <p style={{ textTransform: 'uppercase', fontWeight: '900', fontSize: 14, color: '#C8102E', marginTop: 10 }}>Miembros del equipo</p>
        </div>
        <div className="card" style={{ padding: '30px', borderRadius: '15px' }}>
          <h4 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', fontSize: 16, marginBottom: 20 }}>BUSCADOR DE PADRÓN</h4>
          <div style={{ display: 'flex', gap: 12 }}>
            <input type="text" placeholder="Cédula..." value={cedulaRapida} onChange={e => setCedulaRapida(e.target.value)} style={{ padding: '16px', borderRadius: '10px' }} />
            <button onClick={buscarEnPadron} style={{ width: '80px', background: '#C8102E', color: 'white', fontSize: '28px', borderRadius: '10px', border: 'none' }}>🔍</button>
          </div>
          {resultadoPadron && (
            <div style={{ marginTop: 25, padding: 25, background: '#fef2f2', borderRadius: '15px', border: '3px solid #C8102E' }}>
              <p style={{ fontSize: 20, margin: '0 0 15px 0' }}><strong>{resultadoPadron.nombre} {resultadoPadron.apellido}</strong></p>
              <button onClick={() => { setFormVotante({ ...formVotante, ...resultadoPadron }); setResultadoPadron(null); }} 
                style={{ background: '#16a34a', color: 'white', padding: '18px', width: '100%', fontSize: '16px', fontWeight: '900', borderRadius: '10px', border: 'none' }}>ASIGNAR AL FORMULARIO</button>
            </div>
          )}
        </div>
      </div>

      <div className="grid">
        {/* RENDIMIENTO */}
        <div className="card" style={{ borderRadius: '15px' }}>
          <h4 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', fontSize: 22, borderBottom: '4px solid #f4f4f4', paddingBottom: '20px', marginBottom: '25px' }}>RENDIMIENTO POR EQUIPO</h4>
          <button onClick={exportarExcel} style={{ background: '#444', color: 'white', marginBottom: 30, width: 'auto', fontWeight: '900', padding: '15px 30px', borderRadius: '10px', border: 'none' }}>DESCARGAR EXCEL</button>
          <div style={{ display: 'grid', gap: 30 }}>
            {rendimientoEquipo.map(m => (
              <div key={m.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, marginBottom: 10 }}>
                  <span style={{ fontWeight: '900' }}>{m.nombre}</span> <strong style={{ color: '#C8102E' }}>{m.cantidad} REGISTROS ({m.porcentaje}%)</strong>
                </div>
                <div style={{ width: '100%', height: 20, background: '#eee', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${m.porcentaje}%`, height: '100%', background: '#C8102E' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BARRIOS */}
        <div className="card" style={{ borderRadius: '15px' }}>
          <h4 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', fontSize: 22, borderBottom: '4px solid #f4f4f4', paddingBottom: '20px', marginBottom: '25px' }}>CONTEO POR BARRIO</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8f8f8' }}>
              <tr><th style={{ padding: '20px', textAlign: 'left' }}>BARRIO</th><th style={{ padding: '20px', textAlign: 'center' }}>TOTAL</th></tr>
            </thead>
            <tbody>
              {conteoBarrio.map(b => <tr key={b.name}><td style={{ fontWeight: '800', padding: '18px', borderBottom: '1px solid #eee' }}>{b.name}</td><td style={{ padding: '18px', fontWeight: '900', color: '#C8102E', borderBottom: '1px solid #eee', textAlign: 'center' }}>{b.total}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORMULARIO REGISTRO VOTANTE */}
      <div className="grid" style={{ marginTop: 60 }}>
        <div className="card" style={{ borderRadius: '15px', padding: '35px' }}>
          <h3 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', borderBottom: '5px solid #C8102E', paddingBottom: 20, fontSize: 28 }}>REGISTRAR VOTANTE</h3>
          <form onSubmit={guardarVotante} className="form" style={{ marginTop: 30 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <input placeholder="Nombre" value={formVotante.nombre} onChange={e => setFormVotante({ ...formVotante, nombre: e.target.value })} required style={{ padding: '16px' }} />
              <input placeholder="Apellido" value={formVotante.apellido} onChange={e => setFormVotante({ ...formVotante, apellido: e.target.value })} required style={{ padding: '16px' }} />
            </div>
            <input placeholder="Cédula" value={formVotante.cedula} onChange={e => setFormVotante({ ...formVotante, cedula: e.target.value })} required style={{ padding: '16px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <input placeholder="Mesa" value={formVotante.mesa} onChange={e => setFormVotante({ ...formVotante, mesa: e.target.value })} style={{ padding: '16px' }} />
                <input placeholder="Orden" value={formVotante.orden} onChange={e => setFormVotante({ ...formVotante, orden: e.target.value })} style={{ padding: '16px' }} />
            </div>
            <input placeholder="Barrio" value={formVotante.barrio} onChange={e => setFormVotante({ ...formVotante, barrio: e.target.value })} style={{ padding: '16px' }} />
            <select value={formVotante.por_parte_de_id} onChange={e => setFormVotante({ ...formVotante, por_parte_de_id: e.target.value })} required style={{ padding: '16px', borderRadius: '10px' }}>
              <option value="">Seleccionar responsable...</option>
              {equipo.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
            <button type="submit" style={{ background: '#C8102E', color: 'white', fontWeight: '900', padding: '22px', fontSize: '20px', borderRadius: '12px', marginTop: '15px', border: 'none' }}>
                {editIdVotante ? "ACTUALIZAR DATOS" : "GUARDAR REGISTRO"}
            </button>
          </form>
        </div>

        {/* LISTA VOTANTES */}
        <div className="card" style={{ borderRadius: '15px', padding: '35px' }}>
          <h3 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', borderBottom: '5px solid #C8102E', paddingBottom: 20, fontSize: 28 }}>LISTADO ACTUAL</h3>
          <input placeholder="🔍 Buscar..." value={busquedaVotante} onChange={e => setBusquedaVotante(e.target.value)} style={{ margin: '30px 0', padding: '18px', borderRadius: '12px', fontSize: '18px' }} />
          <div className="table-wrap">
            <table style={{ width: '100%' }}>
              <thead style={{ background: '#C8102E', color: 'white' }}>
                <tr><th style={{ padding: '18px' }}>NOMBRE</th><th style={{ padding: '18px' }}>CÉDULA</th><th style={{ padding: '18px' }}>ACCIONES</th></tr>
              </thead>
              <tbody>
                {votantes.filter(v => (v.nombre + " " + v.apellido).toLowerCase().includes(busquedaVotante.toLowerCase())).slice(0, 15).map(v => (
                  <tr key={v.id}>
                    <td style={{ padding: '20px', borderBottom: '1px solid #eee' }}><strong>{v.nombre} {v.apellido}</strong></td>
                    <td style={{ padding: '20px', borderBottom: '1px solid #eee', fontWeight: '800' }}>{v.cedula}</td>
                    <td style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', gap: 12 }}>
                      <button onClick={() => { setFormVotante(v); setEditIdVotante(v.id); }} style={{ padding: '14px 20px', background: '#2563eb', color: 'white', fontWeight: '900', borderRadius: '10px', fontSize: '13px', border: 'none' }}>EDITAR</button>
                      <button onClick={async () => { if(confirm("¿Borrar?")) { await supabase.from("votantes").delete().eq("id", v.id); cargarDatos(); } }} style={{ padding: '14px 20px', background: '#dc2626', color: 'white', fontWeight: '900', borderRadius: '10px', fontSize: '13px', border: 'none' }}>BORRAR</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* GESTIÓN EQUIPO CON NUEVO CAMPO DESPLEGABLE */}
      <div className="grid" style={{ marginTop: 60 }}>
        <div className="card" style={{ borderRadius: '15px', padding: '35px' }}>
          <h3 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', borderBottom: '5px solid #C8102E', paddingBottom: 20, fontSize: 28 }}>REGISTRAR EQUIPO</h3>
          <form onSubmit={guardarEquipo} className="form" style={{ marginTop: 30 }}>
            <label style={{ fontWeight: '800', fontSize: '13px', color: '#666' }}>NOMBRE COMPLETO</label>
            <input placeholder="Nombre Completo" value={formEquipo.nombre} onChange={e => setFormEquipo({ ...formEquipo, nombre: e.target.value })} required style={{ padding: '16px' }} />
            
            <label style={{ fontWeight: '800', fontSize: '13px', color: '#666' }}>TELÉFONO</label>
            <input placeholder="Teléfono" value={formEquipo.telefono} onChange={e => setFormEquipo({ ...formEquipo, telefono: e.target.value })} style={{ padding: '16px' }} />
            
            <label style={{ fontWeight: '800', fontSize: '13px', color: '#666' }}>ZONA O BARRIO ASIGNADO</label>
            <input placeholder="Zona o Barrio Asignado" value={formEquipo.zona} onChange={e => setFormEquipo({ ...formEquipo, zona: e.target.value })} style={{ padding: '16px' }} />
            
            <label style={{ fontWeight: '800', fontSize: '13px', color: '#666' }}>CARGO O ROL</label>
            <select 
              value={formEquipo.rol} 
              onChange={e => setFormEquipo({ ...formEquipo, rol: e.target.value })} 
              style={{ padding: '16px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px', width: '100%', marginBottom: '15px', cursor: 'pointer' }}
            >
              <option value="coordinador">Coordinador</option>
              <option value="jefe_de_campana">Jefe de Campaña</option>
              <option value="candidato">Candidato</option>
            </select>

            <button type="submit" style={{ background: '#C8102E', color: 'white', fontWeight: '900', padding: '22px', borderRadius: '12px', border: 'none', fontSize: '20px' }}>
                {editIdEquipo ? "ACTUALIZAR MIEMBRO" : "GUARDAR MIEMBRO"}
            </button>
          </form>
        </div>
        <div className="card" style={{ borderRadius: '15px', padding: '35px' }}>
          <h3 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', borderBottom: '5px solid #C8102E', paddingBottom: 20, fontSize: 28 }}>MIEMBROS ACTIVOS</h3>
          <table style={{ width: '100%', marginTop: 25 }}>
            <thead style={{ background: '#444', color: 'white' }}><tr><th style={{ padding: '18px' }}>NOMBRE</th><th style={{ padding: '18px' }}>ACCIONES</th></tr></thead>
            <tbody>
              {equipo.map(m => (
                <tr key={m.id}>
                  <td style={{ padding: '20px', borderBottom: '1px solid #eee' }}><strong>{m.nombre}</strong><br/><small>{m.rol} - {m.zona}</small></td>
                  <td style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', gap: 12 }}>
                    <button onClick={() => { setFormEquipo(m); setEditIdEquipo(m.id); }} style={{ padding: '14px 20px', background: '#2563eb', color: 'white', fontWeight: '900', borderRadius: '10px', border: 'none' }}>EDITAR</button>
                    <button onClick={async () => { if(confirm("¿Eliminar?")) { await supabase.from("equipo").delete().eq("id", m.id); cargarDatos(); } }} style={{ padding: '14px 20px', background: '#dc2626', color: 'white', fontWeight: '900', borderRadius: '10px', border: 'none' }}>BORRAR</button>
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