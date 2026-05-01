// frontend-patrulles/src/hooks/useGeolocation.js

import { useState, useEffect, useRef } from 'react'

// ─── CODIS D'ERROR DE LA GEOLOCATION API ────────────────────
// 1 = PERMISSION_DENIED     → l'usuari ha denegat el permís
// 2 = POSITION_UNAVAILABLE  → el dispositiu no pot determinar la posició
// 3 = TIMEOUT               → s'ha superat el temps màxim d'espera
const CODIS_ERROR = {
  1: 'Has denegat el permís de localització. Activa-la a la configuració del navegador.',
  2: 'No s\'ha pogut determinar la posició. Comprova que el GPS està activat.',
  3: 'S\'ha superat el temps d\'espera obtenint la posició. Torna-ho a intentar.',
}

function useGeolocation() {
  // ─── Estat ──────────────────────────────────────────────────
  const [posicio, setPosicio] = useState({
    lat: null,
    lon: null,
    accuracy: null,   // precisió en metres
  })
  const [error, setError] = useState(null)
  const [carregant, setCarregant] = useState(true)
  const [permisAtorgat, setPermisAtorgat] = useState(null) // null = no sabem encara

  // Guardem la referència al watchId per poder cancel·lar-lo
  const watchIdRef = useRef(null)

  useEffect(() => {
    // ─── Comprovar suport ──────────────────────────────────────
    if (!navigator.geolocation) {
      setError('Aquest navegador no suporta la geolocalització.')
      setCarregant(false)
      setPermisAtorgat(false)
      return
    }

    // ─── Opcions de seguiment ──────────────────────────────────
    const opcions = {
      enableHighAccuracy: true,  // Usar GPS del hardware (més precís, més bateria)
      timeout: 10000,            // Màxim 10 segons per obtenir posició
      maximumAge: 5000,          // Acceptar posicions de fins a 5 segons enrere
    }

    // ─── Callback d'èxit ───────────────────────────────────────
    // S'executa cada vegada que el dispositiu detecta un canvi de posició
    const onExit = (posicioGPS) => {
      setCarregant(false)
      setPermisAtorgat(true)
      setError(null)

      setPosicio({
        lat: posicioGPS.coords.latitude,
        lon: posicioGPS.coords.longitude,
        accuracy: Math.round(posicioGPS.coords.accuracy), // en metres, arrodonit
      })
    }

    // ─── Callback d'error ──────────────────────────────────────
    const onError = (errorGPS) => {
      setCarregant(false)
      setPermisAtorgat(false)

      const missatgeError = CODIS_ERROR[errorGPS.code] || 'Error desconegut de geolocalització.'
      setError(missatgeError)

      console.error(`❌ Error geolocalització (codi ${errorGPS.code}):`, missatgeError)
    }

    // ─── Iniciar seguiment continu ─────────────────────────────
    // watchPosition és diferent de getCurrentPosition:
    // getCurrentPosition → obté la posició UNA vegada
    // watchPosition      → obté la posició CONTÍNUAMENT quan canvia
    watchIdRef.current = navigator.geolocation.watchPosition(
      onExit,
      onError,
      opcions
    )

    console.log(`🛰️ Seguiment GPS iniciat (watchId: ${watchIdRef.current})`)

    // ─── Cleanup ───────────────────────────────────────────────
    // Quan el component que usa el hook es desmunta,
    // cancel·lem el seguiment per estalviar bateria
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        console.log(`🛑 Seguiment GPS aturat (watchId: ${watchIdRef.current})`)
        watchIdRef.current = null
      }
    }
  }, []) // Array buit → només s'executa una vegada en muntar el component

  // ─── Funció per demanar permís manualment ─────────────────────
  // Útil si l'usuari havia denegat el permís i vol tornar-lo a intentar
  const demanarPermis = () => {
    setCarregant(true)
    setError(null)

    // Forcem una petició de posició per provocar el prompt de permís
    navigator.geolocation.getCurrentPosition(
      (posicioGPS) => {
        setCarregant(false)
        setPermisAtorgat(true)
        setPosicio({
          lat: posicioGPS.coords.latitude,
          lon: posicioGPS.coords.longitude,
          accuracy: Math.round(posicioGPS.coords.accuracy),
        })
      },
      (errorGPS) => {
        setCarregant(false)
        setPermisAtorgat(false)
        setError(CODIS_ERROR[errorGPS.code] || 'Error desconegut.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return {
    lat: posicio.lat,
    lon: posicio.lon,
    accuracy: posicio.accuracy,
    error,
    carregant,
    permisAtorgat,
    demanarPermis,
  }
}

export default useGeolocation