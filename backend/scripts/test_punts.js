// backend/scripts/test_punts.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import bbox from '@turf/bbox';
import { point as turfPoint } from '@turf/helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Carregar municipis
const rutaFitxer = path.join(__dirname, '..', 'data', 'municipis.geojson');
const geojson = JSON.parse(fs.readFileSync(rutaFitxer, 'utf-8'));

console.log(`🗺️  Carregats ${geojson.features.length} municipis`);

// 2. Funció per generar un punt dins d'un polígon
//
// Com funciona:
//   a) Agafa el bounding box del polígon (el rectangle mínim que el conté)
//   b) Genera un punt aleatori dins d'aquest rectangle
//   c) Comprova si el punt cau dins del polígon real
//   d) Si NO → repeteix (màxim 100 intents)
//   e) Si SÍ → retorna el punt
//
// Per què funciona bé?
//   Els municipis són formes bastant "compactes"
//   Així que normalment encerta en 1-5 intents

function generarPuntDinsMunicipi(feature) {
  const MAX_INTENTS = 100;

  // bbox retorna [minLon, minLat, maxLon, maxLat]
  const [minLon, minLat, maxLon, maxLat] = bbox(feature);

  for (let i = 0; i < MAX_INTENTS; i++) {
    // Generar punt aleatori dins del rectangle
    const lon = Math.random() * (maxLon - minLon) + minLon;
    const lat = Math.random() * (maxLat - minLat) + minLat;

    // Crear un punt GeoJSON
    const punt = turfPoint([lon, lat]);

    // Comprovar si cau dins del polígon
    if (booleanPointInPolygon(punt, feature)) {
      return { lat, lon, intents: i + 1 };
    }
  }

  // Si no trobem cap punt (molt rar), retornem el centre
  const centreLat = (minLat + maxLat) / 2;
  const centreLon = (minLon + maxLon) / 2;
  return { lat: centreLat, lon: centreLon, intents: MAX_INTENTS };
}

// 3. Provar: generar 1 punt per cada municipi
console.log('');
console.log('Generant 1 punt per municipi...');
console.log('');

geojson.features.forEach(feature => {
  const nom = feature.properties.NOMMUNI;
  const resultat = generarPuntDinsMunicipi(feature);

  console.log(
    `   ✓ ${nom.padEnd(35)} → ` +
    `lat=${resultat.lat.toFixed(6)}, lon=${resultat.lon.toFixed(6)} ` +
    `(${resultat.intents} intents)`
  );
});

// 4. Generar un fitxer per visualitzar
console.log('');
console.log('Generant fitxer de visualització...');

const puntsPerVisualitzar = [];

for (let i = 0; i < 200; i++) {
  // Escollir municipi aleatori
  const index = Math.floor(Math.random() * geojson.features.length);
  const feature = geojson.features[index];
  const nom = feature.properties.NOMMUNI;

  // Generar punt
  const resultat = generarPuntDinsMunicipi(feature);

  puntsPerVisualitzar.push({
    type: 'Feature',
    properties: {
      id: i,
      municipi: nom
    },
    geometry: {
      type: 'Point',
      coordinates: [resultat.lon, resultat.lat]
    }
  });
}

const sortida = {
  type: 'FeatureCollection',
  features: puntsPerVisualitzar
};

const rutaSortida = path.join(__dirname, '..', 'data', 'test_punts.geojson');
fs.writeFileSync(rutaSortida, JSON.stringify(sortida, null, 2));

console.log(`✅ Generat: ${rutaSortida}`);
console.log('');
console.log('   Obre aquest fitxer a https://geojson.io per verificar');
console.log('   que tots els punts cauen dins dels municipis');
console.log('   i CAP cau al mar');