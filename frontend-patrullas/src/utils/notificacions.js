// frontend-patrulles/src/utils/notificacions.js

// ==============================================================
// SOL·LICITAR PERMÍS DE NOTIFICACIÓ
// S'ha de cridar un cop al carregar l'app (després de login)
// ==============================================================
export function demanarPermisNotificacions() {
  if (!('Notification' in window)) {
    console.warn('⚠️ Aquest navegador no suporta notificacions')
    return
  }

  if (Notification.permission === 'default') {
    Notification.requestPermission().then((permis) => {
      console.log(`🔔 Permís de notificació: ${permis}`)
    })
  }
}

// ==============================================================
// MOSTRAR NOTIFICACIÓ NATIVA DEL NAVEGADOR
// ==============================================================
export function mostrarNotificacio(titol, opcions = {}) {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  try {
    const notificacio = new Notification(titol, {
      icon: '/icones/icon-192x192.png',
      badge: '/icones/icon-192x192.png',
      ...opcions,
    })

    // Tancar automàticament després de 8 segons
    setTimeout(() => notificacio.close(), 8000)

    // Si l'usuari clica la notificació, portar el focus a l'app
    notificacio.onclick = () => {
      window.focus()
      notificacio.close()
    }
  } catch (err) {
    console.error('❌ Error mostrant notificació:', err)
  }
}

// ==============================================================
// FER VIBRAR EL DISPOSITIU
// Patró: vibra 200ms, pausa 100ms, vibra 200ms
// ==============================================================
export function vibrar() {
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200])
  }
}

// ==============================================================
// REPRODUIR SO D'ALERTA
// Genera un beep curt usant l'API d'àudio del navegador
// ==============================================================
export function reproduirSoAlerta() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()

    // Primer beep
    const tocarBeep = (temps) => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 880 // Nota A5 (aguda)
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + temps)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + temps + 0.3)

      oscillator.start(audioContext.currentTime + temps)
      oscillator.stop(audioContext.currentTime + temps + 0.3)
    }

    // Dos beeps seguits
    tocarBeep(0)
    tocarBeep(0.4)
  } catch (err) {
    console.error('⚠️ Error reproduint so:', err)
  }
}

// ==============================================================
// ALERTAR ASSIGNACIÓ
// Combina: notificació + vibració + so
// ==============================================================
export function alertarAssignacio(incidencia, indicatiu) {
  const tipologia = incidencia?.tipologia?.replace(/_/g, ' ') || 'Incidència'
  const prioritat = incidencia?.prioritat?.toUpperCase() || ''
  const direccio = incidencia?.direccio || 'Ubicació desconeguda'

  // 1. Notificació nativa
  mostrarNotificacio(`🚨 Nova assignació - ${prioritat}`, {
    body: `${tipologia}\n📍 ${direccio}`,
    tag: 'assignacio-nova', // Evita duplicats
    requireInteraction: true, // No es tanca sola en mòbil
  })

  // 2. Vibrar
  vibrar()

  // 3. So
  reproduirSoAlerta()
}