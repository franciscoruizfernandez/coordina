// frontend-patrulles/src/utils/ruta.js

// ─── URLs de OSRM ───────────────────────────────────────────
// La URL pública oficial bloqueja peticions des de localhost.
// Fem servir la URL de demo que permet CORS en desenvolupament.
const OSRM_URL = 'https://routing.openstreetmap.de/routed-car/route/v1/driving'

export async function obtenirRuta(latOrigen, lonOrigen, latDesti, lonDesti) {
  if (latOrigen == null || lonOrigen == null || latDesti == null || lonDesti == null) {
    return null
  }

  try {
    // OSRM espera les coordenades en format lon,lat
    const url =
      `${OSRM_URL}/${lonOrigen},${latOrigen};${lonDesti},${latDesti}` +
      `?overview=false&steps=false`

    const response = await fetch(url)

    if (!response.ok) {
      console.error('❌ OSRM ha retornat error:', response.status)
      return null
    }

    const data = await response.json()

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.error('❌ OSRM no ha trobat ruta:', data.code)
      return null
    }

    const ruta = data.routes[0]
    const distanciaKm = ruta.distance / 1000
    const tempsMinuts = ruta.duration / 60

    return {
      distancia_km: distanciaKm,
      distancia_text: formatarDistancia(distanciaKm),
      temps_minuts: tempsMinuts,
      temps_text: formatarTemps(tempsMinuts),
    }
  } catch (error) {
    console.error('❌ Error cridant OSRM:', error.message)
    return null
  }
}

function formatarDistancia(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

function formatarTemps(minuts) {
  if (minuts < 1) return '< 1 min'
  if (minuts < 60) return `${Math.round(minuts)} min`
  const hores = Math.floor(minuts / 60)
  const minutsRestants = Math.round(minuts % 60)
  return `${hores}h ${minutsRestants}min`
}