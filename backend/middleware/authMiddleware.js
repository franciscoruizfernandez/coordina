// backend/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';

// ==============================================================
// MIDDLEWARE: VERIFICAR JWT
// ==============================================================
export const verificarAuth = (req, res, next) => {
  try {
    // Obtenir token del header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: true,
        missatge: 'Token no proporcionat. Autenticació requerida.',
      });
    }

    // Format esperat: "Bearer TOKEN"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: true,
        missatge: 'Format de token invàlid. Utilitza: Bearer [token]',
      });
    }

    const token = parts[1];

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Afegir info de l'usuari a la request
    req.usuari = decoded;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: true,
        missatge: 'Token expirat. Si us plau, torna a fer login.',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: true,
        missatge: 'Token invàlid.',
      });
    }

    console.error('❌ Error verificant token:', error);
    return res.status(500).json({
      error: true,
      missatge: 'Error verificant autenticació',
    });
  }
};