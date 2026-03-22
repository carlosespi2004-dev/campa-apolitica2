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

function LoginScreen({ onLogin, loading }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f4f4f4", padding: 15 }}>
      <div className="card" style={{ width: "100%", maxWidth: 450, padding: 40, textAlign: 'center', borderRadius: '15px', background: 'white', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', marginBottom: 30 }}>ACCESO</h2>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }} style={{ display: "grid", gap: 20 }}>
          <input type="email" placeholder="Correo" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '15px', borderRadius: '10px', border: '1px solid #ddd' }} />
          <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '15px', borderRadius: '10px', border: '1px solid #ddd' }} />
          <button type="submit" disabled={loading} style={{ background: '#C8102E', color: 'white', fontWeight: '900', padding: '18px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>INGRESAR</button>
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
  const [tab, setTab] = useState("inicio"); // ESTADO PARA PESTAÑAS

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
    if (!error) { setFormVotante({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", por_parte_de_id: "" }); setEditIdVotante(null); cargarDatos(); alert("Guardado!"); }
    setLoading(false);
  }

  const exportarExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const crearHoja = (nombre, lista) => {
      const sheet = workbook.addWorksheet(nombre);
      sheet.columns = [{key:'nro',width:8},{key:'nom',width:25},{key:'ape',width:25},{key:'ci',width:15},{key:'ord',width:10},{key:'mes',width:10},{key:'sec',width:12},{key:'loc',width:25},{key:'cap',width:25}];
      sheet.addRow(["HAGAMOS QUE SUCEDA"]).getCell(1).font = {size:20, bold:true};
      sheet.addRow(["Darío Carmona Concejal 2026"]);
      sheet.addRow([]);
      const header = sheet.addRow(["Nro", "Nombre", "Apellido", "Cedula", "Orden", "Mesa", "Seccional", "Local", "Captado por"]);
      header.eachCell(c => { c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFC8102E'}}; c.font={color:{argb:'FFFFFFFF'},bold:true}; });
      lista.forEach((v, i) => sheet.addRow([i+1, v.nombre, v.apellido, v.cedula, v.orden, v.mesa, v.seccional, v.local_votacion, v.por_parte_de_nombre]));
    };
    crearHoja("GENERAL", votantes);
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Campaña_Dario_Carmona.xlsx`);
  };

  if (!session) return <LoginScreen onLogin={async (e, p) => await supabase.auth.signInWithPassword({ email: e, password: p })} loading={loading} />;

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* HEADER FIJO */}
      <header style={{ background: 'white', padding: '15px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', sticky: 'top', zIndex: 100 }}>
        <h1 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', margin: 0, fontSize: '20px' }}>Hagamos que suceda</h1>
        <p style={{ margin: 0, fontSize: '12px', color: '#666', fontWeight: '700' }}>Darío Carmona Concejal 2026</p>
      </header>

      {/* MENÚ DE PESTAÑAS (TABS) - Ideal para móvil */}
      <nav style={{ display: 'flex', background: 'white', borderBottom: '1px solid #eee', sticky: 'top', top: '55px', zIndex: 90 }}>
        {['inicio', 'votantes', 'equipo', 'reportes'].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '15px 5px', border: 'none', background: 'none', color: tab === t ? '#C8102E' : '#94a3b8', borderBottom: tab === t ? '3px solid #C8102E' : 'none', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', cursor: 'pointer' }}>
            {t}
          </button>
        ))}
      </nav>

      <main style={{ padding: '20px 15px', maxWidth: '800px', margin: '0 auto' }}>
        
        {/* CONTENIDO PESTAÑA: INICIO */}
        {tab === 'inicio' && (
          <div style={{ display: 'grid', gap: 20 }}>
            {/* INDICADORES RÁPIDOS */}
            <div style={{ display: 'flex', gap: 15 }}>
              <div style={{ flex: 1, background: 'white', padding: '15px', borderRadius: '15px', borderLeft: '5px solid #C8102E', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                <small style={{ color: '#94a3b8', fontWeight: '800' }}>TOTAL</small>
                <h2 style={{ margin: 0, fontSize: '24px' }}>{votantes.length}</h2>
              </div>
              <button onClick={exportarExcel} style={{ flex: 1, background: '#16a34a', color: 'white', border: 'none', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>📥 EXCEL</button>
            </div>

            {/* BUSCADOR RÁPIDO */}
            <div className="card" style={{ background: 'white', padding: '20px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#C8102E' }}>🔍 BUSCADOR DE PADRÓN</h4>
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="text" value={cedulaRapida} onChange={e => setCedulaRapida(e.target.value)} placeholder="Número de cédula" style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} />
                <button onClick={buscarEnPadron} style={{ padding: '0 20px', background: '#C8102E', color: 'white', border: 'none', borderRadius: '10px' }}>BUSCAR</button>
              </div>
              {resultadoPadron && (
                <div style={{ marginTop: 15, padding: '15px', background: '#FEE2E2', borderRadius: '12px', textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{resultadoPadron.nombre} {resultadoPadron.apellido}</h3>
                  <p style={{ fontSize: '12px', margin: '0 0 10px 0' }}>Mesa: {resultadoPadron.mesa} | Orden: {resultadoPadron.orden} | Sec: {resultadoPadron.seccional}</p>
                  <button onClick={() => { setFormVotante({ ...formVotante, ...resultadoPadron }); setResultadoPadron(null); }} style={{ background: '#16a34a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '900' }}>ASIGNAR ABAJO</button>
                </div>
              )}
            </div>

            {/* FORMULARIO REGISTRO */}
            <div className="card" style={{ background: 'white', padding: '20px', borderRadius: '20px' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#C8102E', borderBottom: '2px solid #FEE2E2', paddingBottom: '10px' }}>REGISTRAR VOTANTE</h4>
              <form onSubmit={guardarVotante} style={{ display: 'grid', gap: 15 }}>
                <div><label style={{fontSize:'12px', fontWeight:'700'}}>Nombre</label><input type="text" value={formVotante.nombre} onChange={e => setFormVotante({...formVotante, nombre: e.target.value})} required style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #ddd'}} /></div>
                <div><label style={{fontSize:'12px', fontWeight:'700'}}>Apellido</label><input type="text" value={formVotante.apellido} onChange={e => setFormVotante({...formVotante, apellido: e.target.value})} required style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #ddd'}} /></div>
                <div><label style={{fontSize:'12px', fontWeight:'700'}}>Cédula</label><input type="text" value={formVotante.cedula} onChange={e => setFormVotante({...formVotante, cedula: e.target.value})} required style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #ddd'}} /></div>
                <div style={{display:'flex', gap:10}}>
                   <div style={{flex:1}}><label style={{fontSize:'12px'}}>Mesa</label><input type="text" value={formVotante.mesa} onChange={e => setFormVotante({...formVotante, mesa: e.target.value})} style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #ddd'}} /></div>
                   <div style={{flex:1}}><label style={{fontSize:'12px'}}>Orden</label><input type="text" value={formVotante.orden} onChange={e => setFormVotante({...formVotante, orden: e.target.value})} style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #ddd'}} /></div>
                </div>
                <div><label style={{fontSize:'12px'}}>Barrio</label>
                  <select value={formVotante.barrio} onChange={e => setFormVotante({...formVotante, barrio: e.target.value})} required style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #ddd'}}>
                    <option value="">Elegir barrio...</option>
                    {LISTA_BARRIOS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div><label style={{fontSize:'12px'}}>Responsable</label>
                  <select value={formVotante.por_parte_de_id} onChange={e => setFormVotante({...formVotante, por_parte_de_id: e.target.value})} required style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #ddd'}}>
                    <option value="">¿Quién lo captó?</option>
                    {equipo.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </div>
                <button type="submit" style={{ background: '#C8102E', color: 'white', fontWeight: '900', padding: '15px', borderRadius: '10px', border: 'none' }}>{editIdVotante ? "ACTUALIZAR" : "GUARDAR REGISTRO"}</button>
              </form>
            </div>
          </div>
        )}

        {/* CONTENIDO PESTAÑA: VOTANTES (Lista completa con buscador) */}
        {tab === 'votantes' && (
          <div className="card" style={{ background: 'white', padding: '20px', borderRadius: '20px' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#C8102E' }}>LISTADO GENERAL</h4>
            <input type="text" placeholder="Filtrar por nombre o cédula..." value={busquedaLista} onChange={e => setBusquedaLista(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', marginBottom: '20px' }} />
            <div style={{ overflowY: 'auto', maxHeight: '60vh' }}>
              {votantes.filter(v => (v.nombre + v.apellido + v.cedula).toLowerCase().includes(busquedaLista.toLowerCase())).map(v => (
                <div key={v.id} style={{ padding: '15px 0', borderBottom: '1px solid #f1f1f1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '14px' }}>{v.nombre} {v.apellido}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>CI: {v.cedula} | Barrio: {v.barrio}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button onClick={() => { setFormVotante(v); setEditIdVotante(v.id); setTab('inicio'); }} style={{ padding: '8px 12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '700' }}>EDITAR</button>
                    <button onClick={async () => { if(confirm("Borrar?")) { await supabase.from("votantes").delete().eq("id", v.id); cargarDatos(); } }} style={{ padding: '8px 12px', background: '#FEE2E2', color: '#C8102E', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '700' }}>X</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTENIDO PESTAÑA: EQUIPO */}
        {tab === 'equipo' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div className="card" style={{ background: 'white', padding: '20px', borderRadius: '20px' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#C8102E' }}>GESTIÓN DE EQUIPO</h4>
              <form onSubmit={guardarEquipo} style={{ display: 'grid', gap: 15 }}>
                <input type="text" placeholder="Nombre completo" value={formEquipo.nombre} onChange={e => setFormEquipo({...formEquipo, nombre: e.target.value})} required style={{padding:'12px', borderRadius:'8px', border:'1px solid #ddd'}} />
                <input type="text" placeholder="Teléfono" value={formEquipo.telefono} onChange={e => setFormEquipo({...formEquipo, telefono: e.target.value})} style={{padding:'12px', borderRadius:'8px', border:'1px solid #ddd'}} />
                <select value={formEquipo.rol} onChange={e => setFormEquipo({...formEquipo, rol: e.target.value})} style={{padding:'12px', borderRadius:'8px', border:'1px solid #ddd'}}>
                  <option value="coordinador">Coordinador</option>
                  <option value="jefe_de_campana">Jefe de Campaña</option>
                  <option value="candidato">Candidato</option>
                </select>
                <button type="submit" style={{ background: '#C8102E', color: 'white', fontWeight: '900', padding: '15px', borderRadius: '10px', border: 'none' }}>GUARDAR MIEMBRO</button>
              </form>
            </div>
            <div className="card" style={{ background: 'white', padding: '20px', borderRadius: '20px' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#C8102E' }}>MIEMBROS ACTIVOS</h4>
              {equipo.map(m => (
                <div key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f1f1', display:'flex', justifyContent:'space-between' }}>
                  <span><strong>{m.nombre}</strong><br/><small style={{textTransform:'uppercase'}}>{m.rol}</small></span>
                  <button onClick={() => { setFormEquipo(m); setEditIdEquipo(m.id); }} style={{ padding: '5px 10px', background: '#f1f5f9', border: 'none', borderRadius: '5px' }}>Editar</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTENIDO PESTAÑA: REPORTES */}
        {tab === 'reportes' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div className="card" style={{ background: 'white', padding: '20px', borderRadius: '20px' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#C8102E' }}>RENDIMIENTO EQUIPO</h4>
              {rendimientoEquipo.map(m => (
                <div key={m.id} style={{ marginBottom: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                    <span>{m.nombre}</span> <strong>{m.cantidad} ({m.porcentaje}%)</strong>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#f1f1f1', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${m.porcentaje}%`, height: '100%', background: '#C8102E' }}></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="card" style={{ background: 'white', padding: '20px', borderRadius: '20px' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#C8102E' }}>VOTOS POR BARRIO</h4>
              <table style={{ width: '100%', fontSize: '13px' }}>
                <tbody>
                  {conteoBarrio.map(b => (
                    <tr key={b.name} style={{ borderBottom: '1px solid #f1f1f1' }}>
                      <td style={{ padding: '8px 0' }}>{b.name}</td>
                      <td style={{ textAlign: 'right', fontWeight: '900', color: '#C8102E' }}>{b.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* FOOTER PARA CERRAR SESIÓN RÁPIDO */}
      <footer style={{ textAlign: 'center', padding: '20px' }}>
        <button onClick={() => supabase.auth.signOut()} style={{ background: 'none', border: 'none', color: '#94a3b8', textDecoration: 'underline', fontWeight: '700' }}>Cerrar Sesión de {session.user.email}</button>
      </footer>
    </div>
  );
}