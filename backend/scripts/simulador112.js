// backend/scripts/simulador112.js
// Versió 4.0 — Georrealista + Deduplicació d'avisos 112

import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import bbox from '@turf/bbox';
import { point as turfPoint } from '@turf/helpers';
import along from '@turf/along';
import length from '@turf/length';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==============================================================
// CONFIGURACIÓ
// ==============================================================

const BASE_URL    = process.env.BASE_URL || 'http://localhost:3000';
const INTERVAL_MIN = 10 * 1000;
const INTERVAL_MAX = 15 * 1000;
const TOKEN_112   = process.env.TOKEN_112;

// Probabilitat (0-1) que un cicle enviï un avís duplicat
// en comptes d'una incidència nova
const PROBABILITAT_DUPLICAT = 0.20;

// Rang de repeticions quan es replica una incidència semilla
const REPETICIONS_MIN = 1;
const REPETICIONS_MAX = 3;

// Desplaçament màxim en graus per als duplicats
// ±0.0009 graus ≈ ±100 metres
const OFFSET_MAX_GRAUS = 0.0009;

// ==============================================================
// TIPOLOGIES
// ==============================================================

const TIPOLOGIES = [
  {
    tipus: 'robatori',
    zona: 'urba',
    prioritats: ['alta', 'mitjana'],
    descripcio: 'Robo en establecimiento comercial'
  },
  {
    tipus: 'accident',
    zona: 'carretera',
    prioritats: ['critica', 'alta', 'mitjana'],
    descripcio: 'Accidente de tráfico con posibles heridos'
  },
  {
    tipus: 'altercat',
    zona: 'urba',
    prioritats: ['alta', 'mitjana', 'baixa'],
    descripcio: 'Altercado entre varias personas en vía pública'
  },
  {
    tipus: 'incendi',
    zona: 'municipi',
    prioritats: ['critica', 'alta'],
    descripcio: 'Incendio reportado por vecinos'
  },
  {
    tipus: 'drogues',
    zona: 'urba',
    prioritats: ['mitjana', 'baixa'],
    descripcio: 'Actividad sospechosa de tráfico de drogas'
  }
];

// ==============================================================
// CÀRREGA DE GEODADES
// ==============================================================

function carregarGeoJSON(nomFitxer) {
  const ruta = path.join(__dirname, '..', 'data', nomFitxer);
  if (!fs.existsSync(ruta)) return null;
  return JSON.parse(fs.readFileSync(ruta, 'utf-8'));
}

// --- Municipis (OBLIGATORI) ---
const municipisGeoJSON = carregarGeoJSON('municipis.geojson');

if (!municipisGeoJSON || !municipisGeoJSON.features?.length) {
  console.error('❌ No s\'han pogut carregar els municipis.');
  process.exit(1);
}

const municipisAmbBBox = municipisGeoJSON.features.map(f => ({
  feature: f,
  nom: f.properties.NOMMUNI,
  codi: f.properties.CODIMUNI,
  bbox: bbox(f)
}));

// --- Zones urbanes (OPCIONAL) ---
const zonesUrbanesGeoJSON = carregarGeoJSON('zones_urbanes.geojson');
let zonesUrbanesAmbBBox = [];

if (zonesUrbanesGeoJSON?.features?.length) {
  zonesUrbanesAmbBBox = zonesUrbanesGeoJSON.features.map(f => ({
    feature: f,
    bbox: bbox(f)
  }));
}

// --- Carreteres (OPCIONAL) ---
const carreteresGeoJSON = carregarGeoJSON('carreteres.geojson');

// ==============================================================
// ESTAT DE DEDUPLICACIÓ (EN MEMÒRIA)
// Guarda la darrera incidència creada com a "semilla"
// per poder-la reenviar lleugerament desplaçada
// ==============================================================

// { incidencia: Object | null, repeticionsPendents: number }
const estatDedup = {
  semilla:              null,
  repeticionsPendents:  0,
};

// ==============================================================
// FUNCIONS DE GENERACIÓ DE PUNTS (idèntiques a v3.0)
// ==============================================================

function puntDinsPoligon(feature, featureBBox) {
  const MAX_INTENTS = 100;
  const [minLon, minLat, maxLon, maxLat] = featureBBox;

  for (let i = 0; i < MAX_INTENTS; i++) {
    const lon = Math.random() * (maxLon - minLon) + minLon;
    const lat = Math.random() * (maxLat - minLat) + minLat;

    if (booleanPointInPolygon(turfPoint([lon, lat]), feature)) {
      return {
        ubicacio_lat: parseFloat(lat.toFixed(6)),
        ubicacio_lon: parseFloat(lon.toFixed(6))
      };
    }
  }

  return {
    ubicacio_lat: parseFloat(((minLat + maxLat) / 2).toFixed(6)),
    ubicacio_lon: parseFloat(((minLon + maxLon) / 2).toFixed(6))
  };
}

