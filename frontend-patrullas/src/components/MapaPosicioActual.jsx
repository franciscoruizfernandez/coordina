// frontend-patrulles/src/components/MapaPosicioActual.jsx

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'

// ==============================================================
// FIX D'ICONES DE LEAFLET AMB VITE
// ==============================================================
delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// ==============================================================
// COMPONENT INTERN: RECENTRAR EL MAPA QUAN CANVIA LA POSICIÓ
// ==============================================================
function RecentrarMapa({ lat, lon }) {
  const mapa = useMap()

  useEffect(() => {
    if (lat != null && lon != null) {
      mapa.setView([lat, lon], mapa.getZoom(), {
        animate: true,
      })
    }
  }, [lat, lon, mapa])

  return null
}

// ==============================================================
// COMPONENT PRINCIPAL
// ==============================================================
function MapaPosicioActual({ lat, lon, accuracy }) {
  // Si encara no tenim coordenades, mostrem un placeholder
  if (lat == null || lon == null) {
    return (
      <div className="h-48 w-full rounded-2xl bg-gray-700 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-3xl mb-2">🛰️</div>
          <p className="text-gray-300 text-sm font-medium">
            Esperant ubicació GPS...
          </p>
          <p className="text-gray-500 text-xs mt-1">
            El mapa apareixerà quan tinguem coordenades
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-48 w-full rounded-2xl overflow-hidden border border-gray-700">
      <MapContainer
        center={[lat, lon]}
        zoom={15}
        scrollWheelZoom={true}
        dragging={true}
        doubleClickZoom={true}
        zoomControl={true}
        touchZoom={true}
        attributionControl={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />

        {/* Aquest component recentra el mapa quan canvia el GPS */}
        <RecentrarMapa lat={lat} lon={lon} />

        {/* Marcador de la patrulla */}
        <Marker position={[lat, lon]} />

        {/* Cercle de precisió GPS, si tenim accuracy */}
        {accuracy != null && (
          <Circle
            center={[lat, lon]}
            radius={accuracy}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.15,
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}

export default MapaPosicioActual