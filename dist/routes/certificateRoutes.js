"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const certificateController_1 = require("../controllers/certificateController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
const verifyLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 10, // limit each IP to 10 requests per windowMs
    message: { error: 'Too many verification attempts from this IP, please try again after a minute' },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
// Public route to verify certificate
router.get('/verify/:certificateId', verifyLimiter, certificateController_1.verifyCertificate);
// Protected routes
router.use(auth_1.authenticate);
// Get all certificates (Admin gets all, Student gets their own)
router.get('/', certificateController_1.getCertificates);
// Issue a new certificate (Admin only)
router.post('/issue', (0, auth_1.authorize)('ADMIN'), certificateController_1.issueCertificate);
// Revoke a certificate (Admin only)
router.delete('/:id', (0, auth_1.authorize)('ADMIN'), certificateController_1.revokeCertificate);
exports.default = router;
