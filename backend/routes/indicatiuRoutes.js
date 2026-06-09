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
  obtenirRutaProxy,
} from '../controllers/indicatiuController.js';
import { verificarAuth } from '../middleware/authMiddleware.js';
import {
  nomesSiAdmin,
  nomesSiOperadorOAdmin,
  qualsevolRol,
  nomesSiPatrulla,
} from '../middleware/roleMiddleware.js';
import {
  validarActualitzarGPS,
  validarCanviarEstatIndicatiu,
} from '../middleware/validacions.js';

const router = express.Router();

// Totes les rutes requereixen autenticació
router.use(verificarAuth);

// ==============================================================
// RUTES D'INDICATIUS
// ==============================================================

// ── Rutes de selecció (patrulles) ─────────────────────────────

// GET /api/indicatius/seleccio/actual - Obtenir indicatiu actual de l'usuari
router.get('/seleccio/actual', nomesSiPatrulla, obtenirSeleccioActual);

// GET /api/indicatius/seleccionables - Llistar indicatius disponibles
router.get('/seleccionables', nomesSiPatrulla, llistarSeleccionables);

// POST /api/indicatius/seleccio - Seleccionar un indicatiu
router.post('/seleccio', nomesSiPatrulla, seleccionarIndicatiu);

// DELETE /api/indicatius/seleccio - Alliberar indicatiu
router.delete('/seleccio', nomesSiPatrulla, alliberarIndicatiu);


// ── Rutes fixes ────────────────────────────────────────────────

// GET /api/indicatius/disponibles - Llistar disponibles
router.get('/disponibles', nomesSiOperadorOAdmin, llistarDisponibles);

// GET /api/indicatius/ruta - Proxy OSRM per calcular rutes
router.get('/ruta', qualsevolRol, obtenirRutaProxy);

// GET /api/indicatius - Llistar tots
router.get('/', nomesSiOperadorOAdmin, llistarIndicatius);

// POST /api/indicatius - Crear (admin)
router.post('/', nomesSiAdmin, crearIndicatiu);

// ── Rutes amb /:id  ─────────────────────────────────────────

// GET /api/indicatius/:id - Detall
router.get('/:id', qualsevolRol, obtenirIndicatiu);

// PATCH /api/indicatius/:id/ubicacio - Actualitzar GPS
// Accessible per patrulles (enviament automàtic) i operadors
router.patch('/:id/ubicacio', qualsevolRol, validarActualitzarGPS, actualitzarUbicacio);

// PATCH /api/indicatius/:id/estat - Canviar estat operatiu
router.patch('/:id/estat', qualsevolRol, validarCanviarEstatIndicatiu, canviarEstatIndicatiu);

// GET /api/indicatius/:id/historial - Historial
router.get('/:id/historial', nomesSiOperadorOAdmin, obtenirHistorialIndicatiu);


export default router;