// backend/models/Indicatiu.js
import pool from '../config/database.js';

class Indicatiu {
  // ==============================================================
  // CREAR INDICATIU
  // ==============================================================
  static async crear({ codi, tipus_unitat, sector_assignat }) {
    const query = `
      INSERT INTO indicatius (codi, tipus_unitat, sector_assignat, estat_operatiu)
      VALUES ($1, $2, $3, 'disponible')
      RETURNING *
    `;
    const valors = [codi, tipus_unitat, sector_assignat];

    try {
      const resultat = await pool.query(query, valors);
      return resultat.rows[0];
    } catch (error) {
      console.error('❌ Error creant indicatiu:', error);
      throw error;
    }
  }

  // ==============================================================
  // TROBAR PER ID
  // ==============================================================
  static async trobarPerId(id) {
    const query = 'SELECT * FROM indicatius WHERE id = $1';
    
    try {
      const resultat = await pool.query(query, [id]);
      return resultat.rows[0] || null;
    } catch (error) {
      console.error('❌ Error trobant indicatiu:', error);
      throw error;
    }
  }

  // ==============================================================
  // TROBAR PER CODI
  // ==============================================================
  static async trobarPerCodi(codi) {
    const query = 'SELECT * FROM indicatius WHERE codi = $1';
    
    try {
      const resultat = await pool.query(query, [codi]);
      return resultat.rows[0] || null;
    } catch (error) {
      console.error('❌ Error trobant indicatiu per codi:', error);
      throw error;
    }
  }

  // ==============================================================
  // LLISTAR TOTS
  // ==============================================================
  static async llistarTots(filtres = {}) {
    let query = 'SELECT * FROM indicatius WHERE 1=1';
    const valors = [];
    let indexParam = 1;

    // Filtrar per estat operatiu
    if (filtres.estat_operatiu) {
      query += ` AND estat_operatiu = $${indexParam}`;
      valors.push(filtres.estat_operatiu);
      indexParam++;
    }

    query += ' ORDER BY codi';

    try {
      const resultat = await pool.query(query, valors);
      return resultat.rows;
    } catch (error) {
      console.error('❌ Error llistant indicatius:', error);
      throw error;
    }
  }

  // ==============================================================
  // ACTUALITZAR UBICACIÓ GPS
  // ==============================================================
  static async actualitzarUbicacio(id, lat, lon) {
    const query = `
      UPDATE indicatius
      SET ubicacio_lat = $1,
          ubicacio_lon = $2,
          ultima_actualitzacio_gps = NOW()
      WHERE id = $3
      RETURNING *
    `;

    try {
      const resultat = await pool.query(query, [lat, lon, id]);
      return resultat.rows[0];
    } catch (error) {
      console.error('❌ Error actualitzant ubicació:', error);
      throw error;
    }
  }

  // ==============================================================
  // CANVIAR ESTAT OPERATIU
  // ==============================================================
  static async actualitzarEstatOperatiu(id, nouEstat) {
    const query = `
      UPDATE indicatius
      SET estat_operatiu = $1
      WHERE id = $2
      RETURNING *
    `;

    try {
      const resultat = await pool.query(query, [nouEstat, id]);
      return resultat.rows[0];
    } catch (error) {
      console.error('❌ Error actualitzant estat operatiu:', error);
      throw error;
    }
  }

  // ==============================================================
  // TROBAR INDICATIUS DISPONIBLES
  // ==============================================================
  static async trobarDisponibles() {
    const query = `
      SELECT * FROM indicatius
      WHERE estat_operatiu = 'disponible'
      ORDER BY codi
    `;

    try {
      const resultat = await pool.query(query);
      return resultat.rows;
    } catch (error) {
      console.error('❌ Error trobant indicatius disponibles:', error);
      throw error;
    }
  }
}

export default Indicatiu;