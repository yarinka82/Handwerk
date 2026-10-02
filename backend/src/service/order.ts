import createHttpError from 'http-errors';
import { prisma } from '../prisma';
import { Prisma, User } from '@prisma/client';
import { BaseOrder, BaseUser, Channel, GetOrdersFilter } from '../types/types';
import { RESERVATION_MINUTES } from '../constants';
import { definishnChannelMessage } from '../utils/definishnChannelMessage';
import { randomUUID } from 'node:crypto';
import { verificationServise } from './verificationServise';
import { sanitizeUser } from '../utils/sanitiseUser';
import { reservationQueue } from '../queues/reservationQueue';
import { hasFreeTime } from '../utils/hasFreeTime';

type PayloadCreateOrder = {
  channel: Channel;
  value: string;
  masterId: number;
  description: string;
  postalCode: string;
  startAt?: string;
  endAt?: string;
};

export const createNewOrder = async ({
  user,
  payload,
}: {
  user?: User;
  payload: PayloadCreateOrder;
}) => {
  const { channel, value, masterId, description, postalCode, startAt, endAt } =
    payload;

  if (startAt && endAt) {
    const free = await hasFreeTime({ masterId, startAt, endAt });
    if (!free) throw createHttpError(409, 'Time slot is not available');
  }

  if (user && user.id) {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerId: user.id,
          masterId,
          description,
          postalCode,
          status: 'BOOKING',
        },
      });

      if (startAt && endAt) {
        const conflict = await tx.timeBlock.findFirst({
          where: {
            masterId,
            status: { in: ['BLOCKED', 'RESERVED'] },
            startAt: { lt: new Date(endAt) },
            endAt: { gt: new Date(startAt) },
          },
        });
        if (conflict) throw createHttpError(409, 'Time slot is already taken');
      }

      const timeBlock = await tx.timeBlock.create({
        data: {
          masterId,
          orderId: order.id,
          startAt: startAt ? new Date(startAt) : null,
          endAt: endAt ? new Date(endAt) : null,
          status: 'RESERVED',
          reason: 'ORDER',
          reservationMinutes: RESERVATION_MINUTES,
          reservationExpiresAt: new Date(
            Date.now() + RESERVATION_MINUTES * 60 * 1000,
          ),
        },
      });

      return {
        success: true,
        redirect: `/orders/${order.id}`,
        userId: user.id,
        order,
        timeBlock,
      };
    });

    await reservationQueue.add(
      'expire-reservation',
      { timeBlockId: result?.timeBlock.id, orderId: result.order.id },
      {
        delay: RESERVATION_MINUTES * 60 * 1000,
        jobId: `expire: ${result?.order.id}`,
      },
    );

    return result;
  }
  if (!channel || !value) {
    throw createHttpError(400, 'Email or phone is required');
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

  const requestId = randomUUID();

  const createOrder: BaseOrder = {
    masterId,
    description,
    postalCode,
    requestId,
    ...(startAt ? { startAt } : {}),
    ...(endAt ? { endAt } : {}),
  };

  await definishnChannelMessage({
    channel,
    user: virtualUser,
    type: 'REQUEST_CONFIRM',
    order: createOrder,
  });
  const data = { success: true, channel, target: value, requestId };

  return data;
};

export const requestConfirmCustomer = async ({
  channel,
  value,
  code,
  token,
  requestId,
}: {
  channel: Channel;
  value: string;
  code?: string;
  token?: string;
  requestId: string;
}) => {
  const verification = await verificationServise({
    expectedType: 'REQUEST_CONFIRM',
    requestId,
    channel,
    value,
    ...(code ? { code } : {}),
    ...(token ? { token } : {}),
  });

  if (!verification) throw createHttpError(404, 'Order not found');

  return verification;
};

