"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const qaController_1 = require("../controllers/qaController");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.get('/', qaController_1.getQAThreads);
router.post('/', qaController_1.createQAThread);
router.post('/:id/reply', qaController_1.addReply);
router.patch('/:id/status', qaController_1.updateStatus);
router.delete('/:id', qaController_1.deleteQAThread);
exports.default = router;
