import { Marker, Popup, Tooltip } from "react-leaflet";
import { useRef } from "react";
import L from "leaflet";

const obtenirColorEstat = (estat) => {
  switch (estat) {
    case "disponible":    return "#10B981";
    case "en_servei":     return "#3B82F6";
    case "no_disponible": return "#6B7280";
    case "finalitzat":    return "#374151";
    default:              return "#9CA3AF";
  }
};

const ETIQUETA_ESTAT = {
  disponible:    "Disponible",
  en_servei:     "En servei",
  no_disponible: "No disponible",
  finalitzat:    "Finalitzat",
};

const ETIQUETA_TIPUS = {
  cotxe: "🚔 Cotxe",
  moto:  "🏍️ Moto",
  furgo: "🚐 Furgó",
};

const crearIconaIndicatiu = (estat, seleccionat = false) => {
  const color = obtenirColorEstat(estat);
  const mida = seleccionat ? 32 : 22;
  const borde = seleccionat ? 3 : 2;

  return L.divIcon({
    className: "",
    html: `
      <div style="
        background-color: ${color};
        width: ${mida}px;
        height: ${mida}px;
        border-radius: 50%;
        border: ${borde}px solid white;
        box-shadow: ${seleccionat
          ? `0 0 0 3px ${color}, 0 0 12px rgba(0,0,0,0.5)`
          : "0 0 6px rgba(0,0,0,0.4)"
        };
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${seleccionat ? "13px" : "10px"};
        color: white;
        font-weight: bold;
      ">🚔</div>
    `,
    iconSize: [mida, mida],
    iconAnchor: [mida / 2, mida / 2],
    popupAnchor: [0, -(mida / 2)],
  });
};

function MarcadorIndicatiu({ indicatiu, onSeleccionar, seleccionat = false }) {
  const markerRef = useRef(null);

  if (indicatiu.ubicacio_lat == null || indicatiu.ubicacio_lon == null) return null;

  const posicio = [
    parseFloat(indicatiu.ubicacio_lat),
    parseFloat(indicatiu.ubicacio_lon),
  ];

  const icona = crearIconaIndicatiu(indicatiu.estat_operatiu, seleccionat);
  const color = obtenirColorEstat(indicatiu.estat_operatiu);

  const handleVeureDetalls = () => {
    markerRef.current?.closePopup();
    onSeleccionar?.(indicatiu);
  };

  return (
    <Marker
      ref={markerRef}
      position={posicio}
      icon={icona}
    >
      <Tooltip direction="top" offset={[0, -10]}>
        <span className="font-bold">{indicatiu.codi}</span>
      </Tooltip>

      <Popup>
        <div className="p-2 min-w-[180px]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🚔</span>
            <h3 className="font-bold text-gray-800">{indicatiu.codi}</h3>
          </div>

          <div className="text-xs space-y-1 mb-3">
            <p>
              <strong>Estat:</strong>{" "}
              <span
                className="px-2 py-0.5 rounded text-white text-xs"
                style={{ backgroundColor: color }}
              >
                {ETIQUETA_ESTAT[indicatiu.estat_operatiu] || indicatiu.estat_operatiu}
              </span>
            </p>
            {indicatiu.tipus_unitat && (
              <p>
                <strong>Tipus:</strong>{" "}
                {ETIQUETA_TIPUS[indicatiu.tipus_unitat] || indicatiu.tipus_unitat}
              </p>
            )}
            {indicatiu.sector_assignat && (
              <p>
                <strong>Sector:</strong> {indicatiu.sector_assignat}
              </p>
            )}
          </div>

          {onSeleccionar && (
            <button
              onClick={handleVeureDetalls}
              className="w-full bg-blue-600 text-white py-1 px-2 rounded text-xs hover:bg-blue-700"
            >
              Veure detalls
            </button>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

export default MarcadorIndicatiu;