import express from "express";
import {
  getCompany,
  getOwnerCompany,
  getAllCompany,
  updateCompany,
  updateIntroCompany,
  uploadImage,
  insertCompany,
  updateCompanyByAdmin,
  deleteCompanyByAdmin,
  testSimpleCompany,
  testCompanySchema,
  testJobsSchema,
} from "../controllers/company.controller.js";

const router = express.Router();

router.get("/owner/", getOwnerCompany);
router.get("/test-simple", testSimpleCompany);
router.get("/schema", testCompanySchema);
router.get("/jobs-schema", testJobsSchema);
router.get("/:id", getCompany);
router.get("/", getAllCompany);
router.put("/update", updateCompany);
router.put("/updateIntro", updateIntroCompany);
router.put("/uploadImage", uploadImage);
// admin
router.post("/insert", insertCompany);
router.put("/updateByAdmin", updateCompanyByAdmin);
router.delete("/delete/:id", deleteCompanyByAdmin);


export default router;
