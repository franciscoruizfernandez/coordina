// frontend-patrulles/src/pages/FinalitzarServei.jsx

import { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { SocketContext } from '../context/SocketContext'
import { finalitzarAssignacio } from '../services/api'
import api from '../services/api'

function FinalitzarServei() {
  const navigate = useNavigate()
  const { indicatiu, dispatch } = useContext(AuthContext)
  const { getSocket, connectat } = useContext(SocketContext)

  const [observacions, setObservacions] = useState('')
  const [finalitzant, setFinalitzant] = useState(false)
  const [error, setError] = useState('')
  const [confirmat, setConfirmat] = useState(false)

  // ─── Si no hi ha incidència assignada ─────────────────────────
  if (!indicatiu?.incidencia_assignada_id) {
    return (
      <div className="min-h-screen bg-gray-900 p-4">
        <button
          onClick={() => navigate('/')}
          className="text-blue-400 mb-4 flex items-center gap-1 text-sm"
        >
          ← Tornar al dashboard
        </button>
        <div className="bg-gray-800 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-green-400 font-semibold">No hi ha cap servei actiu</p>
          <p className="text-gray-500 text-sm mt-1">No tens cap incidència assignada</p>
        </div>
      </div>
    )
  }

  // ─── Finalitzar el servei ─────────────────────────────────────
  const handleFinalitzar = async () => {
    setFinalitzant(true)
    setError('')

    try {
      // 1. Obtenir l'assignació activa
      const resAssignacio = await api.get('/assignacions/activa', {
        params: {
          incidencia_id: indicatiu.incidencia_assignada_id,
          indicatiu_id: indicatiu.id,
        },
      })

      const assignacioId = resAssignacio.data?.dades?.id

      if (!assignacioId) {
        throw new Error('No s\'ha trobat l\'assignació activa')
      }

      // 2. Finalitzar l'assignació amb les observacions
      await finalitzarAssignacio(assignacioId, observacions || null)

      // 3. Canviar l'estat operatiu a "disponible" via WebSocket
      const socket = getSocket()
      if (socket && connectat) {
        socket.emit('canviar_estat_operatiu', {
          indicatiu_id: indicatiu.id,
          estat_operatiu: 'disponible',
        })
      }

      // 4. Actualitzar l'indicatiu al context
      const indicatiuActualitzat = {
        ...indicatiu,
        incidencia_assignada_id: null,
        estat_operatiu: 'disponible',
      }

      localStorage.setItem('indicatiu', JSON.stringify(indicatiuActualitzat))
      dispatch({ type: 'SET_INDICATIU', payload: indicatiuActualitzat })

      // 5. Mostrar confirmació
      setConfirmat(true)

    } catch (err) {
      console.error('❌ Error finalitzant servei:', err)

      if (err.response?.data?.missatge) {
        setError(err.response.data.missatge)
      } else {
        setError(err.message || 'Error finalitzant el servei')
      }
    } finally {
      setFinalitzant(false)
    }
  }

  // ─── Pantalla de confirmació ──────────────────────────────────
  if (confirmat) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-white text-2xl font-bold mb-2">
            Servei finalitzat
          </h1>
          <p className="text-gray-400 mb-6">
            Estat operatiu canviat a "disponible"
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold
                       rounded-2xl px-8 py-4 text-lg transition-colors"
          >
            Tornar al dashboard
          </button>
        </div>
      </div>
    )
  }

  // ─── Pantalla principal ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 p-4 pb-8">

      {/* ─── Botó tornar ───────────────────────────── */}
      <button
        onClick={() => navigate(-1)}
        className="text-blue-400 mb-4 flex items-center gap-1 text-sm"
      >
        ← Tornar
      </button>

      {/* ─── Capçalera ─────────────────────────────── */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏁</span>
          <div>
            <h1 className="text-white text-xl font-bold">Finalitzar Servei</h1>
            <p className="text-gray-400 text-sm">
              Indicatiu: {indicatiu.codi}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Advertència ───────────────────────────── */}
      <div className="bg-yellow-900/30 border border-yellow-600 rounded-2xl p-4 mb-4">
        <p className="text-yellow-300 text-sm">
          ⚠️ En finalitzar, la incidència passarà a estat "resolta" i
          el teu indicatiu tornarà a estar "disponible" per a noves assignacions.
        </p>
      </div>

      {/* ─── Observacions ──────────────────────────── */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
          Observacions finals
        </h2>
        <textarea
          value={observacions}
          onChange={(e) => setObservacions(e.target.value)}
          placeholder="Descriu com ha anat la intervenció, actuacions realitzades, observacions rellevants..."
          disabled={finalitzant}
          rows={6}
          className="w-full bg-gray-700 text-white rounded-xl px-4 py-3
                     border border-gray-600 focus:border-blue-500 focus:outline-none
                     placeholder-gray-500 resize-none
                     disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontSize: '16px' }}
        />
        <p className="text-gray-600 text-xs mt-2">
          {observacions.length} caràcters
        </p>
      </div>

      {/* ─── Error ─────────────────────────────────── */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-2xl p-4 mb-4">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* ─── Botó finalitzar ───────────────────────── */}
      <button
        onClick={handleFinalitzar}
        disabled={finalitzant}
        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800
                   disabled:cursor-not-allowed text-white text-lg font-bold
                   rounded-2xl py-5 transition-colors"
      >
        {finalitzant ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Finalitzant...
          </span>
        ) : (
          '✅ Finalitzar Intervenció'
        )}
      </button>

    </div>
  )
}

export default FinalitzarServei