import { Router } from 'express';
import { login, register, joinStaff, me, refreshToken, logout } from '../controllers/authController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/login', login);
// Account creation is admin-only — this is an internal staff tool, not public signup.
router.post('/register', authenticate, authorize('SUPER_ADMIN'), register);
// Public: new staff verify with email + 6-digit code and set their password.
router.post('/join', joinStaff);
router.post('/refresh', refreshToken);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);

export default router;
