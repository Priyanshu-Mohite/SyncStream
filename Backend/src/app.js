import express from "express";
import { createServer } from "node:http";
import cors from "cors";
import { connectToSocket, createWorkers } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.routes.js";
import meetingRoutes from "./routes/meeting.routes.js";
import config from "./config/config.js";
import connectDB from "./config/database.js";
import cookieParser from "cookie-parser";
import { globalLimiter } from "./middlewares/rateLimit.middleware.js";
import axios from "axios";

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

app.use(cookieParser());

// Middleware
app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use(globalLimiter);

const fetchDynamicIp = async () => {
  try {
    const response = await axios.get("https://api.ipify.org?format=json");

    return response.data.ip;
  } catch (error) {
    console.error("Failed to fetch public IP:", error);

    return process.env.PUBLIC_IP || "127.0.0.1";
  }
};

// Routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/meetings", meetingRoutes);

// Start Execution
const startServer = async () => {
  config.PUBLIC_IP = await fetchDynamicIp();
  console.log(`Task bound to IP: ${config.PUBLIC_IP}`);
  
  // Pehle DB connect kar
  await connectDB();
  await createWorkers();

  // Jab DB connect ho jaye, tab server chalu kar
  server.listen(config.PORT, () => {
    console.log(`Server is running on port ${config.PORT}`);
  });
};

startServer();