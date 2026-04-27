// src/config.js
export const API_URL = import.meta.env.VITE_API_URL;
export const WS_URL = import.meta.env.VITE_WS_URL;

if (!API_URL || !WS_URL) {
  throw new Error("Faltan variables de entorno");
}