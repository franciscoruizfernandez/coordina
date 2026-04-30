// frontend-patrulles/src/services/api.js

import axios from 'axios'

// Base URL configurable via variables d'entorn
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Crear instància Axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

// ─── Interceptor de REQUEST ─────────────────────────────────
// Afegeix el JWT automàticament a cada petició
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Interceptor de RESPONSE ────────────────────────────────
// Si rebem un 401, el token ha expirat → redirigim a login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('⚠️ Token expirat. Redirigint a login...')
      localStorage.removeItem('token')
      localStorage.removeItem('usuari')
      localStorage.removeItem('indicatiu')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── INDICATIUS ─────────────────────────────────────────────

// Buscar indicatiu pel codi (ex: "A101")
// Retorna l'indicatiu sencer amb id, estat, ubicació, etc.
export const getIndicatiuPerCodi = async (codi) => {
  const response = await api.get('/indicatius', {
    params: { estat_operatiu: undefined },
  })
  // Filtrem al client perquè el backend no té endpoint de cerca per codi
  const indicatiu = response.data.dades.find(
    (ind) => ind.codi.toLowerCase() === codi.toLowerCase()
  )
  return indicatiu || null
}

// Obtenir detall d'un indicatiu per ID
export const getIndicatiu = async (id) => {
  const response = await api.get(`/indicatius/${id}`)
  return response.data
}

// ─── INCIDÈNCIES ────────────────────────────────────────────

export const getIncidencia = async (id) => {
  const response = await api.get(`/incidencies/${id}`)
  return response.data
}

// ─── ASSIGNACIONS ───────────────────────────────────────────

export const acceptarAssignacio = async (id) => {
  const response = await api.patch(`/assignacions/${id}/acceptar`)
  return response.data
}

export const finalitzarAssignacio = async (id, observacions = null) => {
  const response = await api.patch(`/assignacions/${id}/finalitzar`, {
    observacions,
  })
  return response.data
}

// ─── MISSATGES ──────────────────────────────────────────────

export const enviarMissatge = async (data) => {
  const response = await api.post('/missatges', data)
  return response.data
}

export const getMissatges = async (incidencia_id) => {
  const response = await api.get(`/missatges?incidencia_id=${incidencia_id}`)
  return response.data
}

// ─── SELECCIÓ D'INDICATIU ───────────────────────────────────

// Obtenir l'indicatiu seleccionat per l'usuari actual
export const getSeleccioActual = async () => {
  const response = await api.get('/indicatius/seleccio/actual')
  return response.data
}

// Llistar indicatius disponibles per seleccionar
export const getIndicatiusSeleccionables = async () => {
  const response = await api.get('/indicatius/seleccionables')
  return response.data
}

// Seleccionar un indicatiu
export const seleccionarIndicatiu = async (indicatiuId) => {
  const response = await api.post('/indicatius/seleccio', {
    indicatiu_id: indicatiuId,
  })
  return response.data
}

// Alliberar l'indicatiu actual
export const alliberarIndicatiu = async (motiuFi = 'logout') => {
  const response = await api.delete('/indicatius/seleccio', {
    data: { motiu_fi: motiuFi },
  })
  return response.data
}

// ─── HISTORIAL D'INCIDÈNCIA ─────────────────────────────────

export const getHistorialIncidencia = async (id) => {
  const response = await api.get(`/incidencies/${id}/historial`)
  return response.data
}

export default api