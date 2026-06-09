// backend/services/autoassignacioService.js

/*  Motor central del mode automàtic.
S'encarrega de:
        Comprovar si el mode automàtic està actiu
        Seleccionar el millor indicatiu disponible per a una incidència
        Crear l'assignació de forma atòmica (transacció)
        Registrar traçabilitat i emetre websockets
    S'invoca des de:
        incidenciaController  → quan es crea una nova incidència
        indicatiuController   → quan un indicatiu passa a "disponible"
        assignacioController  → quan es finalitza o cancel·la una assignació
        configuracioController → quan s'activa el mode automàtic (barrida inicial) */

import { getClient } from '../config/database.js';
import pool from '../config/database.js';
import Configuracio from '../models/Configuracio.js';
import Incidencia from '../models/Incidencia.js';
import Indicatiu from '../models/Indicatiu.js';
import Assignacio from '../models/Assignacio.js';
import EsdevenimentTracabilitat, { TIPUS_ESDEVENIMENT } from '../models/EsdevenimentTracabilitat.js';
import { calcularRutesMultiples } from '../utils/osrm.js';
import { trobarMesProper } from '../utils/haversine.js';
import {
  emetreIncidenciaAssignada,
  emetreCanviEstatIncidencia,
  emetreCanviEstatIndicatiu,
} from '../sockets/emissors.js';

// ==============================================================
// HELPER INTERN: Registrar traçabilitat sense bloquejar el flux
// ==============================================================
const registrarEsdeveniment = async (tipus, incidenciaId, indicatiuId, descripcio, dades = {}) => {
  try {
    await EsdevenimentTracabilitat.registrar({
      tipus_esdeveniment: tipus,
      usuari_id:    null, // acció del sistema, no d'un usuari
      incidencia_id: incidenciaId ?? null,
      indicatiu_id:  indicatiuId  ?? null,
      descripcio,
      dades_addicionals: dades,
    });
  } catch (err) {
    console.error('⚠️  [Auto] Error registrant traçabilitat:', err.message);
  }
};

// ==============================================================
// HELPER INTERN: Seleccionar el millor indicatiu per a una incidència
// Criteri: temps OSRM → fallback Haversine
// Retorna l'indicatiu seleccionat amb camps distancia_km i temps_minuts
// o null si no hi ha cap candidat vàlid
// ==============================================================
const seleccionarMillorIndicatiu = async (incidencia) => {
  // Obtenir tots els indicatius disponibles amb GPS vàlid
  const disponibles = await Indicatiu.trobarDisponibles();

  if (disponibles.length === 0) {
    console.log('ℹ️  [Auto] Cap indicatiu disponible');
    return null;
  }

  // Intentar calcular rutes OSRM per a tots
  const ambRutes = await calcularRutesMultiples(
    parseFloat(incidencia.ubicacio_lat),
    parseFloat(incidencia.ubicacio_lon),
    disponibles
  );

  const ambUbicacio = ambRutes.filter(
    (i) => i.ubicacio_lat !== null && i.ubicacio_lon !== null
  );

  if (ambUbicacio.length === 0) {
    console.log('ℹ️  [Auto] Cap indicatiu amb coordenades GPS vàlides');
    return null;
  }

  // Separar els que tenen dades OSRM dels que no
  const ambOSRM   = ambUbicacio.filter((i) => i.temps_minuts !== null);
  const senseOSRM = ambUbicacio.filter((i) => i.temps_minuts === null);

  if (ambOSRM.length > 0) {
    // Ordenar per temps_minuts → el que triga menys
    ambOSRM.sort((a, b) => a.temps_minuts - b.temps_minuts);
    return ambOSRM[0];
  }

  // Fallback: Haversine si OSRM no ha retornat res
  console.warn('⚠️  [Auto] OSRM sense resultats, usant Haversine com a fallback');
  return trobarMesProper(
    parseFloat(incidencia.ubicacio_lat),
    parseFloat(incidencia.ubicacio_lon),
    senseOSRM
  );
};

// ==============================================================
// CORE: Crear l'assignació automàtica de forma atòmica
// Fa tot en una transacció:
//   1. Bloqueja la incidència per evitar condicions de carrera
//   2. Verifica que no té assignació activa
//   3. Verifica que l'indicatiu segueix disponible
//   4. Crea l'assignació
//   5. Actualitza indicatiu (en_servei + incidencia_assignada_id)
//   6. Actualitza incidència (assignada)
// Després de la transacció: traçabilitat + websockets
// ==============================================================
const crearAssignacioAtomicament = async (incidencia, indicatiu) => {
  const client = await getClient();

  let novaAssignacio = null;

  try {
    await client.query('BEGIN');

    // 1. Bloqueig a nivell de fila per evitar doble assignació
    const resLock = await client.query(
      `SELECT id, estat FROM incidencies WHERE id = $1 FOR UPDATE`,
      [incidencia.id]
    );

    if (resLock.rows.length === 0) {
      await client.query('ROLLBACK');
      console.warn(`⚠️  [Auto] Incidència ${incidencia.id} no trobada en transacció`);
      return null;
    }

    const estatActual = resLock.rows[0].estat;

    // 2. Verificar que la incidència segueix en estat assignable
    if (estatActual !== 'nova') {
      await client.query('ROLLBACK');
      console.log(`ℹ️  [Auto] Incidència ${incidencia.id} ja no és "nova" (estat: ${estatActual})`);
      return null;
    }

    // 3. Verificar que no té assignació activa
    const resAssignacioActiva = await client.query(
      `SELECT id FROM assignacions
       WHERE incidencia_id = $1 AND timestamp_finalitzacio IS NULL`,
      [incidencia.id]
    );

    if (resAssignacioActiva.rows.length > 0) {
      await client.query('ROLLBACK');
      console.log(`ℹ️  [Auto] Incidència ${incidencia.id} ja té assignació activa`);
      return null;
    }

    // 4. Verificar que l'indicatiu segueix disponible (bloqueig de fila)
    const resIndicatiu = await client.query(
      `SELECT id, estat_operatiu FROM indicatius WHERE id = $1 FOR UPDATE`,
      [indicatiu.id]
    );

    if (resIndicatiu.rows.length === 0 || resIndicatiu.rows[0].estat_operatiu !== 'disponible') {
      await client.query('ROLLBACK');
      console.log(`ℹ️  [Auto] Indicatiu ${indicatiu.codi} ja no disponible`);
      return null;
    }

    // 5. Crear l'assignació
    const resAssignacio = await client.query(
      `INSERT INTO assignacions
         (incidencia_id, indicatiu_id, mode_assignacio, usuari_assignador_id, timestamp_assignacio)
       VALUES ($1, $2, 'automatica', NULL, NOW())
       RETURNING *`,
      [incidencia.id, indicatiu.id]
    );
    novaAssignacio = resAssignacio.rows[0];

    // 6. Actualitzar indicatiu: en_servei + incidencia assignada
    await client.query(
      `UPDATE indicatius
       SET incidencia_assignada_id = $1, estat_operatiu = 'en_servei'
       WHERE id = $2`,
      [incidencia.id, indicatiu.id]
    );

    // 7. Actualitzar incidència: assignada
    await client.query(
      `UPDATE incidencies
       SET estat = 'assignada', updated_at = NOW()
       WHERE id = $1`,
      [incidencia.id]
    );

    await client.query('COMMIT');

    console.log(
      `✅ [Auto] Assignació creada: ${indicatiu.codi} → incidència ${incidencia.id}`
    );

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ [Auto] Error en transacció d\'assignació:', err.message);
    return null;
  } finally {
    client.release();
  }

  if (!novaAssignacio) return null;

  // ── Fora de la transacció: traçabilitat i websockets ──────────

  // Obtenir assignació completa amb JOINs per als websockets
  const assignacioCompleta = await Assignacio.trobarPerId(novaAssignacio.id);
  const incidenciaActualitzada = await Incidencia.trobarPerId(incidencia.id);
  const indicatiuActualitzat   = await Indicatiu.trobarPerId(indicatiu.id);

  // Traçabilitat
  await registrarEsdeveniment(
    TIPUS_ESDEVENIMENT.ASSIGNACIO_CREADA,
    incidencia.id,
    indicatiu.id,
    `Assignació automàtica (sistema): Indicatiu ${indicatiu.codi} ` +
      (indicatiu.temps_minuts != null
        ? `(${indicatiu.temps_minuts} min, ${indicatiu.distancia_km} km via OSRM)`
        : `(${indicatiu.distancia_km} km via Haversine)`),
    {
      mode:            'automatica',
      indicatiu_codi:  indicatiu.codi,
      distancia_km:    indicatiu.distancia_km  ?? null,
      temps_minuts:    indicatiu.temps_minuts  ?? null,
      metode:          indicatiu.temps_minuts != null ? 'osrm' : 'haversine',
    }
  );

  // Websockets — reutilitzem els emissors existents
  emetreIncidenciaAssignada(assignacioCompleta, incidenciaActualitzada, indicatiuActualitzat);
  emetreCanviEstatIncidencia(incidencia.id, 'nova', 'assignada');
  emetreCanviEstatIndicatiu(indicatiu.id, 'disponible', 'en_servei');

  return assignacioCompleta;
};

// ==============================================================
// PÚBLIC: Intentar autoassignar una incidència concreta
// S'usa quan arriba una nova incidència en mode automàtic
// Retorna l'assignació creada o null si no s'ha pogut crear
// ==============================================================
export const intentarAutoassignarIncidencia = async (incidenciaId) => {
  try {
    // 1. Comprovar que el mode automàtic està actiu
    const esModeAuto = await Configuracio.esModeAutomatic();
    if (!esModeAuto) return null;

    // 2. Obtenir la incidència
    const incidencia = await Incidencia.trobarPerId(incidenciaId);
    if (!incidencia || incidencia.estat !== 'nova') return null;

    // 3. Seleccionar el millor indicatiu
    const indicatiu = await seleccionarMillorIndicatiu(incidencia);
    if (!indicatiu) return null;

    // 4. Crear l'assignació de forma atòmica
    return await crearAssignacioAtomicament(incidencia, indicatiu);

  } catch (err) {
    console.error('❌ [Auto] Error a intentarAutoassignarIncidencia:', err.message);
    return null;
  }
};

// ==============================================================
// HELPER INTERN: Obtenir incidències pendents d'assignació
// Retorna totes les incidències 'nova' sense assignació activa
// ==============================================================
const obtenirIncidenciesPendents = async () => {
  const res = await pool.query(
    `SELECT i.*
     FROM incidencies i
     WHERE i.estat = 'nova'
       AND NOT EXISTS (
         SELECT 1 FROM assignacions a
         WHERE a.incidencia_id = i.id
           AND a.timestamp_finalitzacio IS NULL
       )
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
  return res.rows;
};

// ==============================================================
// HELPER INTERN: Valor numèric de prioritat per ordenar
// Menor = més prioritari
// ==============================================================
const valorPrioritat = (prioritat) => {
  switch (prioritat) {
    case 'critica': return 1;
    case 'alta':    return 2;
    case 'mitjana': return 3;
    case 'baixa':   return 4;
    default:        return 5;
  }
};

// ==============================================================
// HELPER INTERN: Construir matriu de candidats
// Per cada combinació incidència ↔ indicatiu, calcula el cost
// (temps OSRM o distància Haversine) i retorna tots els parells
// ordenats del millor al pitjor
// ==============================================================
const construirMatriuCandidats = async (incidencies, indicatius) => {
  const parells = [];

  // Per cada incidència, calcular rutes a TOTS els indicatius disponibles
  for (const incidencia of incidencies) {
    const ambRutes = await calcularRutesMultiples(
      parseFloat(incidencia.ubicacio_lat),
      parseFloat(incidencia.ubicacio_lon),
      indicatius
    );

    for (const ind of ambRutes) {
      // Descartar indicatius sense coordenades vàlides
      if (ind.ubicacio_lat === null || ind.ubicacio_lon === null) continue;

      parells.push({
        incidencia,
        indicatiu:    ind,
        prioritat:    valorPrioritat(incidencia.prioritat),
        temps_minuts: ind.temps_minuts,
        distancia_km: ind.distancia_km,
        timestamp:    new Date(incidencia.timestamp_recepcio).getTime(),
      });
    }
  }

  // Ordenar parells: prioritat → temps → distància → antiguitat → codi
  parells.sort((a, b) => {
    // 1. Prioritat de la incidència (crítica primer)
    if (a.prioritat !== b.prioritat) return a.prioritat - b.prioritat;

    // 2. Temps OSRM (si ambdós en tenen)
    if (a.temps_minuts !== null && b.temps_minuts !== null) {
      if (a.temps_minuts !== b.temps_minuts) return a.temps_minuts - b.temps_minuts;
    }

    // 3. Si un té OSRM i l'altre no, prioritzar el que en té
    if (a.temps_minuts !== null && b.temps_minuts === null) return -1;
    if (a.temps_minuts === null && b.temps_minuts !== null) return 1;

    // 4. Distància Haversine
    if (a.distancia_km !== null && b.distancia_km !== null) {
      if (a.distancia_km !== b.distancia_km) return a.distancia_km - b.distancia_km;
    }

    // 5. Incidència més antiga primer
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;

    // 6. Desempat per codi d'indicatiu
    return (a.indicatiu.codi || '').localeCompare(b.indicatiu.codi || '');
  });

  return parells;
};

// ==============================================================
// HELPER INTERN: Selecció greedy global
// Recorre els parells ordenats i assigna sense repetir
// cap incidència ni cap indicatiu
// Retorna la llista de parells seleccionats
// ==============================================================
const seleccioGreedyGlobal = (parellsOrdenats) => {
  const incidenciesUsades = new Set();
  const indicatiusUsats   = new Set();
  const seleccionats      = [];

  for (const parell of parellsOrdenats) {
    const incId = parell.incidencia.id;
    const indId = parell.indicatiu.id;

    // Saltar si la incidència ja està assignada en aquesta ronda
    if (incidenciesUsades.has(incId)) continue;

    // Saltar si l'indicatiu ja està assignat en aquesta ronda
    if (indicatiusUsats.has(indId)) continue;

    // Seleccionar aquest parell
    seleccionats.push(parell);
    incidenciesUsades.add(incId);
    indicatiusUsats.add(indId);
  }

  return seleccionats;
};

// ==============================================================
// PÚBLIC: Intentar assignar incidències pendents (barrida global)
// S'usa quan:
//   - Un indicatiu passa a disponible
//   - Es finalitza/cancel·la una assignació
//   - S'activa el mode automàtic
//
// Lògica: Greedy global per prioritat + distància/temps
//   1. Obtenir totes les incidències pendents
//   2. Obtenir tots els indicatius disponibles
//   3. Construir matriu de candidats (totes les combinacions)
//   4. Ordenar per: prioritat → temps → distància → antiguitat
//   5. Selecció greedy: millor parell primer, sense repetir
//   6. Crear assignacions de forma atòmica
//
// Retorna el nombre d'assignacions creades
// ==============================================================
export const intentarAutoassignarPendents = async () => {
  try {
    // 1. Comprovar que el mode automàtic està actiu
    const esModeAuto = await Configuracio.esModeAutomatic();
    if (!esModeAuto) return 0;

    // 2. Obtenir incidències pendents
    const incidenciesPendents = await obtenirIncidenciesPendents();

    if (incidenciesPendents.length === 0) {
      console.log('ℹ️  [Auto] Cap incidència pendent per assignar');
      return 0;
    }

    // 3. Obtenir indicatius disponibles
    const indicatiusDisponibles = await Indicatiu.trobarDisponibles();

    if (indicatiusDisponibles.length === 0) {
      console.log('ℹ️  [Auto] Cap indicatiu disponible');
      return 0;
    }

    console.log(
      `ℹ️  [Auto] Barrida global: ${incidenciesPendents.length} incidències × ` +
      `${indicatiusDisponibles.length} indicatius`
    );

    // 4. Construir matriu de candidats amb costos
    const parellsOrdenats = await construirMatriuCandidats(
      incidenciesPendents,
      indicatiusDisponibles
    );

    if (parellsOrdenats.length === 0) {
      console.log('ℹ️  [Auto] Cap combinació vàlida trobada');
      return 0;
    }

    // 5. Selecció greedy global — millor parell primer, sense repetir
    const parellsSeleccionats = seleccioGreedyGlobal(parellsOrdenats);

    if (parellsSeleccionats.length === 0) {
      console.log('ℹ️  [Auto] Cap parell seleccionable');
      return 0;
    }

    console.log(`ℹ️  [Auto] ${parellsSeleccionats.length} parells seleccionats, creant assignacions...`);

    // 6. Crear assignacions de forma atòmica, una per una
    let assignacionsCreades = 0;

    for (const parell of parellsSeleccionats) {
      const assignacio = await crearAssignacioAtomicament(
        parell.incidencia,
        parell.indicatiu
      );

      if (assignacio) {
        assignacionsCreades++;
        console.log(
          `   ✅ ${parell.indicatiu.codi} → ${parell.incidencia.tipologia} ` +
          `[${parell.incidencia.prioritat}] ` +
          (parell.temps_minuts !== null
            ? `(${parell.temps_minuts} min)`
            : `(${parell.distancia_km} km)`)
        );
      }
    }

    console.log(`✅ [Auto] Barrida completada: ${assignacionsCreades} assignacions creades`);
    return assignacionsCreades;

  } catch (err) {
    console.error('❌ [Auto] Error a intentarAutoassignarPendents:', err.message);
    return 0;
  }
};