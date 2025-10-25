import axios from "axios";

export const api = axios.create({
  baseURL: "https://api.idenmarket.com",
  withCredentials: true
});

api.interceptors.response.use(
  res => res,
  err => {
    console.error("API Error:", err.response?.data || err.message);
    return Promise.reject(err);
  }
);
