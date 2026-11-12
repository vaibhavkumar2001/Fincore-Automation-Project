import express from 'express';
import paymentRoutes from './payments/payment.routes';
// import { authMiddleware } from './middleware/auth'; // enable on Day 3

export const app = express();
app.use(express.json());

// Health endpoint so Playwright knows when the server is ready
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

app.use('/payments', /* authMiddleware, */ paymentRoutes);