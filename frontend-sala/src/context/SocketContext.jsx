import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import { crearConnexioSocket, desconnectarSocket, obtenirSocket } from "../services/socket";

export const SocketContext = createContext();

export function SocketProvider({ children }) {
  const { token } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [connectat, setConnectat] = useState(false);

  useEffect(() => {
    // ✅ Si hi ha token, crear connexió
    if (token) {
      console.log("🔌 Inicialitzant connexió WebSocket...");
      const novaConnexio = crearConnexioSocket(token);

      // Event: connexió exitosa
      novaConnexio.on("connect", () => {
        console.log("✅ WebSocket connectat:", novaConnexio.id);
        setConnectat(true);
      });

      // Event: confirmació del servidor
      novaConnexio.on("connexio_exitosa", (data) => {
        console.log("✅ Servidor confirma connexió:", data);
      });

      // Event: desconnexió
      novaConnexio.on("disconnect", (reason) => {
        console.log("❌ WebSocket desconnectat:", reason);
        setConnectat(false);
      });

      // Event: error de connexió
      novaConnexio.on("connect_error", (error) => {
        console.error("❌ Error de connexió WebSocket:", error.message);
        setConnectat(false);
      });

      // Event: reconnexió
      novaConnexio.on("reconnect", (attempt) => {
        console.log(`✅ Reconnectat després de ${attempt} intents`);
        setConnectat(true);
      });

      setSocket(novaConnexio);

      // ✅ Cleanup quan es desmunta o canvia el token
      return () => {
        console.log("🧹 Netejant connexió WebSocket...");
        desconnectarSocket();
        setSocket(null);
        setConnectat(false);
      };
    } else {
      // Si no hi ha token, desconnectar
      if (socket) {
        desconnectarSocket();
        setSocket(null);
        setConnectat(false);
      }
    }
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, connectat }}>
      {children}
    </SocketContext.Provider>
  );
}