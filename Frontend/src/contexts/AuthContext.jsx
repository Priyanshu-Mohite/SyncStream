// src/context/AuthContext.jsx
import { createContext, useState, useEffect } from "react";
import {
  getCurrentUser,
  refreshToken,
  logoutUser,
} from "../services/auth.service"; // Naya function import kiya
import { setAxiosAccessToken } from "../api/axios"; // Axios se token setter import kiya

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  // App start hote hi by default loading true rahega
  const [loading, setLoading] = useState(true);

  // Ye useEffect sirf ek baar chalega jab App load hogi
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const refreshResponse = await refreshToken();

        setAccessToken(refreshResponse.accessToken);

        setAxiosAccessToken(refreshResponse.accessToken);

        const userResponse = await getCurrentUser();

        setUser(userResponse.data.user);
      } catch (error) {
        // Agar error aayi (matlab logged out hai ya refresh token bhi fail ho gaya)
        console.log("No active session found or token expired.");
        setUser(null);
        setAccessToken(null);
      } finally {
        // Chahe success ho ya fail, loading ko false kar do taaki app aage badh sake
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = (data) => {
    setUser(data.user);
    setAccessToken(data.accessToken);
    setAxiosAccessToken(data.accessToken); // Axios header me token inject kar diya
  };

  // Logout function
  const logout = async () => {
    try {
      // 1. Sabse pehle backend ko API call karo taaki woh DB me session revoke kare aur HTTP-Only cookie clear kare
      await logoutUser();
    } catch (error) {
      console.error(
        "Logout API failed, but clearing local state anyway",
        error,
      );
    } finally {
      // 2. Uske baad React ki state aur Axios ke headers se data uda do
      setUser(null);
      setAccessToken(null);
      setAxiosAccessToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        login,
        logout,
      }}
    >
      {/* Agar check chal raha hai, toh pura app render mat karo, warna routes gadbad ho jayenge */}
      {loading ? <div>Loading StreamSync...</div> : children}
    </AuthContext.Provider>
  );
};
