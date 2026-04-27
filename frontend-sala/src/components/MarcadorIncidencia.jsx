import { Marker, Popup } from "react-leaflet";
import L from "leaflet";

const obtenirColorPrioritat = (prioritat) => {
  switch (prioritat) {
    case "critica": return "#DC2626";
    case "alta": return "#F97316";
    case "mitjana": return "#FBBF24";
    case "baixa": return "#10B981";
    default: return "#6B7280";
  }
};

const crearIcona = (prioritat) => {
  const color = obtenirColorPrioritat(prioritat);

  return L.divIcon({
    className: "",
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 16px;
      ">⚠</div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
};

function MarcadorIncidencia({ incidencia, onSeleccionar }) {
  const posicio = [incidencia.ubicacio_lat, incidencia.ubicacio_lon];
  const icona = crearIcona(incidencia.prioritat);

  return (
    <Marker position={posicio} icon={icona}>
      <Popup>
        <div className="p-2 min-w-[200px]">
          <h3 className="font-semibold text-sm mb-2">
            {incidencia.tipologia?.toUpperCase()}
          </h3>

          <div className="text-xs space-y-1 mb-3">
            <p>
              <strong>Prioritat:</strong>{" "}
              <span
                className="px-2 py-0.5 rounded text-white"
                style={{ backgroundColor: obtenirColorPrioritat(incidencia.prioritat) }}
              >
                {incidencia.prioritat}
              </span>
            </p>

            <p><strong>Estat:</strong> {incidencia.estat}</p>

            {incidencia.direccio && (
              <p><strong>Ubicació:</strong> {incidencia.direccio}</p>
            )}

            <p className="text-gray-500 text-[10px]">
              {new Date(incidencia.timestamp_recepcio).toLocaleString("ca-ES")}
            </p>
          </div>

          {onSeleccionar && (
            <button
              onClick={() => onSeleccionar(incidencia)}
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

export default MarcadorIncidencia;