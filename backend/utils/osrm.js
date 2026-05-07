// backend/utils/osrm.js

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

// ==============================================================
// OBTENIR RUTA VIA OSRM
// Retorna distància (km) i temps (minuts) entre dos punts
// ==============================================================
export const obtenirRutaOSRM = async (latOrigen, lonOrigen, latDesti, lonDesti) => {
  if (
    latOrigen == null || lonOrigen == null ||
    latDesti == null || lonDesti == null
  ) {
    return null;
  }

  try {
    // OSRM espera lon,lat
    const url =
      `${OSRM_URL}/${lonOrigen},${latOrigen};${lonDesti},${latDesti}` +
      `?overview=false&steps=false`;

    const resposta = await fetch(url);

    if (!resposta.ok) {
      console.error('❌ OSRM ha retornat error HTTP:', resposta.status);
      return null;
    }

    const dades = await resposta.json();

    if (dades.code !== 'Ok' || !dades.routes || dades.routes.length === 0) {
      console.error('❌ OSRM no ha trobat ruta');
      return null;
    }

    const ruta = dades.routes[0];

    return {
      distancia_km: Math.round((ruta.distance / 1000) * 10) / 10,
      temps_minuts: Math.round(ruta.duration / 60),
    };
  } catch (error) {
    console.error('❌ Error cridant OSRM:', error.message);
    return null;
  }
};

// ==============================================================
// CALCULAR RUTES PER A MÚLTIPLES INDICATIUS
// Retorna la mateixa llista amb temps i distància afegits
// ==============================================================
export const calcularRutesMultiples = async (latDesti, lonDesti, indicatius) => {
  const promeses = indicatius.map(async (ind) => {
    if (!ind.ubicacio_lat || !ind.ubicacio_lon) {
      return {
        ...ind,
        distancia_km: null,
        temps_minuts: null,
      };
    }

    const ruta = await obtenirRutaOSRM(
      parseFloat(ind.ubicacio_lat),
      parseFloat(ind.ubicacio_lon),
      latDesti,
      lonDesti
    );

    return {
      ...ind,
      distancia_km: ruta?.distancia_km ?? null,
      temps_minuts: ruta?.temps_minuts ?? null,
    };
  });

  return Promise.all(promeses);
};