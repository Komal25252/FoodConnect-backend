import express from "express";
import Chat from "../models/Chat.js";
import Donation from "../models/Donation.js";
import Restaurant from "../models/Restaurant.js";
import NGO from "../models/NGO.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Get all chats for a user
router.get("/my-chats", protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const query = req.user.role === "restaurant" 
      ? { restaurantUser: userId }
      : { ngoUser: userId };

    let chats = await Chat.find(query)
      .populate("restaurant", "name email location")
      .populate("ngo", "name email location")
      .sort({ lastMessage: -1 });

    // Remove duplicates - keep only the most recent chat per restaurant-NGO pair
    const uniqueChats = [];
    const seenPairs = new Set();

    for (const chat of chats) {
      const pairKey = `${chat.restaurant._id}-${chat.ngo._id}`;
      
      if (!seenPairs.has(pairKey)) {
        seenPairs.add(pairKey);
        uniqueChats.push(chat);
      } else {
        // Delete duplicate chat
        await Chat.findByIdAndDelete(chat._id);
        console.log("Deleted duplicate chat:", chat._id);
      }
    }

    res.json({ success: true, chats: uniqueChats });
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get chat by ID
router.get("/:chatId", protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId)
      .populate("restaurant", "name email location")
      .populate("ngo", "name email location");

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Check if user is part of this chat
    const userId = req.user._id || req.user.id;
    const isAuthorized = 
      chat.restaurantUser.toString() === userId.toString() ||
      chat.ngoUser.toString() === userId.toString();

    if (!isAuthorized) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({ success: true, chat });
  } catch (error) {
    console.error("Error fetching chat:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Mark chat as read
router.post("/:chatId/mark-read", protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const userId = req.user._id || req.user.id;
    const isAuthorized = 
      chat.restaurantUser.toString() === userId.toString() ||
      chat.ngoUser.toString() === userId.toString();

    if (!isAuthorized) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Update last read timestamp for the user
    if (req.user.role === "restaurant") {
      chat.lastReadByRestaurant = new Date();
    } else {
      chat.lastReadByNGO = new Date();
    }

    await chat.save();
    res.json({ success: true });
  } catch (error) {
    console.error("Error marking chat as read:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Send a message
router.post("/:chatId/message", protect, async (req, res) => {
  try {
    console.log("=== SEND MESSAGE REQUEST ===");
    console.log("Chat ID:", req.params.chatId);
    console.log("User:", req.user);
    console.log("Message body:", req.body);
    
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    const chat = await Chat.findById(req.params.chatId);
    console.log("Found chat:", chat ? "Yes" : "No");

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Verify user is part of this chat
    const userId = req.user._id || req.user.id;
    console.log("User ID:", userId);
    console.log("Restaurant User:", chat.restaurantUser);
    console.log("NGO User:", chat.ngoUser);
    
    const isAuthorized = 
      chat.restaurantUser.toString() === userId.toString() ||
      chat.ngoUser.toString() === userId.toString();

    console.log("Is authorized:", isAuthorized);

    if (!isAuthorized) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Add message
    const newMessage = {
      sender: userId,
      senderRole: req.user.role,
      message: message.trim(),
      timestamp: new Date()
    };
    
    console.log("Adding message:", newMessage);
    chat.messages.push(newMessage);
    chat.lastMessage = new Date();
    
    console.log("Saving chat...");
    await chat.save();
    console.log("Chat saved successfully");

    const updatedChat = await Chat.findById(chat._id)
      .populate("restaurant", "name email location")
      .populate("ngo", "name email location");

    console.log("Returning updated chat with", updatedChat.messages.length, "messages");
    res.json({ success: true, chat: updatedChat });
  } catch (error) {
    console.error("❌ Error sending message:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;