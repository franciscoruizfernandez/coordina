// frontend-patrulles/src/App.jsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import SeleccioIndicatiu from './pages/SeleccioIndicatiu'
import Dashboard from './pages/Dashboard'
import DetallIncidencia from './pages/DetallIncidencia'
import FinalitzarServei from './pages/FinalitzarServei'
import ActualitzacioSW from './components/ActualitzacioSW'

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
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

            {/* Ruta protegida: Finalitzar servei */}
            <Route
              path="/finalitzar"
              element={
                <ProtectedRoute>
                  <FinalitzarServei />
                </ProtectedRoute>
              }
            />

            {/* Qualsevol altra ruta → redirigir a / */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>

        <ActualitzacioSW />

      </SocketProvider>
    </AuthProvider>
  )
}

export default App