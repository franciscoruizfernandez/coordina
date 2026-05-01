// backend/routes/assignacioRoutes.js

import express from 'express';
import {
  crearAssignacioManual,
  crearAssignacioAutomatica,
  acceptarAssignacio,
  finalitzarAssignacio,
  cancellarAssignacio,
  obtenirAssignacioActiva,
} from '../controllers/assignacioController.js';
import { verificarAuth } from '../middleware/authMiddleware.js';
import {
  nomesSiOperadorOAdmin,
  qualsevolRol,
} from '../middleware/roleMiddleware.js';

const router = express.Router();

// Totes les rutes requereixen autenticació
router.use(verificarAuth);

// ==============================================================
// RUTES D'ASSIGNACIONS
// ==============================================================

// GET /api/assignacions/activa - Obtenir assignació activa
router.get('/activa', qualsevolRol, obtenirAssignacioActiva);

// POST /api/assignacions - Assignació manual
router.post('/', nomesSiOperadorOAdmin, crearAssignacioManual);

// POST /api/assignacions/automatica - Assignació automàtica (Haversine)
// IMPORTANT: Va ABANS de /:id per evitar conflictes
router.post('/automatica', nomesSiOperadorOAdmin, crearAssignacioAutomatica);

// PATCH /api/assignacions/:id/acceptar - Patrulla accepta
router.patch('/:id/acceptar', qualsevolRol, acceptarAssignacio);

// PATCH /api/assignacions/:id/finalitzar - Finalitzar intervenció
router.patch('/:id/finalitzar', qualsevolRol, finalitzarAssignacio);

// DELETE /api/assignacions/:id - Cancel·lar assignació
router.delete('/:id', nomesSiOperadorOAdmin, cancellarAssignacio);

export default router;