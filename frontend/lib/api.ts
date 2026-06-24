import axios from "axios";
import { getCacheKey, getFromCache, setCache, invalidateCache } from "./api-cache";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const url = config.url || "";

    const authPaths = ["/api/admin/", "/api/orders/", "/api/users/profile/", "/api/users/password-change/", "/api/users/delete-account/", "/api/users/language/"];
    if (authPaths.some((p) => url.includes(p))) {
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    const lang = localStorage.getItem("lang");
    if (lang === "ar") {
      config.params = { ...(config.params || {}), lang: "ar" };
    }

    const method = (config.method || "").toUpperCase();

    // Invalidate cache before mutations
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      invalidateCache("/api/menu/");
      invalidateCache("/api/orders/cart/");
      if (url.includes("/api/orders/") && !url.includes("/cart/")) {
        invalidateCache("/api/orders/");
      }
    }

    // Serve GET requests from cache
    if (method === "GET") {
      const key = getCacheKey("get", url, config.params);
      const cached = getFromCache(key);
      if (cached) {
        return Promise.reject({ __fromCache: true, data: cached, config });
      }
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    if (response.config.method === "get" || response.config.method === "GET") {
      const key = getCacheKey("get", response.config.url || "", response.config.params);
      setCache(key, response.data);
    }
    return response;
  },
  async (error) => {
    // Return cached response
    if (error.__fromCache) {
      return Promise.resolve({ data: error.data, config: error.config, fromCache: true });
    }

    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE}/api/users/token/refresh/`, {
            refresh,
          });
          localStorage.setItem("access_token", data.access);
          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
