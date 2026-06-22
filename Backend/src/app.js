import express from "express";
import { createServer } from "node:http";
import cors from "cors";
import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.routes.js";
import config from "./config/config.js";
import connectDB from "./config/database.js";
import cookieParser from "cookie-parser";

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

app.use(cookieParser());

// Middleware
app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

// Routes
app.use("/api/v1/users", userRoutes);

// Start Execution
const startServer = async () => {
  // Pehle DB connect kar
  await connectDB();

  // Jab DB connect ho jaye, tab server chalu kar
  server.listen(config.PORT, () => {
    console.log(`Server is running on port ${config.PORT}`);
  });
};

startServer();
