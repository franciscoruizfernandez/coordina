// backend/sockets/receptors.js

import Indicatiu from '../models/Indicatiu.js';
import Assignacio from '../models/Assignacio.js';
import Incidencia from '../models/Incidencia.js';
import EsdevenimentTracabilitat from '../models/EsdevenimentTracabilitat.js';
import {
  emetreUbicacioIndicatiu,
  emetreCanviEstatIndicatiu,
  emetreSala,
} from './emissors.js';

// ==============================================================
// HELPER: Registrar traçabilitat
// ==============================================================
const registrarEsdeveniment = async (tipus, usuariId, incidenciaId, indicatiuId, descripcio, dades = {}) => {
  try {
    await EsdevenimentTracabilitat.registrar({
      tipus_esdeveniment: tipus,
      usuari_id: usuariId || null,
      incidencia_id: incidenciaId || null,
      indicatiu_id: indicatiuId || null,
      descripcio,
      dades_addicionals: dades,
    });
  } catch (err) {
    console.error('⚠️  Error registrant traçabilitat:', err.message);
  }
};

// ==============================================================
// EVENT 1: actualitzar_ubicacio
// La patrulla envia la seva posició GPS
// ==============================================================
export const handleActualitzarUbicacio = (socket) => {
  socket.on('actualitzar_ubicacio', async (data) => {
    try {
      const { indicatiu_id, ubicacio_lat, ubicacio_lon } = data;
      const { userId } = socket.usuari;

      console.log(`📍 [WS ← Client] actualitzar_ubicacio de ${socket.usuari.username}`);

      // Validar dades
      if (!indicatiu_id || ubicacio_lat === undefined || ubicacio_lon === undefined) {
        return socket.emit('error', {
          codi: 'DADES_INVALIDES',
          missatge: 'Els camps indicatiu_id, ubicacio_lat i ubicacio_lon són obligatoris',
        });
      }

      const lat = parseFloat(ubicacio_lat);
      const lon = parseFloat(ubicacio_lon);

      if (isNaN(lat) || lat < -90 || lat > 90) {
        return socket.emit('error', {
          codi: 'LAT_INVALIDA',
          missatge: 'La latitud ha de ser un número entre -90 i 90',
        });
      }

      if (isNaN(lon) || lon < -180 || lon > 180) {
        return socket.emit('error', {
          codi: 'LON_INVALIDA',
          missatge: 'La longitud ha de ser un número entre -180 i 180',
        });
      }

      // Verificar que l'indicatiu existeix
      const indicatiu = await Indicatiu.trobarPerId(indicatiu_id);
      if (!indicatiu) {
        return socket.emit('error', {
          codi: 'INDICATIU_NO_TROBAT',
          missatge: `Indicatiu ${indicatiu_id} no trobat`,
        });
      }

      // Actualitzar a la BD
      const indicatiuActualitzat = await Indicatiu.actualitzarUbicacio(indicatiu_id, lat, lon);

      // Traçabilitat
      await registrarEsdeveniment(
        'actualitzacio_gps',
        userId,
        indicatiu.incidencia_assignada_id || null,
        indicatiu_id,
        `GPS actualitzat via WebSocket: ${lat}, ${lon}`,
        { lat, lon }
      );

      // Confirmar al client que ha enviat
      socket.emit('ubicacio_actualitzada', {
        exit: true,
        missatge: 'Ubicació actualitzada correctament',
        dades: {
          id: indicatiuActualitzat.id,
          codi: indicatiuActualitzat.codi,
          ubicacio_lat: indicatiuActualitzat.ubicacio_lat,
          ubicacio_lon: indicatiuActualitzat.ubicacio_lon,
        },
      });

      // Re-emetre a la sala de control (perquè actualitzin el mapa)
      emetreUbicacioIndicatiu(indicatiuActualitzat);

      console.log(`✅ GPS actualitzat: ${indicatiu.codi} → (${lat}, ${lon})`);
    } catch (error) {
      console.error('❌ Error actualitzant ubicació via WS:', error);
      socket.emit('error', {
        codi: 'ERROR_INTERN',
        missatge: 'Error actualitzant ubicació',
      });
    }
  });
};

