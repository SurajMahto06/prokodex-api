"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Use process.cwd() so the uploads folder is created at the root of api-backend
const uploadDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const originalName = path_1.default.parse(file.originalname).name.replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, originalName + '_' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
exports.uploadMiddleware = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 1000 * 1024 * 1024 }, // 1GB limit for videos
    fileFilter: (req, file, cb) => {
        // Accept images, videos, pdfs/text, and zip/archives
        if (!file.originalname.match(/\.(jpg|jpeg|png|webp|mp4|m4v|webm|pdf|md|txt|zip|rar|7z)$/i)) {
            return cb(new Error('Invalid file type!'));
        }
        cb(null, true);
    }
});
