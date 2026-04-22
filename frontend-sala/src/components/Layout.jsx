import { Outlet } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { SocketContext } from "../context/SocketContext"; // 🆕
import { useNavigate } from "react-router-dom";

function Layout() {
  const { dispatch, usuari } = useContext(AuthContext);
  const { connectat } = useContext(SocketContext); // 🆕
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuari");
    dispatch({ type: "LOGOUT" });
    navigate("/login");
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">COORDINA - Sala de Control</h1>

          {/* ✅ Indicador de connexió WebSocket */}
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                connectat ? "bg-green-500" : "bg-red-500"
              }`}
              title={connectat ? "WebSocket connectat" : "WebSocket desconnectat"}
            ></div>
            <span className="text-xs text-gray-300">
              {connectat ? "Connectat" : "Desconnectat"}
            </span>
          </div>
        </div>

        {usuari && (
          <div className="flex items-center gap-4">
            <span className="text-sm">
              {usuari.username} ({usuari.rol})
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-600 px-3 py-1 rounded hover:bg-red-700 text-sm"
            >
              Logout
            </button>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;