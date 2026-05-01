// frontend-patrulles/src/pages/Configuracio.jsx

import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

// ─── Claus del localStorage per a les preferències ──────────
const CLAUS = {
  GPS_ACTIU: 'config_gps_actiu',
  INTERVAL_GPS: 'config_interval_gps',
  SO_ACTIU: 'config_so_actiu',
  VIBRACIO_ACTIVA: 'config_vibracio_activa',
}

// ─── Valors per defecte ─────────────────────────────────────
const DEFAULTS = {
  GPS_ACTIU: true,
  INTERVAL_GPS: 10,
  SO_ACTIU: true,
  VIBRACIO_ACTIVA: true,
}

// ─── Helpers per llegir/escriure preferències ────────────────
export function llegirPreferencia(clau, defecte) {
  try {
    const valor = localStorage.getItem(clau)
    if (valor === null) return defecte
    if (valor === 'true') return true
    if (valor === 'false') return false
    const num = Number(valor)
    return isNaN(num) ? valor : num
  } catch {
    return defecte
  }
}

function guardarPreferencia(clau, valor) {
  localStorage.setItem(clau, String(valor))
}

function Configuracio() {
  const navigate = useNavigate()
  const { usuari, indicatiu } = useContext(AuthContext)

  // ─── Estat de les preferències ────────────────────────────
  const [gpsActiu, setGpsActiu] = useState(
    () => llegirPreferencia(CLAUS.GPS_ACTIU, DEFAULTS.GPS_ACTIU)
  )
  const [intervalGps, setIntervalGps] = useState(
    () => llegirPreferencia(CLAUS.INTERVAL_GPS, DEFAULTS.INTERVAL_GPS)
  )
  const [soActiu, setSoActiu] = useState(
    () => llegirPreferencia(CLAUS.SO_ACTIU, DEFAULTS.SO_ACTIU)
  )
  const [vibracioActiva, setVibracioActiva] = useState(
    () => llegirPreferencia(CLAUS.VIBRACIO_ACTIVA, DEFAULTS.VIBRACIO_ACTIVA)
  )

  // ─── Estat de la PWA ──────────────────────────────────────
  const [versioSW, setVersioSW] = useState('—')
  const [estatSW, setEstatSW] = useState('Comprovant...')
  const [promptInstall, setPromptInstall] = useState(null)
  const [estaInstal·lada, setEstaInstal·lada] = useState(false)
  const [permisNotificacio, setPermisNotificacio] = useState(
    'Notification' in window ? Notification.permission : 'no suportat'
  )

  // ─── Comprovar estat del SW ───────────────────────────────
  useEffect(() => {
    const comprovar = async () => {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration()
        if (reg) {
          if (reg.active) {
            setEstatSW('Actiu ✅')
          } else if (reg.installing) {
            setEstatSW('Instal·lant...')
          } else if (reg.waiting) {
            setEstatSW('Actualització pendent')
          } else {
            setEstatSW('Registrat')
          }
        } else {
          setEstatSW('No registrat')
        }
      } else {
        setEstatSW('No suportat')
      }
    }

    comprovar()
  }, [])

  // ─── Escoltar el prompt d'instal·lació ───────────────────
  useEffect(() => {
    // Comprovar si ja està instal·lada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setEstaInstal·lada(true)
    }

    // Capturar el prompt d'instal·lació
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setPromptInstall(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  // ─── Handlers per canviar preferències ───────────────────
  const handleGpsActiu = (valor) => {
    setGpsActiu(valor)
    guardarPreferencia(CLAUS.GPS_ACTIU, valor)
  }

  const handleIntervalGps = (valor) => {
    setIntervalGps(valor)
    guardarPreferencia(CLAUS.INTERVAL_GPS, valor)
  }

  const handleSoActiu = (valor) => {
    setSoActiu(valor)
    guardarPreferencia(CLAUS.SO_ACTIU, valor)
  }

  const handleVibracioActiva = (valor) => {
    setVibracioActiva(valor)
    guardarPreferencia(CLAUS.VIBRACIO_ACTIVA, valor)
  }

  // ─── Instal·lar la PWA ────────────────────────────────────
  const handleInstallar = async () => {
    if (!promptInstall) return

    promptInstall.prompt()
    const { outcome } = await promptInstall.userChoice

    if (outcome === 'accepted') {
      setEstaInstal·lada(true)
      setPromptInstall(null)
    }
  }

  // ─── Demanar permís de notificació ───────────────────────
  const handleDemanarPermis = async () => {
    if (!('Notification' in window)) return

    const permis = await Notification.requestPermission()
    setPermisNotificacio(permis)
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 pb-8">

      {/* ─── Botó tornar ─────────────────────────────── */}
      <button
        onClick={() => navigate('/')}
        className="text-blue-400 mb-4 flex items-center gap-1 text-sm"
      >
        ← Tornar al dashboard
      </button>

      {/* ─── Capçalera ───────────────────────────────── */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">⚙️</span>
          <div>
            <h1 className="text-white text-xl font-bold">Configuració</h1>
            <p className="text-gray-400 text-sm">
              {usuari?.username} — {indicatiu?.codi || 'Sense indicatiu'}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Secció GPS ──────────────────────────────── */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-4">
          📍 Geolocalització
        </h2>

        {/* Toggle GPS actiu */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white text-sm font-medium">Enviament automàtic GPS</p>
            <p className="text-gray-500 text-xs">Envia la posició a la sala de control</p>
          </div>
          <button
            onClick={() => handleGpsActiu(!gpsActiu)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              gpsActiu ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow
                            transition-transform ${
                              gpsActiu ? 'translate-x-6' : 'translate-x-0.5'
                            }`}
            />
          </button>
        </div>

        {/* Slider freqüència GPS */}
        <div className={gpsActiu ? '' : 'opacity-40 pointer-events-none'}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-white text-sm font-medium">Freqüència d'actualització</p>
            <span className="text-blue-400 text-sm font-bold">{intervalGps}s</span>
          </div>
          <input
            type="range"
            min="5"
            max="30"
            step="5"
            value={intervalGps}
            onChange={(e) => handleIntervalGps(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-gray-500 text-xs mt-1">
            <span>5s (més precís)</span>
            <span>30s (menys bateria)</span>
          </div>
        </div>
      </div>

      {/* ─── Secció notificacions ─────────────────────── */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-4">
          🔔 Notificacions
        </h2>

        {/* Estat permís */}
        <div className="bg-gray-700 rounded-xl p-3 mb-4 flex items-center justify-between">
          <p className="text-gray-300 text-sm">Permís de notificació</p>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            permisNotificacio === 'granted'
              ? 'bg-green-600 text-white'
              : permisNotificacio === 'denied'
                ? 'bg-red-600 text-white'
                : 'bg-yellow-600 text-white'
          }`}>
            {permisNotificacio === 'granted' && 'Concedit ✅'}
            {permisNotificacio === 'denied' && 'Denegat ❌'}
            {permisNotificacio === 'default' && 'No demanat'}
            {permisNotificacio === 'no suportat' && 'No suportat'}
          </span>
        </div>

        {/* Botó demanar permís */}
        {permisNotificacio !== 'granted' && permisNotificacio !== 'no suportat' && (
          <button
            onClick={handleDemanarPermis}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm
                       font-semibold rounded-xl py-3 mb-4 transition-colors"
          >
            Permetre notificacions
          </button>
        )}

        {/* Toggle so */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white text-sm font-medium">So d'alerta</p>
            <p className="text-gray-500 text-xs">Beep en rebre nova assignació</p>
          </div>
          <button
            onClick={() => handleSoActiu(!soActiu)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              soActiu ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow
                            transition-transform ${
                              soActiu ? 'translate-x-6' : 'translate-x-0.5'
                            }`}
            />
          </button>
        </div>

        {/* Toggle vibració */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">Vibració</p>
            <p className="text-gray-500 text-xs">Vibrar en rebre nova assignació</p>
          </div>
          <button
            onClick={() => handleVibracioActiva(!vibracioActiva)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              vibracioActiva ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow
                            transition-transform ${
                              vibracioActiva ? 'translate-x-6' : 'translate-x-0.5'
                            }`}
            />
          </button>
        </div>
      </div>

      {/* ─── Secció instal·lació PWA ──────────────────── */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-4">
          📱 Aplicació
        </h2>

        {/* Estat Service Worker */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-gray-300 text-sm">Service Worker</p>
          <span className="text-gray-400 text-sm">{estatSW}</span>
        </div>

        {/* Estat instal·lació */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-300 text-sm">Estat</p>
          <span className={`text-sm font-semibold ${
            estaInstal·lada ? 'text-green-400' : 'text-yellow-400'
          }`}>
            {estaInstal·lada ? 'Instal·lada ✅' : 'Navegador 🌐'}
          </span>
        </div>

        {/* Botó instal·lar */}
        {!estaInstal·lada && promptInstall && (
          <button
            onClick={handleInstallar}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm
                       font-semibold rounded-xl py-3 transition-colors flex items-center
                       justify-center gap-2"
          >
            <span>📲</span>
            Instal·lar app al dispositiu
          </button>
        )}

        {!estaInstal·lada && !promptInstall && (
          <div className="bg-gray-700 rounded-xl p-3">
            <p className="text-gray-400 text-xs text-center">
              Per instal·lar l'app, usa el menú del navegador →
              "Instal·lar aplicació" o "Afegir a la pantalla d'inici"
            </p>
          </div>
        )}
      </div>

      {/* ─── Secció informació ───────────────────────── */}
      <div className="bg-gray-800 rounded-2xl p-4">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
          ℹ️ Informació
        </h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Versió</span>
            <span className="text-white text-sm">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Entorn</span>
            <span className="text-white text-sm">
              {import.meta.env.MODE === 'development' ? 'Desenvolupament' : 'Producció'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Backend</span>
            <span className="text-white text-sm font-mono text-xs">
              {import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}
            </span>
          </div>
        </div>
      </div>

    </div>
  )
}

export default Configuracio