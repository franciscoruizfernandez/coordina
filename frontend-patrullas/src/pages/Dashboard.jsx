// frontend-patrulles/src/pages/Dashboard.jsx

import { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { alliberarIndicatiu } from '../services/api'
import useEnviarGPS from '../hooks/useEnviarGPS'

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

  // ─── Logout amb alliberament d'indicatiu ─────────────────────
  const handleLogout = async () => {
    setTancantSessio(true)

    try {
      // 1. Alliberar l'indicatiu al backend
      await alliberarIndicatiu('logout')
      console.log('✅ Indicatiu alliberat correctament')
    } catch (err) {
      // Si falla l'alliberament, fem logout igualment
      // L'indicatiu quedarà com a "zombie" fins que un admin el netegi
      console.error('⚠️ Error alliberant indicatiu:', err.message)
    }

    // 2. Netejar localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('usuari')
    localStorage.removeItem('indicatiu')

    // 3. Actualitzar context (això desconnectarà el socket automàticament)
    dispatch({ type: 'LOGOUT' })

    // 4. Redirigir a login
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">

      {/* ─── Capçalera ─────────────────────────────── */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-lg font-bold">
              🚔 {indicatiu?.codi || 'Sense indicatiu'}
            </h1>
            <p className="text-gray-400 text-sm">
              {usuari?.nom_complet || usuari?.username}
            </p>
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

      {/* ─── Indicadors d'estat ────────────────────── */}
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
                  : `±${accuracy}m`}
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

      {/* ─── Coordenades actuals ───────────────────── */}
      {lat && lon && (
        <div className="bg-gray-800 rounded-2xl p-4 mb-4">
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

      {/* ─── Info indicatiu ────────────────────────── */}
      {indicatiu && (
        <div className="bg-gray-800 rounded-2xl p-4">
          <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
            Indicatiu
          </h2>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Codi</span>
              <span className="text-white text-sm">{indicatiu.codi}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Tipus</span>
              <span className="text-white text-sm">{indicatiu.tipus_unitat}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Estat</span>
              <span className="text-white text-sm">{indicatiu.estat_operatiu}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Dashboard