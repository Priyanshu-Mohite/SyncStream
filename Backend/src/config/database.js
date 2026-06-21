import mongoose from "mongoose";
import config from "./config.js";

export default async function connectDB() {
  try {
    const connectionDb = await mongoose.connect(config.MONGO_URI);
    console.log(`Connected to DB host: ${connectionDb.connection.host}`);
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1); // Agar DB connect na ho toh process kill kar do
  }
}
