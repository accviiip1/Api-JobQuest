import { executeQuery } from "./databaseService.js";
import { v4 as uuidv4 } from "uuid";

class NotificationStoreDB {
  // Tạo thông báo mới
  async createNotification(notificationData) {
    try {
      const {
        receiverType,
        receiverId,
        senderType,
        senderId,
        message
      } = notificationData;

      // Validation
      if (!receiverType || !receiverId || !senderType || !senderId || !message) {
        throw new Error("Thiếu thông tin bắt buộc để tạo thông báo");
      }

      const id = uuidv4();
      const query = `
        INSERT INTO notifications (id, receiver_type, receiver_id, sender_type, sender_id, message)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      await executeQuery(query, [
        id,
        receiverType.toString(),
        receiverId.toString(),
        senderType.toString(),
        senderId.toString(),
        message.toString()
      ]);

      // Tăng unread count
      await this.incrementUnreadCount(receiverType, receiverId);

      // Lấy thông báo vừa tạo
      const notification = await this.getNotificationById(id);
      return notification;
    } catch (error) {
      console.error("❌ Lỗi tạo thông báo:", error);
      throw error;
    }
  }

  // Lấy thông báo theo ID
  async getNotificationById(id) {
    try {
      const query = `
        SELECT *, 
               UNIX_TIMESTAMP(created_at) as created_at_timestamp,
               DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at_formatted
        FROM notifications WHERE id = ?
      `;
      const result = await executeQuery(query, [id]);
      
      if (result[0]) {
        return {
          ...result[0],
          createdAt: result[0].created_at_timestamp * 1000, // Chuyển sang milliseconds
          createdAtFormatted: result[0].created_at_formatted
        };
      }
      
      return null;
    } catch (error) {
      console.error("❌ Lỗi lấy thông báo theo ID:", error);
      throw error;
    }
  }

  // Lấy danh sách thông báo của user
  async getNotifications(userType, userId, limit = 20, offset = 0) {
    try {
      const query = `
        SELECT *, 
               UNIX_TIMESTAMP(created_at) as created_at_timestamp,
               DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at_formatted
        FROM notifications 
        WHERE receiver_type = ? AND receiver_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;

      const result = await executeQuery(query, [userType, userId, limit, offset]);
      
      // Chuyển đổi timestamp để frontend có thể xử lý dễ dàng
      return result.map(notification => ({
        ...notification,
        createdAt: notification.created_at_timestamp * 1000, // Chuyển sang milliseconds
        createdAtFormatted: notification.created_at_formatted
      }));
    } catch (error) {
      console.error("❌ Lỗi lấy danh sách thông báo:", error);
      throw error;
    }
  }

  // Đánh dấu thông báo đã đọc
  async markAsRead(notificationId) {
    try {
      const query = `
        UPDATE notifications 
        SET is_read = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      const result = await executeQuery(query, [notificationId]);
      
      if (result.affectedRows > 0) {
        // Giảm unread count
        const notification = await this.getNotificationById(notificationId);
        if (notification) {
          await this.decrementUnreadCount(notification.receiver_type, notification.receiver_id);
        }
      }

      return result.affectedRows > 0;
    } catch (error) {
      console.error("❌ Lỗi đánh dấu thông báo đã đọc:", error);
      throw error;
    }
  }

  // Đánh dấu tất cả thông báo đã đọc
  async markAllAsRead(userType, userId) {
    try {
      const query = `
        UPDATE notifications 
        SET is_read = true, updated_at = CURRENT_TIMESTAMP
        WHERE receiver_type = ? AND receiver_id = ? AND is_read = false
      `;

      const result = await executeQuery(query, [userType, userId]);
      
      if (result.affectedRows > 0) {
        // Reset unread count
        await this.resetUnreadCount(userType, userId);
      }

      return result.affectedRows;
    } catch (error) {
      console.error("❌ Lỗi đánh dấu tất cả thông báo đã đọc:", error);
      throw error;
    }
  }

  // Lấy số thông báo chưa đọc
  async getUnreadCount(userType, userId) {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM notifications 
        WHERE receiver_type = ? AND receiver_id = ? AND is_read = false
      `;

      const result = await executeQuery(query, [userType, userId]);
      return result[0].count || 0;
    } catch (error) {
      console.error("❌ Lỗi lấy số thông báo chưa đọc:", error);
      return 0;
    }
  }

  // Tăng unread count
  async incrementUnreadCount(userType, userId) {
    try {
      const query = `
        INSERT INTO notification_counts (user_type, user_id, unread_count)
        VALUES (?, ?, 1)
        ON DUPLICATE KEY UPDATE
        unread_count = unread_count + 1,
        updated_at = CURRENT_TIMESTAMP
      `;

      await executeQuery(query, [userType.toString(), userId.toString()]);
    } catch (error) {
      console.error("❌ Lỗi tăng unread count:", error);
    }
  }

  // Giảm unread count
  async decrementUnreadCount(userType, userId) {
    try {
      const query = `
        UPDATE notification_counts 
        SET unread_count = GREATEST(unread_count - 1, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_type = ? AND user_id = ?
      `;

      await executeQuery(query, [userType.toString(), userId.toString()]);
    } catch (error) {
      console.error("❌ Lỗi giảm unread count:", error);
    }
  }

  // Reset unread count
  async resetUnreadCount(userType, userId) {
    try {
      const query = `
        UPDATE notification_counts 
        SET unread_count = 0,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_type = ? AND user_id = ?
      `;

      await executeQuery(query, [userType.toString(), userId.toString()]);
    } catch (error) {
      console.error("❌ Lỗi reset unread count:", error);
    }
  }

  // Xóa thông báo
  async deleteNotification(notificationId) {
    try {
      const query = `
        DELETE FROM notifications WHERE id = ?
      `;

      const result = await executeQuery(query, [notificationId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error("❌ Lỗi xóa thông báo:", error);
      throw error;
    }
  }

  // Xóa tất cả thông báo của user
  async deleteAllNotifications(userType, userId) {
    try {
      const query = `
        DELETE FROM notifications 
        WHERE receiver_type = ? AND receiver_id = ?
      `;

      const result = await executeQuery(query, [userType, userId]);
      
      // Reset unread count
      await this.resetUnreadCount(userType, userId);
      
      return result.affectedRows;
    } catch (error) {
      console.error("❌ Lỗi xóa tất cả thông báo:", error);
      throw error;
    }
  }

  // Lấy thống kê
  async getStats() {
    try {
      const [totalNotifications] = await executeQuery("SELECT COUNT(*) as count FROM notifications");
      const [unreadNotifications] = await executeQuery("SELECT COUNT(*) as count FROM notifications WHERE is_read = false");
      const [totalUsers] = await executeQuery("SELECT COUNT(*) as count FROM notification_counts");

      return {
        totalNotifications: totalNotifications.count,
        unreadNotifications: unreadNotifications.count,
        totalUsers: totalUsers.count
      };
    } catch (error) {
      console.error("❌ Lỗi lấy thống kê:", error);
      return { totalNotifications: 0, unreadNotifications: 0, totalUsers: 0 };
    }
  }
}

// Export singleton instance
export const notificationStoreDB = new NotificationStoreDB();



