import { ResolvedVerification, VerificationType } from '../types/types';
import createHttpError from 'http-errors';
import { verifyUserEmail } from '../utils/verifyUserEmail';
import { createSession } from './auth';
import { redisConnection } from '../utils/redis';
import { ATTEMPTS_TTL, MAX_ATTEMPTS, RESERVATION_MINUTES } from '../constants';
import { Prisma } from '@prisma/client';
import { Channel } from '../types/types';
import { prisma } from '../prisma';
import { rateLimit } from '../utils/rateLimit';

export const resolveVerificationByCode = async (params: {
  code: string;
  userId?: string;
  expectedType: VerificationType;
  requestId?: string;
  channel?: string;
  value?: string;
}): Promise<ResolvedVerification> => {
  const { channel, value, userId, code, expectedType, requestId } = params;

  const prefix = expectedType?.toLowerCase();

  // const isUserRequestId = expectedType === 'REQUEST_CONFIRM';
  const isUserId =
    expectedType === 'EMAIL_CHANGE' ||
    expectedType === 'PHONE_CHANGE' ||
    expectedType === 'PASSWORD_CHANGE';

  if (isUserId) {
    if (!userId) throw createHttpError(400, 'User ID is required');
  } else {
    if (!channel && !value)
      throw createHttpError(400, 'Channel and value are required');
  }

  const codeKeyId = isUserId ? userId : (requestId ?? value);

  if (expectedType === 'REQUEST_CONFIRM' && !requestId) {
    throw createHttpError(400, 'requestId is required for this type');
  }

  const attemptsKey = isUserId
    ? `attempts:${prefix}:${codeKeyId}`
    : `attempts:${prefix}:${channel}:${codeKeyId}`;
  await rateLimit({
    key: attemptsKey,
    limit: MAX_ATTEMPTS,
    timeSec: ATTEMPTS_TTL,
  });

  const redisKey = isUserId
    ? `${prefix}:${code}:${codeKeyId}`
    : `${prefix}:${code}:${channel}:${codeKeyId}`;
  console.log('🚀 ~ resolveVerificationByCode ~ redisKey:', redisKey);

  const redisData = await redisConnection.getdel(redisKey);

  if (!redisData)
    throw createHttpError(403, 'Verification code expired or invalid');

  const parsedData = JSON.parse(redisData);
  console.log('🚀 ~ resolveVerificationByCode ~ parsedData:', parsedData);

  if (parsedData.token) await redisConnection.del(`token:${parsedData.token}`);

  await redisConnection.del(attemptsKey);

  return {
    type: parsedData.type,
    channel: parsedData.channel ?? channel,
    value: parsedData.value ?? value,
    order: parsedData.order,
    inputData: parsedData.inputData,
    requestId: parsedData.requestId,
    userId: parsedData.userId,
  };
};

export const resolveVerificationByToken = async (
  token: string,
): Promise<ResolvedVerification> => {
  const redisKey = `token:${token}`;

  const redisData = await redisConnection.getdel(redisKey);

  if (!redisData)
    throw createHttpError(403, 'Verification token expired or invalid');
  const parsedData = JSON.parse(redisData);

  const prefix = parsedData.type?.toLowerCase();

  if (parsedData.code) {
    const isUserId =
      parsedData.type === 'EMAIL_CHANGE' ||
      parsedData.type === 'PHONE_CHANGE' ||
      parsedData.type === 'PASSWORD_CHANGE';

    const codeKeyId = isUserId
      ? parsedData.userId
      : (parsedData.requestId ?? parsedData.value);

    const targetRedisKey = isUserId
      ? `${prefix}:${parsedData.code}:${codeKeyId}`
      : `${prefix}:${parsedData.code}:${parsedData.channel}:${codeKeyId}`;

    const attemptsKey = isUserId
      ? `attempts:${prefix}:${codeKeyId}`
      : `attempts:${prefix}:${parsedData.channel}:${codeKeyId}`;

    await redisConnection.del(targetRedisKey);
    await redisConnection.del(attemptsKey);
  }

  return {
    type: parsedData.type,
    channel: parsedData.channel,
    value: parsedData.value,
    order: parsedData.order,
    inputData: parsedData.inputData,
    requestId: parsedData.requestId,
    userId: parsedData.userId,
  };
};

export const verificationService = async (params: {
  token?: string;
  code?: string;
  refreshToken?: string;
  sessionId?: string;
  expectedType?: VerificationType;
  userId?: string;
  channel?: Channel;
  value?: string;
  requestId?: string;
}) => {
  const { token, code, channel, value, expectedType, requestId, userId } =
    params;

  let resolved: ResolvedVerification;

  if (token) {
    resolved = await resolveVerificationByToken(token);
  } else if (code) {
    if (!expectedType) throw createHttpError(400, 'ExpectedType is required');
    if (
      expectedType === 'EMAIL_CHANGE' ||
      expectedType === 'PHONE_CHANGE' ||
      expectedType === 'PASSWORD_CHANGE'
    ) {
      if (!userId) throw createHttpError(400, 'User may be authorised');

      resolved = await resolveVerificationByCode({
        code,
        expectedType,
        userId,
      });
    } else {
      if (!channel || !value)
        throw createHttpError(400, 'Missing verification data');
      resolved = await resolveVerificationByCode({
        code,
        channel,
        value,
        expectedType,
        ...(requestId ? { requestId } : {}),
      });
    }
  } else {
    throw createHttpError(400, 'Token or code is required');
  }

  return completeVerification(resolved);
};

