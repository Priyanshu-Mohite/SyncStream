// services/email.service.js
import nodemailer from "nodemailer";
import config from "../config/config.js"; // Tera existing config file

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: config.GOOGLE_USER,
    clientId: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    refreshToken: config.GOOGLE_REFRESH_TOKEN,
  },
});

export const sendEmail = async (to, subject, text, html) => {
  try {
    await transporter.sendMail({
      from: config.GOOGLE_USER, // Sender address
      to,                       // Receiver address
      subject,                  // Subject line
      text,                     // Plain text body
      html,                     // HTML body (humara OTP template)
    });
    console.log(`OTP Email sent successfully to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Could not send email");
  }
};