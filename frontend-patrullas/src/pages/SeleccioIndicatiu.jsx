// frontend-patrulles/src/pages/SeleccioIndicatiu.jsx

import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { getIndicatiusSeleccionables, seleccionarIndicatiu } from '../services/api'

function SeleccioIndicatiu() {
  const { dispatch } = useContext(AuthContext)
  const navigate = useNavigate()

  const [indicatius, setIndicatius] = useState([])
  const [carregant, setCarregant] = useState(true)
  const [error, setError] = useState('')
  const [seleccionant, setSeleccionant] = useState(null) // ID de l'indicatiu que s'està seleccionant
  const [cercador, setCercador] = useState('')

  // ─── Carregar indicatius disponibles ─────────────────────────
  useEffect(() => {
    const carregar = async () => {
      try {
        const resposta = await getIndicatiusSeleccionables()
        setIndicatius(resposta.dades || [])
      } catch (err) {
        console.error('❌ Error carregant indicatius:', err)
        setError('Error carregant els indicatius disponibles')
      } finally {
        setCarregant(false)
      }
    }

    carregar()
  }, [])

  // ─── Filtrar per cercador ────────────────────────────────────
  const indicatiusFiltrats = indicatius.filter((ind) =>
    ind.codi.toLowerCase().includes(cercador.toLowerCase())
  )

  // ─── Seleccionar un indicatiu ────────────────────────────────
  const handleSeleccionar = async (indicatiu) => {
    setSeleccionant(indicatiu.id)
    setError('')

    try {
      const resposta = await seleccionarIndicatiu(indicatiu.id)

      if (resposta.exit) {
        // Guardar l'indicatiu al context i localStorage
        const indicatiuSeleccionat = {
          id: resposta.dades.indicatiu_id,
          codi: resposta.dades.codi,
          tipus_unitat: resposta.dades.tipus_unitat,
          estat_operatiu: resposta.dades.estat_operatiu,
          ubicacio_lat: resposta.dades.ubicacio_lat,
          ubicacio_lon: resposta.dades.ubicacio_lon,
          sector_assignat: resposta.dades.sector_assignat,
          incidencia_assignada_id: resposta.dades.incidencia_assignada_id,
        }

        localStorage.setItem('indicatiu', JSON.stringify(indicatiuSeleccionat))

        dispatch({
          type: 'SET_INDICATIU',
          payload: indicatiuSeleccionat,
        })

        // Anar al dashboard
        navigate('/')
      }
    } catch (err) {
      console.error('❌ Error seleccionant indicatiu:', err)

      if (err.response && err.response.data && err.response.data.missatge) {
        setError(err.response.data.missatge)
      } else {
        setError('Error seleccionant l\'indicatiu')
      }
    } finally {
      setSeleccionant(null)
    }
  }

  // ─── Logout ──────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuari')
    localStorage.removeItem('indicatiu')
    dispatch({ type: 'LOGOUT' })
    navigate('/login')
  }

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 p-4">

      {/* ─── Capçalera ─────────────────────────────── */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">Selecciona Indicatiu</h1>
            <p className="text-gray-400 text-sm">Tria el vehicle que portaràs avui</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm
                       rounded-xl px-4 py-2 transition-colors"
          >
            Sortir
          </button>
        </div>
      </div>

      {/* ─── Cercador ──────────────────────────────── */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Cerca per codi (ex: A101)..."
          value={cercador}
          onChange={(e) => setCercador(e.target.value)}
          className="w-full bg-gray-800 text-white text-lg rounded-2xl px-4 py-4
                     border border-gray-700 focus:border-blue-500 focus:outline-none
                     placeholder-gray-500"
        />
      </div>

      {/* ─── Missatge d'error ──────────────────────── */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300
                        rounded-2xl px-4 py-3 text-sm mb-4">
          {error}
        </div>
      )}

      {/* ─── Carregant ─────────────────────────────── */}
      {carregant && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-blue-400 mx-auto mb-3" viewBox="0 0 24 24">
              <circle
                className="opacity-25" cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4" fill="none"
              />
              <path
                className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="text-gray-400">Carregant indicatius...</p>
          </div>
        </div>
      )}

      {/* ─── Llista d'indicatius ───────────────────── */}
      {!carregant && indicatiusFiltrats.length === 0 && (
        <div className="bg-gray-800 rounded-2xl p-6 text-center">
          <p className="text-gray-400">
            {cercador
              ? 'No s\'han trobat indicatius amb aquest codi'
              : 'No hi ha indicatius disponibles'}
          </p>
        </div>
      )}

      {!carregant && indicatiusFiltrats.length > 0 && (
        <div className="space-y-3">
          {indicatiusFiltrats.map((ind) => (
            <button
              key={ind.id}
              onClick={() => handleSeleccionar(ind)}
              disabled={seleccionant !== null}
              className={`w-full bg-gray-800 hover:bg-gray-750 border-2 
                         rounded-2xl p-4 text-left transition-all
                         ${seleccionant === ind.id
                           ? 'border-blue-500 bg-blue-900/20'
                           : 'border-gray-700 hover:border-gray-600'
                         }
                         disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Icona segons tipus */}
                  <div className="text-3xl">
                    {ind.tipus_unitat === 'cotxe' && '🚔'}
                    {ind.tipus_unitat === 'moto' && '🏍️'}
                    {ind.tipus_unitat === 'furgoneta' && '🚐'}
                    {!['cotxe', 'moto', 'furgoneta'].includes(ind.tipus_unitat) && '🚗'}
                  </div>

                  <div>
                    {/* Codi de l'indicatiu */}
                    <p className="text-white text-xl font-bold">{ind.codi}</p>

                    {/* Tipus i sector */}
                    <p className="text-gray-400 text-sm">
                      {ind.tipus_unitat}
                      {ind.sector_assignat && ` • ${ind.sector_assignat}`}
                    </p>
                  </div>
                </div>

                {/* Indicador de selecció */}
                {seleccionant === ind.id ? (
                  <svg className="animate-spin h-6 w-6 text-blue-400" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4" fill="none"
                    />
                    <path
                      className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                ) : (
                  <div className="text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ─── Peu informatiu ────────────────────────── */}
      <p className="text-gray-600 text-xs text-center mt-6">
        {indicatius.length} indicatius disponibles
      </p>
    </div>
  )
}

export default SeleccioIndicatiu