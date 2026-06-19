"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const moduleController_1 = require("../controllers/moduleController");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
router.post('/', auth_1.authenticate, moduleController_1.createModule);
router.put('/:id', auth_1.authenticate, moduleController_1.updateModule);
router.delete('/:id', auth_1.authenticate, moduleController_1.deleteModule);
exports.default = router;
