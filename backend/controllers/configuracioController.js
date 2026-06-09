// backend/controllers/configuracioController.js

import Configuracio, { MODES } from '../models/Configuracio.js';
import { intentarAutoassignarPendents } from '../services/autoassignacioService.js';

// ==============================================================
// GET /api/configuracio/mode
// Retorna el mode d'assignació actual del sistema
// Accessible: operador_sala, administrador
// ==============================================================
export const obtenirMode = async (req, res, next) => {
  try {
    const mode = await Configuracio.obtenirMode();

    res.json({
      exit:  true,
      dades: { mode },
    });
  } catch (error) {
    console.error('❌ Error obtenint mode:', error);
    next(error);
  }
};

// ==============================================================
// PUT /api/configuracio/mode
// Canvia el mode d'assignació del sistema
// Body: { mode: 'manual' | 'automatic' }
// Accessible: operador_sala, administrador
// Si s'activa el mode automàtic, fa una barrida d'incidències pendents
// ==============================================================
export const establirMode = async (req, res, next) => {
  try {
    const { mode } = req.body;

    if (!mode) {
      return res.status(400).json({
        error:   true,
        missatge: 'El camp "mode" és obligatori',
      });
    }

    if (!Object.values(MODES).includes(mode)) {
      return res.status(400).json({
        error:   true,
        missatge: `Mode invàlid. Ha de ser "manual" o "automatic"`,
        modesValids: Object.values(MODES),
      });
    }

    // Obtenir mode anterior per saber si hem canviat
    const modeAnterior = await Configuracio.obtenirMode();

    await Configuracio.establirMode(mode);

    console.log(`🔄 Mode d'assignació canviat: ${modeAnterior} → ${mode}`);

    // Si s'ha activat el mode automàtic, fer barrida immediata
    // Esperem el resultat per retornar-lo a la resposta HTTP
    let assignacionsCreades = 0;

    if (mode === MODES.AUTOMATIC && modeAnterior !== MODES.AUTOMATIC) {
      console.log('🔄 Mode automàtic activat — iniciant barrida de pendents...');
      try {
        assignacionsCreades = await intentarAutoassignarPendents();
      } catch (err) {
        console.error('❌ Error en barrida inicial de mode automàtic:', err.message);
        // No aturem la resposta, simplement informem que ha fallat
      }
    }

    res.json({
      exit:     true,
      missatge: mode === MODES.AUTOMATIC && assignacionsCreades > 0
        ? `Mode automàtic activat. ${assignacionsCreades} incidència/es assignada/es automàticament.`
        : `Mode d'assignació establert a "${mode}"`,
      dades: {
        mode_anterior:        modeAnterior,
        mode_nou:             mode,
        assignacions_creades: assignacionsCreades,
      },
    });
  } catch (error) {
    console.error('❌ Error establint mode:', error);
    next(error);
  }
};