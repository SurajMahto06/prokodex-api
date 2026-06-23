import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import bcrypt from 'bcrypt';

// Helper to exclude password and map assignedCourses to assignedCourses
const formatUserResponse = (user: any) => {
  const { password, assignedCourses, ...userWithoutPassword } = user;
  const result: any = { ...userWithoutPassword };
  if (assignedCourses) {
    result.assignedCourses = assignedCourses;
  }
  return result;
};

// GET /api/users/sync-mentors
export const syncMentors = async (req: Request, res: Response) => {
  try {
    const mentors = await prisma.user.findMany({
      where: { role: 'MENTOR' },
      include: { assignedCourses: true }
    });

    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      include: { enrolledCourses: true }
    });

    let syncedCount = 0;

    for (const mentor of mentors) {
      const assignedCourseIds = mentor.assignedCourses.map(c => c.id);
      if (assignedCourseIds.length === 0) continue;

      const overlappingStudents = students.filter(student => 
        student.enrolledCourses.some(course => assignedCourseIds.includes(course.id))
      );

      if (overlappingStudents.length > 0) {
        await prisma.user.update({
          where: { id: mentor.id },
          data: {
            mentees: {
              connect: overlappingStudents.map(s => ({ id: s.id }))
            }
          }
        });
        syncedCount++;
      }
    }

    for (const student of students) {
      const enrolledCourseIds = student.enrolledCourses.map(c => c.id);
      if (enrolledCourseIds.length === 0) continue;

      const overlappingMentors = mentors.filter(mentor => 
        mentor.assignedCourses.some(course => enrolledCourseIds.includes(course.id))
      );

      if (overlappingMentors.length > 0) {
        await prisma.user.update({
          where: { id: student.id },
          data: {
            mentors: {
              connect: overlappingMentors.map(m => ({ id: m.id }))
            }
          }
        });
      }
    }

    res.status(200).json({ message: `Sync completed! Updated relations for ${syncedCount} mentors.` });
  } catch (error: any) {
    console.error('Sync error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/users
export const getUsers = async (req: Request, res: Response) => {
  try {
    const { role, status, search } = req.query;
    
    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const requestedLimit = parseInt(req.query.per_page as string) || 20;
    const per_page = Math.min(requestedLimit, 100); // Hard cap at 100
    const skip = (page - 1) * per_page;

    // Build the where clause
    const whereClause: any = {};

    if (role) {
      whereClause.role = String(role).toUpperCase();
    }

    if (status) {
      whereClause.status = String(status);
    }

    if (search) {
      const searchStr = String(search);
      whereClause.OR = [
        { name: { contains: searchStr } },
        { email: { contains: searchStr } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        include: {
          enrolledCourses: { select: { id: true } },
          assignedCourses: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: per_page
      }),
      prisma.user.count({ where: whereClause })
    ]);

    const formattedUsers = users.map(user => formatUserResponse(user));
    const totalPages = Math.ceil(total / per_page);

    res.status(200).json({
      data: formattedUsers,
      total,
      page,
      totalPages,
      per_page
    });
  } catch (error: any) {
    console.error('GetUsers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/users/:id
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: id as string },
      include: {
        enrolledCourses: { select: { id: true, title: true } },
        assignedCourses: { select: { id: true, title: true } },
        mentees: { select: { id: true, name: true, email: true } },
        mentors: { select: { id: true, name: true, email: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(formatUserResponse(user));
  } catch (error: any) {
    console.error('GetUserById error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/users
// Note: Can also use authController.register, but this allows admin specific overrides
export const createUser = async (req: Request, res: Response) => {
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

    res.status(201).json({
      message: 'User created successfully',
      user: formatUserResponse(user),
    });
  } catch (error: any) {
    console.error('CreateUser error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /api/users/:id
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, name, role, plan, status, enrolledCourseIds, assignedCourseIds, password } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { id: id as string } });
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updateData: any = {};

    if (email) updateData.email = email;
    if (name) updateData.name = name;
    if (role) updateData.role = String(role).toUpperCase();
    if (plan !== undefined) updateData.plan = plan;
    if (status) updateData.status = status;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Handle relations if provided
    if (enrolledCourseIds !== undefined) {
      updateData.enrolledCourses = {
        set: [], // Disconnect all first
        connect: enrolledCourseIds.map((courseId: string) => ({ id: courseId })),
      };
    }

    if (assignedCourseIds !== undefined) {
      updateData.assignedCourses = {
        set: [], // Disconnect all first
        connect: assignedCourseIds.map((courseId: string) => ({ id: courseId })),
      };
    }

    const targetRole = updateData.role || existingUser.role;

    if (targetRole === 'STUDENT' && enrolledCourseIds !== undefined) {
      const overlappingMentors = await prisma.user.findMany({
        where: { role: 'MENTOR', assignedCourses: { some: { id: { in: enrolledCourseIds } } } },
        select: { id: true }
      });
      updateData.mentors = { set: [], connect: overlappingMentors };
    } else if (targetRole === 'MENTOR' && assignedCourseIds !== undefined) {
      const overlappingStudents = await prisma.user.findMany({
        where: { role: 'STUDENT', enrolledCourses: { some: { id: { in: assignedCourseIds } } } },
        select: { id: true }
      });
      updateData.mentees = { set: [], connect: overlappingStudents };
    }

    const user = await prisma.user.update({
      where: { id: id as string },
      data: updateData,
      include: {
        enrolledCourses: { select: { id: true, title: true } },
        assignedCourses: { select: { id: true, title: true } },
      },
    });

    res.status(200).json({
      message: 'User updated successfully',
      user: formatUserResponse(user),
    });
  } catch (error: any) {
    console.error('UpdateUser error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /api/users/:id
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { id: id as string } });
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    await prisma.user.delete({ where: { id: id as string } });

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('DeleteUser error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
