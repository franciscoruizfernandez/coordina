// backend/scripts/simuladorPatrulles.js

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TOKEN = process.env.TOKEN_PATRULLA_SIMULADOR; // token admin o operador

const INTERVAL = 10000; // 10 segons
const RADI_MOVIMENT_METRES = 500;

// ==============================================================
// FUNCIONS AUXILIARS
// ==============================================================

function grausAMetres(metres) {
  return metres / 111320; // aproximació simple
}

function movimentAleatori(lat, lon) {
  const deltaLat = (Math.random() - 0.5) * grausAMetres(RADI_MOVIMENT_METRES);
  const deltaLon = (Math.random() - 0.5) * grausAMetres(RADI_MOVIMENT_METRES);

  return {
    lat: parseFloat((lat + deltaLat).toFixed(6)),
    lon: parseFloat((lon + deltaLon).toFixed(6))
  };
}

function moureCapAObjectiu(lat, lon, latObj, lonObj) {
  const factor = 0.1; // avançar 10%

  const novaLat = lat + (latObj - lat) * factor;
  const novaLon = lon + (lonObj - lon) * factor;

  return {
    lat: parseFloat(novaLat.toFixed(6)),
    lon: parseFloat(novaLon.toFixed(6))
  };
}

// ==============================================================
// OBTENIR INDICATIUS ACTIUS
// ==============================================================

async function obtenirIndicatius() {
  const res = await axios.get(`${BASE_URL}/api/indicatius`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });

  return res.data.dades;
}

// ==============================================================
// ACTUALITZAR GPS
// ==============================================================

async function actualitzarGPS(indicatiuId, lat, lon) {
  await axios.patch(
    `${BASE_URL}/api/indicatius/${indicatiuId}/ubicacio`,
    {
      ubicacio_lat: lat,
      ubicacio_lon: lon
    },
    {
      headers: { Authorization: `Bearer ${TOKEN}` }
    }
  );
}

// ==============================================================
// LOOP PRINCIPAL
// ==============================================================

async function simularMoviment() {
  try {
    const indicatius = await obtenirIndicatius();

    for (const indicatiu of indicatius) {

        const latActual = parseFloat(indicatiu.ubicacio_lat);
        const lonActual = parseFloat(indicatiu.ubicacio_lon);

        if (
            indicatiu.ubicacio_lat === null ||
            indicatiu.ubicacio_lon === null ||
            isNaN(latActual) ||
            isNaN(lonActual) ||
            latActual < -90 || latActual > 90 ||
            lonActual < -180 || lonActual > 180
        ) {
            console.log(`⚠️ Indicatiu ${indicatiu.codi} ignorat (coordenades invàlides)`);
            continue;
        }

        let novaPosicio;

        if (!indicatiu.incidencia_assignada_id) {
            novaPosicio = movimentAleatori(latActual, lonActual);
        } else {
            const latObj = parseFloat(indicatiu.incidencia_lat);
            const lonObj = parseFloat(indicatiu.incidencia_lon);

            novaPosicio = moureCapAObjectiu(latActual, lonActual, latObj, lonObj);
        }

        await actualitzarGPS(indicatiu.id, novaPosicio.lat, novaPosicio.lon);

        console.log(`🚔 ${indicatiu.codi} → (${novaPosicio.lat}, ${novaPosicio.lon})`);
        }

  } catch (error) {
    console.error('❌ Error simulant moviment:', error.response?.data || error.message);
  }
}

// ==============================================================
// EXECUCIÓ CONTÍNUA
// ==============================================================

function iniciarSimulador() {
  console.log('🚔 Simulador de moviment de patrulles iniciat...');
  setInterval(simularMoviment, INTERVAL);
}

iniciarSimulador();