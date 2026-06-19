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

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, plan, status, enrolledCourseIds, assignedCourseIds } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role ? String(role).toUpperCase() : 'STUDENT';

    let overlappingMentors: { id: string }[] = [];
    let overlappingStudents: { id: string }[] = [];

    if (userRole === 'STUDENT' && enrolledCourseIds && enrolledCourseIds.length > 0) {
      overlappingMentors = await prisma.user.findMany({
        where: {
          role: 'MENTOR',
          assignedCourses: { some: { id: { in: enrolledCourseIds } } }
        },
        select: { id: true }
      });
    } else if (userRole === 'MENTOR' && assignedCourseIds && assignedCourseIds.length > 0) {
      overlappingStudents = await prisma.user.findMany({
        where: {
          role: 'STUDENT',
          enrolledCourses: { some: { id: { in: assignedCourseIds } } }
        },
        select: { id: true }
      });
    }

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: userRole as any,
        plan: plan || null,
        status: status || 'active',
        // Connect to enrolled courses (for students)
        ...(userRole === 'STUDENT' && enrolledCourseIds && enrolledCourseIds.length > 0 && {
          enrolledCourses: {
            connect: enrolledCourseIds.map((id: string) => ({ id })),
          },
        }),
        // Connect to assigned projects (for mentors)
        ...(userRole === 'MENTOR' && assignedCourseIds && assignedCourseIds.length > 0 && {
          assignedCourses: {
            connect: assignedCourseIds.map((id: string) => ({ id })),
          },
        }),
        // Connect to mentors automatically (for students)
        ...(overlappingMentors.length > 0 && {
          mentors: {
            connect: overlappingMentors,
          },
        }),
        // Connect to mentees automatically (for mentors)
        ...(overlappingStudents.length > 0 && {
          mentees: {
            connect: overlappingStudents,
          },
        }),
      },
      include: {
        enrolledCourses: { select: { id: true, title: true } },
        assignedCourses: { select: { id: true, title: true } },
      },
    });

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    res.status(201).json({
      message: 'User registered successfully',
      user: formatUserResponse(user),
      token,
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    res.status(200).json({
      message: 'Logged in successfully',
      user: formatUserResponse(user),
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
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
