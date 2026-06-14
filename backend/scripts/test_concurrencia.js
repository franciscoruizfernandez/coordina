// backend/scripts/testConcurrencia.js
//
// Test de concurrència del sistema COORDINA
// Crea les seves pròpies dades de prova, executa els tests
// i neteja al final.
//
// Execució: node backend/scripts/testConcurrencia.js

import http from 'http';
import https from 'https';

http.globalAgent.setMaxListeners(50);
https.globalAgent.setMaxListeners(50);
process.setMaxListeners(50);


import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
console.log("ENV TOKEN_112:", process.env.TOKEN_112);
console.log("ENV TOKEN_CONCURRENCIA:", process.env.TOKEN_CONCURRENCIA);

// ==============================================================
// CONFIGURACIÓ
// ==============================================================

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TOKEN    = process.env.TOKEN_CONCURRENCIA || process.env.TOKEN_112;

const CONFIG = {
  CONCURRENCIA_ASSIGNACIO:     5,
  CONCURRENCIA_AUTOASSIGNACIO: 5,
  CONCURRENCIA_GPS:            15,
  CONCURRENCIA_FINALITZACIO:   3,

  INCIDENCIA_LAT: 41.55,
  INCIDENCIA_LON: 2.25,

  // Quants indicatius de prova crear
  NUM_INDICATIUS_PROVA: 8,
};

// ==============================================================
// HELPERS
// ==============================================================

const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
const api = axios.create({ baseURL: `${BASE_URL}/api`, headers, timeout: 15000 });

const resultats = { total: 0, passats: 0, fallats: 0, detalls: [] };

// Guardem IDs creats per netejar al final
const dadesProva = {
  indicatius:  [],
  incidencies: [],
};

function log(emoji, missatge) {
  console.log(`${emoji}  ${missatge}`);
}

function registrarResultat(nom, passat, detall = '') {
  resultats.total++;
  if (passat) {
    resultats.passats++;
    resultats.detalls.push({ nom, resultat: '✅ PASS', detall });
  } else {
    resultats.fallats++;
    resultats.detalls.push({ nom, resultat: '❌ FAIL', detall });
  }
}

// ==============================================================
// SETUP: Crear dades de prova
// ==============================================================

async function setup() {
  log('🔧', '═══ SETUP: Creant dades de prova ═══');

  // Crear indicatius de prova
  for (let i = 0; i < CONFIG.NUM_INDICATIUS_PROVA; i++) {
    try {
      const codi = `TEST-${Date.now()}-${i}`;
      const res = await api.post('/indicatius', {
        codi,
        tipus_unitat:    'cotxe',
        sector_assignat: 'Test',
        ubicacio_lat:    CONFIG.INCIDENCIA_LAT + (Math.random() * 0.05),
        ubicacio_lon:    CONFIG.INCIDENCIA_LON + (Math.random() * 0.05),
      });
      dadesProva.indicatius.push(res.data.dades);
      log('  ✅', `Indicatiu creat: ${codi}`);
    } catch (err) {
      log('  ⚠️', `Error creant indicatiu: ${err.response?.data?.missatge || err.message}`);
    }
  }

  log('📊', `${dadesProva.indicatius.length} indicatius de prova creats`);
  console.log('');
}

// ==============================================================
// HELPERS DE DADES
// ==============================================================

async function crearIncidenciaProva(sufix = '') {
  const res = await api.post('/incidencies', {
    ubicacio_lat: CONFIG.INCIDENCIA_LAT + Math.random() * 0.01,
    ubicacio_lon: CONFIG.INCIDENCIA_LON + Math.random() * 0.01,
    tipologia:    'altercat',
    prioritat:    'mitjana',
    descripcio:   `Test concurrència ${sufix} — ${Date.now()}`,
    direccio:     `Zona test ${sufix}`,
  });
  dadesProva.incidencies.push(res.data.dades);
  return res.data.dades;
}

