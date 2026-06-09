// backend/services/coberturaTimerService.js
//
// Gestiona els temporitzadors d'escalat automàtic.
// Quan una incidència crítica rep el seu segon indicatiu,
// programa un timer de 10s. Si passat aquest temps la incidència
// segueix en prioritat crítica, escala l'objectiu a 3 i intenta
// assignar un tercer indicatiu.
//
// En mode manual, emet un avís en comptes d'assignar automàticament.

import Incidencia from '../models/Incidencia.js';
import Assignacio from '../models/Assignacio.js';
import Configuracio from '../models/Configuracio.js';
import { calcularCobertura, emetreAvisCobertura } from './coberturaService.js';
import { intentarAutoassignarPendents } from './autoassignacioService.js';
import { emetreSala } from '../sockets/emissors.js';

// ==============================================================
// ESTAT EN MEMÒRIA — timers actius
// Map<incidenciaId, timeoutRef>
// ==============================================================
const timersEscalat = new Map();

// ==============================================================
// TEMPS D'ESPERA PER A L'ESCALAT (en ms)
// ==============================================================
const TEMPS_ESCALAT_MS = 10000; // 10 segons

// ==============================================================
// FUNCIÓ: Programar escalat per a una incidència crítica
// Es crida cada cop que s'assigna un indicatiu a una incidència crítica
// ==============================================================
export const programarEscalatSiCal = async (incidenciaId) => {
  try {
    // Obtenir la incidència
    const incidencia = await Incidencia.trobarPerId(incidenciaId);
    if (!incidencia) return;

    // Només per a crítiques actives
    if (incidencia.prioritat !== 'critica') return;
    if (['resolta', 'tancada'].includes(incidencia.estat)) return;

    // Comptar actius
    const actius = await Assignacio.comptarActivesPerIncidencia(incidenciaId);

    // Programar escalat quan arriba al segon indicatiu (objectiu bàsic complert)
    if (actius >= 2 && actius < 3) {
      // Si ja hi ha un timer, no crear-ne un altre
      if (timersEscalat.has(incidenciaId)) return;

      console.log(
        `⏱️  [Escalat] Timer programat per incidència ${incidenciaId} (${TEMPS_ESCALAT_MS / 1000}s)`
      );

      const timer = setTimeout(async () => {
        // Eliminar del mapa
        timersEscalat.delete(incidenciaId);

        try {
          // Verificar que la incidència segueix en crítica
          const incActual = await Incidencia.trobarPerId(incidenciaId);
          if (!incActual || incActual.prioritat !== 'critica') {
            console.log(`ℹ️  [Escalat] Incidència ${incidenciaId} ja no és crítica, cancel·lat`);
            return;
          }

          if (['resolta', 'tancada'].includes(incActual.estat)) {
            console.log(`ℹ️  [Escalat] Incidència ${incidenciaId} ja tancada, cancel·lat`);
            return;
          }

          // Comprovar dèficit actual
          const cobertura = await calcularCobertura(incidenciaId);

          if (cobertura.deficit <= 0) {
            console.log(`ℹ️  [Escalat] Incidència ${incidenciaId} ja té cobertura completa`);
            return;
          }

          console.log(
            `🚨 [Escalat] Incidència ${incidenciaId} segueix crítica → escalant a ${cobertura.objectiu}`
          );

          // Determinar mode
          const esModeAuto = await Configuracio.esModeAutomatic();

          if (esModeAuto) {
            // Mode auto: intentar assignar més indicatius
            await intentarAutoassignarPendents();

            emetreSala('reforc_assignat', {
              incidencia_id: incidenciaId,
              tipologia:     incActual.tipologia,
              prioritat:     incActual.prioritat,
              direccio:      incActual.direccio,
              missatge:      `Escalat automàtic: s'ha intentat enviar un tercer indicatiu`,
            });
          } else {
            // Mode manual: avisar a la sala
            emetreAvisCobertura(incActual, cobertura);
          }

        } catch (err) {
          console.error('❌ [Escalat] Error en timer d\'escalat:', err.message);
        }
      }, TEMPS_ESCALAT_MS);

      timersEscalat.set(incidenciaId, timer);
    }
  } catch (err) {
    console.error('❌ [Escalat] Error programant escalat:', err.message);
  }
};

// ==============================================================
// FUNCIÓ: Cancel·lar timer d'escalat
// S'usa quan la incidència canvia de prioritat o es tanca
// ==============================================================
export const cancellarEscalat = (incidenciaId) => {
  if (timersEscalat.has(incidenciaId)) {
    clearTimeout(timersEscalat.get(incidenciaId));
    timersEscalat.delete(incidenciaId);
    console.log(`ℹ️  [Escalat] Timer cancel·lat per incidència ${incidenciaId}`);
  }
};