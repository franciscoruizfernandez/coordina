// src/components/DetallIndicatiu.jsx

import { useState, useEffect, useCallback } from "react";
import {
  getIndicatiu,
  getHistorialIndicatiu,
  getIncidencia,
} from "../services/api";

// =====================================================
// CONSTANTS I HELPERS
// =====================================================

const COLOR_ESTAT = {
  disponible: "bg-green-100 text-green-800",
  en_servei: "bg-blue-100 text-blue-800",
  no_disponible: "bg-gray-100 text-gray-600",
  finalitzat: "bg-slate-200 text-slate-700",
};

const ETIQUETA_ESTAT = {
  disponible: "Disponible",
  en_servei: "En servei",
  no_disponible: "No disponible",
  finalitzat: "Finalitzat",
};

const ETIQUETA_TIPUS = {
  cotxe: "🚔 Cotxe",
  moto: "🏍️ Moto",
  furgo: "🚐 Furgó",
};

const ICONA_EVENT = {
  creacio_indicatiu: "🆕",
  actualitzacio_gps: "📍",
  canvi_estat_indicatiu: "🔄",
  assignacio_creada: "📋",
  assignacio_acceptada: "✅",
  assignacio_finalitzada: "🏁",
  assignacio_cancel_lada: "❌",
  default: "📌",
};

const COLOR_PRIORITAT = {
  critica: { bg: "bg-red-100", text: "text-red-800", dot: "#DC2626" },
  alta: { bg: "bg-orange-100", text: "text-orange-800", dot: "#F97316" },
  mitjana: { bg: "bg-yellow-100", text: "text-yellow-800", dot: "#FBBF24" },
  baixa: { bg: "bg-green-100", text: "text-green-800", dot: "#10B981" },
};

