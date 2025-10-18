import express from "express";
import { getAll, getWithType, getAllAdmin, insertFieldByAdmin, updateFieldByAdmin, deleteFieldByAdmin } from "../controllers/fields.controller.js";

const router = express.Router();

router.get("/type", getWithType);
router.get("/", getAll);

// admin
router.get("/admin", getAllAdmin);
router.post("/admin/insert", insertFieldByAdmin);
router.put("/admin/update", updateFieldByAdmin);
router.delete("/admin/delete/:id", deleteFieldByAdmin);

export default router;
