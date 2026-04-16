// backend/routes/tracabilitatRoutes.js

import express from 'express';
import {
  llistarEsdeveniments,
  obtenirResum,
  exportarCSV,
  exportarJSON,
} from '../controllers/tracabilitatController.js';
import { verificarAuth } from '../middleware/authMiddleware.js';
import { nomesSiOperadorOAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(verificarAuth);

// GET /api/tracabilitat/resum - Ha d'anar ABANS de /
router.get('/resum',          nomesSiOperadorOAdmin, obtenirResum);
router.get('/exportar/csv',   nomesSiOperadorOAdmin, exportarCSV);
router.get('/exportar/json',  nomesSiOperadorOAdmin, exportarJSON);
router.get('/',               nomesSiOperadorOAdmin, llistarEsdeveniments);

export default router;