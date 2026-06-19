"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const courseController_1 = require("../controllers/courseController");
const auth_1 = require("../middlewares/auth");
const upload_1 = require("../middlewares/upload");
const router = express_1.default.Router();
router.get('/', auth_1.authenticate, courseController_1.getCourses);
router.get('/:id', auth_1.authenticate, courseController_1.getCourseById);
router.post('/', auth_1.authenticate, upload_1.uploadMiddleware.single('thumbnail'), courseController_1.createCourse);
router.put('/:id', auth_1.authenticate, upload_1.uploadMiddleware.single('thumbnail'), courseController_1.updateCourse);
router.delete('/:id', auth_1.authenticate, courseController_1.deleteCourse);
exports.default = router;
