import { Outlet } from "react-router-dom";

function Layout() {
  return (
    <div className="h-screen flex flex-col">
      <header className="bg-gray-800 text-white p-4">
        <h1 className="text-lg font-semibold">
          COORDINA - Sala de Control
        </h1>
      </header>

      <main className="flex-1 bg-gray-100">
        <Outlet />
      </main>
      
    </div>
  );
}

export default Layout;