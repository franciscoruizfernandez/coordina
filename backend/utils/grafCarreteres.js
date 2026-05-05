// backend/utils/grafCarreteres.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import distance from '@turf/distance';
import { point as turfPoint } from '@turf/helpers';
import { MinPriorityQueue } from '@datastructures-js/priority-queue';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==============================================================
// CONSTANTS
// ==============================================================

// Tipus de via que volem incloure al graf.
// Excloem 'residential', 'living_street' i 'unclassified'
// perquè generen massa nodes i el graf es fa enorme.
// Amb les carreteres principals ja tenim prou cobertura.
const TIPUS_VIA_PERMESOS = new Set([
  'motorway',
  'motorway_link',
  'trunk',
  'trunk_link',
  'primary',
  'primary_link',
  'secondary',
  'secondary_link',
  'tertiary',
  'tertiary_link'
]);

// ==============================================================
// FUNCIONS AUXILIARS
// ==============================================================

function generarNodeId(lon, lat) {
  return `${lon.toFixed(4)}_${lat.toFixed(4)}`;
}

function distanciaMetres(coord1, coord2) {
  return distance(turfPoint(coord1), turfPoint(coord2), { units: 'meters' });
}

function distanciaTotalTram(coordenades) {
  let total = 0;
  for (let i = 0; i < coordenades.length - 1; i++) {
    total += distanciaMetres(coordenades[i], coordenades[i + 1]);
  }
  return total;
}

// ==============================================================
// CONSTRUCCIÓ DEL GRAF
// ==============================================================

/**
 * Construeix el graf de carreteres.
 * 
 * Canvis respecte la versió anterior:
 * - Filtra per tipus de via (TIPUS_VIA_PERMESOS)
 * - Només inclou carreteres principals, no totes les callecitas
 * - Això redueix nodes de ~58.000 a ~5.000-15.000
 * 
 * @param {string} rutaFitxer
 * @param {Object} opcions
 * @param {boolean} opcions.incloureResidencial - Si true, inclou també 'residential'
 * @returns {Object} { nodes, adjacencia, stats }
 */
export function construirGraf(rutaFitxer, opcions = {}) {
  const rutaCompleta = path.join(__dirname, '..', rutaFitxer);

  if (!fs.existsSync(rutaCompleta)) {
    console.error(`❌ No es troba: ${rutaCompleta}`);
    return null;
  }

  const geojson = JSON.parse(fs.readFileSync(rutaCompleta, 'utf-8'));
  const features = geojson.features;

  const nodes = new Map();
  const adjacencia = new Map();

  let tramsProcessats = 0;
  let tramsFiltrats = 0;
  let tramsIgnorats = 0;

  // Determinar quins tipus acceptem
  const tipusAcceptats = new Set(TIPUS_VIA_PERMESOS);
  if (opcions.incloureResidencial) {
    tipusAcceptats.add('residential');
    tipusAcceptats.add('living_street');
    tipusAcceptats.add('unclassified');
  }

  for (const feature of features) {
    const geometria = feature.geometry;

    if (geometria.type !== 'LineString') {
      tramsIgnorats++;
      continue;
    }

    // --- FILTRE PER TIPUS DE VIA ---
    const fclass = feature.properties?.fclass || feature.properties?.highway || '';
    if (!tipusAcceptats.has(fclass)) {
      tramsFiltrats++;
      continue;
    }

    const coords = geometria.coordinates;

    if (coords.length < 2) {
      tramsIgnorats++;
      continue;
    }

    const primerPunt = coords[0];
    const ultimPunt = coords[coords.length - 1];

    const nodeInici = generarNodeId(primerPunt[0], primerPunt[1]);
    const nodeFinal = generarNodeId(ultimPunt[0], ultimPunt[1]);

    if (nodeInici === nodeFinal) {
      tramsIgnorats++;
      continue;
    }

    // Registrar nodes
    if (!nodes.has(nodeInici)) {
      nodes.set(nodeInici, { id: nodeInici, lon: primerPunt[0], lat: primerPunt[1] });
    }
    if (!nodes.has(nodeFinal)) {
      nodes.set(nodeFinal, { id: nodeFinal, lon: ultimPunt[0], lat: ultimPunt[1] });
    }

    // Calcular distància
    const dist = distanciaTotalTram(coords);

    // Aresta inici → final
    if (!adjacencia.has(nodeInici)) adjacencia.set(nodeInici, []);
    adjacencia.get(nodeInici).push({
      nodeId: nodeFinal,
      distancia: dist,
      puntsIntermedis: coords
    });

    // Aresta final → inici
    if (!adjacencia.has(nodeFinal)) adjacencia.set(nodeFinal, []);
    adjacencia.get(nodeFinal).push({
      nodeId: nodeInici,
      distancia: dist,
      puntsIntermedis: [...coords].reverse()
    });

    tramsProcessats++;
  }

  const stats = {
    tramsProcessats,
    tramsFiltrats,
    tramsIgnorats,
    totalNodes: nodes.size,
    totalArestes: tramsProcessats * 2
  };

  console.log(`📊 Graf construït:`);
  console.log(`   Trams processats: ${stats.tramsProcessats}`);
  console.log(`   Trams filtrats (tipus no permès): ${stats.tramsFiltrats}`);
  console.log(`   Trams ignorats (geometria invàlida): ${stats.tramsIgnorats}`);
  console.log(`   Nodes: ${stats.totalNodes}`);
  console.log(`   Arestes: ${stats.totalArestes}`);

  return { nodes, adjacencia, stats };
}

// ==============================================================
// SNAP TO NEAREST NODE
// ==============================================================

