// backend/scripts/simuladorPatrulles.js

import axios from 'axios';

axios.defaults.maxRedirects = 5;
process.setMaxListeners(20);

import dotenv from 'dotenv';
import {
  construirGraf,
  snapACarretera,
  dijkstra,
  veiAleatori
} from '../utils/grafCarreteres.js';


dotenv.config();

// ==============================================================
// CONFIGURACIÓ
// ==============================================================

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TOKEN = process.env.TOKEN_PATRULLA_SIMULADOR;


// Comprovació temporal
console.log('TOKEN carregat:', TOKEN ? `${TOKEN.substring(0, 20)}...` : 'NUL·L O BUIT');
const INTERVAL = 4000;

// Quants punts avança la patrulla per tick.
// Cada punt és aprox 10-50 metres depenent del zoom del GeoJSON.
// Amb 3 punts per tick i interval de 4s → velocitat visual acceptable.
const PUNTS_PER_TICK = 3;

// Distància mínima (en metres) per considerar que la patrulla
// ha "arribat" al destí i pot parar.
const DISTANCIA_ARRIBADA = 100;

// ==============================================================
// CÀRREGA DEL GRAF (UNA SOLA VEGADA)
// ==============================================================

console.log('');
console.log('🔧 Carregant graf de carreteres...');
const graf = construirGraf('data/carreteres.geojson');

if (!graf) {
  console.error('❌ No s\'ha pogut carregar el graf. Revisa data/carreteres.geojson');
  process.exit(1);
}

console.log('✅ Graf carregat correctament');
console.log('');

// ==============================================================
// ESTAT DE LES PATRULLES (EN MEMÒRIA)
// ==============================================================

// Guardem l'estat de cada patrulla entre ticks.
// Clau: ID de l'indicatiu
// Valor: objecte amb el mode i la ruta actual

const estatPatrulles = new Map();

/**
 * Retorna l'estat actual d'una patrulla.
 * Si no existeix, crea un estat inicial buit.
 */
function getEstat(indicatiuId) {
  if (!estatPatrulles.has(indicatiuId)) {
    estatPatrulles.set(indicatiuId, {
      mode: 'patrullatge',       // "patrullatge" | "desplacament" | "aturada"
      incidenciaActual: null,    // ID de la incidència assignada (o null)
      ruta: null,                // Array de [lon, lat] amb tots els punts del camí
      indexPunt: 0,              // Per on va dins de la ruta
      nodeActual: null           // Node del graf on es troba ara
    });
  }
  return estatPatrulles.get(indicatiuId);
}

// ==============================================================
// FUNCIONS DE MOVIMENT
// ==============================================================

/**
 * Calcula la distància en metres entre dos punts [lat, lon].
 * Versió simple sense Turf (per evitar imports addicionals).
 */
