import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

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

// Logo Original (Bandera de Paraguay)
const ParaguayFlag = () => (
  <svg width="40" height="24" viewBox="0 0 3 2">
    <rect width="3" height="2" fill="#d52b1e"/>
    <rect width="3" height="1.333" y="0.667" fill="#fff"/>
    <rect width="3" height="0.667" y="1.333" fill="#0033a0"/>
    <circle cx="1.5" cy="1" r="0.25" fill="#fff"/>
    <path d="M1.5 0.85 a0.15 0.15 0 0 1 0 0.3 a0.15 0.15 0 0 1 0 -0.3 z" fill="none" stroke="#edcb15" strokeWidth="0.02"/>
  </svg>
);

function LoginScreen({ onLogin, loading }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f4f4f4", padding: 20 }}>
      <div className="card" style={{ width: "100%", maxWidth: 450, padding: 40, textAlign: 'center', borderRadius: '15px' }}>
        <h2 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', marginBottom: 30, fontSize: '28px' }}>ACCESO AL SISTEMA</h2>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }} style={{ display: "grid", gap: 20 }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontWeight: '700', fontSize: '14px', color: '#333' }}>Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '18px', borderRadius: '10px', border: '1px solid #ddd', width: '100%', marginTop: '5px' }} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontWeight: '700', fontSize: '14px', color: '#333' }}>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '18px', borderRadius: '10px', border: '1px solid #ddd', width: '100%', marginTop: '5px' }} />
          </div>
          <button type="submit" disabled={loading} style={{ background: '#C8102E', color: 'white', fontWeight: '900', fontFamily: 'Montserrat', padding: '20px', fontSize: '18px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>
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
  const [activeTab, setActiveTab] = useState("inicio"); // Estado para pestañas

  const [formVotante, setFormVotante] = useState({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", por_parte_de_id: "" });
  const [formEquipo, setFormEquipo] = useState({ nombre: "", telefono: "", rol: "coordinador", zona: "" });
  const [editIdVotante, setEditIdVotante] = useState(null);
  const [editIdEquipo, setEditIdEquipo] = useState(null);
  const [busquedaLista, setBusquedaLista] = useState("");
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
    const total = votantes.length;
    return equipo.map(m => {
      const cant = votantes.filter(v => v.por_parte_de_id === m.id).length;
      return { ...m, cantidad: cant, porcentaje: total > 0 ? Math.round((cant / total) * 100) : 0 };
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
    if (data) setResultadoPadron(data); else alert("No encontrado.");
  }

  async function guardarVotante(e) {
    e.preventDefault();
    if (!formVotante.por_parte_de_id) return alert("Selecciona un responsable.");
    setLoading(true);
    const resp = equipo.find(m => m.id === formVotante.por_parte_de_id);
    const payload = { ...formVotante, cedula_limpia: normalizarCedula(formVotante.cedula), por_parte_de_nombre: resp?.nombre || "" };
    const { error } = editIdVotante ? await supabase.from("votantes").update(payload).eq("id", editIdVotante) : await supabase.from("votantes").insert([payload]);
    if (!error) { setFormVotante({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", por_parte_de_id: "" }); setEditIdVotante(null); cargarDatos(); }
    setLoading(false);
  }

  const exportarExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const crearHoja = (nombre, lista) => {
      const sheet = workbook.addWorksheet(nombre);
      sheet.columns = [{key:'nro',width:8},{key:'nom',width:25},{key:'ape',width:25},{key:'ci',width:15},{key:'ord',width:10},{key:'mes',width:10},{key:'sec',width:12},{key:'loc',width:25},{key:'cap',width:25}];
      sheet.addRow(["HAGAMOS QUE SUCEDA"]).getCell(1).font = {size:20, bold:true};
      sheet.addRow(["Panel de Campaña Franco"]);
      sheet.addRow([]);
      const header = sheet.addRow(["Nro", "Nombre", "Apellido", "Cedula", "Orden", "Mesa", "Seccional", "Local", "Captado por"]);
      header.eachCell(c => { c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFC8102E'}}; c.font={color:{argb:'FFFFFFFF'},bold:true}; });
      lista.forEach((v, i) => sheet.addRow([i+1, v.nombre, v.apellido, v.cedula, v.orden, v.mesa, v.seccional, v.local_votacion, v.por_parte_de_nombre]));
    };
    crearHoja("GENERAL", votantes);
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Campaña_Franco.xlsx`);
  };

  if (!session) return <LoginScreen onLogin={async (e, p) => await supabase.auth.signInWithPassword({ email: e, password: p })} loading={loading} />;

  // Estilo de Pestaña Común
  const tabStyle = (tabName) => ({
    flex: 1,
    padding: '15px',
    background: activeTab === tabName ? '#C8102E' : '#eee',
    color: activeTab === tabName ? 'white' : '#666',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '800',
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    transition: '0.3s'
  });

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', paddingBottom: '80px' }}>
      {/* CABECERA ORIGINAL RESTAURADA */}
      <header style={{ textAlign: 'center', marginBottom: 30, padding: '20px 20px 0 20px', borderBottom: '1px solid #eee' }}>
        <button onClick={() => supabase.auth.signOut()} style={{ background: '#C8102E', color: 'white', padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', float: 'right' }}>Cerrar Sesión</button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 15, marginBottom: 10 }}>
          <ParaguayFlag />
          <h2 style={{ fontFamily: 'Montserrat', fontWeight: '800', color: '#6B6B6B', fontSize: 16, margin: 0, letterSpacing: '4px' }}>HAGAMOS QUE SUCEDA</h2>
        </div>
        <h1 style={{ fontFamily: 'Montserrat', fontWeight: '900', fontSize: 42, color: '#C8102E', margin: '5px 0', textTransform: 'uppercase' }}>
          Panel de Campaña Franco
        </h1>
        <p style={{ fontWeight: '600', color: '#444', textAlign: 'center', width: '100%', clear: 'both', paddingTop: 10 }}>Usuario: <strong>{session.user.email}</strong></p>
      </header>

      {/* MENÚ DE PESTAÑAS (TABS) */}
      <nav style={{ display: 'flex', borderBottom: '2px solid #ddd', marginBottom: 30 }}>
        <button onClick={() => setActiveTab("inicio")} style={tabStyle("inicio")}>Inicio</button>
        <button onClick={() => setActiveTab("votantes")} style={tabStyle("votantes")}>Votantes</button>
        <button onClick={() => setActiveTab("equipo")} style={tabStyle("equipo")}>Equipo</button>
        <button onClick={() => setActiveTab("estadisticas")} style={tabStyle("estadisticas")}>Estadísticas</button>
      </nav>

      {/* CONTENIDO PRINCIPAL ADAPTADO POR PESTAÑA */}
      <main style={{ padding: '0 20px', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* PESTAÑA 1: INICIO (Dashboard + Buscador + Registro) */}
        {activeTab === "inicio" && (
          <div style={{ display: 'grid', gap: 30 }}>
            {/* Estadísticas Originales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15 }}>
              <div style={{ background: 'white', padding: '15px', borderRadius: '12px', borderLeft: '8px solid #C8102E', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: 36, fontWeight: '900', margin: 0 }}>{votantes.length}</h3>
                  <p style={{ textTransform: 'uppercase', fontWeight: '800', fontSize: 11, color: '#C8102E', marginTop: 5 }}>Votantes</p>
              </div>
              <div style={{ background: 'white', padding: '15px', borderRadius: '12px', borderLeft: '8px solid #C8102E', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: 36, fontWeight: '900', margin: 0 }}>{equipo.length}</h3>
                  <p style={{ textTransform: 'uppercase', fontWeight: '800', fontSize: 11, color: '#C8102E', marginTop: 5 }}>Equipo</p>
              </div>
              <div className="card" style={{ padding: '15px', borderRadius: '12px', border: '1px solid #eee' }}>
                <h4 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', fontSize: 12, marginBottom: 10, textAlign: 'center' }}>BUSCADOR</h4>
                <div style={{ display: 'flex', gap: 5 }}>
                  <input type="text" value={cedulaRapida} onChange={e => setCedulaRapida(e.target.value)} placeholder="Cédula" style={{ padding: '10px', width: '100%', borderRadius: '8px', border: '1px solid #ddd' }} />
                  <button onClick={buscarEnPadron} style={{ width: '50px', background: '#C8102E', color: 'white', fontSize: '20px', border: 'none', borderRadius: '8px' }}>🔍</button>
                </div>
                {resultadoPadron && (
                  <div style={{ marginTop: 10, padding: 10, background: '#fef2f2', borderRadius: 8, border: '1px solid #C8102E', textAlign:'left' }}>
                    <p style={{ fontSize: 13, margin: '0 0 5px 0' }}><strong>{resultadoPadron.nombre} {resultadoPadron.apellido}</strong></p>
                    <button onClick={() => { setFormVotante({ ...formVotante, ...resultadoPadron }); setResultadoPadron(null); }} 
                      style={{ background: '#16a34a', color: 'white', padding: '8px', width: '100%', fontSize: '11px', fontWeight: '800', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>ASIGNAR</button>
                  </div>
                )}
              </div>
            </div>

            {/* Registro Votante Original */}
            <div className="card" style={{ maxWidth: '600px', margin: '0 auto', width: '100%', padding: '30px' }}>
              <h3 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', borderBottom: '3px solid #C8102E', paddingBottom: 15, fontSize: 22, textAlign: 'center' }}>REGISTRAR VOTANTE</h3>
              <form onSubmit={guardarVotante} style={{ display: 'grid', gap: '15px', marginTop: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={{fontWeight:'700', fontSize:'12px'}}>Nombre</label><input type="text" value={formVotante.nombre} onChange={e => setFormVotante({...formVotante, nombre: e.target.value})} required style={{padding:'12px', width:'100%', borderRadius:'8px', border:'1px solid #ddd'}} /></div>
                  <div><label style={{fontWeight:'700', fontSize:'12px'}}>Apellido</label><input type="text" value={formVotante.apellido} onChange={e => setFormVotante({...formVotante, apellido: e.target.value})} required style={{padding:'12px', width:'100%', borderRadius:'8px', border:'1px solid #ddd'}} /></div>
                </div>
                <div><label style={{fontWeight:'700', fontSize:'12px'}}>Cédula</label><input type="text" value={formVotante.cedula} onChange={e => setFormVotante({...formVotante, cedula: e.target.value})} required style={{padding:'12px', width:'100%', borderRadius:'8px', border:'1px solid #ddd'}} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={{fontWeight:'700', fontSize:'12px'}}>Mesa</label><input type="text" value={formVotante.mesa} onChange={e => setFormVotante({...formVotante, mesa: e.target.value})} style={{padding:'12px', width:'100%', borderRadius:'8px', border:'1px solid #ddd'}} /></div>
                  <div><label style={{fontWeight:'700', fontSize:'12px'}}>Orden</label><input type="text" value={formVotante.orden} onChange={e => setFormVotante({...formVotante, orden: e.target.value})} style={{padding:'12px', width:'100%', borderRadius:'8px', border:'1px solid #ddd'}} /></div>
                </div>
                <div><label style={{fontWeight:'700', fontSize:'12px'}}>Local de Votación</label><input type="text" value={formVotante.local_votacion} onChange={e => setFormVotante({...formVotante, local_votacion: e.target.value})} style={{padding:'12px', width:'100%', borderRadius:'8px', border:'1px solid #ddd'}} /></div>
                <div><label style={{fontWeight:'700', fontSize:'12px'}}>Seccional</label><input type="text" value={formVotante.seccional} onChange={e => setFormVotante({...formVotante, seccional: e.target.value})} style={{padding:'12px', width:'100%', borderRadius:'8px', border:'1px solid #ddd'}} /></div>
                <div>
                  <label style={{fontWeight:'700', fontSize:'12px'}}>Barrio</label>
                  <select value={formVotante.barrio} onChange={e => setFormVotante({...formVotante, barrio: e.target.value})} required style={{padding:'12px', width:'100%', borderRadius:'8px', border:'1px solid #ddd'}}>
                    <option value="">Elegir barrio...</option>
                    {LISTA_BARRIOS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontWeight:'700', fontSize:'12px'}}>Responsable</label>
                  <select value={formVotante.por_parte_de_id} onChange={e => setFormVotante({...formVotante, por_parte_de_id: e.target.value})} required style={{padding:'12px', width:'100%', borderRadius:'8px', border:'1px solid #ddd'}}>
                    <option value="">Seleccionar responsable...</option>
                    {equipo.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </div>
                <button type="submit" style={{ background: '#C8102E', color: 'white', fontWeight: '900', padding: '15px', borderRadius: '10px', border: 'none', cursor: 'pointer', marginTop: 10 }}>{editIdVotante ? "ACTUALIZAR" : "GUARDAR REGISTRO"}</button>
              </form>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: VOTANTES (Lista completa con scroll) */}
        {activeTab === "votantes" && (
          <div className="card" style={{ padding: '30px' }}>
            <h3 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', borderBottom: '3px solid #eee', paddingBottom: 15, fontSize: 22, textAlign: 'center' }}>LISTA COMPLETA DE VOTANTES</h3>
            <input type="text" placeholder="🔍 Buscar por nombre o cédula..." value={busquedaLista} onChange={e => setBusquedaLista(e.target.value)} style={{ padding: '12px', width: '100%', margin: '20px 0', borderRadius: '10px', border: '1px solid #ddd' }} />
            
            {/* Scroll interno para aguantar miles de datos */}
            <div style={{ overflowY: 'auto', maxHeight: '60vh' }}>
              <table style={{ width: '100%' }}>
                <thead style={{ background: '#C8102E', color: 'white', sticky: 'top', top: 0 }}>
                  <tr><th style={{padding:'10px'}}>NOMBRE</th><th style={{padding:'10px'}}>CÉDULA</th><th style={{padding:'10px'}}>RESPONSABLE</th><th style={{padding:'10px'}}>ACCIONES</th></tr>
                </thead>
                <tbody>
                  {votantes.filter(v => (v.nombre + v.apellido + v.cedula).toLowerCase().includes(busquedaLista.toLowerCase())).map(v => (
                    <tr key={v.id} style={{borderBottom:'1px solid #eee'}}>
                      <td style={{padding:'10px'}}><strong>{v.nombre} {v.apellido}</strong><br/><small>{v.barrio}</small></td>
                      <td style={{padding:'10px'}}>{v.cedula}</td>
                      <td style={{padding:'10px'}}>{v.por_parte_de_nombre || 'Sin asignar'}</td>
                      <td style={{padding:'10px', display:'flex', gap:5}}>
                        <button onClick={() => { setFormVotante(v); setEditIdVotante(v.id); setActiveTab('inicio'); window.scrollTo(0,0); }} style={{ padding: '5px 10px', background: '#f1f5f9', border: 'none', borderRadius: '5px', fontWeight: '700' }}>EDITAR</button>
                        <button onClick={async () => { if(confirm("Borrar?")) { await supabase.from("votantes").delete().eq("id", v.id); cargarDatos(); } }} style={{ padding: '5px 10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '5px', fontWeight: '700' }}>X</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: EQUIPO */}
        {activeTab === "equipo" && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 30 }}>
            <div className="card" style={{ padding: '30px' }}>
              <h3 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', fontSize: 20, textAlign: 'center' }}>REGISTRAR EQUIPO</h3>
              <form onSubmit={guardarEquipo} style={{ display: 'grid', gap: '15px', marginTop: 15 }}>
                <input type="text" placeholder="Nombre completo" value={formEquipo.nombre} onChange={e => setFormEquipo({...formEquipo, nombre: e.target.value})} required style={{padding:'12px', borderRadius:'8px', border:'1px solid #ddd'}} />
                <input type="text" placeholder="Teléfono" value={formEquipo.telefono} onChange={e => setFormEquipo({...formEquipo, telefono: e.target.value})} style={{padding:'12px', borderRadius:'8px', border:'1px solid #ddd'}} />
                <input type="text" placeholder="Zona o Barrio" value={formEquipo.zona} onChange={e => setFormEquipo({...formEquipo, zona: e.target.value})} style={{padding:'12px', borderRadius:'8px', border:'1px solid #ddd'}} />
                <select value={formEquipo.rol} onChange={e => setFormEquipo({...formEquipo, rol: e.target.value})} style={{padding:'12px', borderRadius:'8px', border:'1px solid #ddd'}}>
                  <option value="coordinador">Coordinador</option>
                  <option value="jefe_de_campana">Jefe de Campaña</option>
                  <option value="candidato">Candidato</option>
                </select>
                <button type="submit" style={{ background: '#C8102E', color: 'white', fontWeight: '900', padding: '15px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>GUARDAR MIEMBRO</button>
              </form>
            </div>
            <div className="card" style={{ padding: '30px' }}>
              <h3 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', fontSize: 20, textAlign: 'center' }}>MIEMBROS ACTIVOS</h3>
              <table style={{ width: '100%', marginTop: 15 }}>
                <thead style={{ background: '#444', color: 'white' }}>
                  <tr><th style={{padding:'10px'}}>NOMBRE</th><th style={{padding:'10px'}}>ROL/ZONA</th><th style={{padding:'10px'}}>ACCIONES</th></tr>
                </thead>
                <tbody>
                  {equipo.map(m => (
                    <tr key={m.id} style={{borderBottom:'1px solid #eee'}}>
                      <td style={{padding:'10px'}}><strong>{m.nombre}</strong><br/><small>{m.telefono}</small></td>
                      <td style={{padding:'10px', textTransform: 'uppercase'}}>{m.rol} - {m.zona}</td>
                      <td style={{padding:'10px', display:'flex', gap:5}}>
                        <button onClick={() => { setFormEquipo(m); setEditIdEquipo(m.id); }} style={{ padding: '5px 10px', background: '#f1f5f9', border: 'none', borderRadius: '5px' }}>EDIT</button>
                        <button onClick={async () => { if(confirm("Borrar miembro?")) { await supabase.from("equipo").delete().eq("id", m.id); cargarDatos(); } }} style={{ padding: '5px 10px', background: '#dc2626', color:'white', border: 'none', borderRadius: '5px' }}>X</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: ESTADÍSTICAS */}
        {activeTab === "estadisticas" && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 30 }}>
            <div className="card" style={{ padding: '30px' }}>
              <h3 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', fontSize: 20, textAlign: 'center' }}>RENDIMIENTO POR EQUIPO</h3>
              {rendimientoEquipo.map(m => (
                <div key={m.id} style={{ marginBottom: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                    <span>{m.nombre}</span> <strong>{m.cantidad} ({m.porcentaje}%)</strong>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: '#f1f1f1', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${m.porcentaje}%`, height: '100%', background: '#C8102E' }}></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: '30px' }}>
              <h3 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', fontSize: 20, textAlign: 'center' }}>VOTOS POR BARRIO</h3>
              <table style={{ width: '100%', marginTop: 15 }}>
                <thead style={{ background: '#f1f1f1', color: '#666' }}><tr><th style={{padding:'8px'}}>BARRIO</th><th style={{padding:'8px'}}>TOTAL</th></tr></thead>
                <tbody>
                  {conteoBarrio.map(b => (
                    <tr key={b.name} style={{ borderBottom: '1px solid #f1f1f1' }}><td style={{ padding: '8px' }}>{b.name}</td><td style={{ padding: '8px', textAlign: 'right', fontWeight: '900', color: '#C8102E' }}>{b.total}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* BOTÓN EXCEL FLOTANTE */}
      <button onClick={exportarExcel} style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#16a34a', color: 'white', padding: '15px 30px', borderRadius: '50px', fontWeight: '800', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', cursor: 'pointer', zIndex: 1000, display: 'flex', alignItems: 'center', gap: 10 }}>
        📥 EXPORTAR EXCEL PRO
      </button>
    </div>
  );
}