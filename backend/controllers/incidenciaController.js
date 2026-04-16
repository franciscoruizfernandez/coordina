// backend/controllers/incidenciaController.js

import Incidencia, { TIPOLOGIES, PRIORITATS, ESTATS } from '../models/Incidencia.js';
import EsdevenimentTracabilitat from '../models/EsdevenimentTracabilitat.js';
import { esDinsRegio, missatgeForaDeRegio } from '../utils/limitGeografic.js';

// ==============================================================
// HELPER INTERN: Registrar traçabilitat
// No llança error si falla (no bloqueja el flux principal)
// ==============================================================
const registrarEsdeveniment = async (
  tipus,
  usuariId,
  incidenciaId,
  indicatiuId,
  descripcio,
  dades = {}
) => {
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
// GET /api/incidencies
// Llistar amb paginació i filtres
// Rols: operador_sala, administrador
// ==============================================================
export const llistarIncidencies = async (req, res, next) => {
  try {
    const {
      pagina = 1,
      limit = 20,
      estat,
      prioritat,
      tipologia,
    } = req.query;

    const paginaNum = parseInt(pagina);
    const limitNum = Math.min(parseInt(limit), 100);

    if (isNaN(paginaNum) || paginaNum < 1) {
      return res.status(400).json({
        error: true,
        missatge: '"pagina" ha de ser un número positiu',
      });
    }

    if (estat && !ESTATS.includes(estat)) {
      return res.status(400).json({
        error: true,
        missatge: `Estat invàlid. Ha de ser un de: ${ESTATS.join(', ')}`,
      });
    }

    if (prioritat && !PRIORITATS.includes(prioritat)) {
      return res.status(400).json({
        error: true,
        missatge: `Prioritat invàlida. Ha de ser una de: ${PRIORITATS.join(', ')}`,
      });
    }

    const resultat = await Incidencia.llistarTotes({
      pagina: paginaNum,
      limitPerPagina: limitNum,
      estat: estat || null,
      prioritat: prioritat || null,
      tipologia: tipologia || null,
    });

    res.json({
      exit: true,
      ...resultat,
    });
  } catch (error) {
    console.error('❌ Error llistant incidències:', error);
    next(error);
  }
};

// ==============================================================
// GET /api/incidencies/actives
// Incidències actives per al mapa en temps real
// Rols: tots
// ==============================================================
export const obtenirActives = async (req, res, next) => {
  try {
    const incidencies = await Incidencia.obtenirActives();

    res.json({
      exit: true,
      total: incidencies.length,
      dades: incidencies,
    });
  } catch (error) {
    console.error('❌ Error obtenint actives:', error);
    next(error);
  }
};

// ==============================================================
// GET /api/incidencies/:id
// Detall d'una incidència
// Rols: tots
// ==============================================================
export const obtenirIncidencia = async (req, res, next) => {
  try {
    const { id } = req.params;

    const incidencia = await Incidencia.trobarPerId(id);
    if (!incidencia) {
      return res.status(404).json({
        error: true,
        missatge: 'Incidència no trobada',
      });
    }

    res.json({
      exit: true,
      dades: incidencia,
    });
  } catch (error) {
    console.error('❌ Error obtenint incidència:', error);
    next(error);
  }
};

// ==============================================================
// POST /api/incidencies
// Crear nova incidència (simula recepció 112)
// Rols: operador_sala, administrador
// ==============================================================
export const crearIncidencia = async (req, res, next) => {
  try {
    const {
      ubicacio_lat,
      ubicacio_lon,
      direccio,
      tipologia,
      prioritat,
      descripcio,
      observacions,
    } = req.body;

    // --- Validació camps obligatoris ---
    if (
      ubicacio_lat === undefined ||
      ubicacio_lon === undefined ||
      !tipologia ||
      !prioritat ||
      !descripcio
    ) {
      return res.status(400).json({
        error: true,
        missatge:
          'Els camps ubicacio_lat, ubicacio_lon, tipologia, prioritat i descripcio són obligatoris',
        campsObligatoris: [
          'ubicacio_lat',
          'ubicacio_lon',
          'tipologia',
          'prioritat',
          'descripcio',
        ],
      });
    }

    // --- Validació coordenades ---
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

    // Validació límit geogràfic de la regió
    if (!esDinsRegio(lat, lon)) {
      return res.status(400).json(missatgeForaDeRegio(lat, lon));
    }

    // --- Validació tipologia ---
    if (!TIPOLOGIES.includes(tipologia)) {
      return res.status(400).json({
        error: true,
        missatge: `Tipologia invàlida. Ha de ser una de: ${TIPOLOGIES.join(', ')}`,
        tipologiesValides: TIPOLOGIES,
      });
    }

    // --- Validació prioritat ---
    if (!PRIORITATS.includes(prioritat)) {
      return res.status(400).json({
        error: true,
        missatge: `Prioritat invàlida. Ha de ser una de: ${PRIORITATS.join(', ')}`,
        prioritatsValides: PRIORITATS,
      });
    }

    // --- Crear incidència ---
    const novaIncidencia = await Incidencia.crear({
      ubicacio_lat: lat,
      ubicacio_lon: lon,
      direccio: direccio || null,
      tipologia,
      prioritat,
      descripcio,
      observacions: observacions || null,
    });

    // ✅ Registrar a traçabilitat
    await registrarEsdeveniment(
      'creacio_incidencia',
      req.usuari?.userId || null,
      novaIncidencia.id,
      null,
      `Nova incidència creada: ${tipologia} - Prioritat: ${prioritat}`,
      { tipologia, prioritat }
    );

    res.status(201).json({
      exit: true,
      missatge: 'Incidència creada correctament',
      dades: novaIncidencia,
    });
  } catch (error) {
    console.error('❌ Error creant incidència:', error);
    next(error);
  }
};

// ==============================================================
// PUT /api/incidencies/:id
// Actualització completa
// Rols: operador_sala, administrador
// ==============================================================
export const actualitzarIncidencia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      ubicacio_lat,
      ubicacio_lon,
      direccio,
      tipologia,
      prioritat,
      descripcio,
      observacions,
    } = req.body;

    // Verificar que existeix
    const incidenciaExistent = await Incidencia.trobarPerId(id);
    if (!incidenciaExistent) {
      return res.status(404).json({
        error: true,
        missatge: 'Incidència no trobada',
      });
    }

    // No es pot modificar una tancada
    if (incidenciaExistent.estat === 'tancada') {
      return res.status(400).json({
        error: true,
        missatge: 'No es pot modificar una incidència tancada',
      });
    }

    // Validar camps obligatoris
    if (
      ubicacio_lat === undefined ||
      ubicacio_lon === undefined ||
      !tipologia ||
      !prioritat ||
      !descripcio
    ) {
      return res.status(400).json({
        error: true,
        missatge:
          'Els camps ubicacio_lat, ubicacio_lon, tipologia, prioritat i descripcio són obligatoris',
      });
    }

    // Validar coordenades
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

    // ✅ Validació límit geogràfic de la regió
    if (!esDinsRegio(lat, lon)) {
      return res.status(400).json(missatgeForaDeRegio(lat, lon));
    }

    // Validar tipologia i prioritat
    if (!TIPOLOGIES.includes(tipologia)) {
      return res.status(400).json({
        error: true,
        missatge: `Tipologia invàlida. Ha de ser una de: ${TIPOLOGIES.join(', ')}`,
      });
    }
    if (!PRIORITATS.includes(prioritat)) {
      return res.status(400).json({
        error: true,
        missatge: `Prioritat invàlida. Ha de ser una de: ${PRIORITATS.join(', ')}`,
      });
    }

    const incidenciaActualitzada = await Incidencia.actualitzar(id, {
      ubicacio_lat: lat,
      ubicacio_lon: lon,
      direccio: direccio || null,
      tipologia,
      prioritat,
      descripcio,
      observacions: observacions || null,
    });

    // ✅ Registrar a traçabilitat
    await registrarEsdeveniment(
      'modificacio_incidencia',
      req.usuari?.userId,
      id,
      null,
      `Incidència modificada`,
      {
        canvis: { tipologia, prioritat, direccio },
        prioritat_anterior: incidenciaExistent.prioritat,
        tipologia_anterior: incidenciaExistent.tipologia,
      }
    );

    res.json({
      exit: true,
      missatge: 'Incidència actualitzada correctament',
      dades: incidenciaActualitzada,
    });
  } catch (error) {
    console.error('❌ Error actualitzant incidència:', error);
    next(error);
  }
};

