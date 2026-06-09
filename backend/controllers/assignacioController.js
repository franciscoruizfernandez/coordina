// backend/controllers/assignacioController.js

import Assignacio from '../models/Assignacio.js';
import Incidencia from '../models/Incidencia.js';
import Indicatiu from '../models/Indicatiu.js';
import EsdevenimentTracabilitat from '../models/EsdevenimentTracabilitat.js';
import { trobarMesProper } from '../utils/haversine.js';
import { emetreIncidenciaAssignada } from '../sockets/emissors.js';
import { calcularRutesMultiples } from '../utils/osrm.js';
import { intentarAutoassignarPendents } from '../services/autoassignacioService.js';
import {
  recalcularEstatIncidencia,
  actualitzarEstatPerNovaAssignacio,
} from '../services/recalcularEstatService.js';
import { programarEscalatSiCal } from '../services/coberturaTimerService.js';

// Helper de traçabilitat
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
// POST /api/assignacions
// Assignació manual: operador tria la patrulla
// Accessible: operador_sala, administrador
// Permet assignar múltiples indicatius a una mateixa incidència
// ==============================================================
export const crearAssignacioManual = async (req, res, next) => {
  try {
    const { incidencia_id, indicatiu_id } = req.body;

    // Validar camps obligatoris
    if (!incidencia_id || !indicatiu_id) {
      return res.status(400).json({
        error: true,
        missatge: 'Els camps incidencia_id i indicatiu_id són obligatoris',
      });
    }

    // --- Verificar incidència ---
    const incidencia = await Incidencia.trobarPerId(incidencia_id);
    if (!incidencia) {
      return res.status(404).json({
        error: true,
        missatge: 'Incidència no trobada',
      });
    }

    // Es pot assignar si la incidència està activa (nova, assignada o en_curs)
    const estatsAssignables = ['nova', 'assignada', 'en_curs'];
    if (!estatsAssignables.includes(incidencia.estat)) {
      return res.status(400).json({
        error: true,
        missatge: `No es pot assignar una incidència en estat "${incidencia.estat}". Només es poden assignar incidències en estat: ${estatsAssignables.join(', ')}`,
        estatActual: incidencia.estat,
      });
    }

    // --- Verificar indicatiu ---
    const indicatiu = await Indicatiu.trobarPerId(indicatiu_id);
    if (!indicatiu) {
      return res.status(404).json({
        error: true,
        missatge: 'Indicatiu no trobat',
      });
    }

    // L'indicatiu ha d'estar disponible
    if (indicatiu.estat_operatiu !== 'disponible') {
      return res.status(400).json({
        error: true,
        missatge: `L'indicatiu "${indicatiu.codi}" no està disponible`,
        estatActual: indicatiu.estat_operatiu,
      });
    }

    // Verificar que l'indicatiu no tingui ja una assignació activa
    const assignacioIndicatiu = await Assignacio.trobarActivaPerIndicatiu(indicatiu_id);
    if (assignacioIndicatiu) {
      return res.status(400).json({
        error: true,
        missatge: `L'indicatiu "${indicatiu.codi}" ja té una assignació activa`,
      });
    }

    // Determinar tipus: si la incidència ja tenia assignacions, és reforç
    const jaTeActives = await Assignacio.teActivesPerIncidencia(incidencia_id);
    const tipusAssignacio = jaTeActives ? 'reforc' : 'principal';

    // --- Crear l'assignació ---
    const novaAssignacio = await Assignacio.crear({
      incidencia_id,
      indicatiu_id,
      mode_assignacio: 'manual',
      usuari_assignador_id: req.usuari.userId,
      tipus_assignacio: tipusAssignacio,
    });

    // --- Actualitzar l'indicatiu (estat + incidència assignada) ---
    await Indicatiu.assignarIncidencia(indicatiu_id, incidencia_id);

    // --- Actualitzar estat de la incidència ---
    await actualitzarEstatPerNovaAssignacio(incidencia_id);

    // Traçabilitat
    await registrarEsdeveniment(
      'assignacio_creada',
      req.usuari.userId,
      incidencia_id,
      indicatiu_id,
      `Assignació manual (${tipusAssignacio}): Indicatiu ${indicatiu.codi} → Incidència ${incidencia_id}`,
      {
        mode: 'manual',
        tipus: tipusAssignacio,
        indicatiu_codi: indicatiu.codi,
      }
    );

    // Obtenir assignació completa amb JOINs
    const assignacioCompleta = await Assignacio.trobarPerId(novaAssignacio.id);

    // Websocket
    emetreIncidenciaAssignada(assignacioCompleta, incidencia, indicatiu);

    // Obtenir total d'indicatius actius per informar
    const totalActius = await Assignacio.comptarActivesPerIncidencia(incidencia_id);

    // Si la incidència és crítica, programar escalat si cal
    if (incidencia.prioritat === 'critica') {
      programarEscalatSiCal(incidencia_id).catch((err) => {
        console.error('❌ [Escalat] Error programant escalat:', err.message);
      });
    }

    res.status(201).json({
      exit: true,
      missatge: `Assignació manual creada (${tipusAssignacio}). Indicatiu ${indicatiu.codi} assignat. Total actius: ${totalActius}`,
      dades: assignacioCompleta,
      resum: {
        tipus_assignacio: tipusAssignacio,
        total_indicatius_actius: totalActius,
      },
    });
  } catch (error) {
    console.error('❌ Error creant assignació manual:', error);
    next(error);
  }
};

// ==============================================================
// POST /api/assignacions/automatica
// Assignació automàtica: selecciona la patrulla que triga menys
// a arribar via OSRM (temps real per carretera)
// Accessible: operador_sala, administrador
// Permet assignar a incidències ja assignades o en curs
// ==============================================================
export const crearAssignacioAutomatica = async (req, res, next) => {
  try {
    const { incidencia_id } = req.body;

    if (!incidencia_id) {
      return res.status(400).json({
        error: true,
        missatge: 'El camp incidencia_id és obligatori',
      });
    }

    // --- Verificar incidència ---
    const incidencia = await Incidencia.trobarPerId(incidencia_id);
    if (!incidencia) {
      return res.status(404).json({
        error: true,
        missatge: 'Incidència no trobada',
      });
    }

    const estatsAssignables = ['nova', 'assignada', 'en_curs'];
    if (!estatsAssignables.includes(incidencia.estat)) {
      return res.status(400).json({
        error: true,
        missatge: `No es pot assignar automàticament una incidència en estat "${incidencia.estat}".`,
        estatActual: incidencia.estat,
      });
    }

    // --- Obtenir indicatius disponibles ---
    const disponibles = await Indicatiu.trobarDisponibles();

    if (disponibles.length === 0) {
      return res.status(404).json({
        error: true,
        missatge: 'No hi ha indicatius disponibles en aquest moment',
      });
    }

    // --- Calcular rutes OSRM per a tots els indicatius disponibles ---
    const ambRutes = await calcularRutesMultiples(
      parseFloat(incidencia.ubicacio_lat),
      parseFloat(incidencia.ubicacio_lon),
      disponibles
    );

    // --- Seleccionar el millor candidat ---
    const ambUbicacio = ambRutes.filter(
      (i) => i.ubicacio_lat !== null && i.ubicacio_lon !== null
    );

    if (ambUbicacio.length === 0) {
      return res.status(404).json({
        error: true,
        missatge: 'Cap indicatiu disponible té coordenades GPS',
      });
    }

    const ambOSRM   = ambUbicacio.filter((i) => i.temps_minuts !== null);
    const senseOSRM = ambUbicacio.filter((i) => i.temps_minuts === null);

    let mesRapid;

    if (ambOSRM.length > 0) {
      ambOSRM.sort((a, b) => a.temps_minuts - b.temps_minuts);
      mesRapid = ambOSRM[0];
    } else {
      console.warn('⚠️ OSRM no ha retornat resultats, usant Haversine com a fallback');
      mesRapid = trobarMesProper(
        parseFloat(incidencia.ubicacio_lat),
        parseFloat(incidencia.ubicacio_lon),
        senseOSRM
      );
    }

    if (!mesRapid) {
      return res.status(404).json({
        error: true,
        missatge: "No s'ha pogut determinar cap indicatiu disponible",
      });
    }

    // Determinar tipus
    const jaTeActives = await Assignacio.teActivesPerIncidencia(incidencia_id);
    const tipusAssignacio = jaTeActives ? 'reforc' : 'principal';

    // --- Crear l'assignació ---
    const novaAssignacio = await Assignacio.crear({
      incidencia_id,
      indicatiu_id: mesRapid.id,
      mode_assignacio: 'automatica',
      usuari_assignador_id: req.usuari.userId,
      tipus_assignacio: tipusAssignacio,
    });

    await Indicatiu.assignarIncidencia(mesRapid.id, incidencia_id);
    await actualitzarEstatPerNovaAssignacio(incidencia_id);

    // Traçabilitat
    await registrarEsdeveniment(
      'assignacio_creada',
      req.usuari.userId,
      incidencia_id,
      mesRapid.id,
      `Assignació automàtica (${tipusAssignacio}): Indicatiu ${mesRapid.codi} ` +
        (mesRapid.temps_minuts !== null
          ? `(${mesRapid.temps_minuts} min, ${mesRapid.distancia_km} km)`
          : `(${mesRapid.distancia_km} km, Haversine)`),
      {
        mode: 'automatica',
        tipus: tipusAssignacio,
        indicatiu_codi: mesRapid.codi,
        distancia_km: mesRapid.distancia_km,
        temps_minuts: mesRapid.temps_minuts,
        metode: mesRapid.temps_minuts !== null ? 'osrm' : 'haversine',
        total_disponibles: disponibles.length,
      }
    );

    const assignacioCompleta = await Assignacio.trobarPerId(novaAssignacio.id);
    emetreIncidenciaAssignada(assignacioCompleta, incidencia, mesRapid);

    const totalActius = await Assignacio.comptarActivesPerIncidencia(incidencia_id);

    // Si la incidència és crítica, programar escalat si cal
    if (incidencia.prioritat === 'critica') {
      programarEscalatSiCal(incidencia_id).catch((err) => {
        console.error('❌ [Escalat] Error programant escalat:', err.message);
      });
    }

    res.status(201).json({
      exit: true,
      missatge: `Assignació automàtica creada (${tipusAssignacio}). Indicatiu ${mesRapid.codi} seleccionat. Total actius: ${totalActius}`,
      algorisme: {
        indicatiu_seleccionat: mesRapid.codi,
        distancia_km: mesRapid.distancia_km,
        temps_minuts: mesRapid.temps_minuts,
        metode: mesRapid.temps_minuts !== null ? 'osrm' : 'haversine',
        indicatius_avaluats: disponibles.length,
      },
      resum: {
        tipus_assignacio: tipusAssignacio,
        total_indicatius_actius: totalActius,
      },
      dades: assignacioCompleta,
    });
  } catch (error) {
    console.error('❌ Error en assignació automàtica:', error);
    next(error);
  }
};

