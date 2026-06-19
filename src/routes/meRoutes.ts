import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth';
import { prisma } from '../utils/db';

const router = Router();

router.use(authenticate as any);

// GET /api/v1/me/mentees
router.get('/mentees', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        mentees: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            progressPercentage: true,
            enrolledCourses: { select: { id: true, title: true } }
          }
        }
      }
    });

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ mentees: user.mentees });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/v1/me/mentors
router.get('/mentors', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        mentors: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ mentors: user.mentors });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/v1/me/courses
router.get('/courses', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        enrolledCourses: { select: { id: true, title: true, thumbnail: true } },
        assignedCourses: { select: { id: true, title: true, thumbnail: true } }
      }
    });

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({
      enrolledCourses: user.enrolledCourses,
      assignedCourses: user.assignedCourses
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
