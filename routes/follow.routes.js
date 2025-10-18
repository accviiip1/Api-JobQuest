import express from "express";
import {
  getCompanies,
  addFollow,
  removeFollow,
  getFollower,
  getAllFollowByAdmin,
  insertFollowByAdmin,
  updateFollowByAdmin,
  deleteFollowByAdmin,
} from "../controllers/follow.controller.js";

const router = express.Router();

router.get("/company/:idUser", getCompanies);
router.get("/follower", getFollower);
router.post("/", addFollow);
router.delete("/", removeFollow);

// admin
router.get("/admin", getAllFollowByAdmin);
router.post("/admin/insert", insertFollowByAdmin);
router.put("/admin/update", updateFollowByAdmin);
router.delete("/admin/delete/:id", deleteFollowByAdmin);

export default router;
