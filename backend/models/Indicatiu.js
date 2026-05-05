// backend/models/Indicatiu.js

import pool from '../config/database.js';

export const TIPUS_UNITAT = ['cotxe', 'moto', 'furgoneta'];
export const ESTATS_OPERATIUS = ['disponible', 'en_servei', 'no_disponible', 'finalitzat'];

class Indicatiu {
  // ==============================================================
  // LLISTAR TOTS AMB FILTRES
  // ==============================================================
  static async llistarTots({ estat_operatiu = null } = {}) {
    let condicions = [];
    let valors = [];
    let idx = 1;

    if (estat_operatiu) {
      condicions.push(`estat_operatiu = $${idx++}`);
      valors.push(estat_operatiu);
    }

    const clausulaWhere =
      condicions.length > 0 ? `WHERE ${condicions.join(' AND ')}` : '';

    const consulta = `
      SELECT
        i.*,
        inc.tipologia      AS incidencia_tipologia,
        inc.prioritat      AS incidencia_prioritat,
        inc.estat          AS incidencia_estat,
        inc.direccio       AS incidencia_direccio,
        inc.ubicacio_lat   AS incidencia_lat,
        inc.ubicacio_lon   AS incidencia_lon
      FROM indicatius i
      LEFT JOIN incidencies inc ON i.incidencia_assignada_id = inc.id
      ${clausulaWhere}
      ORDER BY i.codi ASC
    `;

    const resultat = await pool.query(consulta, valors);
    return resultat.rows;
  }

  // ==============================================================
  // TROBAR DISPONIBLES (per a l'assignació automàtica)
  // ==============================================================
  static async trobarDisponibles() {
    const consulta = `
      SELECT *
      FROM indicatius
      WHERE estat_operatiu = 'disponible'
        AND ubicacio_lat IS NOT NULL
        AND ubicacio_lon IS NOT NULL
      ORDER BY codi ASC
    `;
    const resultat = await pool.query(consulta);
    return resultat.rows;
  }

  // ==============================================================
  // TROBAR PER ID
  // ==============================================================
  static async trobarPerId(id) {
    const consulta = `
      SELECT
        i.*,
        inc.tipologia AS incidencia_tipologia,
        inc.prioritat AS incidencia_prioritat,
        inc.estat     AS incidencia_estat,
        inc.direccio  AS incidencia_direccio,
        inc.ubicacio_lat AS incidencia_lat,
        inc.ubicacio_lon AS incidencia_lon
      FROM indicatius i
      LEFT JOIN incidencies inc ON i.incidencia_assignada_id = inc.id
      WHERE i.id = $1
    `;
    const resultat = await pool.query(consulta, [id]);
    return resultat.rows[0] || null;
  }

  // ==============================================================
  // TROBAR PER CODI (ex: "A-101")
  // ==============================================================
  static async trobarPerCodi(codi) {
    const consulta = `SELECT * FROM indicatius WHERE codi = $1`;
    const resultat = await pool.query(consulta, [codi]);
    return resultat.rows[0] || null;
  }

  // ==============================================================
  // CREAR INDICATIU
  // ==============================================================
  static async crear({ codi, tipus_unitat, sector_assignat, ubicacio_lat = null, ubicacio_lon = null }) {
    const consulta = `
      INSERT INTO indicatius (
        codi,
        tipus_unitat,
        estat_operatiu,
        sector_assignat,
        ubicacio_lat,
        ubicacio_lon
      )
      VALUES ($1, $2, 'disponible', $3, $4, $5)
      RETURNING *
    `;
    const resultat = await pool.query(consulta, [
      codi,
      tipus_unitat,
      sector_assignat || null,
      ubicacio_lat,
      ubicacio_lon,
    ]);
    return resultat.rows[0];
  }

  // ==============================================================
  // ACTUALITZAR GPS
  // ==============================================================
  static async actualitzarUbicacio(id, lat, lon) {
    const consulta = `
      UPDATE indicatius
      SET
        ubicacio_lat              = $1,
        ubicacio_lon              = $2,
        ultima_actualitzacio_gps  = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const resultat = await pool.query(consulta, [lat, lon, id]);
    return resultat.rows[0] || null;
  }

  // ==============================================================
  // CANVIAR ESTAT OPERATIU
  // ==============================================================
  static async canviarEstat(id, nouEstat) {
    const consulta = `
      UPDATE indicatius
      SET estat_operatiu = $1
      WHERE id = $2
      RETURNING *
    `;
    const resultat = await pool.query(consulta, [nouEstat, id]);
    return resultat.rows[0] || null;
  }

  // ==============================================================
  // ASSIGNAR INCIDÈNCIA
  // ==============================================================
  static async assignarIncidencia(id, incidenciaId) {
    const consulta = `
      UPDATE indicatius
      SET
        incidencia_assignada_id = $1,
        estat_operatiu          = 'en_servei'
      WHERE id = $2
      RETURNING *
    `;
    const resultat = await pool.query(consulta, [incidenciaId, id]);
    return resultat.rows[0] || null;
  }

  // ==============================================================
  // DESASSIGNAR INCIDÈNCIA (alliberar indicatiu)
  // ==============================================================
  static async desassignarIncidencia(id) {
    const consulta = `
      UPDATE indicatius
      SET
        incidencia_assignada_id = NULL,
        estat_operatiu          = 'disponible'
      WHERE id = $1
      RETURNING *
    `;
    const resultat = await pool.query(consulta, [id]);
    return resultat.rows[0] || null;
  }

  // ==============================================================
  // OBTENIR HISTORIAL GPS D'UN INDICATIU
  // ==============================================================
  static async obtenirHistorial(indicatiuId) {
    const consulta = `
      SELECT
        et.id,
        et.timestamp,
        et.tipus_esdeveniment,
        et.descripcio,
        et.dades_addicionals
      FROM esdeveniments_tracabilitat et
      WHERE et.indicatiu_id = $1
      ORDER BY et.timestamp DESC
      LIMIT 200
    `;
    const resultat = await pool.query(consulta, [indicatiuId]);
    return resultat.rows;
  }
}

export default Indicatiu;