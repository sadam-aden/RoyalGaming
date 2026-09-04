import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { API_BASE_URL } from "./config";

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  // Skips ngrok's browser-warning interstitial page when the API is reached
  // through an ngrok tunnel — harmless no-op against any other host.
  headers: { "ngrok-skip-browser-warning": "true" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error ?? error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}
