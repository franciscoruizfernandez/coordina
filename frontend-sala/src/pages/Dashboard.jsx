import { useState, useEffect } from "react";
import Mapa from "../components/Mapa";
import { getIncidencies } from "../services/api";

function Dashboard() {
  const [incidencies, setIncidencies] = useState([]);
  const [incidenciaSeleccionada, setIncidenciaSeleccionada] = useState(null);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Carregar incidències a l'iniciar
  useEffect(() => {
    async function carregar() {
      try {
        setCarregant(true);
        const data = await getIncidencies();
        
        // L'API retorna { incidencies: [...], paginacio: {...} }
        setIncidencies(data.incidencies || []);
        setError(null);
      } catch (err) {
        console.error("Error carregant incidències:", err);
        setError("No s'han pogut carregar les incidències");
      } finally {
        setCarregant(false);
      }
    }

    carregar();
  }, []);

  const handleSeleccionarIncidencia = (incidencia) => {
    setIncidenciaSeleccionada(incidencia);
    console.log("Incidència seleccionada:", incidencia);
    // ✅ Més endavant obrirà el panell de detalls
  };

  if (carregant) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregant incidències...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Mapa
        incidencies={incidencies}
        onSeleccionarIncidencia={handleSeleccionarIncidencia}
      />

      {/* ✅ Debug temporal */}
      {incidenciaSeleccionada && (
        <div
          style={{
            position: "fixed",
            top: "80px",
            left: "20px",
            backgroundColor: "white",
            padding: "16px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            zIndex: 1000,
            maxWidth: "300px",
          }}
        >
          <h3 className="font-semibold mb-2">Incidència seleccionada:</h3>
          <p className="text-sm">{incidenciaSeleccionada.tipologia}</p>
          <p className="text-xs text-gray-600">{incidenciaSeleccionada.direccio}</p>
          <button
            onClick={() => setIncidenciaSeleccionada(null)}
            className="mt-2 text-xs bg-red-500 text-white px-3 py-1 rounded"
          >
            Tancar
          </button>
        </div>
      )}
    </div>
  );
}

export default Dashboard;