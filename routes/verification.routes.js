import express from "express";
import { sendRegisterCode, sendCompanyRegisterCode } from '../controllers/verification.controller.js';

const router = express.Router();

router.post("/send-register-code", sendRegisterCode);
router.post("/send-company-register-code", sendCompanyRegisterCode);

export default router;



