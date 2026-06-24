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
exports.completeTopic = exports.getMe = exports.logout = exports.login = void 0;
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
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const user = yield db_1.prisma.user.findUnique({
            where: { email },
            include: {
                enrollments: { select: { course: { select: { id: true, title: true } } } },
                mentorCourses: { select: { course: { select: { id: true, title: true } } } },
                topicCompletions: { select: { topicId: true } },
                menteesRelation: { select: { menteeId: true } },
            },
        });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const formattedUser = Object.assign(Object.assign({}, user), { enrolledCourses: user.enrollments.map((e) => e.course), assignedCourses: user.mentorCourses.map((m) => m.course), completedTopics: user.topicCompletions.map((t) => ({ id: t.topicId })), mentees: user.menteesRelation.map((m) => ({ id: m.menteeId })) });
        delete formattedUser.enrollments;
        delete formattedUser.mentorCourses;
        delete formattedUser.topicCompletions;
        delete formattedUser.menteesRelation;
        const settings = yield db_1.prisma.settings.findUnique({ where: { id: 'global' } });
        if ((settings === null || settings === void 0 ? void 0 : settings.maintenanceMode) && user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Platform is currently under maintenance. Please try again later.' });
        }
        const isMatch = yield bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const token = (0, jwt_1.generateToken)({ id: user.id, email: user.email, role: user.role });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        res.status(200).json({
            message: 'Logged in successfully',
            user: formatUserResponse(formattedUser),
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.login = login;
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    });
    res.status(200).json({ message: 'Logged out successfully' });
});
exports.logout = logout;
// Get current authenticated user's profile
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const user = yield db_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                enrollments: { select: { course: { select: { id: true, title: true, thumbnail: true } } } },
                mentorCourses: { select: { course: { select: { id: true, title: true, thumbnail: true } } } },
                topicCompletions: { select: { topicId: true } },
                menteesRelation: { select: { menteeId: true } },
                certificates: {
                    select: { id: true, certificateId: true, issueDate: true, course: { select: { id: true, title: true } } },
                },
            },
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const formattedUser = Object.assign(Object.assign({}, user), { enrolledCourses: user.enrollments.map((e) => e.course), assignedCourses: user.mentorCourses.map((m) => m.course), completedTopics: user.topicCompletions.map((t) => ({ id: t.topicId })), mentees: user.menteesRelation.map((m) => ({ id: m.menteeId })) });
        delete formattedUser.enrollments;
        delete formattedUser.mentorCourses;
        delete formattedUser.topicCompletions;
        delete formattedUser.menteesRelation;
        res.status(200).json({ user: formatUserResponse(formattedUser) });
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
                enrollments: {
                    include: {
                        course: {
                            include: {
                                modules: {
                                    include: {
                                        topics: true
                                    }
                                }
                            }
                        }
                    }
                },
                topicCompletions: true
            }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const alreadyCompleted = user.topicCompletions.some((t) => t.topicId === topicId);
        let updatedCompletedTopics = [...user.topicCompletions];
        if (!alreadyCompleted) {
            updatedCompletedTopics.push({ topicId });
            yield db_1.prisma.user.update({
                where: { id: userId },
                data: {
                    topicCompletions: {
                        create: { topicId }
                    }
                }
            });
        }
        // Calculate total topics across all enrolled courses
        let totalTopics = 0;
        for (const enrollment of user.enrollments) {
            for (const mod of enrollment.course.modules) {
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