export function trobarNodeMesProper(graf, lat, lon) {
  let millorNode = null;
  let millorDistancia = Infinity;
  const puntOriginal = [lon, lat];

  for (const [nodeId, node] of graf.nodes) {
    const dist = distanciaMetres(puntOriginal, [node.lon, node.lat]);
    if (dist < millorDistancia) {
      millorDistancia = dist;
      millorNode = nodeId;
    }
  }

  if (!millorNode) return null;
  return { nodeId: millorNode, distancia: millorDistancia };
}

// ==============================================================
// DIJKSTRA AMB PRIORITY QUEUE
// ==============================================================

/**
 * Dijkstra optimitzat amb MinPriorityQueue.
 * 
 * Diferència respecte la versió anterior:
 * - Abans: per trobar el node amb menor distància, recorríem TOTS els nodes
 *   → O(N) per cada pas → total O(N²)
 * - Ara: usem un heap que ens dóna el mínim en O(log N)
 *   → total O(N log N)
 * 
 * Amb 58.000 nodes:
 *   Abans: ~14 segons
 *   Ara: ~50-200 ms (60-100x més ràpid)
 * 
 * @param {Object} graf
 * @param {string} nodeIniciId
 * @param {string} nodeFinalId
 * @param {number} maxDistancia - Distància màxima en metres (per evitar càlculs infinits)
 * @returns {Object|null}
 */
export function dijkstra(graf, nodeIniciId, nodeFinalId, maxDistancia = 50000) {
  if (!graf.nodes.has(nodeIniciId) || !graf.nodes.has(nodeFinalId)) {
    return null;
  }

  if (nodeIniciId === nodeFinalId) {
    const node = graf.nodes.get(nodeIniciId);
    return {
      distanciaTotal: 0,
      cami: [nodeIniciId],
      punts: [[node.lon, node.lat]]
    };
  }

  // Distàncies mínimes
  const distancies = new Map();
  distancies.set(nodeIniciId, 0);

  // Per reconstruir el camí
  const previs = new Map();
  const arestesUsades = new Map();

  // Nodes ja processats
  const visitats = new Set();

  // Priority queue: sempre ens dóna el node amb menor distància
  const cua = new MinPriorityQueue((element) => element.distancia);
  cua.enqueue({ nodeId: nodeIniciId, distancia: 0 });

  while (!cua.isEmpty()) {
    // Treure el node amb menor distància
    const { nodeId: nodeActual, distancia: distActual } = cua.dequeue();

    // Si ja l'hem processat, saltar
    if (visitats.has(nodeActual)) continue;

    // Si superem la distància màxima, parar
    if (distActual > maxDistancia) return null;

    // Si hem arribat al destí, reconstruir camí
    if (nodeActual === nodeFinalId) {
      return reconstruirCami(graf, previs, arestesUsades, nodeIniciId, nodeFinalId, distActual);
    }

    // Marcar com visitat
    visitats.add(nodeActual);

    // Explorar veïns
    const veins = graf.adjacencia.get(nodeActual) || [];

    for (const aresta of veins) {
      if (visitats.has(aresta.nodeId)) continue;

      const novaDistancia = distActual + aresta.distancia;

      // Si trobem un camí més curt cap a aquest veí
      const distanciaAnterior = distancies.get(aresta.nodeId) ?? Infinity;

      if (novaDistancia < distanciaAnterior) {
        distancies.set(aresta.nodeId, novaDistancia);
        previs.set(aresta.nodeId, nodeActual);
        arestesUsades.set(aresta.nodeId, aresta);
        cua.enqueue({ nodeId: aresta.nodeId, distancia: novaDistancia });
      }
    }
  }

  // No s'ha trobat camí
  return null;
}

/**
 * Reconstrueix el camí complet amb punts intermedis.
 */
function reconstruirCami(graf, previs, arestesUsades, nodeIniciId, nodeFinalId, distanciaTotal) {
  // Reconstruir seqüència de nodes
  const camiNodes = [];
  let actual = nodeFinalId;

  while (actual !== undefined) {
    camiNodes.unshift(actual);
    actual = previs.get(actual);
  }

  // Construir llista completa de punts
  const puntsComplets = [];

  for (let i = 0; i < camiNodes.length - 1; i++) {
    const aresta = arestesUsades.get(camiNodes[i + 1]);

    if (aresta && aresta.puntsIntermedis) {
      if (i === 0) {
        puntsComplets.push(...aresta.puntsIntermedis);
      } else {
        puntsComplets.push(...aresta.puntsIntermedis.slice(1));
      }
    }
  }

  // Fallback: si no hi ha punts intermedis, usar coordenades dels nodes
  if (puntsComplets.length === 0) {
    for (const nodeId of camiNodes) {
      const node = graf.nodes.get(nodeId);
      if (node) puntsComplets.push([node.lon, node.lat]);
    }
  }

  return {
    distanciaTotal,
    cami: camiNodes,
    punts: puntsComplets
  };
}

// ==============================================================
// FUNCIONS DE SUPORT PER AL SIMULADOR
// ==============================================================

export function snapACarretera(graf, lat, lon) {
  const resultat = trobarNodeMesProper(graf, lat, lon);
  if (!resultat) return null;

  const node = graf.nodes.get(resultat.nodeId);

  return {
    nodeId: resultat.nodeId,
    lat: node.lat,
    lon: node.lon,
    distanciaAlNode: resultat.distancia
  };
}

export function veiAleatori(graf, nodeId) {
  const veins = graf.adjacencia.get(nodeId);
  if (!veins || veins.length === 0) return null;

  const aresta = veins[Math.floor(Math.random() * veins.length)];

  return {
    nodeId: aresta.nodeId,
    puntsIntermedis: aresta.puntsIntermedis
  };
}