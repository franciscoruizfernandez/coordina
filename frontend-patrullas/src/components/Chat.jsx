// frontend-patrulles/src/components/Chat.jsx

import { useState, useEffect, useRef, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { SocketContext } from '../context/SocketContext'
import { getMissatges } from '../services/api'

function Chat({ incidenciaId }) {
  const { usuari } = useContext(AuthContext)
  const { getSocket, connectat } = useContext(SocketContext)

  const [missatges, setMissatges] = useState([])
  const [textNou, setTextNou] = useState('')
  const [carregant, setCarregant] = useState(true)
  const [enviant, setEnviant] = useState(false)

  // Ref per fer auto-scroll al final
  const finalRef = useRef(null)
  const inputRef = useRef(null)

  // ─── Carregar historial de missatges ──────────────────────────
  useEffect(() => {
    if (!incidenciaId) return

    const carregar = async () => {
      try {
        setCarregant(true)
        const resposta = await getMissatges(incidenciaId)
        setMissatges(resposta.dades || [])
      } catch (err) {
        console.error('❌ Error carregant missatges:', err)
      } finally {
        setCarregant(false)
      }
    }

    carregar()
  }, [incidenciaId])

  // ─── Escoltar missatges nous via WebSocket ────────────────────
  useEffect(() => {
    if (!connectat || !incidenciaId) return

    const socket = getSocket()
    if (!socket) return

    const handleNouMissatge = (data) => {
      const missatge = data.missatge

      // Només afegir si és de la mateixa incidència
      if (missatge && missatge.incidencia_id === incidenciaId) {
        setMissatges((prev) => {
          // Evitar duplicats comprovant l'ID
          const jaExisteix = prev.some((m) => m.id === missatge.id)
          if (jaExisteix) return prev
          return [...prev, missatge]
        })
      }
    }

    socket.on('nou_missatge', handleNouMissatge)

    return () => {
      socket.off('nou_missatge', handleNouMissatge)
    }
  }, [connectat, incidenciaId, getSocket])

  // ─── Auto-scroll quan arriben missatges nous ──────────────────
  useEffect(() => {
    if (finalRef.current) {
      finalRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [missatges])

  // ─── Enviar missatge ──────────────────────────────────────────
  const handleEnviar = () => {
    const text = textNou.trim()
    if (!text || !connectat || enviant) return

    const socket = getSocket()
    if (!socket) return

    setEnviant(true)

    // Enviar via WebSocket
    socket.emit('enviar_missatge', {
      incidencia_id: incidenciaId,
      contingut: text,
      destinatari_id: null, // A la sala de control
    })

    // Afegir el missatge localment per feedback immediat
    const missatgeLocal = {
      id: `local-${Date.now()}`,
      timestamp: new Date().toISOString(),
      emissor_id: usuari.id,
      emissor_username: usuari.username,
      contingut: text,
      incidencia_id: incidenciaId,
      llegit: false,
    }

    setMissatges((prev) => [...prev, missatgeLocal])
    setTextNou('')
    setEnviant(false)

    // Tornar el focus a l'input
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  // ─── Enviar amb Enter ─────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  // ─── Comprovar si un missatge és meu ──────────────────────────
  const esMeu = (missatge) => {
    return missatge.emissor_id === usuari?.id
  }

  // ─── Formatar hora ────────────────────────────────────────────
  const formatarHora = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ca-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="bg-gray-800 rounded-2xl flex flex-col" style={{ height: '400px' }}>

      {/* ─── Capçalera del chat ────────────────────── */}
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <h2 className="text-white text-sm font-semibold">Chat amb Sala de Control</h2>
        </div>
        <div className={`w-2 h-2 rounded-full ${
          connectat ? 'bg-green-400' : 'bg-red-500'
        }`} />
      </div>

      {/* ─── Zona de missatges ─────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">

        {/* Carregant */}
        {carregant && (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">Carregant missatges...</p>
          </div>
        )}

        {/* Sense missatges */}
        {!carregant && missatges.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">Sense missatges</p>
            <p className="text-gray-600 text-xs mt-1">
              Envia el primer missatge a la sala de control
            </p>
          </div>
        )}

        {/* Llista de missatges */}
        {missatges.map((msg) => {
          const meu = esMeu(msg)

          return (
            <div
              key={msg.id}
              className={`flex ${meu ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                  meu
                    ? 'bg-blue-600 rounded-br-sm'
                    : 'bg-gray-700 rounded-bl-sm'
                }`}
              >
                {/* Nom de l'emissor (només si no és meu) */}
                {!meu && (
                  <p className="text-blue-400 text-xs font-semibold mb-1">
                    {msg.emissor_username || 'Sala'}
                  </p>
                )}

                {/* Contingut */}
                <p className={`text-sm ${meu ? 'text-white' : 'text-gray-200'}`}>
                  {msg.contingut}
                </p>

                {/* Hora */}
                <p className={`text-xs mt-1 ${
                  meu ? 'text-blue-200' : 'text-gray-500'
                }`}>
                  {formatarHora(msg.timestamp)}
                </p>
              </div>
            </div>
          )
        })}

        {/* Element invisible per fer scroll al final */}
        <div ref={finalRef} />
      </div>

      {/* ─── Zona d'input ──────────────────────────── */}
      <div className="p-3 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={textNou}
            onChange={(e) => setTextNou(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={connectat ? 'Escriu un missatge...' : 'Sense connexió...'}
            disabled={!connectat}
            className="flex-1 bg-gray-700 text-white rounded-xl px-4 py-3
                       text-base border border-gray-600
                       focus:border-blue-500 focus:outline-none
                       placeholder-gray-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontSize: '16px' }}
          />
          <button
            onClick={handleEnviar}
            disabled={!connectat || !textNou.trim() || enviant}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700
                       disabled:cursor-not-allowed text-white font-semibold
                       rounded-xl px-5 py-3 transition-colors text-lg"
          >
            ➤
          </button>
        </div>
      </div>

    </div>
  )
}

export default Chat