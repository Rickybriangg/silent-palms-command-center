import { Router } from 'express';
import { getDashboardStats, getRevenueChart, getOccupancyHeatmap } from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/stats', getDashboardStats);
router.get('/revenue-chart', getRevenueChart);
router.get('/occupancy-heatmap', getOccupancyHeatmap);

export default router;
