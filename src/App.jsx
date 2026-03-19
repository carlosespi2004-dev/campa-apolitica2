import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

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

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [votantes, setVotantes] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  async function cargarVotantes() {
    const { data, error } = await supabase
      .from("votantes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Error cargando votantes: " + error.message);
      return;
    }

    setVotantes(data || []);
  }

  useEffect(() => {
    cargarVotantes();
  }, []);

  function limpiarFormulario() {
    setForm(initialForm);
    setEditandoId(null);
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

    if (editandoId === id) {
      limpiarFormulario();
    }

    cargarVotantes();
  }

  function exportarCSV() {
    if (votantesFiltrados.length === 0) {
      alert("No hay votantes para exportar.");
      return;
    }

    const encabezados = [
      "Nombre",
      "Telefono",
      "Barrio",
      "Direccion",
      "Estado",
      "Observacion",
      "Fecha",
    ];

    const filas = votantesFiltrados.map((v) => [
      v.nombre || "",
      v.telefono || "",
      v.barrio || "",
      v.direccion || "",
      v.estado || "",
      v.observacion || "",
      v.created_at ? new Date(v.created_at).toLocaleString() : "",
    ]);

    const csv = [
      encabezados.join(","),
      ...filas.map((fila) =>
        fila
          .map((valor) => `"${String(valor).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "votantes_presidente_franco.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  return (
    <div className="container">
      <h1>Campaña Política · Presidente Franco</h1>
      <p className="small">Registro de votantes conectado con Supabase.</p>

      <div className="stats">
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

      <div
        className="card"
        style={{ marginTop: 20 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ margin: 0 }}>Gráfico de apoyos</h2>
          <button
            type="button"
            onClick={exportarCSV}
            style={{ width: "auto", padding: "10px 16px" }}
          >
            Exportar CSV
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

      <div className="grid" style={{ marginTop: 20 }}>
        <div className="card">
          <h2>{editandoId ? "Editar votante" : "Cargar votante"}</h2>

          <form className="form" onSubmit={guardarVotante}>
            <input
              placeholder="Nombre completo"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
            <input
              placeholder="Teléfono"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
            <input
              placeholder="Barrio"
              value={form.barrio}
              onChange={(e) => setForm({ ...form, barrio: e.target.value })}
            />
            <input
              placeholder="Dirección"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />
            <select
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
            >
              <option value="apoya">Apoya</option>
              <option value="indeciso">Indeciso</option>
              <option value="no_apoya">No apoya</option>
            </select>
            <textarea
              placeholder="Observación"
              value={form.observacion}
              onChange={(e) => setForm({ ...form, observacion: e.target.value })}
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
    </div>
  );
}