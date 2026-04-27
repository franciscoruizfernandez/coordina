// src/services/api.js

import axios from "axios";
import { API_URL } from "../config";

// ✅ Base URL configurable
const API_BASE_URL = API_URL;

// ✅ Crear instància axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// ✅ Interceptor de request → afegir JWT automàticament
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ Interceptor de response → gestionar 401 (token expirat)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Token expirat o invàlid. Redirigint a login...");

      // Eliminar token
      localStorage.removeItem("token");
      localStorage.removeItem("usuari");

      // Redirigir manualment
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

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

export const getIndicatiusDisponibles = async () => {
  const response = await api.get("/indicatius/disponibles");
  return response.data;
};

// ================= ASSIGNACIONS =================

export const assignacioManual = async (data) => {
  const response = await api.post("/assignacions", data);
  return response.data;
};

export const assignacioAutomatica = async (incidencia_id) => {
  const response = await api.post("/assignacions/automatica", {
    incidencia_id
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
  // Obtenim detall complet de la incidència que ja inclou l'assignació
  const response = await api.get(`/incidencies/${incidencia_id}`);
  return response.data;
};

export default api;