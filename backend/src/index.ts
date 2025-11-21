import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import memberRoutes from './routes/memberRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import transportRoutes from './routes/transportRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/members', memberRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/transport', transportRoutes);

app.get('/', (req, res) => {
    res.send('Fellowship Information Management System API');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
