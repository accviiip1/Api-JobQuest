import express from "express";
import {register, login, logout, forgotPassword, resetPassword, changePassword} from '../controllers/authCompany.controller.js'

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.post("/logout", logout);
router.post("/forgot", forgotPassword);
router.post("/reset", resetPassword); // Updated endpoint for new reset password flow
router.post("/changePassword/:id", changePassword);

export default router;
