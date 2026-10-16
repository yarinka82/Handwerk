import createHttpError from 'http-errors';
import bcrypt from 'bcrypt';
import { sendEmail } from '../utils/sendEmail';
import { randomBytes } from 'node:crypto';
import { ONE_DAY, THIRTY_DAY } from '../constants';
import { verificationService } from './verificationService';
import { BaseUser, Channel } from '../types/types';
import { redisConnection } from '../utils/redis';
import { resetAllSession } from '../utils/resetAllSession';
import { prisma } from '../prisma';
import { sanitizeUser } from '../utils/sanitiseUser';
import { Prisma, User } from '@prisma/client';
import { definishnChannelMessage } from '../utils/definishnChannelMessage';

type RegisterPayload = {
  identifier: {
    channel: 'email' | 'phone';
    value: string;
  };
  password: string;
  name?: string;
};

export type ResetPasswordPayload = {
  identifier: {
    channel: 'email' | 'phone';
    value: string;
  };
  password: string;
  token?: string;
  code?: string;
};

type ChangeUserData = {
  name?: string;
  preferredChannel?: string;
  latitude?: number;
  longitude?: number;
};

export const registerUser = async (payload: RegisterPayload) => {
  const { channel, value } = payload.identifier;

  const whereUser = channel === 'email' ? { email: value } : { phone: value };

  const user = await prisma.user.findUnique({
    where: whereUser,
  });

  const messageErr =
    channel === 'email'
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
    ...(channel === 'email' ? { email: value } : {}),
    ...(channel === 'phone' ? { phone: value } : {}),
    password: encryptedPassword,
    name: payload.name ?? value.split('@')[0] ?? null,
    preferredChannel: channel === 'email' ? 'email' : 'phone',
  };

  const newUser = await prisma.user.create({
    data,
  });

  if (channel === 'email') {
    await sendEmail({
      to: value,
      subject: 'Willkommen bei AI Handwerk!',
      html: `<p>Hallo, ${payload.name ?? value.split('@')[0]}</p>
    <p>Herzlichen Glückwunsch zu deiner erfolgreichen Registrierung!</p>
    <p>Wir freuen uns, dich in unserer Community begrüßen zu dürfen.</p>
    <p>Viele Grüße,<br/>Dein AI Handwerk Team</p>`,
    });
  }
  const session = await createSession(newUser.id);

  return { newUser: sanitizeUser(newUser), session };
};

