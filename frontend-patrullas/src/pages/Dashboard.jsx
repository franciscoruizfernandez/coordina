// frontend-patrulles/src/pages/Dashboard.jsx

import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

function Dashboard() {
  const { usuari, indicatiu, dispatch } = useContext(AuthContext)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuari')
    localStorage.removeItem('indicatiu')
    dispatch({ type: 'LOGOUT' })
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
            className="bg-red-600 hover:bg-red-700 text-white text-sm
                       rounded-xl px-4 py-2 transition-colors"
          >
            Sortir
          </button>
        </div>
      </div>

      {/* ─── Contingut provisional ─────────────────── */}
      <div className="bg-gray-800 rounded-2xl p-6 text-center">
        <p className="text-green-400 text-lg font-semibold mb-2">
          ✅ Login correcte!
        </p>
        <p className="text-gray-400 text-sm">
          Dashboard en construcció — US-045
        </p>

        {indicatiu && (
          <div className="mt-4 bg-gray-700 rounded-xl p-4 text-left">
            <p className="text-gray-300 text-sm">
              <span className="text-gray-500">Indicatiu:</span> {indicatiu.codi}
            </p>
            <p className="text-gray-300 text-sm">
              <span className="text-gray-500">Tipus:</span> {indicatiu.tipus_unitat}
            </p>
            <p className="text-gray-300 text-sm">
              <span className="text-gray-500">Estat:</span> {indicatiu.estat_operatiu}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard