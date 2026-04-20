// backend/models/Assignacio.js

import pool from '../config/database.js';

export const MODES_ASSIGNACIO = ['manual', 'automatica'];

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
  // OBTENIR ASSIGNACIÓ ACTIVA D'UNA INCIDÈNCIA
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
  static async crear({ incidencia_id, indicatiu_id, mode_assignacio, usuari_assignador_id = null }) {
    const consulta = `
      INSERT INTO assignacions (
        incidencia_id,
        indicatiu_id,
        mode_assignacio,
        usuari_assignador_id,
        timestamp_assignacio
      )
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;
    const resultat = await pool.query(consulta, [
      incidencia_id,
      indicatiu_id,
      mode_assignacio,
      usuari_assignador_id,
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