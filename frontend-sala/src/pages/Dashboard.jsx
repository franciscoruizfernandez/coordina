import { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import Mapa from '../components/Mapa';
import { getIncidencies, getIndicatius } from '../services/api';
import { SocketContext } from '../context/SocketContext';
import LlistaIncidencies from '../components/LlistaIncidencies';
import DetallIncidencia from '../components/DetallIncidencia';
import DetallIndicatiu from '../components/DetallIndicatiu';
import {
  reproduirAlertaCritica,
  reproduirNotificacioInfo,
} from '../utils/so';

function Dashboard() {
  const { socket } = useContext(SocketContext);

  const [incidencies, setIncidencies] = useState([]);
  const [indicatius, setIndicatius] = useState([]);
  const [incidenciaSeleccionada, setIncidenciaSeleccionada] = useState(null);
  const [indicatiuSeleccionat, setIndicatiuSeleccionat] = useState(null);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function carregar() {
      try {
        setCarregant(true);
        setError(null);

        const dataInc = await getIncidencies();
        const dataInd = await getIndicatius();

        setIncidencies(dataInc.incidencies || dataInc.dades || []);
        setIndicatius(dataInd.dades || dataInd.indicatius || []);
      } catch (err) {
        console.error('❌ Error carregant dades:', err);
        setError("No s'han pogut carregar les dades");
        toast.error("Error en carregar les dades inicials. Comprova la connexió.");
      } finally {
        setCarregant(false);
      }
    }
    carregar();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('nova_incidencia', (data) => {
      const inc = data.incidencia;
      setIncidencies((prev) => [...prev, inc]);

      if (inc.prioritat === 'critica') {
        toast.error(
          `🚨 INCIDÈNCIA CRÍTICA: ${inc.tipologia?.toUpperCase()}${inc.direccio ? ` — ${inc.direccio}` : ''}`,
          {
            autoClose: 8000,
            closeOnClick: false,
          }
        );
        reproduirAlertaCritica();
      } else if (inc.prioritat === 'alta') {
        toast.warning(
          `⚠️ Nova incidència ALTA: ${inc.tipologia}${inc.direccio ? ` — ${inc.direccio}` : ''}`,
          { autoClose: 6000 }
        );
        reproduirNotificacioInfo();
      } else {
        toast.info(
          `📋 Nova incidència: ${inc.tipologia}${inc.direccio ? ` — ${inc.direccio}` : ''}`,
          { autoClose: 4000 }
        );
      }
    });

    socket.on('ubicacio_indicatiu', (data) => {
      setIndicatius((prev) =>
        prev.map((ind) =>
          ind.id === data.indicatiu.id ? { ...ind, ...data.indicatiu } : ind
        )
      );

      setIndicatiuSeleccionat((prev) =>
        prev?.id === data.indicatiu.id ? { ...prev, ...data.indicatiu } : prev
      );
    });

    socket.on('canvi_estat_incidencia', (data) => {
      setIncidencies((prev) =>
        prev.map((inc) =>
          inc.id === data.incidencia_id
            ? { ...inc, estat: data.estat_nou }
            : inc
        )
      );

      setIncidenciaSeleccionada((prev) =>
        prev?.id === data.incidencia_id
          ? { ...prev, estat: data.estat_nou }
          : prev
      );
    });

    socket.on('canvi_estat_indicatiu', (data) => {
      setIndicatius((prev) =>
        prev.map((ind) =>
          ind.id === data.indicatiu_id
            ? { ...ind, estat_operatiu: data.estat_nou }
            : ind
        )
      );

      setIndicatiuSeleccionat((prev) =>
        prev?.id === data.indicatiu_id
          ? { ...prev, estat_operatiu: data.estat_nou }
          : prev
      );
    });

    return () => {
      socket.off('nova_incidencia');
      socket.off('ubicacio_indicatiu');
      socket.off('canvi_estat_incidencia');
      socket.off('canvi_estat_indicatiu');
    };
  }, [socket]);

  const handleIncidenciaActualitzada = (id, canvis) => {
    setIncidencies((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, ...canvis } : inc))
    );

    setIncidenciaSeleccionada((prev) =>
      prev?.id === id ? { ...prev, ...canvis } : prev
    );
  };

  const handleSeleccionarIncidencia = (incidencia) => {
    setIncidenciaSeleccionada(incidencia);
    setIndicatiuSeleccionat(null);
  };

  const handleSeleccionarIndicatiu = (indicatiu) => {
    setIndicatiuSeleccionat(indicatiu);
    setIncidenciaSeleccionada(null);
  };

  const handleTancarDetall = () => {
    setIncidenciaSeleccionada(null);
    setIndicatiuSeleccionat(null);
  };

  if (carregant) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregant dades...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* PANELL ESQUERRE */}
      <div className="w-80 bg-white border-r border-gray-200 h-full overflow-y-auto flex-shrink-0">
        <LlistaIncidencies
          incidencies={incidencies}
          onSeleccionar={handleSeleccionarIncidencia}
        />
      </div>

      {/* MAPA */}
      <div className="flex-1 h-full relative">
        <Mapa
          incidencies={incidencies}
          indicatius={indicatius}
          onSeleccionarIncidencia={handleSeleccionarIncidencia}
          onSeleccionarIndicatiu={handleSeleccionarIndicatiu}
          incidenciaSeleccionada={incidenciaSeleccionada}
          indicatiuSeleccionat={indicatiuSeleccionat}
        />
      </div>

      {/* PANELL DRET: incidència */}
      {incidenciaSeleccionada && (
        <div className="w-80 bg-white border-l border-gray-200 h-full overflow-hidden flex-shrink-0">
          <DetallIncidencia
            incidencia={incidenciaSeleccionada}
            onTancar={handleTancarDetall}
            onIncidenciaActualitzada={handleIncidenciaActualitzada}
          />
        </div>
      )}

      {/* PANELL DRET: indicatiu */}
      {indicatiuSeleccionat && !incidenciaSeleccionada && (
        <div className="w-80 bg-white border-l border-gray-200 h-full overflow-hidden flex-shrink-0">
          <DetallIndicatiu
            indicatiu={indicatiuSeleccionat}
            onTancar={handleTancarDetall}
            onVeureIncidencia={handleSeleccionarIncidencia}
          />
        </div>
      )}
    </div>
  );
}

export default Dashboard;