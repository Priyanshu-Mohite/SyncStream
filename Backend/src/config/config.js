import dotenv from "dotenv";

dotenv.config();

// Required env checks
const requiredEnvVars = [
  "MONGO_URI",
  "PORT",
  "GOOGLE_USER",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
  "JWT_SECRET",
];

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`${key} is not defined in environment variables`);
  }
});

const config = {
  MONGO_URI: process.env.MONGO_URI,
  PORT: process.env.PORT || 8080,
  GOOGLE_USER: process.env.GOOGLE_USER,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
  JWT_SECRET: process.env.JWT_SECRET,
};

export default config;
