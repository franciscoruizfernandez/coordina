// frontend-patrulles/src/utils/ruta.js

// ─── OSRM (Open Source Routing Machine) ─────────────────────
// API pública i gratuïta de routing. No necessita API key.
// Retorna distància real per carretera i temps de conducció.
// Documentació: http://project-osrm.org/docs/v5.24.0/api/
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving'

// ─── Obtenir ruta entre dos punts ───────────────────────────
// Retorna: { distancia_km, distancia_text, temps_minuts, temps_text }
// o null si no es pot calcular
export async function obtenirRuta(latOrigen, lonOrigen, latDesti, lonDesti) {
  // Validar que tenim totes les coordenades
  if (latOrigen == null || lonOrigen == null || latDesti == null || lonDesti == null) {
    return null
  }

  try {
    // OSRM espera les coordenades en format lon,lat (al revés del habitual)
    const url = `${OSRM_BASE_URL}/${lonOrigen},${latOrigen};${lonDesti},${latDesti}?overview=false`

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

    // ruta.distance ve en metres
    // ruta.duration ve en segons
    const distanciaKm = ruta.distance / 1000
    const tempsMinuts = ruta.duration / 60

    return {
      distancia_km: distanciaKm,
      distancia_text: formatarDistancia(distanciaKm),
      temps_minuts: (tempsMinuts*0.85),
      temps_text: formatarTemps(tempsMinuts),
    }
  } catch (error) {
    console.error('❌ Error cridant OSRM:', error.message)
    return null
  }
}

// ─── Formatar distància per mostrar a la UI ─────────────────
function formatarDistancia(km) {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }
  return `${km.toFixed(1)} km`
}

// ─── Formatar temps per mostrar a la UI ─────────────────────
function formatarTemps(minuts) {
  if (minuts < 1) return '< 1 min'
  if (minuts < 60) return `${Math.round(minuts)} min`

  const hores = Math.floor(minuts / 60)
  const minutsRestants = Math.round(minuts % 60)
  return `${hores}h ${minutsRestants}min`
}