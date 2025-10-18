import express from "express";
import {getStats, sendBulkEmailToApplicants } from "../controllers/admin.controller.js";
import { query } from "../config/connect.js";

const router = express.Router();

router.get("/stats", getStats);

// Gửi email hàng loạt cho ứng viên
router.post("/send-bulk-email", sendBulkEmailToApplicants);

export default router;
