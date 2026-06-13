import { Router } from 'express';
import authRoutes from './auth';
import dashboardRoutes from './dashboard';
import guestRoutes from './guests';
import bookingRoutes from './bookings';
import revenueRoutes from './revenue';
import marketingRoutes from './marketing';
import whatsappRoutes from './whatsapp';
import taskRoutes from './tasks';
import automationRoutes from './automation';
import analyticsRoutes from './analytics';
import documentRoutes from './documents';
import aiRoutes from './ai';
import userRoutes from './users';
import publicRoutes from './public';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/guests', guestRoutes);
router.use('/bookings', bookingRoutes);
router.use('/revenue', revenueRoutes);
router.use('/marketing', marketingRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/tasks', taskRoutes);
router.use('/automation', automationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/documents', documentRoutes);
router.use('/ai', aiRoutes);
router.use('/users', userRoutes);
router.use('/public', publicRoutes);

export default router;
