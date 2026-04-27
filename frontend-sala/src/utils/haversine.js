// src/utils/haversine.js
// Càlcul de distància entre dos punts GPS (fórmula de Haversine)
// Retorna la distància en quilòmetres

const RADI_TERRA_KM = 6371;

/**
 * Calcula la distància en km entre dos punts geogràfics
 * @param {number} lat1 - Latitud punt 1
 * @param {number} lon1 - Longitud punt 1
 * @param {number} lat2 - Latitud punt 2
 * @param {number} lon2 - Longitud punt 2
 * @returns {number} Distància en km (arrodonida a 2 decimals)
 */
export const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const toRad = (graus) => (graus * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distancia = RADI_TERRA_KM * c;

  return Math.round(distancia * 100) / 100;
};