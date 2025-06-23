import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import mongoose from "mongoose";
import NGO from "../models/ngo.model.js";
import User from "../models/user.model.js";
import {io} from "../index.js"


export const sendMessage = async (req, res) => {
    try {
        const senderId = req.userId;
        const receiverId = req.params.receiverId;
        const messageText = req.body.message;

        const senderNgo = await NGO.findOne({ createdBy: senderId });
        const senderType = senderNgo ? "ngo" : "user";


        const receiverNgo = await NGO.findOne({ createdBy: receiverId });
        const receiverType = receiverNgo ? "ngo" : "user";
        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] }
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, receiverId],
                messages: []
            });
        }

        const newMessage = await Message.create({
            senderId,
            senderType ,
            receiverId,
            receiverType,
            message: messageText
        });

        conversation.messages.push(newMessage);
        await conversation.save();

              io.to(receiverId.toString()).emit("receiveMessage", newMessage);

        res.status(201).json({ success: true, message: "Message sent successfully",
         responseData: newMessage
         });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getMessage = async (req, res) => {
  try {
    const myId = new mongoose.Types.ObjectId(req.userId);
    const otherId = new mongoose.Types.ObjectId(req.params.otherId);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const conversation = await Conversation.findOne({
      participants: { $all: [myId, otherId] }
    });

    if (!conversation) {
      return res.status(200).json({
        success: true,
        messages: [],
        currentPage: page,
        totalPages: 0,
        totalMessages: 0
      });
    }

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId }
      ]
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    const totalMessages = await Message.countDocuments({
      $or: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId }
      ]
    });

    res.status(200).json({
      success: true,
      messages,
      currentPage: page,
      totalPages: Math.ceil(totalMessages / limit),
      totalMessages
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


export const partners = async (req, res) => {
  try {
    const currentUserId = new mongoose.Types.ObjectId(req.params.currentUserId);

    // Step 1: Find all conversations involving current user
    const conversations = await Conversation.find({
      participants: currentUserId
    });

    // Step 2: Get all unique partner IDs (exclude self)
    const partnerIds = new Set();

    conversations.forEach(conv => {
      conv.participants.forEach(participantId => {
        if (!participantId.equals(currentUserId)) {
          partnerIds.add(participantId.toString());
        }
      });
    });

    const partnerIdArray = Array.from(partnerIds);

    // Step 3: Try to fetch each partner from User or NGO collections
    const [users, ngos] = await Promise.all([
      User.find({ _id: { $in: partnerIdArray } }, '_id name profilepic'), // Add fields as needed
      NGO.find({ _id: { $in: partnerIdArray } }, '_id name logoUrl') // Add fields as needed
    ]);

    // Step 4: Add a `type` to each (user or NGO)
    const formattedUsers = users.map(user => ({ ...user.toObject(), type: 'user' }));
    const formattedNGOs = ngos.map(ngo => ({ ...ngo.toObject(), type: 'ngo' }));

    // Combine and return
    const chatPartners = [...formattedUsers, ...formattedNGOs];

    res.status(200).json({ success: true, partners: chatPartners });
  } catch (error) {
    console.error("Error fetching chat partners:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// controller/messageController.js

export const getSinglePartner = async (req, res) => {
  try {
    const partnerId = req.params.id;

    const [user, ngo] = await Promise.all([
      User.findById(partnerId).select('_id name profilepic'),
      NGO.findById(partnerId).select('_id name logoUrl')
    ]);

    if (!user && !ngo) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const partner = user
      ? { ...user.toObject(), type: 'user' }
      : { ...ngo.toObject(), type: 'ngo' };

    res.status(200).json({ success: true, partner });
  } catch (err) {
    console.error("Error fetching single partner", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// controllers/messageController.js

export const markMessagesAsSeen = async (req, res) => {
  try {

      console.log('markMessagesAsSeen called with partnerId:', req.params.partnerId);
      console.log(req.userId);
    const myUserId = req.userId;               // jo currently logged-in user hai
    const otherUserId = req.params.partnerId; // jiska chat dekh rahe hain

    await Message.updateMany(
      { senderId: otherUserId, receiverId: myUserId, seen: false },
      { $set: { seen: true } }
    );

    // Optionally, emit a socket event to notify sender
    io.to(otherUserId.toString()).emit("messageSeen", { receiverId: myUserId });

    return res.status(200).json({ success: true, message: "Messages marked as seen" });
  } catch (err) {
    console.error("Error marking messages as seen:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


export const getPartnersWithLastMessages = async (req, res) => {
  try {
    const currentUserId = new mongoose.Types.ObjectId(req.params.currentUserId);

    // 1. Find all conversations where user participates
    const conversations = await Conversation.find({
      participants: currentUserId
    }).populate({
      path: "messages",
      options: { sort: { createdAt: -1 }, limit: 1 }, // get only latest message
    });

    // 2. Prepare array to collect partners + last message + unread count
    const partnersData = [];

    for (const conv of conversations) {
      // Find the other participant ID
      const partnerId = conv.participants.find(
        (id) => !id.equals(currentUserId)
      );

      // Skip if no partner (shouldn't happen)
      if (!partnerId) continue;

      // Fetch partner info (from User or NGO)
      const [user, ngo] = await Promise.all([
        User.findById(partnerId).select("_id name profilepic"),
        NGO.findById(partnerId).select("_id name logoUrl"),
      ]);
      const partner = user
        ? { ...user.toObject(), type: "user" }
        : ngo
        ? { ...ngo.toObject(), type: "ngo" }
        : null;
      if (!partner) continue;

      // Get last message (populated)
      const lastMessage = conv.messages.length > 0 ? conv.messages[0] : null;

      // Count unseen messages from partner to current user
      const unreadCount = await Message.countDocuments({
        senderId: partnerId,
        receiverId: currentUserId,
        seen: false,
      });

      partnersData.push({
        partner,
        lastMessage,
        unreadCount,
      });
    }

    res.status(200).json({ success: true, partners: partnersData });
  } catch (error) {
    console.error("Error in getPartnersWithLastMessages:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};