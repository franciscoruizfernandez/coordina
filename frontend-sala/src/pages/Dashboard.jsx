// src/pages/Dashboard.jsx
import { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import Mapa from '../components/Mapa';
import { getIncidencies, getIndicatius } from '../services/api';
import { SocketContext } from '../context/SocketContext';
import LlistaIncidencies from '../components/LlistaIncidencies';
import DetallIncidencia from '../components/DetallIncidencia';
import {
  reproduirAlertaCritica,
  reproduirNotificacioInfo,
} from '../utils/so';

function Dashboard() {
  const { socket } = useContext(SocketContext);

  const [incidencies, setIncidencies]                       = useState([]);
  const [indicatius, setIndicatius]                         = useState([]);
  const [incidenciaSeleccionada, setIncidenciaSeleccionada] = useState(null);
  const [carregant, setCarregant]                           = useState(true);
  const [error, setError]                                   = useState(null);

  // ===============================
  // CÀRREGA INICIAL DE DADES
  // ===============================
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

  // ===============================
  // WEBSOCKET TEMPS REAL
  // ===============================
  useEffect(() => {
    if (!socket) return;

    // ── Nova incidència rebuda ──
    socket.on('nova_incidencia', (data) => {
      const inc = data.incidencia;
      setIncidencies((prev) => [...prev, inc]);

      if (inc.prioritat === 'critica') {
        // Incidència crítica → toast d'error (vermell) + so triple
        toast.error(
          `🚨 INCIDÈNCIA CRÍTICA: ${inc.tipologia?.toUpperCase()}${inc.direccio ? ` — ${inc.direccio}` : ''}`,
          {
            autoClose: 8000,      // 8 segons (més temps per a crítiques)
            closeOnClick: false,  // No tancar accidentalment
          }
        );
        reproduirAlertaCritica();
      } else if (inc.prioritat === 'alta') {
        // Alta → toast d'avís (taronja) + so suau
        toast.warning(
          `⚠️ Nova incidència ALTA: ${inc.tipologia}${inc.direccio ? ` — ${inc.direccio}` : ''}`,
          { autoClose: 6000 }
        );
        reproduirNotificacioInfo();
      } else {
        // Mitjana / baixa → toast informatiu (blau)
        toast.info(
          `📋 Nova incidència: ${inc.tipologia}${inc.direccio ? ` — ${inc.direccio}` : ''}`,
          { autoClose: 4000 }
        );
      }
    });

    // ── Actualització GPS d'indicatiu ──
    socket.on('ubicacio_indicatiu', (data) => {
      setIndicatius((prev) =>
        prev.map((ind) =>
          ind.id === data.indicatiu.id ? { ...ind, ...data.indicatiu } : ind
        )
      );
      // Nota: no fem toast aquí perquè és molt freqüent (cada 10s per patrulla)
    });

    // ── Canvi d'estat d'incidència ──
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

    // ── Canvi d'estat d'indicatiu ──
    socket.on('canvi_estat_indicatiu', (data) => {
      setIndicatius((prev) =>
        prev.map((ind) =>
          ind.id === data.indicatiu_id
            ? { ...ind, estat_operatiu: data.estat_nou }
            : ind
        )
      );
    });


    return () => {
      socket.off('nova_incidencia');
      socket.off('ubicacio_indicatiu');
      socket.off('canvi_estat_incidencia');
      socket.off('canvi_estat_indicatiu');
    };
  }, [socket]);

  // ===============================
  // CALLBACK: Sincronitzar estat local
  // ===============================
  const handleIncidenciaActualitzada = (id, canvis) => {
    setIncidencies((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, ...canvis } : inc))
    );
    setIncidenciaSeleccionada((prev) =>
      prev?.id === id ? { ...prev, ...canvis } : prev
    );
  };

  // ===============================
  // ESTATS DE CÀRREGA
  // ===============================
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

  // ===============================
  // RENDER PRINCIPAL
  // ===============================
  return (
    <div className="flex h-screen overflow-hidden">

      {/* PANELL ESQUERRE */}
      <div className="w-80 bg-white border-r border-gray-200 h-full overflow-y-auto flex-shrink-0">
        <LlistaIncidencies
          incidencies={incidencies}
          onSeleccionar={setIncidenciaSeleccionada}
        />
      </div>

      {/* PANELL CENTRAL: Mapa */}
      <div className="flex-1 h-full relative">
        <Mapa
          incidencies={incidencies}
          indicatius={indicatius}
          onSeleccionarIncidencia={setIncidenciaSeleccionada}
        />
      </div>

      {/* PANELL DRET: Detall */}
      {incidenciaSeleccionada && (
        <div className="w-80 bg-white border-l border-gray-200 h-full overflow-hidden flex-shrink-0">
          <DetallIncidencia
            incidencia={incidenciaSeleccionada}
            onTancar={() => setIncidenciaSeleccionada(null)}
            onIncidenciaActualitzada={handleIncidenciaActualitzada}
          />
        </div>
      )}

    </div>
  );
}

export default Dashboard;