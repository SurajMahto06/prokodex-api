import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const url = new URL(process.env.DATABASE_URL!);

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.replace('/', ''),
});

export const prisma = new PrismaClient({ adapter });
