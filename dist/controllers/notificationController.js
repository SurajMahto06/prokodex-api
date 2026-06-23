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
exports.clearAllNotifications = exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const db_1 = require("../utils/db");
const getNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const excludeDismissed = req.query.excludeDismissed === 'true';
        const baseWhere = {
            OR: [
                { userId },
                { userId: null, targetRole: role },
                { userId: 'all', targetRole: role }
            ]
        };
        if (excludeDismissed) {
            baseWhere.isDismissed = false;
        }
        const notifications = yield db_1.prisma.appNotification.findMany({
            where: baseWhere,
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(notifications);
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getNotifications = getNotifications;
const markAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const id = req.params.id;
        // Verify ownership or global status
        const notification = yield db_1.prisma.appNotification.findUnique({
            where: { id }
        });
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        if (notification.userId && notification.userId !== userId) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const updated = yield db_1.prisma.appNotification.update({
            where: { id },
            data: { isRead: true }
        });
        res.status(200).json(updated);
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.markAsRead = markAsRead;
const markAllAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        yield db_1.prisma.appNotification.updateMany({
            where: {
                OR: [
                    { userId },
                    { userId: null, targetRole: role },
                    { userId: 'all', targetRole: role }
                ],
                isRead: false
            },
            data: { isRead: true }
        });
        res.status(200).json({ message: 'All notifications marked as read' });
    }
    catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.markAllAsRead = markAllAsRead;
const deleteNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const id = req.params.id;
        const notification = yield db_1.prisma.appNotification.findUnique({
            where: { id }
        });
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        if (notification.userId && notification.userId !== userId) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        yield db_1.prisma.appNotification.delete({
            where: { id }
        });
        res.status(200).json({ message: 'Notification deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.deleteNotification = deleteNotification;
const clearAllNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        yield db_1.prisma.appNotification.updateMany({
            where: {
                OR: [
                    { userId },
                    { userId: null, targetRole: role },
                    { userId: 'all', targetRole: role }
                ],
                isDismissed: false
            },
            data: { isDismissed: true }
        });
        res.status(200).json({ message: 'All notifications cleared successfully' });
    }
    catch (error) {
        console.error('Error clearing all notifications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.clearAllNotifications = clearAllNotifications;
