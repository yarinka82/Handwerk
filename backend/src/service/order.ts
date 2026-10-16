import createHttpError from 'http-errors';
import { prisma } from '../prisma';
import { Prisma, User } from '@prisma/client';
import { BaseOrder, BaseUser, Channel, GetOrdersFilter } from '../types/types';
import { RESERVATION_MINUTES } from '../constants';
import { definishnChannelMessage } from '../utils/definishnChannelMessage';
import { randomUUID } from 'node:crypto';
import { verificationService } from './verificationService';
import { sanitizeUser } from '../utils/sanitiseUser';
import { reservationQueue } from '../queues/reservationQueue';
import { hasFreeTime } from '../utils/hasFreeTime';

type PayloadCreateOrder = {
  channel: Channel;
  value: string;
  masterId: string;
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

      const hasDates = Boolean(startAt && endAt);

      const orderData: Prisma.OrderUncheckedCreateInput = {
        customerId: user.id,
        masterId,
        description,
        postalCode,
        status: 'BOOKING',
      };

      if (hasDates) {
        orderData.timeBlock = {
          create: {
            masterId,
            startAt: new Date(startAt!),
            endAt: new Date(endAt!),
            status: 'RESERVED',
            reason: 'ORDER',
            reservationMinutes: RESERVATION_MINUTES,
            reservationExpiresAt: new Date(
              Date.now() + RESERVATION_MINUTES * 60 * 1000,
            ),
          },
        };
      }
      const newOrder = await tx.order.create({
        data: orderData,
        include: {
          timeBlock: true,
        },
      });

      const order = newOrder as Prisma.OrderGetPayload<{
        include: { timeBlock: true };
      }>;

      return {
        success: true,
        redirect: `/orders/${order.id}`,
        userId: user.id,
        order,
        timeBlock: order.timeBlock,
      };
    });

    if (result.timeBlock) {
      await reservationQueue.add(
        'expire-reservation',
        { timeBlockId: result?.timeBlock?.id, orderId: result.order.id },
        {
          delay: RESERVATION_MINUTES * 60 * 1000,
          jobId: `expire:${result?.order.id}`,
        },
      );
    }

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

  const createOrder: Omit<BaseOrder, 'customerId'> = {
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
  const verification = await verificationService({
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
  userId: string;
  orderId: string;
  startAt: string;
  endAt: string;
  reservMinutes?: number;
}) => {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
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
        timeBlock: true,
      },
    });

    if (!order || order.master.user.id !== userId)
      throw createHttpError(404, 'Order not found');

    const currentMasterId = order.masterId;
    const timeBlockId = order.timeBlock?.id;

    const free = await hasFreeTime({
      masterId: currentMasterId,
      startAt,
      endAt,
    });
    if (!free) throw createHttpError(409, 'Time slot is not available');

    const sameTime =
      order.timeBlock?.startAt?.getTime() === new Date(startAt).getTime();

    const conflict = timeBlockId
      ? await tx.timeBlock.findFirst({
          where: {
            masterId: currentMasterId,
            id: { not: timeBlockId },
            status: { in: ['RESERVED', 'BLOCKED'] },
            startAt: { lt: new Date(endAt) },
            endAt: { gt: new Date(startAt) },
          },
        })
      : false;

    if (conflict) throw createHttpError(409, 'Time slot is already taken');

    if (order.timeBlock && sameTime) {
      const updatedOrder = await tx.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: 'CONFIRMED',
          timeBlock: {
            update: {
              startAt: new Date(startAt),
              endAt: new Date(endAt),
              status: 'BLOCKED',
              reason: 'ORDER',
              reservationExpiresAt: null,
            },
          },
        },
        include: {
          timeBlock: true,
        },
      });

      return {
        actionType: 'CONFIRMED' as const,
        order: updatedOrder,
        customerData: order.customer,
      };
    } else {
      const reservationMinutes = reservMinutes ?? 15;
      const reservationExpiresAt = new Date(
        Date.now() + reservationMinutes * 60 * 1000,
      );
      const updatedOrder = await tx.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: 'PROPOSED',
          timeBlock: {
            update: {
              startAt: new Date(startAt),
              endAt: new Date(endAt),
              status: 'RESERVED',
              reason: 'ORDER',
              reservationExpiresAt,
            },
          },
        },
        include: {
          timeBlock: true,
        },
      });

      return {
        actionType: 'PROPOSED' as const,
        order: updatedOrder,
        customerData: order.customer,
        reservationMinutes,
      };
    }
  });

  await reservationQueue.remove(`expire:${result.order.id}`);

  if (result.actionType === 'PROPOSED' && result.order.timeBlock) {
    await reservationQueue.add(
      'expire-reservation',
      { timeBlockId: result.order.timeBlock.id, orderId: result.order.id },
      {
        delay: RESERVATION_MINUTES * 60 * 1000,
        jobId: `expire: ${result.order.id}`,
      },
    );
  }

  await definishnChannelMessage({
    user: sanitizeUser(result.customerData) as BaseUser,
    type: {
      type: 'INFO',
      event:
        result.actionType === 'CONFIRMED'
          ? 'ORDER_CONFIRMED'
          : 'ORDER_TIME_PROPOSED',
      orderId: result.order.id,
    },
    order: result.order as BaseOrder,
  });

  return {
    success: true,
    order: result.order,
    timeBlock: result.order.timeBlock,
  };
};

export const requestReservedOrder = async ({
  orderId,
  userId,
}: {
  orderId: string;
  userId: string;
}) => {
  const order = await findOrderById(orderId);

  if (order.customerId !== userId)
    throw createHttpError(403, 'You are not allowed to confirm this order');

  const confirmOrder = await prisma.order.update({
    where: {
      id: orderId,
    },
    data: {
      status: 'CONFIRMED',
      timeBlock: {
        update: {
          status: 'BLOCKED',
        },
      },
    },
    include: {
      timeBlock: true,
    },
  });

  await reservationQueue.remove(`expire:${order.id}`);

  await definishnChannelMessage({
    user: sanitizeUser(order.master.user) as BaseUser,
    type: {
      type: 'INFO',
      event: 'ORDER_CONFIRMED',
      orderId: order.id,
    },
    order: confirmOrder as BaseOrder,
  });

  return {
    success: true,
    timeBlock: confirmOrder.timeBlock,
    order: confirmOrder,
  };
};

export const deleteOrder = async ({
  orderId,
  userId,
}: {
  orderId: string;
  userId: string;
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

export const findOrderById = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      master: {
        include: {
          id: true,
          user: true,
        },
      },
      customer: true,
      timeBlock: true,
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
  orderId: string;
  userId: string;
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
      status: 'CANCELED',
      cancelledReason,
      dataCancelled: new Date(Date.now()),
      cancelledById: userId,
      timeBlock: {
        delete: true,
      },
    },
  });

  await reservationQueue.remove(`expire:${order.id}`);

  return data;
};

export const confirmCompletedOrder = async ({
  orderId,
  userId,
}: {
  orderId: string;
  userId: string;
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
