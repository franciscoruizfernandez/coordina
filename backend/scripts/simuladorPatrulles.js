// backend/scripts/simuladorPatrulles.js

import axios from 'axios';

import http from 'http';
import https from 'https';

import dotenv from 'dotenv';
import {
  construirGraf,
  snapACarretera,
  dijkstra,
  veiAleatori
} from '../utils/grafCarreteres.js';

http.globalAgent.setMaxListeners(50);
https.globalAgent.setMaxListeners(50);

axios.defaults.maxRedirects = 5;
process.setMaxListeners(20);


dotenv.config();

// ==============================================================
// CONFIGURACIÓ
// ==============================================================

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TOKEN    = process.env.TOKEN_PATRULLA_SIMULADOR;

console.log('TOKEN carregat:', TOKEN ? `${TOKEN.substring(0, 20)}...` : 'NUL·L O BUIT');

const INTERVAL      = 4000;  // ms entre ticks
const PUNTS_PER_TICK = 3;    // punts de ruta avançats per tick (~10-50 m cadascun)
const DISTANCIA_ARRIBADA = 100; // metres per considerar que s'ha arribat

// Guard per evitar que dos ticks es solapin si una iteració tarda massa.
// Amb 60-80 indicatius i crides HTTP, pot passar en pics de latència.
let tickEnCurs = false;

// ==============================================================
// CÀRREGA DEL GRAF (UNA SOLA VEGADA)
// ==============================================================

console.log('');
console.log('Carregant graf de carreteres...');
const graf = construirGraf('data/carreteres.geojson');

if (!graf) {
  console.error('No s\'ha pogut carregar el graf. Revisa data/carreteres.geojson');
  process.exit(1);
}

console.log('Graf carregat correctament');
console.log('');

// ==============================================================
// ESTAT DE LES PATRULLES (EN MEMÒRIA)
// ==============================================================

// Map<indicatiuId: string, EstatPatrulla>
//
// EstatPatrulla:
//   mode              - fase de moviment actual
//   incidenciaActual  - ID de la incidència assignada (o null)
//   ruta              - array de { lat, lon } amb els punts del camí
//   indexPunt         - índex actual dins de ruta
//   nodeActual        - node del graf on es troba la patrulla
//   timeoutFinalitzacio - referència al setTimeout de tancament (o null)
//   incidenciaTimer   - ID de la incidència per a la qual s'ha programat el timer
//   finalitzant       - true mentre hi ha una crida API de tancament en vol
//
// Els tres últims camps controlen el tancament automàtic en arribar.
// Viuen únicament en memòria del procés: no toquen la BD.

const estatPatrulles = new Map();

function getEstat(indicatiuId) {
  if (!estatPatrulles.has(indicatiuId)) {
    estatPatrulles.set(indicatiuId, {
      mode: 'patrullatge',
      incidenciaActual: null,
      ruta: null,
      indexPunt: 0,
      nodeActual: null,
      timeoutFinalitzacio: null,
      incidenciaTimer: null,
      finalitzant: false,
    });
  }
  return estatPatrulles.get(indicatiuId);
}

// ==============================================================
// FUNCIONS DE MOVIMENT (sense canvis respecte a la versió original)
// ==============================================================

