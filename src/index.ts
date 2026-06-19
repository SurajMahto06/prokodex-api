import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import courseRoutes from './routes/courses';
import moduleRoutes from './routes/modules';
import topicRoutes from './routes/topics';
import uploadRoutes from './routes/upload';
import meRoutes from './routes/meRoutes';
import assignmentRoutes from './routes/assignmentRoutes';
import qaRoutes from './routes/qaRoutes';
import notificationRoutes from './routes/notificationRoutes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/qa', qaRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/me', meRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/modules', moduleRoutes);
app.use('/api/v1/topics', topicRoutes);
app.use('/api/v1/upload', uploadRoutes);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
