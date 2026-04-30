// frontend-patrulles/src/components/BotonsEstat.jsx

import { useState, useContext } from 'react'
import { SocketContext } from '../context/SocketContext'
import { AuthContext } from '../context/AuthContext'

// ─── Configuració dels estats possibles ─────────────────────
const ESTATS = [
  {
    id: 'disponible',
    label: 'Disponible',
    emoji: '🟢',
    bgActiu: 'bg-green-600',
    bgInactiu: 'bg-gray-700 hover:bg-green-900/50',
    borderActiu: 'border-green-400',
    borderInactiu: 'border-gray-600 hover:border-green-600',
  },
  {
    id: 'en_servei',
    label: 'En Servei',
    emoji: '🔵',
    bgActiu: 'bg-blue-600',
    bgInactiu: 'bg-gray-700 hover:bg-blue-900/50',
    borderActiu: 'border-blue-400',
    borderInactiu: 'border-gray-600 hover:border-blue-600',
  },
  {
    id: 'no_disponible',
    label: 'No Disponible',
    emoji: '🔴',
    bgActiu: 'bg-red-600',
    bgInactiu: 'bg-gray-700 hover:bg-red-900/50',
    borderActiu: 'border-red-400',
    borderInactiu: 'border-gray-600 hover:border-red-600',
  },
]

function BotonsEstat() {
  const { indicatiu, dispatch } = useContext(AuthContext)
  const { getSocket, connectat } = useContext(SocketContext)

  const [canviant, setCanviant] = useState(false)
  const [estatActual, setEstatActual] = useState(indicatiu?.estat_operatiu || 'disponible')

  // ─── Canviar estat via WebSocket ──────────────────────────────
  const handleCanviarEstat = async (nouEstat) => {
    // No fer res si ja és l'estat actual o estem canviant
    if (nouEstat === estatActual || canviant) return

    // No fer res si no hi ha socket connectat
    if (!connectat) return

    const socket = getSocket()
    if (!socket) return

    setCanviant(true)

    // Enviar via WebSocket
    socket.emit('canviar_estat_operatiu', {
      indicatiu_id: indicatiu.id,
      estat_operatiu: nouEstat,
    })

    // Escoltar la confirmació del backend
    const onConfirmacio = (data) => {
      if (data.exit) {
        setEstatActual(nouEstat)

        // Actualitzar l'indicatiu al context i localStorage
        const indicatiuActualitzat = { ...indicatiu, estat_operatiu: nouEstat }
        localStorage.setItem('indicatiu', JSON.stringify(indicatiuActualitzat))
        dispatch({ type: 'SET_INDICATIU', payload: indicatiuActualitzat })

        console.log(`✅ Estat canviat a: ${nouEstat}`)
      }
      setCanviant(false)
    }

    const onError = (data) => {
      console.error('❌ Error canviant estat:', data.missatge)
      setCanviant(false)
    }

    // Listeners temporals
    socket.once('estat_canviat', onConfirmacio)
    socket.once('error', onError)

    // Timeout de seguretat: si no hi ha resposta en 5 segons, desbloquejar
    setTimeout(() => {
      socket.off('estat_canviat', onConfirmacio)
      socket.off('error', onError)
      setCanviant(false)
    }, 5000)
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-4">
      <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
        Estat operatiu
      </h2>

      <div className="grid grid-cols-3 gap-2">
        {ESTATS.map((estat) => {
          const esActiu = estatActual === estat.id

          return (
            <button
              key={estat.id}
              onClick={() => handleCanviarEstat(estat.id)}
              disabled={canviant || !connectat}
              className={`
                py-4 rounded-xl border-2 transition-all duration-200
                flex flex-col items-center gap-1
                disabled:opacity-50 disabled:cursor-not-allowed
                ${esActiu ? estat.bgActiu : estat.bgInactiu}
                ${esActiu ? estat.borderActiu : estat.borderInactiu}
              `}
            >
              <span className="text-2xl">{estat.emoji}</span>
              <span className={`text-xs font-medium ${
                esActiu ? 'text-white' : 'text-gray-300'
              }`}>
                {estat.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Missatge si no hi ha connexió */}
      {!connectat && (
        <p className="text-red-400 text-xs text-center mt-2">
          Sense connexió — no es pot canviar l'estat
        </p>
      )}
    </div>
  )
}

export default BotonsEstat