// ==============================================================
// PATCH /api/incidencies/:id/estat
// Canviar estat amb validació de transicions
// Rols: operador_sala, administrador
// ==============================================================
export const canviarEstatIncidencia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estat, observacions } = req.body;

    if (!estat) {
      return res.status(400).json({
        error: true,
        missatge: 'El camp "estat" és obligatori',
      });
    }

    if (!ESTATS.includes(estat)) {
      return res.status(400).json({
        error: true,
        missatge: `Estat invàlid. Ha de ser un de: ${ESTATS.join(', ')}`,
      });
    }

    const incidenciaExistent = await Incidencia.trobarPerId(id);
    if (!incidenciaExistent) {
      return res.status(404).json({
        error: true,
        missatge: 'Incidència no trobada',
      });
    }

    // No es pot canviar estat d'una tancada
    if (incidenciaExistent.estat === 'tancada') {
      return res.status(400).json({
        error: true,
        missatge: "No es pot canviar l'estat d'una incidència tancada",
      });
    }

    // Validar transicions permeses
    const transicionsPermeses = {
      nova:      ['assignada', 'tancada'],
      assignada: ['en_curs', 'nova', 'tancada'],
      en_curs:   ['resolta', 'tancada'],
      resolta:   ['tancada'],
      tancada:   [],
    };

    const estatActual = incidenciaExistent.estat;
    if (!transicionsPermeses[estatActual].includes(estat)) {
      return res.status(400).json({
        error: true,
        missatge: `Transició no permesa: ${estatActual} → ${estat}`,
        transicionsPermeses: transicionsPermeses[estatActual],
      });
    }

    const incidenciaActualitzada = await Incidencia.canviarEstat(
      id,
      estat,
      observacions || null
    );

    // ✅ Registrar a traçabilitat
    await registrarEsdeveniment(
      'canvi_estat_incidencia',
      req.usuari?.userId,
      id,
      null,
      `Canvi d'estat: ${estatActual} → ${estat}`,
      { estat_anterior: estatActual, estat_nou: estat }
    );

    res.json({
      exit: true,
      missatge: `Estat canviat correctament a "${estat}"`,
      dades: incidenciaActualitzada,
    });
  } catch (error) {
    console.error('❌ Error canviant estat:', error);
    next(error);
  }
};

