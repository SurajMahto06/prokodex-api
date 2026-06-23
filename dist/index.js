"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const courses_1 = __importDefault(require("./routes/courses"));
const modules_1 = __importDefault(require("./routes/modules"));
const topics_1 = __importDefault(require("./routes/topics"));
const upload_1 = __importDefault(require("./routes/upload"));
const meRoutes_1 = __importDefault(require("./routes/meRoutes"));
const assignmentRoutes_1 = __importDefault(require("./routes/assignmentRoutes"));
const qaRoutes_1 = __importDefault(require("./routes/qaRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const certificateRoutes_1 = __importDefault(require("./routes/certificateRoutes"));
const statsRoutes_1 = __importDefault(require("./routes/statsRoutes"));
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Serve static files from the uploads directory
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../../uploads')));
// Routes
app.use('/api/v1/auth', auth_1.default);
app.use('/api/v1/assignments', assignmentRoutes_1.default);
app.use('/api/v1/qa', qaRoutes_1.default);
app.use('/api/v1/notifications', notificationRoutes_1.default);
app.use('/api/v1/users', users_1.default);
app.use('/api/v1/me', meRoutes_1.default);
app.use('/api/v1/courses', courses_1.default);
app.use('/api/v1/modules', modules_1.default);
app.use('/api/v1/topics', topics_1.default);
app.use('/api/v1/upload', upload_1.default);
app.use('/api/v1/certificates', certificateRoutes_1.default);
app.use('/api/v1/stats', statsRoutes_1.default);
// Basic health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
