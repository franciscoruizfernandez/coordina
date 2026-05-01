// frontend-patrulles/src/components/ActualitzacioSW.jsx

import { useState, useEffect } from 'react'

function ActualitzacioSW() {
  const [hiHaActualitzacio, setHiHaActualitzacio] = useState(false)

  useEffect(() => {
    // Escoltem l'event del Service Worker quan detecta una nova versió
    // Això funciona gràcies a registerType: 'autoUpdate' del plugin PWA

    // En mode development, el SW es registra amb devOptions
    // En producció, el plugin genera el codi de registre automàticament

    // Comprovem si hi ha un SW esperant per activar-se
    const comprovarActualitzacio = async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()

        if (registration) {
          // Si hi ha un SW esperant, vol dir que hi ha una actualització
          if (registration.waiting) {
            setHiHaActualitzacio(true)
          }

          // Escoltar futures actualitzacions
          registration.addEventListener('updatefound', () => {
            const nouSW = registration.installing

            if (nouSW) {
              nouSW.addEventListener('statechange', () => {
                if (nouSW.state === 'installed' && navigator.serviceWorker.controller) {
                  // Hi ha una nova versió instal·lada esperant
                  setHiHaActualitzacio(true)
                }
              })
            }
          })
        }
      }
    }

    comprovarActualitzacio()
  }, [])

  // ─── Aplicar actualització ────────────────────────────────────
  const handleActualitzar = () => {
    window.location.reload()
  }

  // Si no hi ha actualització, no mostrem res
  if (!hiHaActualitzacio) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="bg-blue-600 rounded-2xl p-4 shadow-xl flex items-center
                      justify-between gap-3">
        <p className="text-white text-sm">
          🔄 Hi ha una nova versió disponible
        </p>
        <button
          onClick={handleActualitzar}
          className="bg-white text-blue-600 font-semibold text-sm
                     rounded-xl px-4 py-2 whitespace-nowrap"
        >
          Actualitzar
        </button>
      </div>
    </div>
  )
}

export default ActualitzacioSW