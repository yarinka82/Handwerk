import { Router } from 'express';
import authRouter from './auth';
import orderRouter from './order';
import masterRouter from './master';

import verificationRouter from './verification';

const router = Router();

router.use('/auth', authRouter);

// router.use('/auth', confirmRouter);

router.use('/auth', verificationRouter);

router.use('/auth', masterRouter);

router.use('/order', orderRouter);

export default router;
