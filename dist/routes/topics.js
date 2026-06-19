"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const topicController_1 = require("../controllers/topicController");
const auth_1 = require("../middlewares/auth");
const upload_1 = require("../middlewares/upload");
const router = express_1.default.Router();
const topicUploads = upload_1.uploadMiddleware.fields([
    { name: 'video', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
]);
router.get('/:id', auth_1.authenticate, topicController_1.getTopicById);
router.post('/', auth_1.authenticate, topicUploads, topicController_1.createTopic);
router.put('/:id', auth_1.authenticate, topicUploads, topicController_1.updateTopic);
router.delete('/:id', auth_1.authenticate, topicController_1.deleteTopic);
exports.default = router;
