import { Router } from "express";
import {
  registerUser,
  loginUser,
  verifyEmail,
  refreshAccessToken,
  logoutUser,
  logoutAllDevices,
} from "../controllers/user.controller.js"; // verifyEmail import kar

import { authLimiter } from "../middlewares/rateLimit.middleware.js";

const router = Router();

// Routes
router.route("/register").post(authLimiter, registerUser);
router.route("/verify-email").post(authLimiter, verifyEmail);
router.route("/login").post(authLimiter, loginUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/logout").post(logoutUser);
router.route("/logout-all").post(logoutAllDevices);
// router.route("/add_to_activity").post(addToActivity);
// router.route("/get_all_activity").get(getAllActivity);

export default router;
