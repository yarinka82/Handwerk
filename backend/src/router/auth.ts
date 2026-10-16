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
  requestChangeEmailController,
  confirmChangeEmailController,
  confirmChangePhoneController,
  requestChangePhoneController,
} from '../controller/auth';
import { validateBody } from '../middlewares/validateBody';
import {
  changeEmailSchema,
  changePasswordSchema,
  changePhoneSchema,
  changeProfileSchema,
  loginUserSchema,
  quickIdentityschema,
  registerUserSchema,
  resetPasswordSchema,
} from '../validation/auth';
import { BaseConfirmSchema, confirmSchema } from '../validation/confirm';

const router = Router();

router.post(
  '/register',
  validateBody(registerUserSchema),
  registerUserController,
);
router.post('/login', validateBody(loginUserSchema), loginUserController);

router.post(
  '/request-quick-login',
  validateBody(quickIdentityschema),
  requestQuickLoginController,
);

router.post('/quick-login', validateBody(confirmSchema), quickLoginController);

router.post(
  '/request-quick-register',
  validateBody(quickIdentityschema),
  requestQuickRegisterController,
);

router.post(
  '/quick-register',
  validateBody(confirmSchema),
  confirmQuickRegisterController,
);

router.post(
  '/request-reset-pwd',
  validateBody(quickIdentityschema),
  requestResetPasswordController,
);

router.post(
  '/reset-pwd',
  validateBody(resetPasswordSchema),
  resetPasswordController,
);

// router.use(authenticate);

router.post('/refresh', authenticate, refreshUserController);
router.post('/logout', authenticate, logoutUserControler);

router.patch(
  '/user',
  authenticate,
  validateBody(changeProfileSchema),
  changeUserDataController,
);
router.get('/user', getUserInfoCntroller);
// router.patch("/master",);

router.post(
  '/request-confirm-email',
  authenticate,
  requestConfirmEmailController,
);
router.patch(
  '/confirm-email',
  authenticate,
  validateBody(confirmSchema),
  ConfirmEmailController,
);

router.post(
  '/request-confirm-phone',
  authenticate,
  requestConfirmPhoneController,
);
router.patch(
  '/confirm-phone',
  authenticate,
  validateBody(confirmSchema),
  ConfirmPhoneController,
);

router.post(
  '/request-change-password',
  authenticate,
  validateBody(changePasswordSchema),
  requestChangePasswordController,
);
router.patch(
  '/change-password',
  authenticate,
  validateBody(BaseConfirmSchema),
  confirmChangePasswordController,
);

router.post(
  '/request-change-email',
  authenticate,
  validateBody(changeEmailSchema),
  requestChangeEmailController,
);
router.patch(
  '/change-email',
  authenticate,
  validateBody(BaseConfirmSchema),
  confirmChangeEmailController,
);

router.post(
  '/request-change-phone',
  authenticate,
  validateBody(changePhoneSchema),
  requestChangePhoneController,
);
router.patch(
  '/change-phone',
  authenticate,
  validateBody(BaseConfirmSchema),
  confirmChangePhoneController,
);

export default router;
