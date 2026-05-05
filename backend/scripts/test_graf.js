// backend/scripts/test_graf.js

import { construirGraf, snapACarretera, dijkstra, veiAleatori } from '../utils/grafCarreteres.js';

console.log('🔧 Test del graf de carreteres (v2 optimitzat)');
console.log('');

// 1. Construir el graf (SENSE residential)
console.log('1. Construint graf (només carreteres principals)...');
console.log('');
const graf = construirGraf('data/carreteres.geojson');

if (!graf) {
  console.error('❌ No s\'ha pogut construir el graf');
  process.exit(1);
}

console.log('');

// 2. Snap
console.log('2. Provant snap a carretera...');
const testLat = 41.6083;
const testLon = 2.2876;
const snap = snapACarretera(graf, testLat, testLon);
console.log(`   Punt original: (${testLat}, ${testLon})`);

if (snap) {
  console.log(`   Node més proper: ${snap.nodeId}`);
  console.log(`   Coordenades: (${snap.lat.toFixed(6)}, ${snap.lon.toFixed(6)})`);
  console.log(`   Distància: ${snap.distanciaAlNode.toFixed(0)} metres`);
} else {
  console.log('   ❌ No s\'ha trobat cap node proper');
}

console.log('');

// 3. Veí aleatori
console.log('3. Provant veí aleatori...');
if (snap) {
  for (let i = 0; i < 3; i++) {
    const vei = veiAleatori(graf, snap.nodeId);
    if (vei) {
      const nodeVei = graf.nodes.get(vei.nodeId);
      console.log(`   Intent ${i + 1}: → ${vei.nodeId} (${vei.puntsIntermedis.length} punts)`);
    }
  }
}

console.log('');

// 4. Dijkstra
console.log('4. Provant Dijkstra (ruta Granollers → Mollet)...');

const snapOrigen = snapACarretera(graf, 41.6083, 2.2876);
const snapDesti = snapACarretera(graf, 41.5549, 2.2065);

if (snapOrigen && snapDesti) {
  console.log(`   Origen: ${snapOrigen.nodeId}`);
  console.log(`   Destí:  ${snapDesti.nodeId}`);

  const inici = Date.now();
  const ruta = dijkstra(graf, snapOrigen.nodeId, snapDesti.nodeId);
  const temps = Date.now() - inici;

  if (ruta) {
    console.log(`   ✅ Ruta trobada!`);
    console.log(`   Distància: ${(ruta.distanciaTotal / 1000).toFixed(2)} km`);
    console.log(`   Nodes: ${ruta.cami.length}`);
    console.log(`   Punts moviment: ${ruta.punts.length}`);
    console.log(`   ⏱️  Temps: ${temps} ms`);
  } else {
    console.log(`   ❌ No s'ha trobat ruta`);
  }
}

console.log('');

// 5. Segon test Dijkstra (més llarg)
console.log('5. Provant Dijkstra (ruta Sabadell → Mataró)...');

const snapSabadell = snapACarretera(graf, 41.5463, 2.1079);
const snapMataro = snapACarretera(graf, 41.5404, 2.4445);

if (snapSabadell && snapMataro) {
  console.log(`   Origen: ${snapSabadell.nodeId}`);
  console.log(`   Destí:  ${snapMataro.nodeId}`);

  const inici = Date.now();
  const ruta = dijkstra(graf, snapSabadell.nodeId, snapMataro.nodeId);
  const temps = Date.now() - inici;

  if (ruta) {
    console.log(`   ✅ Ruta trobada!`);
    console.log(`   Distància: ${(ruta.distanciaTotal / 1000).toFixed(2)} km`);
    console.log(`   Nodes: ${ruta.cami.length}`);
    console.log(`   Punts moviment: ${ruta.punts.length}`);
    console.log(`   ⏱️  Temps: ${temps} ms`);
  } else {
    console.log(`   ❌ No s'ha trobat ruta (pot ser graf desconnectat)`);
  }
}

console.log('');
console.log('✅ Test completat');