import { useState, useMemo } from "react";

// ✅ Ordre de prioritat manual
const ordrePrioritat = {
  critica: 1,
  alta: 2,
  mitjana: 3,
  baixa: 4,
};

function LlistaIncidencies({ incidencies, onSeleccionar }) {
  const [filtreEstat, setFiltreEstat] = useState("totes");
  const [filtrePrioritat, setFiltrePrioritat] = useState("totes");
  const [cerca, setCerca] = useState("");

  // ✅ Filtrar i ordenar incidències
  const incidenciesFiltrades = useMemo(() => {
    let resultat = [...incidencies];

    // Filtre estat
    if (filtreEstat !== "totes") {
      resultat = resultat.filter(
        (inc) => inc.estat === filtreEstat
      );
    }

    // Filtre prioritat
    if (filtrePrioritat !== "totes") {
      resultat = resultat.filter(
        (inc) => inc.prioritat === filtrePrioritat
      );
    }

    // Cerca
    if (cerca.trim() !== "") {
      resultat = resultat.filter(
        (inc) =>
          inc.tipologia?.toLowerCase().includes(cerca.toLowerCase()) ||
          inc.descripcio?.toLowerCase().includes(cerca.toLowerCase())
      );
    }

    // Ordenar per prioritat i timestamp
    resultat.sort((a, b) => {
      if (ordrePrioritat[a.prioritat] !== ordrePrioritat[b.prioritat]) {
        return ordrePrioritat[a.prioritat] - ordrePrioritat[b.prioritat];
      }

      return new Date(b.timestamp_recepcio) - new Date(a.timestamp_recepcio);
    });

    return resultat;
  }, [incidencies, filtreEstat, filtrePrioritat, cerca]);

  return (
    <div className="p-4 space-y-4">

      <h2 className="text-lg font-semibold">
        Incidències actives
      </h2>

      {/* ✅ Cerca */}
      <input
        type="text"
        placeholder="Cerca..."
        className="w-full border p-2 rounded"
        value={cerca}
        onChange={(e) => setCerca(e.target.value)}
      />

      {/* ✅ Filtres */}
      <div className="flex gap-2 text-xs">

        <select
          className="border p-1 rounded"
          value={filtreEstat}
          onChange={(e) => setFiltreEstat(e.target.value)}
        >
          <option value="totes">Totes</option>
          <option value="nova">Nova</option>
          <option value="assignada">Assignada</option>
          <option value="en_curs">En curs</option>
          <option value="resolta">Resolta</option>
        </select>

        <select
          className="border p-1 rounded"
          value={filtrePrioritat}
          onChange={(e) => setFiltrePrioritat(e.target.value)}
        >
          <option value="totes">Prioritat</option>
          <option value="critica">Crítica</option>
          <option value="alta">Alta</option>
          <option value="mitjana">Mitjana</option>
          <option value="baixa">Baixa</option>
        </select>

      </div>

      {/* ✅ Llista */}
      <div className="space-y-3">

        {incidenciesFiltrades.map((inc) => (
          <div
            key={inc.id}
            onClick={() => onSeleccionar(inc)}
            className="p-3 rounded shadow cursor-pointer hover:shadow-md border-l-4"
            style={{
              borderLeftColor:
                inc.prioritat === "critica"
                  ? "#DC2626"
                  : inc.prioritat === "alta"
                  ? "#F97316"
                  : inc.prioritat === "mitjana"
                  ? "#FBBF24"
                  : "#10B981",
            }}
          >
            <div className="flex justify-between items-center">
              <span className="font-semibold text-sm">
                {inc.tipologia}
              </span>
              <span className="text-xs">
                {inc.prioritat}
              </span>
            </div>

            <p className="text-xs text-gray-500">
              {new Date(inc.timestamp_recepcio).toLocaleTimeString("ca-ES")}
            </p>
          </div>
        ))}

      </div>
    </div>
  );
}

export default LlistaIncidencies;