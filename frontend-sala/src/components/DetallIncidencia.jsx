// src/components/DetallIncidencia.jsx
// Panell dret de la Sala de Control
// Mostra tota la informació d'una incidència seleccionada amb totes les accions possibles

import { useState, useEffect, useCallback } from 'react';
import {
  getIncidencia,
  getHistorialIncidencia,
  canviarEstatIncidencia,
  assignacioAutomatica,
} from '../services/api';
import ModalAssignacioManual from './ModalAssignacioManual';

// =====================================================
// CONSTANTS I HELPERS VISUALS
// =====================================================

// Mapa de colors per prioritat
const COLOR_PRIORITAT = {
  critica: { bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-400',    dot: 'bg-red-500'    },
  alta:    { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-400', dot: 'bg-orange-500' },
  mitjana: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-400', dot: 'bg-yellow-500' },
  baixa:   { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-400',  dot: 'bg-green-500'  },
};

// Mapa de colors per estat
const COLOR_ESTAT = {
  nova:      'bg-blue-100 text-blue-800',
  assignada: 'bg-purple-100 text-purple-800',
  en_curs:   'bg-yellow-100 text-yellow-800',
  resolta:   'bg-green-100 text-green-800',
  tancada:   'bg-gray-100 text-gray-600',
};

// Transicions d'estat permeses (igual que al backend)
const TRANSICIONS_PERMESES = {
  nova:      ['assignada', 'tancada'],
  assignada: ['en_curs', 'nova', 'tancada'],
  en_curs:   ['resolta', 'tancada'],
  resolta:   ['tancada'],
  tancada:   [],
};

// Etiquetes llegibles dels estats
const ETIQUETA_ESTAT = {
  nova:      'Nova',
  assignada: 'Assignada',
  en_curs:   'En curs',
  resolta:   'Resolta',
  tancada:   'Tancada',
};

// Icones per tipus d'esdeveniment de l'historial
const ICONA_TIPUS_ESDEVENIMENT = {
  creacio_incidencia:       '🆕',
  modificacio_incidencia:   '✏️',
  canvi_estat_incidencia:   '🔄',
  assignacio_creada:        '📋',
  assignacio_acceptada:     '✅',
  assignacio_finalitzada:   '🏁',
  assignacio_cancel_lada:   '❌',
  tancament_incidencia:     '🔒',
  default:                  '📌',
};

// Format de data/hora llegible en català
const formatarData = (timestamp) => {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString('ca-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// Temps relatiu (fa X minuts/hores)
const tempsRelatiu = (timestamp) => {
  if (!timestamp) return '';
  const ara = new Date();
  const data = new Date(timestamp);
  const difMs = ara - data;
  const difMin = Math.floor(difMs / 60000);

  if (difMin < 1)  return 'Ara mateix';
  if (difMin < 60) return `Fa ${difMin} min`;

  const difH = Math.floor(difMin / 60);
  if (difH < 24)   return `Fa ${difH} h`;

  const difD = Math.floor(difH / 24);
  return `Fa ${difD} d`;
};

// =====================================================
// SUB-COMPONENT: Línia de l'historial
// =====================================================
function FilaHistorial({ event }) {
  const icona = ICONA_TIPUS_ESDEVENIMENT[event.tipus_esdeveniment]
    || ICONA_TIPUS_ESDEVENIMENT.default;

  return (
    <div className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm">
        {icona}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-700 leading-snug">
          {event.descripcio}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatarData(event.timestamp)}
        </p>
      </div>
    </div>
  );
}

// =====================================================
// SUB-COMPONENT: Badge de prioritat
// =====================================================
function BadgePrioritat({ prioritat }) {
  const colors = COLOR_PRIORITAT[prioritat] || COLOR_PRIORITAT.baixa;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
      <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
      {prioritat?.charAt(0).toUpperCase() + prioritat?.slice(1)}
    </span>
  );
}

// =====================================================
// SUB-COMPONENT: Badge d'estat
// =====================================================
function BadgeEstat({ estat }) {
  const colors = COLOR_ESTAT[estat] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors}`}>
      {ETIQUETA_ESTAT[estat] || estat}
    </span>
  );
}

// =====================================================
// COMPONENT PRINCIPAL: DetallIncidencia
// =====================================================
function DetallIncidencia({ incidencia, onTancar, onIncidenciaActualitzada }) {
  // ------- Estat local -------
  const [detall, setDetall]                   = useState(null);
  const [historial, setHistorial]             = useState([]);
  const [carregantDetall, setCarregantDetall] = useState(true);
  const [carregantHistorial, setCarregantHistorial] = useState(true);
  const [error, setError]                     = useState(null);

  // Estat per a les accions
  const [canviantEstat, setCanviantEstat]     = useState(false);
  const [assignantAuto, setAssignantAuto]     = useState(false);
  const [mostrarModalManual, setMostrarModalManual] = useState(false);
  const [errorAccio, setErrorAccio]           = useState(null);
  const [missatgeExit, setMissatgeExit]       = useState(null);

  // ------- Carregar dades detallades -------
  const carregarDetall = useCallback(async () => {
    if (!incidencia?.id) return;

    try {
      setCarregantDetall(true);
      setError(null);

      const resposta = await getIncidencia(incidencia.id);
      // Backend retorna { exit: true, dades: incidencia }
      setDetall(resposta.dades || resposta);
    } catch (err) {
      console.error('❌ Error carregant detall:', err);
      setError('No s\'ha pogut carregar el detall de la incidència');
    } finally {
      setCarregantDetall(false);
    }
  }, [incidencia?.id]);

  // ------- Carregar historial -------
  const carregarHistorial = useCallback(async () => {
    if (!incidencia?.id) return;

    try {
      setCarregantHistorial(true);
      const resposta = await getHistorialIncidencia(incidencia.id);
      // Backend retorna { exit: true, dades: [...], total_accions: N }
      setHistorial(resposta.dades || []);
    } catch (err) {
      console.error('❌ Error carregant historial:', err);
      // No bloquejem si l'historial falla
      setHistorial([]);
    } finally {
      setCarregantHistorial(false);
    }
  }, [incidencia?.id]);

  // Carregar quan canvia la incidència seleccionada
  useEffect(() => {
    setDetall(null);
    setHistorial([]);
    setErrorAccio(null);
    setMissatgeExit(null);
    carregarDetall();
    carregarHistorial();
  }, [incidencia?.id, carregarDetall, carregarHistorial]);

  // ------- Missatge d'èxit temporal -------
  const mostrarExit = (missatge) => {
    setMissatgeExit(missatge);
    setTimeout(() => setMissatgeExit(null), 4000);
  };

  // ------- ACCIÓ: Canviar estat -------
  const handleCanviarEstat = async (nouEstat) => {
    try {
      setCanviantEstat(true);
      setErrorAccio(null);

      await canviarEstatIncidencia(incidencia.id, nouEstat);

      mostrarExit(`Estat canviat a "${ETIQUETA_ESTAT[nouEstat]}" correctament`);

      // Actualitzar detall local
      await carregarDetall();
      await carregarHistorial();

      // Notificar al pare (Dashboard) perquè actualitzi la llista
      if (onIncidenciaActualitzada) {
        onIncidenciaActualitzada(incidencia.id, { estat: nouEstat });
      }
    } catch (err) {
      console.error('❌ Error canviant estat:', err);
      const msg = err.response?.data?.missatge || 'Error en canviar l\'estat';
      setErrorAccio(msg);
    } finally {
      setCanviantEstat(false);
    }
  };

  // ------- ACCIÓ: Assignació automàtica -------
  const handleAssignacioAutomatica = async () => {
    try {
      setAssignantAuto(true);
      setErrorAccio(null);

      const resposta = await assignacioAutomatica(incidencia.id);

      mostrarExit(
        `Assignació automàtica realitzada: ${resposta.algorisme?.indicatiu_seleccionat || 'OK'}`
      );

      await carregarDetall();
      await carregarHistorial();

      if (onIncidenciaActualitzada) {
        onIncidenciaActualitzada(incidencia.id, { estat: 'assignada' });
      }
    } catch (err) {
      console.error('❌ Error en assignació automàtica:', err);
      const msg = err.response?.data?.missatge || 'Error en l\'assignació automàtica';
      setErrorAccio(msg);
    } finally {
      setAssignantAuto(false);
    }
  };

  // ------- ACCIÓ: Assignació manual completada -------
  const handleAssignacioManualOk = async () => {
    setMostrarModalManual(false);
    mostrarExit('Assignació manual realitzada correctament');
    await carregarDetall();
    await carregarHistorial();

    if (onIncidenciaActualitzada) {
      onIncidenciaActualitzada(incidencia.id, { estat: 'assignada' });
    }
  };

  // ------- Dades a mostrar (preferim les detallades, sinó les bàsiques) -------
  const inc = detall || incidencia;
  const estatActual = inc?.estat || 'nova';
  const transicions = TRANSICIONS_PERMESES[estatActual] || [];
  const esTancada = estatActual === 'tancada';

  // =====================================================
  // RENDER: Estat de càrrega inicial
  // =====================================================
  if (!inc) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const colors = COLOR_PRIORITAT[inc.prioritat] || COLOR_PRIORITAT.baixa;

  // =====================================================
  // RENDER PRINCIPAL
  // =====================================================
  return (
    <>
      {/* ── CONTENIDOR PRINCIPAL ── */}
      <div className="flex flex-col h-full bg-white">

        {/* ══ CAPÇALERA ══ */}
        <div className={`p-4 border-b-4 ${colors.border}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <BadgePrioritat prioritat={inc.prioritat} />
                <BadgeEstat estat={inc.estat} />
              </div>
              <h2 className="text-base font-bold text-gray-800 mt-2 capitalize">
                {inc.tipologia}
              </h2>
              {inc.direccio && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  📍 {inc.direccio}
                </p>
              )}
            </div>
            <button
              onClick={onTancar}
              className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-600 text-xl leading-none"
              aria-label="Tancar detall"
            >
              ×
            </button>
          </div>
        </div>

        {/* ══ SCROLL INTERN ══ */}
        <div className="flex-1 overflow-y-auto">

          {/* Missatge d'èxit */}
          {missatgeExit && (
            <div className="mx-4 mt-3 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm flex items-center gap-2">
              <span>✅</span> {missatgeExit}
            </div>
          )}

          {/* Missatge d'error d'acció */}
          {errorAccio && (
            <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-center gap-2">
              <span>⚠️</span> {errorAccio}
              <button
                onClick={() => setErrorAccio(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          )}

          {/* Error de càrrega principal */}
          {error && (
            <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* ── SECCIÓ: Informació general ── */}
          <section className="p-4 border-b">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Informació general
            </h3>

            {carregantDetall ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <dl className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <dt className="text-gray-500 w-24 flex-shrink-0">Rebuda:</dt>
                  <dd className="text-gray-800">
                    {formatarData(inc.timestamp_recepcio)}
                    <span className="text-gray-400 ml-1 text-xs">
                      ({tempsRelatiu(inc.timestamp_recepcio)})
                    </span>
                  </dd>
                </div>

                {inc.ubicacio_lat && inc.ubicacio_lon && (
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-24 flex-shrink-0">Coordenades:</dt>
                    <dd className="text-gray-800 font-mono text-xs">
                      {parseFloat(inc.ubicacio_lat).toFixed(5)},&nbsp;
                      {parseFloat(inc.ubicacio_lon).toFixed(5)}
                    </dd>
                  </div>
                )}

                <div className="flex gap-2">
                  <dt className="text-gray-500 w-24 flex-shrink-0">Descripció:</dt>
                  <dd className="text-gray-800">{inc.descripcio || '—'}</dd>
                </div>

                {inc.observacions && (
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-24 flex-shrink-0">Observacions:</dt>
                    <dd className="text-gray-800">{inc.observacions}</dd>
                  </div>
                )}

                {inc.data_tancament && (
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-24 flex-shrink-0">Tancada:</dt>
                    <dd className="text-gray-800">{formatarData(inc.data_tancament)}</dd>
                  </div>
                )}
              </dl>
            )}
          </section>

          {/* ── SECCIÓ: Accions ── */}
          {!esTancada && (
            <section className="p-4 border-b">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Accions
              </h3>

              <div className="space-y-2">

                {/* Assignació automàtica — només si la incidència és "nova" */}
                {estatActual === 'nova' && (
                  <button
                    onClick={handleAssignacioAutomatica}
                    disabled={assignantAuto || canviantEstat}
                    className={`w-full py-2 px-3 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                      assignantAuto
                        ? 'bg-blue-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {assignantAuto ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Cercant patrulla...
                      </>
                    ) : (
                      <>⚡ Assignació automàtica</>
                    )}
                  </button>
                )}

                {/* Assignació manual — només si és "nova" */}
                {estatActual === 'nova' && (
                  <button
                    onClick={() => setMostrarModalManual(true)}
                    disabled={assignantAuto || canviantEstat}
                    className="w-full py-2 px-3 rounded text-sm font-medium border border-blue-600 text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    👮 Assignar manualment
                  </button>
                )}

                {/* Canvi d'estat — botons per les transicions permeses */}
                {transicions.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1.5">Canviar estat:</p>
                    <div className="flex flex-wrap gap-2">
                      {transicions.map((nouEstat) => (
                        <button
                          key={nouEstat}
                          onClick={() => handleCanviarEstat(nouEstat)}
                          disabled={canviantEstat || assignantAuto}
                          className={`py-1.5 px-3 rounded text-xs font-medium border transition-colors ${
                            canviantEstat
                              ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400'
                              : nouEstat === 'tancada'
                              ? 'border-gray-400 text-gray-600 hover:bg-gray-100'
                              : 'border-purple-500 text-purple-700 hover:bg-purple-50'
                          }`}
                        >
                          {canviantEstat ? '...' : `→ ${ETIQUETA_ESTAT[nouEstat]}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── SECCIÓ: Historial / Timeline ── */}
          <section className="p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Historial d'accions
              {historial.length > 0 && (
                <span className="ml-2 bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">
                  {historial.length}
                </span>
              )}
            </h3>

            {carregantHistorial ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : historial.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                Sense accions registrades
              </p>
            ) : (
              <div>
                {historial.map((event) => (
                  <FilaHistorial key={event.id} event={event} />
                ))}
              </div>
            )}
          </section>

        </div>
        {/* ── Fi scroll intern ── */}

      </div>
      {/* ── Fi contenidor principal ── */}

      {/* ── MODAL ASSIGNACIÓ MANUAL ── */}
      {mostrarModalManual && (
        <ModalAssignacioManual
          incidencia={inc}
          onTancar={() => setMostrarModalManual(false)}
          onAssignat={handleAssignacioManualOk}
        />
      )}
    </>
  );
}

export default DetallIncidencia;