// frontend-patrulles/src/components/ProtectedRoute.jsx

import { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

function ProtectedRoute({ children }) {
  const { token } = useContext(AuthContext)

  // Si no hi ha token, redirigim a login
  if (!token) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute