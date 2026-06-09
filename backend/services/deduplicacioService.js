// backend/services/deduplicacioService.js
//
// Servei de deduplicació d'avisos 112.
// Quan arriba una nova incidència, comprova si ja n'existeix
// una d'activa de la mateixa tipologia a menys de DISTANCIA_MAX metres
// i creada fa menys de FINESTRA_TEMPORAL minuts.
//
// Si és un duplicat:
//   - Incrementa el comptador d'avisos de la incidència existent
//   - Registra la traçabilitat
//   - Emet websocket a la sala de control
//   - Retorna la incidència existent (no es crea cap de nova)
//
// Si no és un duplicat:
//   - Retorna null (el flux normal continua i crea la incidència)

import pool from '../config/database.js';
import EsdevenimentTracabilitat from '../models/EsdevenimentTracabilitat.js';
import { emetreAvis112Unificat } from '../sockets/emissors.js';

// ==============================================================
// PARÀMETRES DE DEDUPLICACIÓ
// ==============================================================

// Distància màxima en metres per considerar el mateix incident
const DISTANCIA_MAX_METRES = 150;

// Finestra temporal màxima en minuts per considerar el mateix incident
const FINESTRA_TEMPORAL_MINUTS = 15;

// ==============================================================
// HELPER: Càlcul de distància Haversine (en metres)
// ==============================================================
const haversineMetres = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // radi de la Terra en metres
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ==============================================================
// FUNCIÓ PRINCIPAL: Verificar si un avís és duplicat
// Retorna la incidència existent si és duplicat, o null si és nova
// ==============================================================
export const verificarDuplicat = async ({ ubicacio_lat, ubicacio_lon, tipologia, usuari_id = null }) => {
  try {
    const lat = parseFloat(ubicacio_lat);
    const lon = parseFloat(ubicacio_lon);

    // Buscar incidències actives de la mateixa tipologia
    // dins d'una finestra temporal recent
    // Usem un bounding box aproximat per eficiència (filtre SQL ràpid)
    // i després calculem la distància exacta en JavaScript
    const finestraTemporal = new Date(
      Date.now() - FINESTRA_TEMPORAL_MINUTS * 60 * 1000
    ).toISOString();

    // Aproximació de bounding box: 150m ≈ 0.00135 graus lat, ≈ 0.0018 graus lon
    const deltaLat = 0.00135;
    const deltaLon = 0.00180;

    const res = await pool.query(
      `SELECT *
       FROM incidencies
       WHERE tipologia = $1
         AND estat NOT IN ('tancada', 'resolta')
         AND timestamp_recepcio >= $2
         AND ubicacio_lat BETWEEN $3 AND $4
         AND ubicacio_lon BETWEEN $5 AND $6
       ORDER BY timestamp_recepcio DESC`,
      [
        tipologia,
        finestraTemporal,
        lat - deltaLat,
        lat + deltaLat,
        lon - deltaLon,
        lon + deltaLon,
      ]
    );

    if (res.rows.length === 0) return null;

    // Calcular distància exacta per a cada candidat
    for (const incidencia of res.rows) {
      const distancia = haversineMetres(
        lat, lon,
        parseFloat(incidencia.ubicacio_lat),
        parseFloat(incidencia.ubicacio_lon)
      );

      if (distancia <= DISTANCIA_MAX_METRES) {
        // ── És un duplicat: actualitzar comptador i timestamp ──

        const resActualitzat = await pool.query(
          `UPDATE incidencies
           SET
             num_avisos_112            = num_avisos_112 + 1,
             timestamp_darrer_avis_112 = NOW()
           WHERE id = $1
           RETURNING *`,
          [incidencia.id]
        );

        const incidenciaActualitzada = resActualitzat.rows[0];

        // ── Traçabilitat ──
        try {
          await EsdevenimentTracabilitat.registrar({
            tipus_esdeveniment: 'creacio_incidencia',
            usuari_id:          usuari_id ?? null,
            incidencia_id:      incidencia.id,
            indicatiu_id:       null,
            descripcio:
              `Nou avís 112 unificat amb incidència existent ` +
              `(avís núm. ${incidenciaActualitzada.num_avisos_112}, ` +
              `distància: ${Math.round(distancia)} m)`,
            dades_addicionals: {
              distancia_metres:  Math.round(distancia),
              num_avisos_112:    incidenciaActualitzada.num_avisos_112,
              coords_nou_avis:   { lat, lon },
              coords_incidencia: {
                lat: parseFloat(incidencia.ubicacio_lat),
                lon: parseFloat(incidencia.ubicacio_lon),
              },
            },
          });
        } catch (errTracabilitat) {
          console.error('⚠️  [Dedup] Error registrant traçabilitat:', errTracabilitat.message);
        }

        // ── Websocket a la sala ──
        emetreAvis112Unificat(incidenciaActualitzada, incidenciaActualitzada.num_avisos_112);

        console.log(
          `🔄 [Dedup] Avís unificat → incidència ${incidencia.id} ` +
          `(${Math.round(distancia)} m, avís núm. ${incidenciaActualitzada.num_avisos_112})`
        );

        return incidenciaActualitzada;
      }
    }

    // Cap candidat prou proper → no és duplicat
    return null;

  } catch (err) {
    // La deduplicació mai ha d'aturar el flux principal
    console.error('❌ [Dedup] Error en verificació de duplicat:', err.message);
    return null;
  }
};