function distanciaSimple(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
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
 *
 * Lògica:
 * 1. Si no té ruta → escollir un veí aleatori del node actual
 * 2. Avançar PUNTS_PER_TICK punts dins del tram
 * 3. Si arriba al final del tram → escollir un nou veí aleatori
 *    (la patrulla "gira" en la cruïlla)
 *
 * @param {Object} estat - Estat de la patrulla
 * @param {number} lat - Posició actual
 * @param {number} lon
 * @returns {Object|null} { lat, lon } nova posició, o null si no es pot moure
 */
function mourePatrullatge(estat, lat, lon) {
  // Si no té node actual, fer snap a la carretera més propera
  if (!estat.nodeActual) {
    const snap = snapACarretera(graf, lat, lon);
    if (!snap) return null;
    estat.nodeActual = snap.nodeId;
  }

  // Si no té ruta (o l'ha acabada), escollir un nou tram aleatori
  if (!estat.ruta || estat.indexPunt >= estat.ruta.length - 1) {
    const vei = veiAleatori(graf, estat.nodeActual);
    if (!vei) return null;

    // La nova ruta és el tram fins al veí
    estat.ruta = vei.puntsIntermedis.map(c => ({ lon: c[0], lat: c[1] }));
    estat.indexPunt = 0;
    estat.nodeActual = vei.nodeId;
  }

  // Avançar PUNTS_PER_TICK punts dins del tram
  const nouIndex = Math.min(
    estat.indexPunt + PUNTS_PER_TICK,
    estat.ruta.length - 1
  );
  estat.indexPunt = nouIndex;

  const novaPosicio = estat.ruta[nouIndex];
  return { lat: novaPosicio.lat, lon: novaPosicio.lon };
}

/**
 * MOVIMENT EN MODE "DESPLAÇAMENT"
 *
 * La patrulla té una incidència assignada i s'hi dirigeix.
 *
 * Lògica:
 * 1. Si no té ruta calculada → calcular Dijkstra fins a la incidència
 * 2. Avançar PUNTS_PER_TICK punts dins de la ruta
 * 3. Si arriba al final → passar a mode "aturada"
 *
 * @param {Object} estat
 * @param {number} lat
 * @param {number} lon
 * @param {number} latObj - Lat de la incidència
 * @param {number} lonObj - Lon de la incidència
 * @returns {Object|null} { lat, lon } nova posició, o null
 */
function moureDesplacament(estat, lat, lon, latObj, lonObj) {
  // Si no té ruta calculada, calcular-la ara
  if (!estat.ruta) {
    const snapOrigen = snapACarretera(graf, lat, lon);
    const snapDesti = snapACarretera(graf, latObj, lonObj);

    if (!snapOrigen || !snapDesti) {
      console.warn('   ⚠️  No s\'ha pogut fer snap per calcular la ruta');
      return null;
    }

    const rutaCalculada = dijkstra(graf, snapOrigen.nodeId, snapDesti.nodeId);

    if (!rutaCalculada) {
      console.warn('   ⚠️  No s\'ha trobat ruta per carreteres. Usant mode directe.');
      // Fallback: anar en línia recta cap al destí
      // (pot passar si l'incidència és en una zona sense carreteres al graf)
      estat.mode = 'desplacament_directe';
      return null;
    }

    // Guardar la ruta com array d'objectes { lat, lon }
    estat.ruta = rutaCalculada.punts.map(c => ({ lon: c[0], lat: c[1] }));
    estat.indexPunt = 0;

    console.log(`   🗺️  Ruta calculada: ${rutaCalculada.punts.length} punts, ${(rutaCalculada.distanciaTotal / 1000).toFixed(1)} km`);
  }

  // Comprovar si ja hem arribat al destí
  const distanciaAlDesti = distanciaSimple(lat, lon, latObj, lonObj);
  if (distanciaAlDesti < DISTANCIA_ARRIBADA) {
    estat.mode = 'aturada';
    estat.ruta = null;
    console.log(`   🎯 Patrulla ha arribat a la incidència`);
    return { lat, lon }; // Quedar-se quiet
  }

  // Si hem acabat la ruta però no hem "arribat" (pot passar per imprecisions)
  if (estat.indexPunt >= estat.ruta.length - 1) {
    estat.mode = 'aturada';
    estat.ruta = null;
    return { lat, lon };
  }

  // Avançar PUNTS_PER_TICK punts
  const nouIndex = Math.min(
    estat.indexPunt + PUNTS_PER_TICK,
    estat.ruta.length - 1
  );
  estat.indexPunt = nouIndex;

  const novaPosicio = estat.ruta[nouIndex];
  return { lat: novaPosicio.lat, lon: novaPosicio.lon };
}

/**
 * MOVIMENT EN MODE "DESPLAÇAMENT DIRECTE" (fallback)
 *
 * S'usa quan Dijkstra no troba ruta.
 * Mou la patrulla en línia recta cap al destí, com feia el simulador antic.
 */
function moureDesplacamentDirecte(lat, lon, latObj, lonObj) {
  const factor = 0.08;
  return {
    lat: parseFloat((lat + (latObj - lat) * factor).toFixed(6)),
    lon: parseFloat((lon + (lonObj - lon) * factor).toFixed(6))
  };
}

// ==============================================================
// GESTIÓ DEL CANVI D'INCIDÈNCIA
// ==============================================================

/**
 * Comprova si la incidència assignada ha canviat respecte al tick anterior.
 * Si ha canviat, reseteja l'estat per recalcular la ruta.
 *
 * Casos:
 * A) Abans no tenia, ara sí → passar a mode desplaçament
 * B) Abans tenia, ara no → passar a mode patrullatge
 * C) Tenia incidència X, ara té incidència Y → recalcular ruta
 * D) Mateixa incidència → no fer res
 */
function gestionarCanviIncidencia(estat, indicatiu) {
  const incidenciaNova = indicatiu.incidencia_assignada_id || null;
  const incidenciaAnterior = estat.incidenciaActual;

  // Cas D: no ha canviat res
  if (incidenciaNova === incidenciaAnterior) return;

  // Cas B: li han tret la incidència
  if (!incidenciaNova && incidenciaAnterior) {
    console.log(`   🔄 ${indicatiu.codi}: incidència retirada → patrullatge`);
    estat.mode = 'patrullatge';
    estat.incidenciaActual = null;
    estat.ruta = null;
    estat.indexPunt = 0;
    return;
  }

  // Cas A: li han assignat una incidència (no en tenia)
  if (incidenciaNova && !incidenciaAnterior) {
    console.log(`   🔄 ${indicatiu.codi}: nova incidència assignada → desplaçament`);
    estat.mode = 'desplacament';
    estat.incidenciaActual = incidenciaNova;
    estat.ruta = null;  // Forcem càlcul de nova ruta
    estat.indexPunt = 0;
    return;
  }

  // Cas C: li han canviat la incidència
  if (incidenciaNova !== incidenciaAnterior) {
    console.log(`   🔄 ${indicatiu.codi}: canvi d'incidència → nova ruta`);
    estat.mode = 'desplacament';
    estat.incidenciaActual = incidenciaNova;
    estat.ruta = null;  // Forcem càlcul de nova ruta
    estat.indexPunt = 0;
  }
}

// ==============================================================
// OBTENIR DADES DE LA API
// ==============================================================

async function obtenirIndicatius() {
  const res = await axios.get(`${BASE_URL}/api/indicatius`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
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
  try {
    const indicatius = await obtenirIndicatius();

    for (const indicatiu of indicatius) {
      // Validar coordenades
      const latActual = parseFloat(indicatiu.ubicacio_lat);
      const lonActual = parseFloat(indicatiu.ubicacio_lon);

      if (
        isNaN(latActual) || isNaN(lonActual) ||
        latActual < -90 || latActual > 90 ||
        lonActual < -180 || lonActual > 180
      ) {
        console.log(`⚠️  ${indicatiu.codi}: coordenades invàlides, ignorat`);
        continue;
      }

      // Obtenir/crear estat per aquesta patrulla
      const estat = getEstat(indicatiu.id);

      // Gestionar canvis d'incidència
      gestionarCanviIncidencia(estat, indicatiu);

      // Calcular nova posició
      let novaPosicio = null;

      switch (estat.mode) {
        case 'patrullatge':
          novaPosicio = mourePatrullatge(estat, latActual, lonActual);
          break;

        case 'desplacament': {
          const latObj = parseFloat(indicatiu.incidencia_lat);
          const lonObj = parseFloat(indicatiu.incidencia_lon);

          if (isNaN(latObj) || isNaN(lonObj)) {
            console.warn(`   ⚠️  ${indicatiu.codi}: coordenades incidència invàlides`);
            novaPosicio = null;
          } else {
            novaPosicio = moureDesplacament(estat, latActual, lonActual, latObj, lonObj);
          }

          // Fallback si Dijkstra no funciona
          if (!novaPosicio && estat.mode === 'desplacament_directe') {
            const latObj2 = parseFloat(indicatiu.incidencia_lat);
            const lonObj2 = parseFloat(indicatiu.incidencia_lon);
            novaPosicio = moureDesplacamentDirecte(latActual, lonActual, latObj2, lonObj2);
            estat.mode = 'desplacament_directe';
          }
          break;
        }

        case 'desplacament_directe': {
          const latObj = parseFloat(indicatiu.incidencia_lat);
          const lonObj = parseFloat(indicatiu.incidencia_lon);
          novaPosicio = moureDesplacamentDirecte(latActual, lonActual, latObj, lonObj);

          // Comprovar si ha arribat
          if (distanciaSimple(latActual, lonActual, latObj, lonObj) < DISTANCIA_ARRIBADA) {
            estat.mode = 'aturada';
            estat.ruta = null;
          }
          break;
        }

        case 'aturada':
          // No moure's. Mantenir posició actual.
          novaPosicio = { lat: latActual, lon: lonActual };
          break;
      }

      // Si no hem pogut calcular posició, saltar
      if (!novaPosicio) {
        console.log(`⚠️  ${indicatiu.codi}: no s'ha pogut calcular posició`);
        continue;
      }

      // Log
      const iconaMode = {
        patrullatge: '🚔',
        desplacament: '🚨',
        desplacament_directe: '➡️',
        aturada: '🛑'
      }[estat.mode] || '❓';

      console.log(
        `${iconaMode} ${indicatiu.codi.padEnd(10)} ` +
        `[${estat.mode.padEnd(20)}] ` +
        `→ (${novaPosicio.lat.toFixed(5)}, ${novaPosicio.lon.toFixed(5)})`
      );

      // Enviar nova posició
      try {
        await actualitzarGPS(indicatiu.id, novaPosicio.lat, novaPosicio.lon);
      } catch (err) {
        console.error(`❌ Error actualitzant ${indicatiu.codi}:`, err.response?.data || err.message);
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error.response?.data || error.message);
  }
}

// ==============================================================
// ARRANCADA
// ==============================================================

function iniciarSimulador() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  🚔 SIMULADOR DE PATRULLES — Mode Cartogràfic');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Graf: ${graf.stats.totalNodes} nodes, ${graf.stats.totalArestes} arestes`);
  console.log(`  Interval: ${INTERVAL / 1000}s`);
  console.log(`  Punts per tick: ${PUNTS_PER_TICK}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log('  🚔 Patrullatge aleatori per carreteres');
  console.log('  🚨 Desplaçament per carreteres cap a incidència');
  console.log('  🛑 Aturat a la incidència');
  console.log('');

  simularMoviment();
  setInterval(simularMoviment, INTERVAL);
}

iniciarSimulador();