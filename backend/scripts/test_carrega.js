// backend/scripts/test_carrega.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta al GeoJSON
const rutaFitxer = path.join(__dirname, '..', 'data', 'municipis.geojson');

// Comprovar que existeix
if (!fs.existsSync(rutaFitxer)) {
  console.error('❌ No es troba el fitxer:', rutaFitxer);
  process.exit(1);
}

// Llegir i parsejar
const contingut = fs.readFileSync(rutaFitxer, 'utf-8');
const geojson = JSON.parse(contingut);

// Mostrar resum
console.log('✅ Fitxer carregat correctament');
console.log(`   Total municipis: ${geojson.features.length}`);
console.log('');

// Llistar tots els municipis
geojson.features.forEach((feature, index) => {
  const nom = feature.properties.NOMMUNI;
  const codi = feature.properties.CODIMUNI;
  const tipus = feature.geometry.type; // Polygon o MultiPolygon

  console.log(`   ${index + 1}. [${codi}] ${nom} (${tipus})`);
});