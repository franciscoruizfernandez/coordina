// backend/scripts/simulador112.js
// Versió 3.0 — Georrealista (municipis + urbà + carreteres)

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

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const INTERVAL_MIN = 10 * 1000;
const INTERVAL_MAX = 15 * 1000;
const TOKEN_112 = process.env.TOKEN_112;

// ==============================================================
// TIPOLOGIES
// ==============================================================

const TIPOLOGIES = [
  {
    tipus: 'robatori',
    zona: 'urba',           // ← ARA busca zona urbana
    prioritats: ['alta', 'mitjana'],
    descripcio: 'Robo en establecimiento comercial'
  },
  {
    tipus: 'accident',
    zona: 'carretera',       // ← ARA busca carretera
    prioritats: ['critica', 'alta', 'mitjana'],
    descripcio: 'Accidente de tráfico con posibles heridos'
  },
  {
    tipus: 'altercat',
    zona: 'urba',           // ← ARA busca zona urbana
    prioritats: ['alta', 'mitjana', 'baixa'],
    descripcio: 'Altercado entre varias personas en vía pública'
  },
  {
    tipus: 'incendi',
    zona: 'municipi',        // ← Qualsevol lloc dins el municipi
    prioritats: ['critica', 'alta'],
    descripcio: 'Incendio reportado por vecinos'
  },
  {
    tipus: 'drogues',
    zona: 'urba',           // ← ARA busca zona urbana
    prioritats: ['mitjana', 'baixa'],
    descripcio: 'Actividad sospechosa de tráfico de drogas'
  }
];

// ==============================================================
// CÀRREGA DE GEODADES
// ==============================================================

function carregarGeoJSON(nomFitxer) {
  const ruta = path.join(__dirname, '..', 'data', nomFitxer);

  if (!fs.existsSync(ruta)) {
    return null;
  }

  const contingut = fs.readFileSync(ruta, 'utf-8');
  return JSON.parse(contingut);
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

if (zonesUrbanesGeoJSON && zonesUrbanesGeoJSON.features?.length) {
  zonesUrbanesAmbBBox = zonesUrbanesGeoJSON.features.map(f => ({
    feature: f,
    bbox: bbox(f)
  }));
}

// --- Carreteres (OPCIONAL) ---
const carreteresGeoJSON = carregarGeoJSON('carreteres.geojson');

// ==============================================================
// FUNCIONS DE GENERACIÓ DE PUNTS
// ==============================================================

/**
 * FUNCIÓ 1: Punt dins d'un polígon (rejection sampling)
 *
 * S'usa per:
 * - Generar punts dins de municipis
 * - Generar punts dins de zones urbanes
 */
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

  // Fallback
  return {
    ubicacio_lat: parseFloat(((minLat + maxLat) / 2).toFixed(6)),
    ubicacio_lon: parseFloat(((minLon + maxLon) / 2).toFixed(6))
  };
}

/**
 * FUNCIÓ 2: Punt dins de zona urbana (dins d'un municipi concret)
 *
 * Com funciona:
 * 1. Busca zones urbanes que es solapin amb el bbox del municipi
 *    (comprovació ràpida rectangle-rectangle)
 * 2. Escull una zona al azar
 * 3. Genera un punt dins d'aquella zona
 *
 * Si no hi ha zones urbanes → retorna null (i el simulador farà fallback)
 */
function puntEnZonaUrbana(municipiBBox) {
  if (zonesUrbanesAmbBBox.length === 0) return null;

  const [mMinLon, mMinLat, mMaxLon, mMaxLat] = municipiBBox;

  // Buscar zones urbanes que es solapin amb el municipi
  // Comprovem si els dos rectangles (bbox) s'intersequen
  const candidates = zonesUrbanesAmbBBox.filter(z => {
    const [zMinLon, zMinLat, zMaxLon, zMaxLat] = z.bbox;

    // Dos rectangles NO es solapin si:
    // un està completament a la dreta, esquerra, dalt o baix de l'altre
    const noSolapa = (
      zMaxLon < mMinLon ||  // zona està a l'esquerra
      zMinLon > mMaxLon ||  // zona està a la dreta
      zMaxLat < mMinLat ||  // zona està a sota
      zMinLat > mMaxLat     // zona està a dalt
    );

    return !noSolapa;
  });

  if (candidates.length === 0) return null;

  // Escollir una zona al azar i generar punt dins
  const zonaEscollida = candidates[Math.floor(Math.random() * candidates.length)];
  return puntDinsPoligon(zonaEscollida.feature, zonaEscollida.bbox);
}

/**
 * FUNCIÓ 3: Punt sobre una carretera (dins d'un municipi concret)
 *
 * Com funciona:
 * 1. Busca trams de carretera dins del bbox del municipi
 * 2. Escull un tram al azar
 * 3. Calcula la longitud del tram
 * 4. Escull una distància aleatòria al llarg del tram
 * 5. Calcula el punt a aquella distància (amb Turf along)
 * 6. Afegeix un petit desplaçament lateral (perquè no tots
 *    caiguin exactament sobre la línia)
 *
 * Si no hi ha carreteres → retorna null (fallback)
 */
