// backend/routes/incidenciaRoutes.js

import express from 'express';
import {
  llistarIncidencies,
  obtenirActives,
  obtenirIncidencia,
  crearIncidencia,
  actualitzarIncidencia,
  canviarEstatIncidencia,
  tancarIncidencia,
  obtenirHistorial,
} from '../controllers/incidenciaController.js';
import { verificarAuth } from '../middleware/authMiddleware.js';
import {
  nomesSiOperadorOAdmin,
  qualsevolRol,
} from '../middleware/roleMiddleware.js';

const router = express.Router();

// Totes les rutes requereixen autenticació
router.use(verificarAuth);

// ==============================================================
// RUTES D'INCIDÈNCIES
// ==============================================================

// GET /api/incidencies/actives - Incidències actives per al mapa
// Accessible: tots els rols autenticats
router.get('/actives', qualsevolRol, obtenirActives);

// GET /api/incidencies - Llistar amb filtres i paginació
router.get('/', nomesSiOperadorOAdmin, llistarIncidencies);

// GET /api/incidencies/:id - Detall
router.get('/:id', qualsevolRol, obtenirIncidencia);

// POST /api/incidencies - Crear (simula 112)
router.post('/', nomesSiOperadorOAdmin, crearIncidencia);

// PUT /api/incidencies/:id - Actualització completa
router.put('/:id', nomesSiOperadorOAdmin, actualitzarIncidencia);

// PATCH /api/incidencies/:id/estat - Canviar estat
router.patch('/:id/estat', nomesSiOperadorOAdmin, canviarEstatIncidencia);

// DELETE /api/incidencies/:id - Tancament (soft delete)
router.delete('/:id', nomesSiOperadorOAdmin, tancarIncidencia);

// GET /api/incidencies/:id/historial - Historial d'accions
router.get('/:id/historial', nomesSiOperadorOAdmin, obtenirHistorial);

export default router;