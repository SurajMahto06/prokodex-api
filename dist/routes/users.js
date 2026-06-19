"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// All user routes require authentication and ADMIN role
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)('ADMIN'));
router.get('/', userController_1.getUsers);
router.get('/:id', userController_1.getUserById);
router.post('/', userController_1.createUser);
router.put('/:id', userController_1.updateUser);
router.delete('/:id', userController_1.deleteUser);
exports.default = router;