async function obtenirIndicatiusDisponiblesProva() {
  // Només entre els nostres indicatius de prova
  const disponibles = [];
  for (const ind of dadesProva.indicatius) {
    try {
      const res = await api.get(`/indicatius/${ind.id}`);
      if (res.data.dades.estat_operatiu === 'disponible') {
        disponibles.push(res.data.dades);
      }
    } catch { }
  }
  return disponibles;
}

async function obtenirAssignacionsActives(incidenciaId) {
  try {
    const res = await api.get(`/assignacions/activa?incidencia_id=${incidenciaId}`);
    const dades = res.data.dades;
    return Array.isArray(dades) ? dades : [dades];
  } catch (err) {
    if (err.response?.status === 404) return [];
    throw err;
  }
}

async function obtenirIndicatiu(id) {
  const res = await api.get(`/indicatius/${id}`);
  return res.data.dades;
}

async function obtenirIncidencia(id) {
  const res = await api.get(`/incidencies/${id}`);
  return res.data.dades;
}

async function alliberarIndicatiu(indicatiuId) {
  // Buscar si té assignació activa i finalitzar-la
  for (const inc of dadesProva.incidencies) {
    try {
      const actives = await obtenirAssignacionsActives(inc.id);
      for (const a of actives) {
        if (a.indicatiu_id === indicatiuId) {
          await api.patch(`/assignacions/${a.id}/finalitzar`, { observacions: 'Neteja test' });
          return;
        }
      }
    } catch { }
  }
}

async function alliberarTotsElsIndicatius() {
  for (const ind of dadesProva.indicatius) {
    try {
      const actual = await obtenirIndicatiu(ind.id);
      if (actual.estat_operatiu !== 'disponible') {
        await alliberarIndicatiu(ind.id);
      }
    } catch { }
  }
  // Esperar un moment perquè el backend processi
  await new Promise((r) => setTimeout(r, 1000));
}

// ==============================================================
// TEST 1: Doble assignació simultània del mateix indicatiu
// ==============================================================

async function test1_DobleAssignacioMateixIndicatiu() {
  log('🧪', '═══ TEST 1: Doble assignació simultània del mateix indicatiu ═══');

  await alliberarTotsElsIndicatius();
  const disponibles = await obtenirIndicatiusDisponiblesProva();

  if (disponibles.length < 1) {
    log('⚠️', 'No hi ha indicatius disponibles');
    registrarResultat('T1 — Doble assignació', false, 'Sense indicatius disponibles');
    return;
  }

  const indicatiu = disponibles[0];

  // Crear N incidències
  const incidencies = [];
  for (let i = 0; i < CONFIG.CONCURRENCIA_ASSIGNACIO; i++) {
    incidencies.push(await crearIncidenciaProva(`T1-${i}`));
  }

  log('📋', `Llançant ${CONFIG.CONCURRENCIA_ASSIGNACIO} assignacions simultànies per a ${indicatiu.codi}...`);

  const promeses = incidencies.map((inc) =>
    api.post('/assignacions', {
      incidencia_id: inc.id,
      indicatiu_id:  indicatiu.id,
    }).then((r) => ({ exit: true, data: r.data }))
     .catch((e) => ({ exit: false, error: e.response?.data?.missatge || e.message }))
  );

  const resultatsTest = await Promise.allSettled(promeses);
  const respostes = resultatsTest.map((r) => r.value);

  const exitoses = respostes.filter((r) => r.exit);
  const fallides = respostes.filter((r) => !r.exit);

  log('📊', `Exitoses: ${exitoses.length} | Fallides: ${fallides.length}`);

  const indicatiuFinal = await obtenirIndicatiu(indicatiu.id);
  const esCorrecte = exitoses.length === 1 && indicatiuFinal.estat_operatiu === 'en_servei';

  if (esCorrecte) {
    log('✅', `PASS — Només 1 assignació creada. ${indicatiu.codi} en_servei.`);
  } else {
    log('❌', `FAIL — ${exitoses.length} assignacions (esperat: 1). Estat: ${indicatiuFinal.estat_operatiu}`);
  }

  registrarResultat(
    'T1 — Doble assignació del mateix indicatiu',
    esCorrecte,
    `Exitoses: ${exitoses.length}, Fallides: ${fallides.length}, Estat: ${indicatiuFinal.estat_operatiu}`
  );
}

// ==============================================================
// TEST 2: Doble autoassignació sobre la mateixa incidència
// ==============================================================

async function test2_DobleAutoassignacio() {
  log('🧪', '═══ TEST 2: Doble autoassignació sobre la mateixa incidència ═══');

  await alliberarTotsElsIndicatius();
  const disponibles = await obtenirIndicatiusDisponiblesProva();

  if (disponibles.length < 2) {
    log('⚠️', 'Calen almenys 2 indicatius disponibles');
    registrarResultat('T2 — Doble autoassignació', false, 'Indicatius insuficients');
    return;
  }

  const incidencia = await crearIncidenciaProva('T2');

  log('📋', `Llançant ${CONFIG.CONCURRENCIA_AUTOASSIGNACIO} autoassignacions simultànies...`);

  const promeses = Array.from({ length: CONFIG.CONCURRENCIA_AUTOASSIGNACIO }, () =>
    api.post('/assignacions/automatica', { incidencia_id: incidencia.id })
      .then((r) => ({ exit: true, data: r.data }))
      .catch((e) => ({ exit: false, error: e.response?.data?.missatge || e.message }))
  );

  const resultatsTest = await Promise.allSettled(promeses);
  const respostes = resultatsTest.map((r) => r.value);

  const exitoses = respostes.filter((r) => r.exit);
  const fallides = respostes.filter((r) => !r.exit);

  log('📊', `Exitoses: ${exitoses.length} | Fallides: ${fallides.length}`);

  const actives = await obtenirAssignacionsActives(incidencia.id);
  const incFinal = await obtenirIncidencia(incidencia.id);

  const indicatiuIds = actives.map((a) => a.indicatiu_id);
  const teDuplicats  = new Set(indicatiuIds).size !== indicatiuIds.length;

  const esCorrecte = !teDuplicats && actives.length <= disponibles.length;

  if (esCorrecte) {
    log('✅', `PASS — ${actives.length} assignació/ns, sense duplicats. Estat: ${incFinal.estat}`);
  } else {
    log('❌', `FAIL — ${actives.length} actives, duplicats: ${teDuplicats}. Estat: ${incFinal.estat}`);
  }

  registrarResultat(
    'T2 — Doble autoassignació',
    esCorrecte,
    `Actives: ${actives.length}, Duplicats: ${teDuplicats}, Estat: ${incFinal.estat}`
  );
}

// ==============================================================
// TEST 3: Finalització simultània
// ==============================================================

async function test3_FinalitzacioSimultania() {
  log('🧪', '═══ TEST 3: Finalització simultània d\'assignacions ═══');

  await alliberarTotsElsIndicatius();
  const disponibles = await obtenirIndicatiusDisponiblesProva();

  if (disponibles.length < CONFIG.CONCURRENCIA_FINALITZACIO) {
    log('⚠️', `Calen almenys ${CONFIG.CONCURRENCIA_FINALITZACIO} indicatius`);
    registrarResultat('T3 — Finalització simultània', false, 'Indicatius insuficients');
    return;
  }

  const assignacions = [];
  for (let i = 0; i < CONFIG.CONCURRENCIA_FINALITZACIO; i++) {
    const inc = await crearIncidenciaProva(`T3-${i}`);
    try {
      const res = await api.post('/assignacions/automatica', { incidencia_id: inc.id });
      assignacions.push({ ...res.data.dades, indicatiu_id: res.data.dades.indicatiu_id });
    } catch { }
  }

  if (assignacions.length === 0) {
    registrarResultat('T3 — Finalització simultània', false, 'Sense assignacions');
    return;
  }

  log('📋', `Finalitzant ${assignacions.length} assignacions simultàniament...`);

  const promeses = assignacions.map((a) =>
    api.patch(`/assignacions/${a.id}/finalitzar`, { observacions: 'Test T3' })
      .then(() => ({ exit: true, id: a.id }))
      .catch((e) => ({ exit: false, id: a.id, error: e.response?.data?.missatge || e.message }))
  );

  const resultatsTest = await Promise.allSettled(promeses);
  const respostes = resultatsTest.map((r) => r.value);

  const exitoses = respostes.filter((r) => r.exit);
  const fallides = respostes.filter((r) => !r.exit);

  log('📊', `Exitoses: ${exitoses.length} | Fallides: ${fallides.length}`);

  let totsDisponibles = true;
  for (const a of assignacions) {
    try {
      const ind = await obtenirIndicatiu(a.indicatiu_id);
      if (ind.estat_operatiu !== 'disponible') totsDisponibles = false;
    } catch { }
  }

  const esCorrecte = exitoses.length === assignacions.length && totsDisponibles;

  if (esCorrecte) {
    log('✅', 'PASS — Totes finalitzades, indicatius disponibles.');
  } else {
    log('❌', `FAIL — ${exitoses.length}/${assignacions.length}, Disponibles: ${totsDisponibles}`);
  }

  registrarResultat(
    'T3 — Finalització simultània',
    esCorrecte,
    `Finalitzades: ${exitoses.length}/${assignacions.length}, Tots disponibles: ${totsDisponibles}`
  );
}

// ==============================================================
// TEST 4: GPS concurrent
// ==============================================================

async function test4_GPSConcurrent() {
  log('🧪', '═══ TEST 4: Actualitzacions concurrents de GPS ═══');

  await alliberarTotsElsIndicatius();
  const disponibles = await obtenirIndicatiusDisponiblesProva();

  if (disponibles.length < 1) {
    registrarResultat('T4 — GPS concurrent', false, 'Sense indicatius');
    return;
  }

  const indicatiu = disponibles[0];

  log('📋', `Enviant ${CONFIG.CONCURRENCIA_GPS} actualitzacions GPS per a ${indicatiu.codi}...`);

  const promeses = Array.from({ length: CONFIG.CONCURRENCIA_GPS }, () =>
    api.patch(`/indicatius/${indicatiu.id}/ubicacio`, {
      ubicacio_lat: CONFIG.INCIDENCIA_LAT + (Math.random() * 0.01),
      ubicacio_lon: CONFIG.INCIDENCIA_LON + (Math.random() * 0.01),
    })
      .then(() => ({ exit: true }))
      .catch((e) => ({ exit: false, error: e.response?.data?.missatge || e.message }))
  );

  const resultatsTest = await Promise.allSettled(promeses);
  const respostes = resultatsTest.map((r) => r.value);

  const exitoses = respostes.filter((r) => r.exit);
  const fallides = respostes.filter((r) => !r.exit);

  const indFinal = await obtenirIndicatiu(indicatiu.id);
  const teCoords = indFinal.ubicacio_lat != null && indFinal.ubicacio_lon != null;

  const esCorrecte = exitoses.length === CONFIG.CONCURRENCIA_GPS && teCoords;

  if (esCorrecte) {
    log('✅', `PASS — ${exitoses.length}/${CONFIG.CONCURRENCIA_GPS} processades.`);
  } else {
    log('❌', `FAIL — ${exitoses.length}/${CONFIG.CONCURRENCIA_GPS}, Coords: ${teCoords}`);
  }

  registrarResultat('T4 — GPS concurrent', esCorrecte,
    `${exitoses.length}/${CONFIG.CONCURRENCIA_GPS} OK, Coords: ${teCoords}`);
}

// ==============================================================
// TEST 5: Càrrega concurrent mixta
// ==============================================================

async function test5_CarregaConcurrent() {
  const TOTAL = CONFIG.CONCURRENCIA_GPS;

  log('🧪', `═══ TEST 5: Càrrega concurrent mixta (${TOTAL} peticions) ═══`);

  const promeses = Array.from({ length: TOTAL }, (_, i) => {
    const tipus = i % 4;
    const rutes = ['/incidencies/actives', '/indicatius', '/indicatius/disponibles', '/tracabilitat?pagina=1&limit=10'];
    const noms  = ['GET actives', 'GET indicatius', 'GET disponibles', 'GET tracabilitat'];

    return api.get(rutes[tipus])
      .then(() => ({ exit: true, tipus: noms[tipus] }))
      .catch((e) => ({
        exit: false,
        tipus: noms[tipus],
        error: e.response?.data?.message || e.response?.data?.missatge || e.message,
        status: e.response?.status || 'sense status',
        }));
  });

  log('📋', `Llançant ${promeses.length} peticions simultànies...`);

  const inici = Date.now();
  const resultatsTest = await Promise.allSettled(promeses);
  const durada = Date.now() - inici;

  const respostes = resultatsTest.map((r) => r.value);
  const exitoses  = respostes.filter((r) => r.exit);
  const fallides  = respostes.filter((r) => !r.exit);

  const esCorrecte = fallides.length === 0;

  if (esCorrecte) {
    log('✅', `PASS — ${exitoses.length}/${TOTAL} en ${durada}ms.`);
  } else {
    log('❌', `FAIL — ${fallides.length} fallides en ${durada}ms.`);
    fallides.forEach((f) => log('  ⚠️', `${f.tipus} [${f.status}]: ${f.error}`));
  }

  registrarResultat('T5 — Càrrega mixta', esCorrecte,
    `${exitoses.length}/${TOTAL} OK, Temps: ${durada}ms`);
}

// ==============================================================
// RESUM FINAL
// ==============================================================

function mostrarResum() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  📊 RESUM DE PROVES DE CONCURRÈNCIA');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('  Detall per prova:');
  console.log('  ─────────────────────────────────────────────────');
  for (const d of resultats.detalls) {
    console.log(`  ${d.resultat}  ${d.nom}`);
    console.log(`         ${d.detall}`);
  }
  console.log('');
  console.log('  ─────────────────────────────────────────────────');
  console.log(`  Total:   ${resultats.total}`);
  console.log(`  ✅ Pass: ${resultats.passats}`);
  console.log(`  ❌ Fail: ${resultats.fallats}`);
  console.log('  ─────────────────────────────────────────────────');

  if (resultats.fallats === 0) {
    console.log('');
    console.log('  🎉 TOTES LES PROVES HAN PASSAT CORRECTAMENT');
  } else {
    console.log('');
    console.log('  ⚠️  ALGUNES PROVES HAN FALLAT — REVISAR DETALLS');
  }
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
}

// ==============================================================
// EXECUCIÓ
// ==============================================================

async function executarTests() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🧪 TEST DE CONCURRÈNCIA — COORDINA');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  URL:            ${BASE_URL}`);
  console.log(`  Indicatius:     ${CONFIG.NUM_INDICATIUS_PROVA} (es crearan)`);
  console.log(`  Concurrència:   ${CONFIG.CONCURRENCIA_ASSIGNACIO} (assignació)`);
  console.log(`                  ${CONFIG.CONCURRENCIA_AUTOASSIGNACIO} (autoassignació)`);
  console.log(`                  ${CONFIG.CONCURRENCIA_GPS} (GPS)`);
  console.log(`                  ${CONFIG.CONCURRENCIA_FINALITZACIO} (finalització)`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  try {
    await api.get('/incidencies/actives');
    log('✅', 'Connexió amb el backend verificada');
    console.log('');

    await setup();

    await test1_DobleAssignacioMateixIndicatiu();
    console.log('');

    await test2_DobleAutoassignacio();
    console.log('');

    await test3_FinalitzacioSimultania();
    console.log('');

    await test4_GPSConcurrent();
    console.log('');

    await test5_CarregaConcurrent();

  } catch (err) {
    log('❌', `Error general: ${err.message}`);
  }

  mostrarResum();
}

executarTests();