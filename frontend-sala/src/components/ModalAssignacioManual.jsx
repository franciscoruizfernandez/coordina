// src/components/ModalAssignacioManual.jsx
// Modal per seleccionar manualment un indicatiu disponible i assignar-lo a una incidència

import { useState, useEffect } from 'react';
import { getIndicatiusDisponibles, assignacioManual } from '../services/api';
import { calcularDistancia } from '../utils/haversine';

// =====================================================
// HELPERS VISUALS
// =====================================================

// Color de l'estat operatiu de l'indicatiu
const colorEstatIndicatiu = (estat) => {
  switch (estat) {
    case 'disponible':     return 'bg-green-100 text-green-800';
    case 'en_servei':      return 'bg-blue-100 text-blue-800';
    case 'no_disponible':  return 'bg-gray-100 text-gray-600';
    default:               return 'bg-gray-100 text-gray-600';
  }
};

// Etiqueta llegible del tipus d'unitat
const etiquetaTipusUnitat = (tipus) => {
  switch (tipus) {
    case 'cotxe':   return '🚔 Cotxe';
    case 'moto':    return '🏍️ Moto';
    case 'furgo':   return '🚐 Furgó';
    default:        return tipus;
  }
};

// =====================================================
// COMPONENT PRINCIPAL
// =====================================================

function ModalAssignacioManual({ incidencia, onTancar, onAssignat }) {
  const [indicatius, setIndicatius]   = useState([]);
  const [carregant, setCarregant]     = useState(true);
  const [assignant, setAssignant]     = useState(false); // ID de l'indicatiu en procés
  const [error, setError]             = useState(null);

  // ---------------------------------------------------
  // Carregar indicatius disponibles en obrir el modal
  // ---------------------------------------------------
  useEffect(() => {
    const carregar = async () => {
        try {
        setCarregant(true);
        setError(null);
        const resposta = await getIndicatiusDisponibles();
        const llista = resposta.dades || resposta.indicatius || [];

        // ✅ Calcular distància per a cada indicatiu i ordenar de menor a major
        const llistaAmbDistancia = llista
            .map((ind) => {
            if (
                ind.ubicacio_lat &&
                ind.ubicacio_lon &&
                incidencia.ubicacio_lat &&
                incidencia.ubicacio_lon
            ) {
                const distancia = calcularDistancia(
                parseFloat(incidencia.ubicacio_lat),
                parseFloat(incidencia.ubicacio_lon),
                parseFloat(ind.ubicacio_lat),
                parseFloat(ind.ubicacio_lon)
                );
                return { ...ind, _distancia_km: distancia };
            }
            // Sense coordenades GPS → distància desconeguda (va al final)
            return { ...ind, _distancia_km: null };
            })
            .sort((a, b) => {
            // Els null van al final
            if (a._distancia_km === null && b._distancia_km === null) return 0;
            if (a._distancia_km === null) return 1;
            if (b._distancia_km === null) return -1;
            return a._distancia_km - b._distancia_km;
            });

        setIndicatius(llistaAmbDistancia);
        } catch (err) {
        console.error('❌ Error carregant indicatius disponibles:', err);
        setError("No s'han pogut carregar els indicatius disponibles");
        } finally {
        setCarregant(false);
        }
    };
    carregar();
    }, []);

  // ---------------------------------------------------
  // Acció: Assignar indicatiu seleccionat
  // ---------------------------------------------------
  const handleAssignar = async (indicatiu_id) => {
    try {
      setAssignant(indicatiu_id);
      setError(null);

      await assignacioManual({
        incidencia_id: incidencia.id,
        indicatiu_id,
      });

      // Notificar al pare que s'ha fet l'assignació
      onAssignat();
    } catch (err) {
      console.error('❌ Error en assignació manual:', err);
      const missatgeError =
        err.response?.data?.missatge || 'Error en realitzar l\'assignació';
      setError(missatgeError);
    } finally {
      setAssignant(false);
    }
  };

  // ---------------------------------------------------
  // RENDER
  // ---------------------------------------------------
  return (
    // Fons fosc semitransparent
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]"
      onClick={onTancar} // Tancar clicant fora
    >
      {/* Contenidor del modal — stopPropagation per no tancar en clicar dins */}
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CAPÇALERA */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              Assignació Manual
            </h2>
            <p className="text-sm text-gray-500">
              Selecciona un indicatiu disponible per a la incidència
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

        {/* INFO DE LA INCIDÈNCIA */}
        <div className="px-4 py-3 bg-gray-50 border-b text-sm">
          <span className="font-medium text-gray-700">Incidència: </span>
          <span className="text-gray-600">
            {incidencia.tipologia} — {incidencia.direccio || 'Sense adreça'}
          </span>
        </div>

        {/* ERROR GLOBAL */}
        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* LLISTA D'INDICATIUS */}
        <div className="flex-1 overflow-y-auto p-4">
          {carregant ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
              <span className="text-gray-500 text-sm">Carregant indicatius...</span>
            </div>
          ) : indicatius.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-3xl mb-2">🚗</p>
              <p className="font-medium">Cap indicatiu disponible</p>
              <p className="text-sm mt-1">Totes les patrulles estan ocupades o fora de servei</p>
            </div>
          ) : (
            <div className="space-y-3">
              {indicatius.map((ind) => {
                // Calcular distància aproximada si tenim coordenades
                let distancia = null;
                if (
                  ind.ubicacio_lat &&
                  ind.ubicacio_lon &&
                  incidencia.ubicacio_lat &&
                  incidencia.ubicacio_lon
                ) {
                  distancia = calcularDistancia(
                    parseFloat(incidencia.ubicacio_lat),
                    parseFloat(incidencia.ubicacio_lon),
                    parseFloat(ind.ubicacio_lat),
                    parseFloat(ind.ubicacio_lon)
                  );
                }

                const estaAssignant = assignant === ind.id;

                return (
                  <div
                    key={ind.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {/* INFO INDICATIU */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800">
                          {ind.codi}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorEstatIndicatiu(ind.estat_operatiu)}`}
                        >
                          {ind.estat_operatiu}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                        <div>{etiquetaTipusUnitat(ind.tipus_unitat)}</div>
                        {ind.sector_assignat && (
                          <div>📍 Sector: {ind.sector_assignat}</div>
                        )}
                        {distancia !== null && (
                          <div>
                            📏 Distància aproximada:{' '}
                            <span className="font-medium text-gray-700">
                              {distancia < 1
                                ? `${Math.round(distancia * 1000)} m`
                                : `${distancia.toFixed(1)} km`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* BOTÓ ASSIGNAR */}
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
                );
              })}
            </div>
          )}
        </div>

        {/* PEU DEL MODAL */}
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onTancar}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded hover:bg-gray-50"
          >
            Cancel·lar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalAssignacioManual;