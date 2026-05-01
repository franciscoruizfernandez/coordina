// frontend-patrulles/src/pages/Login.jsx

import { useState, useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import api from '../services/api'
import { getSeleccioActual } from '../services/api'

function Login() {
  const { token, dispatch } = useContext(AuthContext)
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [carregant, setCarregant] = useState(false)

  // Si ja està autenticat, redirigir
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

      // ─── 3. Guardar token i usuari ────────────────────
      localStorage.setItem('token', jwtToken)
      localStorage.setItem('usuari', JSON.stringify(usuari))

      // ─── 4. Comprovar si ja té un indicatiu seleccionat
      try {
        const resSeleccio = await getSeleccioActual()

        if (resSeleccio.teSeleccio && resSeleccio.dades) {
          // Ja té indicatiu, el guardem
          const indicatiu = {
            id: resSeleccio.dades.indicatiu_id,
            codi: resSeleccio.dades.codi,
            tipus_unitat: resSeleccio.dades.tipus_unitat,
            estat_operatiu: resSeleccio.dades.estat_operatiu,
            ubicacio_lat: resSeleccio.dades.ubicacio_lat,
            ubicacio_lon: resSeleccio.dades.ubicacio_lon,
            sector_assignat: resSeleccio.dades.sector_assignat,
            incidencia_assignada_id: resSeleccio.dades.incidencia_assignada_id,
          }

          localStorage.setItem('indicatiu', JSON.stringify(indicatiu))

          dispatch({
            type: 'LOGIN',
            payload: { token: jwtToken, usuari, indicatiu },
          })

          navigate('/')
        } else {
          // No té indicatiu, ha d'anar a seleccionar-ne un
          dispatch({
            type: 'LOGIN',
            payload: { token: jwtToken, usuari, indicatiu: null },
          })

          navigate('/seleccio-indicatiu')
        }
      } catch (errSeleccio) {
        console.error('⚠️ Error comprovant selecció:', errSeleccio)
        // Si falla la comprovació, deixem que triï indicatiu
        dispatch({
          type: 'LOGIN',
          payload: { token: jwtToken, usuari, indicatiu: null },
        })

        navigate('/seleccio-indicatiu')
      }

    } catch (err) {
      console.error('❌ Error de login:', err)

      if (err.response && err.response.status === 401) {
        setError('Usuari o contrasenya incorrectes')
      } else if (err.response && err.response.data && err.response.data.missatge) {
        setError(err.response.data.missatge)
      } else {
        setError('Error de connexió amb el servidor')
      }

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
              Usuari
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