// src/pages/DashboardAdmin.jsx

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import FormulariUsuari from '../components/admin/FormulariUsuari';
import FormulariIndicatiu from '../components/admin/FormulariIndicatiu';
import LlistaUsuaris from '../components/admin/LlistaUsuaris';
import LlistaIndicatiusAdmin from '../components/admin/LlistaIndicatiusAdmin';

function DashboardAdmin() {
  const navigate = useNavigate();
  const [pestanyaActiva, setPestanyaActiva] = useState('usuaris');
  const [refrescarUsuaris, setRefrescarUsuaris] = useState(0);
  const [refrescarIndicatius, setRefrescarIndicatius] = useState(0);

  const handleUsuariCreat = useCallback(() => {
    setRefrescarUsuaris((prev) => prev + 1);
    toast.success('✅ Usuari creat correctament');
  }, []);

  const handleIndicatiuCreat = useCallback(() => {
    setRefrescarIndicatius((prev) => prev + 1);
    toast.success('✅ Indicatiu creat correctament');
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-gray-50">

      {/* ── Capçalera fixa ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Panell d'Administració
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Gestió d'usuaris i indicatius del sistema
            </p>
          </div>

          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold
                       px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            🗺️ Anar al Dashboard
          </button>
        </div>

        {/* ── Pestanyes ── */}
        <div className="flex gap-1 mt-4">
          <button
            onClick={() => setPestanyaActiva('usuaris')}
            className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors
              ${pestanyaActiva === 'usuaris'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            👤 Usuaris
          </button>
          <button
            onClick={() => setPestanyaActiva('indicatius')}
            className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors
              ${pestanyaActiva === 'indicatius'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            🚔 Indicatius
          </button>
        </div>
      </div>

      {/* ── Contingut amb scroll ── */}
      <div className="p-6">
        {pestanyaActiva === 'usuaris' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
            <FormulariUsuari onUsuariCreat={handleUsuariCreat} />
            <LlistaUsuaris clauRefresc={refrescarUsuaris} />
          </div>
        )}

        {pestanyaActiva === 'indicatius' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
            <FormulariIndicatiu onIndicatiuCreat={handleIndicatiuCreat} />
            <LlistaIndicatiusAdmin clauRefresc={refrescarIndicatius} />
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardAdmin;