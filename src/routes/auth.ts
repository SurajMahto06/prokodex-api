import { Router } from 'express';
import { login, register, getMe, completeTopic } from '../controllers/authController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/register', register as any);
router.post('/login', login as any);
router.get('/me', authenticate as any, getMe as any);
router.post('/me/complete-topic', authenticate as any, completeTopic as any);

export default router;
