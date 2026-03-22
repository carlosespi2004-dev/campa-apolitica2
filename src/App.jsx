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
      <div className="card" style={{ width: "100%", maxWidth: 450, padding: 40, textAlign: 'center', borderRadius: '15px', background: 'white' }}>
        <h2 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', marginBottom: 30 }}>ACCESO</h2>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }} style={{ display: "grid", gap: 20 }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontWeight: '700', fontSize: '14px' }}>Correo</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '15px', borderRadius: '10px', border: '1px solid #ddd', width: '100%' }} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontWeight: '700', fontSize: '14px' }}>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '15px', borderRadius: '10px', border: '1px solid #ddd', width: '100%' }} />
          </div>
          <button type="submit" disabled={loading} style={{ background: '#C8102E', color: 'white', fontWeight: '900', padding: '18px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>
            {loading ? "CARGANDO..." : "INGRESAR AL PANEL"}
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

  async function guardarEquipo(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = editIdEquipo ? await supabase.from("equipo").update(formEquipo).eq("id", editIdEquipo) : await supabase.from("equipo").insert([formEquipo]);
    if (!error) { setFormEquipo({ nombre: "", telefono: "", rol: "coordinador", zona: "" }); setEditIdEquipo(null); cargarDatos(); }
    setLoading(false);
  }

  const exportarExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const crearHoja = (nombre, lista) => {
      const sheet = workbook.addWorksheet(nombre);
      sheet.columns = [{ key: 'nro', width: 8 }, { key: 'nom', width: 25 }, { key: 'ape', width: 25 }, { key: 'ci', width: 15 }, { key: 'ord', width: 10 }, { key: 'mes', width: 10 }, { key: 'sec', width: 12 }, { key: 'loc', width: 25 }, { key: 'cap', width: 25 }];
      sheet.addRow(["HAGAMOS QUE SUCEDA"]); sheet.mergeCells('A1:I1');
      const r1 = sheet.getRow(1); r1.height = 35; r1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8102E' } }; r1.getCell(1).font = { color: { argb: 'FFFFFFFF' }, size: 20, bold: true }; r1.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.addRow(["Darío Carmona Concejal 2026"]); sheet.mergeCells('A2:I2');
      const r2 = sheet.getRow(2); r2.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; r2.getCell(1).font = { color: { argb: 'FF000000' }, size: 12, italic: true }; r2.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.addRow([]);
      const header = sheet.addRow(["Nro", "Nombre", "Apellido", "Cedula", "Orden", "Mesa", "Seccional", "Local", "Captado por"]);
      header.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8102E' } }; c.font = { color: { argb: 'FFFFFFFF' }, bold: true }; });
      lista.forEach((v, i) => {
        const row = sheet.addRow([i + 1, v.nombre, v.apellido, v.cedula, v.orden, v.mesa, v.seccional, v.local_votacion, v.por_parte_de_nombre]);
        if (i % 2 !== 0) row.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } });
      });
    };
    crearHoja("LISTA GENERAL", votantes);
    equipo.forEach(m => { const d = votantes.filter(v => v.por_parte_de_id === m.id); if (d.length > 0) crearHoja(m.nombre.substring(0, 25), d); });
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Campaña_Franco.xlsx`);
  };

  if (!session) return <LoginScreen onLogin={async (e, p) => await supabase.auth.signInWithPassword({ email: e, password: p })} loading={loading} />;

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: isMobile ? '10px' : '20px', maxWidth: '1200px', margin: '0 auto', paddingBottom: '100px' }}>
      <header style={{ textAlign: 'center', marginBottom: 30 }}>
        <button onClick={() => supabase.auth.signOut()} style={{ background: '#C8102E', color: 'white', padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>Cerrar Sesión</button>
        <h1 style={{ fontFamily: 'Montserrat', fontWeight: '900', color: '#C8102E', marginTop: 15 }}>Hagamos que suceda</h1>
        <h2 style={{ fontFamily: 'Montserrat', fontWeight: '800', color: '#666', fontSize: '16px' }}>Darío Carmona Concejal 2026</h2>
      </header>

      {/* DASHBOARD INDICADORES */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 15, marginBottom: 30 }}>
        <div style={{ background: 'white', padding: '15px', borderRadius: '12px', borderLeft: '8px solid #C8102E', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: 28, fontWeight: '900', margin: 0 }}>{votantes.length}</h3>
            <p style={{ textTransform: 'uppercase', fontWeight: '800', fontSize: 10, color: '#C8102E' }}>Votantes</p>
        </div>
        <div style={{ background: 'white', padding: '15px', borderRadius: '12px', borderLeft: '8px solid #C8102E', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: 28, fontWeight: '900', margin: 0 }}>{equipo.length}</h3>
            <p style={{ textTransform: 'uppercase', fontWeight: '800', fontSize: 10, color: '#C8102E' }}>Equipo</p>
        </div>
        <div className="card" style={{ padding: '15px', borderRadius: '12px' }}>
          <h4 style={{ fontSize: 11, marginBottom: 10, fontWeight: '900' }}>BUSCADOR</h4>
          <div style={{ display: 'flex', gap: 5 }}>
            <input type="text" value={cedulaRapida} onChange={e => setCedulaRapida(e.target.value)} placeholder="Cédula" style={{ padding: '10px', width: '100%', borderRadius: '8px', border: '1px solid #ddd' }} />
            <button onClick={buscarEnPadron} style={{ width: '50px', background: '#C8102E', color: 'white', border: 'none', borderRadius: '8px' }}>🔍</button>
          </div>
          {resultadoPadron && (
            <div style={{ marginTop: 10, padding: 10, background: '#fef2f2', borderRadius: 8, border: '1px solid #C8102E', textAlign: 'left' }}>
              <p style={{ fontSize: 13, fontWeight: '800', margin: '0 0 5px 0' }}>{resultadoPadron.nombre} {resultadoPadron.apellido}</p>
              <div style={{ fontSize: '11px', color: '#444' }}>Mesa: {resultadoPadron.mesa} | Orden: {resultadoPadron.orden} | Sec: {resultadoPadron.seccional}</div>
              <div style={{ fontSize: '11px', color: '#C8102E', marginBottom: 10 }}>{resultadoPadron.local_votacion}</div>
              <button onClick={() => { setFormVotante({ ...formVotante, ...resultadoPadron }); setResultadoPadron(null); }} style={{ background: '#16a34a', color: 'white', padding: '8px', width: '100%', fontSize: '12px', fontWeight: '900', border: 'none', borderRadius: '8px' }}>ASIGNAR AL FORMULARIO</button>
            </div>
          )}
        </div>
      </div>

      {/* RENDIMIENTO Y BARRIOS */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 30 }}>
        <div className="card" style={{ padding: '20px' }}>
          <h4 style={{ color: '#C8102E', marginBottom: 15 }}>RENDIMIENTO</h4>
          {rendimientoEquipo.slice(0, 10).map(m => (
            <div key={m.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span>{m.nombre}</span> <strong>{m.cantidad} ({m.porcentaje}%)</strong></div>
              <div style={{ height: 8, background: '#eee', borderRadius: 4, overflow: 'hidden', marginTop: 4 }}><div style={{ width: `${m.porcentaje}%`, height: '100%', background: '#C8102E' }}></div></div>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <h4 style={{ color: '#C8102E', marginBottom: 10 }}>CONTEO POR BARRIO</h4>
          <table style={{ width: '100%' }}>
            <thead><tr style={{ color: '#C8102E', fontSize: '12px' }}><th style={{ textAlign: 'left' }}>BARRIO</th><th style={{ textAlign: 'right' }}>TOTAL</th></tr></thead>
            <tbody>{conteoBarrio.map(b => (<tr key={b.name} style={{ borderBottom: '1px solid #fafafa' }}><td style={{ fontSize: '13px' }}>{b.name}</td><td style={{ textAlign: 'right', fontWeight: '800', color: '#C8102E' }}>{b.total}</td></tr>))}</tbody>
          </table>
        </div>
      </div>

      {/* REGISTRO VOTANTE */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 25 }}>
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ color: '#C8102E', borderBottom: '2px solid #eee', paddingBottom: 10, textAlign: 'center' }}>REGISTRAR VOTANTE</h3>
          <form onSubmit={guardarVotante} style={{ display: 'grid', gap: '15px', marginTop: 15 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={{ fontWeight: '700', fontSize: '12px' }}>Nombre</label><input type="text" value={formVotante.nombre} onChange={e => setFormVotante({ ...formVotante, nombre: e.target.value })} required style={{ padding: '12px', width: '100%', borderRadius: '8px', border: '1px solid #ddd' }} /></div>
              <div><label style={{ fontWeight: '700', fontSize: '12px' }}>Apellido</label><input type="text" value={formVotante.apellido} onChange={e => setFormVotante({ ...formVotante, apellido: e.target.value })} required style={{ padding: '12px', width: '100%', borderRadius: '8px', border: '1px solid #ddd' }} /></div>
            </div>
            <div><label style={{ fontWeight: '700', fontSize: '12px' }}>Cédula</label><input type="text" value={formVotante.cedula} onChange={e => setFormVotante({ ...formVotante, cedula: e.target.value })} required style={{ padding: '12px', width: '100%', borderRadius: '8px', border: '1px solid #ddd' }} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={{ fontWeight: '700', fontSize: '12px' }}>Mesa</label><input type="text" value={formVotante.mesa} onChange={e => setFormVotante({ ...formVotante, mesa: e.target.value })} style={{ padding: '12px', width: '100%', borderRadius: '8px', border: '1px solid #ddd' }} /></div>
              <div><label style={{ fontWeight: '700', fontSize: '12px' }}>Orden</label><input type="text" value={formVotante.orden} onChange={e => setFormVotante({ ...formVotante, orden: e.target.value })} style={{ padding: '12px', width: '100%', borderRadius: '8px', border: '1px solid #ddd' }} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={{ fontWeight: '700', fontSize: '12px' }}>Seccional</label><input type="text" value={formVotante.seccional} onChange={e => setFormVotante({ ...formVotante, seccional: e.target.value })} style={{ padding: '12px', width: '100%', borderRadius: '8px', border: '1px solid #ddd' }} /></div>
              <div><label style={{ fontWeight: '700', fontSize: '12px' }}>Local de Votación</label><input type="text" value={formVotante.local_votacion} onChange={e => setFormVotante({ ...formVotante, local_votacion: e.target.value })} style={{ padding: '12px', width: '100%', borderRadius: '8px', border: '1px solid #ddd' }} /></div>
            </div>
            <div><label style={{ fontWeight: '700', fontSize: '12px' }}>Barrio</label><select value={formVotante.barrio} onChange={e => setFormVotante({ ...formVotante, barrio: e.target.value })} required style={{ padding: '12px', width: '100%', borderRadius: '8px', border: '1px solid #ddd' }}><option value="">Elegir barrio...</option>{LISTA_BARRIOS.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
            <div><label style={{ fontWeight: '700', fontSize: '12px' }}>Responsable</label><select value={formVotante.por_parte_de_id} onChange={e => setFormVotante({ ...formVotante, por_parte_de_id: e.target.value })} required style={{ padding: '12px', width: '100%', borderRadius: '8px', border: '1px solid #ddd' }}><option value="">Seleccionar responsable...</option>{equipo.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
            <button type="submit" style={{ background: '#C8102E', color: 'white', fontWeight: '900', padding: '15px', borderRadius: '10px', border: 'none' }}>{editIdVotante ? "ACTUALIZAR" : "GUARDAR REGISTRO"}</button>
          </form>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ color: '#C8102E', borderBottom: '2px solid #eee', paddingBottom: 10, textAlign: 'center' }}>LISTA DE VOTANTES</h3>
          <input type="text" placeholder="🔍 Buscar..." value={busquedaVotante} onChange={e => setBusquedaVotante(e.target.value)} style={{ padding: '12px', width: '100%', margin: '15px 0', borderRadius: '10px', border: '1px solid #ddd' }} />
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: '400px' }}>
            <thead style={{ background: '#C8102E', color: 'white' }}><tr><th style={{ padding: '10px' }}>NOMBRE</th><th style={{ padding: '10px' }}>CÉDULA</th><th style={{ padding: '10px' }}>ACCIONES</th></tr></thead>
            <tbody>{votantes.filter(v => (v.nombre + v.apellido).toLowerCase().includes(busquedaVotante.toLowerCase())).slice(0, 15).map(v => (<tr key={v.id} style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '10px' }}><strong>{v.nombre}</strong></td><td style={{ padding: '10px' }}>{v.cedula}</td><td style={{ padding: '10px', display: 'flex', gap: 5 }}><button onClick={() => { setFormVotante(v); setEditIdVotante(v.id); }} style={{ padding: '5px 10px', background: '#C8102E', color: 'white', border: 'none', borderRadius: '5px' }}>EDITAR</button><button onClick={async () => { if (confirm("¿Borrar?")) { await supabase.from("votantes").delete().eq("id", v.id); cargarDatos(); } }} style={{ padding: '5px 10px', background: '#444', color: 'white', border: 'none', borderRadius: '5px' }}>X</button></td></tr>))}</tbody>
          </table></div>
        </div>
      </div>

      {/* EQUIPO */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 25, marginTop: 40 }}>
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ color: '#C8102E', borderBottom: '2px solid #eee', paddingBottom: 10, textAlign: 'center' }}>REGISTRAR EQUIPO</h3>
          <form onSubmit={guardarEquipo} style={{ display: 'grid', gap: '15px', marginTop: 15 }}>
            <div><label style={{ fontWeight: '700', fontSize: '12px' }}>Nombre</label><input type="text" value={formEquipo.nombre} onChange={e => setFormEquipo({ ...formEquipo, nombre: e.target.value })} required style={{ padding: '12px', width: '100%', borderRadius: '8px', border: '1px solid #ddd' }} /></div>
            <div><label style={{ fontWeight: '700', fontSize: '12px' }}>Teléfono</label><input type="text" value={formEquipo.telefono} onChange={e => setFormEquipo({ ...formEquipo, telefono: e.target.value })} style={{ padding: '12px', width: '100%', borderRadius: '8px', border: '1px solid #ddd' }} /></div>
            <div><label style={{ fontWeight: '700', fontSize: '12px' }}>Zona</label><input type="text" value={formEquipo.zona} onChange={e => setFormEquipo({ ...formEquipo, zona: e.target.value })} style={{ padding: '12px', width: '100%', borderRadius: '8px', border: '1px solid #ddd' }} /></div>
            <div><label style={{ fontWeight: '700', fontSize: '12px' }}>Rol</label><select value={formEquipo.rol} onChange={e => setFormEquipo({ ...formEquipo, rol: e.target.value })} style={{ padding: '12px', width: '100%', borderRadius: '8px', border: '1px solid #ddd' }}><option value="coordinador">Coordinador</option><option value="jefe_de_campana">Jefe de Campaña</option><option value="candidato">Candidato</option></select></div>
            <button type="submit" style={{ background: '#C8102E', color: 'white', fontWeight: '900', padding: '15px', borderRadius: '10px', border: 'none' }}>GUARDAR MIEMBRO</button>
          </form>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ color: '#C8102E', borderBottom: '2px solid #eee', paddingBottom: 10, textAlign: 'center' }}>LISTA DEL EQUIPO</h3>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: '400px' }}>
            <thead style={{ background: '#444', color: 'white' }}><tr><th style={{ padding: '10px' }}>NOMBRE</th><th style={{ padding: '10px' }}>ACCIONES</th></tr></thead>
            <tbody>{equipo.map(m => (<tr key={m.id} style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '10px' }}><strong>{m.nombre}</strong><br /><small>{m.rol} - {m.zona}</small></td><td style={{ padding: '10px', display: 'flex', gap: 5 }}><button onClick={() => { setFormEquipo(m); setEditIdEquipo(m.id); }} style={{ padding: '5px 10px', background: '#C8102E', color: 'white', border: 'none', borderRadius: '5px' }}>EDITAR</button><button onClick={async () => { if (confirm("¿Eliminar?")) { await supabase.from("equipo").delete().eq("id", m.id); cargarDatos(); } }} style={{ padding: '5px 10px', background: '#444', color: 'white', border: 'none', borderRadius: '5px' }}>X</button></td></tr>))}</tbody>
          </table></div>
        </div>
      </div>

      <button onClick={exportarExcel} style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#16a34a', color: 'white', padding: '15px 30px', borderRadius: '50px', fontWeight: '800', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', cursor: 'pointer', width: isMobile ? '80%' : 'auto', zIndex: 1000 }}>📥 EXPORTAR EXCEL PRO</button>
    </div>
  );
}