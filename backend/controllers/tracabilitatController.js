// backend/controllers/tracabilitatController.js

import EsdevenimentTracabilitat from '../models/EsdevenimentTracabilitat.js';

// ==============================================================
// GET /api/tracabilitat
// Llistar esdeveniments amb filtres i paginació
// US014 + US015
// ==============================================================
export const llistarEsdeveniments = async (req, res, next) => {
  try {
    const {
      pagina = 1,
      limit = 50,
      tipus_esdeveniment,
      usuari_id,
      incidencia_id,
      indicatiu_id,
      data_inici,
      data_fi,
    } = req.query;

    const paginaNum = parseInt(pagina);
    const limitNum  = Math.min(parseInt(limit), 200);

    if (isNaN(paginaNum) || paginaNum < 1) {
      return res.status(400).json({
        error: true,
        missatge: '"pagina" ha de ser un número positiu',
      });
    }

    const resultat = await EsdevenimentTracabilitat.llistar({
      pagina: paginaNum,
      limitPerPagina: limitNum,
      tipus_esdeveniment: tipus_esdeveniment || null,
      usuari_id:          usuari_id || null,
      incidencia_id:      incidencia_id || null,
      indicatiu_id:       indicatiu_id || null,
      data_inici:         data_inici || null,
      data_fi:            data_fi || null,
    });

    res.json({ exit: true, ...resultat });
  } catch (error) {
    console.error('❌ Error llistant traçabilitat:', error);
    next(error);
  }
};

// ==============================================================
// GET /api/tracabilitat/resum
// Estadístiques per tipus d'esdeveniment
// ==============================================================
export const obtenirResum = async (req, res, next) => {
  try {
    const resum = await EsdevenimentTracabilitat.obtenirResum();
    res.json({ exit: true, dades: resum });
  } catch (error) {
    next(error);
  }
};

// ==============================================================
// GET /api/tracabilitat/exportar/csv
// US015 (documentació i proves inclou exportació)
// ==============================================================
export const exportarCSV = async (req, res, next) => {
  try {
    const { tipus_esdeveniment, usuari_id, incidencia_id, indicatiu_id, data_inici, data_fi } = req.query;

    const esdeveniments = await EsdevenimentTracabilitat.obtenirTots({
      tipus_esdeveniment: tipus_esdeveniment || null,
      usuari_id:          usuari_id || null,
      incidencia_id:      incidencia_id || null,
      indicatiu_id:       indicatiu_id || null,
      data_inici:         data_inici || null,
      data_fi:            data_fi || null,
    });

    const capçaleres = [
      'id', 'timestamp', 'tipus_esdeveniment',
      'usuari_username', 'usuari_nom', 'usuari_rol',
      'incidencia_id', 'indicatiu_id', 'indicatiu_codi',
      'descripcio', 'dades_addicionals',
    ];

    const escaparCSV = (valor) => {
      if (valor === null || valor === undefined) return '';
      const str = typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };

    const filesCSV = [
      capçaleres.join(','),
      ...esdeveniments.map((e) =>
        capçaleres.map((c) => escaparCSV(e[c])).join(',')
      ),
    ];

    const nomFitxer = `tracabilitat_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nomFitxer}"`);
    res.send('\uFEFF' + filesCSV.join('\n'));
  } catch (error) {
    next(error);
  }
};

// ==============================================================
// GET /api/tracabilitat/exportar/json
// ==============================================================
export const exportarJSON = async (req, res, next) => {
  try {
    const { tipus_esdeveniment, usuari_id, incidencia_id, indicatiu_id, data_inici, data_fi } = req.query;

    const esdeveniments = await EsdevenimentTracabilitat.obtenirTots({
      tipus_esdeveniment: tipus_esdeveniment || null,
      usuari_id:          usuari_id || null,
      incidencia_id:      incidencia_id || null,
      indicatiu_id:       indicatiu_id || null,
      data_inici:         data_inici || null,
      data_fi:            data_fi || null,
    });

    const nomFitxer = `tracabilitat_${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nomFitxer}"`);

    res.json({
      metadades: {
        exportat_el: new Date().toISOString(),
        total_registres: esdeveniments.length,
        sistema: 'COORDINA - Sistema de Coordinació Operativa Policial',
        filtres: { tipus_esdeveniment, usuari_id, incidencia_id, indicatiu_id, data_inici, data_fi },
      },
      dades: esdeveniments,
    });
  } catch (error) {
    next(error);
  }
};