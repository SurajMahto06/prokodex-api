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
exports.deleteQAThread = exports.updateStatus = exports.addReply = exports.createQAThread = exports.getQAThreads = void 0;
const db_1 = require("../utils/db");
const getQAThreads = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const normalizedRole = String(role || '').toUpperCase();
        const page = req.query.page ? parseInt(req.query.page) : undefined;
        const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
        let whereClause = {};
        if (normalizedRole === 'STUDENT') {
            whereClause = { studentId: userId };
        }
        else if (normalizedRole === 'MENTOR') {
            const user = yield db_1.prisma.user.findUnique({
                where: { id: userId },
                include: { assignedCourses: { select: { id: true } } }
            });
            const courseIds = (user === null || user === void 0 ? void 0 : user.assignedCourses.map(c => c.id)) || [];
            whereClause = { courseId: { in: courseIds } };
        }
        const total = yield db_1.prisma.mentorshipQA.count({ where: whereClause });
        const skip = page && limit ? (page - 1) * limit : undefined;
        const take = limit;
        const threads = yield db_1.prisma.mentorshipQA.findMany(Object.assign(Object.assign(Object.assign({ where: whereClause }, (skip !== undefined ? { skip } : {})), (take !== undefined ? { take } : {})), { include: {
                student: { select: { id: true, name: true, avatarUrl: true, role: true } },
                course: { select: { id: true, title: true } },
                replies: {
                    include: { author: { select: { id: true, name: true, avatarUrl: true, role: true } } },
                    orderBy: { createdAt: 'desc' }
                }
            }, orderBy: { createdAt: 'desc' } }));
        if (page !== undefined && limit !== undefined) {
            res.status(200).json({
                threads,
                hasMore: (skip || 0) + threads.length < total,
                total
            });
        }
        else {
            res.status(200).json(threads);
        }
    }
    catch (error) {
        console.error('Error fetching QA threads:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getQAThreads = getQAThreads;
const createQAThread = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const { courseId, question, imageUrls } = req.body;
        if (role !== 'STUDENT') {
            return res.status(403).json({ message: 'Only students can create questions' });
        }
        if (!courseId || !question) {
            return res.status(400).json({ message: 'courseId and question are required' });
        }
        const newThread = yield db_1.prisma.mentorshipQA.create({
            data: {
                studentId: userId,
                courseId,
                question,
                imageUrls: (imageUrls || [])
            },
            include: {
                student: { select: { id: true, name: true, avatarUrl: true, role: true } },
                course: { select: { id: true, title: true } },
                replies: {
                    include: { author: { select: { id: true, name: true, avatarUrl: true, role: true } } }
                }
            }
        });
        // Notify Mentors asynchronously
        try {
            const studentWithMentors = yield db_1.prisma.user.findUnique({
                where: { id: userId },
                select: { name: true }
            });
            const courseWithMentors = yield db_1.prisma.course.findUnique({
                where: { id: courseId },
                select: { title: true }
            });
            // Find course mentors and student mentors directly
            const courseMentors = yield db_1.prisma.user.findMany({
                where: {
                    role: 'MENTOR',
                    assignedCourses: {
                        some: { id: courseId }
                    }
                },
                select: { id: true }
            });
            const studentMentors = yield db_1.prisma.user.findMany({
                where: {
                    role: 'MENTOR',
                    mentees: {
                        some: { id: userId }
                    }
                },
                select: { id: true }
            });
            const mentorIds = new Set();
            courseMentors.forEach(m => mentorIds.add(m.id));
            studentMentors.forEach(m => mentorIds.add(m.id));
            const questionSnippet = question.slice(0, 60) + (question.length > 60 ? '...' : '');
            for (const mentorId of mentorIds) {
                yield db_1.prisma.appNotification.create({
                    data: {
                        userId: mentorId,
                        title: 'New Doubt Posted',
                        message: `${(studentWithMentors === null || studentWithMentors === void 0 ? void 0 : studentWithMentors.name) || 'A student'} asked: "${questionSnippet}" in ${(courseWithMentors === null || courseWithMentors === void 0 ? void 0 : courseWithMentors.title) || 'Course'}`,
                        type: 'info'
                    }
                });
            }
        }
        catch (notifErr) {
            console.error('Failed to create notifications for thread creation:', notifErr);
        }
        res.status(201).json(newThread);
    }
    catch (error) {
        console.error('Error creating QA thread:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createQAThread = createQAThread;
const addReply = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const id = req.params.id;
        const { content, imageUrls } = req.body;
        if (!content) {
            return res.status(400).json({ message: 'Reply content is required' });
        }
        const thread = yield db_1.prisma.mentorshipQA.findUnique({
            where: { id },
            include: {
                student: { select: { id: true, name: true } },
                course: { select: { id: true, title: true } }
            }
        });
        if (!thread) {
            return res.status(404).json({ message: 'QA thread not found' });
        }
        const reply = yield db_1.prisma.qAReply.create({
            data: {
                qaThreadId: id,
                authorId: userId,
                content,
                imageUrls: (imageUrls || [])
            },
            include: {
                author: { select: { id: true, name: true, avatarUrl: true, role: true } }
            }
        });
        // Update thread status based on who replied
        try {
            const author = reply.author;
            const normalizedRole = String((author === null || author === void 0 ? void 0 : author.role) || '').toUpperCase();
            const newStatus = (normalizedRole === 'MENTOR' || normalizedRole === 'ADMIN') ? 'answered' : 'pending';
            yield db_1.prisma.mentorshipQA.update({
                where: { id },
                data: { status: newStatus }
            });
            const replySnippet = content.slice(0, 60) + (content.length > 60 ? '...' : '');
            if (normalizedRole === 'MENTOR' || normalizedRole === 'ADMIN') {
                // Notify the student
                yield db_1.prisma.appNotification.create({
                    data: {
                        userId: thread.studentId,
                        title: 'Mentor Replied to your Doubt',
                        message: `${(author === null || author === void 0 ? void 0 : author.name) || 'Mentor'} replied: "${replySnippet}"`,
                        type: 'success'
                    }
                });
            }
            else {
                // Student replied, notify associated mentors
                const courseMentors = yield db_1.prisma.user.findMany({
                    where: {
                        role: 'MENTOR',
                        assignedCourses: {
                            some: { id: thread.courseId }
                        }
                    },
                    select: { id: true }
                });
                const studentMentors = yield db_1.prisma.user.findMany({
                    where: {
                        role: 'MENTOR',
                        mentees: {
                            some: { id: thread.studentId }
                        }
                    },
                    select: { id: true }
                });
                const mentorIds = new Set();
                courseMentors.forEach(m => mentorIds.add(m.id));
                studentMentors.forEach(m => mentorIds.add(m.id));
                for (const mentorId of mentorIds) {
                    if (mentorId !== userId) { // Don't notify the replier
                        yield db_1.prisma.appNotification.create({
                            data: {
                                userId: mentorId,
                                title: 'Student Replied to Doubt',
                                message: `${(author === null || author === void 0 ? void 0 : author.name) || 'Student'} replied: "${replySnippet}"`,
                                type: 'info'
                            }
                        });
                    }
                }
            }
        }
        catch (notifErr) {
            console.error('Failed to create notifications for QA reply:', notifErr);
        }
        res.status(201).json(reply);
    }
    catch (error) {
        console.error('Error adding reply:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.addReply = addReply;
const updateStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const { status } = req.body;
        const role = req.user.role;
        if (role === 'STUDENT') {
            return res.status(403).json({ message: 'Students cannot update status' });
        }
        if (!['pending', 'answered'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const updatedThread = yield db_1.prisma.mentorshipQA.update({
            where: { id },
            data: { status },
            include: {
                student: { select: { id: true, name: true, avatarUrl: true, role: true } },
                course: { select: { id: true, title: true } },
                replies: {
                    include: { author: { select: { id: true, name: true, avatarUrl: true, role: true } } }
                }
            }
        });
        res.status(200).json(updatedThread);
    }
    catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateStatus = updateStatus;
const deleteQAThread = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const threadId = req.params.id;
        const userId = req.user.id;
        const role = req.user.role;
        const normalizedRole = String(role || '').toUpperCase();
        // 1. Fetch thread to check associations
        const thread = yield db_1.prisma.mentorshipQA.findUnique({
            where: { id: threadId }
        });
        if (!thread) {
            return res.status(404).json({ message: 'QA thread not found' });
        }
        // 2. Authorization check
        if (normalizedRole === 'ADMIN') {
            // Admin can delete any thread
        }
        else if (normalizedRole === 'MENTOR') {
            // Mentor can delete if thread is assigned to their courses or mentees
            const mentorWithRel = yield db_1.prisma.user.findUnique({
                where: { id: userId },
                include: {
                    assignedCourses: { select: { id: true } },
                    mentees: { select: { id: true } }
                }
            });
            const isCourseAssigned = mentorWithRel === null || mentorWithRel === void 0 ? void 0 : mentorWithRel.assignedCourses.some(c => c.id === thread.courseId);
            const isMenteeAssigned = mentorWithRel === null || mentorWithRel === void 0 ? void 0 : mentorWithRel.mentees.some(m => m.id === thread.studentId);
            if (!isCourseAssigned && !isMenteeAssigned) {
                return res.status(403).json({ message: 'Permission denied: This discussion does not belong to your assigned courses or mentees.' });
            }
        }
        else {
            // Students cannot delete discussion threads
            return res.status(403).json({ message: 'Permission denied: Students are not allowed to delete discussion threads.' });
        }
        // 3. Delete the thread (cascades deletes to replies due to Prisma schema setup)
        yield db_1.prisma.mentorshipQA.delete({
            where: { id: threadId }
        });
        res.status(200).json({ message: 'Discussion thread deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting QA thread:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.deleteQAThread = deleteQAThread;
