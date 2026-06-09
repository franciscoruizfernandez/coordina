// src/services/api.js

import axios from "axios";

// ✅ Base URL configurable
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// ✅ Crear instància axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// ─── Interceptor de request → afegir JWT automàticament ─────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Interceptor de response → gestionar errors de forma amigable ─
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Sense resposta del servidor (xarxa caiguda, timeout, etc.)
    if (!error.response) {
      error.missatgeAmigable = "No s'ha pogut connectar amb el servidor. Comprova la connexió a internet.";
      return Promise.reject(error);
    }

    const status = error.response.status;
    const missatgeBackend = error.response.data?.missatge || error.response.data?.message;

    switch (status) {
      case 400:
        error.missatgeAmigable = missatgeBackend || "Les dades enviades no són correctes.";
        break;
      case 401:
        // Token expirat o invàlid → redirigir a login
        localStorage.removeItem("token");
        localStorage.removeItem("usuari");
        window.location.href = "/login";
        error.missatgeAmigable = "La sessió ha expirat. Torna a iniciar sessió.";
        break;
      case 403:
        error.missatgeAmigable = "No tens permisos per fer aquesta acció.";
        break;
      case 404:
        error.missatgeAmigable = missatgeBackend || "El recurs sol·licitat no s'ha trobat.";
        break;
      case 409:
        error.missatgeAmigable = missatgeBackend || "Conflicte: aquesta acció no es pot completar.";
        break;
      case 500:
        error.missatgeAmigable = "Error intern del servidor. Torna-ho a intentar més tard.";
        break;
      case 502:
      case 503:
        error.missatgeAmigable = "El servidor no està disponible en aquest moment.";
        break;
      default:
        error.missatgeAmigable = missatgeBackend || "S'ha produït un error inesperat.";
    }

    return Promise.reject(error);
  }
);

// ─── Helper per obtenir missatge d'error amigable ───────────
export const obtenirMissatgeError = (error) => {
  if (error.missatgeAmigable) return error.missatgeAmigable;
  if (error.response?.data?.missatge) return error.response.data.missatge;
  if (error.message === 'Network Error') return "No s'ha pogut connectar amb el servidor.";
  if (error.code === 'ECONNABORTED') return "La petició ha trigat massa. Torna-ho a intentar.";
  return "S'ha produït un error inesperat.";
};

// ================= INCIDÈNCIES =================

export const getIncidencies = async () => {
  const response = await api.get("/incidencies");
  return response.data;
};

export const getIncidencia = async (id) => {
  const response = await api.get(`/incidencies/${id}`);
  return response.data;
};

export const updateIncidencia = async (id, data) => {
  const response = await api.put(`/incidencies/${id}`, data);
  return response.data;
};

export const canviarEstatIncidencia = async (id, estat) => {
  const response = await api.patch(`/incidencies/${id}/estat`, { estat });
  return response.data;
};

// ================= INDICATIUS =================

export const getIndicatius = async () => {
  const response = await api.get("/indicatius");
  return response.data;
};

export const getIndicatiu = async (id) => {
  const response = await api.get(`/indicatius/${id}`);
  return response.data;
};

export const getIndicatiusDisponibles = async () => {
  const response = await api.get("/indicatius/disponibles");
  return response.data;
};

export const getHistorialIndicatiu = async (id) => {
  const response = await api.get(`/indicatius/${id}/historial`);
  return response.data;
};

export const canviarEstatIndicatiu = async (id, estat_operatiu) => {
  const response = await api.patch(`/indicatius/${id}/estat`, {
    estat_operatiu,
  });
  return response.data;
};

// ================= ASSIGNACIONS =================

export const assignacioManual = async (data) => {
  const response = await api.post("/assignacions", data);
  return response.data;
};

export const assignacioAutomatica = async (incidencia_id) => {
  const response = await api.post("/assignacions/automatica", {
    incidencia_id,
  });
  return response.data;
};

// ================= MISSATGES =================

export const enviarMissatge = async (data) => {
  const response = await api.post("/missatges", data);
  return response.data;
};

export const getMissatges = async (incidencia_id) => {
  const response = await api.get(`/missatges?incidencia_id=${incidencia_id}`);
  return response.data;
};

// ================= HISTORIAL =================

export const getHistorialIncidencia = async (id) => {
  const response = await api.get(`/incidencies/${id}/historial`);
  return response.data;
};

// ================= ASSIGNACIÓ: OBTENIR PER INCIDÈNCIA =================

export const getAssignacioActiva = async (incidencia_id) => {
  const response = await api.get(`/incidencies/${incidencia_id}`);
  return response.data;
};

// ─── RUTES OSRM (via proxy backend) ─────────────────────────

export const obtenirRutaOSRM = async (latOrigen, lonOrigen, latDesti, lonDesti) => {
  if (latOrigen == null || lonOrigen == null || latDesti == null || lonDesti == null) {
    return null;
  }

  try {
    const response = await api.get("/indicatius/ruta", {
      params: { latOrigen, lonOrigen, latDesti, lonDesti },
    });

    const dades = response.data;

    if (dades.code !== "Ok" || !dades.routes || dades.routes.length === 0) {
      return null;
    }

    const ruta = dades.routes[0];

    return {
      distancia_km: Math.round((ruta.distance / 1000) * 10) / 10,
      distancia_text:
        ruta.distance < 1000
          ? `${Math.round(ruta.distance)} m`
          : `${(ruta.distance / 1000).toFixed(1)} km`,
      temps_minuts: Math.round(ruta.duration / 60),
      temps_text:
        ruta.duration < 60
          ? "< 1 min"
          : `${Math.round(ruta.duration / 60)} min`,
    };
  } catch (error) {
    console.error("❌ Error obtenint ruta OSRM:", error.message);
    return null;
  }
};

// ─── STREAMS DE VÍDEO ───────────────────────────────────────

export const getStreamsPerIncidencia = async (incidenciaId) => {
  const response = await api.get(`/streams?incidencia_id=${incidenciaId}`);
  return response.data;
};

export const getStreamsPerIndicatiu = async (indicatiuId) => {
  const response = await api.get(`/streams?indicatiu_id=${indicatiuId}`);
  return response.data;
};

export const getTotsStreams = async () => {
  const response = await api.get("/streams");
  return response.data;
};

// ================= CONFIGURACIÓ =================

export const obtenirModeAssignacio = async () => {
  const response = await api.get("/configuracio/mode");
  return response.data;
};

export const establirModeAssignacio = async (mode) => {
  const response = await api.put("/configuracio/mode", { mode });
  return response.data;
};

export default api;