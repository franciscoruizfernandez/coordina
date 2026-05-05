// frontend-patrulles/src/context/SocketContext.jsx

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { AuthContext } from './AuthContext'
import {
  crearConnexioSocket,
  desconnectarSocket,
  obtenirSocket,
} from '../services/socket'

export const SocketContext = createContext()

export function SocketProvider({ children }) {
  const { token } = useContext(AuthContext)
  const [connectat, setConnectat] = useState(false)
  // Usem una ref per guardar el socket i evitar re-renders innecessaris
  const socketRef = useRef(null)

  useEffect(() => {
    // ─── Si hi ha token, connectem el socket ──────────────────
    if (token) {
      const socket = crearConnexioSocket(token)
      socketRef.current = socket

      socket.on('connect', () => {
        setConnectat(true)
      })

      socket.on('disconnect', () => {
        setConnectat(false)
      })

      socket.on('reconnect', () => {
        setConnectat(true)
      })
    }

    // ─── Si no hi ha token (logout), desconnectem ─────────────
    if (!token) {
      desconnectarSocket()
      socketRef.current = null
      setConnectat(false)
    }

    // ─── Cleanup al desmuntar ─────────────────────────────────
    return () => {
      if (!token) {
        desconnectarSocket()
      }
    }
  }, [token]) // Es re-executa quan el token canvia (login/logout)

  // Funció helper per obtenir el socket des de qualsevol component
  const getSocket = () => socketRef.current || obtenirSocket()

  return (
    <SocketContext.Provider value={{ connectat, getSocket }}>
      {children}
    </SocketContext.Provider>
  )
}