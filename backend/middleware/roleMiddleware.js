// backend/middleware/roleMiddleware.js

// ==============================================================
// MIDDLEWARE: VERIFICAR ROL
// ==============================================================
export const verificarRol = (...rolsPermesos) => {
  return (req, res, next) => {
    // req.usuari ha estat afegit pel middleware verificarAuth
    if (!req.usuari) {
      return res.status(401).json({
        error: true,
        missatge: 'Autenticació requerida',
      });
    }

    const rolUsuari = req.usuari.rol;

    if (!rolsPermesos.includes(rolUsuari)) {
      return res.status(403).json({
        error: true,
        missatge: `Accés denegat. Aquesta acció requereix un dels següents rols: ${rolsPermesos.join(', ')}`,
        rolActual: rolUsuari,
      });
    }

    next();
  };
};

// ==============================================================
// MIDDLEWARES ESPECÍFICS PER ROL
// ==============================================================

// Només administradors
export const nomesSiAdmin = verificarRol('administrador');

// Només operadors de sala
export const nomesSiOperador = verificarRol('operador_sala');

// Només patrulles
export const nomesSiPatrulla = verificarRol('patrulla');

// Operadors o administradors
export const nomesSiOperadorOAdmin = verificarRol('operador_sala', 'administrador');

// Qualsevol usuari autenticat (tots els rols)
export const qualsevolRol = verificarRol('operador_sala', 'patrulla', 'administrador');