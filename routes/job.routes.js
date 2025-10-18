import express from "express";
const router = express.Router();

import {
  getById,
  getByIdCompany,
  postJob,
  getAll,
  getByIdField,
  getNameJob,
  updateJob,
  hiddenJob,
  unHiddenJob,
  deleteJob
} from "../controllers/job.controller.js";

router.get("/company/:id", getByIdCompany);
router.get("/field/:idField", getByIdField);
router.get("/name/:id", getNameJob);
router.get("/:id", getById);
router.get("/", getAll);
router.post("/", postJob);
router.put("/", updateJob);
router.put("/hidden", hiddenJob);
router.put("/unHidden", unHiddenJob);
router.delete("/", deleteJob);

// Admin
import { 
  insertJobByAdmin, 
  updateJobByAdmin, 
  deleteJobByAdmin,
  approveJobByAdmin,
  rejectJobByAdmin,
  getJobsByStatus
} from "../controllers/job.controller.js";
router.post("/admin/insert", insertJobByAdmin);
router.put("/admin/update", updateJobByAdmin);
router.delete("/admin/delete/:id", deleteJobByAdmin);
router.put("/admin/approve/:id", approveJobByAdmin);
router.put("/admin/reject/:id", rejectJobByAdmin);
router.get("/admin/by-status", getJobsByStatus);

export default router;