export const requestConfirmMaster = async ({
  userId,
  orderId,
  startAt,
  endAt,
  reservMinutes,
}: {
  userId: number;
  orderId: number;
  startAt: string;
  endAt: string;
  reservMinutes?: number;
}) => {
  let confirmOrder;

  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      masterId: true,
      master: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      customer: true,
      timeBlock: {
        select: {
          id: true,
          masterId: true,
          startAt: true,
          endAt: true,
        },
      },
    },
  });

  if (!order || order.master.user.id !== userId)
    throw createHttpError(404, 'Order not found');

  if (startAt && endAt) {
    const free = await hasFreeTime({
      masterId: order.masterId,
      startAt,
      endAt,
    });
    if (!free) throw createHttpError(409, 'Time slot is not available');
  }

  const sameTime =
    order.timeBlock?.startAt?.getTime() === new Date(startAt).getTime();
  if (order.timeBlock && sameTime) {
    const timeBlockId = order.timeBlock.id;

    confirmOrder = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: 'CONFIRMED',
        },
      });

      const conflict = await tx.timeBlock.findFirst({
        where: {
          masterId: order.masterId,
          id: { not: timeBlockId },
          status: { in: ['RESERVED', 'BLOCKED'] },
          startAt: { lt: new Date(endAt) },
          endAt: { gt: new Date(startAt) },
        },
      });
      if (conflict) throw createHttpError(409, 'Time slot is already taken');

      const timeBlock = await tx.timeBlock.update({
        where: {
          orderId: order.id,
        },
        data: {
          startAt: new Date(startAt),
          endAt: new Date(endAt),
          status: 'BLOCKED',
          reason: 'ORDER',
          reservationExpiresAt: null,
        },
      });
      return { updatedOrder, timeBlock };
    });
    await reservationQueue.remove(`expire: ${order.id}`);
  } else {
    const reservationMinutes = reservMinutes ?? 15;
    const reservationExpiresAt = new Date(
      Date.now() + reservationMinutes * 60 * 1000,
    );

    confirmOrder = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: 'PROPOSED',
        },
      });

      const timeBlock = await tx.timeBlock.update({
        where: {
          orderId: order.id,
        },
        data: {
          ...(startAt ? { startAt: new Date(startAt) } : {}),
          endAt: new Date(endAt),
          status: 'RESERVED',
          reason: 'ORDER',
          reservationExpiresAt,
        },
      });

      await reservationQueue.remove(`expire: ${order.id}`);
      await reservationQueue.add(
        'expire-reservation',
        { timeBlockId: timeBlock.id, orderId: order.id },
        {
          delay: RESERVATION_MINUTES * 60 * 1000,
          jobId: `expire: ${order.id}`,
        },
      );

      return { updatedOrder, timeBlock };
    });
  }

  await definishnChannelMessage({
    user: sanitizeUser(order.customer) as BaseUser,
    type: 'InfoMessage',
    order: confirmOrder.updatedOrder as BaseOrder,
  });

  return {
    success: true,
    order: confirmOrder.updatedOrder,
    timeBlock: confirmOrder.timeBlock,
  };
};

export const requestReservedOrder = async ({
  orderId,
  userId,
}: {
  orderId: number;
  userId: number;
}) => {
  const order = await findOrderById(orderId);

  if (order.customerId !== userId)
    throw createHttpError(403, 'You are not allowed to confirm this order');

  const confirm = await prisma.$transaction(async (tx) => {
    const timeBlock = await tx.timeBlock.update({
      where: {
        orderId,
      },
      data: {
        status: 'BLOCKED',
      },
    });

    const confirmOrder = await tx.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: 'CONFIRMED',
      },
    });

    return { timeBlock, confirmOrder };
  });

  return {
    success: true,
    timeBlock: confirm.timeBlock,
    order: confirm.confirmOrder,
  };
};

export const deleteOrder = async ({
  orderId,
  userId,
}: {
  orderId: number;
  userId: number;
}) => {
  const order = await findOrderById(orderId);

  let newOrder;

  if (userId === order.customerId) {
    newOrder = await prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        customerHiddenAt: new Date(Date.now()),
      },
    });
  } else if (userId === order.master.userId) {
    newOrder = await prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        masterHiddenAt: new Date(Date.now()),
      },
    });
  } else {
    throw createHttpError(403, 'Not acces');
  }

  return newOrder;
};

export const findOrderById = async (orderId: number) => {
  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      master: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!order) {
    throw createHttpError(404, 'Order not found');
  }

  return order;
};

export const cancelledOrder = async ({
  orderId,
  userId,
  cancelledReason,
}: {
  orderId: number;
  userId: number;
  cancelledReason: string;
}) => {
  const order = await findOrderById(orderId);

  if (order.customerId !== userId && order.master.userId !== userId)
    throw createHttpError(403, 'You are not allowed to cancel this order');

  const data = await prisma.order.update({
    where: {
      id: orderId,
    },
    data: {
      cancelledReason,
      dataCancelled: new Date(Date.now()),
      cancelledById: userId,
    },
  });

  return data;
};

export const confirmCompletedOrder = async ({
  orderId,
  userId,
}: {
  orderId: number;
  userId: number;
}) => {
  const order = await findOrderById(orderId);

  if (order.customerId !== userId && order.master.userId !== userId)
    throw createHttpError(403, 'You are not allowed to cancel this order');

  if (userId === order.customerId) {
    await prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        customerCompleteddAt: new Date(Date.now()),
      },
    });
  }
  if (userId === order.master.userId) {
    await prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        masterCompleteddAt: new Date(Date.now()),
      },
    });
  }
};

export const deleteOldOrder = async (days: number) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  await prisma.order.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });
};

export const getAllCustomersOrder = async ({
  userId,
  date,
  dateDirection = 'newer',
  status,
  masterId,
}: GetOrdersFilter) => {
  const whereCondition: Prisma.OrderWhereInput = { customerId: userId };

  if (date) {
    whereCondition.createdAt =
      dateDirection === 'newer'
        ? { gte: new Date(date) }
        : { lte: new Date(date) };
  }

  if (status) {
    whereCondition.status = status;
  }

  if (masterId) {
    whereCondition.masterId = masterId;
  }

  const orders = await prisma.order.findMany({
    where: whereCondition,
    orderBy: {
      createdAt: 'desc',
    },
  });

  return orders;
};
