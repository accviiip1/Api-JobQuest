import express from "express";

const router = express.Router();

import { getJobSave,getUser,  addSave, removeSave, getAllSaveByAdmin, insertSaveByAdmin, updateSaveByAdmin, deleteSaveByAdmin } from '../controllers/save.controller.js'
 
router.get("/user/", getUser);
router.get("/", getJobSave);
router.post("/", addSave);
router.delete("/", removeSave);

// admin
router.get("/admin", getAllSaveByAdmin);
router.post("/admin/insert", insertSaveByAdmin);
router.put("/admin/update", updateSaveByAdmin);
router.delete("/admin/delete/:id", deleteSaveByAdmin);

export default router;
