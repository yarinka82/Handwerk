import createHttpError from 'http-errors';
import bcrypt from 'bcrypt';
import { sendEmail } from '../utils/sendEmail';
import { randomBytes } from 'node:crypto';
import { ONE_DAY, THIRTY_DAY } from '../constants';
import { verificationServise } from './verificationServise';
import { BaseUser, Channel } from '../types/types';
import { redisConnection } from '../utils/redis';
import { resetAllSession } from '../utils/resetAllSession';
import { prisma } from '../prisma';
import { sanitizeUser } from '../utils/sanitiseUser';
import { Prisma, User } from '@prisma/client';
import { definishnChannelMessage } from '../utils/definishnChannelMessage';

type RegisterPayload =
  | {
      email: string;
      phone: never;
      password: string;
      name?: string;
    }
  | {
      email: never;
      phone: string;
      password: string;
      name?: string;
    };

export type ResetPasswordPayload = {
  channel: Channel;
  value: string;
  password: string;
  token?: string;
  code?: string;
};

type ChangeUserData = {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
};

export const registerUser = async (payload: RegisterPayload) => {
  const whereUser = payload.email
    ? { email: payload.email }
    : { phone: payload.phone };

  const user = await prisma.user.findUnique({
    where: whereUser,
  });

  const messageErr = payload.email
    ? 'Email is already in use'
    : 'Phone number is already in use';

  if (user) {
    throw createHttpError(409, 'Conflict error', {
      data: {
        message: messageErr,
      },
    });
  }

  const encryptedPassword = await bcrypt.hash(payload.password, 10);

  const data = {
    ...(payload.email ? { email: payload.email } : {}),
    ...(payload.phone ? { phone: payload.phone } : {}),
    password: encryptedPassword,
    name: payload.name ?? payload.email.split('@')[0] ?? null,
    preferredChannel: payload.email ? 'email' : 'phone',
  };

  const newUser = await prisma.user.create({
    data,
  });

  if (payload.email) {
    await sendEmail({
      to: payload.email,
      subject: 'Willkommen bei AI Handwerk!',
      html: `<p>Hallo, ${payload.name ?? payload.email.split('@')[0]}</p>
    <p>Herzlichen Glückwunsch zu deiner erfolgreichen Registrierung!</p>
    <p>Wir freuen uns, dich in unserer Community begrüßen zu dürfen.</p>
    <p>Viele Grüße,<br/>Dein AI Handwerk Team</p>`,
    });
  }
  const session = await createSession(newUser.id);

  return { newUser: sanitizeUser(newUser), session };
};

export const loginUser = async (payload: RegisterPayload) => {
  const whereUser = payload.email
    ? { email: payload.email }
    : { phone: payload.phone };

  const user = await prisma.user.findUnique({
    where: whereUser,
  });

  if (!user) throw createHttpError(401, 'User not found');

  if (!user.password) throw createHttpError(401, 'User has no password set');

  const isEqual = await bcrypt.compare(payload.password, user.password);

  if (!isEqual) throw createHttpError(401, 'Unauthorized');

  const session = await createSession(user.id);

  return { user: sanitizeUser(user), session };
};

export const logoutUser = async ({
  sessionId,
  userId,
}: {
  sessionId: string;
  userId: string;
}) => {
  const sessionKey = `session:${sessionId}`;
  const userSessionKey = `user:${userId}:sessions`;

  await redisConnection
    .multi()
    .del(sessionKey)
    .srem(userSessionKey, sessionId)
    .exec();
};

export const createSession = async (userId: number) => {
  const sessionId = randomBytes(16).toString('hex');
  const accessToken = randomBytes(32).toString('base64url');
  const refreshToken = randomBytes(32).toString('base64url');

  const sessionData = {
    userId,
    accessToken,
    refreshToken,
  };
  const sessionKey = `session:${sessionId}`;
  const userSessionKey = `user:${userId}:sessions`;

  await redisConnection
    .multi()
    .set(sessionKey, JSON.stringify(sessionData), 'EX', THIRTY_DAY)
    .sadd(userSessionKey, sessionId)
    .expire(userSessionKey, THIRTY_DAY)
    .exec();

  return {
    sessionId,
    ...sessionData,
    accessTokenValidUntil: new Date(Date.now() + ONE_DAY),
  };
};