// ==============================================================
// DELETE /api/incidencies/:id
// Tancament (soft delete - no elimina de la BD)
// Rols: operador_sala, administrador
// ==============================================================
export const tancarIncidencia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { observacions } = req.body || {};

    const incidenciaExistent = await Incidencia.trobarPerId(id);
    if (!incidenciaExistent) {
      return res.status(404).json({
        error: true,
        missatge: 'Incidència no trobada',
      });
    }

    if (incidenciaExistent.estat === 'tancada') {
      return res.status(400).json({
        error: true,
        missatge: 'La incidència ja està tancada',
      });
    }

    const incidenciaTancada = await Incidencia.tancar(id, observacions || null);

    // ✅ Registrar a traçabilitat
    await registrarEsdeveniment(
      'tancament_incidencia',
      req.usuari?.userId,
      id,
      null,
      `Incidència tancada`,
      {
        estat_anterior: incidenciaExistent.estat,
        observacions: observacions || null,
      }
    );

    res.json({
      exit: true,
      missatge: 'Incidència tancada correctament',
      dades: incidenciaTancada,
    });
  } catch (error) {
    console.error('❌ Error tancant incidència:', error);
    next(error);
  }
};

// ==============================================================
// GET /api/incidencies/:id/historial
// Historial complet d'accions d'una incidència
// Rols: operador_sala, administrador
// ==============================================================
export const obtenirHistorial = async (req, res, next) => {
  try {
    const { id } = req.params;

    const incidencia = await Incidencia.trobarPerId(id);
    if (!incidencia) {
      return res.status(404).json({
        error: true,
        missatge: 'Incidència no trobada',
      });
    }

    const historial = await Incidencia.obtenirHistorial(id);

    res.json({
      exit: true,
      incidencia_id: id,
      total_accions: historial.length,
      dades: historial,
    });
  } catch (error) {
    console.error('❌ Error obtenint historial:', error);
    next(error);
  }
};