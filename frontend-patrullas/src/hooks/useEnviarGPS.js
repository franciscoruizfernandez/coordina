// frontend-patrulles/src/hooks/useEnviarGPS.js

import { useEffect, useRef, useContext } from 'react'
import { SocketContext } from '../context/SocketContext'
import { AuthContext } from '../context/AuthContext'
import useGeolocation from './useGeolocation'
import { llegirPreferencia } from '../pages/Configuracio'

function useEnviarGPS() {
  const { getSocket, connectat } = useContext(SocketContext)
  const { indicatiu } = useContext(AuthContext)
  const gps = useGeolocation()
  const ultimEnviamentRef = useRef(0)
  const gpsRef = useRef(gps)

  useEffect(() => {
    gpsRef.current = gps
  }, [gps])

  useEffect(() => {
    // ─── Llegir preferències de configuració ──────────────────
    const gpsActiu = llegirPreferencia('config_gps_actiu', true)
    const intervalSegons = llegirPreferencia('config_interval_gps', 10)
    const intervalMs = intervalSegons * 1000

    // Si l'usuari ha desactivat el GPS, no enviem res
    if (!gpsActiu) return

    if (!gps.lat || !gps.lon || !connectat || !indicatiu?.id) {
      return
    }

    const ara = Date.now()
    const tempsDesdeDarrerEnviament = ara - ultimEnviamentRef.current

    if (tempsDesdeDarrerEnviament < intervalMs) {
      return
    }

    const socket = getSocket()
    if (!socket) return

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

  }, [gps.lat, gps.lon, gps.accuracy, connectat, indicatiu, getSocket])

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