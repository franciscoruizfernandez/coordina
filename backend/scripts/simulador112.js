// backend/scripts/simulador112.js

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// ==============================================================
// CONFIGURACIÓ
// ==============================================================

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const INTERVAL_MIN = 2 * 60 * 1000;  // 2 minuts
const INTERVAL_MAX = 5 * 60 * 1000;  // 5 minuts

// Token del sistema (crea un usuari tipus "sistema_112")
const TOKEN_112 = process.env.TOKEN_112;

// ==============================================================
// TIPOS D'INCIDÈNCIA REALISTES
// ==============================================================

const TIPOLOGIES = [
  'robatori',
  'accident',
  'altercat',
  'incendi',
  'drogues'
];

const PRIORITATS = ['critica', 'alta', 'mitjana', 'baixa'];

const DESCRIPCIONS = [
  'Robo en establecimiento comercial',
  'Accidente de tráfico con posibles heridos',
  'Altercado entre varias personas en vía pública',
  'Vandalismo en mobiliario urbano',
  'Grupo de personas sospechosas merodeando'
];

// ==============================================================
// COORDENADES DINS REGIÓ METROPOLITANA NORD
// Bounding box que ja tens validat
// ==============================================================

const LIMIT_REGIO = {
  latMin: 41.41,
  latMax: 41.75,
  lonMin: 1.97,
  lonMax: 2.77
};

function generarCoordenadesAleatories() {
  const lat = Math.random() * (LIMIT_REGIO.latMax - LIMIT_REGIO.latMin) + LIMIT_REGIO.latMin;
  const lon = Math.random() * (LIMIT_REGIO.lonMax - LIMIT_REGIO.lonMin) + LIMIT_REGIO.lonMin;

  return {
    ubicacio_lat: parseFloat(lat.toFixed(6)),
    ubicacio_lon: parseFloat(lon.toFixed(6))
  };
}

function generarIncidenciaAleatoria() {
  const coords = generarCoordenadesAleatories();

  const index = Math.floor(Math.random() * TIPOLOGIES.length);

  return {
    ...coords,
    tipologia: TIPOLOGIES[index],
    prioritat: PRIORITATS[Math.floor(Math.random() * PRIORITATS.length)],
    descripcio: DESCRIPCIONS[index],
    direccio: 'Dirección simulada - Sistema 112',
    observacions: 'Generada automáticamente por simulador'
  };
}

// ==============================================================
// ENVIAR INCIDÈNCIA
// ==============================================================

async function enviarIncidencia() {
  try {
    const incidencia = generarIncidenciaAleatoria();

    console.log('🚨 Generant nova incidència 112:', incidencia);

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

    console.log('✅ Incidència creada correctament:', response.data.dades.id);
  } catch (error) {
    console.error('❌ Error enviant incidència 112:', error.response?.data || error.message);
  }
}

// ==============================================================
// EXECUCIÓ AUTOMÀTICA
// ==============================================================

function iniciarSimulador() {
  console.log('📡 Simulador 112 iniciat...');
  enviarIncidencia();

  setInterval(() => {
    enviarIncidencia();
  }, Math.random() * (INTERVAL_MAX - INTERVAL_MIN) + INTERVAL_MIN);
}

iniciarSimulador();