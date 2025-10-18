import express from "express";
import { 
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  deleteAllNotifications,
  getStats
} from "../controllers/notification.controller.js";
import { verifyToken } from "../middleware/jwt.js";

const router = express.Router();

// Routes cần authentication
router.use(verifyToken);

// Tạo thông báo mới
router.post("/create", createNotification);

// Lấy danh sách thông báo
router.get("/list", getNotifications);

// Đánh dấu thông báo đã đọc
router.put("/mark-read/:notificationId", markAsRead);

// Đánh dấu tất cả thông báo đã đọc
router.put("/mark-all-read", markAllAsRead);

// Lấy số thông báo chưa đọc
router.get("/unread-count", getUnreadCount);

// Xóa thông báo
router.delete("/delete/:notificationId", deleteNotification);

// Xóa tất cả thông báo
router.delete("/delete-all", deleteAllNotifications);

// Lấy thống kê (admin only)
router.get("/stats", getStats);

export default router;

