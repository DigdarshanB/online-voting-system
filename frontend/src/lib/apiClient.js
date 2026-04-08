/**
 * Pre-configured axios instance pointing at the backend.
 *
 * Every outgoing request automatically attaches the Bearer token
 * (when one exists) so callers never build auth headers manually.
 */

import axios from "axios";
import { getToken } from "./authStorage";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
