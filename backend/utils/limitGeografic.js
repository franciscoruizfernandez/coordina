// backend/utils/limitGeografic.js

// ==============================================================
// LÍMIT GEOGRÀFIC - REGIÓ POLICIAL METROPOLITANA NORD
// Mossos d'Esquadra
//
// Municipis inclosos: Arenys de Mar, Badalona, Granollers,
// Mataró, Sabadell, Terrassa, Santa Coloma de Gramenet,
// Sant Cugat del Vallès, Mollet del Vallès, i molts més.
// ==============================================================

// Bounding box que engloba tota la regió
const LIMIT_REGIO = {
  latMin: 41.41,  // Sud: Badalona / Sant Adrià de Besòs
  latMax: 41.75,  // Nord: Fogars de Montclús / Montseny
  lonMin: 1.97,   // Oest: Castellbisbal / Vacarisses
  lonMax: 2.77,   // Est: Malgrat de Mar / Santa Susanna
};

// Info de la regió per als missatges d'error
const INFO_REGIO = {
  nom: 'Regió Policial Metropolitana Nord (Mossos d\'Esquadra)',
  limitsSN: `${LIMIT_REGIO.latMin}°N - ${LIMIT_REGIO.latMax}°N`,
  limitsEO: `${LIMIT_REGIO.lonMin}°E - ${LIMIT_REGIO.lonMax}°E`,
};

// ==============================================================
// FUNCIÓ PRINCIPAL: Validar si unes coordenades estan dins
// ==============================================================
export const esDinsRegio = (lat, lon) => {
  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);

  return (
    latNum >= LIMIT_REGIO.latMin &&
    latNum <= LIMIT_REGIO.latMax &&
    lonNum >= LIMIT_REGIO.lonMin &&
    lonNum <= LIMIT_REGIO.lonMax
  );
};

// ==============================================================
// FUNCIÓ: Retorna el missatge d'error estàndard
// ==============================================================
export const missatgeForaDeRegio = (lat, lon) => {
  return {
    error: true,
    missatge: `Les coordenades (${lat}, ${lon}) estan fora de la ${INFO_REGIO.nom}`,
    regio: INFO_REGIO.nom,
    limitsAcceptats: {
      latitud:  INFO_REGIO.limitsSN,
      longitud: INFO_REGIO.limitsEO,
    },
  };
};

export { LIMIT_REGIO, INFO_REGIO };