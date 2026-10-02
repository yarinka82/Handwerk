import { Worker } from 'bullmq';
import { prisma } from '../prisma';
import { redisConnection } from '../utils/redis';

export const reservationWorker = new Worker(
  'reservation-expiry',
  async (job) => {
    const { timeBlockId, orderId } = job.data;

    const timeBlock = await prisma.timeBlock.findUnique({
      where: {
        id: timeBlockId,
      },
    });

    if (!timeBlock || timeBlock.status !== 'RESERVED') return;

    await prisma.$transaction(async (tx) => {
      await tx.timeBlock.delete({
        where: {
          id: timeBlockId,
        },
      });
      await tx.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: 'CANCELED',
        },
      });
    });
  },
  { connection: redisConnection },
);
