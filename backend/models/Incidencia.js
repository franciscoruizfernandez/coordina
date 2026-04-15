// backend/models/Incidencia.js
import pool from '../config/database.js';

class Incidencia {
  // ==============================================================
  // CREAR INCIDÈNCIA
  // ==============================================================
  static async crear({
    ubicacio_lat,
    ubicacio_lon,
    direccio,
    tipologia,
    prioritat,
    descripcio,
  }) {
    const query = `
      INSERT INTO incidencies (
        ubicacio_lat, ubicacio_lon, direccio, 
        tipologia, prioritat, descripcio, estat
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'nova')
      RETURNING *
    `;
    const valors = [
      ubicacio_lat,
      ubicacio_lon,
      direccio,
      tipologia,
      prioritat,
      descripcio,
    ];

    try {
      const resultat = await pool.query(query, valors);
      return resultat.rows[0];
    } catch (error) {
      console.error('❌ Error creant incidència:', error);
      throw error;
    }
  }

  // ==============================================================
  // TROBAR INCIDÈNCIA PER ID
  // ==============================================================
  static async trobarPerId(id) {
    const query = 'SELECT * FROM incidencies WHERE id = $1';
    
    try {
      const resultat = await pool.query(query, [id]);
      return resultat.rows[0] || null;
    } catch (error) {
      console.error('❌ Error trobant incidència:', error);
      throw error;
    }
  }

  // ==============================================================
  // LLISTAR INCIDÈNCIES AMB FILTRES
  // ==============================================================
  static async llistarTotes(filtres = {}) {
    let query = 'SELECT * FROM incidencies WHERE 1=1';
    const valors = [];
    let indexParam = 1;

    // Filtrar per estat
    if (filtres.estat) {
      query += ` AND estat = $${indexParam}`;
      valors.push(filtres.estat);
      indexParam++;
    }

    // Filtrar per prioritat
    if (filtres.prioritat) {
      query += ` AND prioritat = $${indexParam}`;
      valors.push(filtres.prioritat);
      indexParam++;
    }

    // Ordenar per timestamp (més recents primer)
    query += ' ORDER BY timestamp_recepcio DESC';

    // Límit (paginació)
    if (filtres.limit) {
      query += ` LIMIT $${indexParam}`;
      valors.push(filtres.limit);
      indexParam++;
    }

    try {
      const resultat = await pool.query(query, valors);
      return resultat.rows;
    } catch (error) {
      console.error('❌ Error llistant incidències:', error);
      throw error;
    }
  }

  // ==============================================================
  // ACTUALITZAR ESTAT
  // ==============================================================
  static async actualitzarEstat(id, nouEstat) {
    const query = `
      UPDATE incidencies
      SET estat = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    try {
      const resultat = await pool.query(query, [nouEstat, id]);
      return resultat.rows[0];
    } catch (error) {
      console.error('❌ Error actualitzant estat:', error);
      throw error;
    }
  }

  // ==============================================================
  // TANCAR INCIDÈNCIA
  // ==============================================================
  static async tancar(id, observacions) {
    const query = `
      UPDATE incidencies
      SET estat = 'tancada', 
          data_tancament = NOW(),
          observacions = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    try {
      const resultat = await pool.query(query, [observacions, id]);
      return resultat.rows[0];
    } catch (error) {
      console.error('❌ Error tancant incidència:', error);
      throw error;
    }
  }
}

export default Incidencia;