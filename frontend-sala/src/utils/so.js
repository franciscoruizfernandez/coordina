// src/utils/so.js
// Utilitat per generar sons d'alerta al navegador sense fitxers externs
// Usa la Web Audio API nativa del navegador

/**
 * Reprodueix un so de bip d'alerta
 * @param {number} frequencia - Freqüència en Hz (per defecte 880 = La agut)
 * @param {number} durada     - Durada en segons (per defecte 0.3)
 * @param {number} volum      - Volum entre 0 i 1 (per defecte 0.8)
 */
export const reproduirBip = (frequencia = 880, durada = 0.3, volum = 0.8) => {
  try {
    // Crear context d'àudio (compatible amb tots els navegadors moderns)
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return; // Navegador no compatible → silenci

    const context = new AudioContext();

    // Oscil·lador: genera la ona sonora
    const oscil_lador = context.createOscillator();
    oscil_lador.type = 'sine'; // Ona sinusoidal (so suau)
    oscil_lador.frequency.setValueAtTime(frequencia, context.currentTime);

    // Control de volum (GainNode)
    const guany = context.createGain();
    guany.gain.setValueAtTime(volum, context.currentTime);
    // Fade out progressiu al final per evitar "click" abrupte
    guany.gain.exponentialRampToValueAtTime(0.001, context.currentTime + durada);

    // Connectar: oscil·lador → guany → sortida
    oscil_lador.connect(guany);
    guany.connect(context.destination);

    // Iniciar i aturar
    oscil_lador.start(context.currentTime);
    oscil_lador.stop(context.currentTime + durada);

    // Alliberar recursos quan acabi
    oscil_lador.onended = () => context.close();
  } catch (err) {
    // Silenci si hi ha qualsevol error (ex: política d'autoplay del navegador)
    console.warn('⚠️ No s\'ha pogut reproduir el so:', err.message);
  }
};

/**
 * So específic per a incidències crítiques
 * Tres bips ràpids i aguts
 */
export const reproduirAlertaCritica = () => {
  reproduirBip(1200, 0.18, 0.9);
  setTimeout(() => {
    reproduirBip(1200, 0.18, 1);
  }, 220);
  setTimeout(() => {
    reproduirBip(1400, 0.7, 1);
  }, 450);
};

/**
 * So suau per a notificació informativa
 * Un bip curt i greu
 */
export const reproduirNotificacioInfo = () => {
  reproduirBip(600, 0.35, 0.5);
  setTimeout(() => {
    reproduirBip(650, 0.35, 0.5);
  }, 400);
};