import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Tiempo de espera agotado")), ms)
    ),
  ]);
}

const initialForm = {
  nombre: "",
  apellido: "",
  cedula: "",
  orden: "",
  mesa: "",
  local_votacion: "",
  seccional: "",
  barrio: "",
  por_parte_de_id: "",
  por_parte_de_nombre: "",
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
  const [dataLoading, setDataLoading] = useState(false);
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
    const { data, error } = await withTimeout(
      supabase.from("profiles").select("*").eq("id", userId).single()
    );

    if (error) {
      console.error("Error cargando perfil:", error.message);
      return;
    }

    setPerfil(data);
  }

  async function cargarVotantes() {
    const { data, error } = await withTimeout(
      supabase
        .from("votantes")
        .select("*")
        .order("created_at", { ascending: false })
    );

    if (error) {
      console.error("Error cargando votantes:", error.message);
      return;
    }

    setVotantes(data || []);
  }

  async function cargarEquipo() {
    const { data, error } = await withTimeout(
      supabase
        .from("equipo")
        .select("*")
        .order("created_at", { ascending: false })
    );

    if (error) {
      console.error("Error cargando equipo:", error.message);
      return;
    }

    setEquipo(data || []);
  }

  useEffect(() => {
    let mounted = true;

    async function limpiarSesionRota() {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch (err) {
        console.error("Error limpiando sesión rota:", err);
      } finally {
        if (mounted) {
          setSession(null);
          setPerfil(null);
          setVotantes([]);
          setEquipo([]);
        }
      }
    }

    async function initAuth() {
      try {
        const { data, error } = await withTimeout(supabase.auth.getSession());

        if (error) {
          console.error("Error obteniendo sesión:", error.message);
          await limpiarSesionRota();
          return;
        }

        if (!mounted) return;

        const currentSession = data?.session ?? null;

        if (currentSession?.user?.id) {
          const { data: perfilData, error: perfilError } = await withTimeout(
            supabase
              .from("profiles")
              .select("*")
              .eq("id", currentSession.user.id)
              .single()
          );

          if (perfilError) {
            console.error("Perfil inválido o inexistente:", perfilError.message);
            await limpiarSesionRota();
            return;
          }

          if (!mounted) return;
          setPerfil(perfilData);
        }

        setSession(currentSession);
      } catch (err) {
        console.error("Error inicializando auth:", err);
        await limpiarSesionRota();
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!mounted) return;

      try {
        if (currentSession?.user?.id) {
          const { data: perfilData, error: perfilError } = await withTimeout(
            supabase
              .from("profiles")
              .select("*")
              .eq("id", currentSession.user.id)
              .single()
          );

          if (perfilError) {
            console.error(
              "Perfil inválido en cambio de sesión:",
              perfilError.message
            );
            await limpiarSesionRota();
            setAuthLoading(false);
            return;
          }

          if (!mounted) return;
          setPerfil(perfilData);
          setSession(currentSession);
        } else {
          setSession(null);
          setPerfil(null);
          setVotantes([]);
          setEquipo([]);
        }
      } catch (err) {
        console.error("Error en onAuthStateChange:", err);
        await limpiarSesionRota();
      } finally {
        if (mounted) setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function cargarTodo() {
      if (!session?.user?.id) {
        if (!cancelled) {
          setVotantes([]);
          setEquipo([]);
          setDataLoading(false);
        }
        return;
      }

      if (!cancelled) setDataLoading(true);

      try {
        await Promise.allSettled([cargarVotantes(), cargarEquipo()]);
      } catch (err) {
        console.error("Error cargando datos:", err);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    cargarTodo();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  async function login(email, password) {
    setLoginLoading(true);

    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        })
      );

      if (error) {
        alert("Error de inicio de sesión: " + error.message);
      }
    } catch (err) {
      alert("Error de inicio de sesión: " + String(err.message || err));
    } finally {
      setLoginLoading(false);
    }
  }

  async function logout() {
    try {
      const { error } = await withTimeout(
        supabase.auth.signOut({ scope: "local" })
      );

      if (error) {
        alert("Error cerrando sesión: " + error.message);
        return;
      }

      setSession(null);
      setPerfil(null);
      setVotantes([]);
      setEquipo([]);
    } catch (err) {
      alert("Error cerrando sesión: " + String(err.message || err));
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

  function seleccionarMiembroEquipo(id) {
    const miembro = equipo.find((m) => String(m.id) === String(id));
    setForm((prev) => ({
      ...prev,
      por_parte_de_id: id,
      por_parte_de_nombre: miembro?.nombre || "",
    }));
  }

  async function guardarVotante(e) {
    e.preventDefault();
    setGuardando(true);

    try {
      if (!form.por_parte_de_id) {
        alert("Debes seleccionar quién consiguió este futuro votante.");
        return;
      }

      const payload = {
        nombre: form.nombre,
        apellido: form.apellido,
        cedula: form.cedula,
        orden: form.orden,
        mesa: form.mesa,
        local_votacion: form.local_votacion,
        seccional: form.seccional,
        barrio: form.barrio,
        por_parte_de_id: form.por_parte_de_id,  
        por_parte_de_nombre: form.por_parte_de_nombre,
      };

      let respuesta;

      if (editandoId) {
        respuesta = await withTimeout(
          supabase.from("votantes").update(payload).eq("id", editandoId)
        );
      } else {
        respuesta = await withTimeout(
          supabase.from("votantes").insert([payload])
        );
      }

      if (respuesta.error) {
        alert("Error guardando futuro votante: " + respuesta.error.message);
        return;
      }

      limpiarFormulario();
      await cargarVotantes();
    } catch (err) {
      alert("Error guardando futuro votante: " + String(err.message || err));
    } finally {
      setGuardando(false);
    }
  }

  function editarVotante(votante) {
    setForm({
      nombre: votante.nombre || "",
      apellido: votante.apellido || "",
      cedula: votante.cedula || "",
      orden: votante.orden || "",
      mesa: votante.mesa || "",
      local_votacion: votante.local_votacion || "",
      seccional: votante.seccional || "",
      barrio: votante.barrio || "",
      por_parte_de_id: votante.por_parte_de_id || "",
      por_parte_de_nombre: votante.por_parte_de_nombre || "",
    });
    setEditandoId(votante.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminarVotante(id) {
    const confirmar = window.confirm(
      "¿Seguro que querés eliminar este futuro votante?"
    );
    if (!confirmar) return;

    try {
      const { error } = await withTimeout(
        supabase.from("votantes").delete().eq("id", id)
      );

      if (error) {
        alert("Error eliminando futuro votante: " + error.message);
        return;
      }

      if (editandoId === id) limpiarFormulario();
      await cargarVotantes();
    } catch (err) {
      alert("Error eliminando futuro votante: " + String(err.message || err));
    }
  }

  async function guardarMiembro(e) {
    e.preventDefault();
    setGuardandoEquipo(true);

    try {
      let respuesta;

      if (editandoEquipoId) {
        respuesta = await withTimeout(
          supabase.from("equipo").update(formEquipo).eq("id", editandoEquipoId)
        );
      } else {
        respuesta = await withTimeout(
          supabase.from("equipo").insert([formEquipo])
        );
      }

      if (respuesta.error) {
        alert("Error guardando miembro del equipo: " + respuesta.error.message);
        return;
      }

      limpiarFormularioEquipo();
      await cargarEquipo();
    } catch (err) {
      alert(
        "Error guardando miembro del equipo: " + String(err.message || err)
      );
    } finally {
      setGuardandoEquipo(false);
    }
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
    const confirmar = window.confirm(
      "¿Seguro que querés eliminar este miembro del equipo?"
    );
    if (!confirmar) return;

    try {
      const { error } = await withTimeout(
        supabase.from("equipo").delete().eq("id", id)
      );

      if (error) {
        alert("Error eliminando miembro: " + error.message);
        return;
      }

      if (editandoEquipoId === id) limpiarFormularioEquipo();
      await cargarEquipo();
    } catch (err) {
      alert("Error eliminando miembro: " + String(err.message || err));
    }
  }

  function normalizarNombreHoja(nombre) {
    const limpio = (nombre || "Sin nombre")
      .replace(/[\\\/\?\*\[\]\:]/g, "")
      .trim();

    return limpio.slice(0, 31) || "Sin nombre";
  }

function construirFilasExcel(lista) {
  return lista.map((v, index) => ({
    Nro: index + 1,
    Nombre: v.nombre || "",
    Apellido: v.apellido || "",
    Cédula: v.cedula || "",
    Orden: v.orden || "",
    Mesa: v.mesa || "",
    "Local de votación": v.local_votacion || "",
    Seccional: v.seccional || "",
    Barrio: v.barrio || "",
    "Por parte de": v.por_parte_de_nombre || "",
  }));
}

  function exportarExcel() {
    const libro = XLSX.utils.book_new();

  const encabezadosBase = [
    {
        Nro: "",
        Nombre: "",
        Apellido: "",
        Cédula: "",
        Orden: "",
        Mesa: "",
        "Local de votación": "",
        Seccional: "",
        Barrio: "",
        "Por parte de": "",
    },
  ];

    const todosOrdenados = [...votantes].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    const hojaGeneralData =
      todosOrdenados.length > 0
        ? construirFilasExcel(todosOrdenados)
        : encabezadosBase;

    const hojaGeneral = XLSX.utils.json_to_sheet(hojaGeneralData);
      hojaGeneral["!cols"] = [
        { wch: 8 },
        { wch: 18 },
        { wch: 18 },
        { wch: 16 },
        { wch: 10 },
        { wch: 10 },
        { wch: 24 },
        { wch: 16 },
        { wch: 18 },
        { wch: 20 },
      ];
    XLSX.utils.book_append_sheet(libro, hojaGeneral, "General");

    equipo.forEach((miembro) => {
      const votantesDeEseMiembro = todosOrdenados.filter(
        (v) => String(v.por_parte_de_id) === String(miembro.id)
      );

      const dataHoja =
        votantesDeEseMiembro.length > 0
          ? construirFilasExcel(votantesDeEseMiembro)
          : encabezadosBase;

      const hojaMiembro = XLSX.utils.json_to_sheet(dataHoja);
      hojaMiembro["!cols"] = [
        { wch: 8 },
        { wch: 18 },
        { wch: 18 },
        { wch: 16 },
        { wch: 10 },
        { wch: 10 },
        { wch: 24 },
        { wch: 16 },
        { wch: 18 },
        { wch: 20 },
      ];

      XLSX.utils.book_append_sheet(
        libro,
        hojaMiembro,
        normalizarNombreHoja(miembro.nombre)
      );
    });

    XLSX.writeFile(libro, "futuros_votantes_presidente_franco.xlsx");
  }

  const stats = useMemo(() => {
    return {
      total: votantes.length,
      equipo: equipo.length,
      conCedula: votantes.filter((v) => (v.cedula || "").trim() !== "").length,
      sinAsignar: votantes.filter((v) => !(v.por_parte_de_id || "").trim())
        .length,
    };
  }, [votantes, equipo]);

  const votantesFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    if (!texto) return votantes;

    return votantes.filter((v) => {
      return (
        (v.nombre || "").toLowerCase().includes(texto) ||
        (v.apellido || "").toLowerCase().includes(texto) ||
        (v.cedula || "").toLowerCase().includes(texto) ||
        (v.local_votacion || "").toLowerCase().includes(texto) ||
        (v.seccional || "").toLowerCase().includes(texto) ||
        (v.barrio || "").toLowerCase().includes(texto) ||
        (v.por_parte_de_nombre || "").toLowerCase().includes(texto)
      );
    });
  }, [votantes, busqueda]);

  const conteoPorEquipo = useMemo(() => {
    const acumulado = {};

    equipo.forEach((m) => {
      acumulado[m.id] = {
        nombre: m.nombre,
        total: 0,
      };
    });

    votantes.forEach((v) => {
      const id = v.por_parte_de_id || "sin_asignar";
      if (!acumulado[id]) {
        acumulado[id] = {
          nombre: v.por_parte_de_nombre || "Sin asignar",
          total: 0,
        };
      }
      acumulado[id].total += 1;
    });

    return Object.values(acumulado).sort((a, b) => b.total - a.total);
  }, [votantes, equipo]);

  const conteoBarrios = useMemo(() => {
    const acumulado = {};

    votantes.forEach((v) => {
      const barrio = (v.barrio || "Sin barrio").trim();

      if (!acumulado[barrio]) {
        acumulado[barrio] = {
          barrio,
          total: 0,
        };
      }

      acumulado[barrio].total += 1;
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
          {dataLoading && (
            <p className="small" style={{ marginTop: 6 }}>
              Actualizando datos...
            </p>
          )}
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
          <div className="small">Total futuros votantes</div>
          <h2>{stats.total}</h2>
        </div>
        <div className="stat">
          <div className="small">Miembros del equipo</div>
          <h2>{stats.equipo}</h2>
        </div>
        <div className="stat">
          <div className="small">Con cédula</div>
          <h2>{stats.conCedula}</h2>
        </div>
        <div className="stat">
          <div className="small">Sin asignar</div>
          <h2>{stats.sinAsignar}</h2>
        </div>
      </div>

      <div style={layoutGrid}>
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
            <h2 style={{ margin: 0, fontSize: isMobile ? 28 : 22 }}>
              Conteo de futuros votantes por miembro del equipo
            </h2>

            <button
              type="button"
              onClick={exportarExcel}
              style={{ width: "auto", padding: "10px 16px" }}
            >
              Exportar Excel
            </button>
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {conteoPorEquipo.map((item) => {
              const total = stats.total || 1;
              const porcentaje = Math.round((item.total / total) * 100);

              return (
                <div key={item.nombre}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                      fontSize: 14,
                    }}
                  >
                    <span>{item.nombre}</span>
                    <span>
                      {item.total} ({porcentaje}%)
                    </span>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: 12,
                      background: "#e5e7eb",
                      borderRadius: 999,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${porcentaje}%`,
                        height: "100%",
                        background: "#2563eb",
                        borderRadius: 999,
                        transition: "0.3s",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <h2 style={{ marginTop: 0, fontSize: isMobile ? 28 : 22 }}>
            Conteo por barrio
          </h2>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Barrio</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {conteoBarrios.map((item) => (
                  <tr key={item.barrio}>
                    <td>{item.barrio}</td>
                    <td>{item.total}</td>
                  </tr>
                ))}
                {conteoBarrios.length === 0 && (
                  <tr>
                    <td colSpan="2">Todavía no hay datos de barrio cargados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={layoutGrid}>
        <div className="card">
          <h2>{editandoId ? "Editar futuro votante" : "Cargar futuros votantes"}</h2>

          <form className="form" onSubmit={guardarVotante}>
            <input
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
              style={{ fontSize: isMobile ? 18 : 16 }}
            />

            <input
              placeholder="Apellido"
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
              required
              style={{ fontSize: isMobile ? 18 : 16 }}
            />

            <input
              placeholder="Cédula"
              value={form.cedula}
              onChange={(e) => setForm({ ...form, cedula: e.target.value })}
              style={{ fontSize: isMobile ? 18 : 16 }}
            />

            <input
              placeholder="Orden"
              value={form.orden}
              onChange={(e) => setForm({ ...form, orden: e.target.value })}
              style={{ fontSize: isMobile ? 18 : 16 }}
            />

            <input
              placeholder="Mesa"
              value={form.mesa}
              onChange={(e) => setForm({ ...form, mesa: e.target.value })}
              style={{ fontSize: isMobile ? 18 : 16 }}
            />

            <input
              placeholder="Local de votación"
              value={form.local_votacion}
              onChange={(e) =>
                setForm({ ...form, local_votacion: e.target.value })
              }
              style={{ fontSize: isMobile ? 18 : 16 }}
            />

            <input
              placeholder="Seccional"
              value={form.seccional}
              onChange={(e) => setForm({ ...form, seccional: e.target.value })}
              style={{ fontSize: isMobile ? 18 : 16 }}
            />

            <input
              placeholder="Barrio"
              value={form.barrio}
              onChange={(e) => setForm({ ...form, barrio: e.target.value })}
              style={{ fontSize: isMobile ? 18 : 16 }}
            />

            <select
              value={form.por_parte_de_id}
              onChange={(e) => seleccionarMiembroEquipo(e.target.value)}
              required
              style={{ fontSize: isMobile ? 18 : 16 }}
            >
              <option value="">Seleccionar miembro del equipo</option>
              {equipo.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="submit" style={{ flex: 1 }}>
                {guardando
                  ? "Guardando..."
                  : editandoId
                  ? "Actualizar futuro votante"
                  : "Guardar futuro votante"}
              </button>

              {editandoId && (
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  style={{ flex: 1, background: "#6b7280" }}
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="card">
          <h2>Lista de futuros votantes</h2>

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
              placeholder="Buscar por nombre, apellido, cédula, local o equipo"
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
                  <th>Apellido</th>
                  <th>Cédula</th>
                  <th>Mesa</th>
                  <th>Local</th>
                  <th>Barrio</th>
                  <th>Por parte de</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {votantesFiltrados.map((v) => (
                  <tr key={v.id}>
                    <td>{v.nombre || "-"}</td>
                    <td>{v.apellido || "-"}</td>
                    <td>{v.cedula || "-"}</td>
                    <td>{v.mesa || "-"}</td>
                    <td>{v.local_votacion || "-"}</td>
                    <td>{v.barrio || "-"}</td>
                    <td>{v.por_parte_de_nombre || "-"}</td>
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
                    <td colSpan="8">
                      {busqueda
                        ? "No se encontraron futuros votantes con esa búsqueda."
                        : "Todavía no hay futuros votantes cargados."}
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
          <h2>{editandoEquipoId ? "Editar usuario del equipo" : "Equipo de campaña"}</h2>

          <form className="form" onSubmit={guardarMiembro}>
            <input
              placeholder="Nombre del miembro"
              value={formEquipo.nombre}
              onChange={(e) =>
                setFormEquipo({ ...formEquipo, nombre: e.target.value })
              }
              required
            />
            <input
              placeholder="Teléfono"
              value={formEquipo.telefono}
              onChange={(e) =>
                setFormEquipo({ ...formEquipo, telefono: e.target.value })
              }
            />
            <input
              placeholder="Zona o barrio"
              value={formEquipo.zona}
              onChange={(e) =>
                setFormEquipo({ ...formEquipo, zona: e.target.value })
              }
            />
            <select
              value={formEquipo.rol}
              onChange={(e) =>
                setFormEquipo({ ...formEquipo, rol: e.target.value })
              }
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
                  style={{ flex: 1, background: "#6b7280" }}
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
            <div style={{ fontSize: 12, opacity: 0.8 }}>Equipo</div>
            <strong>{stats.equipo}</strong>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Cédula</div>
            <strong>{stats.conCedula}</strong>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Sin asignar</div>
            <strong>{stats.sinAsignar}</strong>
          </div>
        </div>
      )}
    </div>
  );
}