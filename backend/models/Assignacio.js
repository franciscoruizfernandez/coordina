// backend/models/Assignacio.js

import pool from '../config/database.js';

export const MODES_ASSIGNACIO  = ['manual', 'automatica'];
export const TIPUS_ASSIGNACIO  = ['principal', 'reforc'];

class Assignacio {

  // ==============================================================
  // TROBAR PER ID
  // ==============================================================
  static async trobarPerId(id) {
    const consulta = `
      SELECT
        a.*,
        i.tipologia        AS incidencia_tipologia,
        i.prioritat        AS incidencia_prioritat,
        i.estat            AS incidencia_estat,
        i.direccio         AS incidencia_direccio,
        ind.codi           AS indicatiu_codi,
        ind.tipus_unitat   AS indicatiu_tipus,
        u.username         AS assignador_username
      FROM assignacions a
      LEFT JOIN incidencies i   ON a.incidencia_id         = i.id
      LEFT JOIN indicatius  ind ON a.indicatiu_id          = ind.id
      LEFT JOIN usuaris     u   ON a.usuari_assignador_id  = u.id
      WHERE a.id = $1
    `;
    const resultat = await pool.query(consulta, [id]);
    return resultat.rows[0] || null;
  }

  // ==============================================================
  // OBTENIR UNA ASSIGNACIÓ ACTIVA D'UNA INCIDÈNCIA (la més recent)
  // Mantingut per compatibilitat amb codi existent
  // ==============================================================
  static async trobarActivaPerIncidencia(incidenciaId) {
    const consulta = `
      SELECT *
      FROM assignacions
      WHERE incidencia_id = $1
        AND timestamp_finalitzacio IS NULL
      ORDER BY timestamp_assignacio DESC
      LIMIT 1
    `;
    const resultat = await pool.query(consulta, [incidenciaId]);
    return resultat.rows[0] || null;
  }

  // ==============================================================
  // OBTENIR TOTES LES ASSIGNACIONS ACTIVES D'UNA INCIDÈNCIA
  // Nou mètode per al model N:1
  // ==============================================================
  static async trobarTotesActivesPerIncidencia(incidenciaId) {
    const consulta = `
      SELECT
        a.*,
        ind.codi           AS indicatiu_codi,
        ind.tipus_unitat   AS indicatiu_tipus,
        ind.estat_operatiu AS indicatiu_estat,
        ind.ubicacio_lat   AS indicatiu_lat,
        ind.ubicacio_lon   AS indicatiu_lon
      FROM assignacions a
      LEFT JOIN indicatius ind ON a.indicatiu_id = ind.id
      WHERE a.incidencia_id = $1
        AND a.timestamp_finalitzacio IS NULL
      ORDER BY a.timestamp_assignacio ASC
    `;
    const resultat = await pool.query(consulta, [incidenciaId]);
    return resultat.rows;
  }

  // ==============================================================
  // COMPTAR ASSIGNACIONS ACTIVES D'UNA INCIDÈNCIA
  // ==============================================================
  static async comptarActivesPerIncidencia(incidenciaId) {
    const consulta = `
      SELECT COUNT(*) AS total
      FROM assignacions
      WHERE incidencia_id = $1
        AND timestamp_finalitzacio IS NULL
    `;
    const resultat = await pool.query(consulta, [incidenciaId]);
    return parseInt(resultat.rows[0].total);
  }

  // ==============================================================
  // COMPTAR ASSIGNACIONS ACTIVES ACCEPTADES D'UNA INCIDÈNCIA
  // ==============================================================
  static async comptarActivesAcceptadesPerIncidencia(incidenciaId) {
    const consulta = `
      SELECT COUNT(*) AS total
      FROM assignacions
      WHERE incidencia_id = $1
        AND timestamp_finalitzacio IS NULL
        AND timestamp_acceptacio IS NOT NULL
    `;
    const resultat = await pool.query(consulta, [incidenciaId]);
    return parseInt(resultat.rows[0].total);
  }

  // ==============================================================
  // COMPROVAR SI UNA INCIDÈNCIA TÉ ASSIGNACIONS ACTIVES
  // ==============================================================
  static async teActivesPerIncidencia(incidenciaId) {
    const total = await this.comptarActivesPerIncidencia(incidenciaId);
    return total > 0;
  }

  // ==============================================================
  // OBTENIR INDICATIUS ACTIUS ASSIGNATS A UNA INCIDÈNCIA
  // Retorna la llista completa d'indicatius amb les seves dades
  // ==============================================================
  static async obtenirIndicatiusActiusPerIncidencia(incidenciaId) {
    const consulta = `
      SELECT
        ind.id,
        ind.codi,
        ind.tipus_unitat,
        ind.estat_operatiu,
        ind.ubicacio_lat,
        ind.ubicacio_lon,
        ind.sector_assignat,
        a.id                  AS assignacio_id,
        a.timestamp_assignacio,
        a.timestamp_acceptacio,
        a.mode_assignacio,
        a.tipus_assignacio
      FROM assignacions a
      JOIN indicatius ind ON a.indicatiu_id = ind.id
      WHERE a.incidencia_id = $1
        AND a.timestamp_finalitzacio IS NULL
      ORDER BY a.timestamp_assignacio ASC
    `;
    const resultat = await pool.query(consulta, [incidenciaId]);
    return resultat.rows;
  }

  // ==============================================================
  // OBTENIR ASSIGNACIÓ ACTIVA D'UN INDICATIU
  // ==============================================================
  static async trobarActivaPerIndicatiu(indicatiuId) {
    const consulta = `
      SELECT *
      FROM assignacions
      WHERE indicatiu_id = $1
        AND timestamp_finalitzacio IS NULL
      ORDER BY timestamp_assignacio DESC
      LIMIT 1
    `;
    const resultat = await pool.query(consulta, [indicatiuId]);
    return resultat.rows[0] || null;
  }

  // ==============================================================
  // CREAR ASSIGNACIÓ
  // ==============================================================
  static async crear({
    incidencia_id,
    indicatiu_id,
    mode_assignacio,
    usuari_assignador_id = null,
    tipus_assignacio = 'principal',
  }) {
    const consulta = `
      INSERT INTO assignacions (
        incidencia_id,
        indicatiu_id,
        mode_assignacio,
        usuari_assignador_id,
        tipus_assignacio,
        timestamp_assignacio
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;
    const resultat = await pool.query(consulta, [
      incidencia_id,
      indicatiu_id,
      mode_assignacio,
      usuari_assignador_id,
      tipus_assignacio,
    ]);
    return resultat.rows[0];
  }

  // ==============================================================
  // ACCEPTAR ASSIGNACIÓ (patrulla confirma)
  // ==============================================================
  static async acceptar(id) {
    const consulta = `
      UPDATE assignacions
      SET timestamp_acceptacio = NOW()
      WHERE id = $1
        AND timestamp_acceptacio IS NULL
      RETURNING *
    `;
    const resultat = await pool.query(consulta, [id]);
    return resultat.rows[0] || null;
  }

  // ==============================================================
  // FINALITZAR ASSIGNACIÓ
  // ==============================================================
  static async finalitzar(id) {
    const consulta = `
      UPDATE assignacions
      SET timestamp_finalitzacio = NOW()
      WHERE id = $1
        AND timestamp_finalitzacio IS NULL
      RETURNING *
    `;
    const resultat = await pool.query(consulta, [id]);
    return resultat.rows[0] || null;
  }

  // ==============================================================
  // CANCEL·LAR ASSIGNACIÓ
  // ==============================================================
  static async cancellar(id) {
    return this.finalitzar(id);
  }
}

export default Assignacio;