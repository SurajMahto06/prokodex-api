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
exports.assignmentController = void 0;
const db_1 = require("../utils/db");
exports.assignmentController = {
    // GET /api/v1/assignments
    getAssignments(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const role = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
                const page = parseInt(req.query.page) || 1;
                const requestedLimit = parseInt(req.query.limit) || 10;
                const limit = Math.min(requestedLimit, 100); // Hard cap at 100
                const search = req.query.search || "";
                const skip = (page - 1) * limit;
                let whereClause = {};
                if (role === 'STUDENT') {
                    whereClause.studentId = userId;
                }
                else if (role === 'MENTOR') {
                    whereClause.mentorId = userId;
                }
                if (search) {
                    whereClause.OR = [
                        { title: { contains: search } },
                        { student: { name: { contains: search } } },
                        { course: { title: { contains: search } } }
                    ];
                }
                const [assignments, total] = yield Promise.all([
                    db_1.prisma.assignment.findMany({
                        where: whereClause,
                        include: {
                            course: { select: { id: true, title: true } },
                            student: { select: { id: true, name: true, email: true, avatarUrl: true } },
                            mentor: { select: { id: true, name: true, email: true, avatarUrl: true } },
                        },
                        orderBy: { assignedAt: 'desc' },
                        skip,
                        take: limit
                    }),
                    db_1.prisma.assignment.count({ where: whereClause })
                ]);
                const totalPages = Math.ceil(total / limit);
                res.status(200).json({
                    data: assignments,
                    total,
                    page,
                    totalPages,
                    limit
                });
            }
            catch (error) {
                console.error('Error fetching assignments:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
    },
    // GET /api/v1/assignments/:id
    getAssignmentById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { id } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const role = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
                const assignment = yield db_1.prisma.assignment.findUnique({
                    where: { id: id },
                    include: {
                        course: { select: { id: true, title: true } },
                        student: { select: { id: true, name: true, email: true, avatarUrl: true } },
                        mentor: { select: { id: true, name: true, email: true, avatarUrl: true } },
                    }
                });
                if (!assignment) {
                    return res.status(404).json({ message: 'Assignment not found' });
                }
                // Permissions check
                if (role === 'STUDENT' && assignment.studentId !== userId) {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                if (role === 'MENTOR' && assignment.mentorId !== userId) {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                res.status(200).json(assignment);
            }
            catch (error) {
                console.error('Error fetching assignment:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
    },
    // POST /api/v1/assignments
    createAssignment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { studentId, courseId, title, description, dueDate } = req.body;
                const mentorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const role = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
                if (role === 'STUDENT') {
                    return res.status(403).json({ message: 'Students cannot create assignments' });
                }
                if (!studentId || !courseId || !title || !description) {
                    return res.status(400).json({ message: 'Missing required fields' });
                }
                const assignment = yield db_1.prisma.assignment.create({
                    data: {
                        studentId,
                        courseId,
                        title,
                        description,
                        mentorId: mentorId,
                        dueDate: dueDate ? new Date(dueDate) : null,
                        status: 'pending_submission'
                    },
                    include: {
                        course: { select: { id: true, title: true } },
                        student: { select: { id: true, name: true } },
                        mentor: { select: { id: true, name: true } },
                    }
                });
                // Notify student about new assignment
                try {
                    yield db_1.prisma.appNotification.create({
                        data: {
                            userId: studentId,
                            title: 'New Assignment Assigned',
                            message: `Mentor ${assignment.mentor.name} assigned you a new assignment: "${title}" for ${assignment.course.title}`,
                            type: 'info'
                        }
                    });
                }
                catch (notifErr) {
                    console.error('Failed to create notification for assignment creation:', notifErr);
                }
                res.status(201).json({ message: 'Assignment created successfully', assignment });
            }
            catch (error) {
                console.error('Error creating assignment:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
    },
    // PUT /api/v1/assignments/:id
    updateAssignment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { id } = req.params;
                const { title, description, dueDate, status } = req.body;
                const role = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
                const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
                if (role === 'STUDENT') {
                    return res.status(403).json({ message: 'Students cannot update assignment details directly. Use submit endpoint.' });
                }
                const existingAssignment = yield db_1.prisma.assignment.findUnique({ where: { id: id } });
                if (!existingAssignment)
                    return res.status(404).json({ message: 'Assignment not found' });
                if (role === 'MENTOR' && existingAssignment.mentorId !== userId) {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                const assignment = yield db_1.prisma.assignment.update({
                    where: { id: id },
                    data: {
                        title,
                        description,
                        dueDate: dueDate ? new Date(dueDate) : undefined,
                        status
                    },
                    include: {
                        course: { select: { id: true, title: true } },
                        student: { select: { id: true, name: true } },
                        mentor: { select: { id: true, name: true } },
                    }
                });
                // Notify student if assignment status is updated (e.g. approved or rejected)
                if (status && status !== existingAssignment.status) {
                    try {
                        let type = 'info';
                        let titleText = 'Assignment Updated';
                        if (status === 'approved') {
                            type = 'success';
                            titleText = 'Assignment Approved 🎉';
                        }
                        else if (status === 'rejected') {
                            type = 'warning';
                            titleText = 'Assignment Needs Revision';
                        }
                        yield db_1.prisma.appNotification.create({
                            data: {
                                userId: assignment.studentId,
                                title: titleText,
                                message: `Your assignment "${assignment.title}" has been ${status.replace('_', ' ')} by your mentor.`,
                                type
                            }
                        });
                    }
                    catch (notifErr) {
                        console.error('Failed to create notification for assignment update:', notifErr);
                    }
                }
                res.status(200).json({ message: 'Assignment updated successfully', assignment });
            }
            catch (error) {
                console.error('Error updating assignment:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
    },
    // PUT /api/v1/assignments/:id/submit
    submitAssignment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { id } = req.params;
                const { repoUrl, fileName } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const existingAssignment = yield db_1.prisma.assignment.findUnique({ where: { id: id } });
                if (!existingAssignment)
                    return res.status(404).json({ message: 'Assignment not found' });
                if (existingAssignment.studentId !== userId && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'ADMIN') {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                const assignment = yield db_1.prisma.assignment.update({
                    where: { id: id },
                    data: {
                        repoUrl,
                        fileName,
                        status: 'submitted',
                        submittedAt: new Date()
                    },
                    include: {
                        course: { select: { id: true, title: true } },
                        student: { select: { id: true, name: true } },
                        mentor: { select: { id: true, name: true } },
                    }
                });
                // Notify mentor about assignment submission
                try {
                    yield db_1.prisma.appNotification.create({
                        data: {
                            userId: assignment.mentorId,
                            title: 'Assignment Submitted',
                            message: `Student ${assignment.student.name} submitted assignment: "${assignment.title}"`,
                            type: 'success'
                        }
                    });
                }
                catch (notifErr) {
                    console.error('Failed to create notification for assignment submission:', notifErr);
                }
                res.status(200).json({ message: 'Assignment submitted successfully', assignment });
            }
            catch (error) {
                console.error('Error submitting assignment:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
    },
    // DELETE /api/v1/assignments/:id
    deleteAssignment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { id } = req.params;
                const role = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
                const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
                if (role === 'STUDENT') {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                const existingAssignment = yield db_1.prisma.assignment.findUnique({ where: { id: id } });
                if (!existingAssignment)
                    return res.status(404).json({ message: 'Assignment not found' });
                if (role === 'MENTOR' && existingAssignment.mentorId !== userId) {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                yield db_1.prisma.assignment.delete({ where: { id: id } });
                res.status(200).json({ message: 'Assignment deleted successfully' });
            }
            catch (error) {
                console.error('Error deleting assignment:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
    }
};
