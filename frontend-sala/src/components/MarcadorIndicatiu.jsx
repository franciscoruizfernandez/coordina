import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";

const obtenirColorEstat = (estat) => {
  switch (estat) {
    case "disponible":
      return "#10B981";
    case "en_servei":
      return "#3B82F6";
    case "no_disponible":
      return "#6B7280";
    case "finalitzat":
      return "#374151";
    default:
      return "#9CA3AF";
  }
};

const crearIconaIndicatiu = (estat) => {
  const color = obtenirColorEstat(estat);

  return L.divIcon({
    className: "",
    html: `
      <div style="
        background-color: ${color};
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 6px rgba(0,0,0,0.4);
      "></div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

function MarcadorIndicatiu({ indicatiu }) {
  if (!indicatiu.ubicacio_lat || !indicatiu.ubicacio_lon) return null;

  const posicio = [
    parseFloat(indicatiu.ubicacio_lat),
    parseFloat(indicatiu.ubicacio_lon),
  ];

  const icona = crearIconaIndicatiu(indicatiu.estat_operatiu);

  return (
    <Marker position={posicio} icon={icona}>
      <Tooltip direction="top" offset={[0, -10]}>
        {indicatiu.codi}
      </Tooltip>
    </Marker>
  );
}

export default MarcadorIndicatiu;