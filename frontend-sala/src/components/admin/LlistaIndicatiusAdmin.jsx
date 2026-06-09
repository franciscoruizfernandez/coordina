// src/components/admin/LlistaIndicatiusAdmin.jsx

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getIndicatius } from '../../services/api';

const COLOR_ESTAT = {
  disponible:    'bg-green-100 text-green-800',
  en_servei:     'bg-blue-100 text-blue-800',
  no_disponible: 'bg-gray-100 text-gray-600',
  finalitzat:    'bg-slate-200 text-slate-700',
};

const ICONA_TIPUS = {
  cotxe:     '🚔',
  moto:      '🏍️',
  furgoneta: '🚐',
};

function LlistaIndicatiusAdmin({ clauRefresc }) {
  const [indicatius, setIndicatius] = useState([]);
  const [carregant, setCarregant] = useState(true);
  const [cerca, setCerca] = useState('');

  const carregarIndicatius = useCallback(async () => {
    try {
      setCarregant(true);
      const resposta = await getIndicatius();
      setIndicatius(resposta.dades || resposta.indicatius || []);
    } catch (err) {
      console.error('❌ Error carregant indicatius:', err);
      setIndicatius([]);
    } finally {
      setCarregant(false);
    }
  }, []);

  useEffect(() => {
    carregarIndicatius();
  }, [carregarIndicatius, clauRefresc]);

  // Filtratge: cerca en codi, sector, tipus i estat (conté, no comença per)
  const indicatiusFiltrats = useMemo(() => {
    if (!cerca.trim()) return indicatius;

    const termeBusca = cerca.toLowerCase().trim();

    return indicatius.filter((ind) => {
      const codi    = (ind.codi            || '').toLowerCase();
      const sector  = (ind.sector_assignat || '').toLowerCase();
      const tipus   = (ind.tipus_unitat    || '').toLowerCase();
      const estat   = (ind.estat_operatiu  || '').toLowerCase();

      return (
        codi.includes(termeBusca) ||
        sector.includes(termeBusca) ||
        tipus.includes(termeBusca) ||
        estat.includes(termeBusca)
      );
    });
  }, [indicatius, cerca]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">
          Indicatius registrats
        </h2>
        {!carregant && (
          <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-semibold">
            {indicatiusFiltrats.length}/{indicatius.length}
          </span>
        )}
      </div>

      {/* Camp de cerca */}
      {!carregant && indicatius.length > 0 && (
        <div className="mb-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={cerca}
              onChange={(e) => setCerca(e.target.value)}
              placeholder="Cercar per codi, sector, tipus o estat..."
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            {cerca && (
              <button
                onClick={() => setCerca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                           hover:text-gray-600 text-sm"
                aria-label="Esborrar cerca"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {carregant ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : indicatius.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">🚔</p>
          <p className="text-sm text-gray-500">Encara no hi ha indicatius registrats</p>
        </div>
      ) : indicatiusFiltrats.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-sm text-gray-500">
            Cap indicatiu coincideix amb "{cerca}"
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {indicatiusFiltrats.map((ind) => (
            <div
              key={ind.id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100
                         hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl flex-shrink-0">
                  {ICONA_TIPUS[ind.tipus_unitat] || '🚔'}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800">
                    {ind.codi}
                  </p>
                  <p className="text-xs text-gray-400">
                    {ind.sector_assignat || 'Sense sector'}
                    {ind.ubicacio_lat != null && (
                      <span className="ml-2 text-gray-300">
                        📍 GPS actiu
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0
                ${COLOR_ESTAT[ind.estat_operatiu] || 'bg-gray-100 text-gray-600'}`}
              >
                {ind.estat_operatiu}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LlistaIndicatiusAdmin;