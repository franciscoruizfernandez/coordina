// backend/models/StreamVideo.js

import pool from '../config/database.js';

class StreamVideo {
  // ==============================================================
  // OBTENIR STREAMS PER INDICATIU
  // ==============================================================
  static async trobarPerIndicatiu(indicatiuId) {
    const consulta = `
      SELECT
        sv.*,
        i.codi AS indicatiu_codi,
        inc.tipologia AS incidencia_tipologia
      FROM streams_video sv
      LEFT JOIN indicatius i ON sv.indicatiu_id = i.id
      LEFT JOIN incidencies inc ON sv.incidencia_id = inc.id
      WHERE sv.indicatiu_id = $1
      ORDER BY sv.created_at DESC
    `;
    const resultat = await pool.query(consulta, [indicatiuId]);
    return resultat.rows;
  }

  // ==============================================================
  // OBTENIR STREAMS PER INCIDÈNCIA
  // ==============================================================
  static async trobarPerIncidencia(incidenciaId) {
    const consulta = `
      SELECT
        sv.*,
        i.codi AS indicatiu_codi,
        inc.tipologia AS incidencia_tipologia
      FROM streams_video sv
      LEFT JOIN indicatius i ON sv.indicatiu_id = i.id
      LEFT JOIN incidencies inc ON sv.incidencia_id = inc.id
      WHERE sv.incidencia_id = $1
      ORDER BY sv.created_at DESC
    `;
    const resultat = await pool.query(consulta, [incidenciaId]);
    return resultat.rows;
  }

  // ==============================================================
  // OBTENIR TOTS ELS STREAMS ACTIUS
  // ==============================================================
  static async llistarActius() {
    const consulta = `
      SELECT
        sv.*,
        i.codi AS indicatiu_codi,
        inc.tipologia AS incidencia_tipologia
      FROM streams_video sv
      LEFT JOIN indicatius i ON sv.indicatiu_id = i.id
      LEFT JOIN incidencies inc ON sv.incidencia_id = inc.id
      WHERE sv.actiu = true
      ORDER BY sv.created_at DESC
    `;
    const resultat = await pool.query(consulta);
    return resultat.rows;
  }

  // ==============================================================
  // OBTENIR STREAM PER ID
  // ==============================================================
  static async trobarPerId(id) {
    const consulta = `
      SELECT
        sv.*,
        i.codi AS indicatiu_codi,
        inc.tipologia AS incidencia_tipologia
      FROM streams_video sv
      LEFT JOIN indicatius i ON sv.indicatiu_id = i.id
      LEFT JOIN incidencies inc ON sv.incidencia_id = inc.id
      WHERE sv.id = $1
    `;
    const resultat = await pool.query(consulta, [id]);
    return resultat.rows[0] || null;
  }

  // ==============================================================
  // CREAR STREAM
  // ==============================================================
  static async crear({ indicatiu_id, incidencia_id, url_stream, tipus_font }) {
    const consulta = `
      INSERT INTO streams_video (
        indicatiu_id,
        incidencia_id,
        url_stream,
        tipus_font,
        actiu
      )
      VALUES ($1, $2, $3, $4, true)
      RETURNING *
    `;
    const resultat = await pool.query(consulta, [
      indicatiu_id || null,
      incidencia_id || null,
      url_stream,
      tipus_font,
    ]);
    return resultat.rows[0];
  }

  // ==============================================================
  // ACTIVAR / DESACTIVAR STREAM
  // ==============================================================
  static async toggle(id) {
    const consulta = `
      UPDATE streams_video
      SET actiu = NOT actiu
      WHERE id = $1
      RETURNING *
    `;
    const resultat = await pool.query(consulta, [id]);
    return resultat.rows[0] || null;
  }
}

export default StreamVideo;