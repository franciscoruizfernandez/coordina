// src/context/SocketContext.jsx
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import { AuthContext } from "./AuthContext";
import {
  crearConnexioSocket,
  desconnectarSocket,
} from "../services/socket";

export const SocketContext = createContext();

// ID únic per al toast de desconnexió (evita duplicats)
const TOAST_ID_DESCONNEXIO = "ws-desconnexio";

export function SocketProvider({ children }) {
  const { token } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [connectat, setConnectat] = useState(false);

  // Ref per saber si ja hem tingut ALGUNA connexió exitosa
  // Evita mostrar toast de desconnexió en el mount inicial
  // (quan el socket encara no s'ha connectat mai)
  const haConnectatAlguna = useRef(false);

  useEffect(() => {
    if (!token) {
      // Sense token → desconnectar si hi havia connexió
      desconnectarSocket();
      setSocket(null);
      setConnectat(false);
      haConnectatAlguna.current = false;
      return;
    }

    console.log("🔌 Inicialitzant connexió WebSocket...");
    const connexio = crearConnexioSocket(token);

    // ── CONNECT: primera connexió i reconnexions ──
    const handleConnect = () => {
      console.log("✅ WebSocket connectat:", connexio.id);
      setConnectat(true);

      if (haConnectatAlguna.current) {
        // És una REconnexió → tancar toast vermell + mostrar verd
        toast.dismiss(TOAST_ID_DESCONNEXIO);
        toast.success("✅ Connexió WebSocket restaurada", {
          autoClose: 3000,
        });
      }

      // Marcar que ja hem connectat almenys una vegada
      haConnectatAlguna.current = true;
    };

    // ── DISCONNECT: pèrdua de connexió ──
    const handleDisconnect = (reason) => {
      console.log("❌ WebSocket desconnectat:", reason);
      setConnectat(false);

      // Només mostrar toast si ja havíem connectat
      // (evita toast en logout o desmuntatge del component)
      if (haConnectatAlguna.current) {
        toast.error(
          "❌ Connexió perduda. Intentant reconnectar...",
          {
            toastId: TOAST_ID_DESCONNEXIO, // Evita duplicats
            autoClose: false,              // No tancar sol
            closeOnClick: false,           // No tancar per accident
          }
        );
      }
    };

    // ── CONNECT_ERROR: error en intentar connectar ──
    const handleConnectError = (error) => {
      console.error("❌ Error de connexió WebSocket:", error.message);
      setConnectat(false);
    };

    // ── CONFIRMACIÓ DEL SERVIDOR ──
    const handleConnexioExitosa = (data) => {
      console.log("✅ Servidor confirma connexió:", data);
    };

    // Registrar tots els listeners
    connexio.on("connect",          handleConnect);
    connexio.on("disconnect",       handleDisconnect);
    connexio.on("connect_error",    handleConnectError);
    connexio.on("connexio_exitosa", handleConnexioExitosa);

    setSocket(connexio);

    // Cleanup: es crida quan el token canvia o el component es desmunta
    return () => {
      console.log("🧹 Netejant connexió WebSocket...");

      // Eliminar listeners ABANS de desconnectar
      // (evita que el disconnect del cleanup mostri toast)
      haConnectatAlguna.current = false;
      connexio.off("connect",          handleConnect);
      connexio.off("disconnect",       handleDisconnect);
      connexio.off("connect_error",    handleConnectError);
      connexio.off("connexio_exitosa", handleConnexioExitosa);

      desconnectarSocket();
      setSocket(null);
      setConnectat(false);

      // Tancar toast de desconnexió si estava obert (ex: logout)
      toast.dismiss(TOAST_ID_DESCONNEXIO);
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, connectat }}>
      {children}
    </SocketContext.Provider>
  );
}