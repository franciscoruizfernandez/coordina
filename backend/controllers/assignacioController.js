// backend/controllers/assignacioController.js

import Assignacio from '../models/Assignacio.js';
import Incidencia from '../models/Incidencia.js';
import Indicatiu from '../models/Indicatiu.js';
import EsdevenimentTracabilitat from '../models/EsdevenimentTracabilitat.js';
import { trobarMesProper } from '../utils/haversine.js';
import { emetreIncidenciaAssignada } from '../sockets/emissors.js';

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
// US013
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

    // Només es pot assignar si està en estat 'nova'
    if (incidencia.estat !== 'nova') {
      return res.status(400).json({
        error: true,
        missatge: `No es pot assignar una incidència en estat "${incidencia.estat}". Només es poden assignar incidències en estat "nova".`,
        estatActual: incidencia.estat,
      });
    }

    // ✅ Comprovar si ja té una assignació activa
    const assignacioActiva = await Assignacio.trobarActivaPerIncidencia(incidencia_id);
    if (assignacioActiva) {
      return res.status(400).json({
        error: true,
        missatge: 'Aquesta incidència ja té una assignació activa en curs',
        assignacioActiva: {
          id: assignacioActiva.id,
          indicatiu_id: assignacioActiva.indicatiu_id,
          timestamp_assignacio: assignacioActiva.timestamp_assignacio,
        },
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

    // --- Crear l'assignació ---
    const novaAssignacio = await Assignacio.crear({
      incidencia_id,
      indicatiu_id,
      mode_assignacio: 'manual',
      usuari_assignador_id: req.usuari.userId,
    });

    // --- Actualitzar l'indicatiu (estat + incidència assignada) ---
    await Indicatiu.assignarIncidencia(indicatiu_id, incidencia_id);

    // --- Actualitzar estat de la incidència a "assignada" ---
    await Incidencia.canviarEstat(incidencia_id, 'assignada');

    // ✅ US014: Registrar a traçabilitat
    await registrarEsdeveniment(
      'assignacio_creada',
      req.usuari.userId,
      incidencia_id,
      indicatiu_id,
      `Assignació manual: Indicatiu ${indicatiu.codi} → Incidència ${incidencia_id}`,
      {
        mode: 'manual',
        indicatiu_codi: indicatiu.codi,
      }
    );

    // Obtenir assignació completa amb JOINs per retornar-la
    const assignacioCompleta = await Assignacio.trobarPerId(novaAssignacio.id);

    
    // EMETRE EVENT WEBSOCKET
    emetreIncidenciaAssignada(assignacioCompleta, incidencia, indicatiu);

    res.status(201).json({
      exit: true,
      missatge: `Assignació manual creada. Indicatiu ${indicatiu.codi} assignat.`,
      dades: assignacioCompleta,
    });
  } catch (error) {
    console.error('❌ Error creant assignació manual:', error);
    next(error);
  }
};

// ==============================================================
// POST /api/assignacions/automatica
// Assignació automàtica: algoritme Haversine troba la patrulla més propera
// Accessible: operador_sala, administrador
// US013
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

    // Només es pot assignar si està en estat 'nova'
    if (incidencia.estat !== 'nova') {
      return res.status(400).json({
        error: true,
        missatge: `No es pot assignar automàticament una incidència en estat "${incidencia.estat}". Només es poden assignar incidències en estat "nova".`,
        estatActual: incidencia.estat,
      });
    }

    // ✅ Comprovar si ja té una assignació activa
    const assignacioActiva = await Assignacio.trobarActivaPerIncidencia(incidencia_id);
    if (assignacioActiva) {
      return res.status(400).json({
        error: true,
        missatge: 'Aquesta incidència ja té una assignació activa en curs',
        assignacioActiva: {
          id: assignacioActiva.id,
          indicatiu_id: assignacioActiva.indicatiu_id,
          timestamp_assignacio: assignacioActiva.timestamp_assignacio,
        },
      });
    }

    // --- Obtenir tots els indicatius disponibles ---
    const disponibles = await Indicatiu.trobarDisponibles();

    if (disponibles.length === 0) {
      return res.status(404).json({
        error: true,
        missatge: 'No hi ha indicatius disponibles en aquest moment',
      });
    }

    // --- Algoritme Haversine: trobar el més proper ---
    const mesProper = trobarMesProper(
      parseFloat(incidencia.ubicacio_lat),
      parseFloat(incidencia.ubicacio_lon),
      disponibles
    );

    if (!mesProper) {
      return res.status(404).json({
        error: true,
        missatge: 'No s\'ha pogut determinar cap indicatiu proper (sense coordenades GPS)',
      });
    }

    // --- Crear l'assignació ---
    const novaAssignacio = await Assignacio.crear({
      incidencia_id,
      indicatiu_id: mesProper.id,
      mode_assignacio: 'automatica',
      usuari_assignador_id: req.usuari.userId,
    });

    // --- Actualitzar l'indicatiu ---
    await Indicatiu.assignarIncidencia(mesProper.id, incidencia_id);

    // --- Actualitzar estat de la incidència ---
    await Incidencia.canviarEstat(incidencia_id, 'assignada');

    // ✅ US014: Registrar a traçabilitat
    await registrarEsdeveniment(
      'assignacio_creada',
      req.usuari.userId,
      incidencia_id,
      mesProper.id,
      `Assignació automàtica: Indicatiu ${mesProper.codi} (${mesProper.distancia_km} km)`,
      {
        mode: 'automatica',
        indicatiu_codi: mesProper.codi,
        distancia_km: mesProper.distancia_km,
        total_disponibles: disponibles.length,
      }
    );

    const assignacioCompleta = await Assignacio.trobarPerId(novaAssignacio.id);

    
    // EMETRE EVENT WEBSOCKET
    emetreIncidenciaAssignada(assignacioCompleta, incidencia, mesProper);

    res.status(201).json({
      exit: true,
      missatge: `Assignació automàtica creada. Indicatiu ${mesProper.codi} seleccionat (${mesProper.distancia_km} km).`,
      algorisme: {
        indicatiu_seleccionat: mesProper.codi,
        distancia_km: mesProper.distancia_km,
        indicatius_avaluats: disponibles.length,
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
// US013
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

    // Actualitzar estat de la incidència a "en_curs"
    await Incidencia.canviarEstat(assignacio.incidencia_id, 'en_curs');

    // ✅ US014: Traçabilitat
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
// Finalitzar una assignació (patrulla acaba la intervenció)
// Accessible: patrulla, operador_sala, administrador
// US013
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

    await Assignacio.finalitzar(id);
    await Indicatiu.desassignarIncidencia(assignacio.indicatiu_id);

    await Incidencia.canviarEstat(assignacio.incidencia_id, 'resolta', observacions || null);

    await registrarEsdeveniment(
      'assignacio_finalitzada',
      req.usuari?.userId,
      assignacio.incidencia_id,
      assignacio.indicatiu_id,
      `Assignació finalitzada. Indicatiu ${assignacio.indicatiu_codi} alliberat.`,
      {
        indicatiu_codi: assignacio.indicatiu_codi,
        observacions: observacions || null,
      }
    );

    res.json({
      exit: true,
      missatge: `Assignació finalitzada. Indicatiu ${assignacio.indicatiu_codi} tornat a disponible.`,
    });
  } catch (error) {
    console.error('❌ Error finalitzant assignació:', error);
    next(error);
  }
};

// ==============================================================
// DELETE /api/assignacions/:id
// Cancel·lar assignació (operador cancel·la manualment)
// Accessible: operador_sala, administrador
// US013
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

    await Assignacio.cancellar(id);

    // Alliberar l'indicatiu
    await Indicatiu.desassignarIncidencia(assignacio.indicatiu_id);

    // Tornar la incidència a "nova"
    await Incidencia.canviarEstat(assignacio.incidencia_id, 'nova');

    // ✅ US014: Traçabilitat
    await registrarEsdeveniment(
      'assignacio_cancel_lada',
      req.usuari?.userId,
      assignacio.incidencia_id,
      assignacio.indicatiu_id,
      `Assignació cancel·lada per l'operador`,
      { indicatiu_codi: assignacio.indicatiu_codi }
    );

    res.json({
      exit: true,
      missatge: `Assignació cancel·lada. Indicatiu ${assignacio.indicatiu_codi} tornat a disponible.`,
    });
  } catch (error) {
    console.error('❌ Error cancel·lant assignació:', error);
    next(error);
  }
};

// ==============================================================
// GET /api/assignacions/activa
// Obtenir l'assignació activa d'una incidència
// Accessible: tots els rols autenticats
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

    const assignacio = await Assignacio.trobarActivaPerIncidencia(incidencia_id);

    if (!assignacio) {
      return res.status(404).json({
        error: true,
        missatge: 'No s\'ha trobat cap assignació activa per aquesta incidència',
      });
    }

    // Si s'ha passat indicatiu_id, verificar que coincideix
    if (indicatiu_id && assignacio.indicatiu_id !== indicatiu_id) {
      return res.status(404).json({
        error: true,
        missatge: 'No s\'ha trobat cap assignació activa per aquest indicatiu i incidència',
      });
    }

    res.json({
      exit: true,
      dades: assignacio,
    });
  } catch (error) {
    console.error('❌ Error obtenint assignació activa:', error);
    next(error);
  }
};