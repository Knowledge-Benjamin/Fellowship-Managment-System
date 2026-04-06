import dotenv from 'dotenv';
import path from 'path';

// ⚠️ MUST be called FIRST before any other imports that use process.env (e.g. Prisma)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dns from 'dns';

import { processEmailQueue } from './services/emailService';
import { tenantMiddleware } from './middleware/tenantMiddleware';
import { disconnectAll } from './lib/prismaConnectionManager';

// Force IPv4 resolution to avoid connectivity issues on some platforms (Render/AWS)
dns.setDefaultResultOrder('ipv4first');
import authRoutes from './routes/authRoutes';
import memberRoutes from './routes/memberRoutes';
import eventRoutes from './routes/eventRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import transportRoutes from './routes/transportRoutes';
import reportRoutes from './routes/reportRoutes';
import volunteerRoutes from './routes/volunteerRoutes';
import regionRoutes from './routes/regionRoutes';
import tagRoutes from './routes/tagRoutes';
import courseRoutes from './routes/courseRoutes';
import collegeRoutes from './routes/collegeRoutes';
import salvationRoutes from './routes/salvationRoutes';
import residenceRoutes from './routes/residenceRoutes';
import teamRoutes from './routes/teamRoutes';
import leadershipRoutes from './routes/leadershipRoutes';
import familyRoutes from './routes/familyRoutes';
import academicPeriodRoutes from './routes/academicPeriodRoutes';
import selfRegRoutes from './routes/selfRegRoutes';
import emailRoutes from './routes/emailRoutes';
import transferRoutes from './routes/transferRoutes';
import familyTransferRoutes from './routes/familyTransferRoutes';
import bringOneRoutes from './routes/bringOneRoutes';
import campaignRoutes from './routes/campaignRoutes';
import systemRoutes from './routes/systemRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - Required for Render/Heroku/etc to get correct client IP
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Rate Limiting - Relaxed to prevent 429 errors during normal usage
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per windowMs (increased from 100)
    message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

app.use(express.json());

// ── System Admin Routes (Control Plane) ─────────────────────────────────────
// These MUST be registered BEFORE tenantMiddleware so they route to the
// Management DB, not a campus DB. No X-Campus-Domain header is required.
app.use('/api/system', systemRoutes);

// ── Tenant Database Injection ────────────────────────────────────────────────
// Resolves the correct Neon PrismaClient for each campus and attaches it to
// req.prisma before any route handler runs.
app.use(tenantMiddleware);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/regions', regionRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/colleges', collegeRoutes);
app.use('/api/salvations', salvationRoutes);
app.use('/api/residences', residenceRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/leadership', leadershipRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/academic-periods', academicPeriodRoutes);
// Self-registration (public + FM routes bundled in one router)
app.use('/api', selfRegRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/family-transfers', familyTransferRoutes);
app.use('/api/bring-one', bringOneRoutes);
app.use('/api/campaigns', campaignRoutes);

app.get('/', (req, res) => {
    res.send('Fellowship Information Management System API');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);

    // Start Email Queue Processor (Background Job)
    console.log('[BACKGROUND] 📧 Starting Email Queue Processor...');
    setInterval(() => {
        processEmailQueue().catch(err => console.error('[BACKGROUND] Email processor error:', err));
    }, 30000); // Check every 30 seconds
});

// Graceful shutdown — close all Neon connections cleanly
process.on('SIGTERM', async () => {
    console.log('[Server] SIGTERM received. Closing database connections...');
    await disconnectAll();
    process.exit(0);
});
process.on('SIGINT', async () => {
    await disconnectAll();
    process.exit(0);
});
