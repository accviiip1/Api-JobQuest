import express from "express";
import { 
  sendMessage, 
  getMessages, 
  getConversations, 
  markAsRead, 
  getUnreadCount,
  getConversationUnreadCount,
  getStats,
  clearMessages,
  testDatabase
} from "../controllers/message.controller.js";
import { verifyToken } from "../middleware/jwt.js";

const router = express.Router();

// Routes không cần authentication (cho testing)
router.get("/test-db", testDatabase);

// Routes cần authentication
router.use(verifyToken);
router.post("/send", sendMessage);
router.get("/messages", getMessages);
router.get("/conversations", getConversations);
router.put("/mark-read", markAsRead);
router.get("/unread-count", getUnreadCount);
router.get("/conversation-unread-count", getConversationUnreadCount);
router.get("/stats", getStats);
router.delete("/clear", clearMessages);

export default router;

