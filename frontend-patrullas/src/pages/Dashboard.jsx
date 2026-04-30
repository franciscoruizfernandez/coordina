// frontend-patrulles/src/pages/Dashboard.jsx

import { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { alliberarIndicatiu } from '../services/api'
import useEnviarGPS from '../hooks/useEnviarGPS'
import BotonsEstat from '../components/BotonsEstat'
import IncidenciaAssignada from '../components/IncidenciaAssignada'
import useAssignacions from '../hooks/useAssignacions'

function Dashboard() {
  const { usuari, indicatiu, dispatch } = useContext(AuthContext)
  const navigate = useNavigate()
  const [tancantSessio, setTancantSessio] = useState(false)

  // ─── Hook que combina GPS + enviament WebSocket ──────────────
  const {
    lat,
    lon,
    accuracy,
    error: errorGPS,
    carregant: carregantGPS,
    demanarPermis,
    connectat,
  } = useEnviarGPS()

    // ─── Hook que escolta assignacions en temps real ─────────────
  useAssignacions()

  // ─── Logout amb alliberament d'indicatiu ─────────────────────
  const handleLogout = async () => {
    setTancantSessio(true)

    try {
      await alliberarIndicatiu('logout')
      console.log('✅ Indicatiu alliberat correctament')
    } catch (err) {
      console.error('⚠️ Error alliberant indicatiu:', err.message)
    }

    localStorage.removeItem('token')
    localStorage.removeItem('usuari')
    localStorage.removeItem('indicatiu')
    dispatch({ type: 'LOGOUT' })
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 pb-8">

      {/* ─── Capçalera ─────────────────────────────── */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Icona segons tipus d'unitat */}
            <div className="text-3xl">
              {indicatiu?.tipus_unitat === 'cotxe' && '🚔'}
              {indicatiu?.tipus_unitat === 'moto' && '🏍️'}
              {indicatiu?.tipus_unitat === 'furgoneta' && '🚐'}
              {!['cotxe', 'moto', 'furgoneta'].includes(indicatiu?.tipus_unitat) && '🚗'}
            </div>
            <div>
              <h1 className="text-white text-xl font-bold">
                {indicatiu?.codi || 'Sense indicatiu'}
              </h1>
              <p className="text-gray-400 text-sm">
                {usuari?.nom_complet || usuari?.username}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={tancantSessio}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-800
                       disabled:cursor-not-allowed text-white text-sm
                       rounded-xl px-4 py-2 transition-colors"
          >
            {tancantSessio ? 'Sortint...' : 'Sortir'}
          </button>
        </div>
      </div>

      {/* ─── Indicadors GPS i Connexió ─────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-4">

        {/* Indicador GPS */}
        <div className="bg-gray-800 rounded-2xl p-3 flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
            carregantGPS
              ? 'bg-yellow-400 animate-pulse'
              : errorGPS
                ? 'bg-red-500'
                : 'bg-green-400 animate-pulse'
          }`} />
          <div>
            <p className="text-white text-sm font-medium">GPS</p>
            <p className="text-gray-400 text-xs">
              {carregantGPS
                ? 'Obtenint...'
                : errorGPS
                  ? 'Error'
                  : lat
                    ? `±${accuracy}m`
                    : 'Esperant...'}
            </p>
          </div>
        </div>

        {/* Indicador WebSocket */}
        <div className="bg-gray-800 rounded-2xl p-3 flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
            connectat ? 'bg-green-400' : 'bg-red-500 animate-pulse'
          }`} />
          <div>
            <p className="text-white text-sm font-medium">Connexió</p>
            <p className="text-gray-400 text-xs">
              {connectat ? 'Connectat' : 'Desconnectat'}
            </p>
          </div>
        </div>

      </div>

      {/* ─── Error GPS ─────────────────────────────── */}
      {errorGPS && (
        <div className="bg-red-900/50 border border-red-700 rounded-2xl p-4 mb-4">
          <p className="text-red-300 text-sm mb-3">{errorGPS}</p>
          <button
            onClick={demanarPermis}
            className="bg-red-600 hover:bg-red-700 text-white text-sm
                       rounded-xl px-4 py-2 transition-colors"
          >
            Activar GPS
          </button>
        </div>
      )}

      {/* ─── Botons d'estat operatiu ───────────────── */}
      <div className="mb-4">
        <BotonsEstat />
      </div>

      {/* ─── Secció incidència assignada ────────────── */}
      <div className="mb-4">
        {indicatiu?.incidencia_assignada_id ? (
          <IncidenciaAssignada
            incidenciaId={indicatiu.incidencia_assignada_id}
            latActual={lat}
            lonActual={lon}
            onVeureDetalls={(incidencia) => {
              console.log('Veure detalls de:', incidencia.id)
              // Navegarem a la pantalla de detalls a la US-048
            }}
          />
        ) : (
          <div className="bg-gray-800 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-green-400 font-semibold">Sense incidències assignades</p>
            <p className="text-gray-500 text-sm mt-1">
              Esperant noves assignacions...
            </p>
          </div>
        )}
      </div>

      {/* ─── Posició actual ────────────────────────── */}
      {lat && lon && (
        <div className="bg-gray-800 rounded-2xl p-4">
          <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
            Posició actual
          </h2>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Latitud</span>
              <span className="text-white text-sm font-mono">{lat.toFixed(6)}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Longitud</span>
              <span className="text-white text-sm font-mono">{lon.toFixed(6)}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Precisió</span>
              <span className="text-white text-sm font-mono">±{accuracy} m</span>
            </div>
          </div>
          <p className="text-gray-600 text-xs mt-3">
            📡 S'envia automàticament cada 10 segons
          </p>
        </div>
      )}

    </div>
  )
}

export default Dashboard