import createHttpError from 'http-errors';
import { redisConnection } from './redis';

type RateLimit = { key: string; limit: number; timeSec: number };

export const rateLimit = async ({ key, limit, timeSec }: RateLimit) => {
  const n = await redisConnection.incr(key);
  if (n === 1) await redisConnection.expire(key, timeSec);
  if (n > limit)
    throw createHttpError(429, 'Too many request, try again later');
};
