import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import {
  changeUserDataController,
  getUserInfoCntroller,
  loginUserController,
  logoutUserControler,
  quickLoginController,
  requestQuickRegisterController,
  refreshUserController,
  registerUserController,
  requestChangePasswordController,
  requestQuickLoginController,
  requestResetPasswordController,
  resetPasswordController,
  confirmQuickRegisterController,
  requestConfirmEmailController,
  requestConfirmPhoneController,
  confirmChangePasswordController,
  ConfirmPhoneController,
  ConfirmEmailController,
} from '../controller/auth';
import { validateBody } from '../middlewares/validateBody';
import {
  BaseUserSchema,
  changePasswordSchema,
  changeProfileSchema,
  confirmSchema,
  loginUserSchema,
  quickConfirmSchema,
  registerUserSchema,
  resetPasswordSchema,
} from '../validation/auth';

const router = Router();

router.post(
  '/register',
  validateBody(registerUserSchema),
  registerUserController,
);
router.post('/login', validateBody(loginUserSchema), loginUserController);

router.post(
  '/request-quick-login',
  validateBody(BaseUserSchema),
  requestQuickLoginController,
);
router.post(
  '/quick-login',
  validateBody(quickConfirmSchema),
  quickLoginController,
);

router.post('/quick-register', requestQuickRegisterController);
router.post(
  '/confirm-quick-register',
  validateBody(quickConfirmSchema),
  confirmQuickRegisterController,
);

router.post(
  '/send-reset-pwd',
  validateBody(BaseUserSchema),
  requestResetPasswordController,
);

router.post(
  '/reset-pwd',
  validateBody(resetPasswordSchema),
  resetPasswordController,
);

router.use(authenticate);

router.post('/refresh', refreshUserController);
router.post('/logout', logoutUserControler);


router.patch(
  '/user',
  validateBody(changeProfileSchema),
  changeUserDataController,
);
router.get('/user', getUserInfoCntroller);
// router.patch("/master",);

router.post(
  '/request-confirm-email',
  validateBody(BaseUserSchema),
  requestConfirmEmailController,
);
router.patch(
  '/confirm-email',
  validateBody(quickConfirmSchema),
  ConfirmEmailController,
);

router.post(
  '/request-confirm-phone',
  validateBody(BaseUserSchema),
  requestConfirmPhoneController,
);
router.patch(
  '/confirm-phone',
  validateBody(quickConfirmSchema),
  ConfirmPhoneController,
);

router.post(
  '/request-change-password',
  validateBody(changePasswordSchema),
  requestChangePasswordController,
);
router.patch(
  '/change-password',
  validateBody(confirmSchema),
  confirmChangePasswordController,
);

export default router;
