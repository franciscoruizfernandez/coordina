import Mapa from "../components/Mapa";

function Dashboard() {
  return (
    <div className="h-full w-full">
      {/* ✅ De moment, només el mapa a pantalla completa */}
      <div className="flex-1">
        <Mapa />
      </div>
    </div>
  );
}

export default Dashboard;