function distanciaSimple(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * MOVIMENT EN MODE "PATRULLATGE"
 *
 * La patrulla no té incidència assignada.
 * Es mou aleatòriament per la xarxa de carreteres.
 */
function mourePatrullatge(estat, lat, lon) {
  if (!estat.nodeActual) {
    const snap = snapACarretera(graf, lat, lon);
    if (!snap) return null;
    estat.nodeActual = snap.nodeId;
  }

  if (!estat.ruta || estat.indexPunt >= estat.ruta.length - 1) {
    const vei = veiAleatori(graf, estat.nodeActual);
    if (!vei) return null;

    estat.ruta      = vei.puntsIntermedis.map(c => ({ lon: c[0], lat: c[1] }));
    estat.indexPunt = 0;
    estat.nodeActual = vei.nodeId;
  }

  const nouIndex  = Math.min(estat.indexPunt + PUNTS_PER_TICK, estat.ruta.length - 1);
  estat.indexPunt = nouIndex;

  return { lat: estat.ruta[nouIndex].lat, lon: estat.ruta[nouIndex].lon };
}

/**
 * MOVIMENT EN MODE "DESPLAÇAMENT"
 *
 * La patrulla té una incidència assignada i s'hi dirigeix per carreteres
 * usant Dijkstra. Si no troba ruta, passa a desplacament_directe.
 */
function moureDesplacament(estat, lat, lon, latObj, lonObj) {
  if (!estat.ruta) {
    const snapOrigen = snapACarretera(graf, lat, lon);
    const snapDesti  = snapACarretera(graf, latObj, lonObj);

    if (!snapOrigen || !snapDesti) {
      console.warn('   No s\'ha pogut fer snap per calcular la ruta');
      return null;
    }

    const rutaCalculada = dijkstra(graf, snapOrigen.nodeId, snapDesti.nodeId);

    if (!rutaCalculada) {
      console.warn('   No s\'ha trobat ruta per carreteres. Usant mode directe.');
      estat.mode = 'desplacament_directe';
      return null;
    }

    estat.ruta      = rutaCalculada.punts.map(c => ({ lon: c[0], lat: c[1] }));
    estat.indexPunt = 0;

    console.log(
      `   Ruta calculada: ${rutaCalculada.punts.length} punts,` +
      ` ${(rutaCalculada.distanciaTotal / 1000).toFixed(1)} km`
    );
  }

  const distanciaAlDesti = distanciaSimple(lat, lon, latObj, lonObj);

  if (distanciaAlDesti < DISTANCIA_ARRIBADA) {
    estat.mode = 'aturada';
    estat.ruta = null;
    console.log('   Patrulla ha arribat a la incidència');
    return { lat, lon };
  }

  if (estat.indexPunt >= estat.ruta.length - 1) {
    estat.mode = 'aturada';
    estat.ruta = null;
    return { lat, lon };
  }

  const nouIndex  = Math.min(estat.indexPunt + PUNTS_PER_TICK, estat.ruta.length - 1);
  estat.indexPunt = nouIndex;

  return { lat: estat.ruta[nouIndex].lat, lon: estat.ruta[nouIndex].lon };
}

/**
 * MOVIMENT EN MODE "DESPLAÇAMENT DIRECTE" (fallback sense graf)
 *
 * Mou la patrulla en línia recta cap al destí quan Dijkstra
 * no troba ruta per carreteres.
 */
function moureDesplacamentDirecte(lat, lon, latObj, lonObj) {
  const factor = 0.08;
  return {
    lat: parseFloat((lat + (latObj - lat) * factor).toFixed(6)),
    lon: parseFloat((lon + (lonObj - lon) * factor).toFixed(6)),
  };
}

// ==============================================================
// HELPERS API PER AL TANCAMENT AUTOMÀTIC
// ==============================================================

/**
 * Obté l'assignació activa d'una incidència.
 * Retorna null si no n'hi ha cap (404) o si l'API falla.
 */
async function obtenirAssignacioActiva(incidenciaId) {
  try {
    const res = await axios.get(
      `${BASE_URL}/api/assignacions/activa`,
      {
        params: { incidencia_id: incidenciaId },
        headers: { Authorization: `Bearer ${TOKEN}` },
      }
    );
    return res.data.dades || null;
  } catch (err) {
    // 404 vol dir que l'assignació ja no existeix (tancada manualment, etc.)
    if (err.response?.status === 404) return null;
    throw err;
  }
}

/**
 * Obté el detall complet d'una incidència.
 * Retorna null si no existeix.
 */
async function obtenirIncidencia(incidenciaId) {
  try {
    const res = await axios.get(
      `${BASE_URL}/api/incidencies/${incidenciaId}`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    return res.data.dades || null;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

/**
 * Finalitza una assignació amb les observacions indicades.
 */
async function finalitzarAssignacio(assignacioId, observacions) {
  await axios.patch(
    `${BASE_URL}/api/assignacions/${assignacioId}/finalitzar`,
    { observacions },
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
}

// ==============================================================
// GENERADOR D'OBSERVACIONS AUTOMÀTIQUES
// ==============================================================

/**
 * Retorna un text d'observacions adequat a la tipologia de la incidència.
 * Si la tipologia no es reconeix, es fa servir un text genèric.
 */
function generarObservacions(tipologia) {
  const textos = {
    robatori:            'Intervenció simulada finalitzada. Zona verificada i informe tramès a la central.',
    accident:            'Intervenció simulada finalitzada. Accident gestionat i situació normalitzada.',
    altercat:            'Intervenció simulada finalitzada. Altercat dissolt i parts identificades.',
    violencia_domestica: 'Intervenció simulada finalitzada. Protocol activat i assistència realitzada.',
    incendi:             'Intervenció simulada finalitzada. Zona assegurada i incidència controlada.',
    desaparegut:         'Intervenció simulada finalitzada. Dades recollides i recerca coordinada.',
    drogues:             'Intervenció simulada finalitzada. Actuació completada i substàncies intervingudes si escau.',
    ordre_public:        'Intervenció simulada finalitzada. Ordre restablert a la zona.',
    altres:              'Intervenció simulada finalitzada. Servei completat sense novetats rellevants.',
  };

  return textos[tipologia] ?? 'Intervenció simulada finalitzada automàticament.';
}

// ==============================================================
// CONTROL DEL TANCAMENT AUTOMÀTIC
// ==============================================================

/**
 * Elimina el temporitzador de tancament d'una patrulla i
 * reinicia tots els flags de control relacionats.
 *
 * S'utilitza tant quan el tancament es completa correctament
 * com quan es detecta un canvi d'incidència que el invalida.
 */
function netejarTemporitzador(estat) {
  if (estat.timeoutFinalitzacio !== null) {
    clearTimeout(estat.timeoutFinalitzacio);
  }
  estat.timeoutFinalitzacio = null;
  estat.incidenciaTimer     = null;
  estat.finalitzant         = false;
}

/**
 * Programa el tancament automàtic d'una patrulla que ha arribat
 * a la incidència i ha entrat en mode "aturada".
 *
 * Garanties:
 *  - No es programa mai més d'un timer per patrulla.
 *  - Si `finalitzant` és true, la crida API ja està en vol:
 *    no es crea cap timer nou.
 *  - Dins del callback es torna a verificar que la incidència
 *    no hagi canviat abans de cridar l'API.
 *  - El bloc finally garanteix que els flags es netegen sempre,
 *    fins i tot si hi ha un error inesperat.
 *
 * No toca la BD directament: delega tot al backend via API REST.
 */
function programarTancamentAutomatic(indicatiu, estat) {
  const incidenciaId = indicatiu.incidencia_assignada_id;

  // Sense incidència no té sentit programar cap tancament.
  if (!incidenciaId) return;

  // Ja hi ha una crida API en vol per a aquesta patrulla.
  // No es pot llançar cap timer nou fins que acabi.
  if (estat.finalitzant) return;

  // Ja hi ha un timer actiu per a la mateixa incidència.
  // Cada patrulla només pot tenir un tancament pendent.
  if (
    estat.timeoutFinalitzacio !== null &&
    estat.incidenciaTimer === incidenciaId
  ) {
    return;
  }

  // Si hi havia un timer d'una altra incidència (cas inesperat),
  // es cancel·la per coherència.
  if (estat.timeoutFinalitzacio !== null) {
    netejarTemporitzador(estat);
  }

  // Temps d'espera aleatori entre 5 i 10 s per simular l'actuació
  // mínima de la patrulla al lloc del servei.
  const tempsEspera = Math.floor(Math.random() * 5001) + 5000;

  // Es guarda l'ID de la incidència per a la qual es programa el timer.
  // Serveix per invalidar-lo si la incidència canvia abans que venci.
  estat.incidenciaTimer = incidenciaId;

  estat.timeoutFinalitzacio = setTimeout(async () => {
    // Es recupera l'estat actual al moment d'executar-se el callback,
    // que pot diferir del moment en què es va programar el timer.
    const estatActual = getEstat(indicatiu.id);

    // Si la incidència ha canviat o desaparegut entre ticks,
    // el tancament queda invalida i s'abandona sense cridar l'API.
    if (estatActual.incidenciaTimer !== incidenciaId) {
      netejarTemporitzador(estatActual);
      return;
    }

    // Flag que impedeix que un tick concurrent programi un altre timer
    // mentre la crida API de tancament encara no ha acabat.
    estatActual.finalitzant = true;

    try {
      const assignacio = await obtenirAssignacioActiva(incidenciaId);

      // Si no hi ha assignació activa, algú l'ha tancat manualment.
      // No cal fer res més, el backend ja ho ha gestionat.
      if (!assignacio) {
        console.log(`   ${indicatiu.codi}: assignació ja tancada externament`);
        return;
      }

      // Verificació addicional: l'assignació ha de pertànyer a aquest indicatiu.
      // Evita que una reassignació molt ràpida tanqui una assignació equivocada.
      if (assignacio.indicatiu_id !== indicatiu.id) {
        console.log(`   ${indicatiu.codi}: l'assignació activa pertany a un altre indicatiu`);
        return;
      }

      const incidencia   = await obtenirIncidencia(incidenciaId);
      const observacions = generarObservacions(incidencia?.tipologia);

      await finalitzarAssignacio(assignacio.id, observacions);

      console.log(`   ${indicatiu.codi}: servei finalitzat correctament`);

      // El backend ja ha desassignat l'indicatiu i l'ha posat a "disponible".
      // Aquí es reinicia l'estat local perquè el proper tick
      // el trobi net i reprengui el patrullatge aleatori.
      estatActual.mode             = 'patrullatge';
      estatActual.incidenciaActual = null;
      estatActual.ruta             = null;
      estatActual.indexPunt        = 0;
      estatActual.nodeActual       = null;

    } catch (err) {
      console.error(
        `   Error en tancament automatic de ${indicatiu.codi}:`,
        err.response?.data || err.message
      );
      // No es reinicia l'estat local: el proper tick tornarà a cridar
      // programarTancamentAutomatic i ho intentarà de nou si escau.
    } finally {
      netejarTemporitzador(estatActual);
    }
  }, tempsEspera);

  console.log(
    `   ${indicatiu.codi}: finalitzacio automatica en ${(tempsEspera / 1000).toFixed(1)} s`
  );
}

// ==============================================================
// GESTIÓ DEL CANVI D'INCIDÈNCIA
// ==============================================================

/**
 * Compara la incidència que tenia la patrulla en el tick anterior
 * amb la que té ara, i actualitza l'estat i el mode en conseqüència.
 *
 * Casos:
 *   A) Sense incidència → amb incidència : passar a desplaçament
 *   B) Amb incidència   → sense incidència : tornar a patrullatge
 *   C) Incidència X     → incidència Y : recalcular ruta
 *   D) Mateixa incidència : no fer res
 *
 * En els casos B i C, si hi havia un timer de tancament actiu,
 * es cancel·la per evitar tancar una assignació que ja no és vàlida.
 */
function gestionarCanviIncidencia(estat, indicatiu) {
  const incidenciaNova     = indicatiu.incidencia_assignada_id || null;
  const incidenciaAnterior = estat.incidenciaActual;

  // Cas D: res no ha canviat.
  if (incidenciaNova === incidenciaAnterior) return;

  // En qualsevol canvi, cancel·lar el timer de tancament si n'hi ha un.
  // Un timer pendit d'una incidència anterior no és aplicable
  // a la nova situació de la patrulla.
  if (estat.timeoutFinalitzacio !== null || estat.finalitzant) {
    netejarTemporitzador(estat);
    console.log(`   ${indicatiu.codi}: timer de tancament cancel·lat per canvi d'incidència`);
  }

  // Cas B: li han retirat la incidència.
  if (!incidenciaNova && incidenciaAnterior) {
    console.log(`   ${indicatiu.codi}: incidència retirada → patrullatge`);
    estat.mode             = 'patrullatge';
    estat.incidenciaActual = null;
    estat.ruta             = null;
    estat.indexPunt        = 0;
    return;
  }

  // Cas A: nova incidència assignada (no en tenia cap).
  if (incidenciaNova && !incidenciaAnterior) {
    console.log(`   ${indicatiu.codi}: nova incidència assignada → desplaçament`);
    estat.mode             = 'desplacament';
    estat.incidenciaActual = incidenciaNova;
    estat.ruta             = null;
    estat.indexPunt        = 0;
    return;
  }

  // Cas C: canvi d'una incidència a una altra.
  console.log(`   ${indicatiu.codi}: canvi d'incidència → nova ruta`);
  estat.mode             = 'desplacament';
  estat.incidenciaActual = incidenciaNova;
  estat.ruta             = null;
  estat.indexPunt        = 0;
}

// ==============================================================
// CRIDES API BÀSIQUES
// ==============================================================

async function obtenirIndicatius() {
  const res = await axios.get(
    `${BASE_URL}/api/indicatius`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  return res.data.dades;
}

async function actualitzarGPS(indicatiuId, lat, lon) {
  await axios.patch(
    `${BASE_URL}/api/indicatius/${indicatiuId}/ubicacio`,
    { ubicacio_lat: lat, ubicacio_lon: lon },
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
}

// ==============================================================
// LOOP PRINCIPAL
// ==============================================================

async function simularMoviment() {
  // Si el tick anterior encara no ha acabat (latència alta o moltes
  // patrulles), s'omet aquest tick per evitar solapaments i duplicats.
  if (tickEnCurs) {
    console.log('   Tick omès: el tick anterior encara no ha finalitzat');
    return;
  }

  tickEnCurs = true;

  try {
    const indicatius = await obtenirIndicatius();

    for (const indicatiu of indicatius) {
      const latActual = parseFloat(indicatiu.ubicacio_lat);
      const lonActual = parseFloat(indicatiu.ubicacio_lon);

      if (
        isNaN(latActual) || isNaN(lonActual) ||
        latActual < -90  || latActual > 90   ||
        lonActual < -180 || lonActual > 180
      ) {
        console.log(`   ${indicatiu.codi}: coordenades invalides, ignorat`);
        continue;
      }

      const estat = getEstat(indicatiu.id);

      // Detectar i gestionar canvis en la incidència assignada.
      gestionarCanviIncidencia(estat, indicatiu);

      let novaPosicio = null;

      switch (estat.mode) {

        case 'patrullatge':
          novaPosicio = mourePatrullatge(estat, latActual, lonActual);
          break;

        case 'desplacament': {
          const latObj = parseFloat(indicatiu.incidencia_lat);
          const lonObj = parseFloat(indicatiu.incidencia_lon);

          if (isNaN(latObj) || isNaN(lonObj)) {
            console.warn(`   ${indicatiu.codi}: coordenades incidència invalides`);
            novaPosicio = null;
            break;
          }

          novaPosicio = moureDesplacament(estat, latActual, lonActual, latObj, lonObj);

          // Si Dijkstra no ha trobat ruta, s'ha canviat a desplacament_directe.
          if (!novaPosicio && estat.mode === 'desplacament_directe') {
            novaPosicio = moureDesplacamentDirecte(latActual, lonActual, latObj, lonObj);
          }

          // Si durant aquest tick s'ha assolit el destí i s'ha passat
          // a "aturada", programar el tancament automàtic immediatament.
          if (estat.mode === 'aturada') {
            programarTancamentAutomatic(indicatiu, estat);
          }
          break;
        }

        case 'desplacament_directe': {
          const latObj = parseFloat(indicatiu.incidencia_lat);
          const lonObj = parseFloat(indicatiu.incidencia_lon);

          novaPosicio = moureDesplacamentDirecte(latActual, lonActual, latObj, lonObj);

          if (distanciaSimple(latActual, lonActual, latObj, lonObj) < DISTANCIA_ARRIBADA) {
            estat.mode = 'aturada';
            estat.ruta = null;
          }

          // Igual que en el cas anterior, si s'ha assolit el destí
          // en aquest tick, programar el tancament.
          if (estat.mode === 'aturada') {
            programarTancamentAutomatic(indicatiu, estat);
          }
          break;
        }

        case 'aturada':
          // La patrulla ja estava aturada d'un tick anterior.
          // Es torna a cridar programarTancamentAutomatic com a
          // salvaguarda per si el timer no s'hagués programat
          // correctament en el tick d'arribada.
          // La funció és idempotent: no fa res si ja hi ha timer actiu.
          programarTancamentAutomatic(indicatiu, estat);
          novaPosicio = { lat: latActual, lon: lonActual };
          break;
      }

      if (!novaPosicio) {
        console.log(`   ${indicatiu.codi}: no s'ha pogut calcular posicio`);
        continue;
      }

      const etiquetaMode = {
        patrullatge:         '[patrullatge        ]',
        desplacament:        '[desplacament       ]',
        desplacament_directe:'[desplacament_direct]',
        aturada:             '[aturada            ]',
      }[estat.mode] ?? '[desconegut         ]';

      console.log(
        `${indicatiu.codi.padEnd(10)} ${etiquetaMode}` +
        ` -> (${novaPosicio.lat.toFixed(5)}, ${novaPosicio.lon.toFixed(5)})`
      );

      try {
        await actualitzarGPS(indicatiu.id, novaPosicio.lat, novaPosicio.lon);
      } catch (err) {
        console.error(
          `   Error actualitzant GPS de ${indicatiu.codi}:`,
          err.response?.data || err.message
        );
      }
    }

  } catch (error) {
    console.error('   Error general del tick:', error.response?.data || error.message);
  } finally {
    // Alliberar el guard sempre, tant si el tick ha anat bé com si no.
    tickEnCurs = false;
  }
}

// ==============================================================
// ARRANCADA
// ==============================================================

function iniciarSimulador() {
  console.log('===================================================');
  console.log('  SIMULADOR DE PATRULLES - Mode Cartografic');
  console.log('===================================================');
  console.log(`  Graf:           ${graf.stats.totalNodes} nodes, ${graf.stats.totalArestes} arestes`);
  console.log(`  Interval:       ${INTERVAL / 1000} s`);
  console.log(`  Punts per tick: ${PUNTS_PER_TICK}`);
  console.log('===================================================');
  console.log('');
  console.log('  [patrullatge]         Patrullatge aleatori per carreteres');
  console.log('  [desplacament]        Ruta per carreteres cap a incidencia');
  console.log('  [desplacament_direct] Linia recta cap a incidencia (fallback)');
  console.log('  [aturada]             Aturat a la incidencia, esperant tancament');
  console.log('');

  simularMoviment();
  setInterval(simularMoviment, INTERVAL);
}

iniciarSimulador();