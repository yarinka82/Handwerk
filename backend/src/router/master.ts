import { Router } from 'express';
import { validateBody } from '../middlewares/validateBody';
import { MasterSchema } from '../validation/master';
import {
  registrationMasterController,
  updateMasterProfileController,
} from '../controller/master';
import { upload } from '../middlewares/multer';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.use(authenticate);

router.post(
  '/register-master',
  upload.fields([
    { name: 'photoFile', maxCount: 1 },
    { name: 'documentFiles', maxCount: 5 },
  ]),
  validateBody(MasterSchema),
  registrationMasterController,
);

router.patch(
  '/update-master',
  upload.fields([
    { name: 'photoFile', maxCount: 1 },
    { name: 'documentFiles', maxCount: 5 },
  ]),
  validateBody(MasterSchema),
  updateMasterProfileController,
);

export default router;