// ==============================================================
// PATCH /api/assignacions/:id/acceptar
// La patrulla accepta l'assignació rebuda
// Accessible: patrulla
// ==============================================================
export const acceptarAssignacio = async (req, res, next) => {
  try {
    const { id } = req.params;

    const assignacio = await Assignacio.trobarPerId(id);
    if (!assignacio) {
      return res.status(404).json({
        error: true,
        missatge: 'Assignació no trobada',
      });
    }

    if (assignacio.timestamp_acceptacio) {
      return res.status(400).json({
        error: true,
        missatge: 'Aquesta assignació ja ha estat acceptada',
      });
    }

    if (assignacio.timestamp_finalitzacio) {
      return res.status(400).json({
        error: true,
        missatge: 'Aquesta assignació ja ha estat finalitzada o cancel·lada',
      });
    }

    const assignacioAcceptada = await Assignacio.acceptar(id);

    // Recalcular estat de la incidència (pot passar a en_curs)
    await recalcularEstatIncidencia(assignacio.incidencia_id, 'assignada');

    // Traçabilitat
    await registrarEsdeveniment(
      'assignacio_acceptada',
      req.usuari?.userId,
      assignacio.incidencia_id,
      assignacio.indicatiu_id,
      `Assignació acceptada per la patrulla`,
      { indicatiu_codi: assignacio.indicatiu_codi }
    );

    res.json({
      exit: true,
      missatge: 'Assignació acceptada. Incidència en curs.',
      dades: assignacioAcceptada,
    });
  } catch (error) {
    console.error('❌ Error acceptant assignació:', error);
    next(error);
  }
};

// ==============================================================
// PATCH /api/assignacions/:id/finalitzar
// Finalitzar una assignació
// Recalcula l'estat de la incidència automàticament
// ==============================================================
export const finalitzarAssignacio = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { observacions } = req.body;

    const assignacio = await Assignacio.trobarPerId(id);
    if (!assignacio) {
      return res.status(404).json({
        error: true,
        missatge: 'Assignació no trobada',
      });
    }

    if (assignacio.timestamp_finalitzacio) {
      return res.status(400).json({
        error: true,
        missatge: 'Aquesta assignació ja ha estat finalitzada',
      });
    }

    // Finalitzar l'assignació
    await Assignacio.finalitzar(id);

    // Alliberar l'indicatiu
    await Indicatiu.desassignarIncidencia(assignacio.indicatiu_id);

    // Recalcular l'estat de la incidència
    // Si no queden assignacions actives → 'resolta'
    // Si en queden → es manté 'assignada' o 'en_curs'
    const { estatNou } = await recalcularEstatIncidencia(
      assignacio.incidencia_id,
      'resolta'
    );

    // Si la incidència ha passat a resolta i hi havia observacions,
    // guardar-les a la incidència
    if (estatNou === 'resolta' && observacions) {
      await Incidencia.canviarEstat(assignacio.incidencia_id, 'resolta', observacions);
    }

    // Traçabilitat
    const totalRestants = await Assignacio.comptarActivesPerIncidencia(assignacio.incidencia_id);

    await registrarEsdeveniment(
      'assignacio_finalitzada',
      req.usuari?.userId,
      assignacio.incidencia_id,
      assignacio.indicatiu_id,
      `Assignació finalitzada. Indicatiu ${assignacio.indicatiu_codi} alliberat. ` +
      `${totalRestants} indicatiu/s actiu/s restants.`,
      {
        indicatiu_codi: assignacio.indicatiu_codi,
        observacions: observacions || null,
        indicatius_restants: totalRestants,
      }
    );

    // Mode auto: intentar assignar pendents (inclou completar cobertura crítica)
    intentarAutoassignarPendents().catch((err) => {
      console.error('❌ [Auto] Error intentant assignar pendents post-finalització:', err.message);
    });

    res.json({
      exit: true,
      missatge: `Assignació finalitzada. Indicatiu ${assignacio.indicatiu_codi} alliberat. ${totalRestants} indicatiu/s actiu/s restants.`,
      resum: {
        indicatius_restants: totalRestants,
        estat_incidencia: estatNou,
      },
    });
  } catch (error) {
    console.error('❌ Error finalitzant assignació:', error);
    next(error);
  }
};

