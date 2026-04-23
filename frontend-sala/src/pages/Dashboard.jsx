import { useState, useEffect, useContext } from "react";
import Mapa from "../components/Mapa";
import { getIncidencies, getIndicatius } from "../services/api";
import { SocketContext } from "../context/SocketContext";
import LlistaIncidencies from "../components/LlistaIncidencies";

function Dashboard() {
  const { socket } = useContext(SocketContext);

  const [incidencies, setIncidencies] = useState([]);
  const [indicatius, setIndicatius] = useState([]);
  const [incidenciaSeleccionada, setIncidenciaSeleccionada] = useState(null);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState(null);

  // ===============================
  // CÀRREGA INICIAL DE DADES
  // ===============================
  useEffect(() => {
    async function carregar() {
      try {
        setCarregant(true);
        setError(null);

        console.log("📡 Carregant incidències...");
        const dataInc = await getIncidencies();
        console.log("✅ Incidències carregades:", dataInc);

        console.log("📡 Carregant indicatius...");
        const dataInd = await getIndicatius();
        console.log("✅ Indicatius carregats:", dataInd);

        // Ajust segons estructura real del backend
        setIncidencies(dataInc.incidencies || dataInc.dades || []);
        setIndicatius(dataInd.dades || dataInd.indicatius || []);
      } catch (err) {
        console.error("❌ Error carregant dades:", err);
        setError("No s'han pogut carregar les dades");
      } finally {
        setCarregant(false);
      }
    }

    carregar();
  }, []);

  // ===============================
  // WEBSOCKET TEMPS REAL
  // ===============================
  useEffect(() => {
    if (!socket) return;

    console.log("👂 Escoltant events WebSocket...");

    socket.on("nova_incidencia", (data) => {
      console.log("🚨 Nova incidència:", data);
      setIncidencies((prev) => [...prev, data.incidencia]);
    });

    socket.on("ubicacio_indicatiu", (data) => {
      setIndicatius((prev) =>
        prev.map((ind) =>
          ind.id === data.indicatiu.id
            ? { ...ind, ...data.indicatiu }
            : ind
        )
      );
    });

    socket.on("canvi_estat_incidencia", (data) => {
      setIncidencies((prev) =>
        prev.map((inc) =>
          inc.id === data.incidencia_id
            ? { ...inc, estat: data.estat_nou }
            : inc
        )
      );
    });

    socket.on("canvi_estat_indicatiu", (data) => {
      setIndicatius((prev) =>
        prev.map((ind) =>
          ind.id === data.indicatiu_id
            ? { ...ind, estat_operatiu: data.estat_nou }
            : ind
        )
      );
    });

    return () => {
      socket.off("nova_incidencia");
      socket.off("ubicacio_indicatiu");
      socket.off("canvi_estat_incidencia");
      socket.off("canvi_estat_indicatiu");
    };
  }, [socket]);

  // ===============================
  // ESTATS DE CÀRREGA
  // ===============================
  if (carregant) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregant dades...</p>
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

  // ===============================
  // RENDER PRINCIPAL
  // ===============================
    return (
    // ✅ CONTENIDOR PRINCIPAL: Alçada fixa de pantalla, sense scroll global
    <div className="flex h-screen overflow-hidden">
      
      {/* ✅ PANELL ESQUERRE: Alçada completa, scroll intern */}
      <div className="w-80 bg-white border-r border-gray-200 h-full overflow-y-auto">
        <LlistaIncidencies
          incidencies={incidencies}
          onSeleccionar={setIncidenciaSeleccionada}
        />
      </div>

      {/* ✅ MAPA: Ocupa la resta de l'espai, alçada completa */}
      <div className="flex-1 h-full relative">
        <Mapa
          incidencies={incidencies}
          indicatius={indicatius}
          onSeleccionarIncidencia={setIncidenciaSeleccionada}
        />

        {/* ✅ Detall flotant (es queda igual) */}
        {incidenciaSeleccionada && (
          <div
            style={{
              position: "fixed",
              top: "80px",
              right: "20px",
              backgroundColor: "white",
              padding: "16px",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              zIndex: 1000,
              maxWidth: "300px",
            }}
          >
            <h3 className="font-semibold mb-2">
              Incidència seleccionada:
            </h3>
            <p className="text-sm">{incidenciaSeleccionada.tipologia}</p>
            <p className="text-xs text-gray-600">
              {incidenciaSeleccionada.direccio}
            </p>
            <button
              onClick={() => setIncidenciaSeleccionada(null)}
              className="mt-2 text-xs bg-red-500 text-white px-3 py-1 rounded"
            >
              Tancar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;