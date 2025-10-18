// services/notificationService.js
import db from "../config/firebaseAdmin.js";

export async function addNotification(receiverId, type, message) {
  try {
    const res = await db.collection("notifications").add({
      receiverId,
      type,
      message,
      createdAt: new Date(),
      isRead: false,
    });
    console.log("Notification ID:", res.id);
    return res.id;
  } catch (error) {
    console.error("Error adding notification:", error);
    throw error;
  }
}

export async function getUnreadNotificationCount(receiverId, type) {
  try {
    console.log(`🔍 Searching notifications for receiverId: ${receiverId} (${typeof receiverId}), type: ${type}`);
    
    // Thử tìm kiếm với cả string và number
    let snapshot = await db.collection("notifications")
      .where("receiverId", "==", receiverId)
      .where("type", "==", type)
      .where("isRead", "==", false)
      .get();
    
    // Nếu không tìm thấy, thử với kiểu dữ liệu khác
    if (snapshot.size === 0) {
      console.log(`🔄 Trying with different data type for receiverId: ${receiverId}`);
      
      // Thử với number nếu receiverId là string
      if (typeof receiverId === 'string') {
        snapshot = await db.collection("notifications")
          .where("receiverId", "==", parseInt(receiverId))
          .where("type", "==", type)
          .where("isRead", "==", false)
          .get();
      }
      // Thử với string nếu receiverId là number
      else if (typeof receiverId === 'number') {
        snapshot = await db.collection("notifications")
          .where("receiverId", "==", receiverId.toString())
          .where("type", "==", type)
          .where("isRead", "==", false)
          .get();
      }
    }
    
    // Nếu vẫn không tìm thấy, thử tìm tất cả thông báo cho receiverId này (không phân biệt type)
    if (snapshot.size === 0) {
      console.log(`🔄 Trying without type filter for receiverId: ${receiverId}`);
      snapshot = await db.collection("notifications")
        .where("receiverId", "==", receiverId)
        .where("isRead", "==", false)
        .get();
    }
    
    console.log(`📊 Found ${snapshot.size} unread notifications for receiverId: ${receiverId}, type: ${type}`);
    return snapshot.size;
  } catch (error) {
    console.error("Error getting unread notification count:", error);
    return 0; // Return 0 instead of throwing error
  }
}

export async function getNotifications(receiverId, type, limit = 10) {
  try {
    console.log(`🔍 Getting notifications for receiverId: ${receiverId}, type: ${type}, limit: ${limit}`);
    
    let snapshot = await db.collection("notifications")
      .where("receiverId", "==", receiverId)
      .where("type", "==", type)
      .limit(limit)
      .get();
    
    // Nếu không tìm thấy, thử với kiểu dữ liệu khác
    if (snapshot.size === 0) {
      console.log(`🔄 Trying with different data type for receiverId: ${receiverId}`);
      
      if (typeof receiverId === 'string') {
        snapshot = await db.collection("notifications")
          .where("receiverId", "==", parseInt(receiverId))
          .where("type", "==", type)
          .limit(limit)
          .get();
      } else if (typeof receiverId === 'number') {
        snapshot = await db.collection("notifications")
          .where("receiverId", "==", receiverId.toString())
          .where("type", "==", type)
          .limit(limit)
          .get();
      }
    }
    
    // Nếu vẫn không tìm thấy, thử tìm tất cả thông báo cho receiverId này (không phân biệt type)
    if (snapshot.size === 0) {
      console.log(`🔄 Trying without type filter for receiverId: ${receiverId}`);
      snapshot = await db.collection("notifications")
        .where("receiverId", "==", receiverId)
        .limit(limit)
        .get();
    }
    
    const notifications = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Convert Firestore Timestamp to JavaScript Date
      let createdAt = data.createdAt;
      if (createdAt && typeof createdAt.toDate === 'function') {
        createdAt = createdAt.toDate();
      } else if (createdAt && typeof createdAt === 'object' && createdAt.seconds) {
        // Nếu là timestamp object với seconds
        createdAt = new Date(createdAt.seconds * 1000);
      } else if (createdAt && typeof createdAt === 'number') {
        // Nếu là timestamp number
        createdAt = new Date(createdAt);
      }
      
      notifications.push({
        id: doc.id,
        ...data,
        createdAt: createdAt
      });
    });
    
    // Sort by createdAt (newest first)
    notifications.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB - dateA;
    });
    
    console.log(`📊 Found ${notifications.length} notifications for receiverId: ${receiverId}, type: ${type}`);
    return notifications;
  } catch (error) {
    console.error("Error getting notifications:", error);
    return []; // Return empty array instead of throwing error
  }
}

export async function markNotificationAsRead(notificationId) {
  try {
    await db.collection("notifications").doc(notificationId).update({
      isRead: true
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    // Don't throw error, just log it
  }
}
