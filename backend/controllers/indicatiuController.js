// backend/controllers/indicatiuController.js

import Indicatiu, { TIPUS_UNITAT, ESTATS_OPERATIUS } from '../models/Indicatiu.js';
import EsdevenimentTracabilitat from '../models/EsdevenimentTracabilitat.js';
import OcupacioIndicatiuActiva from '../models/OcupacioIndicatiuActiva.js';
import {
  emetreUbicacioIndicatiu,
  emetreCanviEstatIndicatiu,
} from '../sockets/emissors.js';

// Helper de traçabilitat intern
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
// GET /api/indicatius
// Llistar tots els indicatius (amb filtre optatiu per estat)
// Accessible: operador_sala, administrador
// US012
// ==============================================================
export const llistarIndicatius = async (req, res, next) => {
  try {
    const { estat_operatiu } = req.query;

    if (estat_operatiu && !ESTATS_OPERATIUS.includes(estat_operatiu)) {
      return res.status(400).json({
        error: true,
        missatge: `Estat operatiu invàlid. Ha de ser un de: ${ESTATS_OPERATIUS.join(', ')}`,
      });
    }

    const indicatius = await Indicatiu.llistarTots({
      estat_operatiu: estat_operatiu || null,
    });

    res.json({
      exit: true,
      total: indicatius.length,
      dades: indicatius,
    });
  } catch (error) {
    console.error('❌ Error llistant indicatius:', error);
    next(error);
  }
};

// ==============================================================
// GET /api/indicatius/disponibles
// Llistar indicatius disponibles per a assignació
// Accessible: operador_sala, administrador
// US012
// ==============================================================
export const llistarDisponibles = async (req, res, next) => {
  try {
    const disponibles = await Indicatiu.trobarDisponibles();

    res.json({
      exit: true,
      total: disponibles.length,
      dades: disponibles,
    });
  } catch (error) {
    console.error('❌ Error obtenint disponibles:', error);
    next(error);
  }
};

// ==============================================================
// GET /api/indicatius/:id
// Detall d'un indicatiu
// Accessible: tots els rols autenticats
// US012
// ==============================================================
export const obtenirIndicatiu = async (req, res, next) => {
  try {
    const { id } = req.params;

    const indicatiu = await Indicatiu.trobarPerId(id);
    if (!indicatiu) {
      return res.status(404).json({
        error: true,
        missatge: 'Indicatiu no trobat',
      });
    }

    res.json({
      exit: true,
      dades: indicatiu,
    });
  } catch (error) {
    console.error('❌ Error obtenint indicatiu:', error);
    next(error);
  }
};

// ==============================================================
// POST /api/indicatius
// Crear nou indicatiu (patrulla)
// Accessible: administrador
// US012
// ==============================================================
export const crearIndicatiu = async (req, res, next) => {
  try {
    const { codi, tipus_unitat, sector_assignat, ubicacio_lat, ubicacio_lon } = req.body;

    // Validació de camps obligatoris
    if (!codi || !tipus_unitat) {
      return res.status(400).json({
        error: true,
        missatge: 'Els camps codi i tipus_unitat són obligatoris',
      });
    }

    // Validar tipus_unitat
    if (!TIPUS_UNITAT.includes(tipus_unitat)) {
      return res.status(400).json({
        error: true,
        missatge: `Tipus d'unitat invàlid. Ha de ser un de: ${TIPUS_UNITAT.join(', ')}`,
      });
    }

    // Validar coordenades si s'envien
    if (ubicacio_lat !== undefined || ubicacio_lon !== undefined) {
      const lat = parseFloat(ubicacio_lat);
      const lon = parseFloat(ubicacio_lon);

      if (isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({ error: true, missatge: 'Latitud invàlida' });
      }
      if (isNaN(lon) || lon < -180 || lon > 180) {
        return res.status(400).json({ error: true, missatge: 'Longitud invàlida' });
      }
    }

    // Verificar codi únic
    const indicatiuExistent = await Indicatiu.trobarPerCodi(codi);
    if (indicatiuExistent) {
      return res.status(409).json({
        error: true,
        missatge: `El codi d'indicatiu "${codi}" ja existeix`,
      });
    }

    const nouIndicatiu = await Indicatiu.crear({
      codi,
      tipus_unitat,
      sector_assignat: sector_assignat || null,
      ubicacio_lat: ubicacio_lat ? parseFloat(ubicacio_lat) : null,
      ubicacio_lon: ubicacio_lon ? parseFloat(ubicacio_lon) : null,
    });

    // ✅ US014: Traçabilitat
    await registrarEsdeveniment(
      'creacio_indicatiu',
      req.usuari?.userId,
      null,
      nouIndicatiu.id,
      `Nou indicatiu creat: ${codi} (${tipus_unitat})`,
      { codi, tipus_unitat, sector_assignat }
    );

    res.status(201).json({
      exit: true,
      missatge: 'Indicatiu creat correctament',
      dades: nouIndicatiu,
    });
  } catch (error) {
    console.error('❌ Error creant indicatiu:', error);
    next(error);
  }
};

