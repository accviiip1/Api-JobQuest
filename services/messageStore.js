// In-Memory Message Store để thay thế Firebase
class MessageStore {
  constructor() {
    this.messages = new Map(); // Map để lưu tin nhắn theo conversation ID
    this.conversations = new Map(); // Map để lưu conversations
    this.unreadCounts = new Map(); // Map để lưu số tin nhắn chưa đọc
  }

  // Tạo conversation ID
  createConversationId(userType1, userId1, userType2, userId2) {
    const sorted = [
      `${userType1}_${userId1}`,
      `${userType2}_${userId2}`
    ].sort();
    return `${sorted[0]}_${sorted[1]}`;
  }

  // Thêm tin nhắn mới
  addMessage(messageData) {
    const conversationId = this.createConversationId(
      messageData.senderType,
      messageData.senderId,
      messageData.receiverType,
      messageData.receiverId
    );

    // Tạo message object với ID
    const message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...messageData,
      timestamp: new Date(),
      seen: false
    };

    // Lưu tin nhắn
    if (!this.messages.has(conversationId)) {
      this.messages.set(conversationId, []);
    }
    this.messages.get(conversationId).push(message);

    // Cập nhật conversation
    this.updateConversation(conversationId, message);

    // Cập nhật unread count
    this.incrementUnreadCount(messageData.receiverType, messageData.receiverId);

    return message;
  }

  // Lấy tin nhắn của một conversation
  getMessages(userType1, userId1, userType2, userId2) {
    const conversationId = this.createConversationId(userType1, userId1, userType2, userId2);
    const messages = this.messages.get(conversationId) || [];
    
    // Sắp xếp theo thời gian (cũ nhất trước)
    return messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  // Lấy conversations của một user
  getConversations(userType, userId) {
    const userKey = `${userType}_${userId}`;
    const conversations = [];

    // Duyệt qua tất cả conversations
    for (const [conversationId, conversation] of this.conversations) {
      if (conversationId.includes(userKey)) {
        // Tìm user khác trong conversation
        const [user1, user2] = conversationId.split('_');
        const otherUser = user1 === userKey ? user2 : user1;
        const [otherType, otherId] = otherUser.split('_');

        conversations.push({
          otherType,
          otherId,
          lastMessage: conversation.lastMessage,
          lastTimestamp: conversation.lastTimestamp,
          unreadCount: this.getUnreadCount(userType, userId, otherType, otherId)
        });
      }
    }

    // Sắp xếp theo thời gian tin nhắn cuối (mới nhất trước)
    return conversations.sort((a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp));
  }

  // Cập nhật conversation
  updateConversation(conversationId, message) {
    this.conversations.set(conversationId, {
      lastMessage: message.text,
      lastTimestamp: message.timestamp
    });
  }

  // Đánh dấu tin nhắn đã đọc
  markAsRead(userType, userId, otherType, otherId) {
    const conversationId = this.createConversationId(userType, userId, otherType, otherId);
    const messages = this.messages.get(conversationId) || [];

    let markedCount = 0;

    // Đánh dấu tất cả tin nhắn từ user khác là đã đọc
    messages.forEach(message => {
      if (message.receiverType === userType && 
          message.receiverId === userId && 
          !message.seen) {
        message.seen = true;
        markedCount++;
      }
    });

    // Reset unread count
    this.resetUnreadCount(userType, userId, otherType, otherId);

    console.log(`📖 Đánh dấu ${markedCount} tin nhắn đã đọc cho ${userType}_${userId}`);
    
    return markedCount;
  }

  // Lấy số tin nhắn chưa đọc
  getUnreadCount(userType, userId, otherType, otherId) {
    const conversationId = this.createConversationId(userType, userId, otherType, otherId);
    const messages = this.messages.get(conversationId) || [];
    
    return messages.filter(message => 
      message.receiverType === userType && 
      message.receiverId === userId && 
      !message.seen
    ).length;
  }

  // Tăng unread count
  incrementUnreadCount(receiverType, receiverId) {
    const key = `${receiverType}_${receiverId}`;
    const current = this.unreadCounts.get(key) || 0;
    this.unreadCounts.set(key, current + 1);
  }

  // Reset unread count
  resetUnreadCount(userType, userId, otherType, otherId) {
    const conversationId = this.createConversationId(userType, userId, otherType, otherId);
    const messages = this.messages.get(conversationId) || [];
    
    // Đếm lại unread count
    const unreadCount = messages.filter(message => 
      message.receiverType === userType && 
      message.receiverId === userId && 
      !message.seen
    ).length;

    const key = `${userType}_${userId}`;
    this.unreadCounts.set(key, unreadCount);
  }

  // Lấy tổng số tin nhắn chưa đọc của user
  getTotalUnreadCount(userType, userId) {
    const key = `${userType}_${userId}`;
    return this.unreadCounts.get(key) || 0;
  }

  // Xóa tin nhắn (cho testing)
  clearMessages() {
    this.messages.clear();
    this.conversations.clear();
    this.unreadCounts.clear();
  }

  // Lấy thống kê
  getStats() {
    return {
      totalMessages: Array.from(this.messages.values()).reduce((sum, msgs) => sum + msgs.length, 0),
      totalConversations: this.conversations.size,
      totalUnreadCounts: this.unreadCounts.size
    };
  }
}

// Export singleton instance
export const messageStore = new MessageStore();