export const refreshUser = async ({
  sessionId,
  refreshToken,
}: {
  sessionId: string;
  refreshToken: string;
}) => {
  const rawSession = await redisConnection.get(`session:${sessionId}`);

  if (!rawSession) throw createHttpError(401, 'Invalid or expired session');

  const session = JSON.parse(rawSession);

  if (session.refreshToken !== refreshToken) {
    await redisConnection.del(`session:${sessionId}`);
    throw createHttpError(401, 'nvalid or expired session');
  }

  const newAccessToken = randomBytes(32).toString('base64url');
  const newRefreshToken = randomBytes(32).toString('base64url');

  const newData = {
    userId: session.userId,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };

  await redisConnection.set(
    `session:${sessionId}`,
    JSON.stringify(newData),
    'EX',
    THIRTY_DAY,
  );

  return {
    sessionId,
    ...newData,
    accessTokenValidUntil: new Date(Date.now() + ONE_DAY),
  };
};

export const requestResetPassword = async ({
  channel,
  value,
}: {
  channel: 'email' | 'phone';
  value: string;
}) => {
  const queryWhere = {
    [channel]: value,
  } as unknown as Prisma.UserWhereUniqueInput;

  const user = await prisma.user.findUnique({
    where: queryWhere,
  });

  if (!user) throw createHttpError(401, 'User not found');

  await definishnChannelMessage({
    user: user as BaseUser,
    channel,
    type: 'PASSWORD_RESET',
  });
  return { success: true };
};

export const resetPassword = async (payload: ResetPasswordPayload) => {
  const { token, code, password, channel, value } = payload;

  const verification = await verificationServise({
    ...(token ? { token } : {}),
    ...(code ? { code } : {}),
    channel,
    value,
    expectedType: 'PASSWORD_RESET',
  });

  if (!verification || verification.data.type !== 'PASSWORD_RESET') {
    throw createHttpError(401, 'Invalid reset token');
  }

  const encryptedPassword = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: {
      id: verification.data.userId,
    },
    data: {
      password: encryptedPassword,
    },
  });
  await resetAllSession(verification.data.userId);

  return { success: true };
};

export const requestQuickLogin = async ({
  channel,
  value,
}: {
  channel: Channel;
  value: string;
}) => {
  const queryWhere = {
    [channel]: value,
  } as unknown as Prisma.UserWhereUniqueInput;

  const user = await prisma.user.findUnique({
    where: queryWhere,
  });

  if (!user) throw createHttpError(401, 'User not found');

  await definishnChannelMessage({
    channel,
    user: user as BaseUser,
    type: 'LOGIN',
  });

  return { user: sanitizeUser(user) };
};

export const quickLogin = async ({
  channel,
  value,
  token,
  code,
}: {
  value: string;
  channel: Channel;
  token?: string;
  code: string;
}) => {
  const verification = await verificationServise({
    expectedType: 'LOGIN',
    channel,
    value,
    ...(code ? { code } : {}),
    ...(token ? { token } : {}),
  });

  if (!verification.session || !verification.data)
    throw createHttpError(404, 'Code not valid or expired');

  return {
    data: verification.data,
    session: verification.session,
  };
};

export const requestQuickRegister = async ({
  channel,
  value,
}: {
  channel: Channel;
  value: string;
}) => {
  const prismaData = {
    [channel]: value,
  } as unknown as Prisma.UserWhereUniqueInput;

  const user = await prisma.user.findUnique({
    where: prismaData,
  });

  if (user) {
    throw createHttpError(409, 'Conflict error', {
      data: {
        message:
          channel === 'email'
            ? 'Email is already in use'
            : 'Phone number is already in use',
      },
    });
  }

  const defaultName =
    channel === 'email'
      ? value.split('@')[0] || value
      : `User_${value.slice(-4)}`;

  const virtualUser: BaseUser =
    channel === 'email'
      ? {
          email: value,
          name: defaultName,
        }
      : {
          phone: value,
          name: defaultName,
        };

  await definishnChannelMessage({
    channel,
    user: virtualUser,
    type: 'REGISTER',
  });

  return {
    success: true,
    message:
      channel === 'email'
        ? 'Verification code sent to your email'
        : 'Verification code sent to your phone',
    data: {
      channel,
      target: value,
    },
  };
};

export const confirmQuickRegister = async ({
  channel,
  value,
  code,
  token,
}: {
  channel: Channel;
  value: string;
  code?: string;
  token?: string;
}) => {
  const { data, session } = await verificationServise({
    channel,
    value,
    expectedType: 'REGISTER',
    ...(code ? { code } : {}),
    ...(token ? { token } : {}),
  });

  if (!data || !session)
    throw createHttpError(401, 'Verification failed or session expired');

  return {
    data,
    session,
  };
};

