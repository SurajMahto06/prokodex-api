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
exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getUsers = exports.syncMentors = void 0;
const db_1 = require("../utils/db");
const bcrypt_1 = __importDefault(require("bcrypt"));
// Helper to exclude password and map assignedCourses to assignedCourses
const formatUserResponse = (user) => {
    const { password, assignedCourses } = user, userWithoutPassword = __rest(user, ["password", "assignedCourses"]);
    const result = Object.assign({}, userWithoutPassword);
    if (assignedCourses) {
        result.assignedCourses = assignedCourses;
    }
    return result;
};
// GET /api/users/sync-mentors
const syncMentors = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mentors = yield db_1.prisma.user.findMany({
            where: { role: 'MENTOR' },
            include: { assignedCourses: true }
        });
        const students = yield db_1.prisma.user.findMany({
            where: { role: 'STUDENT' },
            include: { enrolledCourses: true }
        });
        let syncedCount = 0;
        for (const mentor of mentors) {
            const assignedCourseIds = mentor.assignedCourses.map(c => c.id);
            if (assignedCourseIds.length === 0)
                continue;
            const overlappingStudents = students.filter(student => student.enrolledCourses.some(course => assignedCourseIds.includes(course.id)));
            if (overlappingStudents.length > 0) {
                yield db_1.prisma.user.update({
                    where: { id: mentor.id },
                    data: {
                        mentees: {
                            connect: overlappingStudents.map(s => ({ id: s.id }))
                        }
                    }
                });
                syncedCount++;
            }
        }
        for (const student of students) {
            const enrolledCourseIds = student.enrolledCourses.map(c => c.id);
            if (enrolledCourseIds.length === 0)
                continue;
            const overlappingMentors = mentors.filter(mentor => mentor.assignedCourses.some(course => enrolledCourseIds.includes(course.id)));
            if (overlappingMentors.length > 0) {
                yield db_1.prisma.user.update({
                    where: { id: student.id },
                    data: {
                        mentors: {
                            connect: overlappingMentors.map(m => ({ id: m.id }))
                        }
                    }
                });
            }
        }
        res.status(200).json({ message: `Sync completed! Updated relations for ${syncedCount} mentors.` });
    }
    catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.syncMentors = syncMentors;
// GET /api/users
const getUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { role, status, search } = req.query;
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const requestedLimit = parseInt(req.query.limit) || 10;
        const limit = Math.min(requestedLimit, 100); // Hard cap at 100
        const skip = (page - 1) * limit;
        // Build the where clause
        const whereClause = {};
        if (role) {
            whereClause.role = String(role).toUpperCase();
        }
        if (status) {
            whereClause.status = String(status);
        }
        if (search) {
            const searchStr = String(search);
            whereClause.OR = [
                { name: { contains: searchStr } },
                { email: { contains: searchStr } },
            ];
        }
        const [users, total] = yield Promise.all([
            db_1.prisma.user.findMany({
                where: whereClause,
                include: {
                    enrolledCourses: { select: { id: true } },
                    assignedCourses: { select: { id: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            db_1.prisma.user.count({ where: whereClause })
        ]);
        const formattedUsers = users.map(user => formatUserResponse(user));
        const totalPages = Math.ceil(total / limit);
        res.status(200).json({
            data: formattedUsers,
            total,
            page,
            totalPages,
            limit
        });
    }
    catch (error) {
        console.error('GetUsers error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getUsers = getUsers;
// GET /api/users/:id
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield db_1.prisma.user.findUnique({
            where: { id: id },
            include: {
                enrolledCourses: { select: { id: true, title: true } },
                assignedCourses: { select: { id: true, title: true } },
                mentees: { select: { id: true, name: true, email: true } },
                mentors: { select: { id: true, name: true, email: true } },
            },
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(formatUserResponse(user));
    }
    catch (error) {
        console.error('GetUserById error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getUserById = getUserById;
// POST /api/users
// Note: Can also use authController.register, but this allows admin specific overrides
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        res.status(201).json({
            message: 'User created successfully',
            user: formatUserResponse(user),
        });
    }
    catch (error) {
        console.error('CreateUser error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createUser = createUser;
// PUT /api/users/:id
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { email, name, role, plan, status, enrolledCourseIds, assignedCourseIds, password } = req.body;
        // Check if user exists
        const existingUser = yield db_1.prisma.user.findUnique({ where: { id: id } });
        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        const updateData = {};
        if (email)
            updateData.email = email;
        if (name)
            updateData.name = name;
        if (role)
            updateData.role = String(role).toUpperCase();
        if (plan !== undefined)
            updateData.plan = plan;
        if (status)
            updateData.status = status;
        if (password) {
            updateData.password = yield bcrypt_1.default.hash(password, 10);
        }
        // Handle relations if provided
        if (enrolledCourseIds !== undefined) {
            updateData.enrolledCourses = {
                set: [], // Disconnect all first
                connect: enrolledCourseIds.map((courseId) => ({ id: courseId })),
            };
        }
        if (assignedCourseIds !== undefined) {
            updateData.assignedCourses = {
                set: [], // Disconnect all first
                connect: assignedCourseIds.map((courseId) => ({ id: courseId })),
            };
        }
        const targetRole = updateData.role || existingUser.role;
        if (targetRole === 'STUDENT' && enrolledCourseIds !== undefined) {
            const overlappingMentors = yield db_1.prisma.user.findMany({
                where: { role: 'MENTOR', assignedCourses: { some: { id: { in: enrolledCourseIds } } } },
                select: { id: true }
            });
            updateData.mentors = { set: [], connect: overlappingMentors };
        }
        else if (targetRole === 'MENTOR' && assignedCourseIds !== undefined) {
            const overlappingStudents = yield db_1.prisma.user.findMany({
                where: { role: 'STUDENT', enrolledCourses: { some: { id: { in: assignedCourseIds } } } },
                select: { id: true }
            });
            updateData.mentees = { set: [], connect: overlappingStudents };
        }
        const user = yield db_1.prisma.user.update({
            where: { id: id },
            data: updateData,
            include: {
                enrolledCourses: { select: { id: true, title: true } },
                assignedCourses: { select: { id: true, title: true } },
            },
        });
        res.status(200).json({
            message: 'User updated successfully',
            user: formatUserResponse(user),
        });
    }
    catch (error) {
        console.error('UpdateUser error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateUser = updateUser;
// DELETE /api/users/:id
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Check if user exists
        const existingUser = yield db_1.prisma.user.findUnique({ where: { id: id } });
        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        yield db_1.prisma.user.delete({ where: { id: id } });
        res.status(200).json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('DeleteUser error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.deleteUser = deleteUser;
