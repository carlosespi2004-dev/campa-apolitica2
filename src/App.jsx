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

  async function guardarVotante(e) {
    e.preventDefault();
    setGuardando(true);

    const { error } = await supabase.from("votantes").insert([form]);

    setGuardando(false);

    if (error) {
      alert("Error guardando votante: " + error.message);
      return;
    }

    setForm(initialForm);
    cargarVotantes();
  }

  const stats = useMemo(() => {
    return {
      total: votantes.length,
      apoya: votantes.filter((v) => v.estado === "apoya").length,
      indeciso: votantes.filter((v) => v.estado === "indeciso").length,
      no_apoya: votantes.filter((v) => v.estado === "no_apoya").length,
    };
  }, [votantes]);

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

      <div className="grid" style={{ marginTop: 20 }}>
        <div className="card">
          <h2>Cargar votante</h2>
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
            <button type="submit">
              {guardando ? "Guardando..." : "Guardar votante"}
            </button>
          </form>
        </div>

        <div className="card">
          <h2>Lista de votantes</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Barrio</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {votantes.map((v) => (
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
                  </tr>
                ))}
                {votantes.length === 0 && (
                  <tr>
                    <td colSpan="3">Todavía no hay votantes cargados.</td>
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