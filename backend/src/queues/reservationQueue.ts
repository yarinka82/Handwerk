import { Queue, RedisConnection } from 'bullmq';

export const reservationQueue = new Queue('reservation-expiry', {
  connection: RedisConnection,
});
