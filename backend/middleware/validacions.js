// backend/middleware/validacions.js
//
// Middleware de validació i sanitització d'inputs
// Utilitza express-validator per prevenir dades malicioses
// i garantir la integritat de les peticions

import { body, validationResult } from 'express-validator';

// ==============================================================
// HELPER: Processar errors de validació
// Si hi ha errors, retorna 400 amb els detalls
// Si no, passa al següent middleware/controlador
// ==============================================================
export const processarErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      missatge: 'Dades de la petició invàlides',
      errors: errors.array().map((err) => ({
        camp: err.path,
        missatge: err.msg,
        valor: err.value,
      })),
    });
  }

  next();
};

// ==============================================================
// VALIDACIONS: LOGIN
// ==============================================================
export const validarLogin = [
  body('username')
    .trim()
    .notEmpty().withMessage('El camp username és obligatori')
    .isLength({ min: 3, max: 50 }).withMessage('El username ha de tenir entre 3 i 50 caràcters')
    .escape(),

  body('password')
    .notEmpty().withMessage('El camp password és obligatori')
    .isLength({ min: 4, max: 128 }).withMessage('El password ha de tenir entre 4 i 128 caràcters'),

  processarErrors,
];

// ==============================================================
// VALIDACIONS: REGISTRE D'USUARI
// ==============================================================
export const validarRegistre = [
  body('username')
    .trim()
    .notEmpty().withMessage('El camp username és obligatori')
    .isLength({ min: 3, max: 50 }).withMessage('El username ha de tenir entre 3 i 50 caràcters')
    .matches(/^[a-zA-Z0-9_.-]+$/).withMessage('El username només pot contenir lletres, números, punts, guions i guions baixos')
    .escape(),

  body('password')
    .notEmpty().withMessage('El camp password és obligatori')
    .isLength({ min: 6, max: 128 }).withMessage('El password ha de tenir entre 6 i 128 caràcters'),

  body('rol')
    .trim()
    .notEmpty().withMessage('El camp rol és obligatori')
    .isIn(['operador_sala', 'patrulla', 'administrador']).withMessage('Rol invàlid'),

  body('nom_complet')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('El nom complet no pot superar els 100 caràcters')
    .escape(),

  processarErrors,
];

// ==============================================================
// VALIDACIONS: CREAR INCIDÈNCIA
// ==============================================================
export const validarCrearIncidencia = [
  body('ubicacio_lat')
    .notEmpty().withMessage('La latitud és obligatòria')
    .isFloat({ min: -90, max: 90 }).withMessage('La latitud ha de ser un número entre -90 i 90')
    .toFloat(),

  body('ubicacio_lon')
    .notEmpty().withMessage('La longitud és obligatòria')
    .isFloat({ min: -180, max: 180 }).withMessage('La longitud ha de ser un número entre -180 i 180')
    .toFloat(),

  body('tipologia')
    .trim()
    .notEmpty().withMessage('La tipologia és obligatòria')
    .isIn(['robatori', 'accident', 'altercat', 'violencia_domestica', 'incendi', 'desaparegut', 'drogues', 'ordre_public', 'altres'])
    .withMessage('Tipologia invàlida'),

  body('prioritat')
    .trim()
    .notEmpty().withMessage('La prioritat és obligatòria')
    .isIn(['baixa', 'mitjana', 'alta', 'critica'])
    .withMessage('Prioritat invàlida'),

  body('descripcio')
    .trim()
    .notEmpty().withMessage('La descripció és obligatòria')
    .isLength({ min: 5, max: 2000 }).withMessage('La descripció ha de tenir entre 5 i 2000 caràcters'),

  body('direccio')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('La direcció no pot superar els 500 caràcters'),

  body('observacions')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Les observacions no poden superar els 2000 caràcters'),

  processarErrors,
];

// ==============================================================
// VALIDACIONS: ACTUALITZAR INCIDÈNCIA
// ==============================================================
export const validarActualitzarIncidencia = [
  ...validarCrearIncidencia,
];

// ==============================================================
// VALIDACIONS: CANVIAR ESTAT INCIDÈNCIA
// ==============================================================
export const validarCanviarEstatIncidencia = [
  body('estat')
    .trim()
    .notEmpty().withMessage('El camp estat és obligatori')
    .isIn(['nova', 'assignada', 'en_curs', 'resolta', 'tancada'])
    .withMessage('Estat invàlid'),

  body('observacions')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Les observacions no poden superar els 2000 caràcters'),

  processarErrors,
];

// ==============================================================
// VALIDACIONS: ASSIGNACIÓ MANUAL
// ==============================================================
export const validarAssignacioManual = [
  body('incidencia_id')
    .notEmpty().withMessage('El camp incidencia_id és obligatori')
    .isUUID().withMessage('incidencia_id ha de ser un UUID vàlid'),

  body('indicatiu_id')
    .notEmpty().withMessage('El camp indicatiu_id és obligatori')
    .isUUID().withMessage('indicatiu_id ha de ser un UUID vàlid'),

  processarErrors,
];

// ==============================================================
// VALIDACIONS: ASSIGNACIÓ AUTOMÀTICA
// ==============================================================
export const validarAssignacioAutomatica = [
  body('incidencia_id')
    .notEmpty().withMessage('El camp incidencia_id és obligatori')
    .isUUID().withMessage('incidencia_id ha de ser un UUID vàlid'),

  processarErrors,
];

// ==============================================================
// VALIDACIONS: ACTUALITZAR GPS INDICATIU
// ==============================================================
export const validarActualitzarGPS = [
  body('ubicacio_lat')
    .notEmpty().withMessage('La latitud és obligatòria')
    .isFloat({ min: -90, max: 90 }).withMessage('La latitud ha de ser un número entre -90 i 90')
    .toFloat(),

  body('ubicacio_lon')
    .notEmpty().withMessage('La longitud és obligatòria')
    .isFloat({ min: -180, max: 180 }).withMessage('La longitud ha de ser un número entre -180 i 180')
    .toFloat(),

  processarErrors,
];

// ==============================================================
// VALIDACIONS: CANVIAR ESTAT INDICATIU
// ==============================================================
export const validarCanviarEstatIndicatiu = [
  body('estat_operatiu')
    .trim()
    .notEmpty().withMessage('El camp estat_operatiu és obligatori')
    .isIn(['disponible', 'en_servei', 'no_disponible', 'finalitzat'])
    .withMessage('Estat operatiu invàlid'),

  processarErrors,
];

// ==============================================================
// VALIDACIONS: CANVIAR MODE CONFIGURACIÓ
// ==============================================================
export const validarCanviarMode = [
  body('mode')
    .trim()
    .notEmpty().withMessage('El camp mode és obligatori')
    .isIn(['manual', 'automatic'])
    .withMessage('Mode invàlid. Ha de ser "manual" o "automatic"'),

  processarErrors,
];