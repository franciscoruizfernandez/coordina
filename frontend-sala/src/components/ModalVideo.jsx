// src/components/ModalVideo.jsx

import { useEffect, useRef } from 'react';

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

function ModalVideo({ stream, onTancar }) {
  const modalRef = useRef(null);

  // ─── Tancar amb Escape ──────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onTancar();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Bloquejar scroll del body mentre el modal és obert
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onTancar]);

  // Si no hi ha stream, no renderitzem res
  if (!stream) return null;

  const icona = ICONA_FONT[stream.tipus_font] || '📹';
  const etiqueta = ETIQUETA_FONT[stream.tipus_font] || stream.tipus_font;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[3000] flex items-center justify-center"
      onClick={onTancar}
    >
      {/* ─── Fons fosc (backdrop) ──────────────────── */}
      <div className="absolute inset-0 bg-black bg-opacity-80" />

      {/* ─── Contenidor del modal ──────────────────── */}
      <div
        className="relative w-full max-w-5xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Capçalera ───────────────────────────── */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Indicador de directe */}
            <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white text-xs font-bold">EN DIRECTE</span>
            </div>

            {/* Info del stream */}
            <div className="flex items-center gap-2">
              <span className="text-xl">{icona}</span>
              <span className="text-white text-sm font-medium">
                {etiqueta}
              </span>
              {stream.indicatiu_codi && (
                <span className="text-gray-400 text-sm">
                  — {stream.indicatiu_codi}
                </span>
              )}
            </div>
          </div>

          {/* Botó tancar */}
          <button
            onClick={onTancar}
            className="text-gray-400 hover:text-white text-3xl leading-none
                       transition-colors w-10 h-10 flex items-center justify-center
                       rounded-full hover:bg-white/10"
            aria-label="Tancar modal de vídeo"
          >
            ×
          </button>
        </div>

        {/* ─── Reproductor de vídeo ────────────────── */}
        <div className="relative w-full rounded-xl overflow-hidden bg-black shadow-2xl"
             style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={`${stream.url_stream}?autoplay=1&controls=1&rel=0&modestbranding=1`}
            title={`Stream ${etiqueta}`}
            className="absolute inset-0 w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>

        {/* ─── Peu informatiu ──────────────────────── */}
        <div className="flex items-center justify-between mt-3">
          <p className="text-gray-500 text-xs">
            Prem Escape o clica fora per tancar
          </p>

          {/* Botó pantalla completa nativa */}
          <button
            onClick={() => {
              const iframe = document.querySelector('.modal-video-iframe');
              if (iframe && iframe.requestFullscreen) {
                iframe.requestFullscreen();
              }
            }}
            className="text-gray-400 hover:text-white text-sm flex items-center
                       gap-1 transition-colors"
          >
            ⛶ Pantalla completa
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalVideo;