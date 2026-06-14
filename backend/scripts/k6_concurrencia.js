import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { Counter, Rate } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// ==============================================================
// CONFIGURACIÓ
// Pensat per al límit de Supabase en pla gratuït (~15 connexions)
// No es superen 8 VUs simultanis en cap escenari
// ==============================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN    = __ENV.TOKEN;

if (!TOKEN) {
  throw new Error('Cal passar el TOKEN via -e TOKEN="..."');
}

const CONFIG = {
  NUM_INDICATIUS_PROVA:      8,
  CONCURRENCIA_ASSIGNACIO:   5,
  CONCURRENCIA_AUTO:         5,
  CONCURRENCIA_GPS:          8,
  CONCURRENCIA_FINALITZAR:   3,
  CONCURRENCIA_LECTURA:      8,
  LECTURA_DURADA:            '10s',
  LAT_BASE:                  41.55,
  LON_BASE:                  2.25,
};

// ==============================================================
// MÈTRIQUES
// ==============================================================

const errors5xx               = new Counter('errors_5xx');
const errorsUnexpected        = new Counter('errors_unexpected');
const assignOk                = new Counter('assign_ok');
const assignConflict          = new Counter('assign_conflict');
const autoAssignOk            = new Counter('autoassign_ok');
const autoAssignConflict      = new Counter('autoassign_conflict');
const gpsOk                   = new Counter('gps_ok');
const gpsFail                 = new Counter('gps_fail');
const finishOk                = new Counter('finish_ok');
const finishFail              = new Counter('finish_fail');
const readOk                  = new Counter('read_ok');
const readFail                = new Counter('read_fail');
const businessConsistencyPass = new Rate('business_consistency_pass');

// ==============================================================
// SCENARIS
// ==============================================================

export const options = {
  scenarios: {
    assign_same_indicatiu: {
      executor: 'per-vu-iterations',
      vus: CONFIG.CONCURRENCIA_ASSIGNACIO,
      iterations: 1,
      exec: 'assignSameIndicatiu',
      startTime: '0s',
      gracefulStop: '0s',
    },
    autoassign_same_incidencia: {
      executor: 'per-vu-iterations',
      vus: CONFIG.CONCURRENCIA_AUTO,
      iterations: 1,
      exec: 'autoAssignSameIncidencia',
      startTime: '8s',
      gracefulStop: '0s',
    },
    gps_burst: {
      executor: 'per-vu-iterations',
      vus: CONFIG.CONCURRENCIA_GPS,
      iterations: 2,
      exec: 'gpsBurst',
      startTime: '16s',
      gracefulStop: '0s',
    },
    finish_parallel: {
      executor: 'per-vu-iterations',
      vus: CONFIG.CONCURRENCIA_FINALITZAR,
      iterations: 1,
      exec: 'finishParallel',
      startTime: '24s',
      gracefulStop: '0s',
    },
    read_load: {
      executor: 'constant-vus',
      vus: CONFIG.CONCURRENCIA_LECTURA,
      duration: CONFIG.LECTURA_DURADA,
      exec: 'readLoad',
      startTime: '32s',
      gracefulStop: '0s',
    },
  },

  thresholds: {
    http_req_failed: ['rate<0.20'],
    errors_5xx: ['count<10'],
    business_consistency_pass: ['rate>0.90'],
  },
};

// ==============================================================
// HELPERS
// ==============================================================

function authHeaders() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  };
}

function safeJson(res) {
  try {
    return res.json();
  } catch (_) {
    return null;
  }
}

function bodySnippet(res) {
  if (!res || !res.body) return '(sense body)';
  return String(res.body).slice(0, 250);
}

function logError(prefix, res) {
  const json = safeJson(res);
  const msg =
    json?.missatge ||
    json?.message ||
    bodySnippet(res);

  console.error(
    `❌ ${prefix} | status=${res.status} | vu=${exec.vu.idInTest} | iter=${exec.vu.iterationInScenario} | ${msg}`
  );

  if (res.status >= 500) errors5xx.add(1);
  else errorsUnexpected.add(1);
}

function req(method, path, body = null, tags = {}) {
  const url = `${BASE_URL}/api${path}`;
  const params = {
    headers: authHeaders(),
    tags,
  };

  let res;
  if (method === 'GET') res = http.get(url, params);
  else if (method === 'POST') res = http.post(url, body ? JSON.stringify(body) : null, params);
  else if (method === 'PATCH') res = http.patch(url, body ? JSON.stringify(body) : null, params);
  else if (method === 'PUT') res = http.put(url, body ? JSON.stringify(body) : null, params);
  else if (method === 'DELETE') res = http.del(url, body ? JSON.stringify(body) : null, params);

  return res;
}

const TIPOLOGIES_TEST = [
  'altercat',
  'robatori',
  'drogues',
  'incendi',
  'accident',
  'altres',
];

function incidenciaPayload(sufix, index = 0, prioritat = 'mitjana') {
  // Desplaçament fix suficient perquè no es dedupliquin
  // 0.003 graus són aproximadament >300m
  const offset = 0.003 * (index + 1);

  return {
    ubicacio_lat: CONFIG.LAT_BASE + offset,
    ubicacio_lon: CONFIG.LON_BASE + offset,
    tipologia: TIPOLOGIES_TEST[index % TIPOLOGIES_TEST.length],
    prioritat,
    descripcio: `Test k6 ${sufix} - ${Date.now()} - ${index}`,
    direccio: `Zona test ${sufix}-${index}`,
  };
}

// ==============================================================
// SETUP
// ==============================================================

export function setup() {
  console.log('🔧 SETUP: verificant connexió i creant dades de prova...');

  // Verificar backend
  const verify = req('GET', '/auth/verify', null, { phase: 'setup' });
  if (verify.status !== 200) {
    logError('SETUP verify', verify);
    throw new Error('No s’ha pogut verificar el token d’administrador');
  }

  // Crear indicatius de prova
  const indicatius = [];

  for (let i = 0; i < CONFIG.NUM_INDICATIUS_PROVA; i++) {
    const codi = `K6-${Date.now()}-${i}`;
    const res = req('POST', '/indicatius', {
      codi,
      tipus_unitat: 'cotxe',
      sector_assignat: 'Test K6',
      ubicacio_lat: CONFIG.LAT_BASE + Math.random() * 0.05,
      ubicacio_lon: CONFIG.LON_BASE + Math.random() * 0.05,
    }, { phase: 'setup', kind: 'create_indicatiu' });

    if (res.status === 201) {
      const data = safeJson(res);
      indicatius.push(data.dades);
      console.log(`   ✅ Indicatiu creat: ${codi}`);
    } else {
      logError(`SETUP create indicatiu ${codi}`, res);
      throw new Error('Error creant indicatius de prova');
    }
  }

  // Crear incidències per al test T1 (assignació mateix indicatiu)
  const t1Incidencies = [];
  for (let i = 0; i < CONFIG.CONCURRENCIA_ASSIGNACIO; i++) {
    const res = req('POST', '/incidencies', incidenciaPayload(`T1-${i}`, i), { phase: 'setup', kind: 'create_inc_t1' });
    if (res.status === 201) t1Incidencies.push(safeJson(res).dades);
    else {
      logError('SETUP create inc T1', res);
      throw new Error('Error creant incidències T1');
    }
  }

  // Crear incidència per al test T2 (autoassignació simultània)
  const t2Res = req('POST', '/incidencies', incidenciaPayload('T2', 20), { phase: 'setup', kind: 'create_inc_t2' });
  if (t2Res.status !== 201) {
    logError('SETUP create inc T2', t2Res);
    throw new Error('Error creant incidència T2');
  }
  const t2Incidencia = safeJson(t2Res).dades;

  // Crear incidències per al test T4/T3 (finalització)
  const t3Incidencies = [];
  for (let i = 0; i < CONFIG.CONCURRENCIA_FINALITZAR; i++) {
    const res = req('POST', '/incidencies', incidenciaPayload(`T3-${i}`, 40 + i), { phase: 'setup', kind: 'create_inc_t3' });
    if (res.status === 201) {
      t3Incidencies.push(safeJson(res).dades);
    } else {
      logError('SETUP create inc T3', res);
      throw new Error('Error creant incidències T3 (possible deduplicació inesperada)');
    }
  }

  // Assignar automàticament les incidències del test T3 per poder finalitzar-les després
  const t3Assignacions = [];
  for (const inc of t3Incidencies) {
    const res = req('POST', '/assignacions/automatica', {
      incidencia_id: inc.id,
    }, { phase: 'setup', kind: 'prepare_finish' });

    if (res.status === 201) {
      const data = safeJson(res);
      t3Assignacions.push(data.dades);
    } else {
      logError('SETUP prepare finish', res);
      throw new Error('Error preparant assignacions T3');
    }
  }

  console.log(`📊 SETUP completat: ${indicatius.length} indicatius, ${t1Incidencies.length + 1 + t3Incidencies.length} incidències`);
  console.log('');

  return {
    indicatius,
    targetIndicatiuId: indicatius[0].id,
    t1Incidencies,
    t2Incidencia,
    t3Assignacions,
  };
}

// ==============================================================
// ESCENARI 1: Mateix indicatiu assignat simultàniament
// ==============================================================

export function assignSameIndicatiu(data) {
  const vuIndex = exec.vu.idInTest - 1;
  const inc = data.t1Incidencies[vuIndex];

  const res = req('POST', '/assignacions', {
    incidencia_id: inc.id,
    indicatiu_id: data.targetIndicatiuId,
  }, { scenario: 'assign_same_indicatiu' });

  const acceptable = [201, 400, 409].includes(res.status);

  if (!acceptable) logError('T1 assign', res);

  if (res.status === 201) assignOk.add(1);
  else if ([400, 409].includes(res.status)) assignConflict.add(1);

  check(res, {
    'T1 response acceptable': () => acceptable,
  });

  sleep(0.1);
}

// ==============================================================
// ESCENARI 2: Autoassignació simultània mateixa incidència
// ==============================================================

export function autoAssignSameIncidencia(data) {
  const res = req('POST', '/assignacions/automatica', {
    incidencia_id: data.t2Incidencia.id,
  }, { scenario: 'autoassign_same_incidencia' });

  const acceptable = [201, 400, 404, 409].includes(res.status);

  if (!acceptable) logError('T2 autoassign', res);

  if (res.status === 201) autoAssignOk.add(1);
  else if ([400, 404, 409].includes(res.status)) autoAssignConflict.add(1);

  check(res, {
    'T2 response acceptable': () => acceptable,
  });

  sleep(0.1);
}

// ==============================================================
// ESCENARI 3: Ràfega d'actualitzacions GPS
// ==============================================================

export function gpsBurst(data) {
  const ind = data.indicatius[0];

  const res = req('PATCH', `/indicatius/${ind.id}/ubicacio`, {
    ubicacio_lat: CONFIG.LAT_BASE + Math.random() * 0.01,
    ubicacio_lon: CONFIG.LON_BASE + Math.random() * 0.01,
  }, { scenario: 'gps_burst' });

  const ok = res.status === 200;

  if (!ok) logError('T3 gps', res);

  if (ok) gpsOk.add(1);
  else gpsFail.add(1);

  check(res, {
    'T3 GPS updated': () => ok,
  });

  sleep(0.05);
}

// ==============================================================
// ESCENARI 4: Finalització simultània
// ==============================================================

export function finishParallel(data) {
  const vuIndex = exec.vu.idInTest - 1;
  const assignacio = data.t3Assignacions[vuIndex];

  const res = req('PATCH', `/assignacions/${assignacio.id}/finalitzar`, {
    observacions: 'Test k6 finalització concurrent',
  }, { scenario: 'finish_parallel' });

  const acceptable = [200, 400, 404].includes(res.status);

  if (!acceptable) logError('T4 finish', res);

  if (res.status === 200) finishOk.add(1);
  else finishFail.add(1);

  check(res, {
    'T4 finish response acceptable': () => acceptable,
  });

  sleep(0.05);
}

// ==============================================================
// ESCENARI 5: Càrrega concurrent mixta
// ==============================================================

export function readLoad() {
  const routes = [
    { name: 'GET actives',     path: '/incidencies/actives' },
    { name: 'GET indicatius',  path: '/indicatius' },
    { name: 'GET disponibles', path: '/indicatius/disponibles' },
    { name: 'GET tracabilitat', path: '/tracabilitat?pagina=1&limit=10' },
  ];

  const idx = exec.vu.iterationInScenario % routes.length;
  const route = routes[idx];

  const res = req('GET', route.path, null, { scenario: 'read_load', endpoint: route.name });
  const ok = res.status === 200;

  if (!ok) logError(`T5 ${route.name}`, res);

  if (ok) readOk.add(1);
  else readFail.add(1);

  check(res, {
    [`T5 ${route.name} OK`]: () => ok,
  });

  sleep(0.2);
}

// ==============================================================
// TEARDOWN: verificacions i neteja lògica
// ==============================================================

export function teardown(data) {
  console.log('');
  console.log('🧹 TEARDOWN: verificant consistència i netejant dades de prova...');

  // ── Verificació T1 ─────────────────────────────────────────
  let t1Success = 0;
  for (const inc of data.t1Incidencies) {
    const res = req('GET', `/assignacions/activa?incidencia_id=${inc.id}`, null, { phase: 'verify' });
    if (res.status === 200) {
      const payload = safeJson(res);
      const arr = Array.isArray(payload.dades) ? payload.dades : [payload.dades];
      if (arr.some((a) => a.indicatiu_id === data.targetIndicatiuId)) t1Success++;
    }
  }
  const t1Pass = t1Success === 1;
  businessConsistencyPass.add(t1Pass ? 1 : 0);
  console.log(`   ${t1Pass ? '✅' : '❌'} T1 verificació final: ${t1Success} assignació/ns al mateix indicatiu (esperat: 1)`);

  // ── Verificació T2 ─────────────────────────────────────────
  const t2Res = req('GET', `/assignacions/activa?incidencia_id=${data.t2Incidencia.id}`, null, { phase: 'verify' });
  let t2Actives = [];
  if (t2Res.status === 200) {
    const payload = safeJson(t2Res);
    t2Actives = Array.isArray(payload.dades) ? payload.dades : [payload.dades];
  }
  const t2Ids = t2Actives.map((a) => a.indicatiu_id);
  const t2Pass = new Set(t2Ids).size === t2Ids.length;
  businessConsistencyPass.add(t2Pass ? 1 : 0);
  console.log(`   ${t2Pass ? '✅' : '❌'} T2 verificació final: ${t2Actives.length} assignació/ns, duplicats: ${!t2Pass}`);

  // ── Verificació T3 (GPS) ───────────────────────────────────
  const gpsRes = req('GET', `/indicatius/${data.indicatius[0].id}`, null, { phase: 'verify' });
  const gpsJson = safeJson(gpsRes);
  const gpsPass = gpsRes.status === 200 && gpsJson?.dades?.ubicacio_lat != null && gpsJson?.dades?.ubicacio_lon != null;
  businessConsistencyPass.add(gpsPass ? 1 : 0);
  console.log(`   ${gpsPass ? '✅' : '❌'} T3 verificació final GPS: coordenades finals vàlides`);

  // ── Neteja de les assignacions actives de prova ────────────
  const allInc = [...data.t1Incidencies, data.t2Incidencia];
  for (const inc of allInc) {
    const res = req('GET', `/assignacions/activa?incidencia_id=${inc.id}`, null, { phase: 'cleanup' });
    if (res.status === 200) {
      const payload = safeJson(res);
      const arr = Array.isArray(payload.dades) ? payload.dades : [payload.dades];
      for (const a of arr) {
        req('PATCH', `/assignacions/${a.id}/finalitzar`, {
          observacions: 'Neteja automàtica K6',
        }, { phase: 'cleanup' });
      }
    }
  }

  // ── Tancar incidències de prova ────────────────────────────
  for (const inc of [...data.t1Incidencies, data.t2Incidencia]) {
    req('DELETE', `/incidencies/${inc.id}`, { observacions: 'Neteja K6' }, { phase: 'cleanup' });
  }

  // ── Marcar indicatius de prova com a finalitzats ───────────
  // No es poden esborrar físicament perquè l'API no exposa DELETE
  for (const ind of data.indicatius) {
    req('PATCH', `/indicatius/${ind.id}/estat`, {
      estat_operatiu: 'finalitzat',
    }, { phase: 'cleanup' });
  }

  console.log('✅ Neteja lògica completada');
}

// ==============================================================
// RESUM FINAL PERSONALITZAT
// ==============================================================

export function handleSummary(data) {
  const summary = [];
  summary.push('═══════════════════════════════════════════════════════');
  summary.push('🧪  RESUM K6 — TEST DE CONCURRÈNCIA COORDINA');
  summary.push('═══════════════════════════════════════════════════════');
  summary.push(`URL: ${BASE_URL}`);
  summary.push('');
  summary.push('Resultats principals:');
  summary.push(`- Assignacions correctes:        ${data.metrics.assign_ok?.values.count || 0}`);
  summary.push(`- Conflictes controlats:         ${data.metrics.assign_conflict?.values.count || 0}`);
  summary.push(`- Autoassignacions correctes:    ${data.metrics.autoassign_ok?.values.count || 0}`);
  summary.push(`- Conflictes autoassignació:     ${data.metrics.autoassign_conflict?.values.count || 0}`);
  summary.push(`- GPS correctes:                 ${data.metrics.gps_ok?.values.count || 0}`);
  summary.push(`- GPS fallits:                   ${data.metrics.gps_fail?.values.count || 0}`);
  summary.push(`- Finalitzacions correctes:      ${data.metrics.finish_ok?.values.count || 0}`);
  summary.push(`- Finalitzacions fallides:       ${data.metrics.finish_fail?.values.count || 0}`);
  summary.push(`- Lectures correctes:            ${data.metrics.read_ok?.values.count || 0}`);
  summary.push(`- Lectures fallides:             ${data.metrics.read_fail?.values.count || 0}`);
  summary.push(`- Errors 5xx:                    ${data.metrics.errors_5xx?.values.count || 0}`);
  summary.push('');
  summary.push('Rendiment HTTP:');
  summary.push(`- Peticions totals:              ${data.metrics.http_reqs.values.count}`);
  summary.push(`- Temps mitjà resposta:          ${data.metrics.http_req_duration.values.avg.toFixed(2)} ms`);
  summary.push(`- p95 temps resposta:            ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)} ms`);
  summary.push(`- Percentatge d'errors HTTP:     ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)} %`);
  summary.push('');
  summary.push('Consistència de negoci:');
  summary.push(`- Taxa de validació final:       ${(data.metrics.business_consistency_pass?.values.rate * 100 || 0).toFixed(2)} %`);
  summary.push('');
  summary.push('Interpretació recomanada:');
  summary.push('- Si fallen T1/T2/T4, hi ha un problema greu de consistència.');
  summary.push('- Si fallen lectures sota càrrega però no T1/T2/T4, el coll d’ampolla és d’infraestructura.');
  summary.push('- El pla gratuït de Supabase limita la concurrència real de connexions.');
  summary.push('═══════════════════════════════════════════════════════');

  return {
    stdout: summary.join('\n') + '\n\n' + textSummary(data, { indent: ' ', enableColors: true }),
  };
}