// ==============================================================
// PATCH /api/indicatius/:id/ubicacio
// Actualitzar posició GPS
// Accessible: patrulla (la pròpia), operador_sala, administrador
// US012
// ==============================================================
export const actualitzarUbicacio = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ubicacio_lat, ubicacio_lon } = req.body;

    // Validar camps obligatoris
    if (ubicacio_lat === undefined || ubicacio_lon === undefined) {
      return res.status(400).json({
        error: true,
        missatge: 'Els camps ubicacio_lat i ubicacio_lon són obligatoris',
      });
    }

    // Validar rang de coordenades
    const lat = parseFloat(ubicacio_lat);
    const lon = parseFloat(ubicacio_lon);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        error: true,
        missatge: 'La latitud ha de ser un número entre -90 i 90',
      });
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({
        error: true,
        missatge: 'La longitud ha de ser un número entre -180 i 180',
      });
    }

    // Verificar que existeix
    const indicatiuExistent = await Indicatiu.trobarPerId(id);
    if (!indicatiuExistent) {
      return res.status(404).json({
        error: true,
        missatge: 'Indicatiu no trobat',
      });
    }

    const indicatiuActualitzat = await Indicatiu.actualitzarUbicacio(id, lat, lon);

    // ✅ US014: Traçabilitat GPS (registrem cada actualització)
    await registrarEsdeveniment(
      'actualitzacio_gps',
      req.usuari?.userId,
      indicatiuExistent.incidencia_assignada_id || null,
      id,
      `GPS actualitzat: ${lat}, ${lon}`,
      { lat, lon }
    );

    // EMETRE EVENT WEBSOCKET (GPS en temps real)
    emetreUbicacioIndicatiu(indicatiuActualitzat);

    res.json({
      exit: true,
      missatge: 'Ubicació actualitzada correctament',
      dades: {
        id: indicatiuActualitzat.id,
        codi: indicatiuActualitzat.codi,
        ubicacio_lat: indicatiuActualitzat.ubicacio_lat,
        ubicacio_lon: indicatiuActualitzat.ubicacio_lon,
        ultima_actualitzacio_gps: indicatiuActualitzat.ultima_actualitzacio_gps,
      },
    });
  } catch (error) {
    console.error('❌ Error actualitzant ubicació:', error);
    next(error);
  }
};

// ==============================================================
// PATCH /api/indicatius/:id/estat
// Canviar estat operatiu
// Accessible: patrulla (la pròpia), operador_sala, administrador
// US012
// ==============================================================
export const canviarEstatIndicatiu = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estat_operatiu } = req.body;

    // Validar camp obligatori
    if (!estat_operatiu) {
      return res.status(400).json({
        error: true,
        missatge: 'El camp "estat_operatiu" és obligatori',
      });
    }

    // Validar valor
    if (!ESTATS_OPERATIUS.includes(estat_operatiu)) {
      return res.status(400).json({
        error: true,
        missatge: `Estat operatiu invàlid. Ha de ser un de: ${ESTATS_OPERATIUS.join(', ')}`,
      });
    }

    // Verificar existència
    const indicatiuExistent = await Indicatiu.trobarPerId(id);
    if (!indicatiuExistent) {
      return res.status(404).json({
        error: true,
        missatge: 'Indicatiu no trobat',
      });
    }

    const estatAnterior = indicatiuExistent.estat_operatiu;
    const indicatiuActualitzat = await Indicatiu.canviarEstat(id, estat_operatiu);

    // ✅ US014: Traçabilitat
    await registrarEsdeveniment(
      'canvi_estat_indicatiu',
      req.usuari?.userId,
      indicatiuExistent.incidencia_assignada_id || null,
      id,
      `Canvi d'estat operatiu: ${estatAnterior} → ${estat_operatiu}`,
      { estat_anterior: estatAnterior, estat_nou: estat_operatiu }
    );

    // EMETRE EVENT WEBSOCKET
    emetreCanviEstatIndicatiu(id, estatAnterior, estat_operatiu);

    res.json({
      exit: true,
      missatge: `Estat operatiu canviat a "${estat_operatiu}"`,
      dades: indicatiuActualitzat,
    });
  } catch (error) {
    console.error('❌ Error canviant estat indicatiu:', error);
    next(error);
  }
};

// ==============================================================
// GET /api/indicatius/:id/historial
// Historial d'un indicatiu (GPS i canvis d'estat)
// Accessible: operador_sala, administrador
// US012
// ==============================================================
export const obtenirHistorialIndicatiu = async (req, res, next) => {
  try {
    const { id } = req.params;

    const indicatiu = await Indicatiu.trobarPerId(id);
    if (!indicatiu) {
      return res.status(404).json({
        error: true,
        missatge: 'Indicatiu no trobat',
      });
    }

    const historial = await Indicatiu.obtenirHistorial(id);

    res.json({
      exit: true,
      indicatiu_id: id,
      indicatiu_codi: indicatiu.codi,
      total_entrades: historial.length,
      dades: historial,
    });
  } catch (error) {
    console.error('❌ Error obtenint historial indicatiu:', error);
    next(error);
  }
};

