import express from 'express';
import authRoutes from './auth/auth.routes';
import accountRoutes from './accounts/account.routes';
import transferRoutes from './transfers/transfer.routes';
import paymentRoutes from './payments/payment.routes';
import { authMiddleware } from './middleware/auth';

export const app = express();
app.use(express.json());

// Health endpoint so Playwright knows when the server is ready
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

// Public routes
app.use('/auth', authRoutes);

// Protected routes: a valid Bearer token is required
app.use('/accounts', authMiddleware, accountRoutes);
app.use('/transfers', authMiddleware, transferRoutes);
app.use('/payments', authMiddleware, paymentRoutes);