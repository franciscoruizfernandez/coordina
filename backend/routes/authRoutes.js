// backend/routes/authRoutes.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  registrarUsuari,
  login,
  verificarToken,
  logout,
} from '../controllers/authController.js';
import { verificarAuth } from '../middleware/authMiddleware.js';
import { nomesSiAdmin } from '../middleware/roleMiddleware.js';
import { validarLogin, validarRegistre } from '../middleware/validacions.js';

const router = express.Router();

// ==============================================================
// RATE LIMITING ESPECÍFIC PER A LOGIN
// Màxim 5 intents per IP cada 15 minuts
// Protegeix contra atacs de força bruta
// ==============================================================
const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    missatge: 'Massa intents d\'inici de sessió. Torna-ho a intentar en 15 minuts.',
  },
});

// ==============================================================
// RUTES PÚBLIQUES (sense autenticació)
// ==============================================================

// POST /api/auth/login - Iniciar sessió (amb rate limiting + validació)
router.post('/login', limitadorLogin, validarLogin, login);

// ==============================================================
// RUTES PROTEGIDES (amb autenticació)
// ==============================================================

// POST /api/auth/register - Registrar usuari (només admin + validació)
router.post('/register', verificarAuth, nomesSiAdmin, validarRegistre, registrarUsuari);

// GET /api/auth/verify - Verificar si el token és vàlid
router.get('/verify', verificarAuth, verificarToken);

// POST /api/auth/logout - Tancar sessió
router.post('/logout', verificarAuth, logout);

export default router;