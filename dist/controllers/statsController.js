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
exports.getStats = void 0;
const db_1 = require("../utils/db");
// GET /api/v1/stats
const getStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [totalUsers, totalCourses, totalAssignments, pendingQA] = yield Promise.all([
            db_1.prisma.user.count(),
            db_1.prisma.course.count(),
            db_1.prisma.assignment.count(),
            db_1.prisma.mentorshipQA.count({ where: { status: 'pending' } }),
        ]);
        res.status(200).json({
            totalUsers,
            totalCourses,
            totalAssignments,
            pendingQA,
        });
    }
    catch (error) {
        console.error('getStats error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getStats = getStats;
