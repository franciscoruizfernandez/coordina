import { useState } from 'react';

function ControlsCapes({ filtres, onCanviFiltres }) {
  const [obert, setObert] = useState(false);

  return (
    <div className="absolute top-3 left-3 z-[1000]" role="region" aria-label="Controls del mapa">

      {/* Botó per obrir/tancar */}
      <button
        onClick={() => setObert(!obert)}
        className="bg-white rounded-lg shadow-lg border border-gray-200
                   px-3 py-2 text-sm font-medium text-gray-700
                   hover:bg-gray-50 transition-colors flex items-center gap-2"
        aria-expanded={obert}
        aria-controls="panell-capes"
        aria-label={obert ? "Tancar controls del mapa" : "Obrir controls del mapa"}
      >
        <span aria-hidden="true">🗂️</span> Capes
        <span className="text-xs text-gray-400" aria-hidden="true">
          {obert ? '▲' : '▼'}
        </span>
      </button>

      {/* Panell de controls */}
      {obert && (
        <div
          id="panell-capes"
          className="mt-2 bg-white rounded-lg shadow-xl border border-gray-200
                     p-4 w-64 animar-entrada"
          role="group"
          aria-label="Filtres de visibilitat"
        >
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Visibilitat del mapa
          </h3>

          {/* Incidències */}
          <fieldset className="mb-4">
            <legend className="text-xs font-medium text-gray-600 mb-2">
              <span aria-hidden="true">📋 </span>Incidències
            </legend>

            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filtres.mostrarTancades}
                onChange={(e) =>
                  onCanviFiltres({ ...filtres, mostrarTancades: e.target.checked })
                }
                className="w-4 h-4 rounded border-gray-300 text-blue-600
                           focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm text-gray-700">
                Mostrar tancades/resoltes
              </span>
            </label>

            <p className="text-xs text-gray-500 mb-1.5" id="label-prioritat-mapa">
              Filtrar per prioritat:
            </p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby="label-prioritat-mapa">
              {[
                { valor: 'totes', etiqueta: 'Totes', color: 'bg-gray-100 text-gray-700' },
                { valor: 'critica', etiqueta: 'Crítica', color: 'bg-red-100 text-red-700' },
                { valor: 'alta', etiqueta: 'Alta', color: 'bg-orange-100 text-orange-700' },
                { valor: 'mitjana', etiqueta: 'Mitjana', color: 'bg-yellow-100 text-yellow-700' },
                { valor: 'baixa', etiqueta: 'Baixa', color: 'bg-green-100 text-green-700' },
              ].map(({ valor, etiqueta, color }) => {
                const actiu = filtres.prioritatMapa === valor;

                return (
                  <button
                    key={valor}
                    onClick={() =>
                      onCanviFiltres({ ...filtres, prioritatMapa: valor })
                    }
                    className={`px-2 py-1 rounded-full text-xs font-medium
                      transition-all ${
                        actiu
                          ? `${color} ring-2 ring-offset-1 ring-blue-400`
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }`}
                    role="radio"
                    aria-checked={actiu}
                    aria-label={`Filtrar per prioritat ${etiqueta}`}
                  >
                    {etiqueta}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Indicatius */}
          <fieldset className="mb-4">
            <legend className="text-xs font-medium text-gray-600 mb-2">
              <span aria-hidden="true">🚔 </span>Patrulles
            </legend>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filtres.mostrarNoDisponibles}
                onChange={(e) =>
                  onCanviFiltres({
                    ...filtres,
                    mostrarNoDisponibles: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded border-gray-300 text-blue-600
                           focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm text-gray-700">
                Mostrar no disponibles
              </span>
            </label>
          </fieldset>

          <div className="border-t border-gray-200 pt-3">
            <p className="text-xs text-gray-400 text-center">
              Els filtres s'apliquen al mapa en temps real
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ControlsCapes;