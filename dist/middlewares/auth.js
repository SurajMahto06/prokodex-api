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
exports.authorize = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const db_1 = require("../utils/db");
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        let token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.token;
        // Fallback to Authorization header if no cookie is present
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const decoded = (0, jwt_1.verifyToken)(token);
        req.user = decoded;
        const settings = yield db_1.prisma.settings.findUnique({ where: { id: 'global' } });
        if ((settings === null || settings === void 0 ? void 0 : settings.maintenanceMode) && req.user.role !== 'ADMIN') {
            return res.status(503).json({ message: 'Platform is currently under maintenance. Active sessions are temporarily suspended.' });
        }
        next();
    }
    catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
});
exports.authenticate = authenticate;
// Role-based authorization middleware
// Usage: authorize('ADMIN') or authorize('ADMIN', 'MENTOR')
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
};
exports.authorize = authorize;
