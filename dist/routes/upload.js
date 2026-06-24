"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../middlewares/auth");
const cloudinary_1 = require("../utils/cloudinary");
const router = express_1.default.Router();
// Ensure temp uploads directory exists
const uploadDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Configure multer storage (temp local storage before Cloudinary upload)
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Sanitize the original file name (remove ext and replace spaces/special chars)
        const originalName = path_1.default.parse(file.originalname).name.replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, originalName + '_' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const imageUpload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for images
    fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
            return cb(new Error('Only image files are allowed!'));
        }
        cb(null, true);
    }
});
const mediaUpload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 1000 * 1024 * 1024 }, // 1GB limit for videos
    fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|webp|mp4|m4v|webm|pdf|md|txt|zip|rar|7z)$/i)) {
            return cb(new Error('Invalid file type!'));
        }
        cb(null, true);
    }
});
// POST /api/v1/upload - Image upload
router.post('/', auth_1.authenticate, imageUpload.single('file'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const cloudinaryUrl = yield (0, cloudinary_1.uploadToCloudinary)(req.file.path, 'uploads', 'image');
        res.status(200).json({ url: cloudinaryUrl });
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
// POST /api/v1/upload/video - Pre-upload video to Cloudinary (before saving topic)
router.post('/video', auth_1.authenticate, mediaUpload.single('video'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No video file uploaded' });
        }
        console.log(`Uploading video to Cloudinary: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(1)} MB)`);
        const cloudinaryUrl = yield (0, cloudinary_1.uploadToCloudinary)(req.file.path, 'topics/videos', 'video');
        console.log(`Video uploaded successfully: ${cloudinaryUrl}`);
        res.status(200).json({ url: cloudinaryUrl });
    }
    catch (error) {
        console.error('Video upload error:', error);
        res.status(500).json({ message: (error === null || error === void 0 ? void 0 : error.message) || 'Video upload failed', details: error });
    }
}));
// POST /api/v1/upload/pdf - Pre-upload PDF to Cloudinary
router.post('/pdf', auth_1.authenticate, mediaUpload.single('pdf'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No PDF file uploaded' });
        }
        const cloudinaryUrl = yield (0, cloudinary_1.uploadToCloudinary)(req.file.path, 'topics/pdfs', 'image');
        res.status(200).json({ url: cloudinaryUrl });
    }
    catch (error) {
        console.error('PDF upload error:', error);
        res.status(500).json({ message: (error === null || error === void 0 ? void 0 : error.message) || 'PDF upload failed', details: error });
    }
}));
// Upload assignment documents (zip, pdf, etc.) as raw to Cloudinary
router.post('/document', auth_1.authenticate, mediaUpload.single('document'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No document file uploaded' });
        }
        // Note: ZIP files MUST be uploaded as 'raw', unlike PDFs which we upload as 'image'
        const cloudinaryUrl = yield (0, cloudinary_1.uploadToCloudinary)(req.file.path, 'assignments/documents', 'raw');
        res.status(200).json({ url: cloudinaryUrl });
    }
    catch (error) {
        console.error('Document upload error:', error);
        res.status(500).json({ message: error.message || 'Error uploading document' });
    }
}));
exports.default = router;
