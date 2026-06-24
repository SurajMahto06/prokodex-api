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
exports.revokeCertificate = exports.issueCertificate = exports.verifyCertificate = exports.getCertificates = void 0;
const db_1 = require("../utils/db");
// GET /api/certificates
const getCertificates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userRole = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const requestedLimit = parseInt(req.query.per_page) || 20;
        const per_page = Math.min(requestedLimit, 100); // Hard cap at 100
        const search = req.query.search || "";
        const skip = (page - 1) * per_page;
        let whereClause = {};
        if (userRole !== 'ADMIN') {
            whereClause.studentId = userId;
        }
        if (search) {
            whereClause.OR = [
                { certificateId: { contains: search } },
                { student: { name: { contains: search } } },
                { course: { title: { contains: search } } }
            ];
        }
        const [certificates, total] = yield Promise.all([
            db_1.prisma.certificate.findMany({
                where: whereClause,
                include: {
                    student: { select: { id: true, name: true, email: true } },
                    course: { select: { id: true, title: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: per_page
            }),
            db_1.prisma.certificate.count({ where: whereClause })
        ]);
        const totalPages = Math.ceil(total / per_page);
        res.status(200).json({
            data: certificates,
            total,
            page,
            totalPages,
            per_page
        });
    }
    catch (error) {
        console.error('getCertificates error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getCertificates = getCertificates;
// GET /api/certificates/verify/:certificateId
const verifyCertificate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { certificateId } = req.params;
        const certificate = yield db_1.prisma.certificate.findUnique({
            where: { certificateId: certificateId },
            include: {
                student: { select: { name: true } },
                course: { select: { title: true } }
            }
        });
        if (!certificate) {
            return res.status(404).json({ message: 'Certificate not found' });
        }
        let durationStr = "Self-Paced Track";
        if (certificate.startDate && certificate.endDate) {
            const start = new Date(certificate.startDate);
            const end = new Date(certificate.endDate);
            const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
            durationStr = `${months} Month${months !== 1 ? 's' : ''}`;
        }
        res.status(200).json(Object.assign(Object.assign({}, certificate), { duration: durationStr }));
    }
    catch (error) {
        console.error('verifyCertificate error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.verifyCertificate = verifyCertificate;
// POST /api/certificates/issue
const issueCertificate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, courseId, dateOfIssue, startDate, endDate } = req.body;
        if (!studentId || !courseId || !dateOfIssue) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        // Generate unique Certificate ID
        const year = new Date(dateOfIssue).getFullYear();
        const student = yield db_1.prisma.user.findUnique({ where: { id: studentId } });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        let initials = 'XX';
        if (student.name) {
            const parts = student.name.trim().split(' ');
            if (parts.length === 1) {
                initials = parts[0][0].toUpperCase();
            }
            else {
                initials = parts[0][0].toUpperCase() + parts[parts.length - 1][0].toUpperCase();
            }
        }
        const startOfYear = new Date(`${year}-01-01`);
        const endOfYear = new Date(`${year}-12-31`);
        const existingCountThisYear = yield db_1.prisma.certificate.count({
            where: {
                issueDate: {
                    gte: startOfYear,
                    lte: endOfYear
                }
            }
        });
        const sequence = String(existingCountThisYear + 1).padStart(3, '0');
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const certificateId = `CL-${year}-${initials}${sequence}-${randomSuffix}`;
        const newCertificate = yield db_1.prisma.certificate.create({
            data: {
                certificateId,
                studentId,
                courseId,
                issueDate: new Date(dateOfIssue),
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined
            },
            include: {
                student: { select: { name: true, email: true } },
                course: { select: { title: true } }
            }
        });
        // Create an in-app notification for the student
        yield db_1.prisma.appNotification.create({
            data: {
                title: 'New Certificate Issued! 🎉',
                message: `Congratulations! You have been issued a new certificate for completing "${newCertificate.course.title}". You can view and download it from your Certificates tab.`,
                type: 'success',
                userId: studentId,
            }
        });
        res.status(201).json(newCertificate);
    }
    catch (error) {
        console.error('issueCertificate error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.issueCertificate = issueCertificate;
// DELETE /api/certificates/:id
const revokeCertificate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existingCert = yield db_1.prisma.certificate.findUnique({ where: { id: id } });
        if (!existingCert) {
            return res.status(404).json({ message: 'Certificate not found' });
        }
        yield db_1.prisma.certificate.delete({ where: { id: id } });
        res.status(200).json({ message: 'Certificate revoked successfully' });
    }
    catch (error) {
        console.error('revokeCertificate error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.revokeCertificate = revokeCertificate;
