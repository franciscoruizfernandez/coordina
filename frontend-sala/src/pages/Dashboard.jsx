import { useState, useEffect, useContext, useCallback } from 'react';
import { toast } from 'react-toastify';
import Mapa from '../components/Mapa';
import { getIncidencies, getIndicatius, obtenirMissatgeError } from '../services/api';
import { SocketContext } from '../context/SocketContext';
import LlistaIncidencies from '../components/LlistaIncidencies';
import { SkeletonLlista } from '../components/SkeletonCard';
import DetallIncidencia from '../components/DetallIncidencia';
import DetallIndicatiu from '../components/DetallIndicatiu';
import {
  reproduirAlertaCritica,
  reproduirNotificacioInfo,
} from '../utils/so';

function Dashboard() {
  const { socket } = useContext(SocketContext);

  const [incidencies, setIncidencies] = useState([]);
  const [indicatius, setIndicatius] = useState([]);
  const [incidenciaSeleccionada, setIncidenciaSeleccionada] = useState(null);
  const [indicatiuSeleccionat, setIndicatiuSeleccionat] = useState(null);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState(null);

  const [filtresMapa, setFiltresMapa] = useState({
    mostrarTancades: false,
    mostrarNoDisponibles: true,
    prioritatMapa: 'totes',
  });

  const [mostrarLlistaMobile, setMostrarLlistaMobile] = useState(false);
  const [mostrarDetallMobile, setMostrarDetallMobile] = useState(false);

  const [focusMapa, setFocusMapa] = useState(null);
  const [trajecteActiu, setTrajecteActiu] = useState(null);

  // ─── Càrrega inicial ───────────────────────────────────────
  const carregarDades = useCallback(async () => {
    try {
      setCarregant(true);
      setError(null);

      const dataInc = await getIncidencies();
      const dataInd = await getIndicatius();

      setIncidencies(dataInc.incidencies || dataInc.dades || []);
      setIndicatius(dataInd.dades || dataInd.indicatius || []);
    } catch (err) {
      console.error('❌ Error carregant dades:', err);
      const missatge = obtenirMissatgeError(err);
      setError(missatge);
      toast.error(missatge);
    } finally {
      setCarregant(false);
    }
  }, []);

  useEffect(() => {
    carregarDades();
  }, [carregarDades]);

  // ─── Helper: crear objecte focusMapa segur ─────────────────
  const crearFocus = useCallback((lat, lon) => {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) return null;
    return { lat: latNum, lon: lonNum };
  }, []);

  // ─── Handlers ──────────────────────────────────────────────

  const handleIncidenciaActualitzada = useCallback((id, canvis) => {
    setIncidencies((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, ...canvis } : inc))
    );
    setIncidenciaSeleccionada((prev) =>
      prev?.id === id ? { ...prev, ...canvis } : prev
    );
  }, []);

  const handleSeleccionarIncidencia = useCallback((incidencia, indicatiuOrigen = null) => {
    setIncidenciaSeleccionada(incidencia);
    setIndicatiuSeleccionat(null);
    setMostrarDetallMobile(true);
    setMostrarLlistaMobile(false);

    const focus = crearFocus(incidencia?.ubicacio_lat, incidencia?.ubicacio_lon);
    if (focus) {
      setFocusMapa((prev) => ({
        ...focus,
        seq: (prev?.seq || 0) + 1,
      }));
    }

    if (indicatiuOrigen) {
      const oLat = parseFloat(indicatiuOrigen.ubicacio_lat);
      const oLon = parseFloat(indicatiuOrigen.ubicacio_lon);
      const dLat = parseFloat(incidencia?.ubicacio_lat);
      const dLon = parseFloat(incidencia?.ubicacio_lon);

      if ([oLat, oLon, dLat, dLon].every(Number.isFinite)) {
        setTrajecteActiu({
          origenLat: oLat, origenLon: oLon,
          destiLat: dLat, destiLon: dLon,
        });
      } else {
        setTrajecteActiu(null);
      }
    } else {
      setTrajecteActiu(null);
    }
  }, [crearFocus]);

  const handleSeleccionarIndicatiu = useCallback((indicatiu) => {
    setIndicatiuSeleccionat(indicatiu);
    setIncidenciaSeleccionada(null);
    setMostrarDetallMobile(true);
    setMostrarLlistaMobile(false);

    const focus = crearFocus(indicatiu?.ubicacio_lat, indicatiu?.ubicacio_lon);
    if (focus) {
      setFocusMapa((prev) => ({
        ...focus,
        seq: (prev?.seq || 0) + 1,
      }));
    }

    setTrajecteActiu(null);
  }, [crearFocus]);

  const handleTancarDetall = useCallback(() => {
    setIncidenciaSeleccionada(null);
    setIndicatiuSeleccionat(null);
    setTrajecteActiu(null);
    setMostrarDetallMobile(false);
  }, []);

  // ─── Helper per obrir una incidència des d'un toast ────────
  const handleObrirIncidenciaPerId = useCallback(async (incidenciaId) => {
    // Buscar en les incidències ja carregades
    let inc = incidencies.find((i) => i.id === incidenciaId);

    // Si no la trobem (pot ser nova), recarregar
    if (!inc) {
      try {
        const { getIncidencia } = await import('../services/api');
        const resposta = await getIncidencia(incidenciaId);
        inc = resposta.dades || resposta;
      } catch {
        return;
      }
    }

    if (inc) {
      handleSeleccionarIncidencia(inc);
    }
  }, [incidencies, handleSeleccionarIncidencia]);

  // ─── WebSocket events ──────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on('nova_incidencia', (data) => {
      const inc = data.incidencia;
      setIncidencies((prev) => [...prev, inc]);

      if (inc.prioritat === 'critica') {
        toast.error(
          `🚨 INCIDÈNCIA CRÍTICA: ${inc.tipologia?.toUpperCase()}${inc.direccio ? ` — ${inc.direccio}` : ''}`,
          { autoClose: 8000, closeOnClick: false }
        );
        reproduirAlertaCritica();
      } else if (inc.prioritat === 'alta') {
        toast.warning(
          `⚠️ Nova incidència ALTA: ${inc.tipologia}${inc.direccio ? ` — ${inc.direccio}` : ''}`,
          { autoClose: 6000 }
        );
        reproduirNotificacioInfo();
      } else {
        toast.info(
          `📋 Nova incidència: ${inc.tipologia}${inc.direccio ? ` — ${inc.direccio}` : ''}`,
          { autoClose: 4000 }
        );
      }
    });

    socket.on('ubicacio_indicatiu', (data) => {
      setIndicatius((prev) =>
        prev.map((ind) =>
          ind.id === data.indicatiu.id ? { ...ind, ...data.indicatiu } : ind
        )
      );
      setIndicatiuSeleccionat((prev) =>
        prev?.id === data.indicatiu.id ? { ...prev, ...data.indicatiu } : prev
      );
    });

    socket.on('canvi_estat_incidencia', (data) => {
      setIncidencies((prev) =>
        prev.map((inc) =>
          inc.id === data.incidencia_id
            ? { ...inc, estat: data.estat_nou }
            : inc
        )
      );
      setIncidenciaSeleccionada((prev) =>
        prev?.id === data.incidencia_id
          ? { ...prev, estat: data.estat_nou }
          : prev
      );
    });

    socket.on('canvi_estat_indicatiu', (data) => {
      setIndicatius((prev) =>
        prev.map((ind) =>
          ind.id === data.indicatiu_id
            ? { ...ind, estat_operatiu: data.estat_nou }
            : ind
        )
      );
      setIndicatiuSeleccionat((prev) =>
        prev?.id === data.indicatiu_id
          ? { ...prev, estat_operatiu: data.estat_nou }
          : prev
      );
    });

    // ── Avís 112 unificat ──────────────────────────────────
    socket.on('avis_112_unificat', (data) => {
      // Actualitzar el comptador d'avisos a la incidència
      setIncidencies((prev) =>
        prev.map((inc) =>
          inc.id === data.incidencia_id
            ? { ...inc, num_avisos_112: data.num_avisos_112 }
            : inc
        )
      );
      setIncidenciaSeleccionada((prev) =>
        prev?.id === data.incidencia_id
          ? { ...prev, num_avisos_112: data.num_avisos_112 }
          : prev
      );

      toast.info(
        `📡 Avís 112 unificat: ${data.tipologia} — ${data.direccio || 'sense adreça'} (${data.num_avisos_112} avisos)`,
        { autoClose: 4000 }
      );
    });

    // ── Reforç pendent (mode manual) ───────────────────────
    socket.on('reforc_pendent', (data) => {
      reproduirAlertaCritica();

      toast.warning(
        ({ closeToast }) => (
          <div>
            <p className="font-bold text-sm mb-1">
              🚨 Reforç pendent
            </p>
            <p className="text-xs text-gray-600 mb-2">
              {data.tipologia?.toUpperCase()} — {data.direccio || 'sense adreça'}
            </p>
            <p className="text-xs text-gray-500 mb-2">
              Patrulles: {data.actius}/{data.objectiu}
              {data.escalar && ' — Es recomana un tercer indicatiu'}
            </p>
            <button
              onClick={() => {
                handleObrirIncidenciaPerId(data.incidencia_id);
                closeToast();
              }}
              className="w-full py-1.5 px-3 rounded text-xs font-semibold
                         bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              📋 Veure incidència
            </button>
          </div>
        ),
        {
          autoClose: 15000,
          closeOnClick: false,
        }
      );
    });

    // ── Reforç assignat (mode auto) ────────────────────────
    socket.on('reforc_assignat', (data) => {
      toast.success(
        `🔰 Reforç assignat: ${data.tipologia} — ${data.direccio || ''}`,
        { autoClose: 5000 }
      );
    });

    // ── Incidència assignada (actualitzar indicatius) ──────
    socket.on('incidencia_assignada', (data) => {
      // Actualitzar l'indicatiu amb la nova incidència assignada
      if (data.indicatiu?.id) {
        setIndicatius((prev) =>
          prev.map((ind) =>
            ind.id === data.indicatiu.id
              ? {
                  ...ind,
                  estat_operatiu: 'en_servei',
                  incidencia_assignada_id: data.incidencia?.id || null,
                }
              : ind
          )
        );
      }
    });

    return () => {
      socket.off('nova_incidencia');
      socket.off('ubicacio_indicatiu');
      socket.off('canvi_estat_incidencia');
      socket.off('canvi_estat_indicatiu');
      socket.off('avis_112_unificat');
      socket.off('reforc_pendent');
      socket.off('reforc_assignat');
      socket.off('incidencia_assignada');
    };
  }, [socket, handleObrirIncidenciaPerId]);

  // ─── Pantalla error ────────────────────────────────────────
  if (error && !carregant && incidencies.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center px-6">
          <p className="text-6xl mb-4">⚠️</p>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Error carregant dades
          </h2>
          <p className="text-gray-500 mb-6 max-w-md">{error}</p>
          <button
            onClick={carregarDades}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium
                       px-6 py-3 rounded-lg transition-colors flex items-center
                       gap-2 mx-auto"
          >
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  const hiHaDetallObert = incidenciaSeleccionada || indicatiuSeleccionat;

  const propsMapaComunes = {
    incidencies,
    indicatius,
    onSeleccionarIncidencia: handleSeleccionarIncidencia,
    onSeleccionarIndicatiu: handleSeleccionarIndicatiu,
    incidenciaSeleccionada,
    indicatiuSeleccionat,
    filtres: filtresMapa,
    onCanviFiltres: setFiltresMapa,
    focusMapa,
    trajecteActiu,
  };

  return (
    <div className="relative h-full overflow-hidden bg-gray-100">

      {/* ══ DESKTOP ══ */}
      <div className="hidden lg:flex h-full overflow-hidden">
        <div className="w-80 bg-white border-r border-gray-200 h-full overflow-y-auto flex-shrink-0">
          {carregant ? (
            <SkeletonLlista count={8} />
          ) : (
            <LlistaIncidencies
              incidencies={incidencies}
              onSeleccionar={handleSeleccionarIncidencia}
            />
          )}
        </div>

        <div className="flex-1 h-full relative">
          {carregant ? (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Carregant mapa...</p>
              </div>
            </div>
          ) : (
            <Mapa {...propsMapaComunes} />
          )}
        </div>

        {incidenciaSeleccionada && (
          <div className="w-80 bg-white border-l border-gray-200 h-full overflow-hidden flex-shrink-0">
            <DetallIncidencia
              incidencia={incidenciaSeleccionada}
              onTancar={handleTancarDetall}
              onIncidenciaActualitzada={handleIncidenciaActualitzada}
            />
          </div>
        )}

        {indicatiuSeleccionat && !incidenciaSeleccionada && (
          <div className="w-80 bg-white border-l border-gray-200 h-full overflow-hidden flex-shrink-0">
            <DetallIndicatiu
              indicatiu={indicatiuSeleccionat}
              onTancar={handleTancarDetall}
              onVeureIncidencia={handleSeleccionarIncidencia}
            />
          </div>
        )}
      </div>

      {/* ══ MOBILE / TABLET ══ */}
      <div className="lg:hidden h-full relative">
        {carregant ? (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Carregant mapa...</p>
            </div>
          </div>
        ) : (
          <Mapa {...propsMapaComunes} />
        )}

        <button
          onClick={() => setMostrarLlistaMobile(true)}
          className="absolute top-3 left-3 z-[1200] bg-white shadow-lg border
                     border-gray-200 rounded-lg px-3 py-2 text-sm font-medium
                     text-gray-700 hover:bg-gray-50 transition-colors
                     flex items-center gap-2"
          aria-label="Obrir llista d'incidències"
        >
          ☰ <span className="hidden sm:inline">Incidències</span>
        </button>

        {hiHaDetallObert && (
          <button
            onClick={() => setMostrarDetallMobile(true)}
            className="absolute top-3 right-3 z-[1200] bg-blue-600 shadow-lg
                       rounded-lg px-3 py-2 text-sm font-medium text-white
                       hover:bg-blue-700 transition-colors flex items-center gap-2"
            aria-label="Obrir detall seleccionat"
          >
            📄 <span className="hidden sm:inline">Detall</span>
          </button>
        )}

        {mostrarLlistaMobile && (
          <>
            <div
              className="absolute inset-0 bg-black/40 z-[1300]"
              onClick={() => setMostrarLlistaMobile(false)}
            />
            <div className="absolute top-0 left-0 h-full w-[85vw] max-w-sm bg-white z-[1400] shadow-2xl animar-entrada-dreta">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-semibold text-gray-800">Incidències</h2>
                <button
                  onClick={() => setMostrarLlistaMobile(false)}
                  className="text-gray-400 hover:text-gray-700 text-xl"
                  aria-label="Tancar llista d'incidències"
                >
                  ×
                </button>
              </div>
              <div className="h-[calc(100%-65px)] overflow-y-auto">
                {carregant ? (
                  <SkeletonLlista count={8} />
                ) : (
                  <LlistaIncidencies
                    incidencies={incidencies}
                    onSeleccionar={handleSeleccionarIncidencia}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {mostrarDetallMobile && hiHaDetallObert && (
          <>
            <div
              className="absolute inset-0 bg-black/30 z-[1300]"
              onClick={() => setMostrarDetallMobile(false)}
            />
            <div className="absolute bottom-0 left-0 right-0 h-[75vh] bg-white z-[1400]
                            rounded-t-2xl shadow-2xl overflow-hidden animar-entrada">
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>
              <div className="h-[calc(100%-16px)] overflow-hidden">
                {incidenciaSeleccionada && (
                  <DetallIncidencia
                    incidencia={incidenciaSeleccionada}
                    onTancar={handleTancarDetall}
                    onIncidenciaActualitzada={handleIncidenciaActualitzada}
                  />
                )}
                {indicatiuSeleccionat && !incidenciaSeleccionada && (
                  <DetallIndicatiu
                    indicatiu={indicatiuSeleccionat}
                    onTancar={handleTancarDetall}
                    onVeureIncidencia={handleSeleccionarIncidencia}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;