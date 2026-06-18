import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { loginUser } from "../controllers/user.controller.js";

const router = Router();

// Routes
router.route("/login").post(loginUser);
router.route("/register").post(registerUser);
// router.route("/add_to_activity").post(addToActivity);
// router.route("/get_all_activity").get(getAllActivity);

export default router;