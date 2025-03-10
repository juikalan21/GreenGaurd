import express from 'express';
import irrigationRoutes from './routes/irrigationRoutes';
import airoutes from './routes/aiRoutes';

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api/irrigation', irrigationRoutes);
app.use('/api/ai', airoutes);


// Other app setup code...


export default app;