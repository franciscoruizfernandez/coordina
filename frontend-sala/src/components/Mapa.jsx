import { MapContainer, TileLayer, ZoomControl, ScaleControl } from "react-leaflet";
import MarcadorIncidencia from "./MarcadorIncidencia";
import "leaflet/dist/leaflet.css";

function Mapa({ incidencies = [], onSeleccionarIncidencia }) {
  const centre = [41.60, 2.30];
  const zoomInicial = 11;

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
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={18}
        minZoom={11}
      />

      <ZoomControl position="topright" />
      <ScaleControl position="bottomleft" imperial={false} />

      {/* ✅ Renderitzar marcadors d'incidències */}
      {incidencies.map((incidencia) => (
        <MarcadorIncidencia
          key={incidencia.id}
          incidencia={incidencia}
          onSeleccionar={onSeleccionarIncidencia}
        />
      ))}
    </MapContainer>
  );
}

export default Mapa;
/*calc(100vh - 64px)*/