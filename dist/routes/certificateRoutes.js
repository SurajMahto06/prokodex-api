"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const certificateController_1 = require("../controllers/certificateController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Public route to verify certificate
router.get('/verify/:certificateId', certificateController_1.verifyCertificate);
// Protected routes
router.use(auth_1.authenticate);
// Get all certificates (Admin gets all, Student gets their own)
router.get('/', certificateController_1.getCertificates);
// Issue a new certificate (Admin only)
router.post('/issue', (0, auth_1.authorize)('ADMIN'), certificateController_1.issueCertificate);
// Revoke a certificate (Admin only)
router.delete('/:id', (0, auth_1.authorize)('ADMIN'), certificateController_1.revokeCertificate);
exports.default = router;
