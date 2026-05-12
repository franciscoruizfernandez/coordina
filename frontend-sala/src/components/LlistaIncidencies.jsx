import { useState, useMemo } from "react";
import TempsRelatiu from "./TempsRelatiu";

const ordrePrioritat = {
  critica: 1,
  alta: 2,
  mitjana: 3,
  baixa: 4,
};

const COLOR_PRIORITAT = {
  critica: "#DC2626",
  alta: "#F97316",
  mitjana: "#FBBF24",
  baixa: "#10B981",
};

const COLOR_FONS_PRIORITAT = {
  critica: "bg-red-50",
  alta: "bg-orange-50",
  mitjana: "bg-yellow-50",
  baixa: "bg-green-50",
};

const ETIQUETA_PRIORITAT = {
  critica: { bg: "bg-red-100 text-red-800", text: "Crítica" },
  alta: { bg: "bg-orange-100 text-orange-800", text: "Alta" },
  mitjana: { bg: "bg-yellow-100 text-yellow-800", text: "Mitjana" },
  baixa: { bg: "bg-green-100 text-green-800", text: "Baixa" },
};

function LlistaIncidencies({ incidencies, onSeleccionar }) {
  const [filtreEstat, setFiltreEstat] = useState("totes");
  const [filtrePrioritat, setFiltrePrioritat] = useState("totes");
  const [cerca, setCerca] = useState("");

  const incidenciesFiltrades = useMemo(() => {
    let resultat = [...incidencies];

    if (filtreEstat !== "totes") {
      resultat = resultat.filter((inc) => inc.estat === filtreEstat);
    }

    if (filtrePrioritat !== "totes") {
      resultat = resultat.filter((inc) => inc.prioritat === filtrePrioritat);
    }

    if (cerca.trim() !== "") {
      resultat = resultat.filter(
        (inc) =>
          inc.tipologia?.toLowerCase().includes(cerca.toLowerCase()) ||
          inc.descripcio?.toLowerCase().includes(cerca.toLowerCase())
      );
    }

    resultat.sort((a, b) => {
      if (ordrePrioritat[a.prioritat] !== ordrePrioritat[b.prioritat]) {
        return ordrePrioritat[a.prioritat] - ordrePrioritat[b.prioritat];
      }
      return new Date(b.timestamp_recepcio) - new Date(a.timestamp_recepcio);
    });

    return resultat;
  }, [incidencies, filtreEstat, filtrePrioritat, cerca]);

  const handleKeyDown = (e, inc) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSeleccionar(inc);
    }
  };

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Llista d'incidències">

      {/* ═══ CAPÇALERA FIXA ═══ */}
      <div className="flex-shrink-0 p-4 pb-3 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold mb-3">
          Incidències actives
          <span className="ml-2 text-sm font-normal text-gray-400">
            ({incidenciesFiltrades.length})
          </span>
        </h2>

        {/* Cerca */}
        <label htmlFor="cerca-incidencies" className="sr-only">
          Cerca per tipologia o descripció
        </label>
        <input
          id="cerca-incidencies"
          type="text"
          placeholder="Cerca per tipologia o descripció..."
          className="w-full border border-gray-300 p-2 rounded-lg text-sm
                     focus:border-blue-500 focus:outline-none focus:ring-1
                     focus:ring-blue-500 transition-colors mb-3"
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
        />

        {/* Filtres */}
        <div className="flex gap-2 text-xs">
          <label htmlFor="filtre-estat" className="sr-only">Filtrar per estat</label>
          <select
            id="filtre-estat"
            className="border border-gray-300 p-1.5 rounded-lg focus:border-blue-500
                       focus:outline-none transition-colors flex-1"
            value={filtreEstat}
            onChange={(e) => setFiltreEstat(e.target.value)}
            aria-label="Filtrar per estat"
          >
            <option value="totes">Totes</option>
            <option value="nova">Nova</option>
            <option value="assignada">Assignada</option>
            <option value="en_curs">En curs</option>
            <option value="resolta">Resolta</option>
          </select>

          <label htmlFor="filtre-prioritat" className="sr-only">Filtrar per prioritat</label>
          <select
            id="filtre-prioritat"
            className="border border-gray-300 p-1.5 rounded-lg focus:border-blue-500
                       focus:outline-none transition-colors flex-1"
            value={filtrePrioritat}
            onChange={(e) => setFiltrePrioritat(e.target.value)}
            aria-label="Filtrar per prioritat"
          >
            <option value="totes">Prioritat</option>
            <option value="critica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="mitjana">Mitjana</option>
            <option value="baixa">Baixa</option>
          </select>
        </div>
      </div>

      {/* ═══ LLISTA AMB SCROLL ═══ */}
      <div className="flex-1 overflow-y-auto p-4 pt-3" role="list" aria-label="Incidències filtrades">

        {incidenciesFiltrades.length === 0 && (
          <div className="text-center py-8 text-gray-400 animar-fade" role="status">
            <p className="text-2xl mb-2" aria-hidden="true">📭</p>
            <p className="text-sm">No hi ha incidències amb aquests filtres</p>
          </div>
        )}

        <div className="space-y-2">
          {incidenciesFiltrades.map((inc, index) => {
            const prioritatConf = ETIQUETA_PRIORITAT[inc.prioritat] || ETIQUETA_PRIORITAT.baixa;

            return (
              <div
                key={inc.id}
                role="listitem"
                tabIndex={0}
                onClick={() => onSeleccionar(inc)}
                onKeyDown={(e) => handleKeyDown(e, inc)}
                className={`p-3 rounded-lg shadow-sm cursor-pointer border-l-4
                           hover:shadow-md hover:translate-x-0.5
                           transition-all duration-200 ease-out
                           animar-entrada
                           ${COLOR_FONS_PRIORITAT[inc.prioritat] || 'bg-white'}`}
                style={{
                  borderLeftColor: COLOR_PRIORITAT[inc.prioritat] || "#6B7280",
                  animationDelay: `${Math.min(index * 30, 300)}ms`,
                  animationFillMode: 'both',
                }}
                aria-label={`Incidència ${inc.tipologia}, prioritat ${inc.prioritat}, estat ${inc.estat}`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-sm text-gray-800 capitalize">
                    {inc.tipologia}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${prioritatConf.bg}`}>
                    {prioritatConf.text}
                  </span>
                </div>

                {inc.direccio && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    <span aria-hidden="true">📍 </span>
                    {inc.direccio}
                  </p>
                )}

                <div className="flex items-center justify-between mt-1.5">
                  <TempsRelatiu
                    timestamp={inc.timestamp_recepcio}
                    className="text-xs text-gray-400"
                  />
                  <span className="text-xs text-gray-400">
                    {inc.estat}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

export default LlistaIncidencies;