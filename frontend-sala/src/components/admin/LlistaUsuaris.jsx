// src/components/admin/LlistaUsuaris.jsx

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';

const COLOR_ROL = {
  administrador:  'bg-purple-100 text-purple-800',
  operador_sala:  'bg-blue-100 text-blue-800',
  patrulla:       'bg-green-100 text-green-800',
};

const ICONA_ROL = {
  administrador:  '👑',
  operador_sala:  '🖥️',
  patrulla:       '🚔',
};

function LlistaUsuaris({ clauRefresc }) {
  const [usuaris, setUsuaris] = useState([]);
  const [carregant, setCarregant] = useState(true);
  const [cerca, setCerca] = useState('');

  const carregarUsuaris = useCallback(async () => {
    try {
      setCarregant(true);
      const response = await api.get('/auth/usuaris');
      setUsuaris(response.data.dades || response.data.usuaris || []);
    } catch (err) {
      console.error('❌ Error carregant usuaris:', err);
      setUsuaris([]);
    } finally {
      setCarregant(false);
    }
  }, []);

  useEffect(() => {
    carregarUsuaris();
  }, [carregarUsuaris, clauRefresc]);

  // Filtratge: cerca en username, nom_complet i rol (conté, no comença per)
  const usuarisFiltrats = useMemo(() => {
    if (!cerca.trim()) return usuaris;

    const termeBusca = cerca.toLowerCase().trim();

    return usuaris.filter((u) => {
      const username   = (u.username    || '').toLowerCase();
      const nomComplet = (u.nom_complet || '').toLowerCase();
      const rol        = (u.rol         || '').toLowerCase();

      return (
        username.includes(termeBusca) ||
        nomComplet.includes(termeBusca) ||
        rol.includes(termeBusca)
      );
    });
  }, [usuaris, cerca]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">
          Usuaris registrats
        </h2>
        {!carregant && (
          <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-semibold">
            {usuarisFiltrats.length}/{usuaris.length}
          </span>
        )}
      </div>

      {/* Camp de cerca */}
      {!carregant && usuaris.length > 0 && (
        <div className="mb-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={cerca}
              onChange={(e) => setCerca(e.target.value)}
              placeholder="Cercar per nom, usuari o rol..."
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
      ) : usuaris.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">👤</p>
          <p className="text-sm text-gray-500">Encara no hi ha usuaris registrats</p>
        </div>
      ) : usuarisFiltrats.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-sm text-gray-500">
            Cap usuari coincideix amb "{cerca}"
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {usuarisFiltrats.map((usuari) => (
            <div
              key={usuari.id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100
                         hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl flex-shrink-0">
                  {ICONA_ROL[usuari.rol] || '👤'}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {usuari.nom_complet || usuari.username}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    @{usuari.username}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                  ${COLOR_ROL[usuari.rol] || 'bg-gray-100 text-gray-600'}`}
                >
                  {usuari.rol}
                </span>
                {!usuari.actiu && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                    Inactiu
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LlistaUsuaris;