// ==============================================================
// GET /api/indicatius/seleccio/actual
// Obtenir l'indicatiu seleccionat per l'usuari actual
// Accessible: patrulla
// ==============================================================
export const obtenirSeleccioActual = async (req, res, next) => {
  try {
    const usuariId = req.usuari.userId;

    const ocupacio = await OcupacioIndicatiuActiva.trobarPerUsuari(usuariId);

    if (!ocupacio) {
      return res.json({
        exit: true,
        teSeleccio: false,
        dades: null,
      });
    }

    res.json({
      exit: true,
      teSeleccio: true,
      dades: {
        indicatiu_id: ocupacio.indicatiu_id,
        codi: ocupacio.indicatiu_codi,
        tipus_unitat: ocupacio.tipus_unitat,
        estat_operatiu: ocupacio.estat_operatiu,
        ubicacio_lat: ocupacio.ubicacio_lat,
        ubicacio_lon: ocupacio.ubicacio_lon,
        sector_assignat: ocupacio.sector_assignat,
        incidencia_assignada_id: ocupacio.incidencia_assignada_id,
        timestamp_inici: ocupacio.timestamp_inici,
      },
    });
  } catch (error) {
    console.error('❌ Error obtenint selecció actual:', error);
    next(error);
  }
};

// ==============================================================
// GET /api/indicatius/seleccionables
// Llistar indicatius disponibles per seleccionar
// Accessible: patrulla
// ==============================================================
export const llistarSeleccionables = async (req, res, next) => {
  try {
    const indicatius = await OcupacioIndicatiuActiva.llistarSeleccionables();

    res.json({
      exit: true,
      total: indicatius.length,
      dades: indicatius,
    });
  } catch (error) {
    console.error('❌ Error llistant seleccionables:', error);
    next(error);
  }
};

// ==============================================================
// POST /api/indicatius/seleccio
// Seleccionar un indicatiu
// Accessible: patrulla
// ==============================================================
export const seleccionarIndicatiu = async (req, res, next) => {
  try {
    const usuariId = req.usuari.userId;
    const { indicatiu_id } = req.body;

    // Validar camp obligatori
    if (!indicatiu_id) {
      return res.status(400).json({
        error: true,
        missatge: 'El camp indicatiu_id és obligatori',
      });
    }

    // Verificar que l'indicatiu existeix
    const indicatiu = await Indicatiu.trobarPerId(indicatiu_id);
    if (!indicatiu) {
      return res.status(404).json({
        error: true,
        missatge: 'Indicatiu no trobat',
      });
    }

    // Intentar seleccionar
    const resultat = await OcupacioIndicatiuActiva.seleccionar(usuariId, indicatiu_id);

    if (resultat.error) {
      return res.status(400).json({
        error: true,
        missatge: resultat.missatge,
      });
    }

    // Registrar traçabilitat
    await registrarEsdeveniment(
      'seleccio_indicatiu',
      usuariId,
      null,
      indicatiu_id,
      `Usuari ha seleccionat l'indicatiu ${indicatiu.codi}`,
      { indicatiu_codi: indicatiu.codi }
    );

    res.status(201).json({
      exit: true,
      missatge: `Indicatiu ${indicatiu.codi} seleccionat correctament`,
      dades: resultat.dades,
    });
  } catch (error) {
    console.error('❌ Error seleccionant indicatiu:', error);
    next(error);
  }
};

// ==============================================================
// DELETE /api/indicatius/seleccio
// Alliberar l'indicatiu seleccionat
// Accessible: patrulla
// ==============================================================
export const alliberarIndicatiu = async (req, res, next) => {
  try {
    const usuariId = req.usuari.userId;
    const { motiu_fi } = req.body; // opcional: 'logout', 'canvi_indicatiu', etc.

    const resultat = await OcupacioIndicatiuActiva.alliberar(
      usuariId,
      motiu_fi || 'logout'
    );

    if (resultat.error) {
      return res.status(400).json({
        error: true,
        missatge: resultat.missatge,
      });
    }

    // Registrar traçabilitat
    await registrarEsdeveniment(
      'alliberament_indicatiu',
      usuariId,
      null,
      resultat.dades.indicatiu_id,
      `Usuari ha alliberat l'indicatiu. Motiu: ${motiu_fi || 'logout'}`,
      { motiu_fi: motiu_fi || 'logout' }
    );

    res.json({
      exit: true,
      missatge: 'Indicatiu alliberat correctament',
      dades: resultat.dades,
    });
  } catch (error) {
    console.error('❌ Error alliberant indicatiu:', error);
    next(error);
  }
};