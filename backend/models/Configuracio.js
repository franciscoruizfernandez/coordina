// backend/models/Configuracio.js

import pool from '../config/database.js';

// Clau que guarda el mode d'assignació global
export const CLAU_MODE = 'mode_assignacio';

// Valors permesos
export const MODES = {
  MANUAL:    'manual',
  AUTOMATIC: 'automatic',
};

class Configuracio {

  // ==============================================================
  // OBTENIR UN VALOR PER CLAU
  // ==============================================================
  static async obtenirValor(clau) {
    const resultat = await pool.query(
      'SELECT valor FROM configuracio WHERE clau = $1',
      [clau]
    );
    return resultat.rows[0]?.valor ?? null;
  }

  // ==============================================================
  // ESTABLIR UN VALOR PER CLAU
  // Fa upsert: crea si no existeix, actualitza si existeix
  // ==============================================================
  static async establirValor(clau, valor) {
    const resultat = await pool.query(
      `INSERT INTO configuracio (clau, valor, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (clau)
       DO UPDATE SET valor = $2, updated_at = NOW()
       RETURNING *`,
      [clau, valor]
    );
    return resultat.rows[0];
  }

  // ==============================================================
  // OBTENIR EL MODE D'ASSIGNACIÓ ACTUAL
  // ==============================================================
  static async obtenirMode() {
    const valor = await this.obtenirValor(CLAU_MODE);
    return valor ?? MODES.MANUAL;
  }

  // ==============================================================
  // COMPROVAR SI EL MODE AUTOMÀTIC ESTÀ ACTIU
  // ==============================================================
  static async esModeAutomatic() {
    const mode = await this.obtenirMode();
    return mode === MODES.AUTOMATIC;
  }

  // ==============================================================
  // ESTABLIR EL MODE D'ASSIGNACIÓ
  // ==============================================================
  static async establirMode(mode) {
    if (!Object.values(MODES).includes(mode)) {
      throw new Error(`Mode invàlid: "${mode}". Ha de ser "manual" o "automatic"`);
    }
    return this.establirValor(CLAU_MODE, mode);
  }
}

export default Configuracio;