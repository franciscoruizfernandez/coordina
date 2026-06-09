// src/components/admin/FormulariIndicatiu.jsx

import { useState, useCallback } from 'react';
import { obtenirMissatgeError } from '../../services/api';
import api from '../../services/api';

const TIPUS_UNITAT = [
  { valor: 'cotxe',     etiqueta: 'Cotxe',     icona: '🚔' },
  { valor: 'moto',      etiqueta: 'Moto',      icona: '🏍️' },
  { valor: 'furgoneta', etiqueta: 'Furgoneta', icona: '🚐' },
];

function FormulariIndicatiu({ onIndicatiuCreat }) {
  const [formulari, setFormulari] = useState({
    codi:            '',
    tipus_unitat:    'cotxe',
    sector_assignat: '',
    ubicacio_lat:    '',
    ubicacio_lon:    '',
  });
  const [enviant, setEnviant] = useState(false);
  const [error, setError] = useState(null);

  const handleCanvi = useCallback((camp, valor) => {
    setFormulari((prev) => ({ ...prev, [camp]: valor }));
    setError(null);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!formulari.codi.trim()) {
      setError('El codi de l\'indicatiu és obligatori');
      return;
    }

    // Preparar dades
    const dades = {
      codi:            formulari.codi.trim().toUpperCase(),
      tipus_unitat:    formulari.tipus_unitat,
      sector_assignat: formulari.sector_assignat.trim() || null,
    };

    // Afegir coordenades si s'han proporcionat
    if (formulari.ubicacio_lat && formulari.ubicacio_lon) {
      const lat = parseFloat(formulari.ubicacio_lat);
      const lon = parseFloat(formulari.ubicacio_lon);

      if (isNaN(lat) || lat < -90 || lat > 90) {
        setError('La latitud ha de ser un número entre -90 i 90');
        return;
      }
      if (isNaN(lon) || lon < -180 || lon > 180) {
        setError('La longitud ha de ser un número entre -180 i 180');
        return;
      }

      dades.ubicacio_lat = lat;
      dades.ubicacio_lon = lon;
    }

    try {
      setEnviant(true);
      setError(null);

      await api.post('/indicatius', dades);

      setFormulari({
        codi:            '',
        tipus_unitat:    'cotxe',
        sector_assignat: '',
        ubicacio_lat:    '',
        ubicacio_lon:    '',
      });

      onIndicatiuCreat?.();
    } catch (err) {
      const missatge = obtenirMissatgeError(err);
      setError(missatge);
    } finally {
      setEnviant(false);
    }
  }, [formulari, onIndicatiuCreat]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-1">
        Crear nou indicatiu
      </h2>
      <p className="text-sm text-gray-500 mb-5">
        Afegeix una nova patrulla al sistema
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Codi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Codi *
          </label>
          <input
            type="text"
            value={formulari.codi}
            onChange={(e) => handleCanvi('codi', e.target.value)}
            placeholder="ex: A-101"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors
                       uppercase"
            disabled={enviant}
          />
        </div>

        {/* Tipus d'unitat */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipus d'unitat *
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TIPUS_UNITAT.map(({ valor, etiqueta, icona }) => (
              <button
                key={valor}
                type="button"
                onClick={() => handleCanvi('tipus_unitat', valor)}
                disabled={enviant}
                className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg border-2
                  text-xs font-medium transition-all
                  ${formulari.tipus_unitat === valor
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
              >
                <span className="text-2xl">{icona}</span>
                <span>{etiqueta}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sector assignat
          </label>
          <input
            type="text"
            value={formulari.sector_assignat}
            onChange={(e) => handleCanvi('sector_assignat', e.target.value)}
            placeholder="ex: Zona Nord"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            disabled={enviant}
          />
        </div>

        {/* Coordenades inicials */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Coordenades inicials
              <span className="text-gray-400 font-normal ml-1">(opcional)</span>
            </label>
            <button
              type="button"
              onClick={() => {
                const lat = (41.41 + Math.random() * (41.75 - 41.41)).toFixed(6);
                const lon = (1.97 + Math.random() * (2.77 - 1.97)).toFixed(6);
                handleCanvi('ubicacio_lat', lat);
                handleCanvi('ubicacio_lon', lon);
              }}
              disabled={enviant}
              className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-300
                         px-2 py-1 rounded-md hover:bg-amber-100 transition-colors
                         disabled:opacity-50"
            >
              📍 Aleatòries RPMN
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={formulari.ubicacio_lat}
              onChange={(e) => handleCanvi('ubicacio_lat', e.target.value)}
              placeholder="Latitud"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              disabled={enviant}
            />
            <input
              type="text"
              value={formulari.ubicacio_lon}
              onChange={(e) => handleCanvi('ubicacio_lon', e.target.value)}
              placeholder="Longitud"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              disabled={enviant}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Botó */}
        <button
          type="submit"
          disabled={enviant}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                     text-white font-semibold py-2.5 px-4 rounded-lg
                     transition-colors flex items-center justify-center gap-2"
        >
          {enviant ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creant...
            </>
          ) : (
            <>🚔 Crear indicatiu</>
          )}
        </button>
      </form>
    </div>
  );
}

export default FormulariIndicatiu;