function puntEnCarretera(municipiBBox) {
  if (!carreteresGeoJSON || !carreteresGeoJSON.features?.length) return null;

  const [mMinLon, mMinLat, mMaxLon, mMaxLat] = municipiBBox;

  // Buscar trams dins del municipi
  const trams = carreteresGeoJSON.features.filter(f => {
    const fBBox = bbox(f);
    const [fMinLon, fMinLat, fMaxLon, fMaxLat] = fBBox;

    const noSolapa = (
      fMaxLon < mMinLon ||
      fMinLon > mMaxLon ||
      fMaxLat < mMinLat ||
      fMinLat > mMaxLat
    );

    return !noSolapa;
  });

  if (trams.length === 0) return null;

  // Intentar generar punt (alguns trams poden ser molt curts)
  for (let intent = 0; intent < 10; intent++) {
    try {
      // Escollir tram aleatori
      const tram = trams[Math.floor(Math.random() * trams.length)];

      // Calcular longitud del tram en km
      const longitud = length(tram, { units: 'kilometers' });

      // Si el tram és molt curt, provar un altre
      if (longitud <= 0.01) continue;

      // Escollir distància aleatòria
      const distancia = Math.random() * longitud;

      // Calcular el punt a aquella distància
      const punt = along(tram, distancia, { units: 'kilometers' });
      const [lon, lat] = punt.geometry.coordinates;

      // Afegir desplaçament lateral aleatori
      // ±0.0003 graus ≈ ±30 metres
      // Això simula que l'accident no és exactament al centre de la via
      const offsetLat = (Math.random() - 0.5) * 0.0006;
      const offsetLon = (Math.random() - 0.5) * 0.0006;

      return {
        ubicacio_lat: parseFloat((lat + offsetLat).toFixed(6)),
        ubicacio_lon: parseFloat((lon + offsetLon).toFixed(6))
      };
    } catch (e) {
      // Si un tram dóna error (geometria invàlida), provar un altre
      continue;
    }
  }

  return null;
}

// ==============================================================
// GENERACIÓ D'INCIDÈNCIA
// ==============================================================

function generarIncidencia() {
  // 1. Tipologia
  const tipologia = TIPOLOGIES[Math.floor(Math.random() * TIPOLOGIES.length)];

  // 2. Prioritat
  const prioritat = tipologia.prioritats[
    Math.floor(Math.random() * tipologia.prioritats.length)
  ];

  // 3. Municipi
  const municipi = municipisAmbBBox[
    Math.floor(Math.random() * municipisAmbBBox.length)
  ];

  // 4. Coordenades segons el tipus de zona
  let coords = null;
  let fontCoords = 'municipi'; // Per logging: d'on ve el punt

  switch (tipologia.zona) {
    case 'urba':
      coords = puntEnZonaUrbana(municipi.bbox);
      if (coords) {
        fontCoords = 'zona urbana';
      } else {
        // Fallback: si no hi ha dades urbanes, punt dins del municipi
        coords = puntDinsPoligon(municipi.feature, municipi.bbox);
        fontCoords = 'municipi (fallback)';
      }
      break;

    case 'carretera':
      coords = puntEnCarretera(municipi.bbox);
      if (coords) {
        fontCoords = 'carretera';
      } else {
        // Fallback
        coords = puntDinsPoligon(municipi.feature, municipi.bbox);
        fontCoords = 'municipi (fallback)';
      }
      break;

    case 'municipi':
    default:
      coords = puntDinsPoligon(municipi.feature, municipi.bbox);
      fontCoords = 'municipi';
      break;
  }

  return {
    ...coords,
    tipologia: tipologia.tipus,
    prioritat,
    descripcio: tipologia.descripcio,
    direccio: `${municipi.nom} - Zona simulada`,
    observacions: `Simulador 112 | ${municipi.nom} | Font: ${fontCoords}`,
    // Metadades internes (per debugging)
    _debug: {
      municipi: municipi.nom,
      fontCoords
    }
  };
}

// ==============================================================
// ENVIAR INCIDÈNCIA
// ==============================================================

async function enviarIncidencia() {
  try {
    const incidencia = generarIncidencia();
    const debug = incidencia._debug;

    // Eliminar metadades internes abans d'enviar
    delete incidencia._debug;

    console.log(
      `🚨 [${incidencia.tipologia.toUpperCase().padEnd(9)}] ` +
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
          Authorization: `Bearer ${TOKEN_112}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`   ✅ ID: ${response.data.dades.id}`);
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
  console.log('  📡 SIMULADOR 112 — Mode Georrealista v3.0');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  🗺️  Municipis:      ${municipisAmbBBox.length}`);
  console.log(`  🏘️  Zones urbanes:  ${zonesUrbanesAmbBBox.length || 'NO (fallback a municipi)'}`);
  console.log(`  🛣️  Carreteres:     ${carreteresGeoJSON?.features?.length || 'NO (fallback a municipi)'}`);
  console.log(`  ⏱️  Interval:       ${INTERVAL_MIN/1000}s - ${INTERVAL_MAX/1000}s`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log('  💡 Si no tens zones_urbanes.geojson o carreteres.geojson,');
  console.log('     el simulador funciona igualment (tots els punts');
  console.log('     cauen dins del municipi).');
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