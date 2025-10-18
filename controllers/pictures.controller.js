import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'images/posts';
    const fullPath = path.join(__dirname, '..', uploadPath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    cb(null, fullPath);
  },
  filename: function (req, file, cb) {
    // Get title from request body and remove Vietnamese diacritics
    const title = req.body.title || 'picture';
    const cleanTitle = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .substring(0, 50); // Limit length
    
    // Generate unique filename with title + timestamp
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${cleanTitle}-${timestamp}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Get all pictures (from file system)
const getAllPictures = async (req, res) => {
  try {
    const picturesDir = path.join(__dirname, '..', 'images/posts');
    
    if (!fs.existsSync(picturesDir)) {
      return res.json([]);
    }
    
    const files = fs.readdirSync(picturesDir);
    const pictures = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      })
      .map((file, index) => {
        const stats = fs.statSync(path.join(picturesDir, file));
        // Extract timestamp from filename for ID
        const timestampMatch = file.match(/-(\d+)\./);
        const id = timestampMatch ? parseInt(timestampMatch[1]) : index + 1;
        
        return {
          id: id,
          filename: file,
          title: file.replace(path.extname(file), '').replace(/-\d+$/, ''),
          url: `${req.protocol}://${req.get('host')}/images/posts/${file}`,
          file_path: `images/posts/${file}`,
          size: stats.size,
          created_at: stats.birthtime,
          updated_at: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json(pictures);
  } catch (error) {
    console.error('Error fetching pictures:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Get picture by ID (from file system)
const getPictureById = async (req, res) => {
  try {
    const { id } = req.params;
    const picturesDir = path.join(__dirname, '..', 'images/posts');
    
    if (!fs.existsSync(picturesDir)) {
      return res.status(404).json({ message: 'Không tìm thấy hình ảnh' });
    }
    
    const files = fs.readdirSync(picturesDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });
    
    // Find file by timestamp ID
    const targetFile = imageFiles.find(file => {
      const timestampMatch = file.match(/-(\d+)\./);
      const fileId = timestampMatch ? parseInt(timestampMatch[1]) : 0;
      return fileId === parseInt(id);
    });
    
    if (!targetFile) {
      return res.status(404).json({ message: 'Không tìm thấy hình ảnh' });
    }
    
    const stats = fs.statSync(path.join(picturesDir, targetFile));
    
    const picture = {
      id: parseInt(id),
      filename: targetFile,
      title: targetFile.replace(path.extname(targetFile), '').replace(/-\d+$/, ''),
      url: `${req.protocol}://${req.get('host')}/images/posts/${targetFile}`,
      file_path: `images/posts/${targetFile}`,
      size: stats.size,
      created_at: stats.birthtime,
      updated_at: stats.mtime
    };
    
    res.json(picture);
  } catch (error) {
    console.error('Error fetching picture:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Add new picture (upload to file system)
const addPicture = async (req, res) => {
  try {
    const { title } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ message: 'Vui lòng tải lên file hình ảnh' });
    }
    
    // Generate timestamp ID
    const timestamp = Date.now();
    
    const picture = {
      id: timestamp,
      filename: file.filename,
      title: title || file.filename.replace(path.extname(file.filename), '').replace(/-\d+$/, ''),
      url: `${req.protocol}://${req.get('host')}/images/posts/${file.filename}`,
      file_path: `images/posts/${file.filename}`,
      size: file.size,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    res.status(201).json({ 
      message: 'Thêm hình ảnh thành công',
      picture: picture
    });
  } catch (error) {
    console.error('Error adding picture:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Update picture (rename file)
const updatePicture = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const file = req.file;
    
    console.log('Update picture request:', { id, title, file: file ? file.filename : 'no file' });
    
    const picturesDir = path.join(__dirname, '..', 'images/posts');
    
    if (!fs.existsSync(picturesDir)) {
      return res.status(404).json({ message: 'Không tìm thấy hình ảnh' });
    }
    
    const files = fs.readdirSync(picturesDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });
    
    // Find file by timestamp ID
    const targetFile = imageFiles.find(file => {
      const timestampMatch = file.match(/-(\d+)\./);
      const fileId = timestampMatch ? parseInt(timestampMatch[1]) : 0;
      return fileId === parseInt(id);
    });
    
    if (!targetFile) {
      return res.status(404).json({ message: 'Không tìm thấy hình ảnh' });
    }
    
    const oldPath = path.join(picturesDir, targetFile);
    const oldExt = path.extname(targetFile);
    
    let newFilename = targetFile;
    
    // If new file is uploaded, replace the old one
    if (file) {
      // Delete old file
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
      newFilename = file.filename;
    } else if (title) {
      // If only title is updated, rename the file
      console.log('Renaming file with title:', title);
      const cleanTitle = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .substring(0, 50); // Limit length
      
      const timestampMatch = targetFile.match(/-(\d+)\./);
      const timestamp = timestampMatch ? timestampMatch[1] : Date.now();
      
      newFilename = `${cleanTitle}-${timestamp}${oldExt}`;
      const newPath = path.join(picturesDir, newFilename);
      
      console.log('Renaming from:', oldPath);
      console.log('Renaming to:', newPath);
      
      // Rename file
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        console.log('File renamed successfully');
      } else {
        console.log('Old file not found:', oldPath);
      }
    }
    
    res.json({ 
      message: 'Cập nhật hình ảnh thành công',
      filename: newFilename
    });
  } catch (error) {
    console.error('Error updating picture:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Delete picture (delete file)
const deletePicture = async (req, res) => {
  try {
    const { id } = req.params;
    const picturesDir = path.join(__dirname, '..', 'images/posts');
    
    if (!fs.existsSync(picturesDir)) {
      return res.status(404).json({ message: 'Không tìm thấy hình ảnh' });
    }
    
    const files = fs.readdirSync(picturesDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });
    
    // Find file by timestamp ID
    const targetFile = imageFiles.find(file => {
      const timestampMatch = file.match(/-(\d+)\./);
      const fileId = timestampMatch ? parseInt(timestampMatch[1]) : 0;
      return fileId === parseInt(id);
    });
    
    if (!targetFile) {
      return res.status(404).json({ message: 'Không tìm thấy hình ảnh' });
    }
    
    const filePath = path.join(picturesDir, targetFile);
    
    // Delete file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.json({ message: 'Xóa hình ảnh thành công' });
  } catch (error) {
    console.error('Error deleting picture:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

export {
  getAllPictures,
  getPictureById,
  addPicture,
  updatePicture,
  deletePicture,
  upload
};
