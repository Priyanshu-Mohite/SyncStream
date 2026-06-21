import { Router } from "express";
import { registerUser, loginUser, verifyEmail } from "../controllers/user.controller.js"; // verifyEmail import kar

const router = Router();

// Routes
router.route("/register").post(registerUser);
router.route("/verify-email").post(verifyEmail); // Naya route add kar diya
router.route("/login").post(loginUser);
// router.route("/add_to_activity").post(addToActivity);
// router.route("/get_all_activity").get(getAllActivity);

export default router;