// backend/models/OcupacioIndicatiuActiva.js

import pool from '../config/database.js';
import { getClient } from '../config/database.js';

class OcupacioIndicatiuActiva {

  // ==============================================================
  // TROBAR OCUPACIÓ PER USUARI
  // Retorna la fila activa d'un usuari (si en té una)
  // ==============================================================
  static async trobarPerUsuari(usuariId) {
    const consulta = `
      SELECT
        oia.indicatiu_id,
        oia.usuari_id,
        oia.timestamp_inici,
        i.codi AS indicatiu_codi,
        i.tipus_unitat,
        i.estat_operatiu,
        i.ubicacio_lat,
        i.ubicacio_lon,
        i.sector_assignat,
        i.incidencia_assignada_id
      FROM ocupacions_indicatius_actives oia
      JOIN indicatius i ON i.id = oia.indicatiu_id
      WHERE oia.usuari_id = $1
    `;
    const resultat = await pool.query(consulta, [usuariId]);
    return resultat.rows[0] || null;
  }

  // ==============================================================
  // TROBAR OCUPACIÓ PER INDICATIU
  // Retorna la fila activa d'un indicatiu (si està ocupat)
  // ==============================================================
  static async trobarPerIndicatiu(indicatiuId) {
    const consulta = `
      SELECT
        oia.indicatiu_id,
        oia.usuari_id,
        oia.timestamp_inici,
        u.username AS usuari_username,
        u.nom_complet AS usuari_nom
      FROM ocupacions_indicatius_actives oia
      JOIN usuaris u ON u.id = oia.usuari_id
      WHERE oia.indicatiu_id = $1
    `;
    const resultat = await pool.query(consulta, [indicatiuId]);
    return resultat.rows[0] || null;
  }

  // ==============================================================
  // SELECCIONAR INDICATIU
  // Un usuari ocupa un indicatiu (dins transacció)
  // ==============================================================
  static async seleccionar(usuariId, indicatiuId) {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // 1. Comprovar si l'usuari ja té un indicatiu actiu
      const resUsuari = await client.query(
        'SELECT indicatiu_id FROM ocupacions_indicatius_actives WHERE usuari_id = $1',
        [usuariId]
      );

      if (resUsuari.rows.length > 0) {
        await client.query('ROLLBACK');
        return {
          error: true,
          missatge: 'Aquest usuari ja té un indicatiu seleccionat',
          indicatiu_actual: resUsuari.rows[0].indicatiu_id,
        };
      }

      // 2. Comprovar si l'indicatiu ja està ocupat
      const resIndicatiu = await client.query(
        'SELECT usuari_id FROM ocupacions_indicatius_actives WHERE indicatiu_id = $1',
        [indicatiuId]
      );

      if (resIndicatiu.rows.length > 0) {
        await client.query('ROLLBACK');
        return {
          error: true,
          missatge: 'Aquest indicatiu ja està ocupat per un altre usuari',
          ocupat_per: resIndicatiu.rows[0].usuari_id,
        };
      }

      // 3. Crear l'ocupació activa
      await client.query(
        `INSERT INTO ocupacions_indicatius_actives (indicatiu_id, usuari_id, timestamp_inici)
         VALUES ($1, $2, NOW())`,
        [indicatiuId, usuariId]
      );

      await client.query('COMMIT');

      // 4. Retornar les dades completes de l'indicatiu seleccionat
      const resComplet = await pool.query(
        `SELECT
          oia.indicatiu_id,
          oia.usuari_id,
          oia.timestamp_inici,
          i.codi AS indicatiu_codi,
          i.tipus_unitat,
          i.estat_operatiu,
          i.ubicacio_lat,
          i.ubicacio_lon,
          i.sector_assignat,
          i.incidencia_assignada_id
        FROM ocupacions_indicatius_actives oia
        JOIN indicatius i ON i.id = oia.indicatiu_id
        WHERE oia.indicatiu_id = $1`,
        [indicatiuId]
      );

      return {
        error: false,
        dades: resComplet.rows[0],
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ==============================================================
  // ALLIBERAR INDICATIU
  // Mou l'ocupació a l'històric i elimina l'activa (transacció)
  // ==============================================================
  static async alliberar(usuariId, motiuFi = 'logout') {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // 1. Buscar l'ocupació activa de l'usuari
      const resActiva = await client.query(
        `SELECT indicatiu_id, usuari_id, timestamp_inici
         FROM ocupacions_indicatius_actives
         WHERE usuari_id = $1`,
        [usuariId]
      );

      if (resActiva.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          error: true,
          missatge: 'Aquest usuari no té cap indicatiu seleccionat',
        };
      }

      const ocupacio = resActiva.rows[0];

      // 2. Copiar a la taula d'històric
      await client.query(
        `INSERT INTO historic_ocupacions_indicatius
           (indicatiu_id, usuari_id, timestamp_inici, timestamp_final, motiu_fi)
         VALUES ($1, $2, $3, NOW(), $4)`,
        [ocupacio.indicatiu_id, ocupacio.usuari_id, ocupacio.timestamp_inici, motiuFi]
      );

      // 3. Eliminar de la taula activa
      await client.query(
        'DELETE FROM ocupacions_indicatius_actives WHERE usuari_id = $1',
        [usuariId]
      );

      await client.query('COMMIT');

      return {
        error: false,
        dades: {
          indicatiu_id: ocupacio.indicatiu_id,
          timestamp_inici: ocupacio.timestamp_inici,
          motiu_fi: motiuFi,
        },
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ==============================================================
  // LLISTAR INDICATIUS SELECCIONABLES
  // Retorna indicatius que NO estan ocupats
  // ==============================================================
  static async llistarSeleccionables() {
    const consulta = `
      SELECT
        i.id,
        i.codi,
        i.tipus_unitat,
        i.estat_operatiu,
        i.sector_assignat
      FROM indicatius i
      LEFT JOIN ocupacions_indicatius_actives oia ON oia.indicatiu_id = i.id
      WHERE oia.indicatiu_id IS NULL
      ORDER BY i.codi ASC
    `;
    const resultat = await pool.query(consulta);
    return resultat.rows;
  }

  // ==============================================================
  // VERIFICAR SI UN USUARI TÉ PERMÍS SOBRE UN INDICATIU
  // Útil per validar accions operatives (GPS, estat, etc.)
  // ==============================================================
  static async verificarPermis(usuariId, indicatiuId) {
    const consulta = `
      SELECT indicatiu_id
      FROM ocupacions_indicatius_actives
      WHERE usuari_id = $1 AND indicatiu_id = $2
    `;
    const resultat = await pool.query(consulta, [usuariId, indicatiuId]);
    return resultat.rows.length > 0;
  }
}

export default OcupacioIndicatiuActiva;