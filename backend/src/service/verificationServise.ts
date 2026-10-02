import { VerificationType } from '@prisma/client';
import createHttpError from 'http-errors';
import { verifyUserEmail } from '../utils/verifyUserEmail';
import { createSession } from './auth';
import { redisConnection } from '../utils/redis';
import { ATTEMPTS_TTL, MAX_ATTEMPTS, RESERVATION_MINUTES } from '../constants';
import { Prisma } from '@prisma/client';
import { BaseOrder, Channel, Session } from '../types/types';
import { prisma } from '../prisma';
import { rateLimit } from '../utils/rateLimit';

export const verificationServise = async ({
  token,
  code,
  refreshToken: _,
  sessionId,
  expectedType,
  userId,
  channel,
  value,
  requestId,
}: {
  token?: string;
  code?: string;
  refreshToken?: string;
  sessionId?: string;
  expectedType?: VerificationType;
  userId?: number;
  channel?: Channel;
  value?: string;
  requestId?: string;
}) => {
  if (!expectedType) throw createHttpError(400, 'ExpectedType is required');
  if (!code && !token) throw createHttpError(400, 'Token or code is required');
  if (code && (!channel || !value))
    throw createHttpError(400, 'Missing verification data');

  const prefix = expectedType?.toLowerCase();

  let session: Session | undefined = undefined;

  let redisKey = '';

  const isUserRequestId = expectedType === 'REQUEST_CONFIRM';
  const codeKeyId = isUserRequestId ? requestId : value;

  if (code) {
    const attemptsKey = `attempts:${prefix}:${channel}:${codeKeyId}`;
    rateLimit({
      key: attemptsKey,
      limit: MAX_ATTEMPTS,
      timeSec: ATTEMPTS_TTL,
    });

    redisKey = `${prefix}:${code}:${channel}:${codeKeyId}`;
  } else if (token) {
    redisKey = `${prefix}:token:${token}`;
  }

  const redisData = await redisConnection.getdel(redisKey);

  if (!redisData)
    throw createHttpError(403, 'Verification code expired or invalid');

  const parsedData = JSON.parse(redisData);

  const altKey = code
    ? `${prefix}:token:{parsedData.token}`
    : `${prefix}:${parsedData.code}:{parsedData.channel}:${parsedData.value} `;
  await redisConnection.del(altKey);

  if (code) await redisConnection.del(`attempts:${prefix}:${channel}:${value}`);

  const activeChannel = token ? parsedData.channel : channel;
  const activeValue = token ? parsedData.value : value;
  const order: BaseOrder | undefined = parsedData.order;
  const inputData: string | undefined = parsedData.inputData;

  const prismaData = { [activeChannel]: activeValue };

  let user;

  if (userId) {
    user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) throw createHttpError(404, 'User not found');

    if ((user as Record<string, unknown>)[activeChannel] !== activeValue)
      throw createHttpError(403, 'Access denied');
  } else {
    user = await prisma.user.findUnique({
      where: prismaData as Prisma.UserWhereUniqueInput,
    });

    if (!user) {
      if (expectedType === 'REGISTER' || expectedType === 'REQUEST_CONFIRM') {
        user = await prisma.user.create({ data: prismaData });
      } else {
        throw createHttpError(404, 'User not found');
      }
    }
  }
  const finishUserId = user.id;

  if (activeChannel === 'email') {
    await verifyUserEmail(finishUserId);
  } else if (activeChannel === 'phone') {
    //await verifyUserPhone(finishUserId);
    await verifyUserEmail(finishUserId);
  }

  if (expectedType !== 'PASSWORD_RESET') {
    if (!sessionId) {
      session = await createSession(finishUserId);
    }
  }

  switch (expectedType) {
    case 'REGISTER':
    case 'LOGIN':
    case 'EMAIL_CONFIRM':
    case 'PASSWORD_CHANGE':
      return {
        data: {
          success: true,
          type: expectedType,
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
          type: expectedType,
          message: 'Verifizierung erfolgreich',
          userId: finishUserId,
        },
        session,
      };

    case 'REQUEST_CONFIRM': {
      if (!order) {
        throw createHttpError(400, 'Order data is missing in session');
      }

      const { newOrder, timeBlock } = await prisma.$transaction(async (tx) => {
        const createdOrder = await tx.order.create({
          data: {
            customerId: finishUserId,
            masterId: Number(order.masterId),
            description: order.description,
            postalCode: order.postalCode,
            status: "BOOKING",
          },
        });

        const timeBlockData: Prisma.TimeBlockUncheckedCreateInput = {
          masterId: Number(order.masterId),
          orderId: createdOrder.id,
          status: 'RESERVED',
          reason: 'ORDER',
          reservationMinutes: RESERVATION_MINUTES,
          reservationExpiresAt: new Date(
            Date.now() + RESERVATION_MINUTES * 60 * 1000,
          ),
          ...(order.startAt ? { startAt: new Date(order.startAt) } : {}),
          ...(order.endAt ? { endAt: new Date(order.endAt) } : {}),
        };

        const createdTimeBlock = await tx.timeBlock.create({
          data: timeBlockData,
        });

        return { newOrder: createdOrder, timeBlock: createdTimeBlock };
      });

      return {
        data: {
          success: true,
          type: expectedType,
          redirect: `/orders/${newOrder.id}`,
          userId: finishUserId,
          order: newOrder,
          timeBlock,
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

      if (!orderRequest) createHttpError(404, 'Order not found');
      if (userId !== order.masterId)
        throw createHttpError(403, 'Order not access');

      return {
        data: {
          success: true,
          type: expectedType,
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
