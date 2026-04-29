// frontend-patrulles/src/pages/Login.jsx

import { useState, useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import api from '../services/api'
import { getIndicatiuPerCodi } from '../services/api'

function Login() {
  const { token, dispatch } = useContext(AuthContext)
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [carregant, setCarregant] = useState(false)

  // Si ja està autenticat, redirigir al dashboard
  useEffect(() => {
    if (token) {
      navigate('/')
    }
  }, [token, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCarregant(true)

    try {
      // ─── 1. Fer login al backend ──────────────────────
      const response = await api.post('/auth/login', {
        username,
        password,
      })

      if (!response.data.exit) {
        setError('Credencials incorrectes')
        setCarregant(false)
        return
      }

      const { token: jwtToken, usuari } = response.data

      // ─── 2. Verificar que és una patrulla ─────────────
      if (usuari.rol !== 'patrulla') {
        setError('Aquesta app és només per a patrulles')
        setCarregant(false)
        return
      }

      // ─── 3. Buscar l'indicatiu associat ───────────────
      // El username de la patrulla conté el codi (ex: "patrulla101")
      // Intentem buscar l'indicatiu pel codi de patrulla
      // Per exemple: username "patrulla101" → codi indicatiu "A101" o similar
      // Busquem tots els indicatius i trobem el que correspon

      // Primer guardem el token per poder fer la crida autenticada
      localStorage.setItem('token', jwtToken)

      let indicatiu = null
      try {
        // Intentem obtenir tots els indicatius i buscar per qualsevol criteri
        const resIndicatius = await api.get('/indicatius')
        const indicatius = resIndicatius.data.dades

        // Busquem un indicatiu que tingui relació amb aquest usuari
        // Si no trobem cap match, la patrulla haurà de funcionar sense indicatiu
        // i el podrà configurar després
        if (indicatius && indicatius.length > 0) {
          // Opció 1: Buscar per un codi que contingui part del username
          indicatiu = indicatius.find((ind) => {
            const codiNormalitzat = ind.codi.toLowerCase().replace(/[-_\s]/g, '')
            const usernameNormalitzat = username.toLowerCase().replace(/[-_\s]/g, '')
            return (
              usernameNormalitzat.includes(codiNormalitzat) ||
              codiNormalitzat.includes(usernameNormalitzat)
            )
          })

          // Opció 2: Si no trobem match, agafem el primer disponible
          if (!indicatiu) {
            indicatiu = indicatius[0]
            console.warn(
              `⚠️ No s'ha trobat indicatiu per "${username}". S'ha assignat ${indicatiu.codi} per defecte.`
            )
          }
        }
      } catch (err) {
        console.error('⚠️ Error buscant indicatiu:', err.message)
        // Continuem sense indicatiu, no és crític per al login
      }

      // ─── 4. Guardar tot a localStorage ────────────────
      localStorage.setItem('usuari', JSON.stringify(usuari))
      if (indicatiu) {
        localStorage.setItem('indicatiu', JSON.stringify(indicatiu))
      }

      // ─── 5. Actualitzar context ───────────────────────
      dispatch({
        type: 'LOGIN',
        payload: {
          token: jwtToken,
          usuari,
          indicatiu,
        },
      })

      // ─── 6. Redirigir al dashboard ────────────────────
      navigate('/')
    } catch (err) {
      console.error('❌ Error de login:', err)

      if (err.response && err.response.status === 401) {
        setError('Usuari o contrasenya incorrectes')
      } else if (err.response && err.response.data && err.response.data.missatge) {
        setError(err.response.data.missatge)
      } else {
        setError('Error de connexió amb el servidor')
      }

      // Si ha fallat, netejem el token que hem guardat
      localStorage.removeItem('token')
    } finally {
      setCarregant(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* ─── Capçalera ─────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🚔</div>
          <h1 className="text-3xl font-bold text-white">COORDINA</h1>
          <p className="text-blue-400 mt-1">Accés Patrulles</p>
        </div>

        {/* ─── Formulari ─────────────────────────────── */}
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-2xl p-6 shadow-xl">
          {/* Camp username */}
          <div className="mb-4">
            <label className="block text-gray-400 text-sm mb-2">
              Codi de patrulla
            </label>
            <input
              type="text"
              placeholder="Ex: patrulla101"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-700 text-white text-lg rounded-xl px-4 py-4
                         border border-gray-600 focus:border-blue-500 focus:outline-none
                         placeholder-gray-500"
              autoComplete="username"
              required
              disabled={carregant}
            />
          </div>

          {/* Camp password */}
          <div className="mb-6">
            <label className="block text-gray-400 text-sm mb-2">
              Contrasenya
            </label>
            <input
              type="password"
              placeholder="Contrasenya"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 text-white text-lg rounded-xl px-4 py-4
                         border border-gray-600 focus:border-blue-500 focus:outline-none
                         placeholder-gray-500"
              autoComplete="current-password"
              required
              disabled={carregant}
            />
          </div>

          {/* Missatge d'error */}
          {error && (
            <div className="mb-4 bg-red-900/50 border border-red-700 text-red-300
                            rounded-xl px-4 py-3 text-sm text-center">
              {error}
            </div>
          )}

          {/* Botó submit */}
          <button
            type="submit"
            disabled={carregant}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800
                       disabled:cursor-not-allowed text-white text-lg font-semibold
                       rounded-xl px-4 py-4 transition-colors duration-200"
          >
            {carregant ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4" fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Connectant...
              </span>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        {/* ─── Peu ───────────────────────────────────── */}
        <p className="text-gray-600 text-xs text-center mt-6">
          COORDINA v1.0 — Sistema de Coordinació Policial
        </p>
      </div>
    </div>
  )
}

export default Login