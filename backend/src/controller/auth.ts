import { Request, Response } from 'express';
import {
  changePassword,
  changeUserData,
  confirmChangeEmailOrPhone,
  confirmEmailOrPhone,
  confirmQuickRegister,
  getUserInfo,
  loginUser,
  logoutUser,
  quickLogin,
  refreshUser,
  registerUser,
  requestChangeEmailOrPhone,
  requestChangePassword,
  requestConfirmEmailOrPhone,
  requestQuickLogin,
  requestQuickRegister,
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
  const data = await requestResetPassword(req.body.identifier);

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
  await requestQuickLogin(req.body.identifier);

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
    message: 'Successfully log in user',
    data: {
      ...data,
      accessToken: session.accessToken,
    },
  });
};

export const requestQuickRegisterController = async (
  req: Request,
  res: Response,
) => {
  const data = await requestQuickRegister(req.body.identifier);

  res.status(200).json({
    status: 200,
    message: 'Successfully request by sent',
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
    data: {
      ...data,
      accessToken: session.accessToken,
    },
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
    password: req.body.password,
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
  const { data, session } = await changePassword({
    userId: req.user.id,
    ...req.body,
  });

  setupSession(res, session);

  res.status(200).json({
    status: 200,
    message: 'Password change has been successfully ',
    data: {
      ...data,
      accessToken: session.accessToken,
    },
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

export const requestChangeEmailController = async (
  req: Request,
  res: Response,
) => {
  const data = await requestChangeEmailOrPhone({
    user: req.user,
    payload: {
      password: req.body.password,
      channel: 'email',
      value: req.body.email,
    },
  });

  res.status(200).json({
    status: 200,
    message: 'Request change email has been successfully ',
    data,
  });
};

export const confirmChangeEmailController = async (
  req: Request,
  res: Response,
) => {
  const data = await confirmChangeEmailOrPhone({
    user: req.user,
    payload: {
      code: req.body.code,
      channel: 'email',
    },
  });

  res.status(200).json({
    status: 200,
    message: 'Email change successfully ',
    data,
  });
};

export const requestChangePhoneController = async (
  req: Request,
  res: Response,
) => {
  const data = await requestChangeEmailOrPhone({
    user: req.user,
    payload: {
      password: req.body.password,
      channel: 'phone',
      value: req.body.phone,
    },
  });

  res.status(200).json({
    status: 200,
    message: 'Request change phone has been successfully ',
    data,
  });
};

export const confirmChangePhoneController = async (
  req: Request,
  res: Response,
) => {
  const data = await confirmChangeEmailOrPhone({
    user: req.user,
    payload: {
      code: req.body.code,
      channel: 'phone',
    },
  });

  res.status(200).json({
    status: 200,
    message: 'Phone change successfully ',
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
