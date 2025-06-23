import Notification from "../models/Notification.model.js";
import NGO from "../models/ngo.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";

export const getNotifications = async (req, res) => {
  try {
    // Try to find an NGO created by this user
    const ngo = await NGO.findOne({ createdBy: req.userId });

    let receiverIdToUse = req.userId;
    if (ngo) {
      receiverIdToUse = ngo._id;
    }

    const notifications = await Notification.find({
      receiverId: receiverIdToUse,
    })
      .sort({ createdAt: -1 })
      .populate("senderId", "name profilepic")
      .populate("receiverId", "name");

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "accepted" } }, // or 'read'
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification updated",
      notification,
    });
  } catch (error) {
    console.error("Error updating notification:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
