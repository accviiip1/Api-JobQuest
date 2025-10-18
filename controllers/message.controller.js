import { messageStoreDB } from "../services/messageStoreDB.js";
import { testConnection } from "../services/databaseService.js";

// Gửi tin nhắn
export const sendMessage = async (req, res) => {
  try {
    const { senderType, senderId, receiverType, receiverId, text } = req.body;
    
    // Debug logging
    console.log("🔍 sendMessage - Request body:", req.body);
    console.log("🔍 sendMessage - Extracted values:", {
      senderType,
      senderId,
      receiverType,
      receiverId,
      text
    });
    console.log("🔍 sendMessage - Types:", {
      senderType: typeof senderType,
      senderId: typeof senderId,
      receiverType: typeof receiverType,
      receiverId: typeof receiverId,
      text: typeof text
    });

    // Debug: Log dữ liệu nhận được
    console.log("🔍 Dữ liệu nhận được từ frontend:", req.body);
    console.log("🔍 Kiểm tra undefined trong controller:", {
      senderType,
      senderId,
      receiverType,
      receiverId,
      text
    });

    // Validation chi tiết
    if (!senderType || !senderId || !receiverType || !receiverId || !text) {
      const missing = {
        senderType: !senderType,
        senderId: !senderId,
        receiverType: !receiverType,
        receiverId: !receiverId,
        text: !text
      };
      
      console.log("❌ Thiếu thông tin:", missing);
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc",
        missing
      });
    }

    // Kiểm tra ID có phải là số hợp lệ không
    if (isNaN(senderId) || isNaN(receiverId)) {
      return res.status(400).json({
        success: false,
        message: "ID không hợp lệ",
        senderId,
        receiverId
      });
    }

    // Kiểm tra loại user hợp lệ
    const validTypes = ["user", "company"];
    if (!validTypes.includes(senderType) || !validTypes.includes(receiverType)) {
      return res.status(400).json({
        success: false,
        message: "Loại user không hợp lệ",
        senderType,
        receiverType
      });
    }

    // Đảm bảo tất cả tham số đều có giá trị
    if (!senderType || !senderId || !receiverType || !receiverId || !text) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc",
        senderType,
        senderId,
        receiverType,
        receiverId,
        text
      });
    }

    const messageData = {
      senderType: senderType.toString(),
      senderId: senderId.toString(),
      receiverType: receiverType.toString(),
      receiverId: receiverId.toString(),
      text: text.toString()
    };

    // Debug logging trước khi gọi addMessage
    console.log("🔍 sendMessage - messageData before addMessage:", messageData);
    console.log("🔍 sendMessage - messageData validation:", {
      senderType: !!messageData.senderType,
      senderId: !!messageData.senderId,
      receiverType: !!messageData.receiverType,
      receiverId: !!messageData.receiverId,
      text: !!messageData.text
    });

    // Thêm tin nhắn vào database
    const message = await messageStoreDB.addMessage(messageData);

    // Emit WebSocket event để thông báo tin nhắn mới
    const io = req.app.get("io");
    if (io) {
      const roomName = `${receiverType}_${receiverId}`;
      io.to(roomName).emit("message_received", message);
      console.log(`WebSocket: Message sent to room ${roomName}`);
    }

    res.status(201).json({
      success: true,
      message: "Gửi tin nhắn thành công",
      data: message
    });
  } catch (error) {
    console.error("Lỗi gửi tin nhắn:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Lấy tin nhắn (không tự động đánh dấu đã đọc)
export const getMessages = async (req, res) => {
  try {
    const { userType, userId, otherType, otherId, markAsRead = "false" } = req.query;

    if (!userType || !userId || !otherType || !otherId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc"
      });
    }

    // Lấy tin nhắn
    const messages = await messageStoreDB.getMessages(userType, userId, otherType, otherId);

    // Chỉ đánh dấu đã đọc khi được yêu cầu rõ ràng
    if (markAsRead === "true") {
      await messageStoreDB.markAsRead(userType, userId, otherType, otherId);
      console.log(`✅ Đánh dấu đã đọc cho ${userType}_${userId} với ${otherType}_${otherId}`);
    }

    // Lấy tin nhắn mới nhất để hiển thị
    const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

    res.json({
      success: true,
      data: messages,
      latestMessage,
      unreadCount: await messageStoreDB.getUnreadCount(userType, userId, otherType, otherId)
    });
  } catch (error) {
    console.error("Lỗi lấy tin nhắn:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Lấy conversations
export const getConversations = async (req, res) => {
  try {
    const { userType, userId } = req.query;

    if (!userType || !userId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc"
      });
    }

    const conversations = await messageStoreDB.getConversations(userType, userId);

    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    console.error("Lỗi lấy conversations:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Đánh dấu đã đọc
export const markAsRead = async (req, res) => {
  try {
    const { userType, userId, otherType, otherId } = req.body;

    if (!userType || !userId || !otherType || !otherId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc"
      });
    }

    await messageStoreDB.markAsRead(userType, userId, otherType, otherId);

    res.json({
      success: true,
      message: "Đánh dấu đã đọc thành công"
    });
  } catch (error) {
    console.error("Lỗi đánh dấu đã đọc:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Lấy tổng số tin nhắn chưa đọc
export const getUnreadCount = async (req, res) => {
  try {
    const { userType, userId } = req.query;

    if (!userType || !userId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc"
      });
    }

    const unreadCount = await messageStoreDB.getTotalUnreadCount(userType, userId);

    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error("Lỗi lấy số tin nhắn chưa đọc:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Lấy số tin nhắn chưa đọc cho conversation cụ thể
export const getConversationUnreadCount = async (req, res) => {
  try {
    const { userType, userId, otherType, otherId } = req.query;

    if (!userType || !userId || !otherType || !otherId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc"
      });
    }

    const unreadCount = await messageStoreDB.getUnreadCount(userType, userId, otherType, otherId);

    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error("Lỗi lấy số tin nhắn chưa đọc cho conversation:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// API để xem thống kê (cho testing)
export const getStats = async (req, res) => {
  try {
    const stats = await messageStoreDB.getStats();
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

// API để xóa tin nhắn (cho testing)
export const clearMessages = async (req, res) => {
  try {
    await messageStoreDB.clearMessages();
    res.json({
      success: true,
      message: "Đã xóa tất cả tin nhắn"
    });
  } catch (error) {
    console.error("Lỗi xóa tin nhắn:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// API để test kết nối database
export const testDatabase = async (req, res) => {
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      const stats = await messageStoreDB.getStats();
      res.json({
        success: true,
        message: "Kết nối database thành công",
        data: stats
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Không thể kết nối database"
      });
    }
  } catch (error) {
    console.error("Lỗi test database:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};


