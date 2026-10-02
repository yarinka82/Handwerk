import { Queue } from 'bullmq';
import { redisConnection } from '../utils/redis';

export const resendQueue = new Queue('resend', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
  },
});