// ==============================================================
// EVENT 2: canviar_estat_operatiu
// La patrulla canvia el seu estat (disponible, en_servei, etc.)
// ==============================================================
export const handleCanviarEstatOperatiu = (socket) => {
  socket.on('canviar_estat_operatiu', async (data) => {
    try {
      const { indicatiu_id, estat_operatiu } = data;
      const { userId } = socket.usuari;

      console.log(`🚔 [WS ← Client] canviar_estat_operatiu: ${estat_operatiu}`);

      // Validar dades
      if (!indicatiu_id || !estat_operatiu) {
        return socket.emit('error', {
          codi: 'DADES_INVALIDES',
          missatge: 'Els camps indicatiu_id i estat_operatiu són obligatoris',
        });
      }

      const estatsValids = ['disponible', 'en_servei', 'no_disponible', 'finalitzat'];
      if (!estatsValids.includes(estat_operatiu)) {
        return socket.emit('error', {
          codi: 'ESTAT_INVALID',
          missatge: `Estat operatiu invàlid. Ha de ser un de: ${estatsValids.join(', ')}`,
        });
      }

      // Verificar que l'indicatiu existeix
      const indicatiu = await Indicatiu.trobarPerId(indicatiu_id);
      if (!indicatiu) {
        return socket.emit('error', {
          codi: 'INDICATIU_NO_TROBAT',
          missatge: `Indicatiu ${indicatiu_id} no trobat`,
        });
      }

      const estatAnterior = indicatiu.estat_operatiu;

      // Actualitzar a la BD
      const indicatiuActualitzat = await Indicatiu.canviarEstat(indicatiu_id, estat_operatiu);

      // Traçabilitat
      await registrarEsdeveniment(
        'canvi_estat_indicatiu',
        userId,
        indicatiu.incidencia_assignada_id || null,
        indicatiu_id,
        `Canvi d'estat operatiu via WebSocket: ${estatAnterior} → ${estat_operatiu}`,
        { estat_anterior: estatAnterior, estat_nou: estat_operatiu }
      );

      // Confirmar al client
      socket.emit('estat_canviat', {
        exit: true,
        missatge: `Estat canviat a "${estat_operatiu}"`,
        dades: indicatiuActualitzat,
      });

      // Re-emetre a la sala
      emetreCanviEstatIndicatiu(indicatiu_id, estatAnterior, estat_operatiu);

      console.log(`✅ Estat canviat: ${indicatiu.codi} → ${estat_operatiu}`);
    } catch (error) {
      console.error('❌ Error canviant estat via WS:', error);
      socket.emit('error', {
        codi: 'ERROR_INTERN',
        missatge: 'Error canviant estat operatiu',
      });
    }
  });
};

// ==============================================================
// EVENT 3: enviar_missatge
// Enviar missatge de chat entre sala i patrulla
// ==============================================================
export const handleEnviarMissatge = (socket) => {
  socket.on('enviar_missatge', async (data) => {
    try {
      const { incidencia_id, contingut, destinatari_id } = data;
      const { userId, username } = socket.usuari;

      console.log(`💬 [WS ← Client] enviar_missatge de ${username}`);

      // Validar
      if (!contingut || contingut.trim().length === 0) {
        return socket.emit('error', {
          codi: 'MISSATGE_BUIT',
          missatge: 'El contingut del missatge no pot estar buit',
        });
      }

      // Crear missatge a la BD (assumint que tens el model Missatge)
      // Com encara no l'has creat, simulem la resposta:
      const nouMissatge = {
        id: `msg-${Date.now()}`,
        timestamp: new Date().toISOString(),
        emissor_id: userId,
        emissor_username: username,
        destinatari_id: destinatari_id || null,
        incidencia_id: incidencia_id || null,
        contingut,
        llegit: false,
      };

      // Confirmar al client
      socket.emit('missatge_enviat', {
        exit: true,
        missatge: 'Missatge enviat correctament',
        dades: nouMissatge,
      });

      // Emetre a la sala de control
      emetreSala('nou_missatge', { missatge: nouMissatge });

      // Si té destinatari específic, també a ell
      // (Aquí necessitaríem saber el socket.id del destinatari, de moment emetem a tots)

      console.log(`✅ Missatge enviat: "${contingut.substring(0, 30)}..."`);
    } catch (error) {
      console.error('❌ Error enviant missatge via WS:', error);
      socket.emit('error', {
        codi: 'ERROR_INTERN',
        missatge: 'Error enviant missatge',
      });
    }
  });
};

