import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

app.use(express.json());

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

app.get('/', (req, res) => {
    res.send('Fellowship Information Management System API');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
