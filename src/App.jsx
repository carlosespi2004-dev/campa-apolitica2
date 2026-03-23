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

// --- LOGOS ---
const ANRLogo = () => (
  <div style={{ background: '#C8102E', width: 60, height: 60, borderRadius: '50%', display: 'grid', placeItems: 'center', margin: '0 auto', border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
    <span style={{ color: 'white', fontWeight: '900', fontSize: '16px', fontFamily: 'Montserrat' }}>ANR</span>
  </div>
);

const ParaguayFlag = () => (
  <svg width="30" height="20" viewBox="0 0 3 2" style={{ borderRadius: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
    <rect width="3" height="2" fill="#d52b1e"/><rect width="3" height="1.333" y="0.667" fill="#fff"/><rect width="3" height="0.667" y="1.333" fill="#0033a0"/>
    <circle cx="1.5" cy="1" r="0.22" fill="white" stroke="#64748b" strokeWidth="0.01"/>
    <circle cx="1.5" cy="1" r="0.18" fill="none" stroke="#edcb15" strokeWidth="0.02"/>
    <text x="1.5" y="1.08" textAnchor="middle" fill="#edcb15" fontSize="0.12" fontWeight="900">★</text>
  </svg>
);

// --- COMPONENTE LOGIN CON MENSAJE DE ERROR ---
function LoginScreen({ onLogin, loading }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError(false);
    const { error } = await onLogin(email, password);
    if (error) setLoginError(true);
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f0f2f5", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400, padding: '40px 25px', textAlign: 'center', borderRadius: '25px', background: 'white', boxShadow: '0 15px 35px rgba(0,0,0,0.1)' }}>
        <ANRLogo />
        <h1 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', fontSize: '26px', marginTop: 20, marginBottom: 5 }}>BIENVENIDO</h1>
        <p style={{ color: '#64748b', marginBottom: 35, fontWeight: '600', fontSize: '14px' }}>Gestión Política Darío Carmona</p>
        
        {loginError && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '10px', marginBottom: 20, fontSize: '13px', fontWeight: '700', border: '1px solid #fca5a5' }}>
            Credenciales incorrectas. Intente de nuevo.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontWeight: '800', fontSize: '12px', color: '#444' }}>CORREO ELECTRÓNICO</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '16px', borderRadius: '12px', border: '1px solid #ddd', width: '100%', marginTop: 8, fontSize: '16px' }} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontWeight: '800', fontSize: '12px', color: '#444' }}>CONTRASEÑA</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '16px', borderRadius: '12px', border: '1px solid #ddd', width: '100%', marginTop: 8, fontSize: '16px' }} />
          </div>
          <button type="submit" disabled={loading} style={{ background: '#C8102E', color: 'white', fontWeight: '900', padding: '18px', borderRadius: '15px', border: 'none', cursor: 'pointer', fontSize: '16px', marginTop: 10 }}>
            {loading ? "CONECTANDO..." : "ENTRAR AL PANEL"}
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
  const [activeTab, setActiveTab] = useState("inicio");

  const [formVotante, setFormVotante] = useState({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", por_parte_de_id: "" });
  const [formEquipo, setFormEquipo] = useState({ nombre: "", telefono: "", rol: "coordinador", zona: "" });
  const [editIdVotante, setEditIdVotante] = useState(null);
  const [editIdEquipo, setEditIdEquipo] = useState(null);
  const [busquedaLista, setBusquedaLista] = useState("");
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
    const total = votantes?.length || 0;
    return (equipo || []).map(m => {
      const cant = (votantes || []).filter(v => v.por_parte_de_id === m.id).length;
      return { ...m, cantidad: cant, porcentaje: total > 0 ? Math.round((cant / total) * 100) : 0 };
    }).sort((a, b) => b.cantidad - a.cantidad);
  }, [votantes, equipo]);

  const conteoBarrio = useMemo(() => {
    const counts = {};
    (votantes || []).forEach(v => { const b = v.barrio || "Sin barrio"; counts[b] = (counts[b] || 0) + 1; });
    return Object.entries(counts).map(([name, total]) => ({ name, total }));
  }, [votantes]);

  async function buscarEnPadron() {
    const limpia = normalizarCedula(cedulaRapida);
    if (!limpia) return;
    setLoading(true);
    const { data } = await supabase.from("padron_importado").select("*").or(`cedula_limpia.eq.${limpia},cedula.eq.${cedulaRapida}`).limit(1).maybeSingle();
    if (data) setResultadoPadron(data); else alert("Cédula no encontrada.");
    setLoading(false);
  }

  async function guardarVotante(e) {
    e.preventDefault();
    if (!formVotante.por_parte_de_id) return alert("Selecciona un responsable.");
    setLoading(true);
    const resp = equipo.find(m => m.id === formVotante.por_parte_de_id);
    const payload = { ...formVotante, cedula_limpia: normalizarCedula(formVotante.cedula), por_parte_de_nombre: resp?.nombre || "" };
    const { error } = editIdVotante ? await supabase.from("votantes").update(payload).eq("id", editIdVotante) : await supabase.from("votantes").insert([payload]);
    if (!error) { setFormVotante({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", por_parte_de_id: "" }); setEditIdVotante(null); cargarDatos(); alert("¡Guardado correctamente!"); }
    setLoading(false);
  }

  async function guardarEquipo(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = editIdEquipo ? await supabase.from("equipo").update(formEquipo).eq("id", editIdEquipo) : await supabase.from("equipo").insert([formEquipo]);
    if (!error) { setFormEquipo({ nombre: "", telefono: "", rol: "coordinador", zona: "" }); setEditIdEquipo(null); cargarDatos(); alert("Equipo actualizado."); }
    setLoading(false);
  }

  const exportarExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    
    const crearHoja = (nombreHoja, lista) => {
      const sheet = workbook.addWorksheet(nombreHoja.substring(0, 30));
      
      sheet.addRow(["HAGAMOS QUE SUCEDA"]);
      sheet.mergeCells('A1:I1');
      const rTitulo = sheet.getRow(1);
      rTitulo.height = 30;
      rTitulo.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8102E' } };
      rTitulo.getCell(1).font = { color: { argb: 'FFFFFFFF' }, size: 18, bold: true };
      rTitulo.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

      sheet.addRow(["Darío Carmona Concejal 2026"]);
      sheet.mergeCells('A2:I2');
      const rSub = sheet.getRow(2);
      rSub.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8102E' } };
      rSub.getCell(1).font = { color: { argb: 'FFFFFFFF' }, size: 14, bold: true };
      rSub.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

      sheet.addRow([]);

      const headerRow = sheet.addRow(["Nro", "Nombre", "Apellido", "Cedula", "Orden", "Mesa", "Seccional", "Local", "Captado por"]);
      headerRow.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8102E' } };
        c.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      });

      lista.forEach((v, i) => {
        const row = sheet.addRow([i + 1, v.nombre, v.apellido, v.cedula, v.orden, v.mesa, v.seccional, v.local_votacion, v.por_parte_de_nombre]);
        const color = i % 2 !== 0 ? 'FFFEE2E2' : 'FFFFFFFF';
        row.eachCell(c => {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
          c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
      });

      // AUTO AJUSTE DE COLUMNAS SEGÚN EL TEXTO
      sheet.columns.forEach(column => {
        let maxColumnLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxColumnLength) maxColumnLength = columnLength;
        });
        column.width = maxColumnLength < 10 ? 12 : maxColumnLength + 5;
      });
    };

    // Crear Pestaña General
    crearHoja("GENERAL", votantes);

    // Crear Pestañas por Integrantes
    equipo.forEach(miembro => {
      const votantesDeMiembro = votantes.filter(v => v.por_parte_de_id === miembro.id);
      if (votantesDeMiembro.length > 0) {
        crearHoja(miembro.nombre, votantesDeMiembro);
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Campana_Dario_Carmona.xlsx`);
  };

  if (!session) return <LoginScreen onLogin={(e, p) => supabase.auth.signInWithPassword({ email: e, password: p })} loading={loading} />;

  const tabStyle = (id) => ({
    flex: 1, padding: isMobile ? '15px 5px' : '20px', border: 'none', background: activeTab === id ? '#C8102E' : '#f8f9fa', color: activeTab === id ? 'white' : '#6c757d', fontWeight: '900', fontSize: isMobile ? '10px' : '13px', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '15px 15px 0 0', transition: '0.2s', margin: '0 1px'
  });

  return (
    <div style={{ background: '#f4f7f6', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ background: 'white', padding: isMobile ? '20px 15px' : '30px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', position: 'relative' }}>
        <button onClick={() => supabase.auth.signOut()} style={{ background: '#f1f5f9', color: '#dc3545', padding: '8px 12px', borderRadius: '8px', border: 'none', fontWeight: '800', cursor: 'pointer', position: 'absolute', right: 15, top: 15, fontSize: '10px' }}>SALIR</button>
        <ANRLogo />
        <h1 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', fontSize: isMobile ? '22px' : '36px', margin: '10px 0 0 0', letterSpacing: '-1px' }}>HAGAMOS QUE SUCEDA</h1>
        <div style={{ background: '#f8f9fa', padding: '6px 15px', borderRadius: '50px', display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <ParaguayFlag />
          <h2 style={{ fontFamily: 'Montserrat', fontWeight: '800', color: '#495057', fontSize: isMobile ? '12px' : '15px', margin: 0 }}>Darío Carmona Concejal 2026</h2>
        </div>
      </header>

      <nav style={{ display: 'flex', background: '#f8f9fa', padding: '10px 10px 0 10px', sticky: 'top', top: 0, zIndex: 100 }}>
        <button onClick={() => setActiveTab("inicio")} style={tabStyle("inicio")}>Inicio</button>
        <button onClick={() => setActiveTab("votantes")} style={tabStyle("votantes")}>Votantes</button>
        <button onClick={() => setActiveTab("equipo")} style={tabStyle("equipo")}>Equipo</button>
        <button onClick={() => setActiveTab("reportes")} style={tabStyle("reportes")}>Reportes</button>
      </nav>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: isMobile ? '20px 10px' : '30px 15px', paddingBottom: 120 }}>
        
        {activeTab === 'inicio' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div className="card" style={{ background: 'white', padding: 25, borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
              <h4 style={{ color: '#C8102E', fontWeight: '900', marginBottom: 15, fontSize: '14px' }}>🔍 BUSCADOR DE PADRÓN</h4>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" value={cedulaRapida} onChange={e => setCedulaRapida(e.target.value)} placeholder="N° Cédula..." style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px' }} />
                <button onClick={buscarEnPadron} style={{ padding: '0 20px', background: '#C8102E', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '900' }}>BUSCAR</button>
              </div>
              {resultadoPadron && (
                <div style={{ marginTop: 20, padding: 15, background: '#fef2f2', borderRadius: '15px', border: '2px dashed #C8102E', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '18px', color: '#C8102E', fontWeight: '900', margin: 0 }}>{resultadoPadron?.nombre} {resultadoPadron?.apellido}</h3>
                  <p style={{ fontWeight: '700', color: '#6c757d', fontSize: '13px', margin: '8px 0' }}>Mesa: {resultadoPadron?.mesa} | Orden: {resultadoPadron?.orden}</p>
                  <button onClick={() => { setFormVotante({ ...formVotante, ...resultadoPadron }); setResultadoPadron(null); }} style={{ background: '#28a745', color: 'white', padding: '10px 20px', borderRadius: '8px', fontWeight: '900', border: 'none', fontSize: '13px' }}>ASIGNAR AHORA</button>
                </div>
              )}
            </div>

            <div style={{ background: 'white', padding: isMobile ? 20 : 30, borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
              <h3 style={{ color: '#C8102E', fontWeight: '900', textAlign: 'center', marginBottom: 20, fontSize: '18px' }}>NUEVO REGISTRO</h3>
              <form onSubmit={guardarVotante} style={{ display: 'grid', gap: 15 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input type="text" placeholder="Nombre" value={formVotante.nombre} onChange={e => setFormVotante({...formVotante, nombre: e.target.value})} required style={{padding:'14px', borderRadius:'10px', border:'1px solid #ddd', fontSize:'16px'}} />
                  <input type="text" placeholder="Apellido" value={formVotante.apellido} onChange={e => setFormVotante({...formVotante, apellido: e.target.value})} required style={{padding:'14px', borderRadius:'10px', border:'1px solid #ddd', fontSize:'16px'}} />
                </div>
                <input type="text" placeholder="Cédula" value={formVotante.cedula} onChange={e => setFormVotante({...formVotante, cedula: e.target.value})} required style={{padding:'14px', borderRadius:'10px', border:'1px solid #ddd', fontSize:'16px'}} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                   <input type="text" placeholder="Seccional" value={formVotante.seccional} onChange={e => setFormVotante({...formVotante, seccional: e.target.value})} style={{padding:'14px', borderRadius:'10px', border:'1px solid #ddd', fontSize:'16px'}} />
                   <input type="text" placeholder="Local Votación" value={formVotante.local_votacion} onChange={e => setFormVotante({...formVotante, local_votacion: e.target.value})} style={{padding:'14px', borderRadius:'10px', border:'1px solid #ddd', fontSize:'16px'}} />
                </div>
                <select value={formVotante.barrio} onChange={e => setFormVotante({...formVotante, barrio: e.target.value})} required style={{padding:'14px', borderRadius:'10px', border:'1px solid #ddd', fontSize:'16px', background:'white'}}>
                  <option value="">Elegir barrio...</option>
                  {LISTA_BARRIOS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select value={formVotante.por_parte_de_id} onChange={e => setFormVotante({...formVotante, por_parte_de_id: e.target.value})} required style={{padding:'14px', borderRadius:'10px', border:'1px solid #ddd', fontSize:'16px', background:'white'}}>
                  <option value="">¿Quién lo captó?</option>
                  {equipo.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
                <button type="submit" style={{ background: '#C8102E', color: 'white', fontWeight: '900', padding: '18px', borderRadius: '12px', border: 'none', fontSize: '16px' }}>{editIdVotante ? "ACTUALIZAR" : "GUARDAR"}</button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'votantes' && (
          <div style={{ background: 'white', padding: 15, borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <h3 style={{ color: '#C8102E', fontWeight: '900', marginBottom: 15, fontSize: '18px' }}>LISTADO</h3>
            <input type="text" placeholder="🔍 Buscar nombre o CI..." value={busquedaLista} onChange={e => setBusquedaLista(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #ddd', marginBottom: 20, fontSize: '16px' }} />
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {(votantes || []).filter(v => (v?.nombre + v?.apellido + v?.cedula).toLowerCase().includes(busquedaLista.toLowerCase())).map(v => (
                    <tr key={v?.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px 5px' }}>
                        <div style={{ fontWeight: '800', color: '#333', fontSize:'14px' }}>{v?.nombre} {v?.apellido}</div>
                        <div style={{ fontSize: '11px', color: '#666' }}>CI: {v?.cedula} | {v?.barrio}</div>
                      </td>
                      <td style={{ textAlign:'right', padding: '12px 0' }}>
                        <button onClick={() => { setFormVotante(v); setEditIdVotante(v.id); setActiveTab('inicio'); }} style={{ padding: '8px 12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: '800', color: '#6c757d', fontSize:'11px', marginRight: 5 }}>EDITAR</button>
                        <button onClick={async () => { if(confirm("¿Eliminar?")) { await supabase.from("votantes").delete().eq("id", v.id); cargarDatos(); } }} style={{ padding: '8px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize:'11px' }}>X</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'equipo' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div style={{ background: 'white', padding: 20, borderRadius: '20px' }}>
              <h3 style={{ color: '#C8102E', fontWeight: '900', marginBottom: 15, textAlign: 'center', fontSize:'16px' }}>EQUIPO</h3>
              <form onSubmit={guardarEquipo} style={{ display: 'grid', gap: 12 }}>
                <input type="text" placeholder="Nombre" value={formEquipo.nombre} onChange={e => setFormEquipo({...formEquipo, nombre: e.target.value})} required style={{padding:'12px', borderRadius:'10px', border:'1px solid #ddd'}} />
                <input type="text" placeholder="Zona" value={formEquipo.zona} onChange={e => setFormEquipo({...formEquipo, zona: e.target.value})} style={{padding:'12px', borderRadius:'10px', border:'1px solid #ddd'}} />
                <button type="submit" style={{ background: '#C8102E', color: 'white', fontWeight: '900', padding: '14px', borderRadius: '10px', border: 'none' }}>GUARDAR MIEMBRO</button>
              </form>
            </div>
            <div style={{ background: 'white', padding: 20, borderRadius: '20px' }}>
              {equipo.map(m => (
                <div key={m?.id} style={{ padding: '12px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems:'center' }}>
                  <span><strong>{m?.nombre}</strong><br/><small>{m?.zona}</small></span>
                  <button onClick={() => { setFormEquipo(m); setEditIdEquipo(m.id); }} style={{ padding: '6px 12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '10px' }}>EDITAR</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reportes' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div style={{ background: 'white', padding: 20, borderRadius: '20px' }}>
              <h3 style={{ color: '#C8102E', fontWeight: '900', marginBottom: 15, fontSize: '16px' }}>RENDIMIENTO</h3>
              {rendimientoEquipo.map(m => (
                <div key={m?.id} style={{ marginBottom: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '800', marginBottom: 5 }}>
                    <span>{m?.nombre}</span> <span>{m?.cantidad} ({m?.porcentaje}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#eee', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${m?.porcentaje}%`, height: '100%', background: '#C8102E' }}></div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: 'white', padding: 0, borderRadius: '20px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#C8102E' }}>
                  <tr style={{ color: 'white', fontSize: '12px', fontWeight: '900' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>BARRIO</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>VOTOS</th>
                  </tr>
                </thead>
                <tbody>
                  {conteoBarrio.map(b => (
                    <tr key={b?.name} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#333' }}>{b?.name}</td>
                      <td style={{ textAlign: 'right', fontWeight: '900', color: '#C8102E', paddingRight: '12px' }}>{b?.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <div style={{ position: 'fixed', bottom: 20, width: '100%', display: 'flex', justifyContent: 'center', padding: '0 20px', zIndex: 1000 }}>
        <button onClick={exportarExcel} style={{ background: '#28a745', color: 'white', padding: '18px 30px', borderRadius: '500px', fontWeight: '900', border: 'none', boxShadow: '0 10px 25px rgba(40,167,69,0.3)', width: '100%', maxWidth: '400px', fontSize: '14px' }}>
          📥 EXPORTAR REPORTES (EXCEL)
        </button>
      </div>
    </div>
  );
}