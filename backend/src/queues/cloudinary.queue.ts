import { Queue } from 'bullmq';
import { redisConnection } from '../utils/redis.ts';

export const cloudinaryDeleteQueue = new Queue('cloudinary', {
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
