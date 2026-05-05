// backend/routes/indicatiuRoutes.js

import express from 'express';
import {
  llistarIndicatius,
  llistarDisponibles,
  obtenirIndicatiu,
  crearIndicatiu,
  actualitzarUbicacio,
  canviarEstatIndicatiu,
  obtenirHistorialIndicatiu,
  obtenirSeleccioActual,
  llistarSeleccionables,
  seleccionarIndicatiu,
  alliberarIndicatiu,
} from '../controllers/indicatiuController.js';
import { verificarAuth } from '../middleware/authMiddleware.js';
import {
  nomesSiAdmin,
  nomesSiOperadorOAdmin,
  qualsevolRol,
  nomesSiPatrulla,
} from '../middleware/roleMiddleware.js';

const router = express.Router();

// Totes les rutes requereixen autenticació
router.use(verificarAuth);

// ==============================================================
// RUTES D'INDICATIUS
// ==============================================================

// ==============================================================
// RUTES DE SELECCIÓ D'INDICATIU (per a patrulles)
// IMPORTANT: Han d'anar ABANS de les rutes amb /:id
// ==============================================================

// GET /api/indicatius/seleccio/actual - Obtenir indicatiu actual de l'usuari
router.get('/seleccio/actual', nomesSiPatrulla, obtenirSeleccioActual);

// GET /api/indicatius/seleccionables - Llistar indicatius disponibles
router.get('/seleccionables', nomesSiPatrulla, llistarSeleccionables);

// POST /api/indicatius/seleccio - Seleccionar un indicatiu
router.post('/seleccio', nomesSiPatrulla, seleccionarIndicatiu);

// DELETE /api/indicatius/seleccio - Alliberar indicatiu
router.delete('/seleccio', nomesSiPatrulla, alliberarIndicatiu);

// GET /api/indicatius/disponibles - Llistar disponibles
// IMPORTANT: Aquesta ruta ha d'anar ABANS de /:id
router.get('/disponibles', nomesSiOperadorOAdmin, llistarDisponibles);

// GET /api/indicatius - Llistar tots
router.get('/', nomesSiOperadorOAdmin, llistarIndicatius);

// GET /api/indicatius/:id - Detall
router.get('/:id', qualsevolRol, obtenirIndicatiu);

// POST /api/indicatius - Crear (admin)
router.post('/', nomesSiAdmin, crearIndicatiu);

// PATCH /api/indicatius/:id/ubicacio - Actualitzar GPS
// Accessible per patrulles (enviament automàtic) i operadors
router.patch('/:id/ubicacio', qualsevolRol, actualitzarUbicacio);

// PATCH /api/indicatius/:id/estat - Canviar estat operatiu
router.patch('/:id/estat', qualsevolRol, canviarEstatIndicatiu);

// GET /api/indicatius/:id/historial - Historial
router.get('/:id/historial', nomesSiOperadorOAdmin, obtenirHistorialIndicatiu);




export default router;