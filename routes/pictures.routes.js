import express from 'express';
import {
  getAllPictures,
  getPictureById,
  addPicture,
  updatePicture,
  deletePicture,
  upload
} from '../controllers/pictures.controller.js';

const router = express.Router();

// Get all pictures
router.get('/', getAllPictures);

// Get picture by ID
router.get('/:id', getPictureById);

// Add new picture (with file upload)
router.post('/add', upload.single('file'), addPicture);

// Update picture (with file upload)
router.put('/update/:id', upload.single('file'), updatePicture);

// Delete picture
router.delete('/delete/:id', deletePicture);

export default router;
