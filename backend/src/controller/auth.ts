import { Request, Response } from 'express';
import {
  changePassword,
  changeUserData,
  confirmEmailOrPhone,
  confirmQuickRegister,
  getUserInfo,
  loginUser,
  logoutUser,
  quickLogin,
  refreshUser,
  registerUser,
  requestChangePassword,
  requestConfirmEmailOrPhone,
  requestQuickLogin,
  requestResetPassword,
  resetPassword,
} from '../service/auth';
import { setupSession } from '../utils/setupSession';

export const registerUserController = async (req: Request, res: Response) => {
  const { newUser, session } = await registerUser(req.body);

  setupSession(res, session);

  res.status(201).json({
    status: 201,
    message: 'Successfully register user',
    data: { newUser, accessToken: session.accessToken },
  });
};

export const loginUserController = async (req: Request, res: Response) => {
  const { user, session } = await loginUser(req.body);

  setupSession(res, session);

  res.status(200).json({
    status: 200,
    message: 'Successfully log in user',
    data: {
      user,
      accessToken: session.accessToken,
    },
  });
};

export const logoutUserControler = async (req: Request, res: Response) => {
  if (req.cookies.sessionId) {
    await logoutUser(req.cookies.sessionId);
  }

  res.clearCookie('sessionId');
  res.clearCookie('refreshToken');

  res.status(204).send();
};

export const refreshUserController = async (req: Request, res: Response) => {
  const session = await refreshUser({
    sessionId: req.cookies.sessionId,
    refreshToken: req.cookies.refreshToken,
  });

  setupSession(res, session);

  res.status(200).json({
    status: 200,
    message: 'Successfully refreshed a session',
    data: {
      accessToken: session.accessToken,
    },
  });
};

export const requestResetPasswordController = async (
  req: Request,
  res: Response,
) => {
  const data = await requestResetPassword(req.body);

  res.status(200).json({
    status: 200,
    message: 'Successed, send email request reset password',
    data,
  });
};

export const resetPasswordController = async (req: Request, res: Response) => {
  await resetPassword(req.body);

  res.status(200).json({
    status: 200,
    message: 'Password has been successfully reset.',
    data: { success: true },
  });
};

export const requestQuickLoginController = async (
  req: Request,
  res: Response,
) => {
  await requestQuickLogin(req.body);

  res.status(200).json({
    status: 200,
    message: 'Request by sent',
    data: { success: true },
  });
};

export const quickLoginController = async (req: Request, res: Response) => {
  const { data, session } = await quickLogin(req.body);

  setupSession(res, session);

  res.status(200).json({
    status: 200,
    message: 'Successfully register user',
    data,
  });
};

export const requestQuickRegisterController = async (
  req: Request,
  res: Response,
) => {
  const data = await confirmQuickRegister(req.body);

  res.status(200).json({
    status: 200,
    message: 'Successfully register user',
    data,
  });
};

export const confirmQuickRegisterController = async (
  req: Request,
  res: Response,
) => {
  const { data, session } = await confirmQuickRegister(req.body);

  setupSession(res, session);

  res.status(200).json({
    status: 200,
    message: 'Successfully registered',
    data,
  });
};

export const changeUserDataController = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user = await changeUserData({ payload: req.body, userId: req.user.id });

  res.status(200).json({
    status: 200,
    message: 'Change has been successfully ',
    data: { success: true, user },
  });
};

export const requestConfirmEmailController = async (
  req: Request,
  res: Response,
) => {
  await requestConfirmEmailOrPhone({
    type: 'email',
    user: req.user,
  });

  res.status(200).json({
    status: 200,
    message: 'Reques change email has been successfully ',
    data: { success: true },
  });
};

export const requestConfirmPhoneController = async (
  req: Request,
  res: Response,
) => {
  const data = await requestConfirmEmailOrPhone({
    type: 'phone',
    user: req.user,
  });

  res.status(200).json({
    status: 200,
    message: 'Reques change phone number has been successfully ',
    data,
  });
};

export const requestChangePasswordController = async (
  req: Request,
  res: Response,
) => {
  const data = await requestChangePassword({
    user: req.user,
    password: req.body,
  });

  res.status(200).json({
    status: 200,
    message: 'Request change password has been successfully ',
    data,
  });
};

export const confirmChangePasswordController = async (
  req: Request,
  res: Response,
) => {
  const data = await changePassword({
    userId: req.user.id,
    ...req.body,
  });

  res.status(200).json({
    status: 200,
    message: 'Password change has been successfully ',
    data,
  });
};

export const ConfirmEmailController = async (req: Request, res: Response) => {
  const data = await confirmEmailOrPhone({
    type: 'email',
    userId: req.user.id,
    ...req.body,
  });


  res.status(200).json({
    status: 200,
    message: 'Email has been confirm successfully ',
    data,
  });
};

export const ConfirmPhoneController = async (req: Request, res: Response) => {
  const data = await confirmEmailOrPhone({
    type: 'phone',
    userId: req.user.id,
    ...req.body,
  });


  res.status(200).json({
    status: 200,
    message: 'Phone number has been confirm successfully ',
    data,
  });
};

export const getUserInfoCntroller = async (req: Request, res: Response) => {
  const user = await getUserInfo(req.body.user.id);

  res.status(200).json({
    status: 200,
    message: 'Successfully get user info',
    data: user,
  });
};
