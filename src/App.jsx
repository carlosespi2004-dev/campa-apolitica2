import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const initialForm = {
  nombre: "",
  telefono: "",
  barrio: "",
  direccion: "",
  estado: "indeciso",
  observacion: "",
};

const initialEquipoForm = {
  nombre: "",
  telefono: "",
  rol: "coordinador",
  zona: "",
};

function LoginScreen({ onLogin, loading }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    await onLogin(email, password);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f3f4f6",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "white",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 8px 30px rgba(0,0,0,.08)",
        }}
      >
        <h1 style={{ marginTop: 0 }}>Ingreso al sistema</h1>
        <p style={{ color: "#666" }}>Campaña Política · Presidente Franco</p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <input
            type="email"
            placeholder="Correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);

  const [form, setForm] = useState(initialForm);
  const [votantes, setVotantes] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  const [equipo, setEquipo] = useState([]);
  const [formEquipo, setFormEquipo] = useState(initialEquipoForm);
  const [guardandoEquipo, setGuardandoEquipo] = useState(false);
  const [editandoEquipoId, setEditandoEquipoId] = useState(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 768);
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  async function cargarPerfil(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error cargando perfil:", error.message);
      return;
    }

    setPerfil(data);
  }

  async function cargarVotantes() {
    const { data, error } = await supabase
      .from("votantes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando votantes:", error.message);
      return;
    }

    setVotantes(data || []);
  }

  async function cargarEquipo() {
    const { data, error } = await supabase
      .from("equipo")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando equipo:", error.message);
      return;
    }

    setEquipo(data || []);
  }

  useEffect(() => {
    async function initAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error obteniendo sesión:", error.message);
          setAuthLoading(false);
          return;
        }

        const currentSession = data.session;
        setSession(currentSession);

        if (currentSession?.user) {
          try {
            await cargarPerfil(currentSession.user.id);
            await cargarVotantes();
            await cargarEquipo();
          } catch (err) {
            console.error("Error cargando datos iniciales:", err);
          }
        }
      } catch (err) {
        console.error("Error inicializando auth:", err);
      } finally {
        setAuthLoading(false);
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      try {
        setSession(currentSession);

        if (currentSession?.user) {
          await cargarPerfil(currentSession.user.id);
          await cargarVotantes();
          await cargarEquipo();
        } else {
          setPerfil(null);
        }
      } catch (err) {
        console.error("Error en onAuthStateChange:", err);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function login(email, password) {
    setLoginLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoginLoading(false);

    if (error) {
      alert("Error de inicio de sesión: " + error.message);
    }
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert("Error cerrando sesión: " + error.message);
    }
  }

  function limpiarFormulario() {
    setForm(initialForm);
    setEditandoId(null);
  }

  function limpiarFormularioEquipo() {
    setFormEquipo(initialEquipoForm);
    setEditandoEquipoId(null);
  }

  async function guardarVotante(e) {
    e.preventDefault();
    setGuardando(true);

    let error = null;

    if (editandoId) {
      const respuesta = await supabase
        .from("votantes")
        .update(form)
        .eq("id", editandoId);

      error = respuesta.error;
    } else {
      const respuesta = await supabase.from("votantes").insert([form]);
      error = respuesta.error;
    }

    setGuardando(false);

    if (error) {
      alert("Error guardando votante: " + error.message);
      return;
    }

    limpiarFormulario();
    cargarVotantes();
  }

  function editarVotante(votante) {
    setForm({
      nombre: votante.nombre || "",
      telefono: votante.telefono || "",
      barrio: votante.barrio || "",
      direccion: votante.direccion || "",
      estado: votante.estado || "indeciso",
      observacion: votante.observacion || "",
    });
    setEditandoId(votante.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminarVotante(id) {
    const confirmar = window.confirm("¿Seguro que querés eliminar este votante?");
    if (!confirmar) return;

    const { error } = await supabase.from("votantes").delete().eq("id", id);

    if (error) {
      alert("Error eliminando votante: " + error.message);
      return;
    }

    if (editandoId === id) limpiarFormulario();
    cargarVotantes();
  }

  async function guardarMiembro(e) {
    e.preventDefault();
    setGuardandoEquipo(true);

    let error = null;

    if (editandoEquipoId) {
      const respuesta = await supabase
        .from("equipo")
        .update(formEquipo)
        .eq("id", editandoEquipoId);

      error = respuesta.error;
    } else {
      const respuesta = await supabase.from("equipo").insert([formEquipo]);
      error = respuesta.error;
    }

    setGuardandoEquipo(false);

    if (error) {
      alert("Error guardando miembro del equipo: " + error.message);
      return;
    }

    limpiarFormularioEquipo();
    cargarEquipo();
  }

  function editarMiembro(miembro) {
    setFormEquipo({
      nombre: miembro.nombre || "",
      telefono: miembro.telefono || "",
      rol: miembro.rol || "coordinador",
      zona: miembro.zona || "",
    });
    setEditandoEquipoId(miembro.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminarMiembro(id) {
    const confirmar = window.confirm("¿Seguro que querés eliminar este miembro del equipo?");
    if (!confirmar) return;

    const { error } = await supabase.from("equipo").delete().eq("id", id);

    if (error) {
      alert("Error eliminando miembro: " + error.message);
      return;
    }

    if (editandoEquipoId === id) limpiarFormularioEquipo();
    cargarEquipo();
  }

  function exportarExcel() {
    if (votantesFiltrados.length === 0) {
      alert("No hay votantes para exportar.");
      return;
    }

    const datos = votantesFiltrados.map((v) => ({
      Nombre: v.nombre || "",
      Telefono: v.telefono || "",
      Barrio: v.barrio || "",
      Direccion: v.direccion || "",
      Estado:
        v.estado === "apoya"
          ? "Apoya"
          : v.estado === "indeciso"
          ? "Indeciso"
          : "No apoya",
      Observacion: v.observacion || "",
      Fecha: v.created_at ? new Date(v.created_at).toLocaleString() : "",
    }));

    const hoja = XLSX.utils.json_to_sheet(datos);

    hoja["!cols"] = [
      { wch: 28 },
      { wch: 18 },
      { wch: 20 },
      { wch: 24 },
      { wch: 14 },
      { wch: 28 },
      { wch: 22 },
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Votantes");
    XLSX.writeFile(libro, "votantes_presidente_franco.xlsx");
  }

  const stats = useMemo(() => {
    return {
      total: votantes.length,
      apoya: votantes.filter((v) => v.estado === "apoya").length,
      indeciso: votantes.filter((v) => v.estado === "indeciso").length,
      no_apoya: votantes.filter((v) => v.estado === "no_apoya").length,
    };
  }, [votantes]);

  const votantesFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    if (!texto) return votantes;

    return votantes.filter((v) => {
      return (
        (v.nombre || "").toLowerCase().includes(texto) ||
        (v.telefono || "").toLowerCase().includes(texto) ||
        (v.barrio || "").toLowerCase().includes(texto)
      );
    });
  }, [votantes, busqueda]);

  const grafico = useMemo(() => {
    const total = stats.total || 1;

    return [
      {
        label: "Apoya",
        valor: stats.apoya,
        porcentaje: Math.round((stats.apoya / total) * 100),
        color: "#16a34a",
      },
      {
        label: "Indeciso",
        valor: stats.indeciso,
        porcentaje: Math.round((stats.indeciso / total) * 100),
        color: "#f59e0b",
      },
      {
        label: "No apoya",
        valor: stats.no_apoya,
        porcentaje: Math.round((stats.no_apoya / total) * 100),
        color: "#dc2626",
      },
    ];
  }, [stats]);

  const conteoBarrios = useMemo(() => {
    const acumulado = {};

    votantes.forEach((v) => {
      const barrio = (v.barrio || "Sin barrio").trim();

      if (!acumulado[barrio]) {
        acumulado[barrio] = {
          barrio,
          total: 0,
          apoya: 0,
          indeciso: 0,
          no_apoya: 0,
        };
      }

      acumulado[barrio].total += 1;

      if (v.estado === "apoya") acumulado[barrio].apoya += 1;
      if (v.estado === "indeciso") acumulado[barrio].indeciso += 1;
      if (v.estado === "no_apoya") acumulado[barrio].no_apoya += 1;
    });

    return Object.values(acumulado).sort((a, b) => b.total - a.total);
  }, [votantes]);

  const layoutGrid = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
    gap: 20,
    marginTop: 20,
  };

  const statsGrid = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
    gap: 16,
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <h2>Cargando...</h2>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen onLogin={login} loading={loginLoading} />;
  }

  return (
    <div className="container" style={{ paddingBottom: isMobile ? 90 : 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ marginBottom: 6 }}>Campaña Política · Presidente Franco</h1>
          <p className="small" style={{ marginTop: 0 }}>
            Sesión iniciada como: <strong>{perfil?.nombre || session.user.email}</strong>
            {perfil?.rol ? ` · ${perfil.rol}` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={logout}
          style={{ width: "auto", padding: "10px 16px", background: "#dc2626" }}
        >
          Cerrar sesión
        </button>
      </div>

      <div style={statsGrid}>
        <div className="stat">
          <div className="small">Total</div>
          <h2>{stats.total}</h2>
        </div>
        <div className="stat">
          <div className="small">Apoya</div>
          <h2>{stats.apoya}</h2>
        </div>
        <div className="stat">
          <div className="small">Indeciso</div>
          <h2>{stats.indeciso}</h2>
        </div>
        <div className="stat">
          <div className="small">No apoya</div>
          <h2>{stats.no_apoya}</h2>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ margin: 0 }}>Gráfico automático de apoyo</h2>

          <button
            type="button"
            onClick={exportarExcel}
            style={{ width: "auto", padding: "10px 16px" }}
          >
            Exportar Excel
          </button>
        </div>

        <div style={{ marginTop: 20, display: "grid", gap: 16 }}>
          {grafico.map((item) => (
            <div key={item.label}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                  fontSize: 14,
                }}
              >
                <span>{item.label}</span>
                <span>
                  {item.valor} ({item.porcentaje}%)
                </span>
              </div>

              <div
                style={{
                  width: "100%",
                  height: 16,
                  background: "#e5e7eb",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${item.porcentaje}%`,
                    height: "100%",
                    background: item.color,
                    borderRadius: 999,
                    transition: "0.3s",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Conteo de votantes por barrio</h2>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Barrio</th>
                <th>Total</th>
                <th>Apoya</th>
                <th>Indeciso</th>
                <th>No apoya</th>
              </tr>
            </thead>
            <tbody>
              {conteoBarrios.map((item) => (
                <tr key={item.barrio}>
                  <td>{item.barrio}</td>
                  <td>{item.total}</td>
                  <td>{item.apoya}</td>
                  <td>{item.indeciso}</td>
                  <td>{item.no_apoya}</td>
                </tr>
              ))}
              {conteoBarrios.length === 0 && (
                <tr>
                  <td colSpan="5">Todavía no hay votantes cargados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={layoutGrid}>
        <div className="card">
          <h2>{editandoId ? "Editar votante" : "Modo celular · Cargar casa por casa"}</h2>

          <form className="form" onSubmit={guardarVotante}>
            <input
              placeholder="Nombre completo"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
              style={{ fontSize: isMobile ? 18 : 16 }}
            />
            <input
              placeholder="Teléfono"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              style={{ fontSize: isMobile ? 18 : 16 }}
            />
            <input
              placeholder="Barrio"
              value={form.barrio}
              onChange={(e) => setForm({ ...form, barrio: e.target.value })}
              style={{ fontSize: isMobile ? 18 : 16 }}
            />
            <input
              placeholder="Dirección"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              style={{ fontSize: isMobile ? 18 : 16 }}
            />
            <select
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
              style={{ fontSize: isMobile ? 18 : 16 }}
            >
              <option value="apoya">Apoya</option>
              <option value="indeciso">Indeciso</option>
              <option value="no_apoya">No apoya</option>
            </select>
            <textarea
              placeholder="Observación"
              value={form.observacion}
              onChange={(e) => setForm({ ...form, observacion: e.target.value })}
              style={{ fontSize: isMobile ? 18 : 16 }}
            />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="submit" style={{ flex: 1 }}>
                {guardando
                  ? "Guardando..."
                  : editandoId
                  ? "Actualizar votante"
                  : "Guardar votante"}
              </button>

              {editandoId && (
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  style={{
                    flex: 1,
                    background: "#6b7280",
                  }}
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="card">
          <h2>Lista de votantes</h2>

          <div style={{ position: "relative", marginBottom: 16 }}>
            <span
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                opacity: 0.6,
                pointerEvents: "none",
              }}
            >
              🔍
            </span>

            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o barrio"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ paddingLeft: 40, marginBottom: 0 }}
            />
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Barrio</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {votantesFiltrados.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <strong>{v.nombre}</strong>
                      <div className="small">{v.telefono || "Sin teléfono"}</div>
                    </td>
                    <td>{v.barrio || "-"}</td>
                    <td>
                      <span className={`badge ${v.estado}`}>
                        {v.estado === "apoya"
                          ? "Apoya"
                          : v.estado === "indeciso"
                          ? "Indeciso"
                          : "No apoya"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => editarVotante(v)}
                          style={{
                            width: "auto",
                            padding: "8px 12px",
                            background: "#2563eb",
                            fontSize: 14,
                          }}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => eliminarVotante(v.id)}
                          style={{
                            width: "auto",
                            padding: "8px 12px",
                            background: "#dc2626",
                            fontSize: 14,
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {votantesFiltrados.length === 0 && (
                  <tr>
                    <td colSpan="4">
                      {busqueda
                        ? "No se encontraron votantes con esa búsqueda."
                        : "Todavía no hay votantes cargados."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={layoutGrid}>
        <div className="card">
          <h2>{editandoEquipoId ? "Editar usuario del equipo" : "Usuarios del equipo de campaña"}</h2>

          <form className="form" onSubmit={guardarMiembro}>
            <input
              placeholder="Nombre del miembro"
              value={formEquipo.nombre}
              onChange={(e) => setFormEquipo({ ...formEquipo, nombre: e.target.value })}
              required
            />
            <input
              placeholder="Teléfono"
              value={formEquipo.telefono}
              onChange={(e) => setFormEquipo({ ...formEquipo, telefono: e.target.value })}
            />
            <input
              placeholder="Zona o barrio"
              value={formEquipo.zona}
              onChange={(e) => setFormEquipo({ ...formEquipo, zona: e.target.value })}
            />
            <select
              value={formEquipo.rol}
              onChange={(e) => setFormEquipo({ ...formEquipo, rol: e.target.value })}
            >
              <option value="coordinador">Coordinador</option>
              <option value="brigadista">Brigadista</option>
              <option value="supervisor">Supervisor</option>
            </select>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="submit" style={{ flex: 1 }}>
                {guardandoEquipo
                  ? "Guardando..."
                  : editandoEquipoId
                  ? "Actualizar usuario"
                  : "Guardar usuario"}
              </button>

              {editandoEquipoId && (
                <button
                  type="button"
                  onClick={limpiarFormularioEquipo}
                  style={{
                    flex: 1,
                    background: "#6b7280",
                  }}
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="card">
          <h2>Lista del equipo</h2>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>Zona</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {equipo.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.nombre}</strong>
                      <div className="small">{m.telefono || "Sin teléfono"}</div>
                    </td>
                    <td>{m.rol || "-"}</td>
                    <td>{m.zona || "-"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => editarMiembro(m)}
                          style={{
                            width: "auto",
                            padding: "8px 12px",
                            background: "#2563eb",
                            fontSize: 14,
                          }}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => eliminarMiembro(m.id)}
                          style={{
                            width: "auto",
                            padding: "8px 12px",
                            background: "#dc2626",
                            fontSize: 14,
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {equipo.length === 0 && (
                  <tr>
                    <td colSpan="4">Todavía no hay usuarios del equipo cargados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isMobile && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            background: "#111827",
            color: "white",
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-around",
            zIndex: 50,
            boxShadow: "0 -4px 20px rgba(0,0,0,.18)",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Total</div>
            <strong>{stats.total}</strong>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Apoya</div>
            <strong>{stats.apoya}</strong>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Indeciso</div>
            <strong>{stats.indeciso}</strong>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>No apoya</div>
            <strong>{stats.no_apoya}</strong>
          </div>
        </div>
      )}
    </div>
  );
}