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
exports.deleteCourse = exports.updateCourse = exports.createCourse = exports.getCourseById = exports.getCourses = void 0;
const db_1 = require("../utils/db");
// GET /api/courses
const getCourses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const courses = yield db_1.prisma.course.findMany({
            include: {
                _count: {
                    select: { modules: true, students: true }
                },
                modules: {
                    include: {
                        _count: { select: { topics: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // Format response to match expected frontend structure
        const formattedCourses = courses.map(course => {
            const totalTopics = course.modules.reduce((acc, mod) => acc + mod._count.topics, 0);
            return {
                id: course.id,
                title: course.title,
                description: course.description,
                thumbnail: course.thumbnail,
                createdAt: course.createdAt,
                updatedAt: course.updatedAt,
                totalTopics: totalTopics,
                _count: course._count
            };
        });
        res.status(200).json(formattedCourses);
    }
    catch (error) {
        console.error('GetCourses error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getCourses = getCourses;
// GET /api/courses/:id
const getCourseById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const course = yield db_1.prisma.course.findUnique({
            where: { id: id },
            include: {
                modules: {
                    orderBy: { order: 'asc' },
                    include: {
                        topics: {
                            orderBy: { createdAt: 'asc' },
                            include: {
                                video: true,
                                mcqs: { include: { options: true } },
                                interviewQs: true
                            }
                        }
                    }
                }
            }
        });
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        res.status(200).json(course);
    }
    catch (error) {
        console.error('GetCourseById error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getCourseById = getCourseById;
// POST /api/courses
const createCourse = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, description } = req.body;
        let { thumbnail } = req.body;
        if (req.file) {
            const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
            thumbnail = `${baseUrl}/uploads/${req.file.filename}`;
        }
        if (!title || !description) {
            return res.status(400).json({ message: 'Title and description are required' });
        }
        const course = yield db_1.prisma.course.create({
            data: {
                title,
                description,
                thumbnail: thumbnail || '/placeholder-course.jpg' // Default thumbnail if none provided
            }
        });
        res.status(201).json({ message: 'Course created successfully', course });
    }
    catch (error) {
        console.error('CreateCourse error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createCourse = createCourse;
// PUT /api/courses/:id
const updateCourse = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, description } = req.body;
        let { thumbnail } = req.body;
        if (req.file) {
            const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
            thumbnail = `${baseUrl}/uploads/${req.file.filename}`;
        }
        const existingCourse = yield db_1.prisma.course.findUnique({ where: { id: id } });
        if (!existingCourse) {
            return res.status(404).json({ message: 'Course not found' });
        }
        const course = yield db_1.prisma.course.update({
            where: { id: id },
            data: Object.assign(Object.assign(Object.assign({}, (title && { title })), (description && { description })), (thumbnail && { thumbnail }))
        });
        res.status(200).json({ message: 'Course updated successfully', course });
    }
    catch (error) {
        console.error('UpdateCourse error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateCourse = updateCourse;
// DELETE /api/courses/:id
const deleteCourse = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existingCourse = yield db_1.prisma.course.findUnique({ where: { id: id } });
        if (!existingCourse) {
            return res.status(404).json({ message: 'Course not found' });
        }
        yield db_1.prisma.course.delete({ where: { id: id } });
        res.status(200).json({ message: 'Course deleted successfully' });
    }
    catch (error) {
        console.error('DeleteCourse error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.deleteCourse = deleteCourse;
