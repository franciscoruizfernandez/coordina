import { Outlet, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { SocketContext } from "../context/SocketContext";
import { useNavigate } from "react-router-dom";

function Layout() {
  const { dispatch, usuari } = useContext(AuthContext);
  const { connectat } = useContext(SocketContext);
  const navigate = useNavigate();
  const location = useLocation();

  const esAdmin = usuari?.rol === 'administrador';
  const esPaginaAdmin = location.pathname === '/admin';

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuari");
    dispatch({ type: "LOGOUT" });
    navigate("/login");
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Skip link per saltar directament al contingut */}

      <header
        className="bg-gray-800 text-white p-4 flex justify-between items-center"
        role="banner"
      >
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">
            COORDINA - Sala de Control
          </h1>

          {/* Indicador de connexió WebSocket */}
          <div
            className="flex items-center gap-2"
            role="status"
            aria-live="polite"
            aria-label={connectat ? "Connexió WebSocket activa" : "Connexió WebSocket inactiva"}
          >
            <div
              className={`w-3 h-3 rounded-full ${
                connectat ? "bg-green-500" : "bg-red-500"
              }`}
              aria-hidden="true"
            />
            <span className="text-xs text-gray-300">
              {connectat ? "Connectat" : "Desconnectat"}
            </span>
          </div>
        </div>

        {usuari && (
          <nav className="flex items-center gap-4" aria-label="Menú d'usuari">
            <span className="text-sm" aria-label={`Usuari: ${usuari.username}, Rol: ${usuari.rol}`}>
              {usuari.username} ({usuari.rol})
            </span>

            {/* Botó admin / dashboard segons la pàgina actual */}
            {esAdmin && (
              <button
                onClick={() => navigate(esPaginaAdmin ? '/' : '/admin')}
                className="bg-gray-600 px-3 py-1 rounded hover:bg-gray-500 text-sm
                           transition-colors flex items-center gap-1"
                aria-label={esPaginaAdmin ? 'Anar al dashboard' : 'Panell d\'administració'}
              >
                {esPaginaAdmin ? '🗺️ Dashboard' : '⚙️ Admin'}
              </button>
            )}

            <button
              onClick={handleLogout}
              className="bg-red-600 px-3 py-1 rounded hover:bg-red-700 text-sm
                         transition-colors"
              aria-label="Tancar sessió"
            >
              Logout
            </button>
          </nav>
        )}
      </header>

      <main className="flex-1 overflow-hidden" role="main">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;