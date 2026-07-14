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
import { connectRedis } from "./config/redis.js";

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

// Routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/meetings", meetingRoutes);

// Start Execution
const startServer = async () => {
  // Pehle DB connect kar
  await connectDB();
  await connectRedis();
  await createWorkers();

  // Jab DB connect ho jaye, tab server chalu kar
  server.listen(config.PORT, () => {
    console.log(`Server is running on port ${config.PORT}`);
  });
};

startServer();