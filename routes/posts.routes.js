import express from 'express';
import {
  getAllPosts,
  getPostBySlug,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  getRelatedPosts,
  getPostStats,
  upload,
  uploadPostImage
} from '../controllers/posts.controller.js';
import { verifyToken } from '../middleware/jwt.js';

const router = express.Router();

// Public routes
router.get('/', getAllPosts); // Lấy danh sách bài viết
router.get('/slug/:slug', getPostBySlug); // Lấy bài viết theo slug
router.get('/related', getRelatedPosts); // Lấy bài viết liên quan

// Admin routes (tạm thời bỏ authentication để test)
router.get('/admin/stats', getPostStats); // Thống kê bài viết
router.get('/admin/:id', getPostById); // Lấy bài viết theo ID (admin)
router.post('/admin', createPost); // Tạo bài viết mới
router.put('/admin/:id', updatePost); // Cập nhật bài viết
router.delete('/admin/:id', deletePost); // Xóa bài viết
router.post('/upload/image', upload.single('image'), uploadPostImage); // Upload ảnh

export default router;
