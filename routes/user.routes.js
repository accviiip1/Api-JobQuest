import express from "express";
import {
  getUser,
  updateUser,
  getOwnerUser,
  updateIntroUser,
  uploadImage,
  updateUserByAdmin,
  getAllUser,
  insertUser,
  deleteUserByAdmin
} from "../controllers/user.controller.js";

const router = express.Router();

router.get("/find/:id", getUser);
router.get("/owner", getOwnerUser);
router.put("/update", updateUser); 
router.put("/updateIntro", updateIntroUser); 
router.put("/uploadImage", uploadImage);
//admin
router.get("/getAllUser", getAllUser); 
router.post("/insertUser", insertUser); 
router.put("/updateUserByAdmin", updateUserByAdmin); 
router.delete("/delete/:id", deleteUserByAdmin);

export default router;



