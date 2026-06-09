// backend/services/coberturaService.js
//
// Servei de cobertura d'incidències.
// Calcula quants indicatius necessita una incidència segons la seva
// prioritat i gestiona l'escalat automàtic.
//
// Regles:
//   - baixa / mitjana / alta → objectiu 1
//   - critica → objectiu 2
//   - critica + 10s des de la darrera assignació → objectiu 3
//   - màxim automàtic: 3
//
// S'invoca des de:
//   - autoassignacioService → per prioritzar incidències amb dèficit
//   - incidenciaController → quan es crea una incidència crítica
//   - quan canvia la prioritat d'una incidència a crítica

import pool from '../config/database.js';
import Assignacio from '../models/Assignacio.js';
import Configuracio from '../models/Configuracio.js';
import {
  emetreSala,
} from '../sockets/emissors.js';

// ==============================================================
// CONSTANTS
// ==============================================================

const OBJECTIU_PER_PRIORITAT = {
  baixa:   1,
  mitjana: 1,
  alta:    1,
  critica: 2,
};

const OBJECTIU_ESCALAT_CRITICA = 3;
const TEMPS_ESCALAT_SEGONS     = 10;
const MAXIM_AUTOMATIC          = 3;

// ==============================================================
// FUNCIÓ: Calcular l'objectiu de cobertura d'una incidència
//
// Retorna: { objectiu, actius, deficit, escalar }
// ==============================================================
export const calcularCobertura = async (incidenciaId) => {
  // Obtenir la incidència
  const resInc = await pool.query(
    'SELECT id, prioritat, estat FROM incidencies WHERE id = $1',
    [incidenciaId]
  );

  if (resInc.rows.length === 0) {
    return { objectiu: 0, actius: 0, deficit: 0, escalar: false };
  }

  const incidencia = resInc.rows[0];
  const prioritat  = incidencia.prioritat;

  // Si la incidència no està activa, no cal cobertura
  if (['resolta', 'tancada'].includes(incidencia.estat)) {
    return { objectiu: 0, actius: 0, deficit: 0, escalar: false };
  }

  // Objectiu base
  let objectiu = OBJECTIU_PER_PRIORITAT[prioritat] || 1;

  // Comptar assignacions actives
  const actius = await Assignacio.comptarActivesPerIncidencia(incidenciaId);

  // Escalat per a crítiques: si ja té >= 2 indicatius
  // i ha passat TEMPS_ESCALAT_SEGONS des de la darrera assignació
  let escalar = false;

  if (prioritat === 'critica' && actius >= 2 && objectiu < OBJECTIU_ESCALAT_CRITICA) {
    const resDarrera = await pool.query(
      `SELECT timestamp_assignacio
       FROM assignacions
       WHERE incidencia_id = $1
         AND timestamp_finalitzacio IS NULL
       ORDER BY timestamp_assignacio DESC
       LIMIT 1`,
      [incidenciaId]
    );

    if (resDarrera.rows.length > 0) {
      const darreraAssignacio = new Date(resDarrera.rows[0].timestamp_assignacio);
      const ara               = new Date();
      const segonsTranscorreguts = (ara - darreraAssignacio) / 1000;

      if (segonsTranscorreguts >= TEMPS_ESCALAT_SEGONS) {
        objectiu = OBJECTIU_ESCALAT_CRITICA;
        escalar  = true;
      }
    }
  }

  // Limitar al màxim automàtic
  objectiu = Math.min(objectiu, MAXIM_AUTOMATIC);

  const deficit = Math.max(0, objectiu - actius);

  return { objectiu, actius, deficit, escalar };
};

// ==============================================================
// FUNCIÓ: Obtenir incidències amb dèficit de cobertura
// Ordenades per: prioritat → dèficit → antiguitat
//
// Retorna array de { incidencia, objectiu, actius, deficit }
// ==============================================================
export const obtenirIncidenciesAmbDeficit = async () => {
  // Obtenir totes les incidències actives
  const resIncidencies = await pool.query(
    `SELECT i.*
     FROM incidencies i
     WHERE i.estat NOT IN ('resolta', 'tancada')
     ORDER BY
       CASE i.prioritat
         WHEN 'critica' THEN 1
         WHEN 'alta'    THEN 2
         WHEN 'mitjana' THEN 3
         WHEN 'baixa'   THEN 4
         ELSE 5
       END,
       i.timestamp_recepcio ASC`
  );

  const resultats = [];

  for (const incidencia of resIncidencies.rows) {
    const cobertura = await calcularCobertura(incidencia.id);

    if (cobertura.deficit > 0) {
      resultats.push({
        incidencia,
        ...cobertura,
      });
    }
  }

  // Ordenar: primer les crítiques amb més dèficit
  resultats.sort((a, b) => {
    // 1. Prioritat
    const prioA = OBJECTIU_PER_PRIORITAT[a.incidencia.prioritat] || 99;
    const prioB = OBJECTIU_PER_PRIORITAT[b.incidencia.prioritat] || 99;

    // Les crítiques primer (tenen objectiu 2, les altres 1)
    if (a.incidencia.prioritat === 'critica' && b.incidencia.prioritat !== 'critica') return -1;
    if (a.incidencia.prioritat !== 'critica' && b.incidencia.prioritat === 'critica') return 1;

    // 2. Més dèficit primer
    if (a.deficit !== b.deficit) return b.deficit - a.deficit;

    // 3. Més antiga primer
    return new Date(a.incidencia.timestamp_recepcio) - new Date(b.incidencia.timestamp_recepcio);
  });

  return resultats;
};

// ==============================================================
// FUNCIÓ: Emetre avís de cobertura a la sala
// S'usa en mode manual per informar l'operador
// ==============================================================
export const emetreAvisCobertura = (incidencia, cobertura) => {
  if (cobertura.deficit <= 0) return;

  const missatge = cobertura.escalar
    ? `Es recomana enviar un tercer indicatiu a la incidència crítica`
    : `Incidència crítica amb reforç pendent (${cobertura.actius}/${cobertura.objectiu})`;

  emetreSala('reforc_pendent', {
    incidencia_id: incidencia.id,
    tipologia:     incidencia.tipologia,
    prioritat:     incidencia.prioritat,
    direccio:      incidencia.direccio,
    actius:        cobertura.actius,
    objectiu:      cobertura.objectiu,
    deficit:       cobertura.deficit,
    escalar:       cobertura.escalar,
    missatge,
  });
};