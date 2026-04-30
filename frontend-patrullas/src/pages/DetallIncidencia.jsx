// frontend-patrulles/src/pages/DetallIncidencia.jsx

import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { AuthContext } from '../context/AuthContext'
import { getIncidencia, getHistorialIncidencia } from '../services/api'
import { obtenirRuta } from '../utils/ruta'
import useEnviarGPS from '../hooks/useEnviarGPS'

// ─── Fix per les icones de Leaflet amb Vite ─────────────────
// Leaflet no troba les icones per defecte amb bundlers moderns
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// ─── Configuració visual de prioritats ──────────────────────
const PRIORITAT_CONFIG = {
  critica: { badge: 'bg-red-600', text: 'CRÍTICA' },
  alta: { badge: 'bg-orange-600', text: 'ALTA' },
  mitjana: { badge: 'bg-yellow-600', text: 'MITJANA' },
  baixa: { badge: 'bg-green-600', text: 'BAIXA' },
}

const ESTAT_CONFIG = {
  nova: { badge: 'bg-blue-600', text: 'Nova' },
  assignada: { badge: 'bg-yellow-600', text: 'Assignada' },
  en_curs: { badge: 'bg-orange-600', text: 'En curs' },
  resolta: { badge: 'bg-green-600', text: 'Resolta' },
  tancada: { badge: 'bg-gray-600', text: 'Tancada' },
}

const TIPOLOGIA_EMOJI = {
  robatori: '🔓',
  accident: '💥',
  altercat: '👊',
  violencia_domestica: '🏠',
  incendi: '🔥',
  desaparegut: '🔍',
  drogues: '💊',
  ordre_public: '📢',
  altres: '📋',
}

