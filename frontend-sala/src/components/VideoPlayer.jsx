// src/components/VideoPlayer.jsx

import { useState, useEffect } from 'react';
import { getStreamsPerIncidencia } from '../services/api';

// ─── Icones per tipus de font ───────────────────────────────
const ICONA_FONT = {
  camera_vehicle: '🚔',
  drone: '🚁',
  cctv: '📹',
  bodycam: '👮',
};

// ─── Etiquetes per tipus de font ────────────────────────────
const ETIQUETA_FONT = {
  camera_vehicle: 'Càmera vehicle',
  drone: 'Dron',
  cctv: 'CCTV',
  bodycam: 'Bodycam',
};

function VideoPlayer({ incidenciaId, onAmpliar }) {
  const [streams, setStreams] = useState([]);
  const [streamActiu, setStreamActiu] = useState(null);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState(null);

  // ─── Carregar streams de la incidència ──────────────────────
  useEffect(() => {
    if (!incidenciaId) {
      setStreams([]);
      setStreamActiu(null);
      setCarregant(false);
      return;
    }

    const carregar = async () => {
      try {
        setCarregant(true);
        setError(null);

        const resposta = await getStreamsPerIncidencia(incidenciaId);
        const llistaStreams = resposta.dades || [];

        // Filtrar només els actius
        const actius = llistaStreams.filter((s) => s.actiu);

        setStreams(actius);

        // Seleccionar el primer stream per defecte
        if (actius.length > 0) {
          setStreamActiu(actius[0]);
        } else {
          setStreamActiu(null);
        }
      } catch (err) {
        console.error('❌ Error carregant streams:', err);
        setError('No s\'han pogut carregar els streams');
      } finally {
        setCarregant(false);
      }
    };

    carregar();
  }, [incidenciaId]);

  // ─── Si està carregant ──────────────────────────────────────
  if (carregant) {
    return (
      <div className="p-3">
        <div className="h-32 bg-gray-100 rounded animate-pulse flex items-center justify-center">
          <span className="text-gray-400 text-sm">Carregant streams...</span>
        </div>
      </div>
    );
  }

  // ─── Si no hi ha streams ────────────────────────────────────
  if (streams.length === 0) {
    return (
      <div className="p-3">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <span className="text-2xl mb-2 block">📡</span>
          <p className="text-gray-500 text-sm">
            No hi ha streams de vídeo disponibles per a aquesta incidència
          </p>
        </div>
      </div>
    );
  }

  // ─── Render principal ───────────────────────────────────────
  return (
    <div className="p-3">
      {/* ─── Reproductor ───────────────────────────── */}
      {streamActiu && (
        <div className="mb-3">
          {/* Capçalera del reproductor */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {ICONA_FONT[streamActiu.tipus_font] || '📹'}
              </span>
              <span className="text-xs font-medium text-gray-700">
                {ETIQUETA_FONT[streamActiu.tipus_font] || streamActiu.tipus_font}
              </span>
              {streamActiu.indicatiu_codi && (
                <span className="text-xs text-gray-400">
                  — {streamActiu.indicatiu_codi}
                </span>
              )}
            </div>

            {/* Botó ampliar */}
            {onAmpliar && (
              <button
                onClick={() => onAmpliar(streamActiu)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium
                           flex items-center gap-1 transition-colors"
              >
                🔍 Ampliar
              </button>
            )}
          </div>

          {/* Iframe del vídeo */}
          <div className="relative w-full rounded-lg overflow-hidden bg-black"
               style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={`${streamActiu.url_stream}?autoplay=0&controls=1&rel=0&modestbranding=1`}
              title={`Stream ${streamActiu.tipus_font}`}
              className="absolute inset-0 w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Indicador de directe */}
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-500">En directe (simulat)</span>
          </div>
        </div>
      )}

      {/* ─── Llista de streams disponibles ─────────── */}
      {streams.length > 1 && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">
            Fonts disponibles ({streams.length})
          </p>
          <div className="space-y-1">
            {streams.map((stream) => {
              const esActiu = streamActiu?.id === stream.id;

              return (
                <button
                  key={stream.id}
                  onClick={() => setStreamActiu(stream)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-left
                    transition-colors text-sm
                    ${esActiu
                      ? 'bg-blue-50 border border-blue-200 text-blue-800'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                >
                  <span>
                    {ICONA_FONT[stream.tipus_font] || '📹'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs">
                      {ETIQUETA_FONT[stream.tipus_font] || stream.tipus_font}
                    </p>
                    {stream.indicatiu_codi && (
                      <p className="text-xs text-gray-400 truncate">
                        Indicatiu: {stream.indicatiu_codi}
                      </p>
                    )}
                  </div>
                  {esActiu && (
                    <span className="text-xs text-blue-500 font-medium">▶</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;