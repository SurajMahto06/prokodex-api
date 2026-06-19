import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
      return cb(new Error('Only image files are allowed!'));
    }
    cb(null, true);
  }
});

// POST /api/upload
router.post('/', authenticate, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Return the path that will be accessible via our static file serving
    const fileUrl = `/uploads/${req.file.filename}`;
    
    res.status(200).json({ url: fileUrl });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
