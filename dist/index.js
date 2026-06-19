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
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Serve static files from the uploads directory
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../../uploads')));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/courses', courses_1.default);
app.use('/api/modules', modules_1.default);
app.use('/api/topics', topics_1.default);
app.use('/api/upload', upload_1.default);
// Basic health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
