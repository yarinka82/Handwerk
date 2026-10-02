import { redisConnection } from './redis';

export const resetAllSession = async (userId: number) => {
  const userSessionKey = `user:${userId}:sessions`;

  const sessionIds = await redisConnection.smembers(userSessionKey);

  if (sessionIds.length > 0) {
    const userSessionToWithPrefix = sessionIds.map((id) => `session:${id}`);

    await redisConnection.del(...userSessionToWithPrefix, userSessionKey);
  }
};
