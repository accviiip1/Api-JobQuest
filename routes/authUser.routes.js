import express from "express";
import {register, login, logout, forgotPassword, resetPassword, changePassword, loginWithGoogle} from '../controllers/authUser.controller.js'
 
const router = express.Router();

router.post("/login", login);
router.post("/login/google", loginWithGoogle);
router.post("/register", register);
router.post("/logout", logout);
router.post("/forgot", forgotPassword);
router.post("/reset", resetPassword); // Updated endpoint for new reset password flow
router.post("/changePassword/:id", changePassword);

export default router;
