// frontend-patrulles/src/components/IncidenciaAssignada.jsx

import { useState, useEffect, useRef } from 'react'
import { getIncidencia } from '../services/api'
import { obtenirRuta } from '../utils/ruta'

// ─── Colors i etiquetes segons prioritat ────────────────────
const PRIORITAT_CONFIG = {
  critica: {
    bg: 'bg-red-900/60',
    border: 'border-red-500',
    badge: 'bg-red-600',
    text: 'CRÍTICA',
  },
  alta: {
    bg: 'bg-orange-900/40',
    border: 'border-orange-500',
    badge: 'bg-orange-600',
    text: 'ALTA',
  },
  mitjana: {
    bg: 'bg-yellow-900/30',
    border: 'border-yellow-500',
    badge: 'bg-yellow-600',
    text: 'MITJANA',
  },
  baixa: {
    bg: 'bg-green-900/30',
    border: 'border-green-600',
    badge: 'bg-green-600',
    text: 'BAIXA',
  },
}

// ─── Icones segons tipologia ────────────────────────────────
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

// ─── Interval d'actualització de la ruta (30 segons) ────────
const INTERVAL_RUTA_MS = 30000

function IncidenciaAssignada({ incidenciaId, latActual, lonActual, onVeureDetalls }) {
  const [incidencia, setIncidencia] = useState(null)
  const [carregant, setCarregant] = useState(true)
  const [error, setError] = useState(null)

  // Dades de la ruta OSRM
  const [ruta, setRuta] = useState(null)
  const [carregantRuta, setCarregantRuta] = useState(false)

  // Ref per guardar l'interval i poder cancel·lar-lo
  const intervalRef = useRef(null)

  // ─── Carregar dades de la incidència ──────────────────────────
  useEffect(() => {
    if (!incidenciaId) {
      setCarregant(false)
      return
    }

    const carregar = async () => {
      try {
        setCarregant(true)
        setError(null)

        const resposta = await getIncidencia(incidenciaId)
        setIncidencia(resposta.dades)
      } catch (err) {
        console.error('❌ Error carregant incidència:', err)
        setError('No s\'ha pogut carregar la incidència')
      } finally {
        setCarregant(false)
      }
    }

    carregar()
  }, [incidenciaId])

  // ─── Calcular ruta amb OSRM ───────────────────────────────────
  // Es recalcula cada 30 segons i cada vegada que canvia la posició GPS
  useEffect(() => {
    // Necessitem posició actual i dades de la incidència
    if (!latActual || !lonActual || !incidencia) return

    const calcularRuta = async () => {
      setCarregantRuta(true)

      const resultat = await obtenirRuta(
        latActual,
        lonActual,
        parseFloat(incidencia.ubicacio_lat),
        parseFloat(incidencia.ubicacio_lon)
      )

      if (resultat) {
        setRuta(resultat)
      }

      setCarregantRuta(false)
    }

    // Calcular la ruta immediatament
    calcularRuta()

    // Recalcular cada 30 segons
    intervalRef.current = setInterval(calcularRuta, INTERVAL_RUTA_MS)

    // Cleanup: cancel·lar l'interval quan el component es desmunta
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [latActual, lonActual, incidencia])

  // ─── Obrir Google Maps amb la ruta ────────────────────────────
  const obrirNavegacio = () => {
    if (!incidencia) return

    const url = `https://www.google.com/maps/dir/?api=1` +
      `&origin=${latActual},${lonActual}` +
      `&destination=${incidencia.ubicacio_lat},${incidencia.ubicacio_lon}` +
      `&travelmode=driving`

    window.open(url, '_blank')
  }

  // ─── Cas: carregant ───────────────────────────────────────────
  if (carregant) {
    return (
      <div className="bg-gray-800 rounded-2xl p-6 text-center">
        <svg className="animate-spin h-8 w-8 text-orange-400 mx-auto mb-3" viewBox="0 0 24 24">
          <circle
            className="opacity-25" cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4" fill="none"
          />
          <path
            className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <p className="text-gray-400 text-sm">Carregant incidència...</p>
      </div>
    )
  }

  // ─── Cas: error ───────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-red-900/30 border-2 border-red-600 rounded-2xl p-4">
        <p className="text-red-300 text-sm">{error}</p>
      </div>
    )
  }

  // ─── Cas: no hi ha incidència ─────────────────────────────────
  if (!incidencia) return null

  // ─── Configuració visual per prioritat ────────────────────────
  const config = PRIORITAT_CONFIG[incidencia.prioritat] || PRIORITAT_CONFIG.baixa
  const emoji = TIPOLOGIA_EMOJI[incidencia.tipologia] || '📋'

  return (
    <div className={`${config.bg} border-2 ${config.border} rounded-2xl p-4`}>

      {/* ─── Capçalera: tipologia i prioritat ──────── */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{emoji}</span>
          <div>
            <h2 className="text-white text-lg font-bold capitalize">
              {incidencia.tipologia.replace(/_/g, ' ')}
            </h2>
            <p className="text-gray-400 text-xs">
              {new Date(incidencia.timestamp_recepcio).toLocaleString('ca-ES')}
            </p>
          </div>
        </div>

        {/* Badge de prioritat */}
        <span className={`${config.badge} text-white text-xs font-bold
                          px-3 py-1 rounded-full`}>
          {config.text}
        </span>
      </div>

      {/* ─── Adreça ────────────────────────────────── */}
      {incidencia.direccio && (
        <div className="bg-black/20 rounded-xl p-3 mb-3">
          <p className="text-gray-400 text-xs mb-1">📍 Adreça</p>
          <p className="text-white text-sm">{incidencia.direccio}</p>
        </div>
      )}

      {/* ─── Descripció ───────────────────────────── */}
      {incidencia.descripcio && (
        <div className="bg-black/20 rounded-xl p-3 mb-3">
          <p className="text-gray-400 text-xs mb-1">📝 Descripció</p>
          <p className="text-gray-300 text-sm">{incidencia.descripcio}</p>
        </div>
      )}

      {/* ─── Distància i temps estimat (OSRM) ──────── */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-black/20 rounded-xl p-3 text-center">
          <p className="text-gray-400 text-xs mb-1">Distància</p>
          {carregantRuta && !ruta ? (
            <p className="text-gray-500 text-sm">Calculant...</p>
          ) : ruta ? (
            <p className="text-white text-xl font-bold">{ruta.distancia_text}</p>
          ) : (
            <p className="text-gray-500 text-sm">Sense GPS</p>
          )}
        </div>
        <div className="bg-black/20 rounded-xl p-3 text-center">
          <p className="text-gray-400 text-xs mb-1">Temps estimat</p>
          {carregantRuta && !ruta ? (
            <p className="text-gray-500 text-sm">Calculant...</p>
          ) : ruta ? (
            <p className="text-white text-xl font-bold">{ruta.temps_text}</p>
          ) : (
            <p className="text-gray-500 text-sm">Sense GPS</p>
          )}
        </div>
      </div>

      {/* ─── Indicador de ruta per carretera ───────── */}
      {ruta && (
        <p className="text-gray-500 text-xs text-center mb-3">
          🛣️ Ruta per carretera • s'actualitza cada 30s
        </p>
      )}

      {/* ─── Botons d'acció ────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        {/* Botó Navegar */}
        <button
          onClick={obrirNavegacio}
          disabled={!latActual || !lonActual}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700
                     disabled:cursor-not-allowed text-white font-semibold
                     rounded-xl py-3 transition-colors flex items-center
                     justify-center gap-2"
        >
          <span>🗺️</span>
          <span>Navegar</span>
        </button>

        {/* Botó Veure detalls */}
        <button
          onClick={() => onVeureDetalls && onVeureDetalls(incidencia)}
          className="bg-gray-600 hover:bg-gray-500 text-white font-semibold
                     rounded-xl py-3 transition-colors flex items-center
                     justify-center gap-2"
        >
          <span>📋</span>
          <span>Detalls</span>
        </button>
      </div>

    </div>
  )
}

export default IncidenciaAssignada