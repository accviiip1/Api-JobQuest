
import express from "express";
import {
  applyJob,
  getUser,
  getJobApply,
  getStatus,
  getDetailApply,
  getUserByCpn,
  getUserHideByCpn,
  updateStatusUser,
  hiddenUserByCpn,
  unHiddenUserByCpn,
  unApplyJob,
  // admin
  getAllApplyByAdmin,
  insertApplyByAdmin,
  updateApplyByAdmin,
  deleteApplyByAdmin
} from "../controllers/apply.controller.js";

const router = express.Router();

router.get("/userApply", getUserByCpn);
router.get("/userHideApply", getUserHideByCpn);
router.get("/detail/:id", getDetailApply);
router.get("/status", getStatus);
router.get("/user", getUser);
router.get("/", getJobApply);
router.post("/", applyJob);
router.delete("/", unApplyJob);
router.put("/status", updateStatusUser);
router.put("/hidden", hiddenUserByCpn);
router.put("/unHidden", unHiddenUserByCpn);

// admin
router.get("/admin", getAllApplyByAdmin);
router.post("/admin/insert", insertApplyByAdmin);
router.put("/admin/update", updateApplyByAdmin);
router.delete("/admin/delete/:id", deleteApplyByAdmin);

export default router;
