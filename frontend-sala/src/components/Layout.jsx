import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Outlet } from "react-router-dom";

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
      <header className="bg-gray-800 text-white p-4 flex justify-between">
        <h1>COORDINA - Sala de Control</h1>
        {usuari && (
          <div>
            {usuari.username} ({usuari.rol})
            <button
              onClick={handleLogout}
              className="ml-4 bg-red-600 px-2 py-1 rounded"
            >
              Logout
            </button>
          </div>
        )}
      </header>
      <main className="flex-1 bg-gray-100">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout