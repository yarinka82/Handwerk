import { Router } from 'express';
import { verificationController } from '../controller/verification';

const router = Router();

router.post('/verification', verificationController);

export default router;
