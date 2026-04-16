// backend/models/Incidencia.js
import pool from '../config/database.js';

// ==============================================================
// CONSTANTS DE DOMINI
// Adaptades al CHECK de la BD
// ==============================================================
export const TIPOLOGIES = [
  'robatori',
  'accident',
  'altercat',
  'violencia_domestica',
  'incendi',
  'desaparegut',
  'drogues',
  'ordre_public',
  'altres',
];

// Exactament els valors del CHECK a la BD
export const PRIORITATS = ['baixa', 'mitjana', 'alta', 'critica'];

// Exactament els valors del CHECK a la BD
export const ESTATS = ['nova', 'assignada', 'en_curs', 'resolta', 'tancada'];

class Incidencia {
  // ==============================================================
  // LLISTAR AMB FILTRES I PAGINACIÓ
  // ==============================================================
  static async llistarTotes({
    pagina = 1,
    limitPerPagina = 20,
    estat = null,
    prioritat = null,
    tipologia = null,
  } = {}) {
    let condicions = [];
    let valors = [];
    let idx = 1;

    if (estat) {
      condicions.push(`estat = $${idx++}`);
      valors.push(estat);
    }
    if (prioritat) {
      condicions.push(`prioritat = $${idx++}`);
      valors.push(prioritat);
    }
    if (tipologia) {
      condicions.push(`tipologia = $${idx++}`);
      valors.push(tipologia);
    }

    const clausulaWhere =
      condicions.length > 0 ? `WHERE ${condicions.join(' AND ')}` : '';

    const offset = (pagina - 1) * limitPerPagina;

    // Ordenar per prioritat (crítica primer) i després per timestamp
    const consulta = `
      SELECT *
      FROM incidencies
      ${clausulaWhere}
      ORDER BY
        CASE prioritat
          WHEN 'critica' THEN 1
          WHEN 'alta'    THEN 2
          WHEN 'mitjana' THEN 3
          WHEN 'baixa'   THEN 4
          ELSE 5
        END,
        timestamp_recepcio DESC
      LIMIT $${idx++}
      OFFSET $${idx++}
    `;
    valors.push(limitPerPagina, offset);

    // Consulta del total per a la paginació (sense LIMIT/OFFSET)
    const consultaTotal = `
      SELECT COUNT(*) AS total
      FROM incidencies
      ${clausulaWhere}
    `;

    const [resIncidencies, resTotal] = await Promise.all([
      pool.query(consulta, valors),
      pool.query(consultaTotal, valors.slice(0, -2)),
    ]);

    return {
      incidencies: resIncidencies.rows,
      paginacio: {
        paginaActual: pagina,
        limitPerPagina,
        total: parseInt(resTotal.rows[0].total),
        totalPagines: Math.ceil(
          parseInt(resTotal.rows[0].total) / limitPerPagina
        ),
      },
    };
  }

  // ==============================================================
  // TROBAR PER ID
  // ==============================================================
  static async trobarPerId(id) {
    const consulta = `
      SELECT *
      FROM incidencies
      WHERE id = $1
    `;
    const resultat = await pool.query(consulta, [id]);
    return resultat.rows[0] || null;
  }

  // ==============================================================
  // CREAR INCIDÈNCIA
  // Columnes exactes de la BD: sense sector_territorial
  // ==============================================================
  static async crear({
    ubicacio_lat,
    ubicacio_lon,
    direccio = null,
    tipologia,
    prioritat,
    descripcio,
    observacions = null,
  }) {
    const consulta = `
      INSERT INTO incidencies (
        ubicacio_lat,
        ubicacio_lon,
        direccio,
        tipologia,
        prioritat,
        descripcio,
        observacions,
        estat,
        timestamp_recepcio
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'nova', NOW())
      RETURNING *
    `;

    const resultat = await pool.query(consulta, [
      ubicacio_lat,
      ubicacio_lon,
      direccio,
      tipologia,
      prioritat,
      descripcio,
      observacions,
    ]);

    return resultat.rows[0];
  }

