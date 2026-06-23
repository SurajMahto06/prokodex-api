import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt';

// Helper to exclude password and map assignedCourses to assignedCourses
const formatUserResponse = (user: any) => {
  const { password, assignedCourses, ...userWithoutPassword } = user;
  const result: any = { ...userWithoutPassword };
  if (assignedCourses) {
    result.assignedCourses = assignedCourses;
  }
  return result;
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        enrolledCourses: { select: { id: true, title: true } },
        assignedCourses: { select: { id: true, title: true } },
        completedTopics: { select: { id: true } },
        mentees: { select: { id: true } },
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    if (settings?.maintenanceMode && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Platform is currently under maintenance. Please try again later.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      message: 'Logged in successfully',
      user: formatUserResponse(user),
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const logout = async (req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  res.status(200).json({ message: 'Logged out successfully' });
};
// Get current authenticated user's profile
export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        enrolledCourses: { select: { id: true, title: true, thumbnail: true } },
        assignedCourses: { select: { id: true, title: true, thumbnail: true } },
        completedTopics: { select: { id: true } },
        mentees: { select: { id: true } },
        certificates: {
          select: { id: true, certificateId: true, issueDate: true, course: { select: { id: true, title: true } } },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user: formatUserResponse(user) });
  } catch (error: any) {
    console.error('GetMe error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const completeTopic = async (req: Request, res: Response) => {
  try {
    const { topicId } = req.body;
    const userId = req.user.id;

    if (!topicId) {
      return res.status(400).json({ message: 'topicId is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        enrolledCourses: {
          include: {
            modules: {
              include: {
                topics: true
              }
            }
          }
        },
        completedTopics: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const alreadyCompleted = user.completedTopics.some(t => t.id === topicId);
    let updatedCompletedTopics = [...user.completedTopics];

    if (!alreadyCompleted) {
      updatedCompletedTopics.push({ id: topicId } as any);
      await prisma.user.update({
        where: { id: userId },
        data: {
          completedTopics: {
            connect: { id: topicId }
          }
        }
      });
    }

    // Calculate total topics across all enrolled courses
    let totalTopics = 0;
    for (const course of user.enrolledCourses) {
      for (const mod of course.modules) {
        totalTopics += mod.topics.length;
      }
    }

    let progressPercentage = 0;
    if (totalTopics > 0) {
      progressPercentage = Math.round((updatedCompletedTopics.length / totalTopics) * 100);
    }

    if (progressPercentage > 100) progressPercentage = 100;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { progressPercentage }
    });

    res.status(200).json({ message: 'Topic marked as complete', progressPercentage });
  } catch (error: any) {
    console.error('CompleteTopic error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
