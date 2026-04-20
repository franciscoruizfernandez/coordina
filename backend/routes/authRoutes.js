// backend/routes/authRoutes.js
import express from 'express';
import {
  registrarUsuari,
  login,
  verificarToken,
  logout,
} from '../controllers/authController.js';
import { verificarAuth } from '../middleware/authMiddleware.js';
import { nomesSiAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

// ==============================================================
// RUTES PÚBLIQUES (sense autenticació)
// ==============================================================

// POST /api/auth/login - Iniciar sessió
router.post('/login', login);

// ==============================================================
// RUTES PROTEGIDES (amb autenticació)
// ==============================================================

// POST /api/auth/register - Registrar usuari (només admin)
router.post('/register', verificarAuth, nomesSiAdmin, registrarUsuari);

// GET /api/auth/verify - Verificar si el token és vàlid
router.get('/verify', verificarAuth, verificarToken);

// POST /api/auth/logout - Tancar sessió
router.post('/logout', verificarAuth, logout);

export default router;