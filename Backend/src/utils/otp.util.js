// utils/otp.util.js
export const generateOTP = () => {
  // Generates a 6-digit random number
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const getOtpHtml = (otp) => {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
      <h2>Verify Your Email</h2>
      <p>Your OTP code for Apna Video Call is:</p>
      <h1 style="color: #FF9839; letter-spacing: 5px;">${otp}</h1>
      <p>This OTP is valid for 5 minutes. Please do not share it with anyone.</p>
    </div>
  `;
};