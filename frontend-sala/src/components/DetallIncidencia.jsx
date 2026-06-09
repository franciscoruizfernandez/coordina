// src/components/DetallIncidencia.jsx

import { useState, useEffect, useCallback, memo } from 'react';
import { toast } from 'react-toastify';
import {
  getIncidencia,
  getHistorialIncidencia,
  canviarEstatIncidencia,
  assignacioAutomatica,
  getIndicatiusActiusPerIncidencia,
} from '../services/api';
import ModalAssignacioManual from './ModalAssignacioManual';
import VideoPlayer from './VideoPlayer';
import ModalVideo from './ModalVideo';
import TempsRelatiu from './TempsRelatiu';

// =====================================================
// CONSTANTS I HELPERS VISUALS
// =====================================================

const COLOR_PRIORITAT = {
  critica: { bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-400',    dot: 'bg-red-500'    },
  alta:    { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-400', dot: 'bg-orange-500' },
  mitjana: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-400', dot: 'bg-yellow-500' },
  baixa:   { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-400',  dot: 'bg-green-500'  },
};

const COLOR_ESTAT = {
  nova:      'bg-blue-100 text-blue-800',
  assignada: 'bg-purple-100 text-purple-800',
  en_curs:   'bg-yellow-100 text-yellow-800',
  resolta:   'bg-green-100 text-green-800',
  tancada:   'bg-gray-100 text-gray-600',
};

const TRANSICIONS_PERMESES = {
  nova:      ['assignada', 'tancada'],
  assignada: ['en_curs', 'nova', 'tancada'],
  en_curs:   ['resolta', 'tancada'],
  resolta:   ['tancada'],
  tancada:   [],
};

const ETIQUETA_ESTAT = {
  nova:      'Nova',
  assignada: 'Assignada',
  en_curs:   'En curs',
  resolta:   'Resolta',
  tancada:   'Tancada',
};

const ICONA_TIPUS_ESDEVENIMENT = {
  creacio_incidencia:     '🆕',
  modificacio_incidencia: '✏️',
  canvi_estat_incidencia: '🔄',
  assignacio_creada:      '📋',
  assignacio_acceptada:   '✅',
  assignacio_finalitzada: '🏁',
  assignacio_cancel_lada: '❌',
  tancament_incidencia:   '🔒',
  default:                '📌',
};

const ETIQUETA_TIPUS_UNITAT = {
  cotxe:     '🚔 Cotxe',
  moto:      '🏍️ Moto',
  furgoneta: '🚐 Furgoneta',
};

const formatarData = (timestamp) => {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString('ca-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

// =====================================================
// SUB-COMPONENTS MEMORITZATS
// =====================================================

const FilaHistorial = memo(function FilaHistorial({ event }) {
  const icona = ICONA_TIPUS_ESDEVENIMENT[event.tipus_esdeveniment]
    || ICONA_TIPUS_ESDEVENIMENT.default;

  return (
    <div className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm">
        {icona}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-700 leading-snug">{event.descripcio}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          <TempsRelatiu timestamp={event.timestamp} className="text-gray-400" />
          <span className="ml-1">— {formatarData(event.timestamp)}</span>
        </p>
      </div>
    </div>
  );
});

const BadgePrioritat = memo(function BadgePrioritat({ prioritat }) {
  const colors = COLOR_PRIORITAT[prioritat] || COLOR_PRIORITAT.baixa;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
      <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
      {prioritat?.charAt(0).toUpperCase() + prioritat?.slice(1)}
    </span>
  );
});

const BadgeEstat = memo(function BadgeEstat({ estat }) {
  const colors = COLOR_ESTAT[estat] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors}`}>
      {ETIQUETA_ESTAT[estat] || estat}
    </span>
  );
});

// ── Tarjeta d'un indicatiu assignat ──────────────────────────
const TarjetaIndicatiuAssignat = memo(function TarjetaIndicatiuAssignat({ indicatiu }) {
  const esReforc    = indicatiu.tipus_assignacio === 'reforc';
  const haAcceptat  = !!indicatiu.timestamp_acceptacio;

  return (
    <div className={`flex items-center justify-between p-2.5 rounded-lg border
      ${esReforc
        ? 'bg-orange-50 border-orange-200'
        : 'bg-blue-50 border-blue-200'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base flex-shrink-0">
          {ETIQUETA_TIPUS_UNITAT[indicatiu.tipus_unitat]?.split(' ')[0] || '🚔'}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-800 truncate">
            {indicatiu.codi}
          </p>
          <p className="text-xs text-gray-500">
            {ETIQUETA_TIPUS_UNITAT[indicatiu.tipus_unitat] || indicatiu.tipus_unitat}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Badge principal / reforç */}
        <span className={`px-1.5 py-0.5 rounded text-xs font-medium
          ${esReforc
            ? 'bg-orange-100 text-orange-700'
            : 'bg-blue-100 text-blue-700'
          }`}
        >
          {esReforc ? '🔰 Reforç' : '⭐ Principal'}
        </span>

        {/* Badge acceptació */}
        <span className={`px-1.5 py-0.5 rounded text-xs font-medium
          ${haAcceptat
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-500'
          }`}
        >
          {haAcceptat ? '✅' : '⏳'}
        </span>
      </div>
    </div>
  );
});

// =====================================================
// COMPONENT PRINCIPAL
// =====================================================

function DetallIncidencia({ incidencia, onTancar, onIncidenciaActualitzada }) {
  const [detall, setDetall]                           = useState(null);
  const [historial, setHistorial]                     = useState([]);
  const [indicatiusAssignats, setIndicatiusAssignats] = useState([]);
  const [carregantDetall, setCarregantDetall]         = useState(true);
  const [carregantHistorial, setCarregantHistorial]   = useState(true);
  const [carregantIndicatius, setCarregantIndicatius] = useState(false);
  const [error, setError]                             = useState(null);
  const [canviantEstat, setCanviantEstat]             = useState(false);
  const [assignantAuto, setAssignantAuto]             = useState(false);
  const [mostrarModalManual, setMostrarModalManual]   = useState(false);
  const [streamAmpliat, setStreamAmpliat]             = useState(null);

  // ─── Carregar detall ─────────────────────────────────────────
  const carregarDetall = useCallback(async () => {
    if (!incidencia?.id) return;
    try {
      setCarregantDetall(true);
      setError(null);
      const resposta = await getIncidencia(incidencia.id);
      setDetall(resposta.dades || resposta);
    } catch (err) {
      console.error('❌ Error carregant detall:', err);
      setError("No s'ha pogut carregar el detall de la incidència");
    } finally {
      setCarregantDetall(false);
    }
  }, [incidencia?.id]);

  // ─── Carregar historial ──────────────────────────────────────
  const carregarHistorial = useCallback(async () => {
    if (!incidencia?.id) return;
    try {
      setCarregantHistorial(true);
      const resposta = await getHistorialIncidencia(incidencia.id);
      setHistorial(resposta.dades || []);
    } catch (err) {
      console.error('❌ Error carregant historial:', err);
      setHistorial([]);
    } finally {
      setCarregantHistorial(false);
    }
  }, [incidencia?.id]);

  // ─── Carregar indicatius assignats actius ────────────────────
  const carregarIndicatiusAssignats = useCallback(async () => {
    if (!incidencia?.id) return;
    try {
      setCarregantIndicatius(true);
      const resposta = await getIndicatiusActiusPerIncidencia(incidencia.id);
      // El backend retorna { exit, total, dades: [...] } o 404 si no n'hi ha
      setIndicatiusAssignats(resposta.dades || []);
    } catch (err) {
      // 404 vol dir que no hi ha assignacions actives, no és un error real
      if (err.response?.status === 404) {
        setIndicatiusAssignats([]);
      } else {
        console.error('❌ Error carregant indicatius assignats:', err);
        setIndicatiusAssignats([]);
      }
    } finally {
      setCarregantIndicatius(false);
    }
  }, [incidencia?.id]);

  useEffect(() => {
    setDetall(null);
    setHistorial([]);
    setIndicatiusAssignats([]);
    carregarDetall();
    carregarHistorial();
    carregarIndicatiusAssignats();
  }, [incidencia?.id, carregarDetall, carregarHistorial, carregarIndicatiusAssignats]);

  // ─── Helpers de recàrrega agrupats ──────────────────────────
  const recarregarTot = useCallback(async () => {
    await Promise.all([
      carregarDetall(),
      carregarHistorial(),
      carregarIndicatiusAssignats(),
    ]);
  }, [carregarDetall, carregarHistorial, carregarIndicatiusAssignats]);

  // ─── Accions ────────────────────────────────────────────────
  const handleCanviarEstat = useCallback(async (nouEstat) => {
    try {
      setCanviantEstat(true);
      await canviarEstatIncidencia(incidencia.id, nouEstat);
      toast.success(`✅ Estat canviat a "${ETIQUETA_ESTAT[nouEstat]}" correctament`);
      await recarregarTot();
      if (onIncidenciaActualitzada) {
        onIncidenciaActualitzada(incidencia.id, { estat: nouEstat });
      }
    } catch (err) {
      console.error('❌ Error canviant estat:', err);
      toast.error(`⚠️ ${err.response?.data?.missatge || "Error en canviar l'estat"}`);
    } finally {
      setCanviantEstat(false);
    }
  }, [incidencia?.id, recarregarTot, onIncidenciaActualitzada]);

  const handleAssignacioAutomatica = useCallback(async () => {
    try {
      setAssignantAuto(true);
      const resposta = await assignacioAutomatica(incidencia.id);
      toast.success(
        `⚡ Assignació automàtica: patrulla ${resposta.algorisme?.indicatiu_seleccionat || 'assignada'} (${resposta.algorisme?.distancia_km || '?'} km)`
      );
      await recarregarTot();
      if (onIncidenciaActualitzada) {
        onIncidenciaActualitzada(incidencia.id, { estat: 'assignada' });
      }
    } catch (err) {
      console.error('❌ Error en assignació automàtica:', err);
      toast.error(`⚠️ ${err.response?.data?.missatge || "Error en l'assignació automàtica"}`);
    } finally {
      setAssignantAuto(false);
    }
  }, [incidencia?.id, recarregarTot, onIncidenciaActualitzada]);

  const handleAssignacioManualOk = useCallback(async () => {
    setMostrarModalManual(false);
    toast.success('👮 Assignació manual realitzada correctament');
    await recarregarTot();
    if (onIncidenciaActualitzada) {
      onIncidenciaActualitzada(incidencia.id, { estat: 'assignada' });
    }
  }, [incidencia?.id, recarregarTot, onIncidenciaActualitzada]);

  // ─── Dades a mostrar ────────────────────────────────────────
  const inc         = detall || incidencia;
  const estatActual = inc?.estat || 'nova';
  const transicions = TRANSICIONS_PERMESES[estatActual] || [];
  const esTancada   = estatActual === 'tancada';
  const esPotAssignar = ['nova', 'assignada', 'en_curs'].includes(estatActual);

  if (!inc) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const colors = COLOR_PRIORITAT[inc.prioritat] || COLOR_PRIORITAT.baixa;

  return (
    <>
      <div className="flex flex-col h-full bg-white">

        {/* ══ CAPÇALERA ══ */}
        <div className={`p-4 border-b-4 ${colors.border}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <BadgePrioritat prioritat={inc.prioritat} />
                <BadgeEstat estat={inc.estat} />
                {/* Badge avisos 112 si n'hi ha més d'un */}
                {inc.num_avisos_112 > 1 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                    📡 {inc.num_avisos_112} avisos 112
                  </span>
                )}
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

          {error && (
            <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* ── Informació general ── */}
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
                      (<TempsRelatiu timestamp={inc.timestamp_recepcio} />)
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
                    <dd className="text-gray-800">
                      {formatarData(inc.data_tancament)}
                      <span className="text-gray-400 ml-1 text-xs">
                        (<TempsRelatiu timestamp={inc.data_tancament} />)
                      </span>
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </section>

          {/* ── Patrulles assignades ── */}
          <section className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Patrulles assignades
              </h3>
              {!carregantIndicatius && indicatiusAssignats.length > 0 && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {indicatiusAssignats.length}
                </span>
              )}
            </div>

            {carregantIndicatius ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : indicatiusAssignats.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-3 text-center">
                <p className="text-2xl mb-1">📭</p>
                <p className="text-xs font-medium text-gray-500">
                  Cap patrulla assignada
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {indicatiusAssignats.map((ind) => (
                  <TarjetaIndicatiuAssignat key={ind.assignacio_id} indicatiu={ind} />
                ))}
              </div>
            )}
          </section>

          {/* ── Accions ── */}
          {!esTancada && (
            <section className="p-4 border-b">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Accions
              </h3>

              <div className="space-y-2">
                {/* Assignació automàtica: disponible si es pot assignar */}
                {esPotAssignar && (
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
                    ) : indicatiusAssignats.length > 0 ? (
                      <>⚡ Afegir patrulla automàticament</>
                    ) : (
                      <>⚡ Assignació automàtica</>
                    )}
                  </button>
                )}

                {/* Assignació manual: disponible si es pot assignar */}
                {esPotAssignar && (
                  <button
                    onClick={() => setMostrarModalManual(true)}
                    disabled={assignantAuto || canviantEstat}
                    className="w-full py-2 px-3 rounded text-sm font-medium border border-blue-600 text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {indicatiusAssignats.length > 0 ? (
                      <>👮 Afegir patrulla manualment</>
                    ) : (
                      <>👮 Assignar manualment</>
                    )}
                  </button>
                )}

                {/* Canvis d'estat */}
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

          {/* ── Vídeo en directe ── */}
          <section className="border-b">
            <h3 className="px-4 pt-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Vídeo en directe
            </h3>
            <VideoPlayer
              incidenciaId={inc.id}
              onAmpliar={(stream) => setStreamAmpliat(stream)}
            />
          </section>

          {/* ── Historial ── */}
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
      </div>

      {mostrarModalManual && (
        <ModalAssignacioManual
          incidencia={inc}
          onTancar={() => setMostrarModalManual(false)}
          onAssignat={handleAssignacioManualOk}
          esReforc={indicatiusAssignats.length > 0}
        />
      )}

      {streamAmpliat && (
        <ModalVideo
          stream={streamAmpliat}
          onTancar={() => setStreamAmpliat(null)}
        />
      )}
    </>
  );
}

export default DetallIncidencia;