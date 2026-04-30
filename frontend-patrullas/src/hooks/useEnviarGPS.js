// frontend-patrulles/src/hooks/useEnviarGPS.js

import { useEffect, useRef, useContext } from 'react'
import { SocketContext } from '../context/SocketContext'
import { AuthContext } from '../context/AuthContext'
import useGeolocation from './useGeolocation'

// Interval mínim entre enviaments en mil·lisegons (10 segons per defecte)
const INTERVAL_ENVIAMENT_MS = 10000

function useEnviarGPS() {
  const { getSocket, connectat } = useContext(SocketContext)
  const { indicatiu } = useContext(AuthContext)

  // Obtenim la posició GPS contínuament
  const gps = useGeolocation()

  // Referència al moment de l'últim enviament
  const ultimEnviamentRef = useRef(0)

  // Referència a les últimes dades GPS per poder-les enviar
  // des del cleanup sense dependències obsoletes
  const gpsRef = useRef(gps)
  useEffect(() => {
    gpsRef.current = gps
  }, [gps])

  useEffect(() => {
    // ─── Condicions per enviar ─────────────────────────────────
    // 1. Ha d'haver-hi posició vàlida
    // 2. Ha d'estar connectat el socket
    // 3. Ha d'haver-hi un indicatiu associat
    if (!gps.lat || !gps.lon || !connectat || !indicatiu?.id) {
      return
    }

    const ara = Date.now()
    const tempsDesdeDarrerEnviament = ara - ultimEnviamentRef.current

    // ─── Throttle: només enviem si han passat 10 segons ───────
    if (tempsDesdeDarrerEnviament < INTERVAL_ENVIAMENT_MS) {
      return
    }

    const socket = getSocket()
    if (!socket) return

    // ─── Enviar posició via WebSocket ──────────────────────────
    // El backend escolta l'event 'actualitzar_ubicacio'
    // i actualitza la BD + retransmet a la sala de control
    socket.emit('actualitzar_ubicacio', {
      indicatiu_id: indicatiu.id,
      ubicacio_lat: gps.lat,
      ubicacio_lon: gps.lon,
      accuracy: gps.accuracy,
    })

    ultimEnviamentRef.current = ara

    console.log(
      `📍 GPS enviat: (${gps.lat.toFixed(5)}, ${gps.lon.toFixed(5)}) ` +
      `±${gps.accuracy}m → indicatiu ${indicatiu.codi}`
    )

  // S'executa cada vegada que canvia la posició GPS
  }, [gps.lat, gps.lon, gps.accuracy, connectat, indicatiu, getSocket])

  // Retornem totes les dades del GPS i l'estat del socket
  // perquè els components puguin mostrar indicadors visuals
  return {
    lat: gps.lat,
    lon: gps.lon,
    accuracy: gps.accuracy,
    error: gps.error,
    carregant: gps.carregant,
    permisAtorgat: gps.permisAtorgat,
    demanarPermis: gps.demanarPermis,
    connectat,
  }
}

export default useEnviarGPS