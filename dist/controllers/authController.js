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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeTopic = exports.getMe = exports.login = exports.register = void 0;
const db_1 = require("../utils/db");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jwt_1 = require("../utils/jwt");
// Helper to exclude password and map assignedCourses to assignedCourses
const formatUserResponse = (user) => {
    const { password, assignedCourses } = user, userWithoutPassword = __rest(user, ["password", "assignedCourses"]);
    const result = Object.assign({}, userWithoutPassword);
    if (assignedCourses) {
        result.assignedCourses = assignedCourses;
    }
    return result;
};
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, name, role, plan, status, enrolledCourseIds, assignedCourseIds } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ message: 'Email, password, and name are required' });
        }
        const existingUser = yield db_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        const userRole = role ? String(role).toUpperCase() : 'STUDENT';
        let overlappingMentors = [];
        let overlappingStudents = [];
        if (userRole === 'STUDENT' && enrolledCourseIds && enrolledCourseIds.length > 0) {
            overlappingMentors = yield db_1.prisma.user.findMany({
                where: {
                    role: 'MENTOR',
                    assignedCourses: { some: { id: { in: enrolledCourseIds } } }
                },
                select: { id: true }
            });
        }
        else if (userRole === 'MENTOR' && assignedCourseIds && assignedCourseIds.length > 0) {
            overlappingStudents = yield db_1.prisma.user.findMany({
                where: {
                    role: 'STUDENT',
                    enrolledCourses: { some: { id: { in: assignedCourseIds } } }
                },
                select: { id: true }
            });
        }
        const user = yield db_1.prisma.user.create({
            data: Object.assign(Object.assign(Object.assign(Object.assign({ email, password: hashedPassword, name, role: userRole, plan: plan || null, status: status || 'active' }, (userRole === 'STUDENT' && enrolledCourseIds && enrolledCourseIds.length > 0 && {
                enrolledCourses: {
                    connect: enrolledCourseIds.map((id) => ({ id })),
                },
            })), (userRole === 'MENTOR' && assignedCourseIds && assignedCourseIds.length > 0 && {
                assignedCourses: {
                    connect: assignedCourseIds.map((id) => ({ id })),
                },
            })), (overlappingMentors.length > 0 && {
                mentors: {
                    connect: overlappingMentors,
                },
            })), (overlappingStudents.length > 0 && {
                mentees: {
                    connect: overlappingStudents,
                },
            })),
            include: {
                enrolledCourses: { select: { id: true, title: true } },
                assignedCourses: { select: { id: true, title: true } },
            },
        });
        const token = (0, jwt_1.generateToken)({ id: user.id, email: user.email, role: user.role });
        res.status(201).json({
            message: 'User registered successfully',
            user: formatUserResponse(user),
            token,
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const user = yield db_1.prisma.user.findUnique({
            where: { email },
            include: {
                enrolledCourses: { select: { id: true, title: true } },
                assignedCourses: { select: { id: true, title: true } },
                completedTopics: { select: { id: true } },
                mentees: { select: { id: true } },
            },
        });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const isMatch = yield bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const token = (0, jwt_1.generateToken)({ id: user.id, email: user.email, role: user.role });
        res.status(200).json({
            message: 'Logged in successfully',
            user: formatUserResponse(user),
            token,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.login = login;
// Get current authenticated user's profile
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const user = yield db_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                enrolledCourses: { select: { id: true, title: true, thumbnail: true } },
                assignedCourses: { select: { id: true, title: true, thumbnail: true } },
                completedTopics: { select: { id: true } },
                mentees: { select: { id: true } },
                certificates: {
                    select: { id: true, certificateId: true, issueDate: true, course: { select: { id: true, title: true } } },
                },
            },
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ user: formatUserResponse(user) });
    }
    catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getMe = getMe;
const completeTopic = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { topicId } = req.body;
        const userId = req.user.id;
        if (!topicId) {
            return res.status(400).json({ message: 'topicId is required' });
        }
        const user = yield db_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                enrolledCourses: {
                    include: {
                        modules: {
                            include: {
                                topics: true
                            }
                        }
                    }
                },
                completedTopics: true
            }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const alreadyCompleted = user.completedTopics.some(t => t.id === topicId);
        let updatedCompletedTopics = [...user.completedTopics];
        if (!alreadyCompleted) {
            updatedCompletedTopics.push({ id: topicId });
            yield db_1.prisma.user.update({
                where: { id: userId },
                data: {
                    completedTopics: {
                        connect: { id: topicId }
                    }
                }
            });
        }
        // Calculate total topics across all enrolled courses
        let totalTopics = 0;
        for (const course of user.enrolledCourses) {
            for (const mod of course.modules) {
                totalTopics += mod.topics.length;
            }
        }
        let progressPercentage = 0;
        if (totalTopics > 0) {
            progressPercentage = Math.round((updatedCompletedTopics.length / totalTopics) * 100);
        }
        if (progressPercentage > 100)
            progressPercentage = 100;
        const updatedUser = yield db_1.prisma.user.update({
            where: { id: userId },
            data: { progressPercentage }
        });
        res.status(200).json({ message: 'Topic marked as complete', progressPercentage });
    }
    catch (error) {
        console.error('CompleteTopic error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.completeTopic = completeTopic;
