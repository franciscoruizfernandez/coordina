// backend/controllers/incidenciaController.js

import Incidencia, {
  TIPOLOGIES,
  PRIORITATS,
  ESTATS,
} from '../models/Incidencia.js';
import EsdevenimentTracabilitat from '../models/EsdevenimentTracabilitat.js';

// ==============================================================
// HELPER: Registrar esdeveniment de traçabilitat
// Funció interna per no duplicar codi
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
    // La traçabilitat NO bloqueja el flux principal
    console.error('⚠️  Error registrant traçabilitat:', err.message);
  }
};

// ==============================================================
// GET /api/incidencies
// Llistar incidències amb paginació i filtres
// Accessible: operador_sala, administrador
// US011
// ==============================================================
export const llistarIncidencies = async (req, res, next) => {
  try {
    const {
      pagina = 1,
      limit = 20,
      estat,
      prioritat,
      tipologia,
      sector,
    } = req.query;

    // Validar paginació
    const paginaNum = parseInt(pagina);
    const limitNum = Math.min(parseInt(limit), 100);

    if (isNaN(paginaNum) || paginaNum < 1) {
      return res.status(400).json({
        error: true,
        missatge: 'El paràmetre "pagina" ha de ser un número positiu',
      });
    }

    // Validar filtres si s'envien
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
      sector: sector || null,
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
// Obtenir incidències actives per al mapa
// Accessible: operador_sala, administrador
// US011
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
    console.error('❌ Error obtenint incidències actives:', error);
    next(error);
  }
};

// ==============================================================
// GET /api/incidencies/:id
// Detall d'una incidència
// Accessible: operador_sala, administrador, patrulla (la pròpia)
// US011
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
// Accessible: operador_sala, administrador
// US011
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

    // --- Validació de camps obligatoris ---
    if (!ubicacio_lat || !ubicacio_lon || !tipologia || !prioritat || !descripcio) {
      return res.status(400).json({
        error: true,
        missatge: 'Els camps ubicacio_lat, ubicacio_lon, tipologia, prioritat i descripcio són obligatoris',
        campsObligatoris: ['ubicacio_lat', 'ubicacio_lon', 'tipologia', 'prioritat', 'descripcio'],
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

    // --- Validació tipologia ---
    if (!TIPOLOGIES.includes(tipologia)) {
      return res.status(400).json({
        error: true,
        missatge: `Tipologia invàlida. Ha de ser una de: ${TIPOLOGIES.join(', ')}`,
      });
    }

    // --- Validació prioritat ---
    if (!PRIORITATS.includes(prioritat)) {
      return res.status(400).json({
        error: true,
        missatge: `Prioritat invàlida. Ha de ser una de: ${PRIORITATS.join(', ')}`,
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

    // ✅ US014: Registrar a traçabilitat
    await registrarEsdeveniment(
      'creacio_incidencia',
      req.usuari?.userId || null,
      novaIncidencia.id,
      null,
      `Nova incidència creada: ${tipologia} - Prioritat: ${prioritat}`,
      { tipologia, prioritat, sector: novaIncidencia.sector_territorial }
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
// Actualitzar incidència completa
// Accessible: operador_sala, administrador
// US011
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

    // No es pot modificar una incidència tancada
    if (incidenciaExistent.estat === 'tancada') {
      return res.status(400).json({
        error: true,
        missatge: 'No es pot modificar una incidència tancada',
      });
    }

    // Validar camps obligatoris
    if (!ubicacio_lat || !ubicacio_lon || !tipologia || !prioritat || !descripcio) {
      return res.status(400).json({
        error: true,
        missatge: 'Els camps ubicacio_lat, ubicacio_lon, tipologia, prioritat i descripcio són obligatoris',
      });
    }

    // Validar coordenades
    const lat = parseFloat(ubicacio_lat);
    const lon = parseFloat(ubicacio_lon);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ error: true, missatge: 'Latitud invàlida' });
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({ error: true, missatge: 'Longitud invàlida' });
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
      direccio,
      tipologia,
      prioritat,
      descripcio,
      observacions,
    });

    // ✅ US014: Registrar modificació
    await registrarEsdeveniment(
      'modificacio_incidencia',
      req.usuari?.userId,
      id,
      null,
      `Incidència modificada`,
      {
        canvis: { tipologia, prioritat, direccio },
        estat_anterior: incidenciaExistent.estat,
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
// Canviar estat de la incidència
// Accessible: operador_sala, administrador
// US011
// ==============================================================
export const canviarEstatIncidencia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estat, observacions } = req.body;

    // Validar estat
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

    // Verificar que existeix
    const incidenciaExistent = await Incidencia.trobarPerId(id);
    if (!incidenciaExistent) {
      return res.status(404).json({
        error: true,
        missatge: 'Incidència no trobada',
      });
    }

    // No es pot canviar l'estat d'una incidència ja tancada
    if (incidenciaExistent.estat === 'tancada') {
      return res.status(400).json({
        error: true,
        missatge: 'No es pot canviar l\'estat d\'una incidència tancada',
      });
    }

    // Validar transicions d'estat permeses
    const transicionsPermeses = {
      nova:      ['assignada', 'tancada'],
      assignada: ['en_curs', 'nova', 'tancada'],
      en_curs:   ['resolta', 'tancada'],
      resolta:   ['tancada'],
      tancada:   [], // Estat final
    };

    const estatActual = incidenciaExistent.estat;
    if (!transicionsPermeses[estatActual].includes(estat)) {
      return res.status(400).json({
        error: true,
        missatge: `Transició d'estat no permesa: ${estatActual} → ${estat}`,
        transicionsPermeses: transicionsPermeses[estatActual],
      });
    }

    const incidenciaActualitzada = await Incidencia.canviarEstat(id, estat, observacions);

    // ✅ US014: Registrar canvi d'estat
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
// Tancament (soft delete - marca com tancada)
// Accessible: operador_sala, administrador
// US011
// ==============================================================
export const tancarIncidencia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { observacions } = req.body;

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

    const incidenciaTancada = await Incidencia.tancar(id, observacions);

    // ✅ US014: Registrar tancament
    await registrarEsdeveniment(
      'tancament_incidencia',
      req.usuari?.userId,
      id,
      null,
      `Incidència tancada`,
      { estat_anterior: incidenciaExistent.estat, observacions }
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
// Historial d'accions d'una incidència
// Accessible: operador_sala, administrador
// US011
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