const formatarData = (timestamp) => {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleString("ca-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

// =====================================================
// SUB-COMPONENTS
// =====================================================

function BadgeEstat({ estat }) {
  const colors = COLOR_ESTAT[estat] || "bg-gray-100 text-gray-600";
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors}`}
    >
      {ETIQUETA_ESTAT[estat] || estat}
    </span>
  );
}

function FilaHistorial({ event }) {
  const icona = ICONA_EVENT[event.tipus_esdeveniment] || ICONA_EVENT.default;

  return (
    <div className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm">
        {icona}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-700 leading-snug">{event.descripcio}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatarData(event.timestamp)}
        </p>
      </div>
    </div>
  );
}

// =====================================================
// COMPONENT PRINCIPAL
// =====================================================

function DetallIndicatiu({ indicatiu, onTancar, onVeureIncidencia }) {
  const [detall, setDetall] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [carregantDetall, setCarregantDetall] = useState(true);
  const [carregantHistorial, setCarregantHistorial] = useState(true);
  const [error, setError] = useState(null);
  const [incidenciaAssignada, setIncidenciaAssignada] = useState(null);

  // ------- Carregar detall + incidència assignada -------
  const carregarDetall = useCallback(async () => {
    if (!indicatiu?.id) return;

    try {
      setCarregantDetall(true);
      setError(null);

      const resposta = await getIndicatiu(indicatiu.id);
      const dades = resposta.dades || resposta;
      setDetall(dades);

      if (dades.incidencia_assignada_id) {
        try {
          const resInc = await getIncidencia(dades.incidencia_assignada_id);
          setIncidenciaAssignada(resInc.dades || resInc);
        } catch {
          setIncidenciaAssignada(null);
        }
      } else {
        setIncidenciaAssignada(null);
      }
    } catch (err) {
      console.error("❌ Error carregant detall indicatiu:", err);
      setError("No s'ha pogut carregar el detall de l'indicatiu");
    } finally {
      setCarregantDetall(false);
    }
  }, [indicatiu?.id]);

  // ------- Carregar historial -------
  const carregarHistorial = useCallback(async () => {
    if (!indicatiu?.id) return;

    try {
      setCarregantHistorial(true);
      const resposta = await getHistorialIndicatiu(indicatiu.id);
      setHistorial(resposta.dades || []);
    } catch (err) {
      console.error("❌ Error carregant historial indicatiu:", err);
      setHistorial([]);
    } finally {
      setCarregantHistorial(false);
    }
  }, [indicatiu?.id]);

  // Carregar quan canvia l'indicatiu seleccionat
  useEffect(() => {
    setDetall(null);
    setHistorial([]);
    setIncidenciaAssignada(null);
    carregarDetall();
    carregarHistorial();
  }, [indicatiu?.id, carregarDetall, carregarHistorial]);

  // Sincronitzar canvis live (GPS / estat via socket)
  useEffect(() => {
    if (!indicatiu?.id) return;

    setDetall((prev) => {
      if (!prev) return prev;
      if (prev.id !== indicatiu.id) return prev;
      return { ...prev, ...indicatiu };
    });
  }, [indicatiu]);

  const ind = detall || indicatiu;

  if (!ind) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const teIncidencia = !!ind.incidencia_assignada_id;
  const colorsPrioritat = incidenciaAssignada
    ? COLOR_PRIORITAT[incidenciaAssignada.prioritat] || COLOR_PRIORITAT.baixa
    : null;

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="flex flex-col h-full bg-white">
      {/* ══ CAPÇALERA ══ */}
      <div className="p-4 border-b-4 border-blue-400">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <BadgeEstat estat={ind.estat_operatiu} />
            </div>

            <h2 className="text-base font-bold text-gray-800 mt-2">
              {ind.codi}
            </h2>

            <p className="text-xs text-gray-500 mt-0.5">
              {ETIQUETA_TIPUS[ind.tipus_unitat] || ind.tipus_unitat || "—"}
            </p>
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
        {/* Error de càrrega */}
        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* SECCIÓ 1: INFORMACIÓ GENERAL                  */}
        {/* ══════════════════════════════════════════════ */}
        <section className="p-4 border-b-4 border-gray-200">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Informació general
          </h3>

          {carregantDetall ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-4 bg-gray-100 rounded animate-pulse"
                />
              ))}
            </div>
          ) : (
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="text-gray-500 w-32 flex-shrink-0">Sector:</dt>
                <dd className="text-gray-800">
                  {ind.sector_assignat || "—"}
                </dd>
              </div>

              {ind.ubicacio_lat != null && ind.ubicacio_lon != null && (
                <div className="flex gap-2">
                  <dt className="text-gray-500 w-32 flex-shrink-0">
                    Coordenades:
                  </dt>
                  <dd className="text-gray-800 font-mono text-xs">
                    {parseFloat(ind.ubicacio_lat).toFixed(5)},{" "}
                    {parseFloat(ind.ubicacio_lon).toFixed(5)}
                  </dd>
                </div>
              )}

              <div className="flex gap-2">
                <dt className="text-gray-500 w-32 flex-shrink-0">
                  Últim GPS:
                </dt>
                <dd className="text-gray-800">
                  {formatarData(ind.ultima_actualitzacio_gps)}
                </dd>
              </div>
            </dl>
          )}
        </section>

        {/* ══════════════════════════════════════════════ */}
        {/* SECCIÓ 2: INCIDÈNCIA ACTIVA                   */}
        {/* ══════════════════════════════════════════════ */}
        <section className="p-4 border-b-4 border-gray-200">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Incidència activa
          </h3>

          {carregantDetall ? (
            <div className="h-16 bg-gray-100 rounded animate-pulse" />
          ) : teIncidencia ? (
            <div
              className={`rounded-lg border-2 p-3 ${
                colorsPrioritat
                  ? `${colorsPrioritat.bg} border-current`
                  : "bg-blue-50 border-blue-200"
              }`}
              style={
                colorsPrioritat
                  ? { borderColor: colorsPrioritat.dot }
                  : undefined
              }
            >
              {incidenciaAssignada ? (
                <>
                  {/* Tipologia + prioritat */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-gray-800 capitalize">
                      {incidenciaAssignada.tipologia}
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded text-white font-medium"
                      style={{ backgroundColor: colorsPrioritat?.dot }}
                    >
                      {incidenciaAssignada.prioritat}
                    </span>
                  </div>

                  {/* Direcció */}
                  {incidenciaAssignada.direccio && (
                    <p className="text-xs text-gray-600 mb-3">
                      📍 {incidenciaAssignada.direccio}
                    </p>
                  )}

                  {/* Botó */}
                  {onVeureIncidencia && (
                    <button
                      onClick={() => onVeureIncidencia(incidenciaAssignada)}
                      className="w-full py-2 px-3 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      📋 Veure detalls de la incidència
                    </button>
                  )}
                </>
              ) : (
                /* Encara carregant el nom (tenim ID però no les dades) */
                <div className="text-sm text-gray-600">
                  <p className="font-medium">Incidència assignada</p>
                  <p className="text-xs text-gray-400 font-mono mt-1">
                    {ind.incidencia_assignada_id}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Sense incidència */
            <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center">
              <p className="text-2xl mb-1">📭</p>
              <p className="text-sm font-medium text-gray-500">
                Sense incidència activa
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Aquest indicatiu no té cap incidència assignada
              </p>
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════ */}
        {/* SECCIÓ 3: HISTORIAL                           */}
        {/* ══════════════════════════════════════════════ */}
        <section className="p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Historial
            {historial.length > 0 && (
              <span className="ml-2 bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">
                {historial.length}
              </span>
            )}
          </h3>

          {carregantHistorial ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-10 bg-gray-100 rounded animate-pulse"
                />
              ))}
            </div>
          ) : historial.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">
              Sense historial registrat
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
  );
}

export default DetallIndicatiu;