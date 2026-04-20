// backend/models/Usuari.js
import pool from '../config/database.js';

class Usuari {
  // ==============================================================
  // CREAR USUARI
  // ==============================================================
  static async crear({ username, password_hash, rol, nom_complet }) {
    const query = `
      INSERT INTO usuaris (username, password_hash, rol, nom_complet, actiu)
      VALUES ($1, $2, $3, $4, true)
      RETURNING id, username, rol, nom_complet, actiu, created_at
    `;
    const valors = [username, password_hash, rol, nom_complet];

    try {
      const resultat = await pool.query(query, valors);
      return resultat.rows[0];
    } catch (error) {
      console.error('❌ Error creant usuari:', error);
      throw error;
    }
  }

  // ==============================================================
  // TROBAR USUARI PER USERNAME
  // ==============================================================
  static async trobarPerUsername(username) {
    const query = 'SELECT * FROM usuaris WHERE username = $1';
    
    try {
      const resultat = await pool.query(query, [username]);
      return resultat.rows[0] || null;
    } catch (error) {
      console.error('❌ Error trobant usuari:', error);
      throw error;
    }
  }

  // ==============================================================
  // TROBAR USUARI PER ID
  // ==============================================================
  static async trobarPerId(id) {
    const query = 'SELECT * FROM usuaris WHERE id = $1';
    
    try {
      const resultat = await pool.query(query, [id]);
      return resultat.rows[0] || null;
    } catch (error) {
      console.error('❌ Error trobant usuari per ID:', error);
      throw error;
    }
  }

  // ==============================================================
  // LLISTAR TOTS ELS USUARIS
  // ==============================================================
  static async llistarTots() {
    const query = `
      SELECT id, username, rol, nom_complet, actiu, created_at
      FROM usuaris
      ORDER BY created_at DESC
    `;
    
    try {
      const resultat = await pool.query(query);
      return resultat.rows;
    } catch (error) {
      console.error('❌ Error llistant usuaris:', error);
      throw error;
    }
  }

  // ==============================================================
  // ACTUALITZAR USUARI
  // ==============================================================
  static async actualitzar(id, actualitzacions) {
    // Construir query dinàmica segons camps a actualitzar
    const camps = [];
    const valors = [];
    let indexParam = 1;

    Object.keys(actualitzacions).forEach((clau) => {
      camps.push(`${clau} = $${indexParam}`);
      valors.push(actualitzacions[clau]);
      indexParam++;
    });

    valors.push(id);
    const query = `
      UPDATE usuaris
      SET ${camps.join(', ')}
      WHERE id = $${indexParam}
      RETURNING id, username, rol, nom_complet, actiu
    `;

    try {
      const resultat = await pool.query(query, valors);
      return resultat.rows[0];
    } catch (error) {
      console.error('❌ Error actualitzant usuari:', error);
      throw error;
    }
  }

  // ==============================================================
  // ELIMINAR USUARI (soft delete)
  // ==============================================================
  static async eliminar(id) {
    const query = 'UPDATE usuaris SET actiu = false WHERE id = $1 RETURNING id';
    
    try {
      const resultat = await pool.query(query, [id]);
      return resultat.rows[0];
    } catch (error) {
      console.error('❌ Error eliminant usuari:', error);
      throw error;
    }
  }
}

export default Usuari;