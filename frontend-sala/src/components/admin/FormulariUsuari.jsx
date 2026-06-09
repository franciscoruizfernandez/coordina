// src/components/admin/FormulariUsuari.jsx

import { useState, useCallback } from 'react';
import { obtenirMissatgeError } from '../../services/api';
import api from '../../services/api';

const ROLS = [
  { valor: 'operador_sala', etiqueta: 'Operador de Sala', icona: '🖥️' },
  { valor: 'patrulla',      etiqueta: 'Patrulla',         icona: '🚔' },
  { valor: 'administrador', etiqueta: 'Administrador',    icona: '👑' },
];

function FormulariUsuari({ onUsuariCreat }) {
  const [formulari, setFormulari] = useState({
    username:    '',
    password:    '',
    rol:         'operador_sala',
    nom_complet: '',
  });
  const [enviant, setEnviant] = useState(false);
  const [error, setError] = useState(null);

  const handleCanvi = useCallback((camp, valor) => {
    setFormulari((prev) => ({ ...prev, [camp]: valor }));
    setError(null);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    // Validacions bàsiques
    if (!formulari.username.trim() || !formulari.password.trim()) {
      setError('El nom d\'usuari i la contrasenya són obligatoris');
      return;
    }

    if (formulari.username.trim().length < 3) {
      setError('El nom d\'usuari ha de tenir mínim 3 caràcters');
      return;
    }

    if (formulari.password.length < 6) {
      setError('La contrasenya ha de tenir mínim 6 caràcters');
      return;
    }

    try {
      setEnviant(true);
      setError(null);

      await api.post('/auth/register', {
        username:    formulari.username.trim(),
        password:    formulari.password,
        rol:         formulari.rol,
        nom_complet: formulari.nom_complet.trim() || formulari.username.trim(),
      });

      // Resetejar formulari
      setFormulari({
        username:    '',
        password:    '',
        rol:         'operador_sala',
        nom_complet: '',
      });

      onUsuariCreat?.();
    } catch (err) {
      const missatge = obtenirMissatgeError(err);
      setError(missatge);
    } finally {
      setEnviant(false);
    }
  }, [formulari, onUsuariCreat]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-1">
        Crear nou usuari
      </h2>
      <p className="text-sm text-gray-500 mb-5">
        Afegeix un nou usuari al sistema amb el rol corresponent
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Nom d'usuari */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom d'usuari *
          </label>
          <input
            type="text"
            value={formulari.username}
            onChange={(e) => handleCanvi('username', e.target.value)}
            placeholder="ex: operador01"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            disabled={enviant}
            autoComplete="off"
          />
        </div>

        {/* Nom complet */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom complet
          </label>
          <input
            type="text"
            value={formulari.nom_complet}
            onChange={(e) => handleCanvi('nom_complet', e.target.value)}
            placeholder="ex: Joan Garcia López"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            disabled={enviant}
          />
        </div>

        {/* Contrasenya */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contrasenya *
          </label>
          <input
            type="password"
            value={formulari.password}
            onChange={(e) => handleCanvi('password', e.target.value)}
            placeholder="Mínim 6 caràcters"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            disabled={enviant}
            autoComplete="new-password"
          />
        </div>

        {/* Rol */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rol *
          </label>
          <div className="grid grid-cols-1 gap-2">
            {ROLS.map(({ valor, etiqueta, icona }) => (
              <button
                key={valor}
                type="button"
                onClick={() => handleCanvi('rol', valor)}
                disabled={enviant}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2
                  text-sm font-medium transition-all text-left
                  ${formulari.rol === valor
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <span className="text-xl">{icona}</span>
                <span>{etiqueta}</span>
              </button>
            ))}
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
            <>👤 Crear usuari</>
          )}
        </button>
      </form>
    </div>
  );
}

export default FormulariUsuari;