const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncMentorsAndMentees() {
  console.log('Syncing mentors and mentees based on course overlaps...');

  // Get all mentors
  const mentors = await prisma.user.findMany({
    where: { role: 'MENTOR' },
    include: { assignedCourses: true }
  });

  // Get all students
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    include: { enrolledCourses: true }
  });

  let syncedCount = 0;

  for (const mentor of mentors) {
    const assignedCourseIds = mentor.assignedCourses.map(c => c.id);
    if (assignedCourseIds.length === 0) continue;

    // Find overlapping students
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

    // Find overlapping mentors
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

  console.log(`Sync completed! Updated relations for ${syncedCount} mentors and their students.`);
  await prisma.$disconnect();
}

syncMentorsAndMentees().catch(console.error);
