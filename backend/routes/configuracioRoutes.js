// backend/routes/configuracioRoutes.js

import express from 'express';
import { obtenirMode, establirMode } from '../controllers/configuracioController.js';
import { verificarAuth } from '../middleware/authMiddleware.js';
import { nomesSiOperadorOAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Totes les rutes requereixen autenticació
router.use(verificarAuth);

// ==============================================================
// RUTES DE CONFIGURACIÓ
// ==============================================================

// GET /api/configuracio/mode — Obtenir mode actual
router.get('/mode', nomesSiOperadorOAdmin, obtenirMode);

// PUT /api/configuracio/mode — Canviar mode
router.put('/mode', nomesSiOperadorOAdmin, establirMode);

export default router;