import { io } from "socket.io-client";
import { WS_URL } from "../config.js";

// ✅ URL del backend WebSocket
const SOCKET_URL = WS_URL;

let socketInstance = null;

// ==============================================================
// CREAR CONNEXIÓ WEBSOCKET
// ==============================================================
export const crearConnexioSocket = (token) => {
  if (socketInstance) {
    console.warn("⚠️  Socket ja existeix. Desconnectant...");
    socketInstance.disconnect();
  }

  socketInstance = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ["websocket"],
  });

  console.log("🔌 Connexió WebSocket creada");
  return socketInstance;
};

// ==============================================================
// OBTENIR INSTÀNCIA ACTUAL
// ==============================================================
export const obtenirSocket = () => {
  if (!socketInstance) {
    console.warn("⚠️  Socket no inicialitzat");
  }
  return socketInstance;
};

// ==============================================================
// DESCONNECTAR
// ==============================================================
export const desconnectarSocket = () => {
  if (socketInstance) {
    console.log("👋 Desconnectant WebSocket...");
    socketInstance.disconnect();
    socketInstance = null;
  }
};