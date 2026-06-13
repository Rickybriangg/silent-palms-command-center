import { Router } from 'express';
import { getBookings, getBooking, createBooking, updateBooking, getCalendar, getAvailability } from '../controllers/bookingController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getBookings);
router.post('/', createBooking);
router.get('/calendar', getCalendar);
router.get('/availability', getAvailability);
router.get('/:id', getBooking);
router.put('/:id', updateBooking);

export default router;
