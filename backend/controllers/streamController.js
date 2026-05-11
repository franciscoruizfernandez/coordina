// backend/controllers/streamController.js

import StreamVideo from '../models/StreamVideo.js';

// Tipus de font vàlids (han de coincidir amb el CHECK de la BD)
const TIPUS_FONT_VALIDS = ['camera_vehicle', 'drone', 'cctv', 'bodycam'];

// ==============================================================
// GET /api/streams
// Llistar streams amb filtres opcionals
// Query params: indicatiu_id, incidencia_id
// Si no es passa cap filtre, retorna tots els actius
// ==============================================================
export const llistarStreams = async (req, res, next) => {
  try {
    const { indicatiu_id, incidencia_id } = req.query;

    let streams;

    if (indicatiu_id) {
      streams = await StreamVideo.trobarPerIndicatiu(indicatiu_id);
    } else if (incidencia_id) {
      streams = await StreamVideo.trobarPerIncidencia(incidencia_id);
    } else {
      streams = await StreamVideo.llistarActius();
    }

    res.json({
      exit: true,
      total: streams.length,
      dades: streams,
    });
  } catch (error) {
    console.error('❌ Error llistant streams:', error);
    next(error);
  }
};

// ==============================================================
// GET /api/streams/:id
// Obtenir un stream per ID
// ==============================================================
export const obtenirStream = async (req, res, next) => {
  try {
    const { id } = req.params;

    const stream = await StreamVideo.trobarPerId(id);

    if (!stream) {
      return res.status(404).json({
        error: true,
        missatge: 'Stream no trobat',
      });
    }

    res.json({
      exit: true,
      dades: stream,
    });
  } catch (error) {
    console.error('❌ Error obtenint stream:', error);
    next(error);
  }
};

// ==============================================================
// POST /api/streams
// Crear un nou stream
// Accessible: administrador
// ==============================================================
export const crearStream = async (req, res, next) => {
  try {
    const { indicatiu_id, incidencia_id, url_stream, tipus_font } = req.body;

    // Validar URL obligatòria
    if (!url_stream) {
      return res.status(400).json({
        error: true,
        missatge: 'El camp url_stream és obligatori',
      });
    }

    // Validar tipus_font
    if (tipus_font && !TIPUS_FONT_VALIDS.includes(tipus_font)) {
      return res.status(400).json({
        error: true,
        missatge: `Tipus de font invàlid. Ha de ser un de: ${TIPUS_FONT_VALIDS.join(', ')}`,
      });
    }

    // Cal almenys un indicatiu o una incidència
    if (!indicatiu_id && !incidencia_id) {
      return res.status(400).json({
        error: true,
        missatge: 'Cal especificar almenys indicatiu_id o incidencia_id',
      });
    }

    const nouStream = await StreamVideo.crear({
      indicatiu_id,
      incidencia_id,
      url_stream,
      tipus_font: tipus_font || null,
    });

    res.status(201).json({
      exit: true,
      missatge: 'Stream creat correctament',
      dades: nouStream,
    });
  } catch (error) {
    console.error('❌ Error creant stream:', error);
    next(error);
  }
};

// ==============================================================
// PATCH /api/streams/:id/toggle
// Activar o desactivar un stream
// ==============================================================
export const toggleStream = async (req, res, next) => {
  try {
    const { id } = req.params;

    const stream = await StreamVideo.toggle(id);

    if (!stream) {
      return res.status(404).json({
        error: true,
        missatge: 'Stream no trobat',
      });
    }

    res.json({
      exit: true,
      missatge: `Stream ${stream.actiu ? 'activat' : 'desactivat'} correctament`,
      dades: stream,
    });
  } catch (error) {
    console.error('❌ Error toggling stream:', error);
    next(error);
  }
};