  // ==============================================================
  // ACTUALITZAR INCIDÈNCIA (PUT - actualització completa)
  // ==============================================================
  static async actualitzar(
    id,
    {
      ubicacio_lat,
      ubicacio_lon,
      direccio,
      tipologia,
      prioritat,
      descripcio,
      observacions,
    }
  ) {
    const consulta = `
      UPDATE incidencies
      SET
        ubicacio_lat  = $1,
        ubicacio_lon  = $2,
        direccio      = $3,
        tipologia     = $4,
        prioritat     = $5,
        descripcio    = $6,
        observacions  = $7,
        updated_at    = NOW()
      WHERE id = $8
      RETURNING *
    `;

    const resultat = await pool.query(consulta, [
      ubicacio_lat,
      ubicacio_lon,
      direccio,
      tipologia,
      prioritat,
      descripcio,
      observacions,
      id,
    ]);

    return resultat.rows[0] || null;
  }

  // ==============================================================
  // CANVIAR ESTAT (PATCH)
  // Si es tanca, guarda data_tancament
  // ==============================================================
  static async canviarEstat(id, nouEstat, observacions = null) {
    // Si el nou estat és 'tancada', guardem la data de tancament
    const consulta =
      nouEstat === 'tancada'
        ? `
          UPDATE incidencies
          SET
            estat          = $1,
            observacions   = COALESCE($2, observacions),
            data_tancament = NOW(),
            updated_at     = NOW()
          WHERE id = $3
          RETURNING *
        `
        : `
          UPDATE incidencies
          SET
            estat        = $1,
            observacions = COALESCE($2, observacions),
            updated_at   = NOW()
          WHERE id = $3
          RETURNING *
        `;

    const resultat = await pool.query(consulta, [nouEstat, observacions, id]);
    return resultat.rows[0] || null;
  }

  // ==============================================================
  // TANCAR INCIDÈNCIA (soft delete)
  // No elimina el registre, marca com tancada
  // ==============================================================
  static async tancar(id, observacions = null) {
    return this.canviarEstat(id, 'tancada', observacions);
  }

  // ==============================================================
  // OBTENIR INCIDÈNCIES ACTIVES (no tancades ni resoltes)
  // Per al mapa en temps real del frontend
  // ==============================================================
  static async obtenirActives() {
    const consulta = `
      SELECT *
      FROM incidencies
      WHERE estat NOT IN ('tancada', 'resolta')
      ORDER BY
        CASE prioritat
          WHEN 'critica' THEN 1
          WHEN 'alta'    THEN 2
          WHEN 'mitjana' THEN 3
          WHEN 'baixa'   THEN 4
        END,
        timestamp_recepcio DESC
    `;
    const resultat = await pool.query(consulta);
    return resultat.rows;
  }

  // ==============================================================
  // OBTENIR HISTORIAL D'ACCIONS D'UNA INCIDÈNCIA
  // JOIN amb tracabilitat, usuaris i indicatius
  // ==============================================================
  static async obtenirHistorial(incidenciaId) {
    const consulta = `
      SELECT
        et.id,
        et.timestamp,
        et.tipus_esdeveniment,
        et.descripcio,
        et.dades_addicionals,
        u.username    AS usuari_username,
        u.nom_complet AS usuari_nom,
        u.rol         AS usuari_rol,
        i.codi        AS indicatiu_codi
      FROM esdeveniments_tracabilitat et
      LEFT JOIN usuaris    u ON et.usuari_id    = u.id
      LEFT JOIN indicatius i ON et.indicatiu_id = i.id
      WHERE et.incidencia_id = $1
      ORDER BY et.timestamp ASC
    `;
    const resultat = await pool.query(consulta, [incidenciaId]);
    return resultat.rows;
  }
}

export default Incidencia;