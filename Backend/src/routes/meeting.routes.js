import { Router } from "express";
import {
  createMeeting,
  joinMeeting,
} from "../controllers/meeting.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = Router();

// Har meeting route ke aage tera banaya hua Security Guard (authenticateUser) khada rahega
router.route("/create").post(authenticateUser, createMeeting);
router.route("/join").post(authenticateUser, joinMeeting);

export default router;