function puntEnZonaUrbana(municipiBBox) {
  if (zonesUrbanesAmbBBox.length === 0) return null;

  const [mMinLon, mMinLat, mMaxLon, mMaxLat] = municipiBBox;

  const candidates = zonesUrbanesAmbBBox.filter(z => {
    const [zMinLon, zMinLat, zMaxLon, zMaxLat] = z.bbox;
    return !(
      zMaxLon < mMinLon || zMinLon > mMaxLon ||
      zMaxLat < mMinLat || zMinLat > mMaxLat
    );
  });

  if (candidates.length === 0) return null;

  const zonaEscollida = candidates[Math.floor(Math.random() * candidates.length)];
  return puntDinsPoligon(zonaEscollida.feature, zonaEscollida.bbox);
}

function puntEnCarretera(municipiBBox) {
  if (!carreteresGeoJSON?.features?.length) return null;

  const [mMinLon, mMinLat, mMaxLon, mMaxLat] = municipiBBox;

  const trams = carreteresGeoJSON.features.filter(f => {
    const fBBox = bbox(f);
    const [fMinLon, fMinLat, fMaxLon, fMaxLat] = fBBox;
    return !(
      fMaxLon < mMinLon || fMinLon > mMaxLon ||
      fMaxLat < mMinLat || fMinLat > mMaxLat
    );
  });

  if (trams.length === 0) return null;

  for (let intent = 0; intent < 10; intent++) {
    try {
      const tram     = trams[Math.floor(Math.random() * trams.length)];
      const longitud = length(tram, { units: 'kilometers' });

      if (longitud <= 0.01) continue;

      const distancia  = Math.random() * longitud;
      const punt       = along(tram, distancia, { units: 'kilometers' });
      const [lon, lat] = punt.geometry.coordinates;

      return {
        ubicacio_lat: parseFloat((lat + (Math.random() - 0.5) * 0.0006).toFixed(6)),
        ubicacio_lon: parseFloat((lon + (Math.random() - 0.5) * 0.0006).toFixed(6))
      };
    } catch {
      continue;
    }
  }

  return null;
}

// ==============================================================
// GENERACIÓ D'INCIDÈNCIA NOVA
// ==============================================================

function generarIncidenciaNova() {
  const tipologia = TIPOLOGIES[Math.floor(Math.random() * TIPOLOGIES.length)];
  const prioritat = tipologia.prioritats[Math.floor(Math.random() * tipologia.prioritats.length)];
  const municipi  = municipisAmbBBox[Math.floor(Math.random() * municipisAmbBBox.length)];

  let coords     = null;
  let fontCoords = 'municipi';

  switch (tipologia.zona) {
    case 'urba':
      coords = puntEnZonaUrbana(municipi.bbox);
      fontCoords = coords ? 'zona urbana' : 'municipi (fallback)';
      if (!coords) coords = puntDinsPoligon(municipi.feature, municipi.bbox);
      break;

    case 'carretera':
      coords = puntEnCarretera(municipi.bbox);
      fontCoords = coords ? 'carretera' : 'municipi (fallback)';
      if (!coords) coords = puntDinsPoligon(municipi.feature, municipi.bbox);
      break;

    default:
      coords     = puntDinsPoligon(municipi.feature, municipi.bbox);
      fontCoords = 'municipi';
      break;
  }

  return {
    ...coords,
    tipologia:    tipologia.tipus,
    prioritat,
    descripcio:   tipologia.descripcio,
    direccio:     `${municipi.nom} - Zona simulada`,
    observacions: `Simulador 112 | ${municipi.nom} | Font: ${fontCoords}`,
    _debug: { municipi: municipi.nom, fontCoords }
  };
}

// ==============================================================
// GENERACIÓ D'AVÍS DUPLICAT A PARTIR DE LA SEMILLA
// Desplaça lleugerament les coordenades originals
// ==============================================================

function generarAvisDuplicat(semilla) {
  const offsetLat = (Math.random() - 0.5) * 2 * OFFSET_MAX_GRAUS;
  const offsetLon = (Math.random() - 0.5) * 2 * OFFSET_MAX_GRAUS;

  return {
    ubicacio_lat: parseFloat((semilla.ubicacio_lat + offsetLat).toFixed(6)),
    ubicacio_lon: parseFloat((semilla.ubicacio_lon + offsetLon).toFixed(6)),
    tipologia:    semilla.tipologia,
    prioritat:    semilla.prioritat,
    descripcio:   semilla.descripcio,
    direccio:     semilla.direccio,
    observacions: `${semilla.observacions} | Avis duplicat (simulador)`,
    _debug: {
      municipi:   semilla._debug?.municipi  ?? '—',
      fontCoords: 'duplicat',
    }
  };
}