export const completeVerification = async (resolved: ResolvedVerification) => {
  const { type, order, inputData } = resolved;
  let channel: Channel | undefined;
  let value: string | undefined;
  let userId: string | undefined;

  if ('channel' in resolved) {
    channel = resolved.channel;
    value = resolved.value;
  }
  if ('userId' in resolved) {
    userId = resolved.userId;
  }

  let user;
  let prismaData;

  if (channel) {
    prismaData = { [channel]: value } as unknown;
  }

  console.log('🚀 ~ completeVerification ~ userId:', userId);
  if (userId) {
    user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) throw createHttpError(404, 'User not found');
    if (
      type !== 'PASSWORD_CHANGE' &&
      type !== 'EMAIL_CHANGE' &&
      type !== 'PHONE_CHANGE'
    ) {
      if (!channel || (user as Record<string, unknown>)[channel] !== value)
        throw createHttpError(403, 'Access denied');
    }
  } else {
    if (!channel || !value) {
      throw createHttpError(400, 'Channel or value are required');
    }

    user = await prisma.user.findUnique({
      where: prismaData as Prisma.UserWhereUniqueInput,
    });

    if (!user) {
      if (type === 'REGISTER' || type === 'REQUEST_CONFIRM') {
        user = await prisma.user.create({ data: { [channel]: value } });
      } else {
        throw createHttpError(404, 'User not found');
      }
    }
  }
  const finishUserId = user.id;

  if (channel === 'email') {
    await verifyUserEmail(finishUserId);
  } else if (channel === 'phone') {
    //await verifyUserPhone(finishUserId);
    await verifyUserEmail(finishUserId);
  }

  const TYPES_FROM_SESSION: VerificationType[] = [
    'REGISTER',
    'LOGIN',
    'REQUEST_CONFIRM',
    'ORDER_CONFIRM',
  ];

  const session = TYPES_FROM_SESSION.includes(type)
    ? await createSession(finishUserId)
    : undefined;

  switch (type) {
    case 'REGISTER':
    case 'LOGIN':
    case 'EMAIL_CONFIRM':
    case 'PHONE_CONFIRM':
      return {
        data: {
          success: true,
          type,
          message: 'Verifizierung erfolgreich',
          userId: finishUserId,
        },
        session,
      };

    case 'EMAIL_CHANGE': {
      if (!resolved.inputData)
        throw createHttpError(400, 'New email is missing');
      await prisma.user.update({
        where: {
          id: finishUserId,
        },
        data: {
          email: resolved.inputData,
          emailVerifiedAt: new Date(),
        },
      });

      return {
        data: {
          success: true,
          type,
          message: 'Verifizierung erfolgreich',
          userId: finishUserId,
        },
        email: inputData,
      };
    }

    case 'PHONE_CHANGE': {
      if (!resolved.inputData)
        throw createHttpError(400, 'New phone is missing');
      await prisma.user.update({
        where: {
          id: finishUserId,
        },
        data: {
          phone: resolved.inputData,
          phoneVerifiedAt: new Date(),
        },
      });

      return {
        data: {
          success: true,
          type,
          message: 'Verifizierung erfolgreich',
          userId: finishUserId,
        },
        phone: inputData,
      };
    }

    case 'PASSWORD_CHANGE':
      return {
        data: {
          success: true,
          type,
          message: 'Verifizierung erfolgreich',
          userId: finishUserId,
        },
        password: inputData,
        session,
      };
    case 'PASSWORD_RESET':
      return {
        data: {
          success: true,
          type,
          message: 'Verifizierung erfolgreich',
          userId: finishUserId,
        },
        session,
      };

    case 'REQUEST_CONFIRM': {
      if (!order) {
        throw createHttpError(400, 'Order data is missing in session');
      }

      const newOrder = await prisma.order.create({
        data: {
          customerId: finishUserId,
          masterId: order.masterId,
          description: order.description,
          postalCode: order.postalCode,
          status: 'BOOKING',
          timeBlock: {
            create: {
              masterId: order.masterId,
              status: 'RESERVED',
              reason: 'ORDER',
              reservationMinutes: RESERVATION_MINUTES,
              reservationExpiresAt: new Date(
                Date.now() + RESERVATION_MINUTES * 60 * 1000,
              ),
              ...(order.startAt
                ? { startAt: new Date(order.startAt) }
                : undefined),
              ...(order.endAt ? { endAt: new Date(order.endAt) } : undefined),
            },
          },
        },
        include: {
          timeBlock: true,
        },
      });

      return {
        data: {
          success: true,
          type,
          redirect: `/orders/${newOrder.id}`,
          userId: finishUserId,
          order: newOrder,
          timeBlock: newOrder.timeBlock,
        },
        session,
      };
    }

    case 'ORDER_CONFIRM': {
      if (!order || !order.id) throw createHttpError(404, 'Order not found');
      const orderRequest = await prisma.order.findUnique({
        where: {
          id: order.id,
        },
      });

      if (!orderRequest) {
        throw createHttpError(404, 'Order not found');
      }
      if (userId !== orderRequest?.masterId) {
        throw createHttpError(403, 'You do not have access to this order');
      }

      return {
        data: {
          success: true,
          type,
          userId: finishUserId,
          redirect: `/master/orders/${order.id}`,
        },
        session,
      };
    }
    default:
      throw createHttpError(400, `Unsupported verification type`);
  }
};
