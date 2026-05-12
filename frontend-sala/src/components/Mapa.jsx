import {
  MapContainer,
  TileLayer,
  ZoomControl,
  ScaleControl,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import MarcadorIncidencia from "./MarcadorIncidencia";
import MarcadorIndicatiu from "./MarcadorIndicatiu";
import "leaflet/dist/leaflet.css";

// ─── Crear icona personalitzada per als clusters ────────────
const crearIconaCluster = (cluster) => {
  const count = cluster.getChildCount();

  // Determinar mida i color segons el nombre d'incidències
  let mida, color, borderColor, fontSize;

  if (count < 5) {
    mida = 40;
    color = "rgba(59, 130, 246, 0.85)";      // blau
    borderColor = "rgba(59, 130, 246, 0.4)";
    fontSize = 14;
  } else if (count < 15) {
    mida = 48;
    color = "rgba(245, 158, 11, 0.85)";      // taronja
    borderColor = "rgba(245, 158, 11, 0.4)";
    fontSize = 15;
  } else if (count < 30) {
    mida = 54;
    color = "rgba(239, 68, 68, 0.85)";       // vermell
    borderColor = "rgba(239, 68, 68, 0.4)";
    fontSize = 16;
  } else {
    mida = 60;
    color = "rgba(127, 29, 29, 0.9)";        // vermell fosc
    borderColor = "rgba(127, 29, 29, 0.4)";
    fontSize = 17;
  }

  return L.divIcon({
    html: `
      <div style="
        width: ${mida}px;
        height: ${mida}px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: ${color};
        border: 4px solid ${borderColor};
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        color: white;
        font-weight: 700;
        font-size: ${fontSize}px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        line-height: 1;
      ">
        ${count}
      </div>
    `,
    className: "",
    iconSize: L.point(mida, mida),
    iconAnchor: [mida / 2, mida / 2],
  });
};

function Mapa({
  incidencies = [],
  indicatius = [],
  onSeleccionarIncidencia,
  onSeleccionarIndicatiu,
  incidenciaSeleccionada = null,
  indicatiuSeleccionat = null,
}) {
  const centre = [41.60, 2.30];
  const zoomInicial = 10;

  return (
    <MapContainer
      center={centre}
      zoom={zoomInicial}
      style={{ height: "calc(100vh - 64px)", width: "100%" }}
      zoomControl={false}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap"
        maxZoom={18}
        minZoom={10}
      />

      <ZoomControl position="topright" />
      <ScaleControl position="bottomleft" imperial={false} />

      {/* Incidències agrupades amb clustering personalitzat */}
      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={50}
        showCoverageOnHover={false}
        spiderfyOnMaxZoom={true}
        zoomToBoundsOnClick={true}
        iconCreateFunction={crearIconaCluster}
      >
        {incidencies.map((incidencia) => (
          <MarcadorIncidencia
            key={incidencia.id}
            incidencia={incidencia}
            onSeleccionar={onSeleccionarIncidencia}
            seleccionat={incidenciaSeleccionada?.id === incidencia.id}
          />
        ))}
      </MarkerClusterGroup>

      {/* Indicatius sense clustering */}
      {indicatius.map((indicatiu) => (
        <MarcadorIndicatiu
          key={indicatiu.id}
          indicatiu={indicatiu}
          onSeleccionar={onSeleccionarIndicatiu}
          seleccionat={indicatiuSeleccionat?.id === indicatiu.id}
        />
      ))}
    </MapContainer>
  );
}

export default Mapa;