import api from "../api/axios";

// 1. Nayi meeting create karne ke liye (Host ke liye)
export const createMeeting = async () => {
  // Isme hum koi data nahi bhej rahe, kyuki backend khud hostId (token se) aur unique meetingCode generate kar lega
  const response = await api.post("/meetings/create");
  return response.data;
};

// 2. Existing meeting join karne ke liye (Participants ke liye)
export const joinMeeting = async (meetingCode) => {
  // Backend ko 'meetingCode' chahiye jo hum body me bhejenge
  const response = await api.post("/meetings/join", {
    meetingCode,
  });
  return response.data;
};