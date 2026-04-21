// backend/models/Missatge.js

import pool from '../config/database.js';

class Missatge {

  // ==============================================================
  // CREAR MISSATGE
  // ==============================================================
  static async crear({ emissor_id, destinatari_id = null, incidencia_id = null, contingut }) {
    const consulta = `
      INSERT INTO missatges (
        emissor_id,
        destinatari_id,
        incidencia_id,
        contingut,
        llegit,
        timestamp
      )
      VALUES ($1, $2, $3, $4, false, NOW())
      RETURNING *
    `;

    const resultat = await pool.query(consulta, [
      emissor_id,
      destinatari_id,
      incidencia_id,
      contingut
    ]);

    return resultat.rows[0];
  }

  // ==============================================================
  // OBTENIR HISTORIAL PER INCIDÈNCIA
  // ==============================================================
  static async obtenirPerIncidencia(incidencia_id) {
    const consulta = `
      SELECT 
        m.*,
        u.username AS emissor_username,
        u.rol AS emissor_rol
      FROM missatges m
      LEFT JOIN usuaris u ON m.emissor_id = u.id
      WHERE m.incidencia_id = $1
      ORDER BY m.timestamp ASC
    `;

    const resultat = await pool.query(consulta, [incidencia_id]);
    return resultat.rows;
  }

  // ==============================================================
  // MARCAR COM A LLEGIT
  // ==============================================================
  static async marcarLlegit(id) {
    const consulta = `
      UPDATE missatges
      SET llegit = true
      WHERE id = $1
      RETURNING *
    `;

    const resultat = await pool.query(consulta, [id]);
    return resultat.rows[0] || null;
  }
}

export default Missatge;