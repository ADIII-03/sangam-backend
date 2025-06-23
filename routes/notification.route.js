import express from "express";
import {
  getNotifications,
  markNotificationAsRead,
} from "../controllers/notification.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Get all notifications for logged-in user/NGO
router.get("/", verifyToken, getNotifications);

// Mark a notification as read/accepted
router.put("/:id/mark-read", verifyToken, markNotificationAsRead);

export default router;
