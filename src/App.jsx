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

// Componente de Login Espectacular
function LoginScreen({ onLogin, loading }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)", padding: 20 }}>
      <div className="card" style={{ width: "100%", maxWidth: 450, padding: 40, textAlign: 'center', borderRadius: '25px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', background: 'white' }}>
        <h1 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', fontSize: 32, marginBottom: 10 }}>BIENVENIDO</h1>
        <p style={{ color: '#666', marginBottom: 30, fontWeight: '600' }}>Gestión Política Darío Carmona</p>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }} style={{ display: "grid", gap: 20 }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontWeight: '700', fontSize: '14px', color: '#444', marginLeft: 5 }}>Correo</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '16px', borderRadius: '12px', border: '2px solid #eee', width: '100%', marginTop: 5, fontSize: 16 }} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontWeight: '700', fontSize: '14px', color: '#444', marginLeft: 5 }}>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '16px', borderRadius: '12px', border: '2px solid #eee', width: '100%', marginTop: 5, fontSize: 16 }} />
          </div>
          <button type="submit" disabled={loading} style={{ background: '#C8102E', color: 'white', fontWeight: '900', padding: '18px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: 18, transition: '0.3s' }}>
            {loading ? "VERIFICANDO..." : "ENTRAR AL PANEL"}
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
    return () => { window.removeEventListener('resize', handleResize); subscription.unsubscribe(); };
  }, []);

  useEffect(() => { if (session) cargarDatos(); }, [session]);

  async function cargarDatos() {
    setLoading(true);
    try {
      const [v, e] = await Promise.all([
        supabase.from("votantes").select("*").order("created_at", { ascending: false }),
        supabase.from("equipo").select("*").order("created_at", { ascending: false })
      ]);
      setVotantes(v.data || []);
      setEquipo(e.data || []);
    } catch (err) { console.error(err); }
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
    setLoading(true);
    const { data } = await supabase.from("padron_importado").select("*").or(`cedula_limpia.eq.${limpia},cedula.eq.${cedulaRapida}`).limit(1).maybeSingle();
    if (data) setResultadoPadron(data); else alert("Cédula no encontrada en el padrón.");
    setLoading(false);
  }

  async function guardarVotante(e) {
    e.preventDefault();
    if (!formVotante.por_parte_de_id) return alert("Selecciona un responsable.");
    setLoading(true);
    const resp = equipo.find(m => m.id === formVotante.por_parte_de_id);
    const payload = { ...formVotante, cedula_limpia: normalizarCedula(formVotante.cedula), por_parte_de_nombre: resp?.nombre || "" };
    const { error } = editIdVotante ? await supabase.from("votantes").update(payload).eq("id", editIdVotante) : await supabase.from("votantes").insert([payload]);
    if (!error) { setFormVotante({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", por_parte_de_id: "" }); setEditIdVotante(null); cargarDatos(); alert("Votante guardado!"); }
    setLoading(false);
  }

  async function guardarEquipo(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = editIdEquipo ? await supabase.from("equipo").update(formEquipo).eq("id", editIdEquipo) : await supabase.from("equipo").insert([formEquipo]);
    if (!error) { setFormEquipo({ nombre: "", telefono: "", rol: "coordinador", zona: "" }); setEditIdEquipo(null); cargarDatos(); alert("Miembro actualizado!"); }
    setLoading(false);
  }

  const exportarExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const crearHoja = (nombre, lista) => {
      const sheet = workbook.addWorksheet(nombre);
      sheet.columns = [{key:'nro',width:8},{key:'nom',width:25},{key:'ape',width:25},{key:'ci',width:15},{key:'ord',width:10},{key:'mes',width:10},{key:'sec',width:12},{key:'loc',width:25},{key:'cap',width:25}];
      sheet.addRow(["HAGAMOS QUE SUCEDA"]); sheet.mergeCells('A1:I1');
      const r1 = sheet.getRow(1); r1.height = 35; r1.getCell(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFC8102E'}}; r1.getCell(1).font={color:{argb:'FFFFFFFF'},size:20,bold:true}; r1.getCell(1).alignment={vertical:'middle',horizontal:'center'};
      sheet.addRow(["Darío Carmona Concejal 2026"]); sheet.mergeCells('A2:I2');
      const r2 = sheet.getRow(2); r2.getCell(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFEE2E2'}}; r2.getCell(1).font={color:{argb:'FF000000'},size:12,italic:true}; r2.getCell(1).alignment={vertical:'middle',horizontal:'center'};
      sheet.addRow([]);
      const header = sheet.addRow(["Nro", "Nombre", "Apellido", "Cedula", "Orden", "Mesa", "Seccional", "Local", "Captado por"]);
      header.eachCell(c => { c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFC8102E'}}; c.font={color:{argb:'FFFFFFFF'},bold:true}; });
      lista.forEach((v, i) => {
        const row = sheet.addRow([i+1, v.nombre, v.apellido, v.cedula, v.orden, v.mesa, v.seccional, v.local_votacion, v.por_parte_de_nombre]);
        if (i%2!==0) row.eachCell(c => c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFEE2E2'}});
      });
    };
    crearHoja("LISTA GENERAL", votantes);
    equipo.forEach(m => { const d = votantes.filter(v => v.por_parte_de_id === m.id); if (d.length > 0) crearHoja(m.nombre.substring(0, 25), d); });
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Campaña_Dario_Carmona.xlsx`);
  };

  if (!session) return <LoginScreen onLogin={async (e, p) => await supabase.auth.signInWithPassword({ email: e, password: p })} loading={loading} />;

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* HEADER ESPECTACULAR */}
      <header style={{ background: 'white', padding: isMobile ? '20px 15px' : '40px 20px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', position: 'relative' }}>
        <button onClick={() => supabase.auth.signOut()} style={{ position: isMobile ? 'static' : 'absolute', right: 20, top: 20, background: '#f1f5f9', color: '#64748b', fontWeight: '800', padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', marginBottom: isMobile ? 20 : 0 }}>SALIR</button>
        <h1 style={{ fontFamily: 'Montserrat', fontWeight: '900', fontSize: isMobile ? 28 : 48, color: '#C8102E', margin: 0, textTransform: 'uppercase', letterSpacing: '-1px' }}>Hagamos que suceda</h1>
        <h2 style={{ fontFamily: 'Montserrat', fontWeight: '700', color: '#64748b', fontSize: isMobile ? 16 : 20, marginTop: 5 }}>Darío Carmona Concejal 2026</h2>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '20px 15px' : '40px 20px', paddingBottom: 100 }}>
        
        {/* DASHBOARD INDICADORES */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
          <div style={{ background: 'white', padding: 25, borderRadius: 20, boxShadow: '0 10px 25px rgba(0,0,0,0.03)', borderLeft: '10px solid #C8102E' }}>
            <p style={{ fontSize: 13, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 5 }}>Total Votantes</p>
            <h3 style={{ fontSize: 42, fontWeight: '900', color: '#1e293b', margin: 0 }}>{votantes.length}</h3>
          </div>
          <div style={{ background: 'white', padding: 25, borderRadius: 20, boxShadow: '0 10px 25px rgba(0,0,0,0.03)', borderLeft: '10px solid #C8102E' }}>
            <p style={{ fontSize: 13, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 5 }}>Equipo Activo</p>
            <h3 style={{ fontSize: 42, fontWeight: '900', color: '#1e293b', margin: 0 }}>{equipo.length}</h3>
          </div>
          <div style={{ background: 'white', padding: 25, borderRadius: 20, boxShadow: '0 10px 25px rgba(0,0,0,0.03)' }}>
            <p style={{ fontSize: 13, fontWeight: '800', color: '#C8102E', textTransform: 'uppercase', marginBottom: 10 }}>Buscador de Padrón</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <input type="text" value={cedulaRapida} onChange={e => setCedulaRapida(e.target.value)} placeholder="Cédula..." style={{ padding: '12px', width: '100%', borderRadius: '12px', border: '2px solid #f1f5f9', fontSize: 16 }} />
              <button onClick={buscarEnPadron} style={{ padding: '12px 20px', background: '#C8102E', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer' }}>🔍</button>
            </div>
          </div>
        </div>

        {/* RESULTADO BUSQUEDA RESALTADO */}
        {resultadoPadron && (
          <div style={{ background: '#FEE2E2', padding: 25, borderRadius: 25, marginBottom: 40, border: '2px dashed #C8102E', textAlign: 'center' }}>
            <h3 style={{ fontSize: 22, fontWeight: '900', color: '#C8102E', marginBottom: 10 }}>{resultadoPadron.nombre} {resultadoPadron.apellido}</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', color: '#444', fontWeight: '700', marginBottom: 20 }}>
              <span>Mesa: {resultadoPadron.mesa}</span>
              <span>Orden: {resultadoPadron.orden}</span>
              <span>Sec: {resultadoPadron.seccional}</span>
              <span style={{ color: '#C8102E' }}>{resultadoPadron.local_votacion}</span>
            </div>
            <button onClick={() => { setFormVotante({ ...formVotante, ...resultadoPadron }); setResultadoPadron(null); }} style={{ background: '#16a34a', color: 'white', padding: '15px 30px', borderRadius: '15px', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: 16 }}>ASIGNAR AL FORMULARIO</button>
          </div>
        )}

        {/* RENDIMIENTO Y BARRIOS */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 30, marginBottom: 40 }}>
          <div className="card" style={{ padding: 30, borderRadius: 25, background: 'white' }}>
            <h3 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#1e293b', borderBottom: '4px solid #FEE2E2', paddingBottom: 15, marginBottom: 25, fontSize: 20 }}>Rendimiento de Equipo</h3>
            <div style={{ display: 'grid', gap: 20 }}>
              {rendimientoEquipo.map(m => (
                <div key={m.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: '800', marginBottom: 8, color: '#475569' }}>
                    <span>{m.nombre}</span> <span>{m.cantidad} ({m.porcentaje}%)</span>
                  </div>
                  <div style={{ width: '100%', height: 12, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ width: `${m.porcentaje}%`, height: '100%', background: 'linear-gradient(90deg, #C8102E, #ef4444)' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 30, borderRadius: 25, background: 'white' }}>
            <h3 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#1e293b', borderBottom: '4px solid #FEE2E2', paddingBottom: 15, marginBottom: 25, fontSize: 20 }}>Conteo por Barrio</h3>
            <div style={{ overflowY: 'auto', maxHeight: 300 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
                  <tr style={{ color: '#C8102E', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' }}>
                    <th style={{ textAlign: 'left', padding: 12 }}>Barrio</th>
                    <th style={{ textAlign: 'right', padding: 12 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {conteoBarrio.map(b => (
                    <tr key={b.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 12, fontSize: 14, fontWeight: '700', color: '#334155' }}>{b.name}</td>
                      <td style={{ padding: 12, fontSize: 15, fontWeight: '900', textAlign: 'right', color: '#C8102E' }}>{b.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FORMULARIO REGISTRO VOTANTE */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.8fr', gap: 30, marginBottom: 40 }}>
          <div className="card" style={{ padding: 35, borderRadius: 25, background: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', borderBottom: '4px solid #C8102E', paddingBottom: 15, fontSize: 24, textAlign: 'center', marginBottom: 25 }}>REGISTRAR VOTANTE</h3>
            <form onSubmit={guardarVotante} style={{ display: 'grid', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 15 }}>
                <div><label style={{fontWeight:'800', fontSize:12, color:'#64748b'}}>Nombre</label><input type="text" value={formVotante.nombre} onChange={e => setFormVotante({...formVotante, nombre: e.target.value})} required style={{padding:14, width:'100%', borderRadius:12, border:'2px solid #f1f5f9', fontSize:16}} /></div>
                <div><label style={{fontWeight:'800', fontSize:12, color:'#64748b'}}>Apellido</label><input type="text" value={formVotante.apellido} onChange={e => setFormVotante({...formVotante, apellido: e.target.value})} required style={{padding:14, width:'100%', borderRadius:12, border:'2px solid #f1f5f9', fontSize:16}} /></div>
              </div>
              <div><label style={{fontWeight:'800', fontSize:12, color:'#64748b'}}>Cédula de Identidad</label><input type="text" value={formVotante.cedula} onChange={e => setFormVotante({...formVotante, cedula: e.target.value})} required style={{padding:14, width:'100%', borderRadius:12, border:'2px solid #f1f5f9', fontSize:16}} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <div><label style={{fontWeight:'800', fontSize:12, color:'#64748b'}}>Mesa</label><input type="text" value={formVotante.mesa} onChange={e => setFormVotante({...formVotante, mesa: e.target.value})} style={{padding:14, width:'100%', borderRadius:12, border:'2px solid #f1f5f9', fontSize:16}} /></div>
                <div><label style={{fontWeight:'800', fontSize:12, color:'#64748b'}}>Orden</label><input type="text" value={formVotante.orden} onChange={e => setFormVotante({...formVotante, orden: e.target.value})} style={{padding:14, width:'100%', borderRadius:12, border:'2px solid #f1f5f9', fontSize:16}} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 15 }}>
                <div><label style={{fontWeight:'800', fontSize:12, color:'#64748b'}}>Seccional</label><input type="text" value={formVotante.seccional} onChange={e => setFormVotante({...formVotante, seccional: e.target.value})} style={{padding:14, width:'100%', borderRadius:12, border:'2px solid #f1f5f9', fontSize:16}} /></div>
                <div><label style={{fontWeight:'800', fontSize:12, color:'#64748b'}}>Local de Votación</label><input type="text" value={formVotante.local_votacion} onChange={e => setFormVotante({...formVotante, local_votacion: e.target.value})} style={{padding:14, width:'100%', borderRadius:12, border:'2px solid #f1f5f9', fontSize:16}} /></div>
              </div>
              <div>
                <label style={{fontWeight:'800', fontSize:12, color:'#64748b'}}>Barrio</label>
                <select value={formVotante.barrio} onChange={e => setFormVotante({...formVotante, barrio: e.target.value})} required style={{padding:14, width:'100%', borderRadius:12, border:'2px solid #f1f5f9', fontSize:16, cursor:'pointer'}}>
                  <option value="">Elegir barrio...</option>
                  {LISTA_BARRIOS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontWeight:'800', fontSize:12, color:'#64748b'}}>Responsable de Captación</label>
                <select value={formVotante.por_parte_de_id} onChange={e => setFormVotante({...formVotante, por_parte_de_id: e.target.value})} required style={{padding:14, width:'100%', borderRadius:12, border:'2px solid #f1f5f9', fontSize:16, cursor:'pointer'}}>
                  <option value="">¿Quién lo consiguió?</option>
                  {equipo.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
              <button type="submit" style={{ background: '#C8102E', color: 'white', fontWeight: '900', padding: '20px', borderRadius: '15px', border: 'none', cursor: 'pointer', fontSize: 18, marginTop: 10 }}>
                {editIdVotante ? "ACTUALIZAR REGISTRO" : "GUARDAR NUEVO VOTANTE"}
              </button>
            </form>
          </div>

          {/* LISTA VOTANTES */}
          <div className="card" style={{ padding: 25, borderRadius: 25, background: 'white' }}>
            <h3 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#1e293b', borderBottom: '4px solid #f1f5f9', paddingBottom: 15, marginBottom: 20, fontSize: 18 }}>Listado Reciente</h3>
            <input type="text" placeholder="🔍 Filtrar por nombre..." value={busquedaVotante} onChange={e => setBusquedaVotante(e.target.value)} style={{ padding: '12px', width: '100%', borderRadius: '12px', border: '2px solid #f1f5f9', marginBottom: 20 }} />
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '350px' }}>
                <tbody>
                  {votantes.filter(v => (v.nombre + v.apellido).toLowerCase().includes(busquedaVotante.toLowerCase())).slice(0, 8).map(v => (
                    <tr key={v.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '15px 0' }}>
                        <div style={{ fontWeight: '800', color: '#334155' }}>{v.nombre} {v.apellido}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>CI: {v.cedula}</div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => { setFormVotante(v); setEditIdVotante(v.id); }} style={{ padding: '8px 12px', background: '#FEE2E2', color: '#C8102E', border: 'none', borderRadius: '8px', fontWeight: '800', marginRight: 5, fontSize: 11 }}>EDITAR</button>
                        <button onClick={async () => { if(confirm("¿Borrar?")) { await supabase.from("votantes").delete().eq("id", v.id); cargarDatos(); } }} style={{ padding: '8px 12px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: 11 }}>X</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* GESTIÓN EQUIPO */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 30 }}>
          <div className="card" style={{ padding: 30, borderRadius: 25, background: 'white' }}>
            <h3 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', fontSize: 20, marginBottom: 25 }}>REGISTRAR EQUIPO</h3>
            <form onSubmit={guardarEquipo} style={{ display: 'grid', gap: 15 }}>
              <div><label style={{fontWeight:'700', fontSize:12, color:'#64748b'}}>Nombre Completo</label><input type="text" value={formEquipo.nombre} onChange={e => setFormEquipo({...formEquipo, nombre: e.target.value})} required style={{padding:12, width:'100%', borderRadius:10, border:'2px solid #f1f5f9'}} /></div>
              <div><label style={{fontWeight:'700', fontSize:12, color:'#64748b'}}>Teléfono</label><input type="text" value={formEquipo.telefono} onChange={e => setFormEquipo({...formEquipo, telefono: e.target.value})} style={{padding:12, width:'100%', borderRadius:10, border:'2px solid #f1f5f9'}} /></div>
              <div><label style={{fontWeight:'700', fontSize:12, color:'#64748b'}}>Zona Asignada</label><input type="text" value={formEquipo.zona} onChange={e => setFormEquipo({...formEquipo, zona: e.target.value})} style={{padding:12, width:'100%', borderRadius:10, border:'2px solid #f1f5f9'}} /></div>
              <div>
                <label style={{fontWeight:'700', fontSize:12, color:'#64748b'}}>Rol</label>
                <select value={formEquipo.rol} onChange={e => setFormEquipo({...formEquipo, rol: e.target.value})} required style={{padding:12, width:'100%', borderRadius:10, border:'2px solid #f1f5f9'}}>
                  <option value="coordinador">Coordinador</option>
                  <option value="jefe_de_campana">Jefe de Campaña</option>
                  <option value="candidato">Candidato</option>
                </select>
              </div>
              <button type="submit" style={{ background: '#C8102E', color: 'white', fontWeight: '900', padding: '15px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: 16 }}>{editIdEquipo ? "ACTUALIZAR MIEMBRO" : "GUARDAR MIEMBRO"}</button>
            </form>
          </div>
          <div className="card" style={{ padding: 30, borderRadius: 25, background: 'white' }}>
            <h3 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#1e293b', fontSize: 20, marginBottom: 25 }}>Equipo de Campaña</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '400px' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>
                    <th style={{ padding: 12, textAlign: 'left' }}>Nombre / Rol</th>
                    <th style={{ padding: 12, textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {equipo.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 12 }}>
                        <div style={{ fontWeight: '800', color: '#334155' }}>{m.nombre}</div>
                        <div style={{ fontSize: 11, color: '#C8102E', textTransform: 'uppercase', fontWeight: '700' }}>{m.rol} - {m.zona}</div>
                      </td>
                      <td style={{ padding: 12, textAlign: 'right' }}>
                        <button onClick={() => { setFormEquipo(m); setEditIdEquipo(m.id); }} style={{ padding: '6px 12px', background: '#C8102E', color: 'white', border: 'none', borderRadius: '6px', fontSize: 10, fontWeight: '800' }}>EDITAR</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* BOTÓN EXCEL FLOTANTE PREMIUM */}
      <button onClick={exportarExcel} style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', background: '#16a34a', color: 'white', padding: '18px 40px', borderRadius: '50px', fontWeight: '900', border: 'none', boxShadow: '0 15px 35px rgba(22,163,74,0.4)', cursor: 'pointer', width: isMobile ? '85%' : 'auto', zIndex: 1000, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <span>📥</span> EXPORTAR REPORTES EXCEL PRO
      </button>
    </div>
  );
}