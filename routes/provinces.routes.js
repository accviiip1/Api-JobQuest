import express from "express";
import {
  getAll,
  getWithType,
  getAllAdmin,
  insertProvinceByAdmin,
  updateProvinceByAdmin,
  deleteProvinceByAdmin,
} from "../controllers/provinces.controller.js";

const router = express.Router();

router.get("/type", getWithType);
router.get("/", getAll);

// admin
router.get("/admin", getAllAdmin);
router.post("/admin/insert", insertProvinceByAdmin);
router.put("/admin/update", updateProvinceByAdmin);
router.delete("/admin/delete/:id", deleteProvinceByAdmin);

export default router;
