// src/components/ModalAssignacioManual.jsx

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { getIndicatiusDisponibles, assignacioManual, obtenirRutaOSRM } from '../services/api'

// ─── Helpers visuals ─────────────────────────────────────────
const colorEstatIndicatiu = (estat) => {
  switch (estat) {
    case 'disponible':    return 'bg-green-100 text-green-800'
    case 'en_servei':     return 'bg-blue-100 text-blue-800'
    case 'no_disponible': return 'bg-gray-100 text-gray-600'
    default:              return 'bg-gray-100 text-gray-600'
  }
}

const etiquetaTipusUnitat = (tipus) => {
  switch (tipus) {
    case 'cotxe':    return '🚔 Cotxe'
    case 'moto':     return '🏍️ Moto'
    case 'furgoneta': return '🚐 Furgó'
    default:         return tipus
  }
}

// ─── Component principal ─────────────────────────────────────
function ModalAssignacioManual({ incidencia, onTancar, onAssignat, esReforc = false }) {
  const [indicatius, setIndicatius] = useState([])
  const [carregant, setCarregant]   = useState(true)
  const [assignant, setAssignant]   = useState(false)

  // ─── Carregar indicatius i calcular rutes OSRM ─────────────
  useEffect(() => {
    const carregar = async () => {
      try {
        setCarregant(true)

        const resposta = await getIndicatiusDisponibles()
        const llista = resposta.dades || resposta.indicatius || []

        // Filtrar els que tenen coordenades GPS
        const ambUbicacio = llista.filter(
          (ind) => ind.ubicacio_lat && ind.ubicacio_lon
        )
        const senseUbicacio = llista.filter(
          (ind) => !ind.ubicacio_lat || !ind.ubicacio_lon
        )

        // Calcular rutes OSRM per a tots els que tenen GPS en paral·lel
        const promeses = ambUbicacio.map(async (ind) => {
          const ruta = await obtenirRutaOSRM(
            parseFloat(ind.ubicacio_lat),
            parseFloat(ind.ubicacio_lon),
            parseFloat(incidencia.ubicacio_lat),
            parseFloat(incidencia.ubicacio_lon)
          )

          return {
            ...ind,
            _distancia_km: ruta?.distancia_km ?? null,
            _distancia_text: ruta?.distancia_text ?? null,
            _temps_minuts: ruta?.temps_minuts ?? null,
            _temps_text: ruta?.temps_text ?? null,
          }
        })

        const resultat = await Promise.all(promeses)

        // Ordenar per temps_minuts (el que triga menys primer)
        // Els que no tenen ruta van al final
        const ordenats = [
          ...resultat.sort((a, b) => {
            if (a._temps_minuts === null && b._temps_minuts === null) return 0
            if (a._temps_minuts === null) return 1
            if (b._temps_minuts === null) return -1
            return a._temps_minuts - b._temps_minuts
          }),
          // Els sense GPS van al final de tot
          ...senseUbicacio.map((ind) => ({
            ...ind,
            _distancia_km: null,
            _distancia_text: null,
            _temps_minuts: null,
            _temps_text: null,
          })),
        ]

        setIndicatius(ordenats)
      } catch (err) {
        console.error('❌ Error carregant indicatius:', err)
        toast.error("No s'han pogut carregar els indicatius disponibles")
        onTancar()
      } finally {
        setCarregant(false)
      }
    }

    carregar()
  }, [])

  // ─── Assignar indicatiu ───────────────────────────────────
  const handleAssignar = async (indicatiu_id) => {
    try {
      setAssignant(indicatiu_id)

      await assignacioManual({
        incidencia_id: incidencia.id,
        indicatiu_id,
      })

      onAssignat()
    } catch (err) {
      console.error('❌ Error en assignació manual:', err)
      toast.error(
        `⚠️ ${err.response?.data?.missatge || "Error en realitzar l'assignació"}`
      )
    } finally {
      setAssignant(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]"
      onClick={onTancar}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Capçalera ──────────────────────────── */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {esReforc ? '🔰 Afegir Reforç' : '👮 Assignació Manual'}
            </h2>
            <p className="text-sm text-gray-500">
              {esReforc
                ? 'Selecciona una patrulla addicional per a aquesta incidència'
                : 'Ordenats per temps d\'arribada estimat'
              }
            </p>
          </div>
          <button
            onClick={onTancar}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Tancar modal"
          >
            ×
          </button>
        </div>

        {/* ─── Info incidència ─────────────────────── */}
        <div className="px-4 py-3 bg-gray-50 border-b text-sm">
          <span className="font-medium text-gray-700">Incidència: </span>
          <span className="text-gray-600">
            {incidencia.tipologia} — {incidencia.direccio || 'Sense adreça'}
          </span>
        </div>

        {/* ─── Llista d'indicatius ─────────────────── */}
        <div className="flex-1 overflow-y-auto p-4">
          {carregant ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-500 text-sm">
                Carregant indicatius i calculant rutes...
              </span>
            </div>
          ) : indicatius.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-3xl mb-2">🚗</p>
              <p className="font-medium">Cap indicatiu disponible</p>
              <p className="text-sm mt-1">
                Totes les patrulles estan ocupades o fora de servei
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {indicatius.map((ind, index) => {
                const estaAssignant = assignant === ind.id
                const teRuta = ind._temps_minuts !== null

                return (
                  <div
                    key={ind.id}
                    className={`flex items-center justify-between p-3 border rounded-lg
                      hover:bg-gray-50 transition-colors
                      ${index === 0 && teRuta ? 'border-green-300 bg-green-50' : ''}`}
                  >
                    {/* ─── Info indicatiu ──────────────── */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-800">
                          {ind.codi}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorEstatIndicatiu(ind.estat_operatiu)}`}>
                          {ind.estat_operatiu}
                        </span>
                        {/* Badge de "més ràpid" */}
                        {index === 0 && teRuta && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-200 text-green-800">
                            ⚡ Més ràpid
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-gray-500 mt-1.5 space-y-0.5">
                        <div>{etiquetaTipusUnitat(ind.tipus_unitat)}</div>

                        {ind.sector_assignat && (
                          <div>📍 Sector: {ind.sector_assignat}</div>
                        )}

                        {/* Temps i distància OSRM */}
                        {teRuta ? (
                          <div className="flex items-center gap-3 mt-1">
                            <span className="font-medium text-blue-700">
                              🕐 {ind._temps_text}
                            </span>
                            <span className="text-gray-500">
                              📏 {ind._distancia_text}
                            </span>
                            <span className="text-gray-400 text-xs">
                              🛣️ per carretera
                            </span>
                          </div>
                        ) : (
                          <div className="text-gray-400 mt-1">
                            📡 Sense posició GPS
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ─── Botó assignar ───────────────── */}
                    <button
                      onClick={() => handleAssignar(ind.id)}
                      disabled={estaAssignant || assignant !== false}
                      className={`ml-3 px-4 py-2 rounded text-sm font-medium transition-colors ${
                        estaAssignant
                          ? 'bg-blue-400 text-white cursor-not-allowed'
                          : assignant !== false
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {estaAssignant ? (
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin inline-block" />
                          Assignant...
                        </span>
                      ) : (
                        'Assignar'
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ─── Peu ─────────────────────────────────── */}
        <div className="p-4 border-t flex justify-between items-center">
          <p className="text-xs text-gray-400">
            🛣️ Temps calculat via OSRM (ruta real per carretera)
          </p>
          <button
            onClick={onTancar}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded hover:bg-gray-50"
          >
            Cancel·lar
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalAssignacioManual