import axios from "axios";

axios.defaults.withCredentials = true;

const api = axios.create({
  // baseURL: "http://localhost:8080/api/v1",
  baseURL: import.meta.env.VITE_BACKEND_URL,
  withCredentials: true, // Ye zaroori hai taaki HTTP-only cookie (refresh token) backend tak jaye
  headers: {
    "Content-Type": "application/json",
  },
});

// Variable to hold the token in memory
let storeAccessToken = null;

// Function to update the token from AuthContext later
export const setAxiosAccessToken = (token) => {
  storeAccessToken = token;
};

// ==========================================
// 1. REQUEST INTERCEPTOR
// ==========================================
api.interceptors.request.use(
  (config) => {
    // Agar request config me pehle se authorization header nahi hai, aur token memory me hai, toh add kar do
    if (!config.headers["Authorization"] && storeAccessToken) {
      config.headers["Authorization"] = `Bearer ${storeAccessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// ==========================================
// 2. RESPONSE INTERCEPTOR
// ==========================================
api.interceptors.response.use(
  (response) => {
    // Agar response 2xx (success) hai, toh seedha aage bhej do
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Agar error 401 (Unauthorized) hai aur request pehle retry nahi hui hai (_retry flag)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== "/users/refresh-token"
    ) {
      originalRequest._retry = true; // Infinite loop se bachne ke liye flag set karo

      try {
        // Naya token fetch karne ke liye refresh endpoint call karo
        // (Yaha humara HTTP-only cookie automatically chala jayega 'withCredentials: true' ki wajah se)
        const refreshResponse = await api.post("/users/refresh-token");

        const newAccessToken = refreshResponse.data.accessToken;

        // Memory me naya token update kar do
        setAxiosAccessToken(newAccessToken);

        // Failed request ke header me naya token daalo aur request wapas retry karo
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Agar refresh token bhi expire ho gaya hai, toh user ko force logout karna padega
        console.error("Refresh token expired. Please login again.");
        // Yaha se hum baad me logout function trigger karenge
        return Promise.reject(refreshError);
      }
    }

    // Agar 401 ke alawa koi error hai (like 404, 500), toh error ko aage throw kar do
    return Promise.reject(error);
  },
);

export default api;