export const loginUser = async (payload: RegisterPayload) => {
  const { channel, value } = payload.identifier;

  const whereUser = channel === 'email' ? { email: value } : { phone: value };

  const user = await prisma.user.findUnique({
    where: whereUser,
  });

  if (!user) throw createHttpError(401, 'Unauthorized');

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

export const createSession = async (userId: string) => {
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

  if (!user) return { success: true };

  await definishnChannelMessage({
    user: user as BaseUser,
    channel,
    type: 'PASSWORD_RESET',
  });
  return { success: true };
};

export const resetPassword = async (payload: ResetPasswordPayload) => {
  const { token, code, password, identifier } = payload;
  const { channel, value } = identifier;

  const verification = await verificationService({
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

  if (!user) throw createHttpError(401, 'Unauthorized');

  await definishnChannelMessage({
    channel,
    user: user as BaseUser,
    type: 'LOGIN',
  });

  return { user: sanitizeUser(user) };
};

export const quickLogin = async ({
  identifier,
  token,
  code,
}: {
  identifier: {
    value: string;
    channel: Channel;
  };
  token?: string;
  code: string;
}) => {
  const { channel, value } = identifier;

  const verification = await verificationService({
    expectedType: 'LOGIN',
    channel,
    value,
    ...(code ? { code } : {}),
    ...(token ? { token } : {}),
  });
  console.log('🚀 ~ quickLogin ~ verification:', verification);

  if (!verification.session || !verification.data)
    throw createHttpError(
      401,
      'Authentication failed: session could not be established',
    );

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
  console.log('🚀 ~ requestQuickRegister ~ value:', value);
  console.log('🚀 ~ requestQuickRegister ~channel:', channel);
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
  identifier,
  code,
  token,
}: {
  identifier: {
    channel: Channel;
    value: string;
  };
  code?: string;
  token?: string;
}) => {
  const { channel, value } = identifier;

  const { data, session } = await verificationService({
    channel,
    value,
    expectedType: 'REGISTER',
    ...(code ? { code } : {}),
    ...(token ? { token } : {}),
  });

  if (!data || !session) throw createHttpError(401, 'Unauthorized');

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
  userId: string;
}) => {
  // if (payload.phone) {
  //   const existingPhoneUser = await prisma.user.findFirst({
  //     where: {
  //       phone: payload.phone,
  //       id: {
  //         not: userId,
  //       },
  //     },
  //   });

  //   if (existingPhoneUser)
  //     throw createHttpError(
  //       409,
  //       'This phone number is already in use by another account',
  //     );
  // }

  const data: Record<string, string | number | null> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (value == null) continue;

    data[key] = value;
  }

  // if (payload.email) {
  //   data.emailVerifiedAt = null;
  // }

  // if (payload.phone) {
  //   data.phoneVerifiedAt = null;
  // }

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
      throw createHttpError(400, 'Phone is already verified');

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

  if (!value) throw createHttpError(400, `${type} value is required`);

  const verification = await verificationService({
    userId: user.id,
    value,
    expectedType: type === 'email' ? 'EMAIL_CONFIRM' : 'PHONE_CONFIRM',
    ...(token ? { token } : {}),
    ...(code ? { code } : {}),
  });

  if (!verification) throw createHttpError(401, 'Unauthorized');

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
      400,
      'For change password may be email or phone available',
    );

  const isOldPassword = user.password
    ? await bcrypt.compare(password, user.password)
    : false;

  if (isOldPassword)
    throw createHttpError(
      400,
      'The new password and the old password  must not match',
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
  userId: string;
  code: string;
  token?: string;
}) => {
  console.log('🚀 ~ changePassword ~ userId:', userId);
  const verification = await verificationService({
    userId,
    code,
    ...(token ? { token } : {}),
    expectedType: 'PASSWORD_CHANGE',
  });
  console.log('🚀 ~ changePassword ~ verification:', verification);

  if (!verification || !verification.data || !verification.data.userId) {
    throw createHttpError(401, 'Unauthorized');
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
    throw createHttpError(401, 'Unauthorized: User ID missing');

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

export const requestChangeEmailOrPhone = async ({
  payload,
  user,
}: {
  payload: {
    password: string;
    channel: 'email' | 'phone';
    value: string;
  };
  user: User;
}) => {
  const { channel, value, password } = payload;

  if (!user.password) {
    throw createHttpError(
      400,
      'Password must be set before changing email or phone',
    );
  }
  if (value === user[channel]) {
    throw createHttpError(400, `${channel} and new ${channel} must not match`);
  }
  const existingUser = await prisma.user.findFirst({
    where: {
      [channel]: value,
    },
  });

  if (existingUser) {
    throw createHttpError(
      409,
      'Conflict error',
      `This ${channel}  is already in use by another account`,
    );
  }

  const isValid = await bcrypt.compare(password, user.password);
  console.log('🚀 ~ requestChangeEmail ~ isValid:', isValid);

  if (!isValid) {
    throw createHttpError(401, 'Password wrong');
  }

  await definishnChannelMessage({
    channel,
    value,
    user: user as BaseUser,
    type: channel === 'email' ? 'EMAIL_CHANGE' : 'PHONE_CHANGE',
    inputData: value,
  });
};

export const confirmChangeEmailOrPhone = async ({
  user,
  payload,
}: {
  user: User;
  payload: {
    code: string;
    channel: 'email' | 'phone';
  };
}) => {
  const { channel, code } = payload;

  const verification = await verificationService({
    code,
    userId: user.id,
    expectedType: channel === 'email' ? 'EMAIL_CHANGE' : 'PHONE_CHANGE',
  });

  if (!verification) throw createHttpError(401, 'Unauthorized');

  return verification;
};

export const getUserInfo = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
  });

  if (!user) throw createHttpError(404, 'User not found');

  return { user: sanitizeUser(user) };
};
