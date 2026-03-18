import { useEffect, useState } from "react";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function App() {
  const [resultado, setResultado] = useState("Probando conexión...");
  const [detalle, setDetalle] = useState("");

  useEffect(() => {
    async function probar() {
      try {
        if (!supabaseUrl) {
          setResultado("Falta VITE_SUPABASE_URL");
          return;
        }

        if (!supabaseKey) {
          setResultado("Falta VITE_SUPABASE_ANON_KEY");
          return;
        }

        const res = await fetch(`${supabaseUrl}/rest/v1/votantes?select=*`, {
          method: "GET",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
        });

        const texto = await res.text();

        setResultado(`HTTP ${res.status} ${res.statusText}`);
        setDetalle(texto);
      } catch (error) {
        setResultado("Error real detectado");
        setDetalle(String(error));
      }
    }

    probar();
  }, []);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: 30 }}>
      <h1>Diagnóstico Supabase</h1>

      <p><strong>URL detectada:</strong> {supabaseUrl || "NO DEFINIDA"}</p>
      <p>
        <strong>Key detectada:</strong>{" "}
        {supabaseKey ? `${String(supabaseKey).slice(0, 20)}...` : "NO DEFINIDA"}
      </p>

      <hr />

      <h2>Resultado</h2>
      <p>{resultado}</p>

      <h2>Detalle</h2>
      <pre
        style={{
          background: "#f4f4f4",
          padding: 16,
          borderRadius: 10,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {detalle}
      </pre>
    </div>
  );
}