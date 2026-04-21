import { memo } from "react";
import { MapContainer, TileLayer, ScaleControl, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function Mapa() {
  const centre = [41.60, 2.30];
  const zoomInicial = 11;

  return (
    <MapContainer
      center={centre}
      zoom={zoomInicial}
      style={{ height: "calc(100vh - 64px)", width: "100%" }}
      zoomControl={false}
      scrollWheelZoom={true}
      doubleClickZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={18}
        minZoom={11}
      />

      <ZoomControl position="topright" />
      <ScaleControl position="bottomleft" imperial={false} />
    </MapContainer>
  );
}

// ✅ Optimització: No re-renderitzar si no canvien els props
export default memo(Mapa);
/*calc(100vh - 64px)*/