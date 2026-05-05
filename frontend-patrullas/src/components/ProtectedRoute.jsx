// frontend-patrulles/src/components/ProtectedRoute.jsx

import { useContext } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

function ProtectedRoute({ children }) {
  const { token, indicatiu } = useContext(AuthContext)
  const location = useLocation()

  // Si no hi ha token, redirigim a login
  if (!token) {
    return <Navigate to="/login" replace />
  }

  // Si estem intentant accedir al dashboard sense indicatiu,
  // redirigim a la pantalla de selecció
  // (excepte si ja estem a la pantalla de selecció)
  if (!indicatiu && location.pathname !== '/seleccio-indicatiu') {
    return <Navigate to="/seleccio-indicatiu" replace />
  }

  return children
}

export default ProtectedRoute