// ==============================================================
// EVENT 4: aceptar_assignacio
// La patrulla accepta una assignació rebuda
// ==============================================================
export const handleAcceptarAssignacio = (socket) => {
  socket.on('aceptar_assignacio', async (data) => {
    try {
      const { assignacio_id } = data;
      const { userId, username } = socket.usuari;

      console.log(`✅ [WS ← Client] aceptar_assignacio de ${username}`);

      if (!assignacio_id) {
        return socket.emit('error', {
          codi: 'DADES_INVALIDES',
          missatge: 'El camp assignacio_id és obligatori',
        });
      }

      // Verificar que l'assignació existeix
      const assignacio = await Assignacio.trobarPerId(assignacio_id);
      if (!assignacio) {
        return socket.emit('error', {
          codi: 'ASSIGNACIO_NO_TROBADA',
          missatge: `Assignació ${assignacio_id} no trobada`,
        });
      }

      // Verificar que no està ja acceptada
      if (assignacio.timestamp_acceptacio) {
        return socket.emit('error', {
          codi: 'JA_ACCEPTADA',
          missatge: 'Aquesta assignació ja ha estat acceptada',
        });
      }

      // Acceptar
      const assignacioAcceptada = await Assignacio.acceptar(assignacio_id);

      // Canviar estat de la incidència a "en_curs"
      await Incidencia.canviarEstat(assignacio.incidencia_id, 'en_curs');

      // Traçabilitat
      await registrarEsdeveniment(
        'assignacio_acceptada',
        userId,
        assignacio.incidencia_id,
        assignacio.indicatiu_id,
        `Assignació acceptada via WebSocket per ${username}`,
        { assignacio_id }
      );

      // Confirmar al client
      socket.emit('assignacio_acceptada_confirmacio', {
        exit: true,
        missatge: 'Assignació acceptada correctament',
        dades: assignacioAcceptada,
      });

      // Notificar a la sala
      emetreSala('assignacio_acceptada', {
        assignacio: assignacioAcceptada,
        acceptada_per: username,
      });

      // Emetre canvi d'estat de la incidència
      emetreSala('canvi_estat_incidencia', {
        incidencia_id: assignacio.incidencia_id,
        estat_anterior: 'assignada',
        estat_nou: 'en_curs',
      });

      console.log(`✅ Assignació ${assignacio_id} acceptada per ${username}`);
    } catch (error) {
      console.error('❌ Error acceptant assignació via WS:', error);
      socket.emit('error', {
        codi: 'ERROR_INTERN',
        missatge: 'Error acceptant assignació',
      });
    }
  });
};

// ==============================================================
// EVENT 5: rebutjar_assignacio
// La patrulla rebutja una assignació (opcional)
// ==============================================================
export const handleRebutjarAssignacio = (socket) => {
  socket.on('rebutjar_assignacio', async (data) => {
    try {
      const { assignacio_id, motiu } = data;
      const { userId, username } = socket.usuari;

      console.log(`❌ [WS ← Client] rebutjar_assignacio de ${username}`);

      if (!assignacio_id) {
        return socket.emit('error', {
          codi: 'DADES_INVALIDES',
          missatge: 'El camp assignacio_id és obligatori',
        });
      }

      const assignacio = await Assignacio.trobarPerId(assignacio_id);
      if (!assignacio) {
        return socket.emit('error', {
          codi: 'ASSIGNACIO_NO_TROBADA',
          missatge: `Assignació ${assignacio_id} no trobada`,
        });
      }

      // Marcar com a finalitzada (rebutjada)
      await Assignacio.cancellar(assignacio_id);

      // Tornar la incidència a "nova" i l'indicatiu a "disponible"
      await Incidencia.canviarEstat(assignacio.incidencia_id, 'nova');
      await Indicatiu.desassignarIncidencia(assignacio.indicatiu_id);

      // Traçabilitat
      await registrarEsdeveniment(
        'assignacio_rebutjada',
        userId,
        assignacio.incidencia_id,
        assignacio.indicatiu_id,
        `Assignació rebutjada via WebSocket per ${username}`,
        { assignacio_id, motiu: motiu || 'Sense motiu especificat' }
      );

      // Confirmar
      socket.emit('assignacio_rebutjada_confirmacio', {
        exit: true,
        missatge: 'Assignació rebutjada',
      });

      // Notificar a la sala
      emetreSala('assignacio_rebutjada', {
        assignacio_id,
        rebutjada_per: username,
        motiu: motiu || 'Sense motiu',
      });

      console.log(`✅ Assignació ${assignacio_id} rebutjada per ${username}`);
    } catch (error) {
      console.error('❌ Error rebutjant assignació via WS:', error);
      socket.emit('error', {
        codi: 'ERROR_INTERN',
        missatge: 'Error rebutjant assignació',
      });
    }
  });
};