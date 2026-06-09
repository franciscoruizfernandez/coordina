// src/components/SelectorModeAssignacio.jsx

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { obtenirModeAssignacio, establirModeAssignacio, obtenirMissatgeError } from '../services/api';

function SelectorModeAssignacio() {
  const [mode, setMode] = useState(null);
  const [carregant, setCarregant] = useState(true);
  const [canviant, setCanviant] = useState(false);
  const [mostrarConfirmacio, setMostrarConfirmacio] = useState(null); // null | 'manual' | 'automatic'

  // ─── Càrrega inicial ──────────────────────────────────────
  const carregarMode = useCallback(async () => {
    try {
      setCarregant(true);
      const resposta = await obtenirModeAssignacio();
      setMode(resposta.dades?.mode || 'manual');
    } catch (err) {
      console.error('❌ Error carregant mode:', err);
      setMode('manual');
    } finally {
      setCarregant(false);
    }
  }, []);

  useEffect(() => {
    carregarMode();
  }, [carregarMode]);

  // ─── Obrir confirmació ────────────────────────────────────
  const handleDemanarCanvi = useCallback((nouMode) => {
    if (nouMode === mode || canviant) return;
    setMostrarConfirmacio(nouMode);
  }, [mode, canviant]);

  // ─── Confirmar canvi ──────────────────────────────────────
  const handleConfirmarCanvi = useCallback(async () => {
    const nouMode = mostrarConfirmacio;
    if (!nouMode) return;

    setMostrarConfirmacio(null);

    const esAuto = nouMode === 'automatic';

    const toastId = toast.info(
      esAuto
        ? '⚙️ Activant mode automàtic — processant incidències pendents...'
        : '⚙️ Canviant a mode manual...',
      { autoClose: false, closeOnClick: false }
    );

    try {
      setCanviant(true);
      const resposta = await establirModeAssignacio(nouMode);

      toast.dismiss(toastId);

      const assignades = resposta.dades?.assignacions_creades || 0;

      if (esAuto && assignades > 0) {
        toast.success(
          `✅ Mode automàtic activat! ${assignades} incidència/es assignada/es automàticament.`,
          { autoClose: 6000 }
        );
      } else if (esAuto) {
        toast.success(
          '✅ Mode automàtic activat. No hi havia incidències pendents per assignar.',
          { autoClose: 4000 }
        );
      } else {
        toast.success(
          '✅ Mode manual activat. Les assignacions es faran manualment.',
          { autoClose: 4000 }
        );
      }

      setMode(nouMode);
    } catch (err) {
      toast.dismiss(toastId);
      const missatge = obtenirMissatgeError(err);
      toast.error(`❌ Error canviant mode: ${missatge}`);
      console.error('❌ Error canviant mode:', err);
    } finally {
      setCanviant(false);
    }
  }, [mostrarConfirmacio]);

  // ─── Cancelar confirmació ─────────────────────────────────
  const handleCancellarCanvi = useCallback(() => {
    setMostrarConfirmacio(null);
  }, []);

  // ─── Render ───────────────────────────────────────────────
  if (carregant) {
    return (
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1100]">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-2">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  const esAuto = mode === 'automatic';

  return (
    <>
      {/* ── Switch ── */}
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 z-[1100]"
        role="region"
        aria-label="Mode d'assignació"
      >
        <div
          className={`
            bg-white rounded-lg shadow-lg border
            px-1.5 py-1.5 flex items-center gap-1
            transition-colors duration-300
            ${esAuto ? 'border-green-300' : 'border-gray-200'}
            ${canviant ? 'opacity-70 pointer-events-none' : ''}
          `}
        >
          {/* Botó Manual */}
          <button
            onClick={() => handleDemanarCanvi('manual')}
            disabled={canviant}
            className={`
              px-3 py-1.5 rounded-md text-xs font-semibold
              transition-all duration-200 flex items-center gap-1.5
              ${!esAuto
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }
            `}
            aria-pressed={!esAuto}
            aria-label="Activar mode manual d'assignació"
          >
            <span aria-hidden="true">🖐️</span>
            Manual
          </button>

          {/* Botó Automàtic */}
          <button
            onClick={() => handleDemanarCanvi('automatic')}
            disabled={canviant}
            className={`
              px-3 py-1.5 rounded-md text-xs font-semibold
              transition-all duration-200 flex items-center gap-1.5
              ${esAuto
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }
            `}
            aria-pressed={esAuto}
            aria-label="Activar mode automàtic d'assignació"
          >
            <span aria-hidden="true">⚡</span>
            Auto
          </button>

          {/* Indicador de càrrega */}
          {canviant && (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin ml-1" />
          )}
        </div>
      </div>

      {/* ── Modal de confirmació ── */}
      {mostrarConfirmacio && (
        <>
          {/* Fons fosc */}
          <div
            className="fixed inset-0 bg-black/40 z-[2000]"
            onClick={handleCancellarCanvi}
          />

          {/* Popup centrat */}
          <div className="fixed inset-0 z-[2100] flex items-center justify-center px-4">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-sm w-full p-6 animar-entrada">

              {/* Icona i títol */}
              <div className="text-center mb-4">
                <p className="text-4xl mb-2">
                  {mostrarConfirmacio === 'automatic' ? '⚡' : '🖐️'}
                </p>
                <h3 className="text-lg font-bold text-gray-800">
                  {mostrarConfirmacio === 'automatic'
                    ? 'Activar mode automàtic?'
                    : 'Tornar a mode manual?'
                  }
                </h3>
              </div>

              {/* Explicació dels canvis */}
              <div className="mb-6">
                {mostrarConfirmacio === 'automatic' ? (
                  <div className="space-y-2 text-sm text-gray-600">
                    <p className="font-medium text-gray-700">
                      Això comportarà els següents canvis:
                    </p>
                    <ul className="space-y-1.5 ml-1">
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>El sistema assignarà patrulles automàticament segons proximitat i prioritat</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>Les incidències pendents s'assignaran immediatament</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>Les noves incidències s'assignaran en temps real</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>En alliberar-se una patrulla, se li assignarà la incidència pendent més prioritària</span>
                      </li>
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-gray-600">
                    <p className="font-medium text-gray-700">
                      Això comportarà els següents canvis:
                    </p>
                    <ul className="space-y-1.5 ml-1">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">✓</span>
                        <span>Les assignacions tornaran a ser manuals</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">✓</span>
                        <span>L'operador triarà la patrulla per a cada incidència</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">✓</span>
                        <span>Les assignacions actives no es veuran afectades</span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Botons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancellarCanvi}
                  className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold
                             bg-gray-100 text-gray-700 hover:bg-gray-200
                             transition-colors"
                >
                  Cancel·lar
                </button>
                <button
                  onClick={handleConfirmarCanvi}
                  className={`
                    flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold
                    text-white transition-colors
                    ${mostrarConfirmacio === 'automatic'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                    }
                  `}
                >
                  {mostrarConfirmacio === 'automatic'
                    ? 'Activar automàtic'
                    : 'Activar manual'
                  }
                </button>
              </div>

            </div>
          </div>
        </>
      )}
    </>
  );
}

export default SelectorModeAssignacio;