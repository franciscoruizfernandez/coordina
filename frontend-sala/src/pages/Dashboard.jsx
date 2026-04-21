import { useEffect, useState } from "react";
import { getIncidencies } from "../services/api";

function Dashboard() {
  const [incidencies, setIncidencies] = useState([]);

  useEffect(() => {
    async function carregar() {
      try {
        const data = await getIncidencies();
        setIncidencies(data.incidencies || []);
      } catch (error) {
        console.error("Error carregant incidències:", error);
      }
    }

    carregar();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl mb-4">Incidències</h2>
      <pre>{JSON.stringify(incidencies, null, 2)}</pre>
    </div>
  );
}

export default Dashboard;