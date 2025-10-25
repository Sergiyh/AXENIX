// src/api/client.js
import axios from "axios";

export const api = axios.create({
  //baseURL: "http://localhost:8088",
  baseURL: "https://api.idenmarket.com",
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    console.error("API Error:", err.response?.data || err.message);

    // Проверка на 401 и попытка refresh
    if (
      err.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/register") &&
      !originalRequest.url?.includes("/rooms/join") &&
      !originalRequest.url?.includes("/users/me")
    ) {
      // Если уже идет refresh
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((error) => {
            return Promise.reject(error);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Попытка обновить токен
        await api.post("/auth/refresh");
        
        console.log("Token refreshed successfully");
        processQueue(null);

        // Повторить оригинальный запрос
        return api(originalRequest);
      } catch (refreshError) {
        console.error("Refresh token failed:", refreshError);
        processQueue(refreshError, null);

        // Редирект на логин
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);
