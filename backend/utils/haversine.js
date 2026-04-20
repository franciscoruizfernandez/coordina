// backend/utils/haversine.js

// ==============================================================
// FÓRMULA DE HAVERSINE
// Calcula la distància en kilòmetres entre dos punts GPS
// ==============================================================

const RADI_TERRA_KM = 6371;

/**
 * Converteix graus a radians
 */
const grausARadians = (graus) => graus * (Math.PI / 180);

/**
 * Calcula la distància entre dos punts GPS usant Haversine
 * @param {number} lat1 - Latitud del punt 1
 * @param {number} lon1 - Longitud del punt 1
 * @param {number} lat2 - Latitud del punt 2
 * @param {number} lon2 - Longitud del punt 2
 * @returns {number} Distància en kilòmetres (arrodonida a 2 decimals)
 */
export const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const dLat = grausARadians(lat2 - lat1);
  const dLon = grausARadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(grausARadians(lat1)) *
      Math.cos(grausARadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distancia = RADI_TERRA_KM * c;

  return Math.round(distancia * 100) / 100;
};

/**
 * Troba l'indicatiu disponible més proper a una coordenada
 * @param {number} lat - Latitud de la incidència
 * @param {number} lon - Longitud de la incidència
 * @param {Array}  indicatius - Llista d'indicatius disponibles amb lat/lon
 * @returns {Object|null} L'indicatiu més proper o null si no n'hi ha
 */
export const trobarMesProper = (lat, lon, indicatius) => {
  if (!indicatius || indicatius.length === 0) return null;

  // Filtrar els que tenen coordenades vàlides
  const ambUbicacio = indicatius.filter(
    (i) => i.ubicacio_lat !== null && i.ubicacio_lon !== null
  );

  if (ambUbicacio.length === 0) return null;

  // Calcular distància de cada indicatiu i ordenar
  const ambDistancia = ambUbicacio.map((indicatiu) => ({
    ...indicatiu,
    distancia_km: calcularDistancia(
      lat,
      lon,
      parseFloat(indicatiu.ubicacio_lat),
      parseFloat(indicatiu.ubicacio_lon)
    ),
  }));

  // Ordenar per distància ascendent i retornar el primer
  ambDistancia.sort((a, b) => a.distancia_km - b.distancia_km);

  return ambDistancia[0];
};