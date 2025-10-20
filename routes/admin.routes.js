import express from "express";
import { 
  getStats, 
  sendBulkEmailToApplicants,
  // Categories management
  getAdminCategories,
  addAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  // Media management
  getAdminMedia,
  deleteAdminMedia,
  // Posts management
  getAdminPosts,
  addAdminPost,
  updateAdminPost,
  deleteAdminPost
} from "../controllers/admin.controller.js";
import { query } from "../config/connect.js";

const router = express.Router();

// ==================== DASHBOARD STATS ====================
router.get("/stats", getStats);

// Gửi email hàng loạt cho ứng viên
router.post("/send-bulk-email", sendBulkEmailToApplicants);

// ==================== CATEGORIES MANAGEMENT ====================
router.get("/categories", getAdminCategories);           // GET /api/admin/categories?page=1&limit=10&search=&category=
router.post("/categories", addAdminCategory);            // POST /api/admin/categories
router.put("/categories/:id", updateAdminCategory);      // PUT /api/admin/categories/:id
router.delete("/categories/:id", deleteAdminCategory);   // DELETE /api/admin/categories/:id

// ==================== MEDIA MANAGEMENT ====================
router.get("/media", getAdminMedia);                      // GET /api/admin/media?page=1&limit=10&search=
router.delete("/media/:id", deleteAdminMedia);            // DELETE /api/admin/media/:id

// ==================== POSTS MANAGEMENT ====================
router.get("/posts", getAdminPosts);                      // GET /api/admin/posts?page=1&limit=10&search=&status=&category=
router.post("/posts", addAdminPost);                      // POST /api/admin/posts
router.put("/posts/:id", updateAdminPost);                // PUT /api/admin/posts/:id
router.delete("/posts/:id", deleteAdminPost);             // DELETE /api/admin/posts/:id

export default router;
