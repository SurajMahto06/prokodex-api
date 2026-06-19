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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteModule = exports.updateModule = exports.createModule = void 0;
const db_1 = require("../utils/db");
// POST /api/modules (with courseId in body) or /api/courses/:courseId/modules depending on route setup
// Let's assume POST /api/modules and pass courseId in body for simplicity
const createModule = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, courseId, order } = req.body;
        if (!title || !courseId) {
            return res.status(400).json({ message: 'Title and courseId are required' });
        }
        const newModule = yield db_1.prisma.courseModule.create({
            data: {
                title,
                order: order || 0,
                courseId
            }
        });
        res.status(201).json({ message: 'Module created successfully', module: newModule });
    }
    catch (error) {
        console.error('CreateModule error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createModule = createModule;
// PUT /api/modules/:id
const updateModule = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, order } = req.body;
        const existingModule = yield db_1.prisma.courseModule.findUnique({ where: { id: id } });
        if (!existingModule) {
            return res.status(404).json({ message: 'Module not found' });
        }
        const updatedModule = yield db_1.prisma.courseModule.update({
            where: { id: id },
            data: Object.assign(Object.assign({}, (title && { title })), (order !== undefined && { order }))
        });
        res.status(200).json({ message: 'Module updated successfully', module: updatedModule });
    }
    catch (error) {
        console.error('UpdateModule error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateModule = updateModule;
// DELETE /api/modules/:id
const deleteModule = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existingModule = yield db_1.prisma.courseModule.findUnique({ where: { id: id } });
        if (!existingModule) {
            return res.status(404).json({ message: 'Module not found' });
        }
        yield db_1.prisma.courseModule.delete({ where: { id: id } });
        res.status(200).json({ message: 'Module deleted successfully' });
    }
    catch (error) {
        console.error('DeleteModule error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.deleteModule = deleteModule;
