import express from "express";
import {
  // Categories public APIs
  getPublicCategories,
  getPublicCategoryBySlug,
  // Pages public APIs
  getPublicPages,
  getPublicPageBySlug,
  // Media public APIs
  getPublicMedia,
  getPublicMediaById,
  // Stats public API
  getPublicStats
} from "../controllers/public.controller.js";

const router = express.Router();

// ==================== PUBLIC CATEGORIES ROUTES ====================
router.get("/categories", getPublicCategories);                    // GET /api/public/categories?type=post&status=1
router.get("/categories/:slug", getPublicCategoryBySlug);          // GET /api/public/categories/:slug

// ==================== PUBLIC PAGES ROUTES ====================
router.get("/pages", getPublicPages);                              // GET /api/public/pages?status=published&template=default
router.get("/pages/:slug", getPublicPageBySlug);                   // GET /api/public/pages/:slug

// ==================== PUBLIC MEDIA ROUTES ====================
router.get("/media", getPublicMedia);                              // GET /api/public/media?type=image&limit=20
router.get("/media/:id", getPublicMediaById);                      // GET /api/public/media/:id

// ==================== PUBLIC STATS ROUTES ====================
router.get("/stats", getPublicStats);                              // GET /api/public/stats

export default router;
