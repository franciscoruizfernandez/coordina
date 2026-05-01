// frontend-patrulles/src/services/socket.js

import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000'

let socketInstance = null

// ==============================================================
// CREAR CONNEXIÓ WEBSOCKET
// S'anomena just després del login, passant el JWT
// ==============================================================
export const crearConnexioSocket = (token) => {
  // Si ja hi ha una instància activa, la tanquem primer
  if (socketInstance) {
    console.warn('⚠️ Socket ja existeix. Desconnectant...')
    socketInstance.disconnect()
  }

  socketInstance = io(SOCKET_URL, {
    auth: { token },

    // Reconexió automàtica
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,       // 1 segon entre intents
    reconnectionDelayMax: 5000,    // Màxim 5 segons entre intents
    timeout: 20000,

    // Forcem WebSocket pur (sense polling HTTP primer)
    transports: ['websocket'],
  })

  // ─── Logs de connexió ──────────────────────────────────────
  socketInstance.on('connect', () => {
    console.log('✅ WebSocket connectat:', socketInstance.id)
  })

  socketInstance.on('disconnect', (motiu) => {
    console.warn('⚠️ WebSocket desconnectat:', motiu)
  })

  socketInstance.on('reconnect', (intents) => {
    console.log(`🔄 WebSocket reconnectat després de ${intents} intent(s)`)
  })

  socketInstance.on('reconnect_error', (error) => {
    console.error('❌ Error de reconnexió WebSocket:', error.message)
  })

  socketInstance.on('connect_error', (error) => {
    console.error('❌ Error de connexió WebSocket:', error.message)
  })

  console.log('🔌 Connexió WebSocket creada')
  return socketInstance
}

// ==============================================================
// OBTENIR INSTÀNCIA ACTUAL
// ==============================================================
export const obtenirSocket = () => {
  if (!socketInstance) {
    console.warn('⚠️ Socket no inicialitzat')
  }
  return socketInstance
}

// ==============================================================
// DESCONNECTAR
// ==============================================================
export const desconnectarSocket = () => {
  if (socketInstance) {
    console.log('👋 Desconnectant WebSocket...')
    socketInstance.disconnect()
    socketInstance = null
  }
}