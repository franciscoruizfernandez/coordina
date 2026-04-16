// backend/models/Incidencia.js
import pool from '../config/database.js';

// ==============================================================
// CONSTANTS DE DOMINIO
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

export const PRIORITATS = ['baixa', 'mitjana', 'alta', 'critica'];

export const ESTATS = ['nova', 'assignada', 'en_curs', 'resolta', 'tancada'];

// ==============================================================
// CÀLCUL DE SECTOR TERRITORIAL
// Basant-nos en coordenades, assignem un sector
// Adaptat per a la Regió Policial Metropolitana Nord
// ==============================================================
export const calcularSector = (lat, lon) => {
  // Badalona i Sant Adrià
  if (lat >= 41.43 && lat <= 41.47 && lon >= 2.21 && lon <= 2.25) {
    return 'Badalona-Nord';
  }
  if (lat >= 41.40 && lat <= 41.43 && lon >= 2.21 && lon <= 2.25) {
    return 'Badalona-Sud';
  }
  // Santa Coloma de Gramenet
  if (lat >= 41.44 && lat <= 41.47 && lon >= 2.19 && lon <= 2.22) {
    return 'Santa-Coloma';
  }
  // Mataró
  if (lat >= 41.52 && lat <= 41.56 && lon >= 2.43 && lon <= 2.47) {
    return 'Mataro';
  }
  // Granollers
  if (lat >= 41.60 && lat <= 41.63 && lon >= 2.28 && lon <= 2.32) {
    return 'Granollers';
  }
  // Per defecte
  return 'Sector-General';
};

class Incidencia {
  // ==============================================================
  // LLISTAR INCIDÈNCIES AMB FILTRES I PAGINACIÓ
  // ==============================================================
  static async llistarTotes({
    pagina = 1,
    limitPerPagina = 20,
    estat = null,
    prioritat = null,
    tipologia = null,
    sector = null,
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
    if (sector) {
      condicions.push(`sector_territorial = $${idx++}`);
      valors.push(sector);
    }

    const clausulaWhere =
      condicions.length > 0 ? `WHERE ${condicions.join(' AND ')}` : '';

    const offset = (pagina - 1) * limitPerPagina;

    // Ordre per prioritat (crítica primer) i timestamp
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

    const consultaTotal = `
      SELECT COUNT(*) as total
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
        totalPagines: Math.ceil(parseInt(resTotal.rows[0].total) / limitPerPagina),
      },
    };
  }

  // ==============================================================
  // TROBAR PER ID
  // ==============================================================
  static async trobarPerId(id) {
    const consulta = `SELECT * FROM incidencies WHERE id = $1`;
    const resultat = await pool.query(consulta, [id]);
    return resultat.rows[0] || null;
  }

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
    observacions = null,
  }) {
    // Calcular sector automàticament
    const sector_territorial = calcularSector(
      parseFloat(ubicacio_lat),
      parseFloat(ubicacio_lon)
    );

    const consulta = `
      INSERT INTO incidencies (
        ubicacio_lat,
        ubicacio_lon,
        direccio,
        tipologia,
        prioritat,
        descripcio,
        observacions,
        sector_territorial,
        estat,
        timestamp_recepcio
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'nova', NOW())
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
      sector_territorial,
    ]);

    return resultat.rows[0];
  }

  // ==============================================================
  // ACTUALITZAR INCIDÈNCIA (PUT - actualització completa)
  // ==============================================================
  static async actualitzar(id, {
    ubicacio_lat,
    ubicacio_lon,
    direccio,
    tipologia,
    prioritat,
    descripcio,
    observacions,
  }) {
    // Recalcular sector si canvien les coordenades
    const sector_territorial = calcularSector(
      parseFloat(ubicacio_lat),
      parseFloat(ubicacio_lon)
    );

    const consulta = `
      UPDATE incidencies
      SET
        ubicacio_lat        = $1,
        ubicacio_lon        = $2,
        direccio            = $3,
        tipologia           = $4,
        prioritat           = $5,
        descripcio          = $6,
        observacions        = $7,
        sector_territorial  = $8,
        updated_at          = NOW()
      WHERE id = $9
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
      sector_territorial,
      id,
    ]);

    return resultat.rows[0] || null;
  }

  // ==============================================================
  // CANVIAR ESTAT (PATCH)
  // ==============================================================
  static async canviarEstat(id, nouEstat, observacions = null) {
    // Si es tanca, guardar timestamp de tancament
    const campsExtra =
      nouEstat === 'tancada'
        ? `, data_tancament = NOW()`
        : '';

    const consulta = `
      UPDATE incidencies
      SET
        estat       = $1,
        observacions = COALESCE($2, observacions)
        ${campsExtra},
        updated_at  = NOW()
      WHERE id = $3
      RETURNING *
    `;

    const resultat = await pool.query(consulta, [nouEstat, observacions, id]);
    return resultat.rows[0] || null;
  }

  // ==============================================================
  // TANCAMENT (soft delete - marca com tancada)
  // ==============================================================
  static async tancar(id, observacions = null) {
    return this.canviarEstat(id, 'tancada', observacions);
  }

  // ==============================================================
  // OBTENIR HISTORIAL D'ACCIONS D'UNA INCIDÈNCIA
  // ==============================================================
  static async obtenirHistorial(incidenciaId) {
    const consulta = `
      SELECT
        et.id,
        et.timestamp,
        et.tipus_esdeveniment,
        et.descripcio,
        et.dades_addicionals,
        u.username   AS usuari_username,
        u.nom_complet AS usuari_nom,
        u.rol        AS usuari_rol,
        i.codi       AS indicatiu_codi
      FROM esdeveniments_tracabilitat et
      LEFT JOIN usuaris   u ON et.usuari_id    = u.id
      LEFT JOIN indicatius i ON et.indicatiu_id = i.id
      WHERE et.incidencia_id = $1
      ORDER BY et.timestamp ASC
    `;
    const resultat = await pool.query(consulta, [incidenciaId]);
    return resultat.rows;
  }

  // ==============================================================
  // OBTENIR INCIDÈNCIES ACTIVES (no tancades/resoltes)
  // Útil per al mapa en temps real
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
}

export default Incidencia;