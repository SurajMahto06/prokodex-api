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
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const db_1 = require("../utils/db");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// GET /api/v1/me/mentees
router.get('/mentees', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const user = yield db_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                menteesRelation: {
                    select: {
                        mentee: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                role: true,
                                progressPercentage: true,
                                enrollments: { select: { course: { select: { id: true, title: true } } } }
                            }
                        }
                    }
                }
            }
        });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        const mentees = user.menteesRelation.map((m) => (Object.assign(Object.assign({}, m.mentee), { enrolledCourses: m.mentee.enrollments.map((e) => e.course) })));
        res.status(200).json({ mentees });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
}));
// GET /api/v1/me/mentors
router.get('/mentors', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const user = yield db_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                mentorsRelation: {
                    select: { mentor: { select: { id: true, name: true, email: true } } }
                }
            }
        });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        const mentors = user.mentorsRelation.map((m) => m.mentor);
        res.status(200).json({ mentors });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
}));
// GET /api/v1/me/courses
router.get('/courses', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const user = yield db_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                enrollments: { select: { course: { select: { id: true, title: true, thumbnail: true } } } },
                mentorCourses: { select: { course: { select: { id: true, title: true, thumbnail: true } } } }
            }
        });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        res.status(200).json({
            enrolledCourses: user.enrollments.map((e) => e.course),
            assignedCourses: user.mentorCourses.map((m) => m.course)
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
}));
exports.default = router;
