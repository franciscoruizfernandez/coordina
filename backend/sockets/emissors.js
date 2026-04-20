// backend/sockets/emissors.js

import { getIOInstance } from './socketManager.js';

// ==============================================================
// HELPER: Emetre a la sala de control (operadors)
// ==============================================================
export const emetreSala = (eventName, data) => {
  try {
    const io = getIOInstance();
    io.to('sala_control').emit(eventName, {
      ...data,
      timestamp: new Date().toISOString(),
    });
    console.log(`📤 [WS → Sala] ${eventName}`, data);
  } catch (error) {
    console.error(`❌ Error emetent ${eventName}:`, error.message);
  }
};

// ==============================================================
// HELPER: Emetre a una patrulla específica
// ==============================================================
export const emetrePatrulla = (userId, eventName, data) => {
  try {
    const io = getIOInstance();
    const room = `patrulla_${userId}`;
    io.to(room).emit(eventName, {
      ...data,
      timestamp: new Date().toISOString(),
    });
    console.log(`📤 [WS → Patrulla ${userId}] ${eventName}`, data);
  } catch (error) {
    console.error(`❌ Error emetent a patrulla ${userId}:`, error.message);
  }
};

// ==============================================================
// HELPER: Emetre a TOTS els clients connectats
// ==============================================================
export const emetreTots = (eventName, data) => {
  try {
    const io = getIOInstance();
    io.emit(eventName, {
      ...data,
      timestamp: new Date().toISOString(),
    });
    console.log(`📤 [WS → TOTS] ${eventName}`, data);
  } catch (error) {
    console.error(`❌ Error emetent a tots:`, error.message);
  }
};

// ==============================================================
// EVENT 1: NOVA INCIDÈNCIA
// S'emet quan es crea una incidència (POST /api/incidencies)
// ==============================================================
export const emetreNovaIncidencia = (incidencia) => {
  emetreSala('nova_incidencia', {
    incidencia,
  });
};

// ==============================================================
// EVENT 2: INCIDÈNCIA ACTUALITZADA
// S'emet quan es modifica (PUT o PATCH)
// ==============================================================
export const emetreIncidenciaActualitzada = (incidencia) => {
  emetreSala('incidencia_actualitzada', {
    incidencia,
  });
};

// ==============================================================
// EVENT 3: INCIDÈNCIA ASSIGNADA
// S'emet quan es crea una assignació (manual o automàtica)
// Envia a sala + patrulla específica
// ==============================================================
export const emetreIncidenciaAssignada = (assignacio, incidencia, indicatiu) => {
  // A la sala
  emetreSala('incidencia_assignada', {
    assignacio,
    incidencia,
    indicatiu,
  });

  // A la patrulla (de moment usem userId, en el futur serà token d'indicatiu)
  // Com no tenim encara el vincle usuari-indicatiu, emetem a tots els patrulles
  // En producció real, necessitaríem saber quin usuari condueix l'indicatiu
  emetreTots('incidencia_assignada', {
    assignacio,
    incidencia,
    indicatiu,
  });
};

// ==============================================================
// EVENT 4: CANVI D'ESTAT D'INCIDÈNCIA
// S'emet amb PATCH /api/incidencies/:id/estat
// ==============================================================
export const emetreCanviEstatIncidencia = (incidenciaId, estatAnterior, estatNou) => {
  emetreSala('canvi_estat_incidencia', {
    incidencia_id: incidenciaId,
    estat_anterior: estatAnterior,
    estat_nou: estatNou,
  });
};

// ==============================================================
// EVENT 5: UBICACIÓ INDICATIU (GPS)
// S'emet quan una patrulla actualitza el seu GPS
// ==============================================================
export const emetreUbicacioIndicatiu = (indicatiu) => {
  emetreSala('ubicacio_indicatiu', {
    indicatiu: {
      id: indicatiu.id,
      codi: indicatiu.codi,
      ubicacio_lat: indicatiu.ubicacio_lat,
      ubicacio_lon: indicatiu.ubicacio_lon,
      ultima_actualitzacio_gps: indicatiu.ultima_actualitzacio_gps,
    },
  });
};

// ==============================================================
// EVENT 6: CANVI D'ESTAT OPERATIU INDICATIU
// S'emet quan canvia l'estat operatiu (disponible, en_servei...)
// ==============================================================
export const emetreCanviEstatIndicatiu = (indicatiuId, estatAnterior, estatNou) => {
  emetreSala('canvi_estat_indicatiu', {
    indicatiu_id: indicatiuId,
    estat_anterior: estatAnterior,
    estat_nou: estatNou,
  });
};

// ==============================================================
// EVENT 7: NOU MISSATGE (CHAT)
// S'emet quan s'envia un missatge
// ==============================================================
export const emetreNouMissatge = (missatge, destinatariId = null) => {
  // Si té destinatari específic, enviar només a ell
  if (destinatariId) {
    emetrePatrulla(destinatariId, 'nou_missatge', { missatge });
  }
  // També a la sala sempre
  emetreSala('nou_missatge', { missatge });
};