// ==============================================================
// ENVIAR INCIDÈNCIA (nova o duplicat)
// ==============================================================

async function enviarIncidencia() {
  try {
    let incidencia;
    let esDuplicat = false;

    // Decidir si enviar un duplicat o una incidència nova
    if (
      estatDedup.semilla !== null &&
      estatDedup.repeticionsPendents > 0
    ) {
      // Toca enviar un avís duplicat de la semilla
      incidencia = generarAvisDuplicat(estatDedup.semilla);
      esDuplicat = true;
      estatDedup.repeticionsPendents--;

      // Si ja no queden repeticions, esborrar la semilla
      if (estatDedup.repeticionsPendents === 0) {
        estatDedup.semilla = null;
      }
    } else {
      // Incidència nova
      incidencia = generarIncidenciaNova();
      esDuplicat = false;
    }

    const debug = incidencia._debug;
    delete incidencia._debug;

    // Log de l'enviament
    const prefix = esDuplicat ? '🔄 [DUPLICAT  ]' : '🚨 [NOU       ]';
    console.log(
      `${prefix} [${incidencia.tipologia.toUpperCase().padEnd(9)}] ` +
      `${incidencia.direccio.padEnd(40)} ` +
      `(${incidencia.ubicacio_lat}, ${incidencia.ubicacio_lon}) ` +
      `[${incidencia.prioritat}] ` +
      `← ${debug.fontCoords}`
    );

    const response = await axios.post(
      `${BASE_URL}/api/incidencies`,
      incidencia,
      {
        headers: {
          Authorization:  `Bearer ${TOKEN_112}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const { unificat, dades } = response.data;

    if (unificat) {
      // El backend ha detectat el duplicat i l'ha unificat
      console.log(
        `   🔗 Unificat → ID: ${dades.id} ` +
        `(${dades.num_avisos_112} avisos rebuts)`
      );
    } else {
      // Incidència nova creada
      const novaId = dades.id;
      console.log(`   ✅ ID: ${novaId}`);

      // Decidir aleatòriament si aquesta incidència es converteix en semilla
      // Per evitar que una semilla es creï just quan n'hi ha una activa,
      // es comprova que la cua estigui buida
      if (
        !esDuplicat &&
        estatDedup.semilla === null &&
        Math.random() < PROBABILITAT_DUPLICAT
      ) {
        // Guardar com a semilla per a futures repeticions
        estatDedup.semilla = {
          ...incidencia,
          _debug: debug, // recuperem debug per al generarAvisDuplicat
        };
        estatDedup.repeticionsPendents =
          REPETICIONS_MIN +
          Math.floor(Math.random() * (REPETICIONS_MAX - REPETICIONS_MIN + 1));

        console.log(
          `   📌 Semilla guardada → ` +
          `${estatDedup.repeticionsPendents} avís/os duplicat/s programat/s`
        );
      }
    }

  } catch (error) {
    console.error('   ❌ Error:', error.response?.data || error.message);
  }
}

// ==============================================================
// ARRANCADA
// ==============================================================

function iniciarSimulador() {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  📡 SIMULADOR 112 — Mode Georrealista v4.0');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  🗺️  Municipis:      ${municipisAmbBBox.length}`);
  console.log(`  🏘️  Zones urbanes:  ${zonesUrbanesAmbBBox.length || 'NO (fallback a municipi)'}`);
  console.log(`  🛣️  Carreteres:     ${carreteresGeoJSON?.features?.length || 'NO (fallback a municipi)'}`);
  console.log(`  ⏱️  Interval:       ${INTERVAL_MIN/1000}s - ${INTERVAL_MAX/1000}s`);
  console.log(`  🔄 P(duplicat):    ${(PROBABILITAT_DUPLICAT * 100).toFixed(0)}%`);
  console.log(`  🔁 Repeticions:    ${REPETICIONS_MIN}–${REPETICIONS_MAX} per semilla`);
  console.log(`  📍 Offset màx:     ±${(OFFSET_MAX_GRAUS * 111000).toFixed(0)} m`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log('  🚨 [NOU]       Nova incidència creada');
  console.log('  🔄 [DUPLICAT]  Avís duplicat enviat al backend');
  console.log('  🔗 Unificat    Backend ha detectat duplicat i unificat');
  console.log('  📌 Semilla     Incidència guardada per a futures repeticions');
  console.log('');

  enviarIncidencia();

  function programarSeguent() {
    const delay = Math.random() * (INTERVAL_MAX - INTERVAL_MIN) + INTERVAL_MIN;
    setTimeout(async () => {
      await enviarIncidencia();
      programarSeguent();
    }, delay);
  }

  programarSeguent();
}

iniciarSimulador();