function DetallIncidencia() {
  const navigate = useNavigate()
  const { indicatiu } = useContext(AuthContext)
  const { lat, lon } = useEnviarGPS()

  const [incidencia, setIncidencia] = useState(null)
  const [historial, setHistorial] = useState([])
  const [ruta, setRuta] = useState(null)
  const [carregant, setCarregant] = useState(true)
  const [error, setError] = useState(null)

  const incidenciaId = indicatiu?.incidencia_assignada_id

  // ─── Carregar dades de la incidència i historial ──────────────
  useEffect(() => {
    if (!incidenciaId) {
      setCarregant(false)
      return
    }

    const carregar = async () => {
      try {
        setCarregant(true)
        setError(null)

        // Carregar incidència i historial en paral·lel
        const [resIncidencia, resHistorial] = await Promise.all([
          getIncidencia(incidenciaId),
          getHistorialIncidencia(incidenciaId).catch(() => ({ dades: [] })),
        ])

        setIncidencia(resIncidencia.dades)
        setHistorial(resHistorial.dades || [])
      } catch (err) {
        console.error('❌ Error carregant detall:', err)
        setError('No s\'ha pogut carregar la incidència')
      } finally {
        setCarregant(false)
      }
    }

    carregar()
  }, [incidenciaId])

  // ─── Calcular ruta amb OSRM ───────────────────────────────────
  useEffect(() => {
    if (!lat || !lon || !incidencia) return

    const calcular = async () => {
      const resultat = await obtenirRuta(
        lat, lon,
        parseFloat(incidencia.ubicacio_lat),
        parseFloat(incidencia.ubicacio_lon)
      )
      if (resultat) setRuta(resultat)
    }

    calcular()
  }, [lat, lon, incidencia])

  // ─── Obrir Google Maps ────────────────────────────────────────
  const obrirNavegacio = () => {
    if (!incidencia || !lat || !lon) return

    const url = `https://www.google.com/maps/dir/?api=1` +
      `&origin=${lat},${lon}` +
      `&destination=${incidencia.ubicacio_lat},${incidencia.ubicacio_lon}` +
      `&travelmode=driving`

    window.open(url, '_blank')
  }

  // ─── Cas: carregant ───────────────────────────────────────────
  if (carregant) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-blue-400 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-400">Carregant detalls...</p>
        </div>
      </div>
    )
  }

  // ─── Cas: error o sense incidència ────────────────────────────
  if (error || !incidencia) {
    return (
      <div className="min-h-screen bg-gray-900 p-4">
        <button
          onClick={() => navigate('/')}
          className="text-blue-400 mb-4 flex items-center gap-1"
        >
          ← Tornar
        </button>
        <div className="bg-red-900/30 border border-red-600 rounded-2xl p-4">
          <p className="text-red-300">{error || 'No hi ha incidència assignada'}</p>
        </div>
      </div>
    )
  }

  // ─── Configuració visual ──────────────────────────────────────
  const prioritatConf = PRIORITAT_CONFIG[incidencia.prioritat] || PRIORITAT_CONFIG.baixa
  const estatConf = ESTAT_CONFIG[incidencia.estat] || ESTAT_CONFIG.nova
  const emoji = TIPOLOGIA_EMOJI[incidencia.tipologia] || '📋'
  const incLat = parseFloat(incidencia.ubicacio_lat)
  const incLon = parseFloat(incidencia.ubicacio_lon)

  return (
    <div className="min-h-screen bg-gray-900 p-4 pb-8">

      {/* ─── Botó tornar ───────────────────────────── */}
      <button
        onClick={() => navigate('/')}
        className="text-blue-400 mb-4 flex items-center gap-1 text-sm"
      >
        ← Tornar al dashboard
      </button>

      {/* ─── Capçalera ─────────────────────────────── */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{emoji}</span>
            <div>
              <h1 className="text-white text-xl font-bold capitalize">
                {incidencia.tipologia.replace(/_/g, ' ')}
              </h1>
              <p className="text-gray-400 text-xs">
                {new Date(incidencia.timestamp_recepcio).toLocaleString('ca-ES')}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <span className={`${prioritatConf.badge} text-white text-xs font-bold
                              px-3 py-1 rounded-full`}>
              {prioritatConf.text}
            </span>
            <span className={`${estatConf.badge} text-white text-xs font-bold
                              px-3 py-1 rounded-full`}>
              {estatConf.text}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Mini-mapa ─────────────────────────────── */}
      <div className="bg-gray-800 rounded-2xl p-3 mb-4 overflow-hidden">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">
          📍 Ubicació
        </h2>
        <div className="rounded-xl overflow-hidden" style={{ height: '200px' }}>
          <MapContainer
            center={[incLat, incLon]}
            zoom={15}
            scrollWheelZoom={false}
            dragging={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            <Marker position={[incLat, incLon]}>
              <Popup>
                {incidencia.tipologia.replace(/_/g, ' ')} — {incidencia.direccio || 'Sense adreça'}
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>

      {/* ─── Adreça ────────────────────────────────── */}
      {incidencia.direccio && (
        <div className="bg-gray-800 rounded-2xl p-4 mb-4">
          <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">
            Adreça
          </h2>
          <p className="text-white text-sm">{incidencia.direccio}</p>
        </div>
      )}

      {/* ─── Descripció ───────────────────────────── */}
      {incidencia.descripcio && (
        <div className="bg-gray-800 rounded-2xl p-4 mb-4">
          <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">
            Descripció
          </h2>
          <p className="text-gray-300 text-sm">{incidencia.descripcio}</p>
        </div>
      )}

      {/* ─── Distància i temps (OSRM) ─────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-800 rounded-2xl p-4 text-center">
          <p className="text-gray-400 text-xs mb-1">Distància</p>
          <p className="text-white text-2xl font-bold">
            {ruta ? ruta.distancia_text : 'Calculant...'}
          </p>
        </div>
        <div className="bg-gray-800 rounded-2xl p-4 text-center">
          <p className="text-gray-400 text-xs mb-1">Temps estimat</p>
          <p className="text-white text-2xl font-bold">
            {ruta ? ruta.temps_text : 'Calculant...'}
          </p>
        </div>
      </div>

      {/* ─── Coordenades ───────────────────────────── */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">
          Coordenades
        </h2>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Latitud</span>
            <span className="text-white text-sm font-mono">{incLat.toFixed(6)}°</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Longitud</span>
            <span className="text-white text-sm font-mono">{incLon.toFixed(6)}°</span>
          </div>
        </div>
      </div>

      {/* ─── Historial d'accions ───────────────────── */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
          Historial
        </h2>
        {historial.length === 0 ? (
          <p className="text-gray-500 text-sm text-center">Sense historial</p>
        ) : (
          <div className="space-y-3">
            {historial.map((event, index) => (
              <div key={event.id || index} className="flex gap-3">
                {/* Línia de temps */}
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5" />
                  {index < historial.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gray-700 mt-1" />
                  )}
                </div>
                {/* Contingut */}
                <div className="flex-1 pb-3">
                  <p className="text-gray-300 text-sm">{event.descripcio}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(event.timestamp).toLocaleString('ca-ES')}
                    {event.usuari_username && ` • ${event.usuari_username}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Observacions ──────────────────────────── */}
      {incidencia.observacions && (
        <div className="bg-gray-800 rounded-2xl p-4 mb-4">
          <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">
            Observacions
          </h2>
          <p className="text-gray-300 text-sm">{incidencia.observacions}</p>
        </div>
      )}

      {/* ─── Botons d'acció ────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={obrirNavegacio}
          disabled={!lat || !lon}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700
                     disabled:cursor-not-allowed text-white font-semibold
                     rounded-2xl py-4 transition-colors flex items-center
                     justify-center gap-2 text-lg"
        >
          🗺️ Navegar
        </button>

        <button
          onClick={() => navigate('/finalitzar')}
          className="bg-orange-600 hover:bg-orange-700 text-white font-semibold
                     rounded-2xl py-4 transition-colors flex items-center
                     justify-center gap-2 text-lg"
        >
          ✅ Finalitzar
        </button>
      </div>

    </div>
  )
}

export default DetallIncidencia