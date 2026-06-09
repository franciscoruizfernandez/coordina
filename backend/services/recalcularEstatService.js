// backend/services/recalcularEstatService.js
//
// Servei central per recalcular l'estat d'una incidència
// en funció de les assignacions actives que té.
//
// S'usa cada cop que es crea, finalitza o cancel·la una assignació.
// Centralitza la lògica per evitar duplicitats i inconsistències.
//
// Regles:
//   - Si no queden assignacions actives → estat paràmetre (resolta/nova)
//   - Si queden actives i alguna acceptada → en_curs
//   - Si queden actives però cap acceptada → assignada

import Assignacio from '../models/Assignacio.js';
import Incidencia from '../models/Incidencia.js';
import { emetreCanviEstatIncidencia } from '../sockets/emissors.js';

// ==============================================================
// FUNCIÓ PRINCIPAL: Recalcular estat d'una incidència
//
// Paràmetres:
//   incidenciaId       - UUID de la incidència
//   estatSiSenseActives - estat a aplicar si no queden assignacions
//                         actives (ex: 'resolta' en finalització,
//                         'nova' en cancel·lació)
//
// Retorna: { estatAnterior, estatNou, actualitzat }
// ==============================================================
export const recalcularEstatIncidencia = async (incidenciaId, estatSiSenseActives) => {
  // 1. Obtenir l'estat actual de la incidència
  const incidencia = await Incidencia.trobarPerId(incidenciaId);

  if (!incidencia) {
    console.warn(`⚠️  [Recalcular] Incidència ${incidenciaId} no trobada`);
    return { estatAnterior: null, estatNou: null, actualitzat: false };
  }

  const estatAnterior = incidencia.estat;

  // No recalcular si ja està tancada
  if (estatAnterior === 'tancada') {
    return { estatAnterior, estatNou: estatAnterior, actualitzat: false };
  }

  // 2. Comptar assignacions actives i acceptades
  const [totalActives, totalAcceptades] = await Promise.all([
    Assignacio.comptarActivesPerIncidencia(incidenciaId),
    Assignacio.comptarActivesAcceptadesPerIncidencia(incidenciaId),
  ]);

  // 3. Determinar el nou estat
  let estatNou;

  if (totalActives === 0) {
    // Cap assignació activa → usar l'estat per defecte passat com a paràmetre
    estatNou = estatSiSenseActives;
  } else if (totalAcceptades > 0) {
    // Hi ha almenys una acceptada → en_curs
    estatNou = 'en_curs';
  } else {
    // Hi ha actives però cap acceptada → assignada
    estatNou = 'assignada';
  }

  // 4. Actualitzar només si ha canviat
  if (estatNou === estatAnterior) {
    return { estatAnterior, estatNou, actualitzat: false };
  }

  await Incidencia.canviarEstat(incidenciaId, estatNou);

  // 5. Emetre websocket
  emetreCanviEstatIncidencia(incidenciaId, estatAnterior, estatNou);

  console.log(
    `🔄 [Recalcular] Incidència ${incidenciaId}: ${estatAnterior} → ${estatNou} ` +
    `(${totalActives} actives, ${totalAcceptades} acceptades)`
  );

  return { estatAnterior, estatNou, actualitzat: true };
};

// ==============================================================
// HELPER: Determinar l'estat correcte després d'una nova assignació
//
// Regles:
//   - Si estava 'nova' → 'assignada'
//   - Si estava 'assignada' o 'en_curs' → es manté
//   - Si estava 'resolta' o 'tancada' → no hauria d'arribar aquí
//
// Retorna: { estatAnterior, estatNou, actualitzat }
// ==============================================================
export const actualitzarEstatPerNovaAssignacio = async (incidenciaId) => {
  const incidencia = await Incidencia.trobarPerId(incidenciaId);

  if (!incidencia) {
    return { estatAnterior: null, estatNou: null, actualitzat: false };
  }

  const estatAnterior = incidencia.estat;

  // Només canviem si estava en 'nova'
  if (estatAnterior === 'nova') {
    await Incidencia.canviarEstat(incidenciaId, 'assignada');
    emetreCanviEstatIncidencia(incidenciaId, estatAnterior, 'assignada');

    return { estatAnterior, estatNou: 'assignada', actualitzat: true };
  }

  // Si ja estava assignada o en_curs, no cal canviar res
  return { estatAnterior, estatNou: estatAnterior, actualitzat: false };
};