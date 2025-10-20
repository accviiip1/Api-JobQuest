import express from "express";
import { 
  getStats, 
  sendBulkEmailToApplicants,
  // Categories management (lookup_data)
  getAdminCategories,
  addAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  // Categories management (categories table)
  getAdminCategoriesTable,
  addAdminCategoryTable,
  updateAdminCategoryTable,
  deleteAdminCategoryTable,
  // Media management
  getAdminMedia,
  deleteAdminMedia,
  // Posts management
  getAdminPosts,
  addAdminPost,
  updateAdminPost,
  deleteAdminPost,
  // Pages management
  getAdminPages,
  addAdminPage,
  updateAdminPage,
  deleteAdminPage
} from "../controllers/admin.controller.js";
import { query } from "../config/connect.js";
import { verifyToken } from "../middleware/jwt.js";

const router = express.Router();

// ==================== DASHBOARD STATS ====================
router.get("/stats", getStats);

// Test endpoint để debug
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Admin API hoạt động tốt",
    timestamp: new Date().toISOString(),
    data: {
      posts: "Có thể gọi /api/admin/posts",
      categories: "Có thể gọi /api/admin/categories",
      media: "Có thể gọi /api/admin/media"
    }
  });
});

// Gửi email hàng loạt cho ứng viên
router.post("/send-bulk-email", sendBulkEmailToApplicants);

// ==================== CATEGORIES MANAGEMENT (LOOKUP_DATA) ====================
router.get("/categories", getAdminCategories);           // GET /api/admin/categories?page=1&limit=10&search=&category=
router.post("/categories", addAdminCategory);            // POST /api/admin/categories
router.put("/categories/:id", updateAdminCategory);      // PUT /api/admin/categories/:id
router.delete("/categories/:id", deleteAdminCategory);   // DELETE /api/admin/categories/:id

// ==================== CATEGORIES MANAGEMENT (CATEGORIES TABLE) ====================
router.get("/categories-table", getAdminCategoriesTable);           // GET /api/admin/categories-table?page=1&limit=10&search=&type=
router.post("/categories-table", addAdminCategoryTable);            // POST /api/admin/categories-table
router.put("/categories-table/:id", updateAdminCategoryTable);      // PUT /api/admin/categories-table/:id
router.delete("/categories-table/:id", deleteAdminCategoryTable);   // DELETE /api/admin/categories-table/:id

// ==================== MEDIA MANAGEMENT ====================
router.get("/media", getAdminMedia);                      // GET /api/admin/media?page=1&limit=10&search=
router.delete("/media/:id", deleteAdminMedia);            // DELETE /api/admin/media/:id

// ==================== POSTS MANAGEMENT ====================
router.get("/posts", getAdminPosts);                      // GET /api/admin/posts?page=1&limit=10&search=&status=&category=
router.post("/posts", addAdminPost);                      // POST /api/admin/posts
router.put("/posts/:id", updateAdminPost);                // PUT /api/admin/posts/:id
router.delete("/posts/:id", deleteAdminPost);             // DELETE /api/admin/posts/:id

// ==================== PAGES MANAGEMENT ====================
router.get("/pages", getAdminPages);                      // GET /api/admin/pages?page=1&limit=10&search=&status=
router.post("/pages", addAdminPage);                      // POST /api/admin/pages
router.put("/pages/:id", updateAdminPage);                // PUT /api/admin/pages/:id
router.delete("/pages/:id", deleteAdminPage);             // DELETE /api/admin/pages/:id

export default router;
