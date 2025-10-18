import { notificationStoreDB } from "../services/notificationStoreDB.js";

// Tạo thông báo mới
export const createNotification = async (req, res) => {
  try {
    const { receiverType, receiverId, senderType, senderId, message } = req.body;

    if (!receiverType || !receiverId || !senderType || !senderId || !message) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc"
      });
    }

    const notificationData = {
      receiverType,
      receiverId,
      senderType,
      senderId,
      message
    };

    const notification = await notificationStoreDB.createNotification(notificationData);

    // Emit WebSocket event để thông báo real-time
    const io = req.app.get("io");
    if (io) {
      const roomName = `${receiverType}_${receiverId}`;
      io.to(roomName).emit("notification_received", notification);
      console.log(`WebSocket: Notification sent to room ${roomName}`);
    }

    res.status(201).json({
      success: true,
      message: "Tạo thông báo thành công",
      data: notification
    });
  } catch (error) {
    console.error("Lỗi tạo thông báo:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Lấy danh sách thông báo
export const getNotifications = async (req, res) => {
  try {
    const { userType, userId } = req.query;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    if (!userType || !userId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc"
      });
    }

    const notifications = await notificationStoreDB.getNotifications(userType, userId, limit, offset);
    const unreadCount = await notificationStoreDB.getUnreadCount(userType, userId);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        total: notifications.length
      }
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách thông báo:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Đánh dấu thông báo đã đọc
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu ID thông báo"
      });
    }

    const success = await notificationStoreDB.markAsRead(notificationId);

    if (success) {
      // Emit WebSocket event
      const io = req.app.get("io");
      if (io) {
        const notification = await notificationStoreDB.getNotificationById(notificationId);
        if (notification) {
          const roomName = `${notification.receiver_type}_${notification.receiver_id}`;
          io.to(roomName).emit("notification_read", {
            userType: notification.receiver_type,
            userId: notification.receiver_id,
            notificationId
          });
          console.log(`WebSocket: Notification read event sent to room ${roomName}`);
        }
      }

      res.json({
        success: true,
        message: "Đánh dấu đã đọc thành công"
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Không tìm thấy thông báo"
      });
    }
  } catch (error) {
    console.error("Lỗi đánh dấu đã đọc:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Đánh dấu tất cả thông báo đã đọc
export const markAllAsRead = async (req, res) => {
  try {
    const { userType, userId } = req.body;

    if (!userType || !userId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc"
      });
    }

    const affectedRows = await notificationStoreDB.markAllAsRead(userType, userId);

    res.json({
      success: true,
      message: "Đánh dấu tất cả đã đọc thành công",
      data: { affectedRows }
    });
  } catch (error) {
    console.error("Lỗi đánh dấu tất cả đã đọc:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Lấy số thông báo chưa đọc
export const getUnreadCount = async (req, res) => {
  try {
    const { userType, userId } = req.query;

    if (!userType || !userId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc"
      });
    }

    const unreadCount = await notificationStoreDB.getUnreadCount(userType, userId);

    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error("Lỗi lấy số thông báo chưa đọc:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Xóa thông báo
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu ID thông báo"
      });
    }

    const success = await notificationStoreDB.deleteNotification(notificationId);

    if (success) {
      res.json({
        success: true,
        message: "Xóa thông báo thành công"
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Không tìm thấy thông báo"
      });
    }
  } catch (error) {
    console.error("Lỗi xóa thông báo:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Xóa tất cả thông báo
export const deleteAllNotifications = async (req, res) => {
  try {
    const { userType, userId } = req.body;

    if (!userType || !userId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc"
      });
    }

    const deletedCount = await notificationStoreDB.deleteAllNotifications(userType, userId);

    res.json({
      success: true,
      message: "Xóa tất cả thông báo thành công",
      data: { deletedCount }
    });
  } catch (error) {
    console.error("Lỗi xóa tất cả thông báo:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Lấy thống kê
export const getStats = async (req, res) => {
  try {
    const stats = await notificationStoreDB.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Lỗi lấy thống kê:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};
