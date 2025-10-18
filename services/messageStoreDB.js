import { executeQuery, executeTransaction } from "./databaseService.js";

class MessageStoreDB {
  // Tạo conversation ID
  createConversationId(userType1, userId1, userType2, userId2) {
    // Debug: Log input parameters
    console.log("🔍 createConversationId input:", { userType1, userId1, userType2, userId2 });
    
    // Đảm bảo tất cả parameters đều có giá trị
    if (!userType1 || !userId1 || !userType2 || !userId2) {
      console.error("❌ Undefined parameters in createConversationId:", { userType1, userId1, userType2, userId2 });
      throw new Error("Undefined parameters in createConversationId");
    }
    
    // Sắp xếp theo thứ tự để đảm bảo consistency
    const participants = [
      { type: userType1.toString(), id: userId1.toString() },
      { type: userType2.toString(), id: userId2.toString() }
    ].sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.id.localeCompare(b.id);
    });
    
    const conversationId = `${participants[0].type}_${participants[0].id}_${participants[1].type}_${participants[1].id}`;
    console.log("🔍 Created conversation ID:", conversationId);
    
    return conversationId;
  }

  // Thêm tin nhắn mới
  async addMessage(messageData) {
    // Debug: Log dữ liệu nhận được
    console.log("🔍 Dữ liệu trong MessageStoreDB.addMessage:", messageData);
    console.log("🔍 Kiểm tra undefined trong MessageStoreDB:", {
      senderType: messageData.senderType,
      senderId: messageData.senderId,
      receiverType: messageData.receiverType,
      receiverId: messageData.receiverId,
      text: messageData.text
    });

    // Validation để đảm bảo không có undefined
    if (!messageData.senderType || !messageData.senderId || 
        !messageData.receiverType || !messageData.receiverId || 
        !messageData.text) {
      console.log("❌ Thiếu thông tin trong messageData:", {
        senderType: !!messageData.senderType,
        senderId: !!messageData.senderId,
        receiverType: !!messageData.receiverType,
        receiverId: !!messageData.receiverId,
        text: !!messageData.text
      });
      throw new Error("Thiếu thông tin bắt buộc trong messageData");
    }

    console.log("🔍 Before createConversationId:", {
      senderType: messageData.senderType,
      senderId: messageData.senderId,
      receiverType: messageData.receiverType,
      receiverId: messageData.receiverId
    });
    
    const conversationId = this.createConversationId(
      messageData.senderType.toString(),
      messageData.senderId.toString(),
      messageData.receiverType.toString(),
      messageData.receiverId.toString()
    );
    
    console.log("🔍 After createConversationId:", conversationId);

    const messageId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const timestamp = new Date();

    try {
      // Thêm tin nhắn vào database
      const insertMessageQuery = `
        INSERT INTO messages (id, sender_type, sender_id, receiver_type, receiver_id, text, timestamp, seen)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await executeQuery(insertMessageQuery, [
        messageId,
        messageData.senderType.toString(),
        messageData.senderId.toString(),
        messageData.receiverType.toString(),
        messageData.receiverId.toString(),
        messageData.text.toString(),
        timestamp,
        false
      ]);

             // Cập nhật hoặc tạo conversation
       const upsertConversationQuery = `
         INSERT INTO conversations (id, user1_type, user1_id, user2_type, user2_id, last_message, last_timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         last_message = VALUES(last_message),
         last_timestamp = VALUES(last_timestamp),
         updated_at = CURRENT_TIMESTAMP
       `;

               // Debug: Log conversation parsing
        console.log("🔍 Conversation ID:", conversationId);
        
        // Parse conversation ID một cách an toàn
        const parts = conversationId.split('_');
        console.log("🔍 Parts:", parts);
        
        if (parts.length !== 4) {
          console.error("❌ Invalid conversation ID format:", conversationId, "parts:", parts);
          throw new Error(`Invalid conversation ID format: ${conversationId}`);
        }
        
        const [user1Type, user1Id, user2Type, user2Id] = parts;
        
        console.log("🔍 Parsed conversation:", {
          user1Type,
          user1Id,
          user2Type,
          user2Id
        });

        // Kiểm tra undefined trong parsed values
        if (!user1Type || !user1Id || !user2Type || !user2Id) {
          console.error("❌ Undefined values after parsing:", { user1Type, user1Id, user2Type, user2Id });
          throw new Error("Undefined values after parsing conversation ID");
        }

       // Debug: Log params trước khi execute
       const conversationParams = [
         conversationId,
         user1Type,
         user1Id,
         user2Type,
         user2Id,
         messageData.text.toString(),
         timestamp
       ];
       
       console.log("🔍 Conversation params:", conversationParams);
       console.log("🔍 Conversation params types:", conversationParams.map(p => typeof p));
       console.log("🔍 Conversation params values:", conversationParams.map(p => p === undefined ? "UNDEFINED" : p));

       await executeQuery(upsertConversationQuery, conversationParams);

      // Cập nhật unread count
      await this.incrementUnreadCount(
        messageData.receiverType.toString(), 
        messageData.receiverId.toString(), 
        messageData.senderType.toString(), 
        messageData.senderId.toString()
      );

      const message = {
        id: messageId,
        ...messageData,
        timestamp,
        seen: false
      };

      console.log(`💬 Tin nhắn mới được lưu vào DB: ${messageId}`);
      return message;
    } catch (error) {
      console.error("❌ Lỗi lưu tin nhắn vào DB:", error);
      throw error;
    }
  }

  // Lấy tin nhắn của một conversation
  async getMessages(userType1, userId1, userType2, userId2) {
    const conversationId = this.createConversationId(userType1, userId1, userType2, userId2);

    try {
      const query = `
        SELECT * FROM messages 
        WHERE (sender_type = ? AND sender_id = ? AND receiver_type = ? AND receiver_id = ?)
           OR (sender_type = ? AND sender_id = ? AND receiver_type = ? AND receiver_id = ?)
        ORDER BY timestamp ASC
      `;

      const messages = await executeQuery(query, [
        userType1, userId1, userType2, userId2,
        userType2, userId2, userType1, userId1
      ]);

      // Debug: Log dữ liệu messages từ database
      console.log("🔍 Messages từ database:", messages.map(msg => ({
        id: msg.id,
        text: msg.text,
        sender_type: msg.sender_type,
        sender_id: msg.sender_id,
        receiver_type: msg.receiver_type,
        receiver_id: msg.receiver_id,
        timestamp: msg.timestamp
      })));

      console.log("🔍 User info cho so sánh:", {
        userType1,
        userId1,
        userType2,
        userId2
      });

      return messages;
    } catch (error) {
      console.error("❌ Lỗi lấy tin nhắn từ DB:", error);
      throw error;
    }
  }

  // Lấy conversations của một user
  async getConversations(userType, userId) {
    try {
      const query = `
        SELECT 
          c.*,
          CASE 
            WHEN c.user1_type = ? AND c.user1_id = ? THEN c.user2_type
            ELSE c.user1_type
          END as other_type,
          CASE 
            WHEN c.user1_type = ? AND c.user1_id = ? THEN c.user2_id
            ELSE c.user1_id
          END as other_id
        FROM conversations c
        WHERE (c.user1_type = ? AND c.user1_id = ?) 
           OR (c.user2_type = ? AND c.user2_id = ?)
        ORDER BY c.last_timestamp DESC
      `;

      const conversations = await executeQuery(query, [
        userType, userId, userType, userId,
        userType, userId, userType, userId
      ]);

      // Thêm unread count cho mỗi conversation
      const conversationsWithUnread = await Promise.all(
        conversations.map(async (conv) => {
          const unreadCount = await this.getUnreadCount(userType, userId, conv.other_type, conv.other_id);
          return {
            otherType: conv.other_type,
            otherId: conv.other_id,
            lastMessage: conv.last_message,
            lastTimestamp: conv.last_timestamp,
            unreadCount
          };
        })
      );

      return conversationsWithUnread;
    } catch (error) {
      console.error("❌ Lỗi lấy conversations từ DB:", error);
      throw error;
    }
  }

  // Đánh dấu tin nhắn đã đọc
  async markAsRead(userType, userId, otherType, otherId) {
    try {
      const query = `
        UPDATE messages 
        SET seen = true, updated_at = CURRENT_TIMESTAMP
        WHERE receiver_type = ? AND receiver_id = ? 
          AND sender_type = ? AND sender_id = ?
          AND seen = false
      `;

      const result = await executeQuery(query, [userType, userId, otherType, otherId]);
      
      // Cập nhật unread count
      await this.resetUnreadCount(userType, userId, otherType, otherId);

      console.log(`📖 Đánh dấu ${result.affectedRows} tin nhắn đã đọc cho ${userType}_${userId}`);
      return result.affectedRows;
    } catch (error) {
      console.error("❌ Lỗi đánh dấu đã đọc:", error);
      throw error;
    }
  }

  // Lấy số tin nhắn chưa đọc
  async getUnreadCount(userType, userId, otherType, otherId) {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM messages 
        WHERE receiver_type = ? AND receiver_id = ? 
          AND sender_type = ? AND sender_id = ?
          AND seen = false
      `;

      const result = await executeQuery(query, [userType, userId, otherType, otherId]);
      return result[0].count;
    } catch (error) {
      console.error("❌ Lỗi lấy unread count:", error);
      return 0;
    }
  }

  // Tăng unread count
  async incrementUnreadCount(receiverType, receiverId, senderType, senderId) {
    try {
      // Validation để đảm bảo không có undefined
      if (!receiverType || !receiverId || !senderType || !senderId) {
        console.error("❌ Tham số undefined trong incrementUnreadCount:", { receiverType, receiverId, senderType, senderId });
        return;
      }

      const query = `
        INSERT INTO unread_counts (user_type, user_id, other_type, other_id, unread_count)
        VALUES (?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
        unread_count = unread_count + 1,
        updated_at = CURRENT_TIMESTAMP
      `;

      await executeQuery(query, [
        receiverType.toString(), 
        receiverId.toString(), 
        senderType.toString(), 
        senderId.toString()
      ]);
    } catch (error) {
      console.error("❌ Lỗi tăng unread count:", error);
    }
  }

  // Reset unread count
  async resetUnreadCount(userType, userId, otherType, otherId) {
    try {
      const unreadCount = await this.getUnreadCount(userType, userId, otherType, otherId);
      
      const query = `
        INSERT INTO unread_counts (user_type, user_id, other_type, other_id, unread_count)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        unread_count = VALUES(unread_count),
        updated_at = CURRENT_TIMESTAMP
      `;

      await executeQuery(query, [userType, userId, otherType, otherId, unreadCount]);
    } catch (error) {
      console.error("❌ Lỗi reset unread count:", error);
    }
  }



  // Lấy tổng số tin nhắn chưa đọc của user
  async getTotalUnreadCount(userType, userId) {
    try {
      const query = `
        SELECT COUNT(*) as total
        FROM messages 
        WHERE receiver_type = ? AND receiver_id = ? AND seen = false
      `;

      const result = await executeQuery(query, [userType, userId]);
      return result[0].total || 0;
    } catch (error) {
      console.error("❌ Lỗi lấy tổng unread count:", error);
      return 0;
    }
  }

  // Xóa tin nhắn (cho testing)
  async clearMessages() {
    try {
      await executeQuery("DELETE FROM messages");
      await executeQuery("DELETE FROM conversations");
      await executeQuery("DELETE FROM unread_counts");
      console.log("🗑️ Đã xóa tất cả tin nhắn khỏi DB");
    } catch (error) {
      console.error("❌ Lỗi xóa tin nhắn:", error);
      throw error;
    }
  }

  // Lấy thống kê
  async getStats() {
    try {
      const [messageCount] = await executeQuery("SELECT COUNT(*) as count FROM messages");
      const [conversationCount] = await executeQuery("SELECT COUNT(*) as count FROM conversations");
      const [unreadCount] = await executeQuery("SELECT COUNT(*) as count FROM unread_counts");

      return {
        totalMessages: messageCount.count,
        totalConversations: conversationCount.count,
        totalUnreadCounts: unreadCount.count
      };
    } catch (error) {
      console.error("❌ Lỗi lấy thống kê:", error);
      return { totalMessages: 0, totalConversations: 0, totalUnreadCounts: 0 };
    }
  }
}

// Export singleton instance
export const messageStoreDB = new MessageStoreDB();