// ==============================================================
// DELETE /api/assignacions/:id
// Cancel·lar assignació
// Recalcula l'estat de la incidència automàticament
// ==============================================================
export const cancellarAssignacio = async (req, res, next) => {
  try {
    const { id } = req.params;

    const assignacio = await Assignacio.trobarPerId(id);
    if (!assignacio) {
      return res.status(404).json({
        error: true,
        missatge: 'Assignació no trobada',
      });
    }

    if (assignacio.timestamp_finalitzacio) {
      return res.status(400).json({
        error: true,
        missatge: 'Aquesta assignació ja ha estat finalitzada o cancel·lada',
      });
    }

    // Cancel·lar l'assignació
    await Assignacio.cancellar(id);

    // Alliberar l'indicatiu
    await Indicatiu.desassignarIncidencia(assignacio.indicatiu_id);

    // Recalcular l'estat de la incidència
    // Si no queden assignacions actives → 'nova' (torna a la cua)
    // Si en queden → es manté 'assignada' o 'en_curs'
    const { estatNou } = await recalcularEstatIncidencia(
      assignacio.incidencia_id,
      'nova'
    );

    // Traçabilitat
    const totalRestants = await Assignacio.comptarActivesPerIncidencia(assignacio.incidencia_id);

    await registrarEsdeveniment(
      'assignacio_cancel_lada',
      req.usuari?.userId,
      assignacio.incidencia_id,
      assignacio.indicatiu_id,
      `Assignació cancel·lada. ${totalRestants} indicatiu/s actiu/s restants.`,
      {
        indicatiu_codi: assignacio.indicatiu_codi,
        indicatius_restants: totalRestants,
      }
    );

    // Mode auto: intentar reassignar (inclou completar cobertura crítica)
    intentarAutoassignarPendents().catch((err) => {
      console.error('❌ [Auto] Error intentant assignar pendents post-cancel·lació:', err.message);
    });

    res.json({
      exit: true,
      missatge: `Assignació cancel·lada. Indicatiu ${assignacio.indicatiu_codi} alliberat. ${totalRestants} indicatiu/s actiu/s restants.`,
      resum: {
        indicatius_restants: totalRestants,
        estat_incidencia: estatNou,
      },
    });
  } catch (error) {
    console.error('❌ Error cancel·lant assignació:', error);
    next(error);
  }
};

// ==============================================================
// GET /api/assignacions/activa
// Obtenir l'assignació activa (compatibilitat) o totes les actives
// ==============================================================
export const obtenirAssignacioActiva = async (req, res, next) => {
  try {
    const { incidencia_id, indicatiu_id } = req.query;

    if (!incidencia_id) {
      return res.status(400).json({
        error: true,
        missatge: 'El paràmetre incidencia_id és obligatori',
      });
    }

    // Si es demana per indicatiu específic, retornar la seva
    if (indicatiu_id) {
      const assignacio = await Assignacio.trobarActivaPerIndicatiu(indicatiu_id);

      if (!assignacio || assignacio.incidencia_id !== incidencia_id) {
        return res.status(404).json({
          error: true,
          missatge: "No s'ha trobat cap assignació activa per aquest indicatiu i incidència",
        });
      }

      return res.json({ exit: true, dades: assignacio });
    }

    // Si no, retornar totes les actives de la incidència
    const actives = await Assignacio.trobarTotesActivesPerIncidencia(incidencia_id);

    if (actives.length === 0) {
      return res.status(404).json({
        error: true,
        missatge: "No s'ha trobat cap assignació activa per aquesta incidència",
      });
    }

    res.json({
      exit: true,
      total: actives.length,
      dades: actives,
    });
  } catch (error) {
    console.error('❌ Error obtenint assignació activa:', error);
    next(error);
  }
};