// backend/routes/streamRoutes.js

import express from 'express';
import {
  llistarStreams,
  obtenirStream,
  crearStream,
  toggleStream,
} from '../controllers/streamController.js';
import { verificarAuth } from '../middleware/authMiddleware.js';
import {
  nomesSiAdmin,
  nomesSiOperadorOAdmin,
} from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(verificarAuth);

// GET /api/streams - Llistar streams (amb filtres opcionals)
router.get('/', nomesSiOperadorOAdmin, llistarStreams);

// GET /api/streams/:id - Obtenir un stream
router.get('/:id', nomesSiOperadorOAdmin, obtenirStream);

// POST /api/streams - Crear stream (admin)
router.post('/', nomesSiAdmin, crearStream);

// PATCH /api/streams/:id/toggle - Activar/desactivar
router.patch('/:id/toggle', nomesSiOperadorOAdmin, toggleStream);

export default router;