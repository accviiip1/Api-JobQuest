import { db } from '../config/connect.js';
import { executeQuery } from '../services/databaseService.js';

// Lấy tất cả dữ liệu theo category
const getLookupDataByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    if (!category) {
      return res.status(400).json({ 
        success: false, 
        message: "Category parameter is required" 
      });
    }

    const query = `
      SELECT id, item_id, name, value, label, link, icon, text, created_at, updated_at
      FROM lookup_data 
      WHERE category = ? 
      ORDER BY item_id ASC
    `;
    
    const result = await executeQuery(query, [category]);
    
    return res.status(200).json({
      success: true,
      data: result,
      category: category
    });
    
  } catch (error) {
    console.error("❌ Lỗi lấy lookup data:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
};

// Lấy tất cả categories có sẵn
const getAvailableCategories = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT category, COUNT(*) as count
      FROM lookup_data 
      GROUP BY category 
      ORDER BY category ASC
    `;
    
    const result = await executeQuery(query);
    
    return res.status(200).json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error("❌ Lỗi lấy categories:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
};

// Lấy một item cụ thể
const getLookupDataItem = async (req, res) => {
  try {
    const { category, itemId } = req.params;
    
    const query = `
      SELECT id, item_id, name, value, label, link, icon, text, created_at, updated_at
      FROM lookup_data 
      WHERE category = ? AND item_id = ?
    `;
    
    const result = await executeQuery(query, [category, itemId]);
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Item not found"
      });
    }
    
    return res.status(200).json({
      success: true,
      data: result[0]
    });
    
  } catch (error) {
    console.error("❌ Lỗi lấy lookup item:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
};

// Thêm item mới (Admin only)
const addLookupDataItem = async (req, res) => {
  try {
    const { category, item_id, name, value, label, link, icon, text } = req.body;
    
    // Validate required fields
    if (!category || !item_id || !name) {
      return res.status(400).json({
        success: false,
        message: "Category, item_id, and name are required"
      });
    }
    
    // Check if item already exists
    const checkQuery = `
      SELECT id FROM lookup_data 
      WHERE category = ? AND item_id = ?
    `;
    const existing = await executeQuery(checkQuery, [category, item_id]);
    
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Item with this category and item_id already exists"
      });
    }
    
    const insertQuery = `
      INSERT INTO lookup_data (category, item_id, name, value, label, link, icon, text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await executeQuery(insertQuery, [
      category, item_id, name, value || null, label || null, 
      link || null, icon || null, text || null
    ]);
    
    return res.status(201).json({
      success: true,
      message: "Lookup data item added successfully"
    });
    
  } catch (error) {
    console.error("❌ Lỗi thêm lookup item:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
};

// Cập nhật item (Admin only)
const updateLookupDataItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, item_id, name, value, label, link, icon, text } = req.body;
    
    // Check if item exists
    const checkQuery = `SELECT id FROM lookup_data WHERE id = ?`;
    const existing = await executeQuery(checkQuery, [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Item not found"
      });
    }
    
    const updateQuery = `
      UPDATE lookup_data 
      SET category = ?, item_id = ?, name = ?, value = ?, label = ?, 
          link = ?, icon = ?, text = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await executeQuery(updateQuery, [
      category, item_id, name, value || null, label || null,
      link || null, icon || null, text || null, id
    ]);
    
    return res.status(200).json({
      success: true,
      message: "Lookup data item updated successfully"
    });
    
  } catch (error) {
    console.error("❌ Lỗi cập nhật lookup item:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
};

// Xóa item (Admin only)
const deleteLookupDataItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if item exists
    const checkQuery = `SELECT id FROM lookup_data WHERE id = ?`;
    const existing = await executeQuery(checkQuery, [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Item not found"
      });
    }
    
    const deleteQuery = `DELETE FROM lookup_data WHERE id = ?`;
    await executeQuery(deleteQuery, [id]);
    
    return res.status(200).json({
      success: true,
      message: "Lookup data item deleted successfully"
    });
    
  } catch (error) {
    console.error("❌ Lỗi xóa lookup item:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
};

// Lấy tất cả dữ liệu (cho migration hoặc backup)
const getAllLookupData = async (req, res) => {
  try {
    const query = `
      SELECT id, category, item_id, name, value, label, link, icon, text, created_at, updated_at
      FROM lookup_data 
      ORDER BY category ASC, item_id ASC
    `;
    
    const result = await executeQuery(query);
    
    // Group by category
    const groupedData = {};
    result.forEach(item => {
      if (!groupedData[item.category]) {
        groupedData[item.category] = [];
      }
      groupedData[item.category].push(item);
    });
    
    return res.status(200).json({
      success: true,
      data: groupedData,
      totalItems: result.length
    });
    
  } catch (error) {
    console.error("❌ Lỗi lấy tất cả lookup data:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
};

export {
  getLookupDataByCategory,
  getAvailableCategories,
  getLookupDataItem,
  addLookupDataItem,
  updateLookupDataItem,
  deleteLookupDataItem,
  getAllLookupData
};
