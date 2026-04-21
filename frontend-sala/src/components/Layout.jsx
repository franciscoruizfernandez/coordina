import { Outlet } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function Layout() {
  const { dispatch, usuari } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuari");
    dispatch({ type: "LOGOUT" });
    navigate("/login");
  };

  return (
    <div className="h-screen flex flex-col">
      {/* ✅ Navbar superior */}
      <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <h1 className="text-lg font-semibold">COORDINA - Sala de Control</h1>

        {usuari && (
          <div className="flex items-center gap-4">
            <span>
              {usuari.username} ({usuari.rol})
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        )}
      </header>

      {/* ✅ Contingut principal (aquí anirà el mapa) */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;