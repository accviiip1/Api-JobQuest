import express from 'express';
import {
  getLookupDataByCategory,
  getAvailableCategories,
  getLookupDataItem,
  addLookupDataItem,
  updateLookupDataItem,
  deleteLookupDataItem,
  getAllLookupData
} from '../controllers/lookupData.controller.js';

const router = express.Router();

// Public routes (không cần authentication)
router.get('/categories', getAvailableCategories); // Lấy danh sách categories
router.get('/category/:category', getLookupDataByCategory); // Lấy data theo category
router.get('/item/:category/:itemId', getLookupDataItem); // Lấy item cụ thể

// Admin routes (cần authentication)
router.get('/all', getAllLookupData); // Lấy tất cả data (cho admin)
router.post('/add', addLookupDataItem); // Thêm item mới
router.put('/update/:id', updateLookupDataItem); // Cập nhật item
router.delete('/delete/:id', deleteLookupDataItem); // Xóa item

export default router;
