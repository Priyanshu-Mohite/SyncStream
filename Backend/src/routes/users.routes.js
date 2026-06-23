import { Router } from "express";
import {
  registerUser,
  loginUser,
  verifyEmail,
  refreshAccessToken,
  logoutUser,
  logoutAllDevices,
} from "../controllers/user.controller.js"; // verifyEmail import kar

const router = Router();

// Routes
router.route("/register").post(registerUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/verify-email").post(verifyEmail); // Naya route add kar diya
router.route("/login").post(loginUser);
router.route("/logout").post(logoutUser);
router.route("/logout-all").post(logoutAllDevices);
// router.route("/add_to_activity").post(addToActivity);
// router.route("/get_all_activity").get(getAllActivity);

export default router;