export const changeUserData = async ({
  payload,
  userId,
}: {
  payload: ChangeUserData;
  userId: number;
}) => {
  if (payload.email) {
    const existingEmailUser = await prisma.user.findFirst({
      where: {
        email: payload.email,
        id: {
          not: userId,
        },
      },
    });

    if (existingEmailUser) {
      throw createHttpError(
        409,
        'Conflict error',
        'This email address is already in use by another account',
      );
    }
  }

  if (payload.phone) {
    const existingPhoneUser = await prisma.user.findFirst({
      where: {
        phone: payload.phone,
        id: {
          not: userId,
        },
      },
    });

    if (existingPhoneUser)
      throw createHttpError(
        409,
        'This phone number is already in use by another account',
      );
  }

  const data: Record<string, string | null> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (value == null) continue;

    data[key] = value;
  }

  if (payload.email) {
    data.emailVerifiedAt = null;
  }

  if (payload.phone) {
    data.phoneVerifiedAt = null;
  }

  const user = await prisma.user.update({
    where: {
      id: userId,
    },
    data: data as Prisma.UserUpdateInput,
  });

  return { user: sanitizeUser(user) };
};

export const requestConfirmEmailOrPhone = async ({
  type,
  user,
}: {
  type: 'email' | 'phone';
  user: User;
}) => {
  if (type === 'email') {
    if (!user.email)
      throw createHttpError(400, 'Email address is missing in your profile');
    if (user.emailVerifiedAt)
      throw createHttpError(400, 'Email is already verified');

    const data = await definishnChannelMessage({
      channel: type,
      user: user as BaseUser,
      type: 'EMAIL_CONFIRM',
    });
    return data;
  }

  if (type === 'phone') {
    if (!user.phone)
      throw createHttpError(400, 'Phone number is missing in your profile');
    if (user.phoneVerifiedAt)
      throw createHttpError(400, 'Email is already verified');

    const data = await definishnChannelMessage({
      channel: type,
      user: sanitizeUser(user) as BaseUser,
      type: 'PHONE_CONFIRM',
    });
    return data;
  }
};

export const confirmEmailOrPhone = async ({
  type,
  code,
  token,
  user,
}: {
  type: 'email' | 'phone';
  token?: string;
  code?: string;
  user: User;
}) => {
  const value = type === 'email' ? user.email : user.phone;

  if (!value) throw createHttpError(401,`For confirm ${type} value may be required`)

  const verification = await verificationServise({
    userId: user.id,
    value,
    expectedType: type === 'email' ? 'EMAIL_CONFIRM' : 'PHONE_CONFIRM',
    ...(token ? { token } : {}),
    ...(code ? { code } : {}),
  });

  if (!verification) throw createHttpError(401, 'Problem verification');

  if (type === 'email') {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailVerifiedAt: new Date(),
      },
    });
  } else if (type === 'phone') {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        phoneVerifiedAt: new Date(),
      },
    });
  }

  return { success: true };
};

export const requestChangePassword = async ({
  user,
  password,
}: {
  user: User;
  password: string;
}) => {
  if (!user.email && !user.phone)
    throw createHttpError(
      401,
      'For change password may be email or phone available',
    );
  const encryptedPassword = await bcrypt.hash(password, 10);

  const data = await definishnChannelMessage({
    user: user as BaseUser,
    type: 'PASSWORD_CHANGE',
    inputData: encryptedPassword,
  });

  return data;
};

export const changePassword = async ({
  userId,
  code,
  token,
}: {
  userId: number;
  code: string;
  token?: string;
}) => {
  const verification = await verificationServise({
    userId,
    code,
    ...(token ? { token } : {}),
    expectedType: 'PASSWORD_CHANGE',
  });

  if (
    !verification ||
    !verification.data ||
    !verification.data.userId ||
    !verification.session
  ) {
    throw createHttpError(401, 'Problem verification');
  }

  const savedHash = verification.password;
  if (!savedHash) {
    throw createHttpError(
      400,
      'Password hash not found in verification session',
    );
  }

  const targetUserId = verification.data.userId;
  if (!targetUserId)
    throw createHttpError(401, 'Problem verification: User ID missing');

  await prisma.user.update({
    where: {
      id: targetUserId,
    },
    data: {
      password: savedHash,
    },
  });
  await resetAllSession(targetUserId);

  const newSession = await createSession(targetUserId);

  return {
    data: verification.data,
    session: newSession,
  };
};

export const getUserInfo = async (id: number) => {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
  });

  if (!user) throw createHttpError(404, 'User not found');

  return { user: sanitizeUser(user) };
};
