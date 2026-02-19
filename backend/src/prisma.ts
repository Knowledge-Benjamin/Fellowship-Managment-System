import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load .env before PrismaClient is instantiated so DATABASE_URL is available
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

export default prisma;
