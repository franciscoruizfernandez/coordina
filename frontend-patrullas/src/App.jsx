// frontend-patrulles/src/App.jsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import SeleccioIndicatiu from './pages/SeleccioIndicatiu'
import Dashboard from './pages/Dashboard'
import DetallIncidencia from './pages/DetallIncidencia'

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            {/* Ruta pública: Login */}
            <Route path="/login" element={<Login />} />

            {/* Ruta protegida: Selecció d'indicatiu */}
            <Route
              path="/seleccio-indicatiu"
              element={
                <ProtectedRoute>
                  <SeleccioIndicatiu />
                </ProtectedRoute>
              }
            />

            {/* Ruta protegida: Dashboard */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Ruta protegida: Detall d'incidència */}
            <Route
              path="/detall-incidencia"
              element={
                <ProtectedRoute>
                  <DetallIncidencia />
                </ProtectedRoute>
              }
            />

            {/* Qualsevol altra ruta → redirigir a / */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App