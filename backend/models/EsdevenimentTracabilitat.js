// backend/models/EsdevenimentTracabilitat.js

import pool from '../config/database.js';

export const TIPUS_ESDEVENIMENT = {
  CREACIO_INCIDENCIA:     'creacio_incidencia',
  MODIFICACIO_INCIDENCIA: 'modificacio_incidencia',
  CANVI_ESTAT_INCIDENCIA: 'canvi_estat_incidencia',
  TANCAMENT_INCIDENCIA:   'tancament_incidencia',
  ASSIGNACIO_CREADA:      'assignacio_creada',
  ASSIGNACIO_ACCEPTADA:   'assignacio_acceptada',
  ASSIGNACIO_FINALITZADA: 'assignacio_finalitzada',
  ASSIGNACIO_CANCEL_LADA: 'assignacio_cancel_lada',
  CREACIO_INDICATIU:      'creacio_indicatiu',
  CANVI_ESTAT_INDICATIU:  'canvi_estat_indicatiu',
  ACTUALITZACIO_GPS:      'actualitzacio_gps',
  ACCES_USUARI:           'acces_usuari',
  LOGOUT_USUARI:          'logout_usuari',
  CREACIO_USUARI:         'creacio_usuari',
  MODIFICACIO_USUARI:     'modificacio_usuari',
};

class EsdevenimentTracabilitat {
  static async registrar({
    tipus_esdeveniment,
    usuari_id = null,
    incidencia_id = null,
    indicatiu_id = null,
    descripcio,
    dades_addicionals = null,
  }) {
    try {
      const consulta = `
        INSERT INTO esdeveniments_tracabilitat (
          timestamp,
          tipus_esdeveniment,
          usuari_id,
          incidencia_id,
          indicatiu_id,
          descripcio,
          dades_addicionals
        )
        VALUES (NOW(), $1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const resultat = await pool.query(consulta, [
        tipus_esdeveniment,
        usuari_id,
        incidencia_id,
        indicatiu_id,
        descripcio,
        dades_addicionals ? JSON.stringify(dades_addicionals) : null,
      ]);

      return resultat.rows[0];
    } catch (error) {
      // La traçabilitat MAI atura el flux principal
      console.error('❌ Error registrant traçabilitat:', error.message);
      return null;
    }
  }

  static async llistar({
    pagina = 1,
    limitPerPagina = 50,
    tipus_esdeveniment = null,
    usuari_id = null,
    incidencia_id = null,
    indicatiu_id = null,
    data_inici = null,
    data_fi = null,
  } = {}) {
    let condicions = [];
    let valors = [];
    let idx = 1;

    if (tipus_esdeveniment) { condicions.push(`et.tipus_esdeveniment = $${idx++}`); valors.push(tipus_esdeveniment); }
    if (usuari_id)          { condicions.push(`et.usuari_id = $${idx++}`);           valors.push(usuari_id); }
    if (incidencia_id)      { condicions.push(`et.incidencia_id = $${idx++}`);       valors.push(incidencia_id); }
    if (indicatiu_id)       { condicions.push(`et.indicatiu_id = $${idx++}`);        valors.push(indicatiu_id); }
    if (data_inici)         { condicions.push(`et.timestamp >= $${idx++}`);          valors.push(data_inici); }
    if (data_fi)            { condicions.push(`et.timestamp <= $${idx++}`);          valors.push(data_fi); }

    const clausulaWhere =
      condicions.length > 0 ? `WHERE ${condicions.join(' AND ')}` : '';

    const offset = (pagina - 1) * limitPerPagina;

    const consulta = `
      SELECT
        et.*,
        u.username     AS usuari_username,
        u.nom_complet  AS usuari_nom,
        u.rol          AS usuari_rol,
        ind.codi       AS indicatiu_codi
      FROM esdeveniments_tracabilitat et
      LEFT JOIN usuaris    u   ON et.usuari_id    = u.id
      LEFT JOIN indicatius ind ON et.indicatiu_id = ind.id
      ${clausulaWhere}
      ORDER BY et.timestamp DESC
      LIMIT $${idx++}
      OFFSET $${idx++}
    `;
    valors.push(limitPerPagina, offset);

    const consultaTotal = `
      SELECT COUNT(*) AS total
      FROM esdeveniments_tracabilitat et
      ${clausulaWhere}
    `;

    const [resEsdeveniments, resTotal] = await Promise.all([
      pool.query(consulta, valors),
      pool.query(consultaTotal, valors.slice(0, -2)),
    ]);

    return {
      esdeveniments: resEsdeveniments.rows,
      paginacio: {
        paginaActual: pagina,
        limitPerPagina,
        total: parseInt(resTotal.rows[0].total),
        totalPagines: Math.ceil(parseInt(resTotal.rows[0].total) / limitPerPagina),
      },
    };
  }

  static async obtenirTots({
    tipus_esdeveniment = null,
    usuari_id = null,
    incidencia_id = null,
    indicatiu_id = null,
    data_inici = null,
    data_fi = null,
  } = {}) {
    let condicions = [];
    let valors = [];
    let idx = 1;

    if (tipus_esdeveniment) { condicions.push(`et.tipus_esdeveniment = $${idx++}`); valors.push(tipus_esdeveniment); }
    if (usuari_id)          { condicions.push(`et.usuari_id = $${idx++}`);           valors.push(usuari_id); }
    if (incidencia_id)      { condicions.push(`et.incidencia_id = $${idx++}`);       valors.push(incidencia_id); }
    if (indicatiu_id)       { condicions.push(`et.indicatiu_id = $${idx++}`);        valors.push(indicatiu_id); }
    if (data_inici)         { condicions.push(`et.timestamp >= $${idx++}`);          valors.push(data_inici); }
    if (data_fi)            { condicions.push(`et.timestamp <= $${idx++}`);          valors.push(data_fi); }

    const clausulaWhere =
      condicions.length > 0 ? `WHERE ${condicions.join(' AND ')}` : '';

    const consulta = `
      SELECT
        et.*,
        u.username    AS usuari_username,
        u.nom_complet AS usuari_nom,
        u.rol         AS usuari_rol,
        ind.codi      AS indicatiu_codi
      FROM esdeveniments_tracabilitat et
      LEFT JOIN usuaris    u   ON et.usuari_id    = u.id
      LEFT JOIN indicatius ind ON et.indicatiu_id = ind.id
      ${clausulaWhere}
      ORDER BY et.timestamp DESC
    `;

    const resultat = await pool.query(consulta, valors);
    return resultat.rows;
  }

  static async obtenirResum() {
    const consulta = `
      SELECT
        tipus_esdeveniment,
        COUNT(*) AS total,
        MAX(timestamp) AS darrer_esdeveniment
      FROM esdeveniments_tracabilitat
      GROUP BY tipus_esdeveniment
      ORDER BY total DESC
    `;
    const resultat = await pool.query(consulta);
    return resultat.rows;
  }
}

export default EsdevenimentTracabilitat;