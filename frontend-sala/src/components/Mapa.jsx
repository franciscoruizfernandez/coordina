import {
  MapContainer,
  TileLayer,
  ZoomControl,
  ScaleControl,
} from "react-leaflet";
import MarcadorIncidencia from "./MarcadorIncidencia";
import MarcadorIndicatiu from "./MarcadorIndicatiu";
import "leaflet/dist/leaflet.css";

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
        attribution='&copy; OpenStreetMap'
        maxZoom={18}
        minZoom={10}
      />

      <ZoomControl position="topright" />
      <ScaleControl position="bottomleft" imperial={false} />

      {/* Incidències */}
      {incidencies.map((incidencia) => (
        <MarcadorIncidencia
          key={incidencia.id}
          incidencia={incidencia}
          onSeleccionar={onSeleccionarIncidencia}
          seleccionat={incidenciaSeleccionada?.id === incidencia.id}
        />
      ))}

      {/* Indicatius */}
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