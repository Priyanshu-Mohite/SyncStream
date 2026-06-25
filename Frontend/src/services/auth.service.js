import api from "../api/axios";

export const registerUser = async (userData) => {
  const response = await api.post(
    "/users/register",
    userData
  );

  return response.data;
};

export const verifyOtp = async (otpData) => {
  const response = await api.post(
    "/users/verify-email",
    otpData
  );

  return response.data;
};

export const loginUser = async (loginData) => {
  const response = await api.post(
    "/users/login",
    loginData
  );

  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post(
    "/users/logout"
  );

  return response.data;
};

export const refreshToken = async () => {
  const response = await api.post(
    "/users/refresh-token"
  );

  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/users/me");
  return response.data;
};