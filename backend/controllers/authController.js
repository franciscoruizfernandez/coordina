// backend/controllers/authController.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Usuari from '../models/Usuari.js';

// ==============================================================
// REGISTRAR NOU USUARI (només admin)
// ==============================================================
export const registrarUsuari = async (req, res, next) => {
  try {
    const { username, password, rol, nom_complet } = req.body;

    // Validar camps obligatoris
    if (!username || !password || !rol) {
      return res.status(400).json({
        error: true,
        missatge: 'Els camps username, password i rol són obligatoris',
      });
    }

    // Verificar que el username no existeixi
    const usuariExistent = await Usuari.trobarPerUsername(username);
    if (usuariExistent) {
      return res.status(409).json({
        error: true,
        missatge: 'El nom d\'usuari ja existeix',
      });
    }

    // Validar rol
    const rolsPermesos = ['operador_sala', 'patrulla', 'administrador'];
    if (!rolsPermesos.includes(rol)) {
      return res.status(400).json({
        error: true,
        missatge: `El rol ha de ser un de: ${rolsPermesos.join(', ')}`,
      });
    }

    // Hashear la contrasenya
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Crear usuari
    const nouUsuari = await Usuari.crear({
      username,
      password_hash,
      rol,
      nom_complet: nom_complet || username,
    });

    // No retornar el password_hash
    delete nouUsuari.password_hash;

    res.status(201).json({
      exit: true,
      missatge: 'Usuari creat correctament',
      usuari: nouUsuari,
    });
  } catch (error) {
    console.error('❌ Error registrant usuari:', error);
    next(error);
  }
};

// ==============================================================
// LOGIN
// ==============================================================
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validar camps
    if (!username || !password) {
      return res.status(400).json({
        error: true,
        missatge: 'Username i password són obligatoris',
      });
    }

    // Buscar usuari
    const usuari = await Usuari.trobarPerUsername(username);
    if (!usuari) {
      return res.status(401).json({
        error: true,
        missatge: "No existeix l'usuari",
      });
    }

    // Verificar que l'usuari està actiu
    if (!usuari.actiu) {
      return res.status(403).json({
        error: true,
        missatge: 'Aquest usuari està desactivat',
      });
    }

    // Comparar contrasenya
    const passwordCorrecte = await bcrypt.compare(password, usuari.password_hash);
    if (!passwordCorrecte) {
      return res.status(401).json({
        error: true,
        missatge: 'Credencials incorrectes',
      });
    }

    // Generar JWT
    const token = jwt.sign(
      {
        userId: usuari.id,
        username: usuari.username,
        rol: usuari.rol,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '24h', // El token expira en 24 hores
      }
    );

    // Retornar token i info de l'usuari (sense password)
    res.json({
      exit: true,
      missatge: 'Login correcte',
      token,
      usuari: {
        id: usuari.id,
        username: usuari.username,
        rol: usuari.rol,
        nom_complet: usuari.nom_complet,
      },
    });
  } catch (error) {
    console.error('❌ Error en login:', error);
    next(error);
  }
};

// ==============================================================
// VERIFICAR TOKEN
// ==============================================================
export const verificarToken = async (req, res) => {
  // Si arriba aquí, el middleware d'autenticació ja ha validat el token
  res.json({
    exit: true,
    missatge: 'Token vàlid',
    usuari: {
      id: req.usuari.userId,
      username: req.usuari.username,
      rol: req.usuari.rol,
    },
  });
};

// ==============================================================
// LOGOUT (opcional - bàsicament invalida el token del client)
// ==============================================================
export const logout = async (req, res) => {
  // En una implementació amb JWT, el logout es fa al client eliminant el token
  // Aquí només confirmem l'acció
  res.json({
    exit: true,
    missatge: 'Logout correcte. Elimina el token del client.',
  });
};