// backend/controllers/missatgeController.js

import Missatge from '../models/Missatge.js';
import { emetreSala, emetrePatrulla } from '../sockets/emissors.js';

// ==============================================================
// POST /api/missatges
// ==============================================================
export const enviarMissatge = async (req, res, next) => {
  try {
    const { incidencia_id, contingut, destinatari_id } = req.body;
    const emissor_id = req.usuari.userId;

    if (!contingut || contingut.trim().length === 0) {
      return res.status(400).json({
        error: true,
        missatge: 'El contingut no pot estar buit'
      });
    }

    const nouMissatge = await Missatge.crear({
      emissor_id,
      destinatari_id: destinatari_id || null,
      incidencia_id: incidencia_id || null,
      contingut
    });

    // ✅ Emissió WebSocket
    emetreSala('nou_missatge', { missatge: nouMissatge });

    if (destinatari_id) {
      emetrePatrulla(destinatari_id, 'nou_missatge', { missatge: nouMissatge });
    }

    res.status(201).json({
      exit: true,
      missatge: 'Missatge enviat correctament',
      dades: nouMissatge
    });

  } catch (error) {
    console.error('❌ Error enviant missatge:', error);
    next(error);
  }
};

// ==============================================================
// GET /api/missatges?incidencia_id=X
// ==============================================================
export const obtenirHistorial = async (req, res, next) => {
  try {
    const { incidencia_id } = req.query;

    if (!incidencia_id) {
      return res.status(400).json({
        error: true,
        missatge: 'Cal especificar incidencia_id'
      });
    }

    const historial = await Missatge.obtenirPerIncidencia(incidencia_id);

    res.json({
      exit: true,
      total: historial.length,
      dades: historial
    });

  } catch (error) {
    console.error('❌ Error obtenint historial:', error);
    next(error);
  }
};

// ==============================================================
// PATCH /api/missatges/:id/llegit
// ==============================================================
export const marcarLlegit = async (req, res, next) => {
  try {
    const { id } = req.params;

    const missatge = await Missatge.marcarLlegit(id);

    if (!missatge) {
      return res.status(404).json({
        error: true,
        missatge: 'Missatge no trobat'
      });
    }

    res.json({
      exit: true,
      missatge: 'Missatge marcat com a llegit',
      dades: missatge
    });

  } catch (error) {
    console.error('❌ Error marcant com a llegit:', error);
    next(error);
  }
};